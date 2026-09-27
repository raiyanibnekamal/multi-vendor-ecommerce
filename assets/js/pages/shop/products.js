import { mountShell } from '../../components/shell.js';
import { productGrid, loading } from '../../components/cards.js';
import { routes } from '../../core/routes.js';
import { escapeHtml, icon, $, formatPrice } from '../../core/utils.js';
import { categoryTree, categoryPath, categoryById, getProducts, productCount } from '../../services/catalog.js';
import { track } from '../../services/ai.js';

const main = mountShell({ active: 'products' });
const params = Object.fromEntries(new URLSearchParams(location.search));
params.page = +params.page || 1;
params.sort ||= 'popular';

const SORTS = { popular: 'Most popular', newest: 'Newest', 'price-asc': 'Price: low to high', 'price-desc': 'Price: high to low', rating: 'Top rated', discount: 'Biggest discount' };

function treeHtml(nodes, lvl = 0) {
  const activePath = params.category ? categoryPath(params.category).map((c) => c.id) : [];
  return nodes.map((n) => {
    const open = activePath.includes(n.id) || lvl === 0;
    return `<a class="lvl-${lvl} ${params.category === n.id ? 'active' : ''}" href="#" data-cat="${n.id}">${escapeHtml(n.name)} <span>${productCount(n.id)}</span></a>
      ${n.children.length && open && (lvl === 0 ? activePath[0] === n.id : true) ? treeHtml(n.children, lvl + 1) : ''}`;
  }).join('');
}

function layout() {
  const cat = params.category ? categoryById(params.category) : null;
  const path = cat ? categoryPath(cat.id) : [];
  const title = params.q ? `Results for "${escapeHtml(params.q)}"` : cat ? escapeHtml(cat.name) : params.onSale ? "Today's deals" : 'All products';
  main.innerHTML = `
  <div class="container page">
    <nav class="breadcrumb"><a href="${routes.home()}">Home</a>${icon('chevron-right')}<a href="${routes.products()}">Shop</a>
      ${path.map((c) => `${icon('chevron-right')}<a href="${routes.products({ category: c.id })}">${escapeHtml(c.name)}</a>`).join('')}</nav>
    <div class="listing">
      <aside class="filters" data-filters>
        <div class="row-between filter-toggle" style="padding-top:12px"><h3>Filters</h3><button class="close-btn" data-close-filters>${icon('x')}</button></div>
        <div class="filter-group"><h4>Category</h4><div class="cat-tree"><a href="#" data-cat="" class="${!params.category ? 'active' : ''}">All products</a>${treeHtml(categoryTree())}</div></div>
        <div class="filter-group"><h4>Price (৳)</h4>
          <form class="price-inputs" data-price><input class="input" name="minPrice" type="number" placeholder="Min" value="${params.minPrice || ''}"><span class="muted">–</span><input class="input" name="maxPrice" type="number" placeholder="Max" value="${params.maxPrice || ''}"><button class="btn btn-soft btn-sm btn-icon">${icon('arrow-right')}</button></form>
          <div class="chips mt-1">${[[0, 1000], [1000, 5000], [5000, 20000], [20000, '']].map(([a, b]) => `<button class="chip" style="height:28px;font-size:12px" data-range="${a}-${b}">${b ? `${formatPrice(a)}–${formatPrice(b)}` : `${formatPrice(a)}+`}</button>`).join('')}</div>
        </div>
        <div class="filter-group"><h4>Rating</h4>
          ${[4, 3].map((r) => `<label class="check mb-1"><input type="radio" name="rating" value="${r}" ${params.rating == r ? 'checked' : ''}> ${r}★ & up</label><br>`).join('')}
          <label class="check"><input type="radio" name="rating" value="" ${!params.rating ? 'checked' : ''}> Any</label>
        </div>
        <div class="filter-group"><h4>Availability</h4>
          <label class="check mb-1"><input type="checkbox" data-flag="inStock" ${params.inStock ? 'checked' : ''}> In stock only</label><br>
          <label class="check"><input type="checkbox" data-flag="onSale" ${params.onSale ? 'checked' : ''}> On sale (10%+ off)</label>
        </div>
        <button class="btn btn-outline btn-block mt-1" data-clear>Clear all filters</button>
      </aside>
      <section>
        <div class="listing-bar">
          <div><h1 style="font-size:24px">${title}</h1><span class="small muted" data-count></span></div>
          <div class="row">
            <button class="btn btn-outline btn-sm filter-toggle" data-open-filters>${icon('sliders-horizontal')} Filters</button>
            <select class="select" data-sort>${Object.entries(SORTS).map(([k, v]) => `<option value="${k}" ${params.sort === k ? 'selected' : ''}>${v}</option>`).join('')}</select>
          </div>
        </div>
        <div class="active-filters" data-active></div>
        <div data-results>${loading()}</div>
        <div class="pagination" data-pages></div>
      </section>
    </div>
  </div>`;
  bind();
}

