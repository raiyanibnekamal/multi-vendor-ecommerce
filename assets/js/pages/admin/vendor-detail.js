import { mountDashboard } from '../../components/dashboardLayout.js';
import { lineChart } from '../../components/charts.js';
import { confirmDialog } from '../../components/modal.js';
import { toast } from '../../components/toast.js';
import { loading } from '../../components/cards.js';
import { routes } from '../../core/routes.js';
import { escapeHtml, icon, avatar, qs, formatPrice, formatNumber, formatDate, statusBadge, $, $$ } from '../../core/utils.js';
import { vendorStats } from '../../services/analytics.js';
import { updateVendor } from '../../services/vendors.js';
import { vendorOrdersSync } from '../../services/orders.js';
import { db } from '../../services/db.js';

const el = mountDashboard({ role: 'admin', active: 'vendors', title: 'Vendor details' });
const id = qs('id');

async function render() {
  const v = db.get('vendors', id);
  if (!v) { el.innerHTML = `<p class="muted">Vendor not found.</p><a class="btn btn-outline mt-2" href="${routes.adminDash('vendors')}">Back</a>`; return; }
  el.innerHTML = loading();
  const s = await vendorStats(v.id);
  const products = db.where('products', (p) => p.vendorId === v.id);
  const reels = db.where('reels', (r) => r.vendorId === v.id);
  const orders = vendorOrdersSync(v.id).slice(0, 8);
  const disputes = db.where('disputes', (d) => d.vendorId === v.id);

  el.innerHTML = `
    <a class="small muted row mb-2" href="${routes.adminDash('vendors')}">${icon('arrow-left')} All vendors</a>
    <div class="card card-pad">
      <div class="row wrap" style="gap:16px">
        ${avatar(v.name, { size: 'lg', color: v.color })}
        <div class="grow"><h2 class="row">${escapeHtml(v.name)} ${v.verified ? icon('badge-check', 'text-primary') : ''} ${statusBadge(v.status)}</h2>
          <div class="small muted">${escapeHtml(v.ownerName)} · ${escapeHtml(v.email)} · ${escapeHtml(v.phone)} · ${escapeHtml(v.location)} · joined ${formatDate(v.joinedAt)}</div>
          <p class="small mt-1">${escapeHtml(v.description)}</p></div>
        <div class="row wrap">
          <a class="btn btn-outline btn-sm" href="${routes.vendor(v.id)}" target="_blank">${icon('external-link')} Storefront</a>
          ${v.status === 'pending' ? `<button class="btn btn-success btn-sm" data-status="approved">${icon('check')} Approve</button><button class="btn btn-outline btn-sm" data-status="rejected">Reject</button>` : ''}
          ${v.status === 'approved' ? `<button class="btn btn-danger btn-sm" data-status="suspended">${icon('ban')} Suspend</button>` : ''}
          ${v.status === 'suspended' || v.status === 'rejected' ? `<button class="btn btn-primary btn-sm" data-status="approved">Reinstate</button>` : ''}
        </div>
      </div>
    </div>
    <div class="stats mt-2">
      <div class="stat"><span class="ic">${icon('wallet')}</span><div><div class="lbl">Lifetime sales</div><div class="val">${formatPrice(s.revenue)}</div></div></div>
      <div class="stat"><span class="ic green">${icon('shopping-bag')}</span><div><div class="lbl">Orders</div><div class="val">${s.orderCount}</div></div></div>
      <div class="stat"><span class="ic violet">${icon('eye')}</span><div><div class="lbl">Reel views</div><div class="val">${formatNumber(s.reelViews)}</div></div></div>
      <div class="stat"><span class="ic amber">${icon('star')}</span><div><div class="lbl">Rating · Followers</div><div class="val">${v.rating} · ${formatNumber(v.followers)}</div></div></div>
    </div>
    <div class="dash-grid">
      <div class="card"><div class="card-head"><h3>Sales (last 30 days)</h3></div><div class="card-body"><div class="chart-box"><canvas data-sales></canvas></div></div></div>
      <form class="card" data-comm><div class="card-head"><h3>Account controls</h3></div><div class="card-body stack">
        <div class="field"><label>Commission rate (%)</label><input class="input" type="number" name="rate" min="0" max="50" step="0.5" value="${v.commissionRate}"></div>
        <label class="row-between small">Verified badge <label class="switch"><input type="checkbox" name="verified" ${v.verified ? 'checked' : ''}><span></span></label></label>
        <div class="row-between small"><span>Available balance</span><b>${formatPrice(v.balance)}</b></div>
        <div class="row-between small"><span>Disputes</span><b>${disputes.length} (${disputes.filter((d) => d.status === 'open').length} open)</b></div>
        <button class="btn btn-primary">Save</button>
      </div></form>
    </div>
    <div class="dash-grid-2">
      <div class="card"><div class="card-head"><h3>Products (${products.length})</h3><a class="small text-primary" href="${routes.adminDash('products', { vendor: v.id })}">Manage</a></div>
        ${products.slice(0, 6).map((p) => `<div class="feed-item"><img src="${p.thumbnail}" style="width:36px;height:36px;border-radius:6px;background:var(--surface-2);object-fit:contain"><span class="small grow truncate">${escapeHtml(p.title)}</span><b class="small">${formatPrice(p.price)}</b>${statusBadge(p.status)}</div>`).join('') || '<p class="small muted card-body">No products.</p>'}</div>
      <div class="card"><div class="card-head"><h3>Recent orders</h3></div>
        ${orders.map((o) => `<div class="feed-item"><div class="grow"><b class="small">${o.id}</b><div class="xs muted">${escapeHtml(o.customerName)} · ${formatDate(o.createdAt)}</div></div><b class="small">${formatPrice(o.vendorTotal)}</b>${statusBadge(o.status)}</div>`).join('') || '<p class="small muted card-body">No orders.</p>'}</div>
    </div>
    <div class="card mt-2"><div class="card-head"><h3>Reels (${reels.length})</h3></div>
      <div class="card-body row wrap" style="gap:12px">${reels.map((r) => `<div style="width:120px"><img src="${r.poster}" style="width:120px;height:170px;object-fit:cover;border-radius:10px;background:var(--surface-2)"><div class="xs muted mt-1">${formatNumber(r.views)} views</div>${statusBadge(r.status)}</div>`).join('') || '<p class="small muted">No reels.</p>'}</div></div>`;

  lineChart($('[data-sales]'), { labels: s.series.labels, datasets: [{ label: 'Sales', data: s.series.values }] });
  $$('[data-status]').forEach((b) => (b.onclick = async () => {
    const to = b.dataset.status;
    if (to !== 'approved' && !(await confirmDialog({ title: `Mark ${v.name} as ${to}?`, message: 'This changes what customers can see.', confirmText: 'Confirm', danger: true }))) return;
    await updateVendor(v.id, { status: to, verified: to === 'approved' ? true : v.verified });
    toast(`Vendor ${to}`);
    render();
  }));
  $('[data-comm]').onsubmit = async (e) => {
    e.preventDefault();
    await updateVendor(v.id, { commissionRate: +e.target.rate.value, verified: e.target.verified.checked });
    toast('Vendor updated');
  };
}

if (el) render();
