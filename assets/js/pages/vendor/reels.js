import { mountDashboard } from '../../components/dashboardLayout.js';
import { confirmDialog } from '../../components/modal.js';
import { toast } from '../../components/toast.js';
import { emptyState, loading } from '../../components/cards.js';
import { routes } from '../../core/routes.js';
import { escapeHtml, icon, formatNumber, timeAgo, statusBadge, $$ } from '../../core/utils.js';
import { getReels, deleteReel } from '../../services/reels.js';
import { db } from '../../services/db.js';

const el = mountDashboard({ role: 'vendor', active: 'reels', title: 'Reels' });

async function render() {
  el.innerHTML = loading();
  const reels = await getReels({ vendorId: el.vendor.id, status: 'all' });
  const views = reels.reduce((s, r) => s + r.views, 0);
  const likes = reels.reduce((s, r) => s + r.likes, 0);
  const reelOrders = db.all('orders').filter((o) => o.source === 'reel' && o.items.some((it) => it.vendorId === el.vendor.id)).length;

  el.innerHTML = `
    <div class="dash-head"><div><h2>Reels</h2><p>Short shoppable videos. Tag products so viewers can buy instantly.</p></div><a class="btn btn-primary" href="${routes.vendorDash('reel-upload')}">${icon('plus')} New reel</a></div>
    <div class="stats">
      <div class="stat"><span class="ic">${icon('clapperboard')}</span><div><div class="lbl">Reels</div><div class="val">${reels.length}</div></div></div>
      <div class="stat"><span class="ic violet">${icon('eye')}</span><div><div class="lbl">Total views</div><div class="val">${formatNumber(views)}</div></div></div>
      <div class="stat"><span class="ic red">${icon('heart')}</span><div><div class="lbl">Likes</div><div class="val">${formatNumber(likes)}</div></div></div>
      <div class="stat"><span class="ic green">${icon('shopping-bag')}</span><div><div class="lbl">Orders from reels</div><div class="val">${reelOrders}</div></div></div>
    </div>
    <div class="card mt-2">
      ${reels.length ? `<div class="table-wrap"><table class="table">
        <thead><tr><th>Reel</th><th>Tagged products</th><th>Views</th><th>Likes</th><th>Comments</th><th>Shares</th><th>Status</th><th></th></tr></thead>
        <tbody>${reels.map((r) => `
          <tr>
            <td><div class="cell-product"><img src="${r.poster}" style="width:44px;height:64px;object-fit:cover"><div style="min-width:0;max-width:260px"><div class="small bold clamp-2">${escapeHtml(r.caption)}</div><div class="xs muted">${timeAgo(r.createdAt)}</div></div></div></td>
            <td><div class="row" style="gap:4px">${r.productIds.map((pid) => { const p = db.get('products', pid); return p ? `<img src="${p.thumbnail}" title="${escapeHtml(p.title)}" style="width:32px;height:32px;border-radius:6px;background:var(--surface-2);object-fit:contain">` : ''; }).join('')}</div></td>
            <td>${formatNumber(r.views)}</td><td>${formatNumber(r.likes)}</td><td>${formatNumber(r.comments)}</td><td>${formatNumber(r.shares)}</td>
            <td>${statusBadge(r.status === 'pending' ? 'in_review' : r.status)}</td>
            <td><div class="actions">${r.status === 'approved' ? `<a class="btn btn-ghost btn-sm btn-icon" href="${routes.reels(r.id)}" target="_blank" title="View">${icon('external-link')}</a>` : ''}<button class="btn btn-ghost btn-sm btn-icon text-danger" data-del="${r.id}" title="Delete">${icon('trash-2')}</button></div></td>
          </tr>`).join('')}</tbody></table></div>`
      : emptyState('clapperboard', 'No reels yet', 'Post your first shoppable reel to reach new customers.', `<a class="btn btn-primary" href="${routes.vendorDash('reel-upload')}">Create reel</a>`)}
    </div>`;
  $$('[data-del]').forEach((b) => (b.onclick = async () => {
    if (!(await confirmDialog({ title: 'Delete reel?', confirmText: 'Delete', danger: true }))) return;
    await deleteReel(b.dataset.del);
    toast('Reel deleted', 'info');
    render();
  }));
}

if (el) render();
