import { mountDashboard } from '../../components/dashboardLayout.js';
import { openModal } from '../../components/modal.js';
import { toast } from '../../components/toast.js';
import { escapeHtml, icon, avatar, formatPrice, formatDate, statusBadge, $ } from '../../core/utils.js';
import { updateVendor } from '../../services/vendors.js';
import { db } from '../../services/db.js';

const el = mountDashboard({ role: 'vendor', active: 'settings', title: 'Store settings' });
const COLORS = ['#2563eb', '#4f46e5', '#0891b2', '#0f766e', '#16a34a', '#d97706', '#db2777', '#dc2626', '#475569'];

function render() {
  const v = db.get('vendors', el.vendor.id);
  const payouts = db.where('payouts', (p) => p.vendorId === v.id);
  el.innerHTML = `
    <div class="dash-grid" style="margin-top:0">
      <form class="card" data-store>
        <div class="card-head"><h3>Store profile</h3>${statusBadge(v.status)}</div>
        <div class="card-body stack">
          <div class="row" style="gap:16px">${avatar(v.name, { size: 'lg', color: v.color })}<div><b>${escapeHtml(v.name)}</b><div class="xs muted">Joined ${formatDate(v.joinedAt)} · Commission ${v.commissionRate}%</div></div></div>
          <div class="form-grid">
            <div class="field"><label>Store name</label><input class="input" name="name" value="${escapeHtml(v.name)}" required></div>
            <div class="field"><label>Location</label><input class="input" name="location" value="${escapeHtml(v.location)}"></div>
            <div class="field"><label>Contact email</label><input class="input" type="email" name="email" value="${escapeHtml(v.email)}"></div>
            <div class="field"><label>Phone</label><input class="input" name="phone" value="${escapeHtml(v.phone)}"></div>
            <div class="field full"><label>Description</label><textarea class="textarea" name="description">${escapeHtml(v.description)}</textarea></div>
            <div class="field full"><label>Brand colour</label><div class="row">${COLORS.map((c) => `<label style="cursor:pointer"><input type="radio" name="color" value="${c}" ${v.color === c ? 'checked' : ''} hidden><span style="display:block;width:32px;height:32px;border-radius:50%;background:${c};outline:${v.color === c ? '3px solid ' + c : 'none'};outline-offset:2px"></span></label>`).join('')}</div></div>
          </div>
          <button class="btn btn-primary" style="width:fit-content">Save changes</button>
        </div>
      </form>
      <div class="stack" style="gap:16px">
        <div class="card card-pad">
          <div class="lbl small muted">Available balance</div>
          <div style="font-size:30px;font-weight:800">${formatPrice(v.balance)}</div>
          <button class="btn btn-primary btn-block mt-2" data-payout ${v.balance < 1000 ? 'disabled' : ''}>${icon('wallet')} Request payout</button>
          <p class="xs muted mt-1">Payouts are reviewed by admin and sent within 3 working days.</p>
        </div>
        <div class="card"><div class="card-head"><h3>Payout history</h3></div>
          ${payouts.map((p) => `<div class="feed-item"><div class="grow"><b class="small">${formatPrice(p.amount)}</b><div class="xs muted">${p.id} · ${p.method} · ${formatDate(p.requestedAt)}</div></div>${statusBadge(p.status)}</div>`).join('') || '<p class="small muted card-body">No payouts yet.</p>'}
        </div>
        <div class="card card-pad stack">
          <h4>Notifications</h4>
          <label class="row-between small">New orders <label class="switch"><input type="checkbox" checked><span></span></label></label>
          <label class="row-between small">Customer messages <label class="switch"><input type="checkbox" checked><span></span></label></label>
          <label class="row-between small">Low stock alerts <label class="switch"><input type="checkbox" checked><span></span></label></label>
        </div>
      </div>
    </div>`;

  $('[data-store]').onsubmit = async (e) => {
    e.preventDefault();
    const f = e.target;
    await updateVendor(v.id, { name: f.name.value.trim(), location: f.location.value.trim(), email: f.email.value.trim(), phone: f.phone.value.trim(), description: f.description.value.trim(), color: f.color.value });
    toast('Store updated');
    render();
  };
  $('[data-payout]').onclick = () => {
    const m = openModal({
      title: 'Request payout',
      content: `<div class="stack"><div class="field"><label>Amount (max ${formatPrice(v.balance)})</label><input class="input" type="number" data-amt value="${v.balance}" max="${v.balance}" min="1000"></div>
        <div class="field"><label>Method</label><select class="select" data-method><option value="bank">Bank transfer</option><option value="bkash">bKash</option></select></div></div>`,
      footer: '<button class="btn btn-outline" data-close>Cancel</button><button class="btn btn-primary" data-ok>Submit</button>',
    });
    m.el.querySelector('[data-ok]').onclick = () => {
      const amount = Math.min(v.balance, +m.el.querySelector('[data-amt]').value);
      if (amount < 1000) return toast('Minimum payout is ৳1,000', 'error');
      db.insert('payouts', { id: `PO-${Math.floor(1000 + Math.random() * 9000)}`, vendorId: v.id, amount, method: m.el.querySelector('[data-method]').value, status: 'requested', requestedAt: new Date().toISOString() });
      db.update('vendors', v.id, { balance: v.balance - amount });
      m.close();
      toast('Payout requested');
      render();
    };
  };
}

if (el) render();
