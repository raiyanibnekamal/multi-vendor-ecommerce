const MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
const MAX_BODY_BYTES = 16 * 1024;
const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 30;
const MAX_ACTIVE_REQUESTS = 8;
const requestsByIp = new Map();
let activeRequests = 0;

const ACTIONS = {
  'support-chat': {
    maxTokens: 1000,
    system: 'You are StreamCart, a helpful shopping assistant for a Bangladesh marketplace. Answer in the same language as the user. Be concise and friendly. Do not claim to have looked up orders, issued refunds, created tickets, contacted staff, or performed actions. Do not invent policies or order data. If the question needs account data, tell the user to sign in or use their account page. Return JSON only: {"text":"..."}.',
    user: (input) => `Customer message:\n${input.message}`,
  },
  'rank-products': {
    maxTokens: 1000,
    system: 'Rank only the supplied product IDs for relevance to the shopper context. Return JSON only: {"ids":["id1",...]} with IDs copied exactly from the candidates. Never invent IDs.',
    user: (input) => `Shopper context: ${input.context || input.query || ''}\nCandidates: ${JSON.stringify(input.products)}`,
  },
  'rank-reels': {
    maxTokens: 1000,
    system: 'Rank only the supplied reel IDs for relevance to viewer interests. Return JSON only: {"ids":["id1",...]} with IDs copied exactly from the candidates. Never invent IDs.',
    user: (input) => `Viewer interests: ${JSON.stringify(input.interests || {})}\nReels: ${JSON.stringify(input.reels)}`,
  },
  'suggest-tags': {
    maxTokens: 1000,
    system: 'Select products clearly relevant to the uploaded shoppable video using its caption and filename. Return JSON only: {"ids":["id1",...]} with at most five IDs copied exactly from the supplied products. Never invent IDs.',
    user: (input) => `Caption: ${input.caption || ''}\nFilename: ${input.fileName || ''}\nVendor products: ${JSON.stringify(input.products)}`,
  },
  'product-tags': {
    maxTokens: 1000,
    system: 'Generate concise search/discovery tags for one e-commerce product using only its supplied facts. Return JSON only: {"tags":["tag",...]}, with 3 to 8 lowercase tags, each at most 30 characters. Do not invent technical specifications.',
    user: (input) => JSON.stringify(input.product),
  },
  'product-description': {
    maxTokens: 1000,
    system: 'Write a concise, factual e-commerce product description in English. Use only supplied product facts; do not invent specifications, warranty, authenticity, or performance claims. Return JSON only: {"description":"..."}.',
    user: (input) => JSON.stringify(input.product),
  },
  'moderate-reel': {
    maxTokens: 1000,
    system: 'Review this shopping reel caption and tagged product titles for deceptive, unsafe, prohibited, or unsupported claims. Be conservative and do not infer violations without evidence. Return JSON only: {"score":0-100,"flags":["short reason",...],"summary":"short summary"}. This is decision support, not an automatic moderation decision.',
    user: (input) => `Caption: ${input.caption || ''}\nReported: ${Boolean(input.reported)}\nTagged products: ${JSON.stringify(input.products || [])}`,
  },
};

function send(res, status, payload) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.status(status).json(payload);
}

function takeRateLimit(ip) {
  const now = Date.now();
  if (requestsByIp.size > 1000) {
    for (const [address, record] of requestsByIp) {
      if (now - record.startedAt >= WINDOW_MS) requestsByIp.delete(address);
    }
  }
  const record = requestsByIp.get(ip);
  if (!record || now - record.startedAt >= WINDOW_MS) {
    requestsByIp.set(ip, { startedAt: now, count: 1 });
    return true;
  }
  record.count += 1;
  return record.count <= MAX_REQUESTS_PER_WINDOW;
}

function validInput(action, input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return false;
  const text = (value, max) => typeof value === 'string' && value.length <= max;
  if (action === 'support-chat') return text(input.message, 2000);
  if (action === 'rank-products') return Array.isArray(input.products) && input.products.length <= 40 && text(input.context || input.query || '', 1000);
  if (action === 'rank-reels') return Array.isArray(input.reels) && input.reels.length <= 40;
  if (action === 'suggest-tags') return text(input.caption || '', 1000) && text(input.fileName || '', 300) && Array.isArray(input.products) && input.products.length <= 40;
  if (action === 'product-tags') return input.product && typeof input.product === 'object' && text(input.product.title || '', 180);
  if (action === 'product-description') return input.product && typeof input.product === 'object' && text(input.product.title || '', 180);
  if (action === 'moderate-reel') return text(input.caption || '', 2000) && Array.isArray(input.products || []) && (input.products || []).length <= 10;
  return false;
}

