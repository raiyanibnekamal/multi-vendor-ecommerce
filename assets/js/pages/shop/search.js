import { mountShell } from '../../components/shell.js';
import { productGrid, reelThumb, liveCard, emptyState, loading } from '../../components/cards.js';
import { routes } from '../../core/routes.js';
import { escapeHtml, icon, qs, $, $$ } from '../../core/utils.js';
import { smartSearch } from '../../services/ai.js';

const main = mountShell({ active: 'search' });
const q = (qs('q') || '').trim();
let tab = 'all';
let data = null;

const EXAMPLES = ['phone under 20k', 'gift for her', 'cheap earbuds', 'best perfume', 'kitchen deals', 'mens watch', 'fresh fruits', 'laptop for students'];

main.innerHTML = `
<div class="container page">
  <div class="search-hero">
    <form data-form>
      <div class="input-group">${icon('sparkles')}<input class="input" name="q" value="${escapeHtml(q)}" placeholder='Describe what you want, e.g. "red dress under 3000"' autofocus></div>
      <button class="btn btn-primary btn-lg">${icon('search')} Search</button>
    </form>
    <div data-understood></div>
  </div>
  <div data-body>${q ? loading() : ''}</div>
</div>`;

$('[data-form]').onsubmit = (e) => {
  e.preventDefault();
  const v = e.target.q.value.trim();
  if (v) location.href = routes.search(v);
};

function renderBody() {
  const { products, reels, streams } = data;
  const tabs = [['all', 'All', products.length + reels.length + streams.length], ['products', 'Products', products.length], ['reels', 'Reels', reels.length], ['live', 'Live', streams.length]];
  const total = tabs[0][2];
  let content = '';
  if (!total) {
    content = emptyState('search-x', `No results for "${q}"`, 'Try a broader term or one of the suggestions below.', `<div class="chips" style="justify-content:center">${EXAMPLES.map((e) => `<a class="chip" href="${routes.search(e)}">${e}</a>`).join('')}</div>`);
  } else if (tab === 'all') {
    content = `
      ${streams.length ? `<section class="mb-3"><div class="section-head"><h3>${icon('radio', 'text-danger')} Live & upcoming</h3></div><div class="live-grid">${streams.map(liveCard).join('')}</div></section>` : ''}
      ${reels.length ? `<section class="mb-3"><div class="section-head"><h3>${icon('clapperboard', 'text-primary')} Reels</h3>${reels.length > 6 ? '<button class="see-all" data-goto="reels">See all</button>' : ''}</div><div class="reel-grid">${reels.slice(0, 6).map(reelThumb).join('')}</div></section>` : ''}
      ${products.length ? `<section><div class="section-head"><h3>${icon('package', 'text-primary')} Products</h3></div>${productGrid(products)}</section>` : ''}`;
  } else if (tab === 'products') content = productGrid(products);
  else if (tab === 'reels') content = reels.length ? `<div class="reel-grid">${reels.map(reelThumb).join('')}</div>` : emptyState('clapperboard', 'No reels match');
  else content = streams.length ? `<div class="live-grid">${streams.map(liveCard).join('')}</div>` : emptyState('radio', 'No live streams match');

  $('[data-body]').innerHTML = `
    <div class="tabs mb-3">${tabs.map(([k, label, n]) => `<button class="tab ${tab === k ? 'active' : ''}" data-tab="${k}">${label} <span class="badge">${n}</span></button>`).join('')}</div>
    ${content}`;
  $$('[data-tab]').forEach((b) => (b.onclick = () => { tab = b.dataset.tab; renderBody(); }));
  $$('[data-goto]').forEach((b) => (b.onclick = () => { tab = b.dataset.goto; renderBody(); }));
}

async function run() {
  if (!q) {
    $('[data-understood]').innerHTML = `<div class="ai-understood"><span class="muted">Try:</span>${EXAMPLES.map((e) => `<a class="chip" href="${routes.search(e)}">${e}</a>`).join('')}</div>`;
    return;
  }
  document.title = `${q} · Search · StreamCart`;
  data = await smartSearch(q);
  $('[data-understood]').innerHTML = `
    <div class="ai-understood">
      <span class="badge badge-ai">${icon('sparkles')} AI understood</span>
      ${data.chips.length ? data.chips.map((c) => `<span class="badge badge-primary">${escapeHtml(c)}</span>`).join('') : '<span class="muted">Keyword match</span>'}
    </div>
    ${data.corrections.length ? `<p class="small muted mt-1">Showing results for ${data.corrections.map(([a, b]) => `<b>${escapeHtml(b)}</b> <s>${escapeHtml(a)}</s>`).join(', ')}</p>` : ''}`;
  renderBody();
}

run();
