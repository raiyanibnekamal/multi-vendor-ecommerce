import { mountDashboard } from '../../components/dashboardLayout.js';
import { lineChart, doughnutChart } from '../../components/charts.js';
import { toast } from '../../components/toast.js';
import { loading } from '../../components/cards.js';
import { routes } from '../../core/routes.js';
import { escapeHtml, icon, formatPrice, formatNumber, timeAgo, statusBadge, $ } from '../../core/utils.js';
import { vendorStats } from '../../services/analytics.js';
import { vendorOrdersSync } from '../../services/orders.js';
import { channel } from '../../services/realtime.js';
import { db } from '../../services/db.js';

const el = mountDashboard({ role: 'vendor', active: 'dashboard', title: 'Overview' });

const delta = (n) => `<span class="delta ${n >= 0 ? 'up' : 'down'}">${icon(n >= 0 ? 'trending-up' : 'trending-down')} ${Math.abs(n)}% vs last 30d</span>`;

function orderRow(o, isNew = false) {
  return `<a class="feed-item ${isNew ? 'new' : ''}" href="${routes.vendorDash('order-detail', { id: o.id })}">
    <img src="${o.items[0].thumbnail}" style="width:44px;height:44px;border-radius:8px;background:var(--surface-2);object-fit:contain">
    <div class="grow" style="min-width:0"><div class="small bold truncate">${o.id} · ${escapeHtml(o.customerName)}</div><div class="xs muted">${o.items.length} item(s) · ${timeAgo(o.createdAt)}${o.source !== 'store' ? ` · via ${o.source}` : ''}</div></div>
    <div style="text-align:right"><div class="small bold">${formatPrice(o.vendorTotal)}</div>${statusBadge(o.status)}</div>
  </a>`;
}

async function render() {
  const v = el?.vendor || null;
  if (!v || !v.id) {
    el.innerHTML = '<div class="card"><div class="card-body center"><h3>Store access unavailable</h3><p class="muted">Your vendor profile could not be resolved. Please sign in again or reopen the dashboard.</p></div></div>';
    return;
  }

  el.innerHTML = loading();
  const s = await vendorStats(v.id);
  const recent = vendorOrdersSync(v.id).slice(0, 6);
  const live = db.where('streams', (x) => x.vendorId === v.id && x.status === 'live')[0];

  el.innerHTML = `
    <div class="dash-head">
      <div><h2>Welcome back, ${escapeHtml(el.user.name.split(' ')[0])} 👋</h2><p>Here's what's happening with ${escapeHtml(v.name)} today.</p></div>
      <div class="row wrap">
        <a class="btn btn-outline" href="${routes.vendorDash('product-form')}">${icon('plus')} Add product</a>
        <a class="btn btn-outline" href="${routes.vendorDash('reel-upload')}">${icon('clapperboard')} Post reel</a>
        <a class="btn btn-live" href="${routes.vendorDash('go-live')}">${icon('radio')} ${live ? 'Return to live' : 'Go live'}</a>
      </div>
    </div>

    <div class="stats">
      <div class="stat"><span class="ic">${icon('wallet')}</span><div><div class="lbl">Revenue</div><div class="val">${formatPrice(s.revenue)}</div>${delta(s.revenueDelta)}</div></div>
      <div class="stat"><span class="ic green">${icon('shopping-bag')}</span><div><div class="lbl">Orders</div><div class="val" data-order-count>${s.orderCount}</div>${delta(s.orderDelta)}</div></div>
      <div class="stat"><span class="ic amber">${icon('clock')}</span><div><div class="lbl">Pending orders</div><div class="val">${s.pending}</div><a class="xs text-primary" href="${routes.vendorDash('orders', { status: 'pending' })}">Process now →</a></div></div>
      <div class="stat"><span class="ic violet">${icon('eye')}</span><div><div class="lbl">Reel views</div><div class="val">${formatNumber(s.reelViews)}</div><span class="xs muted">${s.reelCount} reels · ${formatNumber(s.followers)} followers</span></div></div>
    </div>

    <div class="dash-grid">
      <div class="card"><div class="card-head"><h3>Sales (last 30 days)</h3><span class="small muted">Avg order ${formatPrice(s.avgOrder)}</span></div><div class="card-body"><div class="chart-box"><canvas data-sales></canvas></div></div></div>
      <div class="card"><div class="card-head"><h3>Revenue by channel</h3></div><div class="card-body"><div class="chart-box sm"><canvas data-source></canvas></div>
        <p class="xs muted center mt-1">${Math.round(((s.bySource.reel + s.bySource.live) / (s.revenue || 1)) * 100)}% of revenue came from reels & live</p></div></div>
    </div>

    <div class="dash-grid">
      <div class="card">
        <div class="card-head"><h3 class="row">Live order feed <span class="badge badge-success">${icon('radio')} Realtime</span></h3><a class="small text-primary" href="${routes.vendorDash('orders')}">All orders</a></div>
        <div data-feed>${recent.map((o) => orderRow(o)).join('') || '<p class="muted center card-body">No orders yet</p>'}</div>
      </div>
      <div class="stack" style="gap:16px">
        <div class="card">
          <div class="card-head"><h3>${icon('triangle-alert', 'text-warning')} Low stock</h3><a class="small text-primary" href="${routes.vendorDash('inventory')}">Inventory</a></div>
          ${s.lowStock.slice(0, 5).map((p) => `<div class="feed-item"><img src="${p.thumbnail}" style="width:36px;height:36px;border-radius:6px;background:var(--surface-2);object-fit:contain"><span class="small grow truncate">${escapeHtml(p.title)}</span><span class="badge ${p.stock === 0 ? 'badge-danger' : 'badge-warning'}">${p.stock} left</span></div>`).join('') || '<p class="small muted card-body">All products are well stocked 🎉</p>'}
        </div>
        <div class="card">
          <div class="card-head"><h3>Top products</h3></div>
          ${s.topProducts.map((t, i) => `<div class="feed-item"><b class="muted small">#${i + 1}</b><img src="${t.product.thumbnail}" style="width:36px;height:36px;border-radius:6px;background:var(--surface-2);object-fit:contain"><span class="small grow truncate">${escapeHtml(t.product.title)}</span><b class="small">${formatPrice(t.amount)}</b></div>`).join('') || '<p class="small muted card-body">No sales yet</p>'}
        </div>
      </div>
    </div>`;

  lineChart($('[data-sales]'), { labels: s.series.labels, datasets: [{ label: 'Revenue', data: s.series.values }] });
  doughnutChart($('[data-source]'), { labels: ['Store', 'Reels', 'Live'], data: [s.bySource.store, s.bySource.reel, s.bySource.live] });
}

if (el) {
  render();
  channel('orders').on('order:new', (o) => {
    const mine = o.items.filter((it) => it.vendorId === el.vendor.id);
    if (!mine.length) return;
    const row = { ...o, items: mine, vendorTotal: mine.reduce((s, it) => s + it.price * it.qty, 0) };
    $('[data-feed]')?.insertAdjacentHTML('afterbegin', orderRow(row, true));
    const c = $('[data-order-count]');
    if (c) c.textContent = +c.textContent + 1;
    toast(`New order ${o.id} · ${formatPrice(row.vendorTotal)}`, 'success', { action: 'View', href: routes.vendorDash('order-detail', { id: o.id }) });
  });
}
