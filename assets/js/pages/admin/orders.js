import { mountDashboard } from '../../components/dashboardLayout.js';
import { openModal } from '../../components/modal.js';
import { toast } from '../../components/toast.js';
import { emptyState } from '../../components/cards.js';
import { escapeHtml, icon, formatPrice, formatDateTime, statusBadge, debounce, $, $$ } from '../../core/utils.js';
import { updateOrderStatus, ORDER_FLOW, PAYMENT_METHODS } from '../../services/orders.js';
import { channel } from '../../services/realtime.js';
import { db } from '../../services/db.js';

const el = mountDashboard({ role: 'admin', active: 'orders', title: 'Orders' });
const state = { status: 'all', q: '', source: '', page: 1 };
const STATUSES = ['all', 'pending', 'processing', 'shipped', 'delivered', 'cancelled'];
const PER_PAGE = 20;

function render() {
  const all = db.all('orders');
  el.innerHTML = `
    <div class="dash-head"><div><h2>All orders</h2><p>Every order on the marketplace, across all vendors.</p></div><span class="badge badge-success">${icon('radio')} Live updates</span></div>
    <div class="card">
      <div class="tabs" style="padding:0 12px">${STATUSES.map((s) => `<button class="tab ${state.status === s ? 'active' : ''}" data-status="${s}" style="text-transform:capitalize">${s} <span class="badge">${s === 'all' ? all.length : all.filter((o) => o.status === s).length}</span></button>`).join('')}</div>
      <div class="toolbar">
        <div class="input-group">${icon('search')}<input class="input" placeholder="Search order ID or customer" data-q value="${escapeHtml(state.q)}"></div>
        <select class="select" data-source><option value="">All channels</option><option value="store">Store</option><option value="reel">Reels</option><option value="live">Live</option></select>
      </div>
      <div data-table></div>
    </div>`;
  table();
  $$('[data-status]').forEach((b) => (b.onclick = () => { state.status = b.dataset.status; state.page = 1; render(); }));
  $('[data-q]').oninput = debounce((e) => { state.q = e.target.value.toLowerCase(); state.page = 1; table(); }, 200);
  const src = $('[data-source]');
  src.value = state.source;
  src.onchange = (e) => { state.source = e.target.value; state.page = 1; table(); };
}

function table() {
  let list = db.all('orders');
  if (state.status !== 'all') list = list.filter((o) => o.status === state.status);
  if (state.source) list = list.filter((o) => o.source === state.source);
  if (state.q) list = list.filter((o) => o.id.toLowerCase().includes(state.q) || o.customerName.toLowerCase().includes(state.q));
  const pages = Math.max(1, Math.ceil(list.length / PER_PAGE));
  state.page = Math.min(state.page, pages);
  const rows = list.slice((state.page - 1) * PER_PAGE, state.page * PER_PAGE);
  $('[data-table]').innerHTML = list.length ? `
    <div class="table-wrap"><table class="table">
      <thead><tr><th>Order</th><th>Customer</th><th>Vendors</th><th>Total</th><th>Channel</th><th>Payment</th><th>Status</th><th></th></tr></thead>
      <tbody>${rows.map((o) => `
        <tr>
          <td class="nowrap"><b>${o.id}</b><div class="xs muted">${formatDateTime(o.createdAt)}</div></td>
          <td class="small">${escapeHtml(o.customerName)}</td>
          <td class="small">${[...new Set(o.items.map((it) => it.vendorId))].map((id) => escapeHtml(db.get('vendors', id)?.name || id)).join(', ')}</td>
          <td><b>${formatPrice(o.total)}</b></td>
          <td><span class="badge ${o.source === 'store' ? '' : 'badge-primary'}">${o.source}</span></td>
          <td class="small">${o.paymentMethod.toUpperCase()} ${statusBadge(o.paymentStatus)}</td>
          <td>${statusBadge(o.status)}</td>
          <td><button class="btn btn-ghost btn-xs" data-view="${o.id}">Manage</button></td>
        </tr>`).join('')}</tbody>
    </table></div>
    <div class="row-between card-body"><span class="small muted">${list.length} orders</span>
      <div class="row"><button class="btn btn-outline btn-sm" data-page="-1" ${state.page === 1 ? 'disabled' : ''}>${icon('chevron-left')}</button><span class="small">Page ${state.page} / ${pages}</span><button class="btn btn-outline btn-sm" data-page="1" ${state.page === pages ? 'disabled' : ''}>${icon('chevron-right')}</button></div></div>`
    : emptyState('shopping-bag', 'No orders found', 'Try different filters.');
  $$('[data-page]').forEach((b) => (b.onclick = () => { state.page += +b.dataset.page; table(); }));
  $$('[data-view]').forEach((b) => (b.onclick = () => manage(b.dataset.view)));
}

function manage(id) {
  const o = db.get('orders', id);
  const m = openModal({
    title: `Order ${o.id}`,
    variant: 'drawer-right',
    content: `<div class="stack">
      <div class="row-between"><span class="small muted">${formatDateTime(o.createdAt)} · via ${o.source}</span>${statusBadge(o.status)}</div>
      ${o.items.map((it) => `<div class="row"><img src="${it.thumbnail}" style="width:48px;height:48px;border-radius:8px;background:var(--surface-2);object-fit:contain"><div class="grow" style="min-width:0"><div class="small bold truncate">${escapeHtml(it.title)}</div><div class="xs muted">${escapeHtml(db.get('vendors', it.vendorId)?.name || '')} · ${it.qty} × ${formatPrice(it.price)}</div></div></div>`).join('')}
      <div class="card card-pad small stack" style="gap:6px">
        <div class="row-between"><span>Subtotal</span><span>${formatPrice(o.subtotal)}</span></div>
        <div class="row-between"><span>Shipping</span><span>${o.shipping ? formatPrice(o.shipping) : 'Free'}</span></div>
        ${o.discount ? `<div class="row-between"><span>Discount ${o.coupon ? `(${o.coupon})` : ''}</span><span>−${formatPrice(o.discount)}</span></div>` : ''}
        <div class="row-between bold"><span>Total</span><span>${formatPrice(o.total)}</span></div>
        <div class="row-between muted"><span>Platform commission (10%)</span><span>${formatPrice(o.subtotal * 0.1)}</span></div>
      </div>
      <div class="small"><b>Ship to</b><div class="muted">${escapeHtml(o.address?.name || o.customerName)} · ${escapeHtml(o.address?.phone || '')}<br>${escapeHtml(o.address?.line || '')}, ${escapeHtml(o.address?.area || '')}</div></div>
      <div class="small"><b>Payment</b><div class="muted">${escapeHtml(PAYMENT_METHODS.find((p) => p.id === o.paymentMethod)?.name || o.paymentMethod)} · ${o.paymentStatus}</div></div>
      <div class="field"><label>Override status</label><select class="select" data-to>${[...ORDER_FLOW, 'cancelled'].map((s) => `<option value="${s}" ${o.status === s ? 'selected' : ''}>${s}</option>`).join('')}</select></div>
    </div>`,
    footer: '<button class="btn btn-outline" data-close>Close</button><button class="btn btn-primary" data-save>Update status</button>',
  });
  m.el.querySelector('[data-save]').onclick = async () => {
    const to = m.el.querySelector('[data-to]').value;
    try {
      if (to !== o.status) { await updateOrderStatus(o.id, to); toast(`${o.id} → ${to}`); }
      m.close();
      render();
    } catch (error) { toast(error.message, 'error'); }
  };
}

if (el) {
  render();
  channel('orders').on('order:new', (o) => { toast(`New order ${o.id}`, 'success'); render(); });
}
