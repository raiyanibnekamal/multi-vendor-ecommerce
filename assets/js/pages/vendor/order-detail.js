import { mountDashboard } from '../../components/dashboardLayout.js';
import { confirmDialog } from '../../components/modal.js';
import { toast } from '../../components/toast.js';
import { routes } from '../../core/routes.js';
import { escapeHtml, icon, qs, formatPrice, formatDateTime, statusBadge, avatar, $ } from '../../core/utils.js';
import { vendorOrdersSync, updateOrderStatus, ORDER_FLOW, PAYMENT_METHODS } from '../../services/orders.js';

const el = mountDashboard({ role: 'vendor', active: 'orders', title: 'Order details' });
const id = qs('id');

function render() {
  const o = vendorOrdersSync(el.vendor.id).find((x) => x.id === id);
  if (!o) { el.innerHTML = `<p class="muted">Order not found.</p><a class="btn btn-outline mt-2" href="${routes.vendorDash('orders')}">Back</a>`; return; }
  const idx = ORDER_FLOW.indexOf(o.status);
  const fee = Math.round(o.vendorTotal * (el.vendor.commissionRate / 100));
  el.innerHTML = `
    <a class="small muted row mb-2" href="${routes.vendorDash('orders')}">${icon('arrow-left')} All orders</a>
    <div class="dash-head">
      <div><h2>${o.id}</h2><p>Placed ${formatDateTime(o.createdAt)} · via ${o.source}</p></div>
      <div class="row wrap">
        ${statusBadge(o.status)}
        <button class="btn btn-outline btn-sm" onclick="window.print()">${icon('printer')} Invoice</button>
        ${o.status === 'pending' ? `<button class="btn btn-primary btn-sm" data-to="processing">${icon('check')} Accept order</button>` : ''}
        ${o.status === 'processing' ? `<button class="btn btn-primary btn-sm" data-to="shipped">${icon('truck')} Mark as shipped</button>` : ''}
        ${o.status === 'shipped' ? `<button class="btn btn-success btn-sm" data-to="delivered">${icon('circle-check')} Mark delivered</button>` : ''}
        ${['pending', 'processing'].includes(o.status) ? `<button class="btn btn-ghost btn-sm text-danger" data-cancel>Cancel</button>` : ''}
      </div>
    </div>
    ${o.status !== 'cancelled' ? `<div class="card card-pad mb-2"><div class="timeline">${ORDER_FLOW.map((s, i) => `<div class="t-step ${i <= idx ? 'done' : ''} ${i === idx ? 'current' : ''}"><span class="dot">${icon(i <= idx ? 'check' : 'circle')}</span><span style="text-transform:capitalize">${s}</span></div>`).join('')}</div></div>` : ''}
    <div class="dash-grid" style="margin-top:0">
      <div class="card">
        <div class="card-head"><h3>Your items</h3></div>
        ${o.items.map((it) => `<div class="feed-item"><img src="${it.thumbnail}" style="width:56px;height:56px;border-radius:8px;background:var(--surface-2);object-fit:contain"><div class="grow"><div class="small bold">${escapeHtml(it.title)}</div><div class="xs muted">${formatPrice(it.price)} × ${it.qty}</div></div><b>${formatPrice(it.price * it.qty)}</b></div>`).join('')}
        <div class="card-body" style="border-top:1px solid var(--border)">
          <div class="row-between small"><span class="muted">Items total</span><span>${formatPrice(o.vendorTotal)}</span></div>
          <div class="row-between small mt-1"><span class="muted">Platform commission (${el.vendor.commissionRate}%)</span><span>−${formatPrice(fee)}</span></div>
          <div class="row-between bold mt-1"><span>Your earnings</span><span class="text-success">${formatPrice(o.vendorTotal - fee)}</span></div>
        </div>
      </div>
      <div class="stack" style="gap:16px">
        <div class="card card-pad"><h4 class="mb-1">Customer</h4><div class="row">${avatar(o.customerName, { size: 'sm' })}<div><b class="small">${escapeHtml(o.customerName)}</b><div class="xs muted">${escapeHtml(o.address.phone)}</div></div></div>
          <a class="btn btn-outline btn-sm btn-block mt-2" href="${routes.vendorDash('messages')}">${icon('message-circle')} Message customer</a></div>
        <div class="card card-pad"><h4 class="mb-1">Ship to</h4><p class="small">${escapeHtml(o.address.name)}<br>${escapeHtml(o.address.line)}${o.address.area ? `, ${escapeHtml(o.address.area)}` : ''}</p></div>
        <div class="card card-pad"><h4 class="mb-1">Payment</h4><p class="small">${PAYMENT_METHODS.find((p) => p.id === o.paymentMethod)?.name} ${statusBadge(o.paymentStatus)}</p></div>
      </div>
    </div>`;
  el.querySelectorAll('[data-to]').forEach((b) => (b.onclick = async () => {
    await updateOrderStatus(o.id, b.dataset.to);
    toast(`Order marked as ${b.dataset.to}. The customer sees it live.`);
    render();
  }));
  $('[data-cancel]')?.addEventListener('click', async () => {
    if (!(await confirmDialog({ title: 'Cancel order?', message: 'The customer will be notified and refunded.', confirmText: 'Cancel order', danger: true }))) return;
    await updateOrderStatus(o.id, 'cancelled');
    render();
  });
}

if (el) render();
