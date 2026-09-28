// Mock of Supabase Auth. Session = { userId, role, vendorId? }.
// Role checks here are only for UX; real enforcement belongs to RLS policies.
import { store } from './store.js';
import { CONFIG } from './config.js';
import { getSupabase } from './supabase.js';
import { routes, dashboardFor } from './routes.js';
import { db, respond } from '../services/db.js';
import { uid } from './utils.js';

export function getSession() {
  const session = store.get('session');
  if (!session || typeof session !== 'object') return null;

  const normalized = {
    userId: session.userId || null,
    role: session.role || null,
    vendorId: session.vendorId || null,
    email: session.email || null,
    name: session.name || null,
  };

  if (!normalized.userId && !normalized.email) {
    store.remove('session');
    return null;
  }

  return normalized;
}

function ensureUserVendorMatch(user) {
  if (!user) return null;

  const fallbackVendor = db.all('vendors').find((candidate) =>
    candidate.ownerId === user.id ||
    candidate.email?.toLowerCase() === String(user.email || '').toLowerCase() ||
    candidate.ownerName === user.name
  );

  if (!fallbackVendor) return user;
  const nextUser = {
    ...user,
    vendorId: user.vendorId || fallbackVendor.id,
    role: user.role || 'vendor',
  };

  if (user.id) {
    const existing = db.get('users', user.id);
    if (existing) {
      db.updateLocal('users', user.id, { ...existing, ...nextUser, vendorId: nextUser.vendorId });
    } else {
      const matchByEmail = db.all('users').find((candidate) => candidate.email?.toLowerCase() === String(user.email || '').toLowerCase());
      if (matchByEmail) {
        db.updateLocal('users', matchByEmail.id, { ...matchByEmail, ...nextUser, vendorId: nextUser.vendorId });
      } else {
        db.insertLocal('users', nextUser);
      }
    }
  }

  return nextUser;
}

export function currentUser() {
  const s = getSession();
  if (!s) return null;

  let user = s.userId ? db.get('users', s.userId) : null;
  if (!user && s.email) {
    user = db.all('users').find((candidate) => candidate.email?.toLowerCase() === String(s.email).toLowerCase());
  }

  if (!user) {
    user = {
      id: s.userId || s.email || `session_${Date.now()}`,
      name: s.name || (s.email ? s.email.split('@')[0] : 'User'),
      email: s.email || '',
      role: s.role || 'customer',
      vendorId: s.vendorId || null,
      phone: '',
      status: 'active',
      addresses: [],
      joinedAt: new Date().toISOString(),
    };
  }

  const hydrated = ensureUserVendorMatch(user);
  const fixed = {
    userId: hydrated.id,
    role: hydrated.role,
    vendorId: hydrated.vendorId || null,
    email: hydrated.email,
    name: hydrated.name,
  };

  if (s.userId !== fixed.userId || s.role !== fixed.role || s.vendorId !== fixed.vendorId || s.email !== fixed.email || s.name !== fixed.name) {
    try {
      store.set('session', fixed);
    } catch {
      // Ignore storage write failures; the valid user object should still be used.
    }
  }

  return hydrated;
}

export function currentVendor() {
  const u = currentUser();
  if (!u) return null;

  const vendorId = u.vendorId || db.all('vendors').find((candidate) =>
    candidate.ownerId === u.id ||
    candidate.email?.toLowerCase() === String(u.email || '').toLowerCase() ||
    candidate.ownerName === u.name
  )?.id;

  if (!vendorId) return null;

  const vendor = db.get('vendors', vendorId);
  if (vendor) {
    try {
      const session = store.get('session') || {};
      if (session.userId === u.id && session.vendorId !== vendor.id) {
        store.set('session', { ...session, vendorId: vendor.id });
      }
      if (u.vendorId !== vendor.id) {
        db.updateLocal('users', u.id, { ...u, vendorId: vendor.id });
      }
    } catch {
      // Ignore storage errors; the recovered vendor is still valid for rendering.
    }
    return vendor;
  }

  return null;
}

function pickCanonicalUser(user) {
  if (!user) return user;
  const email = String(user.email || '').trim().toLowerCase();
  const matches = db.all('users').filter((candidate) => {
    if (!candidate) return false;
    return candidate.id === user.id || (email && candidate.email && candidate.email.toLowerCase() === email);
  });

  if (!matches.length) return user;
  const best = matches.sort((a, b) => Number(Boolean(b.vendorId)) - Number(Boolean(a.vendorId)) || 0)[0];
  return {
    ...best,
    ...user,
    id: best.id || user.id,
    email: best.email || user.email || '',
    name: best.name || user.name || (user.email ? user.email.split('@')[0] : 'User'),
    role: best.role || user.role || 'customer',
    vendorId: best.vendorId || user.vendorId || null,
    phone: best.phone || user.phone || '',
    status: best.status || user.status || 'active',
    addresses: best.addresses || user.addresses || [],
    joinedAt: best.joinedAt || user.joinedAt || new Date().toISOString(),
  };
}

