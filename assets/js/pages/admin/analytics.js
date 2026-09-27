import { mountDashboard } from '../../components/dashboardLayout.js';
import { lineChart, barChart, doughnutChart } from '../../components/charts.js';
import { loading } from '../../components/cards.js';
import { escapeHtml, icon, avatar, formatPrice, formatNumber, $, $$ } from '../../core/utils.js';
import { platformStats, dailySeries } from '../../services/analytics.js';
import { db } from '../../services/db.js';

const el = mountDashboard({ role: 'admin', active: 'analytics', title: 'Analytics' });
let days = 30;
let charts = [];

async function render() {
  charts.forEach((c) => c?.destroy());
  charts = [];
  el.innerHTML = loading();
  const s = await platformStats();
  const orders = db.all('orders');
  const gmv = dailySeries(orders, days);
  const cnt = dailySeries(orders, days, () => 1);
  const commission = dailySeries(orders, days, (o) => o.subtotal * 0.1);
  const reels = db.all('reels');
  const streams = db.all('streams');
  const cats = Object.entries(s.byCategory).sort((a, b) => b[1] - a[1]);
  const topReels = [...reels].sort((a, b) => b.views - a.views).slice(0, 5);
  const periodGmv = gmv.values.reduce((a, b) => a + b, 0);
  const periodOrders = cnt.values.reduce((a, b) => a + b, 0);

  el.innerHTML = `
    <div class="dash-head"><div><h2>Marketplace analytics</h2><p>Revenue, channels, categories and content performance.</p></div>
      <div class="seg">${[7, 30, 60].map((d) => `<button class="${days === d ? 'active' : ''}" data-days="${d}">${d} days</button>`).join('')}</div></div>
    <div class="stats">
      <div class="stat"><span class="ic">${icon('banknote')}</span><div><div class="lbl">GMV (${days}d)</div><div class="val">${formatPrice(periodGmv)}</div></div></div>
      <div class="stat"><span class="ic green">${icon('badge-percent')}</span><div><div class="lbl">Commission (${days}d)</div><div class="val">${formatPrice(commission.values.reduce((a, b) => a + b, 0))}</div></div></div>
      <div class="stat"><span class="ic amber">${icon('shopping-bag')}</span><div><div class="lbl">Orders (${days}d)</div><div class="val">${periodOrders}</div><span class="xs muted">AOV ${formatPrice(periodOrders ? periodGmv / periodOrders : 0)}</span></div></div>
      <div class="stat"><span class="ic violet">${icon('clapperboard')}</span><div><div class="lbl">Video views</div><div class="val">${formatNumber(reels.reduce((n, r) => n + r.views, 0))}</div><span class="xs muted">${reels.length} reels · ${streams.length} streams</span></div></div>
    </div>
    <div class="dash-grid">
      <div class="card"><div class="card-head"><h3>GMV vs commission</h3></div><div class="card-body"><div class="chart-box"><canvas data-gmv></canvas></div></div></div>
      <div class="card"><div class="card-head"><h3>Channel mix</h3></div><div class="card-body"><div class="chart-box sm"><canvas data-src></canvas></div></div></div>
    </div>
    <div class="dash-grid-2">
      <div class="card"><div class="card-head"><h3>Sales by department</h3></div><div class="card-body"><div class="chart-box sm"><canvas data-cat></canvas></div></div></div>
      <div class="card"><div class="card-head"><h3>Orders per day</h3></div><div class="card-body"><div class="chart-box sm"><canvas data-cnt></canvas></div></div></div>
    </div>
    <div class="dash-grid-2">
      <div class="card"><div class="card-head"><h3>Top vendors</h3></div>
        <table class="table"><thead><tr><th>Vendor</th><th style="text-align:right">Sales</th><th style="text-align:right">Share</th></tr></thead><tbody>
        ${s.topVendors.map((t) => `<tr><td><div class="cell-product">${avatar(t.vendor.name, { size: 'sm', color: t.vendor.color })}<span class="small">${escapeHtml(t.vendor.name)}</span></div></td><td style="text-align:right"><b>${formatPrice(t.amount)}</b></td><td style="text-align:right" class="small">${((t.amount / (s.gmv || 1)) * 100).toFixed(1)}%</td></tr>`).join('')}
        </tbody></table></div>
      <div class="card"><div class="card-head"><h3>Top reels</h3></div>
        <table class="table"><thead><tr><th>Reel</th><th>Views</th><th>Engagement</th></tr></thead><tbody>
        ${topReels.map((r) => `<tr><td><div class="cell-product"><img src="${r.poster}" style="width:32px;height:46px;object-fit:cover"><div style="min-width:0"><div class="xs clamp-2">${escapeHtml(r.caption)}</div><div class="xs muted">${escapeHtml(db.get('vendors', r.vendorId)?.name || '')}</div></div></div></td><td>${formatNumber(r.views)}</td><td>${(((r.likes + r.comments + r.shares) / (r.views || 1)) * 100).toFixed(1)}%</td></tr>`).join('')}
        </tbody></table></div>
    </div>`;

  charts.push(lineChart($('[data-gmv]'), { labels: gmv.labels, datasets: [{ label: 'GMV', data: gmv.values }, { label: 'Commission', data: commission.values }] }));
  charts.push(doughnutChart($('[data-src]'), { labels: ['Store', 'Reels', 'Live'], data: [s.bySource.store, s.bySource.reel, s.bySource.live] }));
  charts.push(barChart($('[data-cat]'), { labels: cats.map((c) => c[0]), data: cats.map((c) => c[1]), label: 'Sales', horizontal: true }));
  charts.push(barChart($('[data-cnt]'), { labels: cnt.labels, data: cnt.values, label: 'Orders', money: false }));
  $$('[data-days]').forEach((b) => (b.onclick = () => { days = +b.dataset.days; render(); }));
}

if (el) render();
