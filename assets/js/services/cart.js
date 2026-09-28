// Cart & wishlist. Kept per browser so guests can shop before signing in.
import { store } from '../core/store.js';
import { CONFIG } from '../core/config.js';
import { db } from './db.js';
import { getSupabase } from '../core/supabase.js';

const UUID_PATTERN = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
let cartQueue = Promise.resolve();
let wishlistQueue = Promise.resolve();

function scheduleUserSync(kind, snapshot) {
  if (CONFIG.USE_MOCK) return;
  const key = kind === 'cart' ? 'cartQueue' : 'wishlistQueue';
  const queue = key === 'cart' ? cartQueue : wishlistQueue;
  const next = queue.catch(() => {}).then(async () => {
    const supabase = await getSupabase();
    if (!supabase) return;
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !UUID_PATTERN.test(authData.user?.id || '')) return;
    const { error } = await supabase.rpc(kind === 'cart' ? 'sync_user_cart' : 'sync_user_wishlist', {
      p_items: snapshot,
    });
    if (error) console.warn(`[StreamCart] ${kind} sync failed:`, error.message);
  });
  if (key === 'cart') cartQueue = next;
  else wishlistQueue = next;
}

function saveCart(cart) {
  store.set('cart', cart);
  scheduleUserSync('cart', cart.map(({ productId, qty }) => ({ productId, qty })));
}

export function getCartRaw() {
  return store.get('cart', []);
}

/** Cart lines joined with product rows. */
export function getCart() {
  return getCartRaw()
    .map((line) => ({ ...line, product: db.get('products', line.productId) }))
    .filter((l) => l.product);
}

export function cartCount() {
  return getCartRaw().reduce((s, l) => s + l.qty, 0);
}

export function addToCart(productId, qty = 1, source = 'store') {
  const p = db.get('products', productId);
  if (!p || p.stock <= 0) throw new Error('This product is out of stock.');
  const cart = getCartRaw();
  const line = cart.find((l) => l.productId === productId);
  if (line) line.qty = Math.min(p.stock, line.qty + qty);
  else cart.push({ productId, qty: Math.min(p.stock, qty), source, addedAt: Date.now() });
  saveCart(cart);
}

export function setQty(productId, qty) {
  const cart = getCartRaw();
  const line = cart.find((l) => l.productId === productId);
  if (!line) return;
  const p = db.get('products', productId);
  line.qty = Math.max(1, Math.min(p?.stock || 1, qty));
  saveCart(cart);
}

export function removeFromCart(productId) {
  saveCart(getCartRaw().filter((l) => l.productId !== productId));
}

export function clearCart() {
  saveCart([]);
}

export function totals(lines = getCart()) {
  const subtotal = lines.reduce((s, l) => s + l.product.price * l.qty, 0);
  const savings = lines.reduce((s, l) => s + (l.product.originalPrice - l.product.price) * l.qty, 0);
  const shipping = subtotal === 0 || subtotal >= CONFIG.FREE_SHIPPING_MIN ? 0 : CONFIG.SHIPPING_FEE;
  return { subtotal, savings, shipping, total: subtotal + shipping, count: lines.reduce((s, l) => s + l.qty, 0) };
}

// ---------- Wishlist ----------
export function getWishlistIds() {
  return store.get('wishlist', []);
}

export function inWishlist(id) {
  return getWishlistIds().includes(id);
}

export function toggleWishlist(id) {
  const list = getWishlistIds();
  const i = list.indexOf(id);
  if (i >= 0) list.splice(i, 1);
  else list.unshift(id);
  store.set('wishlist', list);
  scheduleUserSync('wishlist', list);
  return i < 0;
}
