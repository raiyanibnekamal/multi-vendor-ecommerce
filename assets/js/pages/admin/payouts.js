import { mountDashboard } from '../../components/dashboardLayout.js';
import { confirmDialog } from '../../components/modal.js';
import { toast } from '../../components/toast.js';
import { emptyState } from '../../components/cards.js';
import { routes } from '../../core/routes.js';
import { escapeHtml, icon, avatar, formatPrice, formatDate, statusBadge, $, $$ } from '../../core/utils.js';
import { db } from '../../services/db.js';

const el = mountDashboard({ role: 'admin', active: 'payouts', title: 'Payouts' });
let tab = 'requested';
const TABS = ['requested', 'processing', 'paid', 'all'];

function render() {
  const all = db.all('payouts').sort((a, b) => String(b.requestedAt || '').localeCompare(String(a.requestedAt || '')));
  const list = tab === 'all' ? all : all.filter((p) => p.status === tab);
  const sum = (s) => all.filter((p) => p.status === s).reduce((n, p) => n + p.amount, 0);
  const owed = db.all('vendors').reduce((n, v) => n + (v.balance || 0), 0);
  el.innerHTML = `
    <div class="dash-head"><div><h2>Vendor payouts</h2><p>Review withdrawal requests and settle vendor balances (net of commission).</p></div>
      ${tab === 'requested' && list.length ? `<button class="btn btn-primary" data-approve-all>${icon('check-check')} Approve all (${list.length})</button>` : ''}</div>
    <div class="stats">
      <div class="stat"><span class="ic amber">${icon('hourglass')}</span><div><div class="lbl">Requested</div><div class="val">${formatPrice(sum('requested'))}</div></div></div>
      <div class="stat"><span class="ic">${icon('loader')}</span><div><div class="lbl">Processing</div><div class="val">${formatPrice(sum('processing'))}</div></div></div>
      <div class="stat"><span class="ic green">${icon('circle-check')}</span><div><div class="lbl">Paid (all time)</div><div class="val">${formatPrice(sum('paid'))}</div></div></div>
      <div class="stat"><span class="ic violet">${icon('landmark')}</span><div><div class="lbl">Vendor balances held</div><div class="val">${formatPrice(owed)}</div></div></div>
    </div>
    <div class="card mt-2">
      <div class="tabs" style="padding:0 12px">${TABS.map((s) => `<button class="tab ${tab === s ? 'active' : ''}" data-tab="${s}" style="text-transform:capitalize">${s} <span class="badge">${s === 'all' ? all.length : all.filter((p) => p.status === s).length}</span></button>`).join('')}</div>
      ${list.length ? `<div class="table-wrap"><table class="table">
        <thead><tr><th>Payout</th><th>Vendor</th><th>Method</th><th>Amount</th><th>Requested</th><th>Status</th><th></th></tr></thead>
        <tbody>${list.map((p) => {
          const v = db.get('vendors', p.vendorId);
          return `<tr>
            <td><b>${p.id}</b></td>
            <td><a class="cell-product" href="${routes.adminDash('vendor-detail', { id: p.vendorId })}">${avatar(v?.name || '?', { size: 'sm', color: v?.color })}<span class="small">${escapeHtml(v?.name || p.vendorId)}</span></a></td>
            <td class="small">${icon(p.method === 'bank' ? 'landmark' : 'smartphone')} ${p.method === 'bank' ? 'Bank transfer' : 'bKash'}</td>
            <td><b>${formatPrice(p.amount)}</b></td>
            <td class="small">${formatDate(p.requestedAt)}</td>
            <td>${statusBadge(p.status)}</td>
            <td><div class="actions">
              ${p.status === 'requested' ? `<button class="btn btn-primary btn-xs" data-set="processing" data-id="${p.id}">Approve</button><button class="btn btn-ghost btn-xs text-danger" data-set="rejected" data-id="${p.id}">Reject</button>` : ''}
              ${p.status === 'processing' ? `<button class="btn btn-success btn-xs" data-set="paid" data-id="${p.id}">Mark paid</button>` : ''}
            </div></td>
          </tr>`;
        }).join('')}</tbody></table></div>` : emptyState('wallet', 'Nothing here', 'No payouts with this status.')}
    </div>`;

  $$('[data-tab]').forEach((b) => (b.onclick = () => { tab = b.dataset.tab; render(); }));
  $$('[data-set]').forEach((b) => (b.onclick = async () => {
    const p = db.get('payouts', b.dataset.id);
    const to = b.dataset.set;
    if (to === 'rejected') {
      if (!(await confirmDialog({ title: 'Reject payout?', message: 'The amount will be returned to the vendor balance.', confirmText: 'Reject', danger: true }))) return;
      db.update('vendors', p.vendorId, (v) => ({ balance: (v.balance || 0) + p.amount }));
    }
    db.update('payouts', p.id, { status: to, ...(to === 'paid' ? { paidAt: new Date().toISOString() } : {}) });
    toast(to === 'processing' ? 'Payout approved — transfer initiated' : to === 'paid' ? 'Marked as paid' : 'Payout rejected', to === 'rejected' ? 'info' : 'success');
    render();
  }));
  const all$ = $('[data-approve-all]');
  if (all$) all$.onclick = () => {
    list.forEach((p) => db.update('payouts', p.id, { status: 'processing' }));
    toast(`${list.length} payouts approved`);
    render();
  };
}

if (el) render();
