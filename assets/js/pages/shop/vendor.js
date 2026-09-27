import { mountShell } from '../../components/shell.js';
import { productGrid, reelThumb, liveCard, emptyState, loading } from '../../components/cards.js';
import { ensureLogin } from '../../components/modal.js';
import { routes } from '../../core/routes.js';
import { escapeHtml, icon, qs, $, $$, avatar, formatNumber, formatDate } from '../../core/utils.js';
import { getVendor, vendorSync, isFollowing, toggleFollow, vendorProductCount } from '../../services/vendors.js';
import { getProducts } from '../../services/catalog.js';
import { getReels } from '../../services/reels.js';
import { getStreams } from '../../services/live.js';
import { track } from '../../services/ai.js';

const main = mountShell({ active: 'vendor' });
const id = qs('id');
let tab = 'products';
let sort = 'popular';

async function render() {
  main.innerHTML = loading();
  const v = await getVendor(id);
  if (!v || v.status !== 'approved') {
    main.innerHTML = `<div class="container page">${emptyState('store', 'Store not available', 'This store may be pending approval or suspended.', `<a class="btn btn-primary" href="${routes.home()}">Back to home</a>`)}</div>`;
    return;
  }
  document.title = `${v.name} · StreamCart`;
  track('view', { vendorId: v.id });
  const [reels, streams] = await Promise.all([getReels({ vendorId: v.id }), getStreams({ vendorId: v.id })]);
  const live = streams.find((s) => s.status === 'live');

  main.innerHTML = `
  <div class="container page">
    <div class="store-cover" style="background:linear-gradient(135deg, ${v.color}, #0f172a)"></div>
    <div class="store-head">
      ${avatar(v.name, { size: 'xl', color: v.color })}
      <div class="info">
        <h1 class="row" style="gap:6px">${escapeHtml(v.name)} ${v.verified ? `<span class="verified">${icon('badge-check')}</span>` : ''} ${live ? '<span class="badge badge-live">LIVE</span>' : ''}</h1>
        <p class="muted">${escapeHtml(v.description)}</p>
        <div class="store-stats">
          <span>${icon('star')} <b>${v.rating}</b> rating</span>
          <span><b data-followers>${formatNumber(v.followers)}</b> followers</span>
          <span><b>${vendorProductCount(v.id)}</b> products</span>
          <span>${icon('map-pin')} ${escapeHtml(v.location)}</span>
          <span>Joined ${formatDate(v.joinedAt, { month: 'short', year: 'numeric' })}</span>
        </div>
      </div>
      <div class="row">
        <button class="btn ${isFollowing(v.id) ? 'btn-soft' : 'btn-primary'}" data-follow>${isFollowing(v.id) ? `${icon('check')} Following` : `${icon('plus')} Follow`}</button>
        <button class="btn btn-outline" data-share>${icon('share-2')}</button>
      </div>
    </div>

    ${live ? `<a class="notice mt-3" href="${routes.watch(live.id)}" style="align-items:center">${icon('radio')}<div class="grow"><b>${escapeHtml(v.name)} is live now:</b> ${escapeHtml(live.title)}</div><span class="btn btn-live btn-sm">Join live</span></a>` : ''}

    <div class="tabs mt-3">
      <button class="tab" data-tab="products">${icon('package')} Products</button>
      <button class="tab" data-tab="reels">${icon('clapperboard')} Reels <span class="badge">${reels.length}</span></button>
      <button class="tab" data-tab="live">${icon('radio')} Live <span class="badge">${streams.length}</span></button>
    </div>
    <div class="mt-3" data-body></div>
  </div>`;

  $('[data-follow]').onclick = async (e) => {
    const btn = e.currentTarget;
    if (!(await ensureLogin('Sign in to follow stores'))) return;
    const now = toggleFollow(v.id);
    btn.className = `btn ${now ? 'btn-soft' : 'btn-primary'}`;
    btn.innerHTML = now ? `${icon('check')} Following` : `${icon('plus')} Follow`;
    $('[data-followers]').textContent = formatNumber(vendorSync(v.id).followers);
  };
  $('[data-share]').onclick = () => navigator.clipboard?.writeText(location.href);
  $$('[data-tab]').forEach((b) => (b.onclick = () => { tab = b.dataset.tab; body(v, reels, streams); }));
  body(v, reels, streams);
}

async function body(v, reels, streams) {
  $$('[data-tab]').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
  const el = $('[data-body]');
  if (tab === 'products') {
    el.innerHTML = loading();
    const res = await getProducts({ vendorId: v.id, sort, limit: 100 });
    el.innerHTML = `
      <div class="row-between mb-2"><span class="muted small">${res.total} products</span>
        <select class="select" style="width:auto;height:38px" data-sort>
          ${[['popular', 'Most popular'], ['newest', 'Newest'], ['price-asc', 'Price: low to high'], ['price-desc', 'Price: high to low']].map(([k, l]) => `<option value="${k}" ${k === sort ? 'selected' : ''}>${l}</option>`).join('')}
        </select></div>
      ${productGrid(res.items, 'This store has no products yet')}`;
    $('[data-sort]').onchange = (e) => { sort = e.target.value; body(v, reels, streams); };
  } else if (tab === 'reels') {
    el.innerHTML = reels.length ? `<div class="reel-grid">${reels.map(reelThumb).join('')}</div>` : emptyState('clapperboard', 'No reels yet');
  } else {
    el.innerHTML = streams.length ? `<div class="live-grid">${streams.map(liveCard).join('')}</div>` : emptyState('radio', 'No live streams yet');
  }
}

render();
