import { mountDashboard } from '../../components/dashboardLayout.js';
import { toast } from '../../components/toast.js';
import { emptyState } from '../../components/cards.js';
import { routes } from '../../core/routes.js';
import { escapeHtml, icon, qs, formatPrice, formatDateTime, statusBadge, debounce, $, $$ } from '../../core/utils.js';
import { vendorOrdersSync, updateOrderStatus } from '../../services/orders.js';
import { channel } from '../../services/realtime.js';

const el = mountDashboard({ role: 'vendor', active: 'orders', title: 'Orders' });
const state = { status: qs('status') || 'all', q: '', source: '' };
const STATUSES = ['all', 'pending', 'processing', 'shipped', 'delivered', 'cancelled'];
const NEXT = { pending: 'processing', processing: 'shipped', shipped: 'delivered' };
const NEXT_LABEL = { pending: 'Accept', processing: 'Mark shipped', shipped: 'Mark delivered' };

function render() {
  const all = vendorOrdersSync(el.vendor.id);
  el.innerHTML = `
    <div class="dash-head"><div><h2>Orders</h2><p>Accept, ship and track orders for your products.</p></div><span class="badge badge-success">${icon('radio')} New orders appear in real time</span></div>
    <div class="card">
      <div class="tabs" style="padding:0 12px">${STATUSES.map((s) => `<button class="tab ${state.status === s ? 'active' : ''}" data-status="${s}" style="text-transform:capitalize">${s} <span class="badge">${s === 'all' ? all.length : all.filter((o) => o.status === s).length}</span></button>`).join('')}</div>
      <div class="toolbar">
        <div class="input-group">${icon('search')}<input class="input" placeholder="Search order ID or customer" data-q value="${escapeHtml(state.q)}"></div>
        <select class="select" data-source><option value="">All channels</option><option value="store" ${state.source === 'store' ? 'selected' : ''}>Store</option><option value="reel" ${state.source === 'reel' ? 'selected' : ''}>Reels</option><option value="live" ${state.source === 'live' ? 'selected' : ''}>Live</option></select>
      </div>
      <div data-table></div>
    </div>`;
  table();
  $$('[data-status]').forEach((b) => (b.onclick = () => { state.status = b.dataset.status; render(); }));
  $('[data-q]').oninput = debounce((e) => { state.q = e.target.value.toLowerCase(); table(); }, 200);
  $('[data-source]').onchange = (e) => { state.source = e.target.value; table(); };
}

function table() {
  let list = vendorOrdersSync(el.vendor.id);
  if (state.status !== 'all') list = list.filter((o) => o.status === state.status);
  if (state.source) list = list.filter((o) => o.source === state.source);
  if (state.q) list = list.filter((o) => o.id.toLowerCase().includes(state.q) || o.customerName.toLowerCase().includes(state.q));
  $('[data-table]').innerHTML = list.length ? `
    <div class="table-wrap"><table class="table">
      <thead><tr><th>Order</th><th>Customer</th><th>Items</th><th>Total</th><th>Channel</th><th>Payment</th><th>Status</th><th></th></tr></thead>
      <tbody>${list.map((o) => `
        <tr>
          <td class="nowrap"><a class="bold text-primary" href="${routes.vendorDash('order-detail', { id: o.id })}">${o.id}</a><div class="xs muted">${formatDateTime(o.createdAt)}</div></td>
          <td class="small">${escapeHtml(o.customerName)}</td>
          <td><div class="row" style="gap:4px">${o.items.slice(0, 3).map((it) => `<img src="${it.thumbnail}" title="${escapeHtml(it.title)}" style="width:34px;height:34px;border-radius:6px;background:var(--surface-2);object-fit:contain">`).join('')}</div></td>
          <td><b>${formatPrice(o.vendorTotal)}</b></td>
          <td><span class="badge ${o.source === 'store' ? '' : 'badge-primary'}">${icon(o.source === 'live' ? 'radio' : o.source === 'reel' ? 'clapperboard' : 'store')} ${o.source}</span></td>
          <td class="small">${o.paymentMethod.toUpperCase()} ${statusBadge(o.paymentStatus)}</td>
          <td>${statusBadge(o.status)}</td>
          <td><div class="actions">${NEXT[o.status] ? `<button class="btn btn-primary btn-xs" data-next="${o.id}" data-to="${NEXT[o.status]}">${NEXT_LABEL[o.status]}</button>` : ''}<a class="btn btn-ghost btn-xs" href="${routes.vendorDash('order-detail', { id: o.id })}">View</a></div></td>
        </tr>`).join('')}</tbody>
    </table></div>` : emptyState('shopping-bag', 'No orders here', 'Orders matching your filters will appear here.');
  $$('[data-next]').forEach((b) => (b.onclick = async () => {
    try {
      await updateOrderStatus(b.dataset.next, b.dataset.to);
      toast(`${b.dataset.next} → ${b.dataset.to}`);
      render();
    } catch (error) { toast(error.message, 'error'); }
  }));
}

if (el) {
  render();
  channel('orders').on('order:new', (o) => {
    if (!o.items.some((it) => it.vendorId === el.vendor.id)) return;
    toast(`New order ${o.id} received`, 'success');
    render();
  });
}
