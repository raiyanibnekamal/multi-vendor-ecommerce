import { mountDashboard } from '../../components/dashboardLayout.js';
import { confirmDialog } from '../../components/modal.js';
import { toast } from '../../components/toast.js';
import { emptyState } from '../../components/cards.js';
import { routes } from '../../core/routes.js';
import { escapeHtml, icon, avatar, qs, formatPrice, formatNumber, formatDate, statusBadge, debounce, $, $$ } from '../../core/utils.js';
import { updateVendor, vendorProductCount } from '../../services/vendors.js';
import { vendorOrdersSync } from '../../services/orders.js';
import { db } from '../../services/db.js';

const el = mountDashboard({ role: 'admin', active: 'vendors', title: 'Vendors' });
const state = { status: qs('status') || 'all', q: '' };
const TABS = ['all', 'pending', 'approved', 'suspended', 'rejected'];

function render() {
  const all = db.all('vendors');
  el.innerHTML = `
    <div class="dash-head"><div><h2>Vendors</h2><p>Approve new sellers, manage commission and suspend bad actors.</p></div></div>
    <div class="card">
      <div class="tabs" style="padding:0 12px">${TABS.map((s) => `<button class="tab ${state.status === s ? 'active' : ''}" data-status="${s}" style="text-transform:capitalize">${s} <span class="badge">${s === 'all' ? all.length : all.filter((v) => v.status === s).length}</span></button>`).join('')}</div>
      <div class="toolbar"><div class="input-group">${icon('search')}<input class="input" placeholder="Search store, owner or email" data-q value="${escapeHtml(state.q)}"></div></div>
      <div data-table></div>
    </div>`;
  table();
  $$('[data-status]').forEach((b) => (b.onclick = () => { state.status = b.dataset.status; render(); }));
  $('[data-q]').oninput = debounce((e) => { state.q = e.target.value.toLowerCase(); table(); }, 200);
}

function table() {
  let list = db.all('vendors');
  if (state.status !== 'all') list = list.filter((v) => v.status === state.status);
  if (state.q) list = list.filter((v) => `${v.name} ${v.ownerName} ${v.email}`.toLowerCase().includes(state.q));
  $('[data-table]').innerHTML = list.length ? `
    <div class="table-wrap"><table class="table">
      <thead><tr><th>Store</th><th>Owner</th><th>Products</th><th>Sales</th><th>Commission</th><th>Joined</th><th>Status</th><th></th></tr></thead>
      <tbody>${list.map((v) => {
        const sales = vendorOrdersSync(v.id).filter((o) => o.status !== 'cancelled').reduce((s, o) => s + o.vendorTotal, 0);
        return `<tr>
          <td><a class="cell-product" href="${routes.adminDash('vendor-detail', { id: v.id })}">${avatar(v.name, { size: 'sm', color: v.color })}<div><b>${escapeHtml(v.name)}</b>${v.verified ? ` ${icon('badge-check', 'text-primary')}` : ''}<div class="xs muted">${escapeHtml(v.location)}</div></div></a></td>
          <td class="small">${escapeHtml(v.ownerName)}<div class="xs muted">${escapeHtml(v.email)}</div></td>
          <td>${vendorProductCount(v.id)}</td>
          <td><b>${formatPrice(sales)}</b></td>
          <td>${v.commissionRate}%</td>
          <td class="small">${formatDate(v.joinedAt)}</td>
          <td>${statusBadge(v.status)}</td>
          <td><div class="actions">
            ${v.status === 'pending' ? `<button class="btn btn-success btn-xs" data-act="approve" data-id="${v.id}">Approve</button><button class="btn btn-outline btn-xs" data-act="reject" data-id="${v.id}">Reject</button>` : ''}
            ${v.status === 'approved' ? `<button class="btn btn-ghost btn-xs text-danger" data-act="suspend" data-id="${v.id}">Suspend</button>` : ''}
            ${v.status === 'suspended' || v.status === 'rejected' ? `<button class="btn btn-soft btn-xs" data-act="approve" data-id="${v.id}">Reinstate</button>` : ''}
            <a class="btn btn-ghost btn-xs" href="${routes.adminDash('vendor-detail', { id: v.id })}">View</a>
          </div></td>
        </tr>`;
      }).join('')}</tbody>
    </table></div>` : emptyState('store', 'No vendors here', 'Vendors matching this filter will appear here.');
  $$('[data-act]').forEach((b) => (b.onclick = () => act(b.dataset.id, b.dataset.act)));
}

async function act(id, action) {
  const v = db.get('vendors', id);
  const map = { approve: 'approved', reject: 'rejected', suspend: 'suspended' };
  if (action !== 'approve' && !(await confirmDialog({ title: `${action[0].toUpperCase() + action.slice(1)} ${v.name}?`, message: action === 'suspend' ? 'Their products, reels and streams will be hidden from the marketplace.' : 'The applicant will be notified by email.', confirmText: action, danger: true }))) return;
  await updateVendor(id, { status: map[action], verified: action === 'approve' ? true : v.verified });
  toast(`${v.name} ${map[action]}`, action === 'approve' ? 'success' : 'info');
  render();
}

if (el) render();
