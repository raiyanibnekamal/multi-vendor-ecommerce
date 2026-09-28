// Database Layer with dual-mode support (Mock / Live Supabase)
import { store } from '../core/store.js';
import { CONFIG } from '../core/config.js';
import { sleep, uid } from '../core/utils.js';
import { getSupabase } from '../core/supabase.js?v=20260928-11';

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

const POSTGRES_TABLES = {
  users: 'profiles',
  streams: 'live_streams',
  reelLikes: 'reel_likes',
  reelSaves: 'reel_saves',
  reelComments: 'reel_comments',
  streamChat: 'stream_messages',
  cartItems: 'carts',
  wishlistItems: 'wishlists',
};

const cache = {};
const tableKey = (t) => `db_${t}`;

function hydrateSeedRow(table, row) {
  if (!row || typeof row !== 'object' || Array.isArray(row)) return row;
  const seedTable = SEEDS[table] || [];
  const seed = seedTable.find((candidate) => candidate && candidate.id === row.id);
  if (!seed) return row;
  return { ...seed, ...row };
}

function hydrateSeedRows(table, rows) {
  if (!Array.isArray(rows)) return Array.isArray(rows) ? rows : [];
  return rows.map((row) => hydrateSeedRow(table, row));
}

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

function toPostgresRow(table, row) {
  const payload = camelToSnake(row);
  if (table === 'products') {
    delete payload.discount;
    if (Object.hasOwn(payload, 'review_count')) {
      payload.reviews_count = payload.review_count;
      delete payload.review_count;
    }
  } else if (table === 'reels') {
    if (Object.hasOwn(payload, 'poster')) payload.poster_url = payload.poster;
    if (Object.hasOwn(payload, 'comments')) payload.comments_count = payload.comments;
    delete payload.poster;
    delete payload.comments;
    delete payload.product_ids;
  } else if (table === 'streams') {
    delete payload.product_ids;
  } else if (table === 'reviews') {
    if (Object.hasOwn(payload, 'text')) payload.comment = payload.text;
    delete payload.text;
    delete payload.verified;
  }
  return payload;
}

function load(table) {
  if (!cache[table]) {
    const saved = store.get(tableKey(table));
    const base = saved ?? structuredClone(SEEDS[table] ?? []);
    cache[table] = hydrateSeedRows(table, base);
  }
  return cache[table];
}

function persist(table) {
  store.set(tableKey(table), cache[table]);
}

function hasUuidCustomerId(row) {
  return typeof row.customerId === 'string' && /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(row.customerId);
}

function insertLocal(table, row) {
  load(table).unshift(row);
  persist(table);
  return row;
}

