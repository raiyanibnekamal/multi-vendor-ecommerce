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

function isDemoAccount(email) {
  const demoEmails = Object.values(CONFIG.DEMO_ACCOUNTS).map((account) => account.email.toLowerCase());
  return demoEmails.includes(String(email).trim().toLowerCase());
}

async function syncAuthUser(supabase, authUser) {
  const { data: profile, error } = await supabase.from('profiles').select('*').eq('id', authUser.id).maybeSingle();
  if (error) console.warn('[StreamCart Auth] Profile lookup failed:', error.message);
  const existing = db.all('users').find((candidate) => candidate.email.toLowerCase() === authUser.email?.toLowerCase());
  const metadata = authUser.user_metadata || {};
  const user = {
    id: authUser.id,
    name: profile?.name || metadata.name || existing?.name || authUser.email?.split('@')[0] || 'Customer',
    email: authUser.email || profile?.email || '',
    role: profile?.role || metadata.role || existing?.role || 'customer',
    vendorId: profile?.vendor_id || existing?.vendorId || null,
    phone: profile?.phone || metadata.phone || existing?.phone || '',
    status: profile?.status || 'active',
    addresses: profile?.addresses || existing?.addresses || [],
    joinedAt: profile?.created_at || authUser.created_at || new Date().toISOString(),
  };
  if (user.status === 'blocked' || user.status === 'suspended') throw new Error('This account has been suspended. Contact support.');
  db.insertLocal('users', user);
  return user;
}

export async function login(email, password) {
  const normalizedEmail = String(email).trim().toLowerCase();
  const localUser = db.all('users').find((user) => user.email.toLowerCase() === normalizedEmail);
  if (isDemoAccount(normalizedEmail) || CONFIG.USE_MOCK) {
    await respond(null, 350);
    if (!localUser || localUser.password !== password) throw new Error('Invalid email or password.');
    if (localUser.status === 'blocked') throw new Error('This account has been suspended. Contact support.');
    return startSession(localUser);
  }

  const supabase = await getSupabase();
  if (!supabase) throw new Error('Authentication is unavailable. Check your connection and try again.');
  const { data, error } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
  if (error) throw new Error(error.message || 'Invalid email or password.');
  if (!data.user) throw new Error('Supabase did not return an authenticated user.');
  return startSession(await syncAuthUser(supabase, data.user));
}

export function demoLogin(role) {
  const acc = CONFIG.DEMO_ACCOUNTS[role];
  return login(acc.email, acc.password);
}

export async function register({ name, email, password, phone, role, storeName, storeCategory }) {
  if (CONFIG.USE_MOCK) {
    if (db.all('users').some((user) => user.email.toLowerCase() === email.toLowerCase())) {
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
    db.insertLocal('users', user);
    await respond(null, 400);
    return startSession(user);
  }

  const supabase = await getSupabase();
  if (!supabase) throw new Error('Registration is unavailable. Check your connection and try again.');
  const { data, error } = await supabase.auth.signUp({
    email: email.trim().toLowerCase(),
    password,
    options: { data: { name, role, phone } },
  });
  if (error) throw new Error(error.message || 'Could not create your account.');
  if (!data.user || !data.session) {
    throw new Error('Account created. Check your email to confirm it, then sign in.');
  }

  const user = await syncAuthUser(supabase, data.user);
  if (role === 'vendor') {
    const vendor = {
      id: uid('v'), name: storeName, slug: storeName.toLowerCase().replace(/[^a-z0-9]+/g, '-'), ownerId: data.user.id, ownerName: name,
      email: email.trim().toLowerCase(), phone, location: 'Dhaka', color: '#2563eb', description: `${storeName} — ${storeCategory || 'General store'}`,
      status: 'pending', verified: false, rating: 0, followers: 0, joinedAt: user.joinedAt, commissionRate: 10, balance: 0,
    };
    const { error: vendorError } = await supabase.from('vendors').insert({
      id: vendor.id, owner_id: data.user.id, name: vendor.name, slug: vendor.slug, owner_name: name,
      email: vendor.email, phone, location: vendor.location, color: vendor.color, description: vendor.description,
      status: 'pending', verified: false, rating: 0, followers: 0, commission_rate: 10, balance: 0,
    });
    if (vendorError) throw new Error(vendorError.message || 'Your account was created, but the store could not be created.');
    const { error: profileError } = await supabase.from('profiles').update({ vendor_id: vendor.id }).eq('id', data.user.id);
    if (profileError) console.warn('[StreamCart Auth] Vendor profile link failed:', profileError.message);
    db.insertLocal('vendors', vendor);
    user.vendorId = vendor.id;
  }
  return startSession(user);
}

export async function logout(redirect = true) {
  if (!CONFIG.USE_MOCK) {
    try {
      const supabase = await getSupabase();
      if (supabase) await supabase.auth.signOut();
    } catch (err) {
      console.warn('[StreamCart Auth] Remote sign-out failed:', err);
    }
  }
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
