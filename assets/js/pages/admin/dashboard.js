import { mountDashboard } from '../../components/dashboardLayout.js';
import { lineChart, doughnutChart } from '../../components/charts.js';
import { toast } from '../../components/toast.js';
import { loading } from '../../components/cards.js';
import { routes } from '../../core/routes.js';
import { escapeHtml, icon, avatar, formatPrice, formatNumber, timeAgo, statusBadge, $ } from '../../core/utils.js';
import { platformStats } from '../../services/analytics.js';
import { channel } from '../../services/realtime.js';
import { db } from '../../services/db.js';

const el = mountDashboard({ role: 'admin', active: 'dashboard', title: 'Platform overview' });
const delta = (n) => `<span class="delta ${n >= 0 ? 'up' : 'down'}">${icon(n >= 0 ? 'trending-up' : 'trending-down')} ${Math.abs(n)}% vs last 30d</span>`;

function orderRow(o, isNew = false) {
  const vendor = db.get('vendors', o.items[0]?.vendorId);
  return `<div class="feed-item ${isNew ? 'new' : ''}">
    <img src="${o.items[0].thumbnail}" style="width:40px;height:40px;border-radius:8px;background:var(--surface-2);object-fit:contain">
    <div class="grow" style="min-width:0"><div class="small bold truncate">${o.id} · ${escapeHtml(o.customerName)}</div><div class="xs muted truncate">${escapeHtml(vendor?.name || '')} · ${timeAgo(o.createdAt)}${o.source !== 'store' ? ` · via ${o.source}` : ''}</div></div>
    <div style="text-align:right"><div class="small bold">${formatPrice(o.total)}</div>${statusBadge(o.status)}</div>
  </div>`;
}

async function render() {
  el.innerHTML = loading();
  const s = await platformStats();
  const recent = db.all('orders').slice(0, 6);
  const live = db.where('streams', (x) => x.status === 'live');
  const tasks = [
    [s.vendorsPending, 'vendor applications', 'store', routes.adminDash('vendors', { status: 'pending' })],
    [s.reelsPending, 'reels to moderate', 'shield-alert', routes.adminDash('moderation')],
    [s.openDisputes, 'open disputes', 'gavel', routes.adminDash('disputes')],
    [s.payoutsRequested, 'payout requests', 'wallet', routes.adminDash('payouts')],
  ];

  el.innerHTML = `
    <div class="dash-head"><div><h2>Platform overview</h2><p>Marketplace health across all vendors, reels and live streams.</p></div>
      <a class="btn btn-outline" href="${routes.adminDash('analytics')}">${icon('chart-line')} Full analytics</a></div>
    <div class="stats">
      <div class="stat"><span class="ic">${icon('banknote')}</span><div><div class="lbl">Gross merchandise value</div><div class="val">${formatPrice(s.gmv)}</div>${delta(s.gmvDelta)}</div></div>
      <div class="stat"><span class="ic green">${icon('badge-percent')}</span><div><div class="lbl">Commission earned</div><div class="val">${formatPrice(s.commission)}</div><span class="xs muted">10% avg. rate</span></div></div>
      <div class="stat"><span class="ic amber">${icon('shopping-bag')}</span><div><div class="lbl">Orders</div><div class="val" data-order-count>${formatNumber(s.orderCount)}</div>${delta(s.orderDelta)}</div></div>
      <div class="stat"><span class="ic violet">${icon('users')}</span><div><div class="lbl">Customers · Vendors</div><div class="val">${s.customers} · ${s.vendorsApproved}</div><span class="xs muted">${s.liveNow} live now</span></div></div>
    </div>

    <div class="card card-pad mt-2">
      <div class="row wrap" style="gap:12px">
        <b class="row">${icon('list-checks')} Needs attention</b>
        ${tasks.map(([n, label, ic, href]) => `<a class="chip ${n ? 'active' : ''}" href="${href}">${icon(ic)} <b>${n}</b> ${label}</a>`).join('')}
      </div>
    </div>

    <div class="dash-grid">
      <div class="card"><div class="card-head"><h3>GMV (last 30 days)</h3></div><div class="card-body"><div class="chart-box"><canvas data-gmv></canvas></div></div></div>
      <div class="card"><div class="card-head"><h3>Sales by channel</h3></div><div class="card-body"><div class="chart-box sm"><canvas data-src></canvas></div>
        <p class="xs muted center mt-1">${Math.round(((s.bySource.reel + s.bySource.live) / (s.gmv || 1)) * 100)}% of GMV is driven by shoppable video</p></div></div>
    </div>

    <div class="dash-grid">
      <div class="card"><div class="card-head"><h3 class="row">Live order stream <span class="badge badge-success">${icon('radio')} Realtime</span></h3><a class="small text-primary" href="${routes.adminDash('orders')}">All orders</a></div>
        <div data-feed>${recent.map((o) => orderRow(o)).join('')}</div></div>
      <div class="stack" style="gap:16px">
        <div class="card"><div class="card-head"><h3>Top vendors</h3><a class="small text-primary" href="${routes.adminDash('vendors')}">All</a></div>
          ${s.topVendors.map((t, i) => `<a class="feed-item" href="${routes.adminDash('vendor-detail', { id: t.vendor.id })}"><b class="muted small">#${i + 1}</b>${avatar(t.vendor.name, { size: 'sm', color: t.vendor.color })}<span class="small grow truncate">${escapeHtml(t.vendor.name)}</span><b class="small">${formatPrice(t.amount)}</b></a>`).join('')}</div>
        <div class="card"><div class="card-head"><h3 class="row">${icon('radio', 'text-danger')} Live now</h3><a class="small text-primary" href="${routes.live()}" target="_blank">Watch</a></div>
          ${live.map((x) => `<a class="feed-item" href="${routes.watch(x.id)}" target="_blank"><img src="${x.thumbnail}" style="width:44px;height:44px;border-radius:8px;object-fit:cover"><div class="grow" style="min-width:0"><div class="small bold truncate">${escapeHtml(x.title)}</div><div class="xs muted">${escapeHtml(db.get('vendors', x.vendorId)?.name || '')}</div></div><span class="badge badge-live">${formatNumber(x.viewers)}</span></a>`).join('') || '<p class="small muted card-body">No streams are live right now.</p>'}</div>
      </div>
    </div>`;

  lineChart($('[data-gmv]'), { labels: s.series.labels, datasets: [{ label: 'GMV', data: s.series.values }] });
  doughnutChart($('[data-src]'), { labels: ['Store', 'Reels', 'Live'], data: [s.bySource.store, s.bySource.reel, s.bySource.live] });
}

if (el) {
  render();
  channel('orders').on('order:new', (o) => {
    $('[data-feed]')?.insertAdjacentHTML('afterbegin', orderRow(o, true));
    const c = $('[data-order-count]');
    if (c) c.textContent = formatNumber(+c.textContent.replace(/,/g, '') + 1);
    toast(`New order ${o.id} · ${formatPrice(o.total)}`, 'success');
  });
}
