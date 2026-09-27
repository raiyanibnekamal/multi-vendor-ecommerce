import { mountDashboard } from '../../components/dashboardLayout.js';
import { toast } from '../../components/toast.js';
import { routes } from '../../core/routes.js';
import { escapeHtml, icon, formatPrice, $, $$ } from '../../core/utils.js';
import { updateStock } from '../../services/catalog.js';
import { db } from '../../services/db.js';

const el = mountDashboard({ role: 'vendor', active: 'inventory', title: 'Inventory' });
let filter = 'all';

function render() {
  const all = db.where('products', (p) => p.vendorId === el.vendor.id);
  const out = all.filter((p) => p.stock === 0).length;
  const low = all.filter((p) => p.stock > 0 && p.stock <= 10).length;
  const value = all.reduce((s, p) => s + p.price * p.stock, 0);
  const list = filter === 'out' ? all.filter((p) => p.stock === 0) : filter === 'low' ? all.filter((p) => p.stock > 0 && p.stock <= 10) : all;

  el.innerHTML = `
    <div class="dash-head"><div><h2>Inventory</h2><p>Update stock levels. Changes sync to your store instantly.</p></div></div>
    <div class="stats">
      <div class="stat"><span class="ic">${icon('boxes')}</span><div><div class="lbl">Total SKUs</div><div class="val">${all.length}</div></div></div>
      <div class="stat"><span class="ic green">${icon('wallet')}</span><div><div class="lbl">Stock value</div><div class="val">${formatPrice(value)}</div></div></div>
      <div class="stat"><span class="ic amber">${icon('triangle-alert')}</span><div><div class="lbl">Low stock</div><div class="val">${low}</div></div></div>
      <div class="stat"><span class="ic red">${icon('package-x')}</span><div><div class="lbl">Out of stock</div><div class="val">${out}</div></div></div>
    </div>
    <div class="card mt-2">
      <div class="toolbar">
        <div class="seg">${[['all', 'All'], ['low', 'Low stock'], ['out', 'Out of stock']].map(([k, l]) => `<button class="${filter === k ? 'active' : ''}" data-f="${k}">${l}</button>`).join('')}</div>
        <button class="btn btn-outline btn-sm" style="margin-left:auto" data-restock ${!(low + out) ? 'disabled' : ''}>${icon('refresh-cw')} Restock all low items (+25)</button>
      </div>
      <div class="table-wrap"><table class="table">
        <thead><tr><th>Product</th><th>Price</th><th>Sold</th><th>Status</th><th style="width:230px">Stock</th></tr></thead>
        <tbody>${list.map((p) => `
          <tr>
            <td><div class="cell-product"><img src="${p.thumbnail}" alt=""><a class="bold truncate" style="max-width:280px" href="${routes.vendorDash('product-form', { id: p.id })}">${escapeHtml(p.title)}</a></div></td>
            <td>${formatPrice(p.price)}</td>
            <td>${p.sold}</td>
            <td>${p.stock === 0 ? '<span class="badge badge-danger">Out of stock</span>' : p.stock <= 10 ? '<span class="badge badge-warning">Low</span>' : '<span class="badge badge-success">In stock</span>'}</td>
            <td><div class="row"><div class="qty"><button data-step="-1" data-id="${p.id}">${icon('minus')}</button><input value="${p.stock}" data-stock="${p.id}" style="width:56px"><button data-step="1" data-id="${p.id}">${icon('plus')}</button></div><button class="btn btn-soft btn-sm" data-save="${p.id}">Save</button></div></td>
          </tr>`).join('')}</tbody>
      </table></div>
    </div>`;

  $$('[data-f]').forEach((b) => (b.onclick = () => { filter = b.dataset.f; render(); }));
  $$('[data-step]').forEach((b) => (b.onclick = () => { const i = $(`[data-stock="${b.dataset.id}"]`); i.value = Math.max(0, (+i.value || 0) + +b.dataset.step); }));
  $$('[data-save]').forEach((b) => (b.onclick = async () => { await updateStock(b.dataset.save, $(`[data-stock="${b.dataset.save}"]`).value); toast('Stock updated'); render(); }));
  $('[data-restock]').onclick = async () => {
    const items = all.filter((p) => p.stock <= 10);
    for (const p of items) await updateStock(p.id, p.stock + 25);
    toast(`${items.length} products restocked`);
    render();
  };
}

if (el) render();