function startSession(user) {
  const canonical = ensureUserVendorMatch(pickCanonicalUser(user));
  const normalized = {
    id: canonical.id,
    name: canonical.name || canonical.email?.split('@')[0] || 'User',
    email: canonical.email || '',
    role: canonical.role || 'customer',
    vendorId: canonical.vendorId || null,
    phone: canonical.phone || '',
    status: canonical.status || 'active',
    addresses: canonical.addresses || [],
    joinedAt: canonical.joinedAt || new Date().toISOString(),
  };

  const existing = db.get('users', normalized.id) || db.all('users').find((candidate) => candidate.email?.toLowerCase() === normalized.email.toLowerCase());
  if (!existing) {
    db.insertLocal('users', normalized);
  } else if (existing.id === normalized.id || existing.email?.toLowerCase() === normalized.email.toLowerCase()) {
    const merged = {
      ...existing,
      ...normalized,
      id: existing.id || normalized.id,
      email: existing.email || normalized.email,
      vendorId: existing.vendorId || normalized.vendorId || null,
      role: existing.role || normalized.role,
    };
    db.updateLocal('users', merged.id, merged);
  }

  const session = { userId: normalized.id, role: normalized.role, vendorId: normalized.vendorId || null, email: normalized.email, name: normalized.name };
  store.set('session', session);
  return normalized;
}

function fallbackDemoUser(email, role) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const vendor = db.all('vendors').find((candidate) => candidate.email?.toLowerCase() === normalizedEmail);
  const existing = db.all('users').find((candidate) => candidate.email?.toLowerCase() === normalizedEmail);

  if (existing) return existing;
  if (vendor) {
    return {
      id: vendor.ownerId || uid('u'),
      name: vendor.ownerName || vendor.name || 'Vendor Demo',
      email: vendor.email,
      password: CONFIG.DEMO_ACCOUNTS[role]?.password || 'demo123',
      role: 'vendor',
      vendorId: vendor.id,
      phone: vendor.phone || '',
      status: 'active',
      joinedAt: new Date().toISOString(),
    };
  }

  const demo = CONFIG.DEMO_ACCOUNTS[role];
  if (!demo) return null;
  return {
    id: uid('u'),
    name: role === 'admin' ? 'Platform Admin' : role === 'vendor' ? 'Vendor Demo' : 'Customer Demo',
    email: normalizedEmail,
    password: demo.password,
    role,
    status: 'active',
    joinedAt: new Date().toISOString(),
  };
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
    role: profile?.role || 'customer',
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
  const demoAccount = Object.entries(CONFIG.DEMO_ACCOUNTS).find(([, account]) => account.email.toLowerCase() === normalizedEmail);

  if (isDemoAccount(normalizedEmail) || CONFIG.USE_MOCK) {
    await respond(null, 350);

    const demoUser = localUser || fallbackDemoUser(normalizedEmail, demoAccount?.[0] || 'customer');

    if (!demoUser || demoUser.password !== password) throw new Error('Invalid email or password.');
    if (demoUser.status === 'blocked') throw new Error('This account has been suspended. Contact support.');

    const canonicalUser = pickCanonicalUser(demoUser);
    const existingUser = db.all('users').find((candidate) => candidate.email?.toLowerCase() === normalizedEmail);
    if (existingUser && existingUser.id !== canonicalUser.id) {
      db.updateLocal('users', existingUser.id, { ...existingUser, ...canonicalUser, id: existingUser.id, email: existingUser.email || canonicalUser.email, vendorId: existingUser.vendorId || canonicalUser.vendorId || null });
      return startSession({ ...existingUser, ...canonicalUser, id: existingUser.id, email: existingUser.email || canonicalUser.email, vendorId: existingUser.vendorId || canonicalUser.vendorId || null });
    }
    if (existingUser) {
      db.updateLocal('users', existingUser.id, { ...existingUser, ...canonicalUser, vendorId: existingUser.vendorId || canonicalUser.vendorId || null });
      return startSession({ ...existingUser, ...canonicalUser, vendorId: existingUser.vendorId || canonicalUser.vendorId || null });
    }
    db.insertLocal('users', canonicalUser);
    return startSession(canonicalUser);
  }

  const supabase = await getSupabase();
  if (!supabase) throw new Error('Authentication is unavailable. Check your connection and try again.');
  const { data, error } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
  if (error) throw new Error(error.message || 'Invalid email or password.');
  if (!data.user) throw new Error('Supabase did not return an authenticated user.');
  const user = startSession(await syncAuthUser(supabase, data.user));
  await db.syncNow();
  return user;
}

