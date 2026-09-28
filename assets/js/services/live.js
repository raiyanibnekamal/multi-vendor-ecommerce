// Live stream state. Video transport would come from Agora/LiveKit; chat, reactions,
// pinned product and viewer counts are synced through the realtime channel.
import { db, respond } from './db.js';
import { channel } from './realtime.js';
import { chatPool } from '../data/streams.js';
import { uid } from '../core/utils.js';
import { currentUser } from '../core/auth.js';
import { CONFIG } from '../core/config.js';
import { getSupabase } from '../core/supabase.js?v=20260928-11';

const UUID_PATTERN = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

const VIEWER_NAMES = ['Rakib', 'Mim', 'Sabbir', 'Nabila', 'Fahim', 'Tania', 'Jubayer', 'Riya', 'Mehedi', 'Sumaiya', 'Arif', 'Tuhin', 'Shila', 'Nayeem', 'Priya'];
export const REACTIONS = ['❤️', '🔥', '😍', '👏', '😂', '🛒'];

function normalizeStream(stream) {
  if (!stream) return null;
  const viewers = Number(stream.viewers);
  return {
    ...stream,
    productIds: Array.isArray(stream.productIds) ? stream.productIds : [],
    viewers: Number.isFinite(viewers) ? viewers : 0,
  };
}

export async function getStreams({ status, vendorId } = {}) {
  await db.waitForInitialSync();
  let list = db.all('streams').map(normalizeStream).filter(Boolean);
  if (status) list = list.filter((s) => (Array.isArray(status) ? status.includes(s.status) : s.status === status));
  if (vendorId) list = list.filter((s) => s.vendorId === vendorId);
  const order = { live: 0, scheduled: 1, ended: 2 };
  return respond([...list].sort((a, b) => (order[a.status] ?? 3) - (order[b.status] ?? 3) || b.viewers - a.viewers));
}

export function streamSync(id) {
  return normalizeStream(db.get('streams', id));
}

export async function getStream(id) {
  await db.waitForInitialSync();
  return respond(streamSync(id));
}

export function streamChannel(id) {
  return channel(`stream:${id}`);
}

export function getStreamMessages(streamId) {
  return db.where('streamChat', (message) => message.streamId === streamId)
    .sort((a, b) => String(a.createdAt || '').localeCompare(String(b.createdAt || '')));
}

export async function toggleStreamLike(streamId) {
  const user = currentUser();
  if (!user) throw new Error('Sign in to like this stream.');
  if (!CONFIG.USE_MOCK && UUID_PATTERN.test(user.id)) {
    const supabase = await getSupabase();
    if (!supabase) throw new Error('Live stream service is unavailable. Please try again.');
    const { data, error } = await supabase.rpc('toggle_stream_like', { p_stream_id: streamId });
    if (error) throw new Error(error.message || 'Could not update this stream like.');
    db.updateLocal('streams', streamId, { likes: data.likes });
    return data;
  }
  const stream = db.updateLocal('streams', streamId, (current) => ({ likes: (current.likes || 0) + 1 }));
  return { active: true, likes: stream?.likes || 0 };
}

export async function scheduleStream({ vendorId, title, scheduledAt, productIds, categoryId, thumbnail }) {
  const s = {
    id: uid('s'), vendorId, title, status: 'scheduled', categoryId, productIds, pinnedProductId: productIds[0] || null,
    videoUrl: null, thumbnail, viewers: 0, peakViewers: 0, likes: 0, startedAt: null, scheduledAt, status_moderation: 'ok',
  };
  await db.insertAndSync('streams', s);
  return respond(s);
}

export async function startStream(id) {
  const s = await db.updateAndSync('streams', id, { status: 'live', startedAt: new Date().toISOString(), viewers: 0 });
  streamChannel(id).send('status', 'live', { remote: false });
  return respond(s);
}

export async function endStream(id) {
  const current = db.get('streams', id);
  if (!current) throw new Error('Stream not found.');
  const s = await db.updateAndSync('streams', id, { status: 'ended', peakViewers: Math.max(current.peakViewers || 0, current.viewers || 0), viewers: 0 });
  streamChannel(id).send('status', 'ended', { remote: false });
  return respond(s);
}

export async function updateStream(id, patch) {
  return respond(await db.updateAndSync('streams', id, patch));
}

export async function pinProduct(streamId, productId) {
  await db.updateAndSync('streams', streamId, { pinnedProductId: productId });
  streamChannel(streamId).send('pin', productId, { remote: false });
}

export async function sendChat(streamId, msg) {
  const user = currentUser();
  let m;
  if (msg.role !== 'system' && !msg.simulated && user && !CONFIG.USE_MOCK && UUID_PATTERN.test(user.id)) {
    const supabase = await getSupabase();
    if (!supabase) throw new Error('Live chat service is unavailable. Please try again.');
    const { data, error } = await supabase.rpc('send_stream_message', { p_stream_id: streamId, p_text: msg.text });
    if (error) throw new Error(error.message || 'Could not send your stream message.');
    m = {
      ...data,
      streamId: data.stream_id,
      userId: data.user_id,
      userName: data.user_name,
      text: data.message,
      role: data.is_vendor ? 'host' : 'viewer',
      createdAt: data.created_at,
    };
    db.insertLocal('streamChat', m);
  } else {
    m = { id: uid('cm'), streamId, createdAt: new Date().toISOString(), ...msg };
  }
  streamChannel(streamId).send('chat', m);
  return m;
}

export function sendReaction(streamId, emoji) {
  streamChannel(streamId).send('reaction', emoji);
}

/**
 * Generates simulated audience activity (chat, reactions, viewer count) locally,
 * so a stream feels alive without a backend. Returns a stop function.
 */
export function simulateAudience(streamId, { onChat, onReaction, onViewers, onPurchase }) {
  const s = db.get('streams', streamId);
  let viewers = s?.viewers || 120;
  const timers = [
    setInterval(() => {
      onChat?.({ id: uid('cm'), userName: VIEWER_NAMES[Math.floor(Math.random() * VIEWER_NAMES.length)], text: chatPool[Math.floor(Math.random() * chatPool.length)], role: 'viewer', simulated: true });
    }, 2600),
    setInterval(() => onReaction?.(REACTIONS[Math.floor(Math.random() * REACTIONS.length)]), 900),
    setInterval(() => {
      viewers = Math.max(20, viewers + Math.floor(Math.random() * 41) - 16);
      onViewers?.(viewers);
    }, 3000),
    setInterval(() => {
      onPurchase?.(VIEWER_NAMES[Math.floor(Math.random() * VIEWER_NAMES.length)]);
    }, 11000),
  ];
  return () => timers.forEach(clearInterval);
}
