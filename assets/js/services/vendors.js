import { db, respond } from './db.js';
import { getList, inList, toggleInList, userKey } from './userdata.js';
import { CONFIG } from '../core/config.js';
import { getSupabase } from '../core/supabase.js?v=20260928-11';
import { store } from '../core/store.js';

const UUID_PATTERN = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

function toCamel(row) {
  return Object.fromEntries(Object.entries(row || {}).map(([key, value]) => [key.replace(/_([a-z0-9])/g, (_, char) => char.toUpperCase()), value]));
}

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
  const vendor = CONFIG.USE_MOCK
    ? db.update('vendors', id, patch)
    : await db.updateAndSync('vendors', id, patch);
  return respond(vendor);
}

export async function requestVendorPayout({ vendorId, amount, method, account }) {
  const vendor = db.get('vendors', vendorId);
  if (!vendor || !Number.isFinite(Number(amount)) || amount < 1000 || amount > vendor.balance || !['bank', 'bkash'].includes(method) || !account?.trim()) {
    throw new Error('Enter a valid payout amount and account.');
  }

  if (CONFIG.USE_MOCK || !UUID_PATTERN.test(vendor.ownerId || '')) {
    const payout = {
      id: `PO-${Date.now()}`,
      vendorId,
      amount,
      method,
      accountInfo: { account: account.trim() },
      status: 'pending',
      requestedAt: new Date().toISOString(),
    };
    db.insertLocal('payouts', payout);
    db.updateLocal('vendors', vendorId, { balance: vendor.balance - amount });
    return payout;
  }

  const supabase = await getSupabase();
  if (!supabase) throw new Error('Payout service is unavailable. Please try again.');
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || authData.user?.id !== vendor.ownerId) throw new Error('Vendor authentication is required.');
  const { data, error } = await supabase.rpc('request_vendor_payout', {
    p_amount: amount,
    p_method: method,
    p_account_info: { account: account.trim() },
    p_note: null,
  });
  if (error) throw new Error(error.message || 'Could not request this payout.');

  const payout = toCamel(data.payout);
  db.insertLocal('payouts', payout);
  db.updateLocal('vendors', vendorId, { balance: data.vendor_balance });
  return payout;
}

function updateLocalPayoutStatus(payout, status) {
  if (status === 'rejected' && !['rejected', 'paid'].includes(payout.status)) {
    const vendor = db.get('vendors', payout.vendorId);
    db.updateLocal('vendors', payout.vendorId, { balance: (vendor?.balance || 0) + payout.amount });
  }
  return db.updateLocal('payouts', payout.id, { status, ...(status === 'paid' ? { processedAt: new Date().toISOString() } : {}) });
}

export async function updatePayoutStatus(payoutId, status) {
  const payout = db.get('payouts', payoutId);
  if (!payout) throw new Error('Payout not found.');

  if (CONFIG.USE_MOCK) {
    return updateLocalPayoutStatus(payout, status);
  }

  const supabase = await getSupabase();
  if (!supabase) throw new Error('Payout service is unavailable. Please try again.');
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    const session = store.get('session');
    if (!authError && session && !UUID_PATTERN.test(session.userId || '')) {
      return updateLocalPayoutStatus(payout, status);
    }
    throw new Error('Admin authentication is required.');
  }

  const { data, error } = await supabase.rpc('admin_update_payout_status', {
    p_payout_id: payoutId,
    p_status: status,
  });
  if (error) throw new Error(error.message || 'Could not update this payout.');
  if (status === 'rejected') db.updateLocal('vendors', payout.vendorId, { balance: data.vendor_balance });
  return db.updateLocal('payouts', payoutId, { status: data.payout.status, ...(data.payout.processed_at ? { processedAt: data.payout.processed_at } : {}) });
}

export function isFollowing(vendorId) {
  return inList('following', vendorId);
}

export async function toggleFollow(vendorId) {
  const session = store.get('session');
  const isLiveAccount = !CONFIG.USE_MOCK && UUID_PATTERN.test(session?.userId || '');
  if (isLiveAccount) {
    const supabase = await getSupabase();
    if (!supabase) throw new Error('Follow service is unavailable. Please try again.');
    const { data, error } = await supabase.rpc('toggle_vendor_follow', { p_vendor_id: vendorId });
    if (error) throw new Error(error.message || 'Could not update this follow.');
    const list = getList('following').filter((id) => id !== vendorId);
    if (data.following) list.unshift(vendorId);
    store.set(userKey('following'), list);
    db.updateLocal('vendors', vendorId, { followers: data.followers });
    return data.following;
  }

  const now = toggleInList('following', vendorId);
  db.updateLocal('vendors', vendorId, (vendor) => ({ followers: Math.max(0, vendor.followers + (now ? 1 : -1)) }));
  return now;
}

export async function getFollowing() {
  return respond(getList('following').map((id) => db.get('vendors', id)).filter(Boolean));
}

export function vendorProductCount(vendorId) {
  return db.where('products', (p) => p.vendorId === vendorId).length;
}
