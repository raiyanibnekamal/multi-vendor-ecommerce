import { mountShell } from '../../components/shell.js';
import { emptyState } from '../../components/cards.js';
import { toast } from '../../components/toast.js';
import { routes } from '../../core/routes.js';
import { requireRole } from '../../core/auth.js';
import { escapeHtml, icon, $, $$, formatPrice, uid } from '../../core/utils.js';
import { store } from '../../core/store.js';
import { getCart, totals, clearCart } from '../../services/cart.js';
import { placeOrder, PAYMENT_METHODS, COUPONS } from '../../services/orders.js';
import { track } from '../../services/ai.js';
import { db } from '../../services/db.js';
import { t as tr } from '../../core/i18n.js';

const user = requireRole();
const main = mountShell({ active: 'checkout' });
let addressId = user?.addresses?.find((a) => a.isDefault)?.id || user?.addresses?.[0]?.id || 'new';
let pay = 'cod';

function addressCards() {
  const list = user.addresses || [];
  return `
    <div class="stack" style="gap:10px">
      ${list.map((a) => `
        <label class="radio-card"><input type="radio" name="addr" value="${a.id}" ${addressId === a.id ? 'checked' : ''}>
          <div class="grow"><b class="small">${escapeHtml(a.label)} · ${escapeHtml(a.name)}</b><div class="xs muted">${escapeHtml(a.line)}, ${escapeHtml(a.area)} · ${escapeHtml(a.phone)}</div></div>
          ${a.isDefault ? `<span class="badge badge-primary">${tr('Default')}</span>` : ''}
        </label>`).join('')}
      <label class="radio-card"><input type="radio" name="addr" value="new" ${addressId === 'new' ? 'checked' : ''}>${icon('plus')} <b class="small">${tr('Use a new address')}</b></label>
    </div>
    <div class="form-grid mt-2 ${addressId === 'new' ? '' : 'hidden'}" data-new-addr>
      <div class="field"><label>${tr('Full name')}</label><input class="input" name="name" value="${escapeHtml(user.name)}"></div>
      <div class="field"><label>${tr('Phone')}</label><input class="input" name="phone" value="${escapeHtml(user.phone || '')}"></div>
      <div class="field full"><label>${tr('House / road')}</label><input class="input" name="line" placeholder="${tr('House 12, Road 5')}"></div>
      <div class="field"><label>${tr('Area & city')}</label><input class="input" name="area" placeholder="${tr('Dhanmondi, Dhaka')}"></div>
      <div class="field"><label>${tr('Label')}</label><select class="select" name="label"><option>${tr('Home')}</option><option>${tr('Office')}</option><option>${tr('Other')}</option></select></div>
      <label class="check full"><input type="checkbox" name="save" checked> ${tr('Save this address for next time')}</label>
    </div>`;
}

function paymentHtml() {
  return `
    <div class="stack" style="gap:10px">
      ${PAYMENT_METHODS.filter((pm) => pm.id === 'cod').map((pm) => `<label class="radio-card"><input type="radio" name="pay" value="${pm.id}" checked>${icon(pm.icon)}<div class="grow"><b class="small">${tr(pm.name)}</b><div class="xs muted">${tr(pm.note)}</div></div></label>`).join('')}
    </div>
    <div data-pay-extra class="mt-2">${payExtra()}</div>`;
}

function payExtra() {
  if (pay === 'card') return `
    <div class="notice">${icon('lock')}<div>${tr('Card details go straight to Stripe Elements in production. Use any test values here.')}</div></div>
    <div class="card-fields">
      <input class="input" name="card" placeholder="4242 4242 4242 4242" inputmode="numeric" maxlength="19" value="4242 4242 4242 4242">
      <input class="input" name="exp" placeholder="MM/YY" maxlength="5" value="12/28">
      <input class="input" name="cvc" placeholder="CVC" maxlength="4" value="123">
    </div>`;
  if (pay === 'bkash' || pay === 'nagad') return `<div class="field"><label>${tr('{method} wallet number', { method: tr(pay === 'bkash' ? 'bKash' : 'Nagad') })}</label><input class="input" name="wallet" placeholder="01XXXXXXXXX" value="${escapeHtml((user.phone || '').replace('+880', '0'))}"></div><p class="hint mt-1">${tr("You'll be redirected to approve the payment (simulated).")}</p>`;
  return `<div class="notice warning">${icon('banknote')}<div>${tr('Please keep the exact amount ready. COD orders may need phone confirmation.')}</div></div>`;
}

