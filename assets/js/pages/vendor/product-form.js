import { mountDashboard } from '../../components/dashboardLayout.js';
import { categoryOptions, imageToDataUrl } from '../../components/forms.js';
import { toast } from '../../components/toast.js';
import { routes } from '../../core/routes.js';
import { escapeHtml, icon, qs, formatPrice, sleep, $, $$ } from '../../core/utils.js';
import { saveProduct, categoryById } from '../../services/catalog.js';
import { db } from '../../services/db.js';

const id = qs('id');
const el = mountDashboard({ role: 'vendor', active: 'products', title: id ? 'Edit product' : 'Add product' });
const existing = id ? db.get('products', id) : null;
let images = existing ? [...(existing.images.length ? existing.images : [existing.thumbnail])] : [];
let tags = existing ? [...existing.tags] : [];

function render() {
  const p = existing || { title: '', description: '', brand: '', categoryId: '', price: '', originalPrice: '', stock: 10, status: 'active' };
  el.innerHTML = `
    <a class="small muted row mb-2" href="${routes.vendorDash('products')}">${icon('arrow-left')} Back to products</a>
    <form class="dash-grid" style="margin-top:0" data-form>
      <div class="stack" style="gap:16px">
        <div class="card"><div class="card-head"><h3>Basic information</h3></div><div class="card-body stack">
          <div class="field"><label>Product title *</label><input class="input" name="title" value="${escapeHtml(p.title)}" required placeholder="e.g. Wireless Earbuds Pro"></div>
          <div class="field"><div class="row-between"><label>Description *</label><button type="button" class="btn btn-soft btn-xs" data-ai-desc>${icon('sparkles')} Write with AI</button></div><textarea class="textarea" name="description" rows="5" required placeholder="Describe features, materials, sizes…">${escapeHtml(p.description)}</textarea></div>
          <div class="form-grid">
            <div class="field"><label>Category *</label><select class="select" name="categoryId" required><option value="">Select category</option>${categoryOptions(p.categoryId)}</select></div>
            <div class="field"><label>Brand</label><input class="input" name="brand" value="${escapeHtml(p.brand || '')}"></div>
          </div>
        </div></div>

        <div class="card"><div class="card-head"><h3>Images</h3><span class="xs muted">First image is the thumbnail</span></div><div class="card-body stack">
          <label class="dropzone" data-drop>${'<div class="ic">' + icon('image-plus') + '</div>'}<b>Drop images here or click to upload</b><div class="small muted">PNG or JPG — resized automatically</div><input type="file" accept="image/*" multiple hidden data-file></label>
          <div class="row"><input class="input" placeholder="…or paste an image URL" data-url><button type="button" class="btn btn-outline" data-add-url>Add</button></div>
          <div class="img-previews" data-previews></div>
        </div></div>
      </div>

      <div class="stack" style="gap:16px">
        <div class="card"><div class="card-head"><h3>Pricing & stock</h3></div><div class="card-body stack">
          <div class="field"><label>Selling price (৳) *</label><input class="input" type="number" min="1" name="price" value="${p.price}" required></div>
          <div class="field"><label>Original price (৳)</label><input class="input" type="number" min="0" name="originalPrice" value="${p.originalPrice || ''}"><span class="hint" data-disc></span></div>
          <div class="field"><label>Stock quantity *</label><input class="input" type="number" min="0" name="stock" value="${p.stock}" required></div>
        </div></div>
        <div class="card"><div class="card-head"><h3>Tags</h3><button type="button" class="btn btn-soft btn-xs" data-ai-tags>${icon('sparkles')} Suggest</button></div><div class="card-body stack">
          <div class="chips" data-tags></div>
          <input class="input" placeholder="Type a tag and press Enter" data-tag-input>
        </div></div>
        <div class="card"><div class="card-head"><h3>Visibility</h3></div><div class="card-body stack">
          <label class="radio-card"><input type="radio" name="status" value="active" ${p.status === 'active' ? 'checked' : ''}><div><b class="small">Active</b><div class="xs muted">Visible in store, reels & live</div></div></label>
          <label class="radio-card"><input type="radio" name="status" value="draft" ${p.status === 'draft' ? 'checked' : ''}><div><b class="small">Draft</b><div class="xs muted">Hidden from customers</div></div></label>
        </div></div>
        <button class="btn btn-primary btn-lg">${icon('save')} ${existing ? 'Save changes' : 'Publish product'}</button>
      </div>
    </form>`;
  previews();
  tagChips();
  bind();
}

