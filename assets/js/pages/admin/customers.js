import { mountDashboard } from '../../components/dashboardLayout.js';
import { openModal, confirmDialog } from '../../components/modal.js';
import { toast } from '../../components/toast.js';
import { emptyState } from '../../components/cards.js';
import { escapeHtml, icon, avatar, formatPrice, formatDate, statusBadge, debounce, $, $$ } from '../../core/utils.js';
import { db } from '../../services/db.js';

const el = mountDashboard({ role: 'admin', active: 'customers', title: 'Customers' });
const state = { q: '', status: '' };

const statsFor = (u) => {
  const orders = db.where('orders', (o) => o.customerId === u.id);
  return { orders, spent: orders.filter((o) => o.status !== 'cancelled').reduce((s, o) => s + o.total, 0) };
};

function render() {
  const all = db.where('users', (u) => u.role === 'customer');
  el.innerHTML = `
    <div class="dash-head"><div><h2>Customers</h2><p>${all.length} registered shoppers</p></div></div>
    <div class="card">
      <div class="toolbar">
        <div class="input-group">${icon('search')}<input class="input" placeholder="Search name, email or phone" data-q value="${escapeHtml(state.q)}"></div>
        <select class="select" data-status><option value="">Any status</option><option value="active">Active</option><option value="blocked">Blocked</option></select>
      </div>
      <div data-table></div>
    </div>`;
  table();
  $('[data-q]').oninput = debounce((e) => { state.q = e.target.value.toLowerCase(); table(); }, 200);
  $('[data-status]').onchange = (e) => { state.status = e.target.value; table(); };
}

function table() {
  let list = db.where('users', (u) => u.role === 'customer');
  if (state.q) list = list.filter((u) => `${u.name} ${u.email} ${u.phone}`.toLowerCase().includes(state.q));
  if (state.status) list = list.filter((u) => (u.status || 'active') === state.status);
  $('[data-table]').innerHTML = list.length ? `
    <div class="table-wrap"><table class="table">
      <thead><tr><th>Customer</th><th>Phone</th><th>Orders</th><th>Total spent</th><th>Joined</th><th>Status</th><th></th></tr></thead>
      <tbody>${list.map((u) => {
        const s = statsFor(u);
        return `<tr>
          <td><div class="cell-product">${avatar(u.name, { size: 'sm' })}<div><b>${escapeHtml(u.name)}</b><div class="xs muted">${escapeHtml(u.email)}</div></div></div></td>
          <td class="small">${escapeHtml(u.phone || '—')}</td>
          <td>${s.orders.length}</td>
          <td><b>${formatPrice(s.spent)}</b></td>
          <td class="small">${formatDate(u.joinedAt)}</td>
          <td>${statusBadge(u.status || 'active')}</td>
          <td><div class="actions"><button class="btn btn-ghost btn-xs" data-view="${u.id}">View</button>
            <button class="btn btn-ghost btn-xs ${u.status === 'blocked' ? '' : 'text-danger'}" data-block="${u.id}">${u.status === 'blocked' ? 'Unblock' : 'Block'}</button></div></td>
        </tr>`;
      }).join('')}</tbody>
    </table></div>` : emptyState('users', 'No customers found', 'Try a different search.');

  $$('[data-block]').forEach((b) => (b.onclick = async () => {
    const u = db.get('users', b.dataset.block);
    const blocking = u.status !== 'blocked';
    if (blocking && !(await confirmDialog({ title: `Block ${u.name}?`, message: 'They will not be able to sign in, order or comment.', confirmText: 'Block', danger: true }))) return;
    try {
      await db.updateAndSync('users', u.id, { status: blocking ? 'blocked' : 'active' });
      toast(blocking ? 'Customer blocked' : 'Customer unblocked', 'info');
      table();
    } catch (error) { toast(error.message, 'error'); }
  }));
  $$('[data-view]').forEach((b) => (b.onclick = () => {
    const u = db.get('users', b.dataset.view);
    const s = statsFor(u);
    openModal({
      title: u.name,
      variant: 'drawer-right',
      content: `<div class="stack">
        <div class="row">${avatar(u.name, { size: 'lg' })}<div><b>${escapeHtml(u.name)}</b><div class="small muted">${escapeHtml(u.email)}</div><div class="small muted">${escapeHtml(u.phone || '')}</div></div></div>
        <div class="row-between small"><span>Orders</span><b>${s.orders.length}</b></div>
        <div class="row-between small"><span>Total spent</span><b>${formatPrice(s.spent)}</b></div>
        <h4 class="mt-1">Addresses</h4>
        ${(u.addresses || []).map((a) => `<div class="card card-pad small"><b>${escapeHtml(a.label)}</b><div class="muted">${escapeHtml(a.line)}, ${escapeHtml(a.area)}</div></div>`).join('') || '<p class="small muted">None saved.</p>'}
        <h4 class="mt-1">Order history</h4>
        ${s.orders.map((o) => `<div class="row-between small" style="padding:6px 0;border-bottom:1px solid var(--border)"><span><b>${o.id}</b> · ${formatDate(o.createdAt)}</span><span>${formatPrice(o.total)} ${statusBadge(o.status)}</span></div>`).join('') || '<p class="small muted">No orders yet.</p>'}
      </div>`,
    });
  }));
}

if (el) render();
