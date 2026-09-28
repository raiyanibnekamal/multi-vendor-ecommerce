import { db, respond } from './db.js';
import { inList, toggleInList, getList } from './userdata.js';
import { currentUser } from '../core/auth.js';
import { uid } from '../core/utils.js';
import { CONFIG } from '../core/config.js';
import { getSupabase } from '../core/supabase.js';
import { store } from '../core/store.js';
import { userKey } from './userdata.js';

const UUID_PATTERN = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

function setInteractionList(key, reelId, active) {
  const list = getList(key).filter((id) => id !== reelId);
  if (active) list.unshift(reelId);
  store.set(userKey(key), list);
}

async function isLiveAccount() {
  const user = currentUser();
  return !CONFIG.USE_MOCK && UUID_PATTERN.test(user?.id || '') ? user : null;
}

export const SAMPLE_VIDEOS = [
  'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
  'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/friday.mp4',
  'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/360/Big_Buck_Bunny_360_10s_1MB.mp4',
  'https://test-videos.co.uk/vids/jellyfish/mp4/h264/360/Jellyfish_360_10s_1MB.mp4',
];

export async function getReels({ vendorId, status = 'approved' } = {}) {
  let list = db.all('reels');
  if (status !== 'all') list = list.filter((r) => r.status === status);
  if (vendorId) list = list.filter((r) => r.vendorId === vendorId);
  const liveVendors = new Set(db.where('vendors', (v) => v.status === 'approved').map((v) => v.id));
  if (!vendorId && status === 'approved') list = list.filter((r) => liveVendors.has(r.vendorId));
  return respond([...list].sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || ''))));
}

export function reelSync(id) {
  return db.get('reels', id);
}

export function reelsForProduct(productId) {
  return db.where('reels', (r) => r.status === 'approved' && Array.isArray(r.productIds) && r.productIds.includes(productId));
}

export const isLiked = (id) => inList('likedReels', id);
export const isSaved = (id) => inList('savedReels', id);

export async function toggleLike(id) {
  const user = await isLiveAccount();
  if (user) {
    const supabase = await getSupabase();
    if (!supabase) throw new Error('Reel service is unavailable. Please try again.');
    const { data, error } = await supabase.rpc('toggle_reel_engagement', { p_reel_id: id, p_kind: 'like' });
    if (error) throw new Error(error.message || 'Could not update this like.');
    setInteractionList('likedReels', id, data.active);
    db.updateLocal('reels', id, { likes: data.count });
    return data.active;
  }
  const now = toggleInList('likedReels', id);
  db.updateLocal('reels', id, (r) => ({ likes: r.likes + (now ? 1 : -1) }));
  return now;
}

export async function toggleSave(id) {
  const user = await isLiveAccount();
  if (user) {
    const supabase = await getSupabase();
    if (!supabase) throw new Error('Reel service is unavailable. Please try again.');
    const { data, error } = await supabase.rpc('toggle_reel_engagement', { p_reel_id: id, p_kind: 'save' });
    if (error) throw new Error(error.message || 'Could not update this saved reel.');
    setInteractionList('savedReels', id, data.active);
    db.updateLocal('reels', id, { saves: data.count });
    return data.active;
  }
  const now = toggleInList('savedReels', id);
  db.updateLocal('reels', id, (r) => ({ saves: r.saves + (now ? 1 : -1) }));
  return now;
}

export async function recordShare(id) {
  return recordEvent(id, 'share');
}

export async function recordView(id) {
  return recordEvent(id, 'view');
}

async function recordEvent(id, event) {
  const live = !CONFIG.USE_MOCK;
  const reel = db.get('reels', id);
  if (!reel) return;
  const field = event === 'view' ? 'views' : 'shares';
  db.updateLocal('reels', id, (current) => ({ [field]: current[field] + 1 }));
  if (live) {
    const supabase = await getSupabase();
    if (!supabase) return;
    const { data, error } = await supabase.rpc('record_reel_event', { p_reel_id: id, p_event: event });
    if (error) {
      console.warn(`[StreamCart] Reel ${event} sync failed:`, error.message);
      return;
    }
    db.updateLocal('reels', id, { [field]: data });
  }
}

export async function getSavedReels() {
  return respond(getList('savedReels').map((id) => db.get('reels', id)).filter(Boolean));
}

export async function getComments(reelId) {
  return respond(db.where('reelComments', (c) => c.reelId === reelId && !c.flagged).sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || ''))));
}

export async function addComment(reelId, text) {
  const user = currentUser();
  if (!user) throw new Error('Sign in to comment on reels.');
  let c;
  if (!CONFIG.USE_MOCK && UUID_PATTERN.test(user.id)) {
    const supabase = await getSupabase();
    if (!supabase) throw new Error('Comment service is unavailable. Please try again.');
    const { data, error } = await supabase.rpc('add_reel_comment', { p_reel_id: reelId, p_comment: text });
    if (error) throw new Error(error.message || 'Could not post this comment.');
    c = { ...data, reelId: data.reel_id, userId: data.user_id, text: data.comment, createdAt: data.created_at };
    db.insertLocal('reelComments', c);
    db.updateLocal('reels', reelId, (reel) => ({ comments: reel.comments + 1 }));
  } else {
    c = { id: uid('rc'), reelId, userId: user.id, userName: user.name, text, createdAt: new Date().toISOString() };
    db.insertLocal('reelComments', c);
    db.updateLocal('reels', reelId, (reel) => ({ comments: reel.comments + 1 }));
  }
  return respond(c, 120);
}

export async function createReel({ vendorId, caption, productIds, videoUrl, poster }) {
  const reel = {
    id: uid('r'), vendorId, caption, productIds, poster,
    videoUrl: videoUrl || SAMPLE_VIDEOS[Math.floor(Math.random() * SAMPLE_VIDEOS.length)],
    likes: 0, comments: 0, shares: 0, saves: 0, views: 0, status: 'pending', createdAt: new Date().toISOString(),
  };
  const user = currentUser();
  if (!CONFIG.USE_MOCK && UUID_PATTERN.test(user?.id || '')) {
    const supabase = await getSupabase();
    if (!supabase) throw new Error('Reel service is unavailable. Please try again.');
    const { data, error } = await supabase.rpc('create_reel_with_products', {
      p_reel: reel,
      p_product_ids: productIds,
    });
    if (error) throw new Error(error.message || 'Could not publish this reel.');
    const saved = {
      ...data.reel,
      videoUrl: data.reel.video_url,
      poster: data.reel.poster_url,
      productIds: data.productIds,
      comments: data.reel.comments_count,
      createdAt: data.reel.created_at,
    };
    db.insertLocal('reels', saved);
    return respond(saved, 200);
  }
  db.insertLocal('reels', reel);
  return respond(reel, 800);
}

export async function updateReel(id, patch) {
  return respond(await db.updateAndSync('reels', id, patch));
}

export async function deleteReel(id) {
  await db.removeAndSync('reels', id);
  return respond(true);
}
