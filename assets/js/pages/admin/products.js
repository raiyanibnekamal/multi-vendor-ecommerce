import { mountDashboard } from '../../components/dashboardLayout.js';
import { confirmDialog } from '../../components/modal.js';
import { toast } from '../../components/toast.js';
import { emptyState } from '../../components/cards.js';
import { routes } from '../../core/routes.js';
import { escapeHtml, icon, qs, formatPrice, formatNumber, statusBadge, debounce, $, $$ } from '../../core/utils.js';
import { saveProduct, deleteProduct, categoryById, rootOf, childrenOf } from '../../services/catalog.js';
import { db } from '../../services/db.js';

const el = mountDashboard({ role: 'admin', active: 'products', title: 'Products' });
const state = { q: '', vendor: qs('vendor') || '', cat: '', status: '', page: 1 };
const PER_PAGE = 20;

function render() {
  const vendors = db.all('vendors');
  el.innerHTML = `
    <div class="dash-head"><div><h2>All products</h2><p>${db.all('products').length} listings across ${vendors.length} vendors</p></div></div>
    <div class="card">
      <div class="toolbar">
        <div class="input-group">${icon('search')}<input class="input" placeholder="Search products or brands" data-q value="${escapeHtml(state.q)}"></div>
        <select class="select" data-vendor><option value="">All vendors</option>${vendors.map((v) => `<option value="${v.id}" ${state.vendor === v.id ? 'selected' : ''}>${escapeHtml(v.name)}</option>`).join('')}</select>
        <select class="select" data-cat><option value="">All categories</option>${childrenOf(null).map((c) => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('')}</select>
        <select class="select" data-status><option value="">Any status</option><option value="active">Active</option><option value="draft">Draft</option><option value="blocked">Blocked</option></select>
      </div>
      <div data-table></div>
    </div>`;
  table();
  $('[data-q]').oninput = debounce((e) => { state.q = e.target.value.toLowerCase(); state.page = 1; table(); }, 200);
  $('[data-vendor]').onchange = (e) => { state.vendor = e.target.value; state.page = 1; table(); };
  $('[data-cat]').onchange = (e) => { state.cat = e.target.value; state.page = 1; table(); };
  $('[data-status]').onchange = (e) => { state.status = e.target.value; state.page = 1; table(); };
}

function table() {
  let list = db.all('products');
  if (state.q) list = list.filter((p) => `${p.title} ${p.brand}`.toLowerCase().includes(state.q));
  if (state.vendor) list = list.filter((p) => p.vendorId === state.vendor);
  if (state.cat) list = list.filter((p) => rootOf(p.categoryId)?.id === state.cat);
  if (state.status) list = list.filter((p) => p.status === state.status);
  const pages = Math.max(1, Math.ceil(list.length / PER_PAGE));
  state.page = Math.min(state.page, pages);
  const rows = list.slice((state.page - 1) * PER_PAGE, state.page * PER_PAGE);
  $('[data-table]').innerHTML = list.length ? `
    <div class="table-wrap"><table class="table">
      <thead><tr><th>Product</th><th>Vendor</th><th>Category</th><th>Price</th><th>Stock</th><th>Sold</th><th>Status</th><th></th></tr></thead>
      <tbody>${rows.map((p) => `
        <tr>
          <td><div class="cell-product"><img src="${p.thumbnail}" alt=""><div style="min-width:0"><a class="bold truncate" style="display:block;max-width:240px" href="${routes.product(p.id)}" target="_blank">${escapeHtml(p.title)}</a><span class="xs muted">${escapeHtml(p.brand || '')}</span></div></div></td>
          <td class="small"><a href="${routes.adminDash('vendor-detail', { id: p.vendorId })}">${escapeHtml(db.get('vendors', p.vendorId)?.name || '')}</a></td>
          <td class="small">${escapeHtml(categoryById(p.categoryId)?.name || '')}</td>
          <td><b>${formatPrice(p.price)}</b></td>
          <td class="${p.stock === 0 ? 'text-danger bold' : ''}">${p.stock}</td>
          <td>${formatNumber(p.sold)}</td>
          <td>${statusBadge(p.status)}</td>
          <td><div class="actions">
            ${p.status === 'blocked' ? `<button class="btn btn-soft btn-xs" data-status="active" data-id="${p.id}">Restore</button>` : `<button class="btn btn-ghost btn-xs text-danger" data-status="blocked" data-id="${p.id}">${icon('ban')} Block</button>`}
            <button class="btn btn-ghost btn-xs btn-icon text-danger" data-del="${p.id}" title="Delete">${icon('trash-2')}</button>
          </div></td>
        </tr>`).join('')}</tbody>
    </table></div>
    <div class="row-between card-body"><span class="small muted">Showing ${(state.page - 1) * PER_PAGE + 1}–${Math.min(state.page * PER_PAGE, list.length)} of ${list.length}</span>
      <div class="row"><button class="btn btn-outline btn-sm" data-page="-1" ${state.page === 1 ? 'disabled' : ''}>${icon('chevron-left')} Prev</button><span class="small">Page ${state.page} / ${pages}</span><button class="btn btn-outline btn-sm" data-page="1" ${state.page === pages ? 'disabled' : ''}>Next ${icon('chevron-right')}</button></div></div>`
    : emptyState('package', 'No products match', 'Try different filters.');

  $$('[data-page]').forEach((b) => (b.onclick = () => { state.page += +b.dataset.page; table(); }));
  $$('[data-status][data-id]').forEach((b) => (b.onclick = async () => {
    await saveProduct({ id: b.dataset.id, status: b.dataset.status });
    toast(b.dataset.status === 'blocked' ? 'Product blocked — hidden from the store' : 'Product restored', 'info');
    table();
  }));
  $$('[data-del]').forEach((b) => (b.onclick = async () => {
    if (!(await confirmDialog({ title: 'Delete this listing?', message: 'The vendor will be notified. This cannot be undone.', confirmText: 'Delete', danger: true }))) return;
    await deleteProduct(b.dataset.del);
    toast('Product deleted', 'info');
    table();
  }));
}

if (el) render();
