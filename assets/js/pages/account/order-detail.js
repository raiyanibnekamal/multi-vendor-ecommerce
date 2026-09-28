import { mountAccount } from './accountLayout.js';
import { emptyState, loading } from '../../components/cards.js';
import { openModal, confirmDialog } from '../../components/modal.js';
import { toast } from '../../components/toast.js';
import { routes } from '../../core/routes.js';
import { escapeHtml, icon, qs, formatPrice, formatDateTime, statusBadge, $, uid } from '../../core/utils.js';
import { getOrder, updateOrderStatus, ORDER_FLOW, PAYMENT_METHODS } from '../../services/orders.js';
import { channel } from '../../services/realtime.js';
import { addToCart } from '../../services/cart.js';
import { db } from '../../services/db.js';

const el = mountAccount('orders', 'Order details');
const id = qs('id');
const STEP_ICONS = { pending: 'clipboard-list', processing: 'package', shipped: 'truck', delivered: 'house' };

async function render() {
  const o = await getOrder(id);
  if (!o || o.customerId !== el.user.id) {
    el.innerHTML = emptyState('package-x', 'Order not found', '', `<a class="btn btn-primary" href="${routes.orders()}">Back to orders</a>`);
    return;
  }
  const idx = ORDER_FLOW.indexOf(o.status);
  const dispute = db.all('disputes').find((d) => d.orderId === o.id);
  el.innerHTML = `
    <a class="small muted row mb-2" href="${routes.orders()}">${icon('arrow-left')} All orders</a>
    <div class="card card-pad">
      <div class="row-between wrap">
        <div><h2>Order ${o.id}</h2><p class="small muted">Placed ${formatDateTime(o.createdAt)}${o.source !== 'store' ? ` · bought from a ${o.source === 'live' ? 'live stream' : 'reel'}` : ''}</p></div>
        <div class="row">${statusBadge(o.status)}<span class="badge badge-success hidden" data-live-tag>${icon('radio')} Live updates on</span></div>
      </div>
      ${o.status === 'cancelled'
        ? `<div class="notice warning mt-2">${icon('circle-x')}<div>This order was cancelled.${o.paymentStatus === 'refunded' ? ' Your payment has been refunded.' : ''}</div></div>`
        : `<div class="timeline mt-3">${ORDER_FLOW.map((s, i) => `<div class="t-step ${i <= idx ? 'done' : ''} ${i === idx ? 'current' : ''}"><span class="dot">${icon(i < idx ? 'check' : STEP_ICONS[s])}</span><span class="lbl" style="text-transform:capitalize">${s}</span></div>`).join('')}</div>`}
      ${dispute ? `<div class="notice mt-2">${icon('life-buoy')}<div>Return/dispute <b>${dispute.id}</b> is ${statusBadge(dispute.status)} — reason: ${escapeHtml(dispute.reason)}</div></div>` : ''}
    </div>

    <div class="dash-grid" style="margin-top:16px">
      <div class="card">
        <div class="card-head"><h3>Items (${o.items.length})</h3></div>
        ${o.items.map((it) => {
          const v = db.get('vendors', it.vendorId);
          return `<div class="feed-item">
            <a href="${routes.product(it.productId)}"><img src="${it.thumbnail}" style="width:60px;height:60px;border-radius:10px;background:var(--surface-2);object-fit:contain"></a>
            <div class="grow"><a class="small bold clamp-2" href="${routes.product(it.productId)}">${escapeHtml(it.title)}</a><div class="xs muted">Sold by ${escapeHtml(v?.name || '')} · Qty ${it.qty}</div>
              ${o.status === 'delivered' ? `<a class="xs text-primary" href="${routes.product(it.productId)}#reviews">Write a review</a>` : ''}</div>
            <b class="small">${formatPrice(it.price * it.qty)}</b>
          </div>`;
        }).join('')}
      </div>
      <div class="stack" style="gap:16px">
        <div class="card card-pad">
          <h4 class="mb-1">Payment summary</h4>
          <div class="row-between small mt-1"><span class="muted">Subtotal</span><span>${formatPrice(o.subtotal)}</span></div>
          <div class="row-between small mt-1"><span class="muted">Delivery</span><span>${o.shipping ? formatPrice(o.shipping) : 'Free'}</span></div>
          ${o.discount ? `<div class="row-between small mt-1 text-success"><span>Coupon ${o.coupon}</span><span>−${formatPrice(o.discount)}</span></div>` : ''}
          <div class="row-between bold mt-1" style="border-top:1px solid var(--border);padding-top:10px"><span>Total</span><span>${formatPrice(o.total)}</span></div>
          <div class="xs muted mt-1">${PAYMENT_METHODS.find((p) => p.id === o.paymentMethod)?.name} · ${statusBadge(o.paymentStatus)}</div>
        </div>
        <div class="card card-pad">
          <h4 class="mb-1">Delivery address</h4>
          <p class="small"><b>${escapeHtml(o.address.name)}</b><br>${escapeHtml(o.address.line)}${o.address.area ? `, ${escapeHtml(o.address.area)}` : ''}<br>${escapeHtml(o.address.phone)}</p>
        </div>
        <div class="stack" style="gap:8px">
          <button class="btn btn-primary" data-again>${icon('rotate-ccw')} Buy again</button>
          ${o.status === 'pending' ? `<button class="btn btn-outline text-danger" data-cancel>${icon('circle-x')} Cancel order</button>` : ''}
          ${o.status === 'delivered' && !dispute ? `<button class="btn btn-outline" data-return>${icon('undo-2')} Request return / refund</button>` : ''}
          <button class="btn btn-ghost" data-open-chat>${icon('bot')} Get help with this order</button>
        </div>
      </div>
    </div>`;

  $('[data-again]').onclick = () => {
    let added = 0;
    o.items.forEach((it) => { try { addToCart(it.productId, it.qty); added++; } catch {} });
    toast(added ? `${added} item(s) added to cart` : 'Items are out of stock', added ? 'success' : 'error', added ? { action: 'View cart', href: routes.cart() } : {});
  };
  $('[data-cancel]')?.addEventListener('click', async () => {
    if (!(await confirmDialog({ title: 'Cancel this order?', message: 'This pending order will be cancelled and its items returned to stock.', confirmText: 'Cancel order', danger: true }))) return;
    try {
      await updateOrderStatus(o.id, 'cancelled');
      toast('Order cancelled', 'info');
      render();
    } catch (error) { toast(error.message, 'error'); }
  });
  $('[data-return]')?.addEventListener('click', () => {
    const m = openModal({
      title: 'Request a return',
      content: `<div class="stack">
        <div class="field"><label>Reason</label><select class="select" data-reason><option>Item not as described</option><option>Product arrived damaged</option><option>Wrong size delivered</option><option>Changed my mind</option></select></div>
        <div class="field"><label>Details</label><textarea class="textarea" data-msg placeholder="Tell us what went wrong"></textarea></div></div>`,
      footer: '<button class="btn btn-outline" data-close>Cancel</button><button class="btn btn-primary" data-submit>Submit request</button>',
    });
    m.el.querySelector('[data-submit]').onclick = async () => {
      try {
        await db.insertAndSync('disputes', {
        id: `D-${Math.floor(600 + Math.random() * 400)}`, orderId: o.id, customerId: o.customerId, customerName: o.customerName, vendorId: o.items[0].vendorId,
        reason: m.el.querySelector('[data-reason]').value, message: m.el.querySelector('[data-msg]').value || '—', amount: o.total, status: 'open', createdAt: new Date().toISOString(),
        });
        m.close();
        toast('Return request submitted. Our team will review it within 24 hours.');
        render();
      } catch (error) { toast(error.message, 'error'); }
    };
  });
}

if (el) {
  el.innerHTML = loading();
  render();
  channel('orders').on('order:update', (o) => {
    if (o?.id !== id) return;
    render().then(() => { $('[data-live-tag]')?.classList.remove('hidden'); toast(`Order status updated: ${o.status}`, 'info'); });
  });
}
