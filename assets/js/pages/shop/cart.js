import { mountShell } from '../../components/shell.js';
import { productCard, emptyState } from '../../components/cards.js';
import { toast } from '../../components/toast.js';
import { routes } from '../../core/routes.js';
import { escapeHtml, icon, $, $$, formatPrice } from '../../core/utils.js';
import { CONFIG } from '../../core/config.js';
import { store } from '../../core/store.js';
import { getCart, setQty, removeFromCart, totals, toggleWishlist, inWishlist } from '../../services/cart.js';
import { COUPONS } from '../../services/orders.js';
import { getRecommendations } from '../../services/ai.js';
import { db } from '../../services/db.js';
import { t as tr } from '../../core/i18n.js';

const main = mountShell({ active: 'cart' });

function render() {
  const lines = getCart();
  if (!lines.length) {
    main.innerHTML = `<div class="container page">${emptyState('shopping-cart', tr('Your cart is empty'), tr('Discover products in reels, live streams or the shop.'), `<div class="row" style="justify-content:center"><a class="btn btn-primary" href="${routes.products()}">${tr('Start shopping')}</a><a class="btn btn-outline" href="${routes.reels()}">${icon('clapperboard')} ${tr('Watch reels')}</a></div>`)}<div data-recs></div></div>`;
    recs();
    return;
  }
  const t = totals(lines);
  const coupon = store.get('coupon');
  const discount = coupon && COUPONS[coupon] ? COUPONS[coupon].apply(t.subtotal) : 0;
  const byVendor = {};
  lines.forEach((l) => (byVendor[l.product.vendorId] ||= []).push(l));
  const toFree = CONFIG.FREE_SHIPPING_MIN - t.subtotal;

  main.innerHTML = `
  <div class="container page">
    <div class="page-head"><h1>${tr('Shopping cart')}</h1><p class="muted mt-1">${tr('{count} items from {sellers} sellers', { count: t.count, sellers: Object.keys(byVendor).length })}</p></div>
    <div class="cart-layout">
      <div class="card" style="overflow:hidden">
        ${Object.entries(byVendor).map(([vid, ls]) => {
          const v = db.get('vendors', vid);
          return `<div class="vendor-group-head">${icon('store')} <a href="${routes.vendor(vid)}">${escapeHtml(v?.name || '')}</a></div>
          ${ls.map((l) => `
            <div class="cart-line">
              <a href="${routes.product(l.product.id)}"><img src="${l.product.thumbnail}" alt=""></a>
              <div style="min-width:0">
                <a class="bold clamp-2" href="${routes.product(l.product.id)}">${escapeHtml(l.product.title)}</a>
                <div class="small muted mt-1">${l.source !== 'store' ? `<span class="badge badge-primary">${icon(l.source === 'live' ? 'radio' : 'clapperboard')} ${tr('From {source}', { source: tr(l.source) })}</span> ` : ''}${l.product.stock <= 5 ? `<span class="text-warning">${tr('Only {count} left', { count: l.product.stock })}</span>` : tr('In stock')}</div>
                <div class="row mt-1" style="gap:14px">
                  <button class="small muted row" style="gap:4px" data-wish-line="${l.product.id}">${icon('heart')} ${inWishlist(l.product.id) ? tr('Saved') : tr('Save for later')}</button>
                  <button class="small text-danger row" style="gap:4px" data-remove="${l.product.id}">${icon('trash-2')} ${tr('Remove')}</button>
                </div>
              </div>
              <div class="right">
                <div class="price" style="flex-direction:column;align-items:flex-end;gap:0"><span class="now">${formatPrice(l.product.price * l.qty)}</span>${l.qty > 1 ? `<span class="xs muted">${formatPrice(l.product.price)} each</span>` : ''}</div>
                <div class="qty"><button data-dec="${l.product.id}">${icon('minus')}</button><input value="${l.qty}" readonly><button data-inc="${l.product.id}">${icon('plus')}</button></div>
              </div>
            </div>`).join('')}`;
        }).join('')}
      </div>

      <aside class="card card-pad summary">
        <h3 class="mb-2">${tr('Order summary')}</h3>
        <div class="free-ship">${toFree > 0 ? tr('Add {amount} more for free delivery', { amount: formatPrice(toFree) }) : `${icon('party-popper', 'text-success')} ${tr("You've unlocked free delivery!")}`}
          <div class="progress"><span style="width:${Math.min(100, (t.subtotal / CONFIG.FREE_SHIPPING_MIN) * 100)}%"></span></div></div>
        <div class="line"><span>${tr('Subtotal ({count} items)', { count: t.count })}</span><span>${formatPrice(t.subtotal)}</span></div>
        ${t.savings > 0 ? `<div class="line text-success"><span>${tr('Product discounts')}</span><span>−${formatPrice(t.savings)}</span></div>` : ''}
        <div class="line"><span>${tr('Delivery')}</span><span>${t.shipping ? formatPrice(t.shipping) : `<span class="text-success">${tr('Free')}</span>`}</span></div>
        ${discount ? `<div class="line text-success"><span>${tr('Coupon')} ${coupon} <button class="xs text-danger" data-rm-coupon>(${tr('remove')})</button></span><span>−${formatPrice(discount)}</span></div>` : ''}
        <div class="line total"><span>${tr('Total')}</span><span>${formatPrice(t.total - discount)}</span></div>
        <form class="row mt-2" data-coupon style="gap:8px"><input class="input" name="code" placeholder="${tr('Coupon code')}" style="height:40px"><button class="btn btn-outline btn-sm" style="height:40px">${tr('Apply')}</button></form>
        <p class="xs muted mt-1">${tr('Try {first} or {second}', { first: 'STREAM10', second: 'LIVE50' })}</p>
        <a class="btn btn-primary btn-lg btn-block mt-2" href="${routes.checkout()}">${tr('Proceed to checkout')} ${icon('arrow-right')}</a>
        <p class="xs muted center mt-1">${icon('shield-check')} ${tr('Secure checkout · Card, bKash, Nagad, COD')}</p>
      </aside>
    </div>
    <div data-recs></div>
  </div>`;
  bind();
  recs(lines.map((l) => l.productId));
}