// Background sync from live Supabase
async function syncFromSupabase() {
  if (CONFIG.USE_MOCK) return;
  const supabase = await getSupabase();
  if (!supabase) return;
  const { data: authData } = await supabase.auth.getSession();
  const hasSupabaseSession = Boolean(authData.session?.user);

  const tableMap = {
    ...POSTGRES_TABLES,
    categories: 'categories',
    vendors: 'vendors',
    users: 'profiles',
    products: 'products',
    reels: 'reels',
    reviews: 'reviews',
    conversations: 'conversations',
    orders: 'orders',
    payouts: 'payouts',
    disputes: 'disputes',
    notifications: 'notifications',
  };

  for (const [appTable, pgTable] of Object.entries(tableMap)) {
    if (appTable === 'orders' && !hasSupabaseSession) continue;
    try {
      const query = appTable === 'orders'
        ? supabase.from('orders').select('*, items:order_items(*)').limit(200)
        : appTable === 'reels'
          ? supabase.from('reels').select('*, poster:poster_url, comments:comments_count, productIds:reel_products(product_id)').limit(200)
          : appTable === 'streams'
            ? supabase.from('live_streams').select('*, productIds:stream_products(product_id)').limit(200)
            : appTable === 'conversations'
              ? supabase.from('conversations').select('*, messages(*)').limit(200)
              : appTable === 'notifications'
                ? hasSupabaseSession
                  ? supabase.from(pgTable).select('*').eq('recipient_id', authData.session.user.id).order('created_at', { ascending: false }).limit(200)
                  : Promise.resolve({ data: [], error: null })
              : appTable === 'cartItems' || appTable === 'wishlistItems' || appTable === 'reelLikes' || appTable === 'reelSaves'
                ? hasSupabaseSession
                  ? supabase.from(pgTable).select('*').eq('user_id', authData.session.user.id).limit(500)
                  : Promise.resolve({ data: [], error: null })
          : supabase.from(pgTable).select('*').limit(200);

      const { data, error } = await query;
      if (!error && data) {
        const camelData = data.map((row) => {
          const c = snakeToCamel(row);
          if (row.items && Array.isArray(row.items)) {
            c.items = row.items.map(snakeToCamel);
          }
          if (appTable === 'reels') {
            c.productIds = Array.isArray(row.productIds) ? row.productIds.map((item) => item.product_id).filter(Boolean) : [];
            c.poster = row.poster || c.posterUrl || '';
            c.comments = row.comments ?? c.commentsCount ?? 0;
          }
          if (appTable === 'streams') {
            c.productIds = Array.isArray(row.productIds) ? row.productIds.map((item) => item.product_id).filter(Boolean) : [];
          }
          if (appTable === 'reelComments') c.text = c.comment;
          if (appTable === 'reviews') {
            c.text = c.comment || '';
            c.verified = c.verifiedPurchase;
          }
          if (appTable === 'streamChat') {
            c.text = c.message;
            c.role = c.isVendor ? 'host' : 'viewer';
          }
          if (appTable === 'conversations') {
            c.messages = (row.messages || []).map((message) => ({
              ...snakeToCamel(message),
              from: message.from_role,
              text: message.text,
            })).sort((a, b) => String(a.createdAt || '').localeCompare(String(b.createdAt || '')));
          }
          return c;
        });
        cache[appTable] = camelData;
        persist(appTable);
      }
    } catch (err) {
      console.warn(`[StreamCart] Sync failed for ${appTable}:`, err);
    }
  }

  if (hasSupabaseSession) {
    const userId = authData.session.user.id;
    const cart = (cache.cartItems || []).map((item) => ({ productId: item.productId, qty: item.qty, source: 'store' }));
    const wishlist = (cache.wishlistItems || []).map((item) => item.productId);
    store.set('cart', cart);
    store.set('wishlist', wishlist);
    store.set(`u_${userId}_likedReels`, (cache.reelLikes || []).map((item) => item.reelId));
    store.set(`u_${userId}_savedReels`, (cache.reelSaves || []).map((item) => item.reelId));

    const { data, error } = await supabase.from('follows')
      .select('vendor_id')
      .eq('user_id', userId);
    if (!error && data) {
      store.set(`u_${userId}_following`, data.map((follow) => follow.vendor_id));
    }
  }
}

let initialSync = Promise.resolve();

// Trigger initial sync if online & not mock
if (typeof window !== 'undefined' && !CONFIG.USE_MOCK) {
  initialSync = syncFromSupabase();
}

window.addEventListener('storage', (e) => {
  const prefix = CONFIG.STORAGE_PREFIX + 'db_';
  if (e.key?.startsWith(prefix)) delete cache[e.key.slice(prefix.length)];
});

