// Aggregations for dashboards. In Supabase these would be Postgres views / RPC functions.
import { db, respond } from './db.js';
import { vendorOrdersSync } from './orders.js';
import { rootOf } from './catalog.js';

const DAY = 86400000;
const counted = (o) => o.status !== 'cancelled';

export function dailySeries(orders, days = 30, value = (o) => o.total) {
  const labels = [], values = [];
  const start = new Date(); start.setHours(0, 0, 0, 0);
  for (let i = days - 1; i >= 0; i--) {
    const d0 = start.getTime() - i * DAY, d1 = d0 + DAY;
    labels.push(new Date(d0).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }));
    values.push(orders.filter((o) => { const t = new Date(o.createdAt).getTime(); return t >= d0 && t < d1 && counted(o); }).reduce((s, o) => s + value(o), 0));
  }
  return { labels, values };
}

function periodDelta(orders, value, days = 30) {
  const now = Date.now();
  const sum = (from, to) => orders.filter((o) => { const t = new Date(o.createdAt).getTime(); return t >= from && t < to && counted(o); }).reduce((s, o) => s + value(o), 0);
  const cur = sum(now - days * DAY, now), prev = sum(now - 2 * days * DAY, now - days * DAY);
  return prev ? Math.round(((cur - prev) / prev) * 100) : 100;
}

export async function vendorStats(vendorId) {
  const orders = vendorOrdersSync(vendorId);
  const valid = orders.filter(counted);
  const products = db.where('products', (p) => p.vendorId === vendorId);
  const reels = db.where('reels', (r) => r.vendorId === vendorId);
  const revenue = valid.reduce((s, o) => s + o.vendorTotal, 0);
  const bySource = { store: 0, reel: 0, live: 0 };
  valid.forEach((o) => (bySource[o.source] += o.vendorTotal));
  const productSales = {};
  valid.forEach((o) => o.items.forEach((it) => (productSales[it.productId] = (productSales[it.productId] || 0) + it.qty * it.price)));
  const topProducts = Object.entries(productSales).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([id, amount]) => ({ product: db.get('products', id), amount })).filter((x) => x.product);
  const byStatus = {};
  orders.forEach((o) => (byStatus[o.status] = (byStatus[o.status] || 0) + 1));
  return respond({
    revenue,
    revenueDelta: periodDelta(orders, (o) => o.vendorTotal),
    orderCount: orders.length,
    orderDelta: periodDelta(orders, () => 1),
    avgOrder: valid.length ? revenue / valid.length : 0,
    productCount: products.length,
    lowStock: products.filter((p) => p.stock <= 10).sort((a, b) => a.stock - b.stock),
    reelViews: reels.reduce((s, r) => s + r.views, 0),
    reelCount: reels.length,
    followers: db.get('vendors', vendorId)?.followers || 0,
    series: dailySeries(orders, 30, (o) => o.vendorTotal),
    bySource,
    byStatus,
    topProducts,
    pending: orders.filter((o) => o.status === 'pending').length,
  });
}

export async function platformStats() {
  const orders = db.all('orders');
  const valid = orders.filter(counted);
  const gmv = valid.reduce((s, o) => s + o.total, 0);
  const vendors = db.all('vendors');
  const users = db.all('users');
  const byCategory = {};
  valid.forEach((o) => o.items.forEach((it) => {
    const p = db.get('products', it.productId);
    const root = p ? rootOf(p.categoryId)?.name : 'Other';
    byCategory[root] = (byCategory[root] || 0) + it.price * it.qty;
  }));
  const vendorSales = {};
  valid.forEach((o) => o.items.forEach((it) => (vendorSales[it.vendorId] = (vendorSales[it.vendorId] || 0) + it.price * it.qty)));
  const topVendors = Object.entries(vendorSales).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([id, amount]) => ({ vendor: db.get('vendors', id), amount })).filter((x) => x.vendor);
  const bySource = { store: 0, reel: 0, live: 0 };
  valid.forEach((o) => (bySource[o.source] += o.total));
  return respond({
    gmv,
    gmvDelta: periodDelta(orders, (o) => o.total),
    commission: gmv * 0.1,
    orderCount: orders.length,
    orderDelta: periodDelta(orders, () => 1),
    customers: users.filter((u) => u.role === 'customer').length,
    vendorsApproved: vendors.filter((v) => v.status === 'approved').length,
    vendorsPending: vendors.filter((v) => v.status === 'pending').length,
    reelsPending: db.where('reels', (r) => r.status === 'pending' || r.status === 'flagged').length,
    liveNow: db.where('streams', (s) => s.status === 'live').length,
    openDisputes: db.where('disputes', (d) => d.status === 'open' || d.status === 'in_review').length,
    payoutsRequested: db.where('payouts', (p) => p.status === 'requested').length,
    series: dailySeries(orders, 30),
    orderSeries: dailySeries(orders, 30, () => 1),
    byCategory,
    bySource,
    topVendors,
  });
}