async function recs(exclude = []) {
  const r = await getRecommendations({ limit: 5, exclude });
  const el = $('[data-recs]');
  if (el) el.innerHTML = `<section class="section"><div class="section-head"><div><h2>${tr('You might also need')} <span class="badge badge-ai">${icon('sparkles')} AI</span></h2><p>${escapeHtml(r.reason)}</p></div></div><div class="grid-products">${r.items.map(productCard).join('')}</div></section>`;
}

function bind() {
  main.onclick = (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    const qtyOf = (id) => getCart().find((l) => l.productId === id)?.qty || 1;
    if (b.dataset.inc) { setQty(b.dataset.inc, qtyOf(b.dataset.inc) + 1); render(); }
    else if (b.dataset.dec) { setQty(b.dataset.dec, qtyOf(b.dataset.dec) - 1); render(); }
    else if (b.dataset.remove) { removeFromCart(b.dataset.remove); toast(tr('Removed from cart'), 'info'); render(); }
    else if (b.dataset.wishLine) { if (!inWishlist(b.dataset.wishLine)) toggleWishlist(b.dataset.wishLine); removeFromCart(b.dataset.wishLine); toast(tr('Moved to wishlist')); render(); }
    else if ('rmCoupon' in b.dataset) { store.remove('coupon'); render(); }
  };
  $('[data-coupon]').onsubmit = (e) => {
    e.preventDefault();
    const code = e.target.code.value.trim().toUpperCase();
    if (COUPONS[code]) { store.set('coupon', code); toast(tr('Coupon applied: {label}', { label: tr(COUPONS[code].label) })); render(); }
    else toast(tr('Invalid coupon code'), 'error');
  };
}

render();