async function writeToSupabase(table, row) {
  const supabase = await getSupabase();
  if (!supabase) return;
  if (table === 'orders') {
    const { items, ...orderHeader } = row;
    const sanitizedHeader = camelToSnake(orderHeader);
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user || sanitizedHeader.customer_id !== authData.user.id) {
      throw new Error('Order insert requires the matching authenticated Supabase customer.');
    }
    const { error: orderErr } = await supabase.from('orders').insert({ ...sanitizedHeader, customer_id: authData.user.id });
    if (orderErr) throw orderErr;
    if (Array.isArray(items) && items.length > 0) {
      const orderItems = items.map((item) => ({
        order_id: row.id,
        product_id: item.productId,
        vendor_id: item.vendorId,
        title: item.title,
        thumbnail: item.thumbnail,
        price: item.price,
        qty: item.qty,
        status: 'pending',
      }));
      const { error: itemsErr } = await supabase.from('order_items').insert(orderItems);
      if (itemsErr) throw itemsErr;
    }
    return;
  }

  if (table === 'streams') {
    const { productIds = [], ...stream } = row;
    const { error } = await supabase.from('live_streams').insert(camelToSnake(stream));
    if (error) throw error;
    if (productIds.length) {
      const { error: productsError } = await supabase.from('stream_products').insert(
        productIds.map((productId) => ({ stream_id: row.id, product_id: productId }))
      );
      if (productsError) throw productsError;
    }
    return;
  }

  if (table === 'reels') {
    const { productIds = [], ...reel } = row;
    const { error } = await supabase.from('reels').insert(toPostgresRow('reels', reel));
    if (error) throw error;
    if (productIds.length) {
      const { error: productsError } = await supabase.from('reel_products').insert(
        productIds.map((productId) => ({ reel_id: row.id, product_id: productId }))
      );
      if (productsError) throw productsError;
    }
    return;
  }

  const { error } = await supabase.from(POSTGRES_TABLES[table] || table).insert(toPostgresRow(table, row));
  if (error) throw error;
}

