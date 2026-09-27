import { db, respond } from './db.js';
import { getList, inList, toggleInList } from './userdata.js';

export function vendorSync(id) {
  return db.get('vendors', id);
}

export async function getVendors({ status = 'approved', q } = {}) {
  let list = db.all('vendors');
  if (status !== 'all') list = list.filter((v) => v.status === status);
  if (q) list = list.filter((v) => `${v.name} ${v.ownerName} ${v.email}`.toLowerCase().includes(q.toLowerCase()));
  return respond(list);
}

export async function getVendor(id) {
  return respond(db.get('vendors', id));
}

export async function updateVendor(id, patch) {
  return respond(db.update('vendors', id, patch));
}

export function isFollowing(vendorId) {
  return inList('following', vendorId);
}

export function toggleFollow(vendorId) {
  const now = toggleInList('following', vendorId);
  db.update('vendors', vendorId, (v) => ({ followers: Math.max(0, v.followers + (now ? 1 : -1)) }));
  return now;
}

export async function getFollowing() {
  return respond(getList('following').map((id) => db.get('vendors', id)).filter(Boolean));
}

export function vendorProductCount(vendorId) {
  return db.where('products', (p) => p.vendorId === vendorId).length;
}