function render() {
  const lines = getCart();
  if (!lines.length) {
    main.innerHTML = `<div class="container page">${emptyState('shopping-cart', tr('Nothing to check out'), tr('Your cart is empty.'), `<a class="btn btn-primary" href="${routes.products()}">${tr('Browse products')}</a>`)}</div>`;
    return;
  }
  const t = totals(lines);
  const coupon = store.get('coupon');
  const discount = coupon && COUPONS[coupon] ? COUPONS[coupon].apply(t.subtotal) : 0;

  main.innerHTML = `
  <div class="container page">
    <nav class="breadcrumb"><a href="${routes.cart()}">${tr('Cart')}</a>${icon('chevron-right')}<span>${tr('Checkout')}</span></nav>
    <div class="steps">
      <div class="step done"><span class="n">${icon('check')}</span>${tr('Cart')}</div><span class="sep"></span>
      <div class="step active"><span class="n">2</span>${tr('Delivery & payment')}</div><span class="sep"></span>
      <div class="step"><span class="n">3</span>${tr('Confirmation')}</div>
    </div>
    <form class="cart-layout" data-form>
      <div class="stack" style="gap:16px">
        <section class="card"><div class="card-head"><h3>${icon('map-pin', 'text-primary')} ${tr('Delivery address')}</h3></div><div class="card-body" data-addr>${addressCards()}</div></section>
        <section class="card"><div class="card-head"><h3>${icon('credit-card', 'text-primary')} ${tr('Payment method')}</h3></div><div class="card-body" data-pay>${paymentHtml()}</div></section>
        <section class="card"><div class="card-head"><h3>${icon('package', 'text-primary')} ${tr('Review items ({count})', { count: t.count })}</h3><a class="small text-primary" href="${routes.cart()}">${tr('Edit cart')}</a></div>
          <div>${lines.map((l) => `<div class="feed-item"><img src="${l.product.thumbnail}" style="width:52px;height:52px;border-radius:8px;background:var(--surface-2);object-fit:contain"><div class="grow"><div class="small bold truncate">${escapeHtml(l.product.title)}</div><div class="xs muted">${escapeHtml(db.get('vendors', l.product.vendorId)?.name || '')} · Qty ${l.qty}</div></div><b class="small">${formatPrice(l.product.price * l.qty)}</b></div>`).join('')}</div>
        </section>
      </div>
      <aside class="card card-pad summary">
        <h3 class="mb-2">${tr('Order summary')}</h3>
        <div class="line"><span>${tr('Subtotal')}</span><span>${formatPrice(t.subtotal)}</span></div>
        <div class="line"><span>${tr('Delivery')}</span><span>${t.shipping ? formatPrice(t.shipping) : `<span class="text-success">${tr('Free')}</span>`}</span></div>
        ${discount ? `<div class="line text-success"><span>${tr('Coupon')} (${coupon})</span><span>−${formatPrice(discount)}</span></div>` : ''}
        <div class="line total"><span>${tr('Total')}</span><span>${formatPrice(t.total - discount)}</span></div>
        <button class="btn btn-primary btn-lg btn-block mt-2" data-place>${icon('lock')} ${tr('Place order')} · ${formatPrice(t.total - discount)}</button>
        <p class="xs muted center mt-1">${tr('By placing the order you agree to our terms. Estimated delivery: 1–4 days.')}</p>
      </aside>
    </form>
  </div>`;
  bind(lines, coupon);
}

function bind(lines, coupon) {
  $('[data-addr]').addEventListener('change', (e) => {
    if (e.target.name !== 'addr') return;
    addressId = e.target.value;
    $('[data-new-addr]').classList.toggle('hidden', addressId !== 'new');
  });
  $('[data-pay]').addEventListener('change', (e) => {
    if (e.target.name !== 'pay') return;
    pay = e.target.value;
    $('[data-pay-extra]').innerHTML = payExtra();
  });
  $('[data-form]').onsubmit = async (e) => {
    e.preventDefault();
    const f = e.target;
    let address;
    if (addressId === 'new') {
      address = { id: uid('a'), label: f.label.value, name: f.name.value.trim(), phone: f.phone.value.trim(), line: f.line.value.trim(), area: f.area.value.trim(), isDefault: !(user.addresses || []).length };
      if (!address.name || !address.phone || !address.line || !address.area) return toast(tr('Please complete the delivery address'), 'error');
      if (f.save.checked) {
        try { await db.updateAndSync('users', user.id, (current) => ({ addresses: [...(current.addresses || []), address] })); }
        catch (error) { return toast(error.message, 'error'); }
      }
    } else {
      address = user.addresses.find((a) => a.id === addressId);
    }
    if (pay === 'card' && f.card.value.replace(/\s/g, '').length < 12) return toast(tr('Please enter a valid card number'), 'error');
    const btn = $('[data-place]');
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner" style="width:18px;height:18px;border-width:2px;border-color:rgba(255,255,255,.4);border-top-color:#fff"></span> ${pay === 'cod' ? tr('Placing order…') : tr('Processing payment…')}`;
    try {
      const source = lines.some((l) => l.source === 'live') ? 'live' : lines.some((l) => l.source === 'reel') ? 'reel' : 'store';
      const order = await placeOrder({ lines: lines.map((l) => ({ productId: l.productId, qty: l.qty })), address, paymentMethod: pay, source, coupon });
      lines.forEach((l) => track('purchase', { productId: l.productId }));
      clearCart();
      store.remove('coupon');
      location.href = routes.orderSuccess(order.id);
    } catch (err) {
      toast(err.message, 'error');
      btn.disabled = false;
      render();
    }
  };
}

if (user) render();