function activeChips() {
  const chips = [];
  if (params.q) chips.push(['q', `"${params.q}"`]);
  if (params.minPrice || params.maxPrice) chips.push(['price', `${params.minPrice ? formatPrice(params.minPrice) : '৳0'} – ${params.maxPrice ? formatPrice(params.maxPrice) : 'any'}`]);
  if (params.rating) chips.push(['rating', `${params.rating}★ & up`]);
  if (params.inStock) chips.push(['inStock', 'In stock']);
  if (params.onSale) chips.push(['onSale', 'On sale']);
  $('[data-active]').innerHTML = chips.map(([k, label]) => `<button class="chip active" data-remove="${k}">${escapeHtml(label)} ${icon('x')}</button>`).join('');
}

async function results() {
  $('[data-results]').innerHTML = loading();
  const res = await getProducts({ ...params, limit: 20 });
  $('[data-count]').textContent = `${res.total} product${res.total === 1 ? '' : 's'}`;
  $('[data-results]').innerHTML = productGrid(res.items);
  const pages = $('[data-pages]');
  if (res.pages <= 1) { pages.innerHTML = ''; return; }
  const btns = [`<button data-page="${res.page - 1}" ${res.page === 1 ? 'disabled' : ''}>‹</button>`];
  for (let i = 1; i <= res.pages; i++) btns.push(`<button data-page="${i}" class="${i === res.page ? 'active' : ''}">${i}</button>`);
  btns.push(`<button data-page="${res.page + 1}" ${res.page === res.pages ? 'disabled' : ''}>›</button>`);
  pages.innerHTML = btns.join('');
}

function update(patch, relayout = false) {
  Object.assign(params, patch);
  if (!('page' in patch)) params.page = 1;
  Object.keys(params).forEach((k) => (params[k] === '' || params[k] === undefined || params[k] === false) && delete params[k]);
  const clean = { ...params };
  if (clean.page === 1) delete clean.page;
  if (clean.sort === 'popular') delete clean.sort;
  history.replaceState(null, '', routes.products(clean));
  params.page ||= 1;
  params.sort ||= 'popular';
  if (relayout) layout(); else activeChips();
  results();
  if ('page' in patch) window.scrollTo({ top: 0, behavior: 'smooth' });
}

function bind() {
  const f = $('[data-filters]');
  f.addEventListener('click', (e) => {
    const cat = e.target.closest('[data-cat]');
    if (cat) {
      e.preventDefault();
      if (cat.dataset.cat) track('view', { categoryId: cat.dataset.cat });
      update({ category: cat.dataset.cat }, true);
    }
    const range = e.target.closest('[data-range]');
    if (range) { const [a, b] = range.dataset.range.split('-'); update({ minPrice: a === '0' ? '' : a, maxPrice: b }, true); }
  });
  $('[data-price]').onsubmit = (e) => { e.preventDefault(); const fd = new FormData(e.target); update({ minPrice: fd.get('minPrice'), maxPrice: fd.get('maxPrice') }); };
  f.querySelectorAll('[name=rating]').forEach((r) => (r.onchange = () => update({ rating: r.value })));
  f.querySelectorAll('[data-flag]').forEach((c) => (c.onchange = () => update({ [c.dataset.flag]: c.checked ? 1 : '' })));
  $('[data-clear]').onclick = () => { Object.keys(params).forEach((k) => delete params[k]); update({}, true); };
  $('[data-sort]').onchange = (e) => update({ sort: e.target.value });
  $('[data-open-filters]').onclick = () => f.classList.add('open');
  $('[data-close-filters]').onclick = () => f.classList.remove('open');
  $('[data-active]').onclick = (e) => {
    const k = e.target.closest('[data-remove]')?.dataset.remove;
    if (!k) return;
    update(k === 'price' ? { minPrice: '', maxPrice: '' } : { [k]: '' }, true);
  };
  $('[data-pages]').onclick = (e) => { const b = e.target.closest('[data-page]'); if (b && !b.disabled) update({ page: +b.dataset.page }); };
  activeChips();
}

if (params.category) track('view', { categoryId: params.category });
layout();
results();
