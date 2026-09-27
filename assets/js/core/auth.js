// Mock of Supabase Auth. Session = { userId, role, vendorId? }.
// Role checks here are only for UX; real enforcement belongs to RLS policies.
import { store } from './store.js';
import { CONFIG } from './config.js';
import { routes, dashboardFor } from './routes.js';
import { db, respond } from '../services/db.js';
import { uid } from './utils.js';

export function getSession() {
  return store.get('session');
}

export function currentUser() {
  const s = getSession();
  return s ? db.get('users', s.userId) : null;
}

export function currentVendor() {
  const u = currentUser();
  return u?.vendorId ? db.get('vendors', u.vendorId) : null;
}

function startSession(user) {
  store.set('session', { userId: user.id, role: user.role, vendorId: user.vendorId || null });
  return user;
}

export async function login(email, password) {
  const user = db.all('users').find((u) => u.email.toLowerCase() === String(email).trim().toLowerCase());
  await respond(null, 350);
  if (!user || user.password !== password) throw new Error('Invalid email or password.');
  if (user.status === 'blocked') throw new Error('This account has been suspended. Contact support.');
  return startSession(user);
}

export function demoLogin(role) {
  const acc = CONFIG.DEMO_ACCOUNTS[role];
  return login(acc.email, acc.password);
}

export async function register({ name, email, password, phone, role, storeName, storeCategory }) {
  if (db.all('users').some((u) => u.email.toLowerCase() === email.toLowerCase())) {
    await respond(null, 300);
    throw new Error('An account with this email already exists.');
  }
  const user = { id: uid('u'), name, email, password, phone, role, status: 'active', joinedAt: new Date().toISOString(), addresses: [] };
  if (role === 'vendor') {
    const vendor = {
      id: uid('v'), name: storeName, slug: storeName.toLowerCase().replace(/[^a-z0-9]+/g, '-'), ownerId: user.id, ownerName: name,
      email, phone, location: 'Dhaka', color: '#2563eb', description: `${storeName} — ${storeCategory || 'General store'}`,
      status: 'pending', verified: false, rating: 0, followers: 0, joinedAt: user.joinedAt, commissionRate: 10, balance: 0,
    };
    db.insert('vendors', vendor);
    user.vendorId = vendor.id;
  }
  db.insert('users', user);
  await respond(null, 400);
  return startSession(user);
}

export function logout(redirect = true) {
  store.remove('session');
  if (redirect) location.href = routes.home();
}

/** Redirects away unless the signed-in user has one of `roles`. Returns the user. */
export function requireRole(...roles) {
  const user = currentUser();
  if (!user) {
    location.replace(routes.login(location.pathname + location.search));
    return null;
  }
  if (roles.length && !roles.includes(user.role)) {
    location.replace(dashboardFor(user.role));
    return null;
  }
  return user;
}