function previews() {
  $('[data-previews]').innerHTML = images.map((src, i) => `<div class="item"><img src="${src}" alt="">${i === 0 ? '<span class="badge badge-primary" style="position:absolute;left:4px;bottom:4px">Cover</span>' : ''}<button type="button" data-rm-img="${i}">${icon('x')}</button></div>`).join('');
  $$('[data-rm-img]').forEach((b) => (b.onclick = () => { images.splice(+b.dataset.rmImg, 1); previews(); }));
}

function tagChips() {
  $('[data-tags]').innerHTML = tags.map((t, i) => `<span class="chip active" style="height:30px">${escapeHtml(t)} <button type="button" data-rm-tag="${i}" style="color:#fff">${icon('x')}</button></span>`).join('') || '<span class="small muted">No tags yet</span>';
  $$('[data-rm-tag]').forEach((b) => (b.onclick = () => { tags.splice(+b.dataset.rmTag, 1); tagChips(); }));
}

function bind() {
  const f = $('[data-form]');
  const fileInput = $('[data-file]');
  const drop = $('[data-drop]');
  const addFiles = async (files) => {
    for (const file of [...files].filter((x) => x.type.startsWith('image/')).slice(0, 6)) images.push(await imageToDataUrl(file));
    previews();
  };
  fileInput.onchange = () => addFiles(fileInput.files);
  drop.ondragover = (e) => { e.preventDefault(); drop.classList.add('drag'); };
  drop.ondragleave = () => drop.classList.remove('drag');
  drop.ondrop = (e) => { e.preventDefault(); drop.classList.remove('drag'); addFiles(e.dataTransfer.files); };
  $('[data-add-url]').onclick = () => { const u = $('[data-url]').value.trim(); if (u) { images.push(u); $('[data-url]').value = ''; previews(); } };

  const updateDisc = () => {
    const price = +f.price.value, orig = +f.originalPrice.value;
    $('[data-disc]').textContent = orig > price && price > 0 ? `Customers see ${Math.round((1 - price / orig) * 100)}% off (save ${formatPrice(orig - price)})` : '';
  };
  f.price.oninput = f.originalPrice.oninput = updateDisc;
  updateDisc();

  $('[data-tag-input]').onkeydown = (e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const t = e.target.value.trim().toLowerCase();
    if (t && !tags.includes(t)) tags.push(t);
    e.target.value = '';
    tagChips();
  };
  $('[data-ai-tags]').onclick = async (e) => {
    e.currentTarget.disabled = true;
    await sleep(600);
    const words = `${f.title.value} ${f.brand.value} ${categoryById(f.categoryId.value)?.name || ''}`.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 3);
    [...new Set(words)].slice(0, 5).forEach((w) => !tags.includes(w) && tags.push(w));
    if (f.categoryId.value) tags.push(f.categoryId.value);
    tags = [...new Set(tags)];
    tagChips();
    e.currentTarget.disabled = false;
    toast('AI suggested tags added', 'info');
  };
  $('[data-ai-desc]').onclick = async (e) => {
    const btn = e.currentTarget;
    if (!f.title.value.trim()) return toast('Add a product title first', 'error');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner" style="width:14px;height:14px;border-width:2px"></span> Writing…';
    await sleep(1000);
    const cat = categoryById(f.categoryId.value)?.name || 'product';
    f.description.value = `${f.title.value.trim()}${f.brand.value ? ` by ${f.brand.value.trim()}` : ''} is a thoughtfully designed ${cat.toLowerCase()} built for everyday use. It combines reliable quality with a modern look, making it a great pick for yourself or as a gift. 100% authentic, carefully packed and shipped fast from ${el.vendor.location}.`;
    btn.disabled = false;
    btn.innerHTML = `${icon('sparkles')} Write with AI`;
  };

  f.onsubmit = async (e) => {
    e.preventDefault();
    if (!images.length) return toast('Please add at least one image', 'error');
    const price = +f.price.value;
    const originalPrice = Math.max(price, +f.originalPrice.value || price);
    const row = {
      ...(existing ? { id: existing.id } : {}),
      vendorId: el.vendor.id, title: f.title.value.trim(), description: f.description.value.trim(), brand: f.brand.value.trim() || null,
      categoryId: f.categoryId.value, price, originalPrice, discount: originalPrice > price ? Math.round((1 - price / originalPrice) * 100) : 0,
      stock: +f.stock.value, images, thumbnail: images[0], tags, status: f.status.value,
    };
    try {
      await saveProduct(row);
      toast(existing ? 'Product updated' : 'Product published');
      setTimeout(() => (location.href = routes.vendorDash('products')), 500);
    } catch {
      toast('Could not save — images may be too large for browser storage', 'error');
    }
  };
}

if (el) {
  if (id && !existing) el.innerHTML = '<p class="muted">Product not found.</p>';
  else if (existing && existing.vendorId !== el.vendor.id) el.innerHTML = '<p class="muted">You can only edit your own products.</p>';
  else render();
}
