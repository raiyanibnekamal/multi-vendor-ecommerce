// Mock database. Each "table" mirrors a planned Supabase Postgres table.
// Seed rows come from /data, mutations are persisted to localStorage.
// To go live, replace these helpers with supabase.from(table) queries.
import { store } from '../core/store.js';
import { CONFIG } from '../core/config.js';
import { sleep } from '../core/utils.js';
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
    return row;
  },
  update(table, id, patch) {
    const row = db.get(table, id);
    if (!row) return null;
    Object.assign(row, typeof patch === 'function' ? patch(row) : patch);
    persist(table);
    return row;
  },
  remove(table, id) {
    const rows = load(table);
    const i = rows.findIndex((r) => r.id === id);
    if (i >= 0) rows.splice(i, 1);
    persist(table);
  },
  resetAll() {
    store.clearAll();
    Object.keys(cache).forEach((k) => delete cache[k]);
  },
};

/** Simulates network latency and returns a detached copy, like a real API response. */
export async function respond(data, ms = CONFIG.MOCK_LATENCY_MS) {
  await sleep(ms);
  return data === undefined ? data : structuredClone(data);
}
