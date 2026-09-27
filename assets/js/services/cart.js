// Cart & wishlist. Kept per browser so guests can shop before signing in.
import { store } from '../core/store.js';
import { CONFIG } from '../core/config.js';
import { db } from './db.js';

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
  store.set('cart', cart);
}

export function setQty(productId, qty) {
  const cart = getCartRaw();
  const line = cart.find((l) => l.productId === productId);
  if (!line) return;
  const p = db.get('products', productId);
  line.qty = Math.max(1, Math.min(p?.stock || 1, qty));
  store.set('cart', cart);
}

export function removeFromCart(productId) {
  store.set('cart', getCartRaw().filter((l) => l.productId !== productId));
}

export function clearCart() {
  store.set('cart', []);
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
  return i < 0;
}
