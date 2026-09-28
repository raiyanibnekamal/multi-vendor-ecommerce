import { escapeHtml, formatPrice, formatNumber, avatar, timeUntil, icon, safeMediaUrl } from '../core/utils.js';
import { routes } from '../core/routes.js';
import { db } from '../services/db.js';
import { addToCart, inWishlist, toggleWishlist } from '../services/cart.js';
import { track } from '../services/ai.js';
import { toast } from './toast.js';

export function priceHtml(p, lg = false) {
  return `<div class="price ${lg ? 'price-lg' : ''}"><span class="now">${formatPrice(p.price)}</span>${p.originalPrice > p.price ? `<span class="old">${formatPrice(p.originalPrice)}</span>` : ''}</div>`;
}

export function productCard(p) {
  const v = db.get('vendors', p.vendorId);
  const wished = inWishlist(p.id);
  return `
  <article class="p-card ${p.stock <= 0 ? 'out' : ''}">
    <a class="thumb" href="${routes.product(p.id)}">
      <img src="${escapeHtml(safeMediaUrl(p.thumbnail, p.title))}" alt="${escapeHtml(p.title)}" loading="lazy" onerror="this.onerror=null;this.src='${escapeHtml(safeMediaUrl('', p.title))}'">
      <div class="badges">
        ${p.discount >= 5 ? `<span class="badge badge-sale">-${p.discount}%</span>` : ''}
        ${p.stock > 0 && p.stock <= 5 ? `<span class="badge badge-warning">Only ${p.stock} left</span>` : ''}
      </div>
    </a>
    <button class="wish ${wished ? 'active' : ''}" data-wish="${p.id}" aria-label="Wishlist">${icon('heart')}</button>
    <div class="info">
      ${v ? `<a class="vendor" href="${routes.vendor(v.id)}">${escapeHtml(v.name)} ${v.verified ? icon('badge-check') : ''}</a>` : ''}
      <a class="title clamp-2" href="${routes.product(p.id)}">${escapeHtml(p.title)}</a>
      <span class="rating">${icon('star')} ${p.rating.toFixed(1)} <span>· ${formatNumber(p.sold)} sold</span></span>
      <div class="foot">
        ${priceHtml(p)}
        <button class="add" data-add-cart="${p.id}" aria-label="Add to cart" ${p.stock <= 0 ? 'disabled' : ''}>${icon('shopping-cart')}</button>
      </div>
    </div>
  </article>`;
}

export function productGrid(list, empty = 'No products found') {
  if (!list.length) return emptyState('package-search', empty, 'Try a different filter or search term.');
  return `<div class="grid-products">${list.map(productCard).join('')}</div>`;
}

export function reelThumb(r) {
  const v = db.get('vendors', r.vendorId);
  const product = db.get('products', Array.isArray(r.productIds) ? r.productIds[0] : null);
  const productImage = product?.thumbnail || '';
  const poster = safeMediaUrl(productImage || r.poster, product?.title || r.caption || 'Reel preview');
  const fallback = safeMediaUrl(productImage, product?.title || r.caption || 'Reel preview');
  return `
  <a class="reel-thumb" href="${routes.reels(r.id)}">
    <img src="${escapeHtml(poster)}" alt="" loading="lazy" onerror="this.onerror=null;this.src='${escapeHtml(fallback)}'">
    <div class="top"><span class="row" style="gap:4px">${icon('play')} ${formatNumber(r.views)}</span><span class="badge" style="background:rgba(0,0,0,.45);color:#fff">${icon('shopping-bag')} ${r.productIds.length}</span></div>
    <div class="play"><span>${icon('play')}</span></div>
    <div class="bottom"><p class="clamp-2">${escapeHtml(r.caption)}</p><span class="xs" style="opacity:.8">@${escapeHtml(v?.slug || '')}</span></div>
  </a>`;
}

