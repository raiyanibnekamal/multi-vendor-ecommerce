// Per-user lists (likes, saves, follows, activity) kept in localStorage.
// In Supabase these become join tables: reel_likes, reel_saves, vendor_follows, user_events.
import { store } from '../core/store.js';
import { getSession } from '../core/auth.js';

export function userKey(k) {
  const s = getSession();
  return s ? `u_${s.userId}_${k}` : `guest_${k}`;
}

export function getList(k) {
  return store.get(userKey(k), []);
}

export function inList(k, id) {
  return getList(k).includes(id);
}

/** Toggles `id` in the list and returns whether it is now present. */
export function toggleInList(k, id) {
  const list = getList(k);
  const i = list.indexOf(id);
  if (i >= 0) list.splice(i, 1);
  else list.unshift(id);
  store.set(userKey(k), list);
  return i < 0;
}