export function demoLogin(role) {
  const acc = CONFIG.DEMO_ACCOUNTS[role];
  return login(acc.email, acc.password);
}

export async function register({ name, email, password, phone, role, storeName, storeCategory }) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail) || normalizedEmail.length > 254) throw new Error('Enter a valid email address.');
  if (typeof password !== 'string' || password.length < 6 || password.length > 128) throw new Error('Password must be 6 to 128 characters.');
  if (!['customer', 'vendor'].includes(role)) throw new Error('Invalid account role.');
  if (typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 100) throw new Error('Name must be 2 to 100 characters.');
  if (typeof phone !== 'string' || phone.trim().length > 30 || !/^\+?[0-9\s()-]{10,30}$/.test(phone.trim())) throw new Error('Enter a valid phone number.');
  if (role === 'vendor' && (typeof storeName !== 'string' || storeName.trim().length < 2 || storeName.trim().length > 120)) throw new Error('Store name must be 2 to 120 characters.');

  if (CONFIG.USE_MOCK) {
    if (db.all('users').some((user) => user.email.toLowerCase() === normalizedEmail)) {
      await respond(null, 300);
      throw new Error('An account with this email already exists.');
    }
    const user = { id: uid('u'), name: name.trim(), email: normalizedEmail, password, phone: phone.trim(), role, status: 'active', joinedAt: new Date().toISOString(), addresses: [] };
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
    email: normalizedEmail,
    password,
    options: { data: { name, role, phone, storeName, storeCategory } },
  });
  if (error) throw new Error(error.message || 'Could not create your account.');
  if (!data.user) throw new Error('Could not create your account.');

  if (!data.session) {
    // Supabase created the account but no session was returned (e.g. email
    // confirmation is required). Keep direct sign-in working by mirroring the
    // account locally so the user lands in their dashboard without a forced
    // email round-trip.
    const createdAt = data.user.created_at || new Date().toISOString();
    const localUser = {
      id: data.user.id,
      name,
      email: normalizedEmail,
      phone,
      role,
      status: 'active',
      joinedAt: createdAt,
      addresses: [],
    };
    if (role === 'vendor') {
      const vendor = {
        id: uid('v'),
        name: storeName,
        slug: storeName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        ownerId: localUser.id,
        ownerName: name,
        email: normalizedEmail,
        phone,
        location: 'Dhaka',
        color: '#2563eb',
        description: `${storeName} — ${storeCategory || 'General store'}`,
        status: 'pending',
        verified: false,
        rating: 0,
        followers: 0,
        joinedAt: createdAt,
        commissionRate: 10,
        balance: 0,
      };
      db.insertLocal('vendors', vendor);
      localUser.vendorId = vendor.id;
    }
    db.insertLocal('users', localUser);
    return startSession(localUser);
  }

  const user = await syncAuthUser(supabase, data.user);
  if (role === 'vendor' && !user.vendorId) throw new Error('Your account was created, but the store profile is missing. Contact support.');
  const signedInUser = startSession(user);
  await db.syncNow();
  return signedInUser;
}

export async function changePassword(currentPassword, newPassword) {
  const user = currentUser();
  if (!user) throw new Error('Sign in before changing your password.');
  const isLiveAccount = !CONFIG.USE_MOCK && /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(user.id);
  if (!isLiveAccount) {
    if (user.password !== currentPassword) throw new Error('Current password is incorrect.');
    db.updateLocal('users', user.id, { password: newPassword });
    return;
  }

  const supabase = await getSupabase();
  if (!supabase) throw new Error('Password service is unavailable. Please try again.');
  const { data, error } = await supabase.auth.signInWithPassword({ email: user.email, password: currentPassword });
  if (error || data.user?.id !== user.id) throw new Error('Current password is incorrect.');
  const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
  if (updateError) throw new Error(updateError.message || 'Could not update the password.');
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
  store.remove('cart');
  store.remove('wishlist');
  store.remove('session');
  if (redirect) location.href = routes.home();
}

/** Redirects away unless the signed-in user has one of `roles`. Returns the user. */
export function requireRole(...roles) {
  const user = currentUser();
  if (!user) {
    const next = encodeURIComponent(location.pathname + location.search);
    location.replace(routes.login(next));
    return null;
  }
  if (roles.length && !roles.includes(user.role)) {
    const allowed = dashboardFor(user.role);
    location.replace(allowed || routes.home());
    return null;
  }
  return user;
}