export function liveCard(s) {
  const v = db.get('vendors', s.vendorId);
  const productCount = Array.isArray(s.productIds) ? s.productIds.length : 0;
  const tag = s.status === 'live'
    ? `<span class="badge badge-live">LIVE</span><span class="badge viewers">${icon('eye')} ${formatNumber(s.viewers)}</span>`
    : s.status === 'scheduled'
      ? `<span class="badge badge-dark">${icon('clock')} in ${timeUntil(s.scheduledAt)}</span>`
      : `<span class="badge badge-dark">Replay</span>`;
  const thumb = safeMediaUrl(s.thumbnail, s.title || 'Live stream');
  return `
  <a class="live-card" href="${routes.watch(s.id)}">
    <div class="thumb"><img src="${escapeHtml(thumb)}" alt="" loading="lazy" onerror="this.onerror=null;this.src='${escapeHtml(safeMediaUrl('', s.title || 'Live stream'))}'"><div class="tl">${tag}</div></div>
    <div class="body">
      ${avatar(v?.name || '?', { size: 'sm', color: v?.color })}
      <div class="grow"><h4 class="clamp-2" style="font-size:14px">${escapeHtml(s.title)}</h4><span class="xs muted">${escapeHtml(v?.name || '')} · ${productCount} products</span></div>
    </div>
  </a>`;
}

export function vendorCard(v) {
  return `
  <a class="v-card" href="${routes.vendor(v.id)}">
    ${avatar(v.name, { size: 'lg', color: v.color })}
    <h4 class="row" style="gap:4px">${escapeHtml(v.name)} ${v.verified ? `<span class="verified">${icon('badge-check')}</span>` : ''}</h4>
    <div class="meta"><span>${icon('star')} ${v.rating}</span><span>${formatNumber(v.followers)} followers</span></div>
    <span class="xs muted clamp-2">${escapeHtml(v.description)}</span>
  </a>`;
}

export function emptyState(iconName, title, text = '', action = '') {
  return `<div class="empty"><div class="empty-icon">${icon(iconName)}</div><h3>${escapeHtml(title)}</h3><p>${escapeHtml(text)}</p>${action ? `<div class="mt-2">${action}</div>` : ''}</div>`;
}

export function loading() {
  return '<div class="loading-block"><div class="spinner"></div></div>';
}

export function skeletonHome() {
  const card = '<div class="skel-card"><div class="skeleton skel-thumb"></div><div class="skeleton skel-line"></div><div class="skeleton skel-line sm"></div></div>';
  return `<div class="container home skel-home">
    <div class="skel-hero"><div class="skeleton"></div><div class="stack" style="gap:12px"><div class="skeleton"></div><div class="skeleton"></div></div></div>
    <div class="skel-row">${'<div class="skeleton skel-perk"></div>'.repeat(4)}</div>
    <div class="grid-products">${card.repeat(8)}</div>
  </div>`;
}

let bound = false;
/** Delegated handlers for add-to-cart / wishlist buttons rendered anywhere. */
export function bindCardActions() {
  if (bound) return;
  bound = true;
  document.addEventListener('click', (e) => {
    const add = e.target.closest('[data-add-cart]');
    if (add) {
      e.preventDefault();
      try {
        addToCart(add.dataset.addCart, 1, add.dataset.source || 'store');
        track('cart', { productId: add.dataset.addCart });
        toast('Added to cart', 'success', { action: 'View cart', href: routes.cart() });
      } catch (err) {
        toast(err.message, 'error');
      }
      return;
    }
    const wish = e.target.closest('[data-wish]');
    if (wish) {
      e.preventDefault();
      const now = toggleWishlist(wish.dataset.wish);
      if (now) track('wishlist', { productId: wish.dataset.wish });
      document.querySelectorAll(`[data-wish="${wish.dataset.wish}"]`).forEach((b) => b.classList.toggle('active', now));
      toast(now ? 'Saved to wishlist' : 'Removed from wishlist', now ? 'success' : 'info');
    }
  });
}