export const db = {
  all: (table) => load(table),
  get: (table, id) => load(table).find((r) => r.id === id) || null,
  where: (table, fn) => load(table).filter(fn),
  insertLocal,
  insert(table, row) {
    if (table === 'orders') throw new Error('Use placeOrderAtomic to create orders.');
    insertLocal(table, row);

    if (!CONFIG.USE_MOCK && table !== 'users' && !(table === 'orders' && !hasUuidCustomerId(row))) {
      writeToSupabase(table, row).catch((err) => console.warn(`[StreamCart] Supabase insert failed for ${table}:`, err));
    }

    return row;
  },
  async insertAndSync(table, row) {
    if (table === 'orders') return db.placeOrderAtomic(row);
    if (!CONFIG.USE_MOCK && table !== 'users' && !(table === 'orders' && !hasUuidCustomerId(row))) {
      await writeToSupabase(table, row);
    }
    return insertLocal(table, row);
  },
  async placeOrderAtomic(order) {
    if (CONFIG.USE_MOCK || !hasUuidCustomerId(order)) {
      insertLocal('orders', order);
      order.items.forEach((item) => db.updateLocal('products', item.productId, (product) => ({
        stock: product.stock - item.qty,
        sold: product.sold + item.qty,
      })));
      return order;
    }

    const supabase = await getSupabase();
    if (!supabase) throw new Error('Order service is unavailable. Please try again.');
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || authData.user?.id !== order.customerId) {
      throw new Error('Sign in again before placing this order.');
    }

    const rpcName = order.paymentMethod === 'cod' ? 'place_order_atomic' : 'place_order_mock_payment';
    const { data, error } = await supabase.rpc(rpcName, {
      p_order_id: order.id,
      p_items: order.items.map(({ productId, qty }) => ({ productId, qty })),
      p_address: order.address,
      p_subtotal: order.subtotal,
      p_shipping: order.shipping,
      p_discount: order.discount,
      p_coupon: order.coupon,
      p_payment_method: order.paymentMethod,
      p_source: order.source,
      p_source_ref_id: null,
    });
    if (error) throw new Error(error.message || 'Could not place this order.');

    const persisted = {
      ...snakeToCamel(data.order),
      items: (data.items || []).map(snakeToCamel),
    };
    insertLocal('orders', persisted);
    (data.products || []).forEach((product) => {
      db.updateLocal('products', product.id, { stock: product.stock, sold: product.sold });
    });
    return persisted;
  },
  updateLocal(table, id, patch) {
    const row = db.get(table, id);
    if (!row) return null;
    const updated = typeof patch === 'function' ? patch(row) : patch;
    Object.assign(row, updated);
    persist(table);
    return row;
  },
  update(table, id, patch) {
    const current = db.get(table, id);
    if (!current) return null;
    const updated = typeof patch === 'function' ? patch(current) : patch;
    const row = db.updateLocal(table, id, updated);
    if (!row) return null;

    if (!CONFIG.USE_MOCK) {
      getSupabase().then(async (supabase) => {
        if (!supabase) return;
        const pgTable = POSTGRES_TABLES[table] || table;
        const payload = toPostgresRow(table, updated);
        const streamProductIds = table === 'streams' && Array.isArray(updated.productIds) ? updated.productIds : null;
        if (table === 'streams') delete payload.product_ids;
        if (Object.keys(payload).length) {
          const { error } = await supabase.from(pgTable).update(payload).eq('id', id);
          if (error) throw error;
        }
        if (streamProductIds) {
          const { error: deleteError } = await supabase.from('stream_products').delete().eq('stream_id', id);
          if (deleteError) throw deleteError;
          if (streamProductIds.length) {
            const { error: insertError } = await supabase.from('stream_products').insert(
              streamProductIds.map((productId) => ({ stream_id: id, product_id: productId }))
            );
            if (insertError) throw insertError;
          }
        }
      }).catch((err) => {
          console.warn(`[StreamCart] Supabase update failed for ${table}:`, err);
      });
    }

    return row;
  },
  async updateAndSync(table, id, patch) {
    const current = db.get(table, id);
    if (!current) return null;
    const updated = typeof patch === 'function' ? patch(current) : patch;
    if (!CONFIG.USE_MOCK) {
      const supabase = await getSupabase();
      if (!supabase) throw new Error('Database service is unavailable. Please try again.');
      const pgTable = POSTGRES_TABLES[table] || table;
      const payload = toPostgresRow(table, updated);
      const streamProductIds = table === 'streams' && Array.isArray(updated.productIds) ? updated.productIds : null;
      const reelProductIds = table === 'reels' && Array.isArray(updated.productIds) ? updated.productIds : null;
      if (Object.keys(payload).length) {
        const { error } = await supabase.from(pgTable).update(payload).eq('id', id);
        if (error) throw new Error(error.message || `Could not update ${table}.`);
      }
      const relations = streamProductIds ? ['stream_products', 'stream_id', streamProductIds]
        : reelProductIds ? ['reel_products', 'reel_id', reelProductIds] : null;
      if (relations) {
        const [tableName, foreignKey, productIds] = relations;
        const { error: deleteError } = await supabase.from(tableName).delete().eq(foreignKey, id);
        if (deleteError) throw new Error(deleteError.message || 'Could not update stream products.');
        if (productIds.length) {
          const { error: insertError } = await supabase.from(tableName).insert(
            productIds.map((productId) => ({ [foreignKey]: id, product_id: productId }))
          );
          if (insertError) throw new Error(insertError.message || 'Could not update stream products.');
        }
      }
    }
    return db.updateLocal(table, id, updated);
  },
  async removeAndSync(table, id) {
    if (!CONFIG.USE_MOCK) {
      const supabase = await getSupabase();
      if (!supabase) throw new Error('Database service is unavailable. Please try again.');
      const { error } = await supabase.from(POSTGRES_TABLES[table] || table).delete().eq('id', id);
      if (error) throw new Error(error.message || `Could not delete ${table}.`);
    }
    const rows = load(table);
    const index = rows.findIndex((row) => row.id === id);
    if (index >= 0) rows.splice(index, 1);
    persist(table);
  },
  async resolveDispute(id, status, note) {
    if (CONFIG.USE_MOCK) {
      const current = db.get('disputes', id);
      if (!current || !['open', 'in_review'].includes(current.status)) throw new Error('Dispute is not open for resolution.');
      return db.updateLocal('disputes', id, {
        status,
        notes: note ? [...(current.notes || []), { text: note, at: new Date().toISOString() }] : current.notes,
      });
    }
    const supabase = await getSupabase();
    if (!supabase) throw new Error('Dispute service is unavailable. Please try again.');
    const { data, error } = await supabase.rpc('admin_resolve_dispute', {
      p_dispute_id: id,
      p_status: status,
      p_note: note || null,
    });
    if (error) throw new Error(error.message || 'Could not update this dispute.');
    const dispute = snakeToCamel(data);
    db.updateLocal('disputes', id, dispute);
    return dispute;
  },
  async sendConversationMessage(vendorId, text, conversationId = null) {
    const session = store.get('session');
    if (!session) throw new Error('Sign in to send a message.');
    const isLiveAccount = !CONFIG.USE_MOCK && hasUuidCustomerId({ customerId: session.userId });
    let conversation;
    let message;

    if (isLiveAccount) {
      const supabase = await getSupabase();
      if (!supabase) throw new Error('Message service is unavailable. Please try again.');
      const { data, error } = await supabase.rpc('send_conversation_message', {
        p_vendor_id: vendorId,
        p_text: text,
        p_conversation_id: conversationId,
      });
      if (error) throw new Error(error.message || 'Could not send this message.');
      const remoteMessage = snakeToCamel(data.message);
      message = { ...remoteMessage, from: remoteMessage.fromRole };
      const existing = db.get('conversations', data.conversation_id);
      const customerId = session.role === 'vendor' ? existing?.customerId : session.userId;
      conversation = existing || {
        id: data.conversation_id,
        vendorId,
        customerId,
        createdAt: message.createdAt,
        messages: [],
      };
    } else {
      const user = db.get('users', session.userId);
      const isVendor = session.role === 'vendor';
      conversation = conversationId
        ? db.get('conversations', conversationId)
        : db.all('conversations').find((item) => item.vendorId === vendorId && item.customerId === session.userId);
      if (!conversation && isVendor) throw new Error('Conversation is unavailable.');
      message = {
        id: uid('msg'),
        senderId: session.userId,
        from: isVendor ? 'vendor' : 'customer',
        text: text.trim(),
        createdAt: new Date().toISOString(),
      };
      if (!conversation) {
        conversation = { id: uid('conv'), vendorId, customerId: user.id, createdAt: message.createdAt, messages: [] };
      }
    }

    conversation.messages = [...(conversation.messages || []), message];
    if (db.get('conversations', conversation.id)) db.updateLocal('conversations', conversation.id, conversation);
    else db.insertLocal('conversations', conversation);
    return message;
  },
  remove(table, id) {
    const rows = load(table);
    const i = rows.findIndex((r) => r.id === id);
    if (i >= 0) rows.splice(i, 1);
    persist(table);

    if (!CONFIG.USE_MOCK && table !== 'users') {
      getSupabase().then((supabase) => {
        if (!supabase) return;
        const pgTable = POSTGRES_TABLES[table] || table;
        Promise.resolve(supabase.from(pgTable).delete().eq('id', id)).catch((err) => {
          console.warn(`[StreamCart] Supabase delete failed for ${table}:`, err);
        });
      });
    }
  },
  resetAll() {
    store.clearAll();
    Object.keys(cache).forEach((k) => delete cache[k]);
  },
  waitForInitialSync: () => initialSync,
  syncNow: syncFromSupabase,
};

/** Simulates network latency and returns a detached copy, like a real API response. */
export async function respond(data, ms = CONFIG.MOCK_LATENCY_MS) {
  if (CONFIG.USE_MOCK) await sleep(ms);
  return data === undefined ? data : structuredClone(data);
}
