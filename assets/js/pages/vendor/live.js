import { mountDashboard } from '../../components/dashboardLayout.js';
import { openModal, confirmDialog } from '../../components/modal.js';
import { toast } from '../../components/toast.js';
import { emptyState, loading } from '../../components/cards.js';
import { routes } from '../../core/routes.js';
import { escapeHtml, icon, formatNumber, formatDateTime, statusBadge, $, $$ } from '../../core/utils.js';
import { getStreams, scheduleStream, updateStream } from '../../services/live.js';
import { rootOf } from '../../services/catalog.js';
import { db } from '../../services/db.js';

const el = mountDashboard({ role: 'vendor', active: 'live', title: 'Live streams' });

function scheduleModal() {
  const products = db.where('products', (p) => p.vendorId === el.vendor.id && p.status === 'active');
  const soon = new Date(Date.now() + 86400000);
  soon.setMinutes(0);
  const local = new Date(soon.getTime() - soon.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  const m = openModal({
    title: 'Schedule a live stream',
    size: 'lg',
    content: `<form class="stack" data-f>
      <div class="field"><label>Title</label><input class="input" name="title" required placeholder="e.g. Weekend flash sale — up to 40% off"></div>
      <div class="field"><label>Start time</label><input class="input" type="datetime-local" name="when" value="${local}" required></div>
      <div class="field"><label>Products to feature (${products.length})</label>
        <div style="max-height:260px;overflow:auto;border:1px solid var(--border);border-radius:10px;padding:8px" class="stack">
          ${products.map((p, i) => `<label class="check"><input type="checkbox" name="p" value="${p.id}" ${i < 3 ? 'checked' : ''}><img src="${p.thumbnail}" style="width:32px;height:32px;border-radius:6px;background:var(--surface-2);object-fit:contain"> <span class="small">${escapeHtml(p.title)}</span></label>`).join('')}
        </div></div>
    </form>`,
    footer: '<button class="btn btn-outline" data-close>Cancel</button><button class="btn btn-primary" data-save>Schedule</button>',
  });
  m.el.querySelector('[data-save]').onclick = async () => {
    const f = m.el.querySelector('[data-f]');
    if (!f.reportValidity()) return;
    const ids = [...f.querySelectorAll('[name=p]:checked')].map((c) => c.value);
    if (!ids.length) return toast('Select at least one product', 'error');
    const first = db.get('products', ids[0]);
    await scheduleStream({ vendorId: el.vendor.id, title: f.title.value.trim(), scheduledAt: new Date(f.when.value).toISOString(), productIds: ids, categoryId: first.categoryId, thumbnail: first.images[0] || first.thumbnail });
    m.close();
    toast('Stream scheduled. Followers will be notified.');
    render();
  };
}

async function render() {
  el.innerHTML = loading();
  const streams = await getStreams({ vendorId: el.vendor.id });
  const live = streams.find((s) => s.status === 'live');
  const liveOrders = db.all('orders').filter((o) => o.source === 'live' && o.items.some((it) => it.vendorId === el.vendor.id));
  el.innerHTML = `
    <div class="dash-head"><div><h2>Live streams</h2><p>Demo products live, pin them, and sell in real time.</p></div>
      <div class="row"><button class="btn btn-outline" data-schedule>${icon('calendar-plus')} Schedule</button><a class="btn btn-live" href="${routes.vendorDash('go-live')}">${icon('radio')} ${live ? 'Return to studio' : 'Go live now'}</a></div></div>
    ${live ? `<div class="notice mb-2" style="align-items:center">${icon('radio')}<div class="grow"><b>You're live:</b> ${escapeHtml(live.title)}</div><a class="btn btn-live btn-sm" href="${routes.vendorDash('go-live')}">Open studio</a></div>` : ''}
    <div class="stats">
      <div class="stat"><span class="ic red">${icon('radio')}</span><div><div class="lbl">Total streams</div><div class="val">${streams.length}</div></div></div>
      <div class="stat"><span class="ic violet">${icon('users')}</span><div><div class="lbl">Peak viewers</div><div class="val">${formatNumber(Math.max(0, ...streams.map((s) => Math.max(s.peakViewers || 0, s.viewers || 0))))}</div></div></div>
      <div class="stat"><span class="ic green">${icon('shopping-bag')}</span><div><div class="lbl">Orders from live</div><div class="val">${liveOrders.length}</div></div></div>
    </div>
    <div class="card mt-2">
      ${streams.length ? `<div class="table-wrap"><table class="table">
        <thead><tr><th>Stream</th><th>Status</th><th>When</th><th>Products</th><th>Viewers</th><th>Likes</th><th></th></tr></thead>
        <tbody>${streams.map((s) => `
          <tr>
            <td><div class="cell-product"><img src="${s.thumbnail}" style="width:64px;height:40px;object-fit:cover"><span class="small bold" style="max-width:280px">${escapeHtml(s.title)}</span></div></td>
            <td>${statusBadge(s.status)}</td>
            <td class="small">${s.status === 'scheduled' ? formatDateTime(s.scheduledAt) : s.startedAt ? formatDateTime(s.startedAt) : '—'}</td>
            <td>${s.productIds.length}</td>
            <td>${formatNumber(s.status === 'live' ? s.viewers : s.peakViewers || 0)}</td>
            <td>${formatNumber(s.likes)}</td>
            <td><div class="actions">
              ${s.status === 'scheduled' ? `<a class="btn btn-live btn-xs" href="${routes.vendorDash('go-live', { id: s.id })}">Start</a><button class="btn btn-ghost btn-xs text-danger" data-cancel="${s.id}">Cancel</button>` : ''}
              ${s.status === 'live' ? `<a class="btn btn-live btn-xs" href="${routes.vendorDash('go-live')}">Studio</a>` : ''}
              <a class="btn btn-ghost btn-xs" href="${routes.watch(s.id)}" target="_blank">${s.status === 'ended' ? 'Replay' : 'Viewer page'}</a>
            </div></td>
          </tr>`).join('')}</tbody></table></div>` : emptyState('radio', 'No streams yet', 'Go live to demo your products to thousands of shoppers.')}
    </div>`;
  $('[data-schedule]').onclick = scheduleModal;
  $$('[data-cancel]').forEach((b) => (b.onclick = async () => {
    if (!(await confirmDialog({ title: 'Cancel this stream?', confirmText: 'Cancel stream', danger: true }))) return;
    try {
      await db.removeAndSync('streams', b.dataset.cancel);
      toast('Stream cancelled', 'info');
      render();
    } catch (error) { toast(error.message, 'error'); }
  }));
}

if (el) render();