function normalizeResult(action, value, input) {
  if (action === 'rank-products' || action === 'rank-reels' || action === 'suggest-tags') {
    const source = action === 'rank-reels' ? input.reels : input.products;
    const allowedIds = new Set(source.map((item) => item.id));
    const ids = Array.isArray(value.ids) ? value.ids.filter((id) => allowedIds.has(id)) : [];
    return { ids: [...new Set(ids)].slice(0, action === 'suggest-tags' ? 5 : 40) };
  }
  if (action === 'product-description') {
    return { description: typeof value.description === 'string' ? value.description.slice(0, 2000) : '' };
  }
  if (action === 'product-tags') {
    return { tags: Array.isArray(value.tags) ? [...new Set(value.tags.filter((tag) => typeof tag === 'string').map((tag) => tag.trim().toLowerCase()).filter(Boolean))].slice(0, 8) : [] };
  }
  if (action === 'moderate-reel') {
    const score = Number(value.score);
    return {
      score: Number.isFinite(score) ? Math.max(0, Math.min(100, Math.round(score))) : 50,
      flags: Array.isArray(value.flags) ? value.flags.filter((flag) => typeof flag === 'string').slice(0, 8).map((flag) => flag.slice(0, 180)) : [],
      summary: typeof value.summary === 'string' ? value.summary.slice(0, 300) : '',
    };
  }
  return { text: typeof value.text === 'string' ? value.text.slice(0, 2500) : 'Sorry, I could not prepare a response.' };
}

module.exports = async function handler(req, res) {
  if (req.method === 'GET') {
    return send(res, 200, {
      status: 'ok',
      service: 'StreamCart AI Gateway',
      available: Boolean(process.env.GROQ_API_KEY),
      model: MODEL,
      timestamp: new Date().toISOString()
    });
  }
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return send(res, 405, { error: 'Method not allowed.' });
  }
  const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
  if (!takeRateLimit(ip)) return send(res, 429, { error: 'Too many AI requests. Please wait a minute and try again.' });
  if (activeRequests >= MAX_ACTIVE_REQUESTS) return send(res, 429, { error: 'AI service is busy. Please try again shortly.' });
  if (!process.env.GROQ_API_KEY) return send(res, 200, { available: false, reason: 'not_configured' });

  let body = req.body;
  if (!body || typeof body !== 'object') {
    try {
      const chunks = [];
      let size = 0;
      for await (const chunk of req) {
        size += chunk.length;
        if (size > MAX_BODY_BYTES) return send(res, 413, { error: 'Request is too large.' });
        chunks.push(chunk);
      }
      body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    } catch {
      return send(res, 400, { error: 'Invalid JSON request.' });
    }
  }
  if (Buffer.byteLength(JSON.stringify(body), 'utf8') > MAX_BODY_BYTES) return send(res, 413, { error: 'Request is too large.' });

  const action = body.action;
  const input = body.input;
  const definition = ACTIONS[action];
  if (!definition || !validInput(action, input)) return send(res, 400, { error: 'Unsupported AI action or invalid input.' });
  activeRequests += 1;

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: action === 'moderate-reel' ? 0.1 : 0.35,
        max_tokens: definition.maxTokens,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: definition.system },
          { role: 'user', content: definition.user(input) },
        ],
      }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) {
      const errText = await response.text();
      console.error('[AI proxy] Groq request failed for action:', action, response.status, errText);
      return send(res, response.status === 429 ? 429 : 502, { error: 'AI provider request failed.' });
    }
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (typeof content !== 'string') return send(res, 502, { error: 'AI provider returned an empty response.' });
    const result = normalizeResult(action, JSON.parse(content), input);
    return send(res, 200, result);
  } catch (error) {
    console.error('[AI proxy] Request failed:', error.message);
    return send(res, 502, { error: 'AI service is temporarily unavailable.' });
  } finally {
    activeRequests = Math.max(0, activeRequests - 1);
  }
};
