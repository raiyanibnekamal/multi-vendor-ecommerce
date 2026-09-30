const { createHash, createHmac } = require('node:crypto');
const { RtcRole, RtcTokenBuilder } = require('agora-token');

const TOKEN_TTL_SECONDS = 10 * 60;

function send(res, status, payload) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  return res.status(status).json(payload);
}

async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 4096) throw new Error('Request is too large.');
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

async function supabaseGet(table, filters, authorization) {
  const url = new URL(`/rest/v1/${table}`, process.env.SUPABASE_URL);
  url.search = new URLSearchParams(filters).toString();
  const response = await fetch(url, {
    headers: {
      apikey: process.env.SUPABASE_ANON_KEY,
      Authorization: authorization || `Bearer ${process.env.SUPABASE_ANON_KEY}`,
    },
  });
  if (!response.ok) throw new Error('Supabase lookup failed.');
  return response.json();
}

module.exports = async function handler(req, res) {
  if (req.method === 'GET') {
    return send(res, 200, {
      status: 'ok',
      service: 'StreamCart Agora Token Service',
      configured: Boolean(process.env.AGORA_APP_ID && process.env.AGORA_APP_CERTIFICATE),
      appId: process.env.AGORA_APP_ID || null,
      timestamp: new Date().toISOString()
    });
  }
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return send(res, 405, { error: 'Method not allowed.' });
  }

  if (!process.env.AGORA_APP_ID || !process.env.AGORA_APP_CERTIFICATE || !process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
    return send(res, 503, { error: 'Agora or Supabase server environment is not configured.' });
  }

  let body;
  try {
    body = await readBody(req);
  } catch {
    return send(res, 400, { error: 'Invalid or oversized JSON request.' });
  }

  const streamId = body?.streamId;
  const role = body?.role;
  const clientId = body?.clientId;
  if (typeof streamId !== 'string' || !/^[a-zA-Z0-9_-]{1,64}$/.test(streamId) || !['publisher', 'subscriber'].includes(role) || typeof clientId !== 'string' || !/^[a-f0-9-]{36}$/i.test(clientId)) {
    return send(res, 400, { error: 'A valid streamId, role, and clientId are required.' });
  }

  const authorization = req.headers?.authorization || '';
  const isPublisher = role === 'publisher';
  const bearerToken = authorization.match(/^Bearer\s+(.+)$/i);
  const isDemoPublisher = isPublisher && !bearerToken && process.env.NODE_ENV !== 'production'
    && process.env.AGORA_ALLOW_DEMO_PUBLISHER === 'true' && body.demoVendorId === 'v1';
  let userId = null;

  if (isPublisher) {
    if (!bearerToken && !isDemoPublisher) return send(res, 401, { error: 'Sign in as the stream owner to broadcast.' });

    if (bearerToken) {
      try {
        const authResponse = await fetch(new URL('/auth/v1/user', process.env.SUPABASE_URL), {
          headers: { apikey: process.env.SUPABASE_ANON_KEY, Authorization: authorization },
        });
        if (!authResponse.ok) return send(res, 401, { error: 'Supabase session is invalid.' });
        userId = (await authResponse.json()).id;
      } catch {
        return send(res, 502, { error: 'Could not verify the Supabase session.' });
      }
    }
  }

  try {
    const streams = await supabaseGet('live_streams', {
      select: 'id,vendor_id,status',
      id: `eq.${streamId}`,
      ...(isPublisher ? {} : { status: 'eq.live' }),
    }, authorization || undefined);
    const stream = streams[0];
    if (!stream || (!isPublisher && stream.status !== 'live')) {
      return send(res, 404, { error: 'Live stream not found.' });
    }

    if (isPublisher) {
      const vendors = await supabaseGet('vendors', {
        select: 'id,status',
        id: `eq.${stream.vendor_id}`,
        ...(!isDemoPublisher ? { owner_id: `eq.${userId}` } : {}),
        status: 'eq.approved',
      }, authorization);
      if (!vendors.length || (isDemoPublisher && stream.vendor_id !== 'v1') || !['scheduled', 'live'].includes(stream.status)) {
        return send(res, 403, { error: 'Only the approved owner can broadcast this stream.' });
      }
    }

    const channel = `sc_${createHash('sha256').update(streamId).digest('hex').slice(0, 32)}`;
    const uid = createHmac('sha256', process.env.AGORA_APP_CERTIFICATE)
      .update(`${streamId}:${role}:${clientId}`)
      .digest()
      .readUInt32BE(0) || 1;
    const expiresAt = Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS;
    const token = RtcTokenBuilder.buildTokenWithUidAndPrivilege(
      process.env.AGORA_APP_ID,
      process.env.AGORA_APP_CERTIFICATE,
      channel,
      uid,
      TOKEN_TTL_SECONDS,
      TOKEN_TTL_SECONDS,
      isPublisher ? TOKEN_TTL_SECONDS : 0,
      isPublisher ? TOKEN_TTL_SECONDS : 0,
      isPublisher ? TOKEN_TTL_SECONDS : 0,
    );
    return send(res, 200, { appId: process.env.AGORA_APP_ID, channel, uid, token, expiresAt, clientId });
  } catch (error) {
    console.error('[Agora token] Request failed:', error.message);
    return send(res, 502, { error: 'Could not authorize the live stream.' });
  }
};