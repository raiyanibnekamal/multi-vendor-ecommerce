import { mountDashboard } from '../../components/dashboardLayout.js';
import { lineChart, barChart, doughnutChart } from '../../components/charts.js';
import { loading } from '../../components/cards.js';
import { escapeHtml, icon, formatPrice, formatNumber, $, $$ } from '../../core/utils.js';
import { vendorStats, dailySeries } from '../../services/analytics.js';
import { vendorOrdersSync } from '../../services/orders.js';
import { db } from '../../services/db.js';

const el = mountDashboard({ role: 'vendor', active: 'analytics', title: 'Analytics' });
let days = 30;
let charts = [];

async function render() {
  charts.forEach((c) => c?.destroy());
  charts = [];
  el.innerHTML = loading();
  const s = await vendorStats(el.vendor.id);
  const orders = vendorOrdersSync(el.vendor.id);
  const rev = dailySeries(orders, days, (o) => o.vendorTotal);
  const cnt = dailySeries(orders, days, () => 1);
  const reels = db.where('reels', (r) => r.vendorId === el.vendor.id).sort((a, b) => b.views - a.views);
  const reelOrders = orders.filter((o) => o.source === 'reel' && o.status !== 'cancelled');
  const totalViews = reels.reduce((n, r) => n + r.views, 0);
  const funnel = [
    ['Reel & live views', totalViews + db.where('streams', (x) => x.vendorId === el.vendor.id).reduce((n, x) => n + (x.peakViewers || x.viewers || 0), 0) * 20],
    ['Product views', Math.round(totalViews * 0.18)],
    ['Added to cart', Math.round(totalViews * 0.03)],
    ['Orders', orders.filter((o) => o.status !== 'cancelled').length],
  ];

  el.innerHTML = `
    <div class="dash-head"><div><h2>Analytics</h2><p>Understand what sells and where your buyers come from.</p></div>
      <div class="seg">${[7, 30, 60].map((d) => `<button class="${days === d ? 'active' : ''}" data-days="${d}">${d} days</button>`).join('')}</div></div>
    <div class="stats">
      <div class="stat"><span class="ic">${icon('wallet')}</span><div><div class="lbl">Revenue (${days}d)</div><div class="val">${formatPrice(rev.values.reduce((a, b) => a + b, 0))}</div></div></div>
      <div class="stat"><span class="ic green">${icon('shopping-bag')}</span><div><div class="lbl">Orders (${days}d)</div><div class="val">${cnt.values.reduce((a, b) => a + b, 0)}</div></div></div>
      <div class="stat"><span class="ic violet">${icon('percent')}</span><div><div class="lbl">Reel conversion</div><div class="val">${totalViews ? ((reelOrders.length / totalViews) * 100).toFixed(3) : 0}%</div></div></div>
      <div class="stat"><span class="ic amber">${icon('receipt')}</span><div><div class="lbl">Avg order value</div><div class="val">${formatPrice(s.avgOrder)}</div></div></div>
    </div>
    <div class="dash-grid">
      <div class="card"><div class="card-head"><h3>Revenue trend</h3></div><div class="card-body"><div class="chart-box"><canvas data-rev></canvas></div></div></div>
      <div class="card"><div class="card-head"><h3>Sales by channel</h3></div><div class="card-body"><div class="chart-box sm"><canvas data-src></canvas></div></div></div>
    </div>
    <div class="dash-grid-2">
      <div class="card"><div class="card-head"><h3>Orders per day</h3></div><div class="card-body"><div class="chart-box sm"><canvas data-cnt></canvas></div></div></div>
      <div class="card"><div class="card-head"><h3>Conversion funnel</h3></div><div class="card-body stack">
        ${funnel.map(([label, n], i) => `<div><div class="row-between small"><span>${label}</span><b>${formatNumber(n)}</b></div><div class="progress mt-1"><span style="width:${Math.max(3, (n / (funnel[0][1] || 1)) * 100)}%;opacity:${1 - i * 0.18}"></span></div></div>`).join('')}
      </div></div>
    </div>
    <div class="dash-grid-2">
      <div class="card"><div class="card-head"><h3>Top products</h3></div>
        <table class="table"><thead><tr><th>Product</th><th style="text-align:right">Revenue</th></tr></thead><tbody>
        ${s.topProducts.map((t) => `<tr><td><div class="cell-product"><img src="${t.product.thumbnail}"><span class="small truncate" style="max-width:240px">${escapeHtml(t.product.title)}</span></div></td><td style="text-align:right"><b>${formatPrice(t.amount)}</b></td></tr>`).join('')}
        </tbody></table></div>
      <div class="card"><div class="card-head"><h3>Reel performance</h3></div>
        <table class="table"><thead><tr><th>Reel</th><th>Views</th><th>Likes</th><th>Eng.</th></tr></thead><tbody>
        ${reels.slice(0, 6).map((r) => `<tr><td><div class="cell-product" style="min-width:180px"><img src="${r.poster}" style="width:32px;height:46px;object-fit:cover"><span class="xs clamp-2">${escapeHtml(r.caption)}</span></div></td><td>${formatNumber(r.views)}</td><td>${formatNumber(r.likes)}</td><td>${r.views ? (((r.likes + r.comments + r.shares) / r.views) * 100).toFixed(1) : 0}%</td></tr>`).join('')}
        </tbody></table></div>
    </div>`;

  charts.push(lineChart($('[data-rev]'), { labels: rev.labels, datasets: [{ label: 'Revenue', data: rev.values }] }));
  charts.push(barChart($('[data-cnt]'), { labels: cnt.labels, data: cnt.values, label: 'Orders', money: false }));
  charts.push(doughnutChart($('[data-src]'), { labels: ['Store', 'Reels', 'Live'], data: [s.bySource.store, s.bySource.reel, s.bySource.live] }));
  $$('[data-days]').forEach((b) => (b.onclick = () => { days = +b.dataset.days; render(); }));
}

if (el) render();
