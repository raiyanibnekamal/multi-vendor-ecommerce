import { db, respond } from './db.js';
import { inList, toggleInList, getList } from './userdata.js';
import { currentUser } from '../core/auth.js';
import { uid } from '../core/utils.js';

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
  return respond([...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
}

export function reelSync(id) {
  return db.get('reels', id);
}

export function reelsForProduct(productId) {
  return db.where('reels', (r) => r.status === 'approved' && r.productIds.includes(productId));
}

export const isLiked = (id) => inList('likedReels', id);
export const isSaved = (id) => inList('savedReels', id);

export function toggleLike(id) {
  const now = toggleInList('likedReels', id);
  db.update('reels', id, (r) => ({ likes: r.likes + (now ? 1 : -1) }));
  return now;
}

export function toggleSave(id) {
  const now = toggleInList('savedReels', id);
  db.update('reels', id, (r) => ({ saves: r.saves + (now ? 1 : -1) }));
  return now;
}

export function recordShare(id) {
  db.update('reels', id, (r) => ({ shares: r.shares + 1 }));
}

export function recordView(id) {
  db.update('reels', id, (r) => ({ views: r.views + 1 }));
}

export async function getSavedReels() {
  return respond(getList('savedReels').map((id) => db.get('reels', id)).filter(Boolean));
}

export async function getComments(reelId) {
  return respond(db.where('reelComments', (c) => c.reelId === reelId && !c.flagged).sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
}

export async function addComment(reelId, text) {
  const user = currentUser();
  const c = { id: uid('rc'), reelId, userId: user.id, userName: user.name, text, createdAt: new Date().toISOString() };
  db.insert('reelComments', c);
  db.update('reels', reelId, (r) => ({ comments: r.comments + 1 }));
  return respond(c, 120);
}

export async function createReel({ vendorId, caption, productIds, videoUrl, poster }) {
  const reel = {
    id: uid('r'), vendorId, caption, productIds, poster,
    videoUrl: videoUrl || SAMPLE_VIDEOS[Math.floor(Math.random() * SAMPLE_VIDEOS.length)],
    likes: 0, comments: 0, shares: 0, saves: 0, views: 0, status: 'pending', createdAt: new Date().toISOString(),
  };
  db.insert('reels', reel);
  return respond(reel, 800);
}

export async function updateReel(id, patch) {
  return respond(db.update('reels', id, patch));
}

export async function deleteReel(id) {
  db.remove('reels', id);
  return respond(true);
}
