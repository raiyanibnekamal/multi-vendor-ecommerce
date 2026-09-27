// Live stream state. Video transport would come from Agora/LiveKit; chat, reactions,
// pinned product and viewer counts are synced through the realtime channel.
import { db, respond } from './db.js';
import { channel } from './realtime.js';
import { chatPool } from '../data/streams.js';
import { uid } from '../core/utils.js';

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

export async function scheduleStream({ vendorId, title, scheduledAt, productIds, categoryId, thumbnail }) {
  const s = {
    id: uid('s'), vendorId, title, status: 'scheduled', categoryId, productIds, pinnedProductId: productIds[0] || null,
    videoUrl: null, thumbnail, viewers: 0, peakViewers: 0, likes: 0, startedAt: null, scheduledAt, status_moderation: 'ok',
  };
  db.insert('streams', s);
  return respond(s);
}

export async function startStream(id) {
  const s = db.update('streams', id, { status: 'live', startedAt: new Date().toISOString(), viewers: 0 });
  streamChannel(id).send('status', 'live', { remote: false });
  return respond(s);
}

export async function endStream(id) {
  const s = db.update('streams', id, (st) => ({ status: 'ended', peakViewers: Math.max(st.peakViewers || 0, st.viewers || 0), viewers: 0 }));
  streamChannel(id).send('status', 'ended', { remote: false });
  return respond(s);
}

export async function updateStream(id, patch) {
  return respond(db.update('streams', id, patch));
}

export function pinProduct(streamId, productId) {
  db.update('streams', streamId, { pinnedProductId: productId });
  streamChannel(streamId).send('pin', productId, { remote: false });
}

export function sendChat(streamId, msg) {
  const m = { id: uid('cm'), createdAt: new Date().toISOString(), ...msg };
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
