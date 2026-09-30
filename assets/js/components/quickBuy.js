// In-context purchase drawer used by reels and live streams:
// product -> checkout -> confirmation, without leaving the video page.
import { escapeHtml, icon, formatPrice, stars } from '../core/utils.js';
import { routes } from '../core/routes.js';
import { db } from '../services/db.js';
import { addToCart } from '../services/cart.js';
import { placeOrder, PAYMENT_METHODS } from '../services/orders.js';
import { track } from '../services/ai.js';
import { currentUser } from '../core/auth.js';
import { CONFIG } from '../core/config.js';
import { openModal, ensureLogin } from './modal.js';
import { priceHtml } from './cards.js';
import { toast } from './toast.js';

export function openQuickBuy(productId, { source = 'reel', onDone } = {}) {
  const p = db.get('products', productId);
  if (!p) return;
  const v = db.get('vendors', p.vendorId);
  let qty = 1;
  const m = openModal({ title: source === 'live' ? 'Buy from live' : 'Shop this reel', variant: 'sheet', content: '' });
  const body = m.body;
  track('view', { productId });

  const stepProduct = () => {
    body.innerHTML = `
      <div class="row" style="gap:16px;align-items:flex-start">
        <img src="${p.thumbnail}" alt="" style="width:120px;height:120px;border-radius:12px;background:var(--surface-2);object-fit:contain;flex-shrink:0">
        <div class="grow stack" style="gap:6px">
          <a href="${routes.vendor(v.id)}" class="xs muted">${escapeHtml(v.name)}</a>
          <h3 style="font-size:16px">${escapeHtml(p.title)}</h3>
          <div class="row">${stars(p.rating)}<span class="xs muted">${p.rating} (${p.reviewCount})</span></div>
          ${priceHtml(p, true)}
          <span class="xs ${p.stock > 10 ? 'text-success' : 'text-warning'}">${p.stock > 0 ? `${p.stock} in stock` : 'Out of stock'}</span>
        </div>
      </div>
      <p class="small muted mt-2 clamp-2">${escapeHtml(p.description)}</p>
      <div class="row-between mt-2">
        <span class="label">Quantity</span>
        <div class="qty"><button data-dec>${icon('minus')}</button><input value="${qty}" readonly><button data-inc>${icon('plus')}</button></div>
      </div>
      <div class="row mt-3" style="gap:10px">
        <button class="btn btn-outline btn-lg grow" data-cart ${p.stock <= 0 ? 'disabled' : ''}>${icon('shopping-cart')} Add to cart</button>
        <button class="btn btn-gradient btn-lg grow" data-buy ${p.stock <= 0 ? 'disabled' : ''}>${icon('zap')} Buy now</button>
      </div>
      <a href="${routes.product(p.id)}" class="small text-primary center mt-2" style="display:block">View full product details</a>`;
    const input = body.querySelector('.qty input');
    body.querySelector('[data-dec]').onclick = () => { qty = Math.max(1, qty - 1); input.value = qty; };
    body.querySelector('[data-inc]').onclick = () => { qty = Math.min(p.stock, qty + 1); input.value = qty; };
    body.querySelector('[data-cart]').onclick = () => {
      try {
        addToCart(p.id, qty, source);
        track('cart', { productId: p.id });
        toast('Added to cart', 'success', { action: 'View cart', href: routes.cart() });
        m.close();
      } catch (e) { toast(e.message, 'error'); }
    };
    body.querySelector('[data-buy]').onclick = async () => {
      const user = await ensureLogin('Sign in to buy instantly');
      if (user) stepCheckout();
    };
  };

  const stepCheckout = () => {
    const user = currentUser();
    const addr = user.addresses?.find((a) => a.isDefault) || user.addresses?.[0];
    const subtotal = p.price * qty;
    const shipping = subtotal >= CONFIG.FREE_SHIPPING_MIN ? 0 : CONFIG.SHIPPING_FEE;
    body.innerHTML = `
      <button class="btn btn-ghost btn-sm mb-2" data-back>${icon('arrow-left')} Back</button>
      <div class="row" style="gap:12px">
        <img src="${p.thumbnail}" alt="" style="width:56px;height:56px;border-radius:10px;background:var(--surface-2);object-fit:contain">
        <div class="grow"><div class="small bold clamp-2">${escapeHtml(p.title)}</div><div class="xs muted">Qty ${qty} × ${formatPrice(p.price)}</div></div>
      </div>
      <hr class="divider">
      <div class="label mb-1">Deliver to</div>
      <div class="stack" style="gap:8px">
        <input class="input" name="name" placeholder="Full name" value="${escapeHtml(addr?.name || user.name)}">
        <input class="input" name="phone" placeholder="Phone" value="${escapeHtml(addr?.phone || user.phone || '')}">
        <input class="input" name="line" placeholder="House, road, area" value="${escapeHtml(addr ? `${addr.line}, ${addr.area}` : '')}">
      </div>
      <div class="label mt-2 mb-1">Payment</div>
      <div class="stack" style="gap:8px">
        ${PAYMENT_METHODS.map((pm, i) => `<label class="radio-card"><input type="radio" name="pay" value="${pm.id}" ${i === 0 ? 'checked' : ''}>${icon(pm.icon)}<span class="grow"><b class="small">${pm.name}</b><div class="xs muted">${pm.note}</div></span></label>`).join('')}
      </div>
      <div class="card card-pad mt-2" style="background:var(--surface-2);border:0">
        <div class="row-between small"><span>Subtotal</span><span>${formatPrice(subtotal)}</span></div>
        <div class="row-between small mt-1"><span>Delivery</span><span>${shipping ? formatPrice(shipping) : '<span class="text-success">Free</span>'}</span></div>
        <div class="row-between bold mt-1"><span>Total</span><span class="text-primary">${formatPrice(subtotal + shipping)}</span></div>
      </div>
      <button class="btn btn-gradient btn-lg btn-block mt-2" data-place>${icon('lock')} Pay ${formatPrice(subtotal + shipping)}</button>
      <p class="xs muted center mt-1">${icon('shield-check')} Secure checkout · You won't leave this ${source === 'live' ? 'stream' : 'reel'}</p>`;
    body.querySelector('[data-back]').onclick = stepProduct;
    body.querySelector('[data-place]').onclick = async (e) => {
      const btn = e.currentTarget;
      const name = body.querySelector('[name=name]').value.trim();
      const phone = body.querySelector('[name=phone]').value.trim();
      const line = body.querySelector('[name=line]').value.trim();
      if (!name || !phone || !line) return toast('Please fill in your delivery details', 'error');
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner" style="width:18px;height:18px;border-width:2px;border-color:rgba(255,255,255,.4);border-top-color:#fff"></span> Processing payment…';
      try {
        const order = await placeOrder({
          lines: [{ productId: p.id, qty }],
          address: { name, phone, line, area: '' },
          paymentMethod: body.querySelector('[name=pay]:checked').value,
          source,
        });
        track('purchase', { productId: p.id });
        stepDone(order);
        onDone?.(order);
      } catch (err) {
        toast(err.message, 'error');
        btn.disabled = false;
        btn.innerHTML = `${icon('lock')} Try again`;
      }
    };
  };

  const stepDone = (order) => {
    body.innerHTML = `
      <div class="center" style="padding:16px 0">
        <div class="empty-icon" style="width:72px;height:72px;border-radius:50%;background:#dcfce7;color:var(--success);display:grid;place-items:center;margin:0 auto 12px">${icon('circle-check')}</div>
        <h2>Order placed!</h2>
        <p class="muted mt-1">Order <b>${order.id}</b> · ${formatPrice(order.total)}</p>
        <p class="small muted">The seller has been notified in real time.</p>
        <div class="row mt-3" style="justify-content:center">
          <a class="btn btn-outline" href="${routes.orderDetail(order.id)}">View order</a>
          <button class="btn btn-primary" data-close>Keep watching</button>
        </div>
      </div>`;
  };

  stepProduct();
}
