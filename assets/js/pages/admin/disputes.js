import { mountDashboard } from '../../components/dashboardLayout.js';
import { openModal } from '../../components/modal.js';
import { toast } from '../../components/toast.js';
import { emptyState } from '../../components/cards.js';
import { routes } from '../../core/routes.js';
import { escapeHtml, icon, avatar, formatPrice, formatDate, timeAgo, statusBadge, $, $$ } from '../../core/utils.js';
import { db } from '../../services/db.js';

const el = mountDashboard({ role: 'admin', active: 'disputes', title: 'Disputes' });
let tab = 'active';
const TABS = [['active', 'Active'], ['resolved', 'Resolved'], ['all', 'All']];
const isActive = (d) => d.status === 'open' || d.status === 'in_review';

function render() {
  const all = db.all('disputes');
  const list = tab === 'active' ? all.filter(isActive) : tab === 'resolved' ? all.filter((d) => !isActive(d)) : all;
  const refunded = all.filter((d) => d.status === 'resolved_refund').reduce((s, d) => s + d.amount, 0);
  el.innerHTML = `
    <div class="dash-head"><div><h2>Disputes & refunds</h2><p>Mediate between buyers and sellers. Approved refunds must be processed through the payment provider.</p></div></div>
    <div class="stats">
      <div class="stat"><span class="ic amber">${icon('circle-alert')}</span><div><div class="lbl">Open</div><div class="val">${all.filter((d) => d.status === 'open').length}</div></div></div>
      <div class="stat"><span class="ic">${icon('search')}</span><div><div class="lbl">In review</div><div class="val">${all.filter((d) => d.status === 'in_review').length}</div></div></div>
      <div class="stat"><span class="ic green">${icon('circle-check')}</span><div><div class="lbl">Resolved</div><div class="val">${all.filter((d) => !isActive(d)).length}</div></div></div>
      <div class="stat"><span class="ic red">${icon('undo-2')}</span><div><div class="lbl">Refund approved</div><div class="val">${formatPrice(refunded)}</div></div></div>
    </div>
    <div class="card mt-2">
      <div class="tabs" style="padding:0 12px">${TABS.map(([k, l]) => `<button class="tab ${tab === k ? 'active' : ''}" data-tab="${k}">${l}</button>`).join('')}</div>
      ${list.length ? `<div class="table-wrap"><table class="table">
        <thead><tr><th>Case</th><th>Customer</th><th>Vendor</th><th>Reason</th><th>Amount</th><th>Status</th><th></th></tr></thead>
        <tbody>${list.map((d) => `<tr>
          <td><b>${d.id}</b><div class="xs muted">${d.orderId} · ${timeAgo(d.createdAt)}</div></td>
          <td class="small">${escapeHtml(d.customerName)}</td>
          <td class="small"><a href="${routes.adminDash('vendor-detail', { id: d.vendorId })}">${escapeHtml(db.get('vendors', d.vendorId)?.name || d.vendorId)}</a></td>
          <td class="small">${escapeHtml(d.reason)}</td>
          <td><b>${formatPrice(d.amount)}</b></td>
          <td>${statusBadge(d.status)}</td>
          <td><button class="btn ${isActive(d) ? 'btn-primary' : 'btn-ghost'} btn-xs" data-open="${d.id}">${isActive(d) ? 'Resolve' : 'View'}</button></td>
        </tr>`).join('')}</tbody></table></div>` : emptyState('gavel', 'No disputes', 'Nothing to mediate right now.')}
    </div>`;
  $$('[data-tab]').forEach((b) => (b.onclick = () => { tab = b.dataset.tab; render(); }));
  $$('[data-open]').forEach((b) => (b.onclick = () => open(b.dataset.open)));
}

function open(id) {
  const d = db.get('disputes', id);
  const v = db.get('vendors', d.vendorId);
  const order = db.get('orders', d.orderId);
  const thread = d.notes || [];
  const m = openModal({
    title: `Case ${d.id}`,
    variant: 'drawer-right',
    content: `<div class="stack">
      <div class="row-between"><span class="small muted">Opened ${formatDate(d.createdAt)}</span>${statusBadge(d.status)}</div>
      <div class="card card-pad small stack" style="gap:6px">
        <div class="row-between"><span>Order</span><b>${d.orderId}</b></div>
        <div class="row-between"><span>Claim amount</span><b>${formatPrice(d.amount)}</b></div>
        ${order ? `<div class="row-between"><span>Order status</span>${statusBadge(order.status)}</div><div class="row-between"><span>Payment</span><span>${order.paymentMethod.toUpperCase()} · ${order.paymentStatus}</span></div>` : ''}
      </div>
      <div class="bubble them" style="max-width:100%">${avatar(d.customerName, { size: 'sm' })} <b>${escapeHtml(d.customerName)}</b> — ${escapeHtml(d.reason)}<br>${escapeHtml(d.message)}</div>
      <div class="bubble them" style="max-width:100%">${avatar(v?.name || '?', { size: 'sm', color: v?.color })} <b>${escapeHtml(v?.name || 'Vendor')}</b> — We shipped the correct item and can offer a replacement after inspection.</div>
      ${thread.map((n) => `<div class="bubble me" style="max-width:100%"><b>Admin note</b><br>${escapeHtml(n.text)}<time>${formatDate(n.at)}</time></div>`).join('')}
      ${isActive(d) ? `<div class="field"><label>Internal note / message to both parties</label><textarea class="textarea" data-note placeholder="Add a note…"></textarea></div>` : ''}
    </div>`,
    footer: isActive(d)
      ? `${d.status === 'open' ? '<button class="btn btn-outline" data-set="in_review">Start review</button>' : ''}<button class="btn btn-outline" data-set="resolved_rejected">Reject claim</button><button class="btn btn-success" data-set="resolved_refund">${icon('undo-2')} Approve refund ${formatPrice(d.amount)}</button>`
      : '<button class="btn btn-outline" data-close>Close</button>',
  });
  $$('[data-set]', m.el).forEach((b) => (b.onclick = async () => {
    const note = m.el.querySelector('[data-note]')?.value.trim();
    const status = b.dataset.set;
    try {
      await db.resolveDispute(d.id, status, note);
      m.close();
      toast(status === 'resolved_refund' ? 'Refund approved. Process it through the payment provider.' : status === 'in_review' ? 'Case moved to review' : 'Claim rejected', 'info');
      render();
    } catch (error) { toast(error.message, 'error'); }
  }));
}

if (el) render();
