import { mountDashboard } from '../../components/dashboardLayout.js';
import { confirmDialog } from '../../components/modal.js';
import { toast } from '../../components/toast.js';
import { emptyState } from '../../components/cards.js';
import { routes } from '../../core/routes.js';
import { escapeHtml, icon, formatPrice, formatNumber, statusBadge, debounce, $, $$ } from '../../core/utils.js';
import { saveProduct, deleteProduct, categoryById, rootOf } from '../../services/catalog.js';
import { db } from '../../services/db.js';

const el = mountDashboard({ role: 'vendor', active: 'products', title: 'Products' });
const state = { q: '', cat: '', status: '' };

function render() {
  const all = db.where('products', (p) => p.vendorId === el.vendor.id);
  const roots = [...new Set(all.map((p) => rootOf(p.categoryId)?.id))].filter(Boolean);
  el.innerHTML = `
    <div class="dash-head"><div><h2>Products</h2><p>${all.length} products in your catalog</p></div><a class="btn btn-primary" href="${routes.vendorDash('product-form')}">${icon('plus')} Add product</a></div>
    <div class="card">
      <div class="toolbar">
        <div class="input-group">${icon('search')}<input class="input" placeholder="Search products" data-q value="${escapeHtml(state.q)}"></div>
        <select class="select" data-cat><option value="">All categories</option>${roots.map((r) => `<option value="${r}" ${state.cat === r ? 'selected' : ''}>${escapeHtml(categoryById(r).name)}</option>`).join('')}</select>
        <select class="select" data-status><option value="">Any status</option><option value="active" ${state.status === 'active' ? 'selected' : ''}>Active</option><option value="draft" ${state.status === 'draft' ? 'selected' : ''}>Draft</option></select>
      </div>
      <div data-table></div>
    </div>`;
  table();
  $('[data-q]').oninput = debounce((e) => { state.q = e.target.value; table(); }, 200);
  $('[data-cat]').onchange = (e) => { state.cat = e.target.value; table(); };
  $('[data-status]').onchange = (e) => { state.status = e.target.value; table(); };
}

function table() {
  let list = db.where('products', (p) => p.vendorId === el.vendor.id);
  if (state.q) list = list.filter((p) => p.title.toLowerCase().includes(state.q.toLowerCase()));
  if (state.cat) list = list.filter((p) => rootOf(p.categoryId)?.id === state.cat);
  if (state.status) list = list.filter((p) => p.status === state.status);
  $('[data-table]').innerHTML = list.length ? `
    <div class="table-wrap"><table class="table">
      <thead><tr><th>Product</th><th>Category</th><th>Price</th><th>Stock</th><th>Sold</th><th>Status</th><th></th></tr></thead>
      <tbody>${list.map((p) => `
        <tr>
          <td><div class="cell-product"><img src="${p.thumbnail}" alt=""><div style="min-width:0"><a class="bold truncate" style="display:block;max-width:260px" href="${routes.product(p.id)}" target="_blank">${escapeHtml(p.title)}</a><span class="xs muted">${p.id.toUpperCase()}</span></div></div></td>
          <td class="small">${escapeHtml(categoryById(p.categoryId)?.name || '')}</td>
          <td><b>${formatPrice(p.price)}</b>${p.discount ? `<div class="xs muted"><s>${formatPrice(p.originalPrice)}</s> −${p.discount}%</div>` : ''}</td>
          <td><span class="${p.stock === 0 ? 'text-danger' : p.stock <= 10 ? 'text-warning' : ''} bold">${p.stock}</span></td>
          <td>${formatNumber(p.sold)}</td>
          <td><label class="switch" title="Active"><input type="checkbox" data-toggle="${p.id}" ${p.status === 'active' ? 'checked' : ''}><span></span></label></td>
          <td><div class="actions">
            <a class="btn btn-ghost btn-sm btn-icon" href="${routes.vendorDash('product-form', { id: p.id })}" title="Edit">${icon('pencil')}</a>
            <button class="btn btn-ghost btn-sm btn-icon text-danger" data-del="${p.id}" title="Delete">${icon('trash-2')}</button>
          </div></td>
        </tr>`).join('')}</tbody>
    </table></div>` : emptyState('package', 'No products match', 'Try a different search or add a new product.');
  $$('[data-toggle]').forEach((t) => (t.onchange = async () => {
    try {
      await saveProduct({ id: t.dataset.toggle, status: t.checked ? 'active' : 'draft' });
      toast(t.checked ? 'Product is now live' : 'Product hidden from store', 'info');
    } catch (error) { t.checked = !t.checked; toast(error.message, 'error'); }
  }));
  $$('[data-del]').forEach((b) => (b.onclick = async () => {
    if (!(await confirmDialog({ title: 'Delete product?', message: 'This removes it from your store and any reels it is tagged in.', confirmText: 'Delete', danger: true }))) return;
    try {
      await deleteProduct(b.dataset.del);
      toast('Product deleted', 'info');
      table();
    } catch (error) { toast(error.message, 'error'); }
  }));
}

if (el) render();
