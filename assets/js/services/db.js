// Database Layer with dual-mode support (Mock / Live Supabase)
import { store } from '../core/store.js';
import { CONFIG } from '../core/config.js';
import { sleep } from '../core/utils.js';
import { getSupabase } from '../core/supabase.js';

import { categories } from '../data/categories.js';
import { vendors } from '../data/vendors.js';
import { users } from '../data/users.js';
import { products } from '../data/products.js';
import { reels, reelComments } from '../data/reels.js';
import { streams } from '../data/streams.js';
import { orders } from '../data/orders.js';
import { disputes, payouts } from '../data/admin.js';
import { conversations } from '../data/messages.js';

const SEEDS = {
  categories, vendors, users, products, reels, reelComments, streams, orders, disputes, payouts, conversations,
  reviews: [],
  streamChat: [],
};

const cache = {};
const tableKey = (t) => `db_${t}`;

function snakeToCamel(row) {
  if (!row || typeof row !== 'object' || Array.isArray(row)) return row;
  const out = {};
  for (const [k, v] of Object.entries(row)) {
    const ck = k.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase());
    out[ck] = v;
  }
  return out;
}

function camelToSnake(row) {
  if (!row || typeof row !== 'object' || Array.isArray(row)) return row;
  const out = {};
  for (const [k, v] of Object.entries(row)) {
    const sk = k.replace(/[A-Z]/g, (c) => '_' + c.toLowerCase());
    out[sk] = v;
  }
  return out;
}

function load(table) {
  if (!cache[table]) {
    const saved = store.get(tableKey(table));
    cache[table] = saved ?? structuredClone(SEEDS[table] ?? []);
  }
  return cache[table];
}

function persist(table) {
  store.set(tableKey(table), cache[table]);
}

// Background sync from live Supabase
async function syncFromSupabase() {
  if (CONFIG.USE_MOCK) return;
  const supabase = await getSupabase();
  if (!supabase) return;

  const tableMap = {
    categories: 'categories',
    vendors: 'vendors',
    products: 'products',
    reels: 'reels',
    streams: 'live_streams',
    orders: 'orders',
    payouts: 'payouts',
    disputes: 'disputes',
  };

  for (const [appTable, pgTable] of Object.entries(tableMap)) {
    try {
      const { data, error } = await supabase.from(pgTable).select('*').limit(200);
      if (!error && data && data.length > 0) {
        const camelData = data.map(snakeToCamel);
        cache[appTable] = camelData;
        persist(appTable);
      }
    } catch (err) {
      console.warn(`[StreamCart] Sync failed for ${appTable}:`, err);
    }
  }
}

// Trigger initial sync if online & not mock
if (typeof window !== 'undefined' && !CONFIG.USE_MOCK) {
  syncFromSupabase();
}

window.addEventListener('storage', (e) => {
  const prefix = CONFIG.STORAGE_PREFIX + 'db_';
  if (e.key?.startsWith(prefix)) delete cache[e.key.slice(prefix.length)];
});

export const db = {
  all: (table) => load(table),
  get: (table, id) => load(table).find((r) => r.id === id) || null,
  where: (table, fn) => load(table).filter(fn),
  insert(table, row) {
    load(table).unshift(row);
    persist(table);

    if (!CONFIG.USE_MOCK) {
      getSupabase().then((supabase) => {
        if (!supabase) return;
        const pgTable = table === 'streams' ? 'live_streams' : table;
        supabase.from(pgTable).insert(camelToSnake(row)).catch((err) => {
          console.warn(`[StreamCart] Supabase insert failed for ${table}:`, err);
        });
      });
    }

    return row;
  },
  update(table, id, patch) {
    const row = db.get(table, id);
    if (!row) return null;
    const updated = typeof patch === 'function' ? patch(row) : patch;
    Object.assign(row, updated);
    persist(table);

    if (!CONFIG.USE_MOCK) {
      getSupabase().then((supabase) => {
        if (!supabase) return;
        const pgTable = table === 'streams' ? 'live_streams' : table;
        supabase.from(pgTable).update(camelToSnake(updated)).eq('id', id).catch((err) => {
          console.warn(`[StreamCart] Supabase update failed for ${table}:`, err);
        });
      });
    }

    return row;
  },
  remove(table, id) {
    const rows = load(table);
    const i = rows.findIndex((r) => r.id === id);
    if (i >= 0) rows.splice(i, 1);
    persist(table);

    if (!CONFIG.USE_MOCK) {
      getSupabase().then((supabase) => {
        if (!supabase) return;
        const pgTable = table === 'streams' ? 'live_streams' : table;
        supabase.from(pgTable).delete().eq('id', id).catch((err) => {
          console.warn(`[StreamCart] Supabase delete failed for ${table}:`, err);
        });
      });
    }
  },
  resetAll() {
    store.clearAll();
    Object.keys(cache).forEach((k) => delete cache[k]);
  },
  syncNow: syncFromSupabase,
};

/** Simulates network latency and returns a detached copy, like a real API response. */
export async function respond(data, ms = CONFIG.MOCK_LATENCY_MS) {
  if (CONFIG.USE_MOCK) await sleep(ms);
  return data === undefined ? data : structuredClone(data);
}
