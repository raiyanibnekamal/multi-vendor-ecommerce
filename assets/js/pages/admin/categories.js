import { mountDashboard } from '../../components/dashboardLayout.js';
import { openModal, confirmDialog } from '../../components/modal.js';
import { toast } from '../../components/toast.js';
import { escapeHtml, icon, $, $$ } from '../../core/utils.js';
import { categoryTree, categoryById, categoryPath, productCount, saveCategory, deleteCategory, descendantIds, getCategoriesSync } from '../../services/catalog.js';

const el = mountDashboard({ role: 'admin', active: 'categories', title: 'Categories' });
const collapsed = new Set();

function node(c, depth = 0) {
  const kids = c.children.length;
  return `<li>
    <div class="tree-node">
      ${kids ? `<button class="btn btn-ghost btn-xs btn-icon" data-fold="${c.id}">${icon(collapsed.has(c.id) ? 'chevron-right' : 'chevron-down')}</button>` : '<span style="width:28px"></span>'}
      <span class="ic" style="color:var(--primary)">${icon(c.icon || (kids ? 'folder' : 'tag'))}</span>
      <b class="${depth ? 'small' : ''}">${escapeHtml(c.name)}</b>
      <span class="badge">${productCount(c.id)} products</span>
      ${depth === 0 ? '<span class="badge badge-primary">root</span>' : ''}
      <div class="actions">
        ${depth < 2 ? `<button class="btn btn-ghost btn-xs" data-add="${c.id}">${icon('plus')} Sub</button>` : ''}
        <button class="btn btn-ghost btn-xs btn-icon" data-edit="${c.id}" title="Edit">${icon('pencil')}</button>
        <button class="btn btn-ghost btn-xs btn-icon text-danger" data-del="${c.id}" title="Delete">${icon('trash-2')}</button>
      </div>
    </div>
    ${kids && !collapsed.has(c.id) ? `<ul>${c.children.map((k) => node(k, depth + 1)).join('')}</ul>` : ''}
  </li>`;
}

function render() {
  const tree = categoryTree();
  const all = getCategoriesSync();
  el.innerHTML = `
    <div class="dash-head"><div><h2>Category tree</h2><p>${all.length} categories across ${tree.length} departments · up to 3 levels deep</p></div>
      <div class="row"><button class="btn btn-outline" data-expand>${icon('chevrons-up-down')} ${collapsed.size ? 'Expand all' : 'Collapse all'}</button><button class="btn btn-primary" data-add="">${icon('plus')} New department</button></div></div>
    <div class="card card-pad"><ul class="tree" style="padding:0;border:0;margin:0">${tree.map((c) => node(c)).join('')}</ul></div>`;

  $$('[data-fold]').forEach((b) => (b.onclick = () => { collapsed.has(b.dataset.fold) ? collapsed.delete(b.dataset.fold) : collapsed.add(b.dataset.fold); render(); }));
  $('[data-expand]').onclick = () => { if (collapsed.size) collapsed.clear(); else tree.forEach((c) => collapsed.add(c.id)); render(); };
  $$('[data-add]').forEach((b) => (b.onclick = () => edit(null, b.dataset.add || null)));
  $$('[data-edit]').forEach((b) => (b.onclick = () => edit(categoryById(b.dataset.edit))));
  $$('[data-del]').forEach((b) => (b.onclick = async () => {
    const c = categoryById(b.dataset.del);
    const n = descendantIds(c.id).length - 1;
    if (!(await confirmDialog({ title: `Delete “${c.name}”?`, message: `${n ? `This also deletes ${n} sub-categories. ` : ''}Products in it (${productCount(c.id)}) will need to be re-categorised.`, confirmText: 'Delete', danger: true }))) return;
    await deleteCategory(c.id);
    toast('Category deleted', 'info');
    render();
  }));
}

function edit(cat, parentId = cat?.parentId ?? null) {
  const parent = parentId ? categoryById(parentId) : null;
  const m = openModal({
    title: cat ? 'Edit category' : parent ? `New sub-category in ${parent.name}` : 'New department',
    content: `<form class="stack" data-form>
      ${parent ? `<div class="small muted">Path: ${categoryPath(parent.id).map((c) => escapeHtml(c.name)).join(' › ')} › <b>${cat ? escapeHtml(cat.name) : 'new'}</b></div>` : ''}
      <div class="field"><label>Name</label><input class="input" name="name" required value="${escapeHtml(cat?.name || '')}" autofocus></div>
      <div class="field"><label>Slug / ID</label><input class="input" name="id" value="${escapeHtml(cat?.id || '')}" ${cat ? 'disabled' : ''} placeholder="auto from name"></div>
      ${!parent ? `<div class="field"><label>Icon (Lucide name)</label><input class="input" name="icon" value="${escapeHtml(cat?.icon || 'tag')}"></div>` : ''}
    </form>`,
    footer: '<button class="btn btn-outline" data-close>Cancel</button><button class="btn btn-primary" data-ok>Save</button>',
  });
  const form = m.el.querySelector('[data-form]');
  form.name.oninput = () => { if (!cat) form.id.value = form.name.value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); };
  const save = async () => {
    const name = form.name.value.trim();
    if (!name) return form.name.focus();
    const id = cat?.id || form.id.value.trim() || name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    if (!cat && categoryById(id)) return toast('A category with this slug already exists', 'error');
    await saveCategory({ id, name, parentId, ...(form.icon ? { icon: form.icon.value.trim() } : {}) });
    if (parentId) collapsed.delete(parentId);
    m.close();
    toast(cat ? 'Category updated' : 'Category created');
    render();
  };
  m.el.querySelector('[data-ok]').onclick = save;
  form.onsubmit = (e) => { e.preventDefault(); save(); };
}

if (el) render();
