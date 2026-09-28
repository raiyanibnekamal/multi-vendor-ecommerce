import { mountAccount } from './accountLayout.js';
import { emptyState } from '../../components/cards.js';
import { openModal, confirmDialog } from '../../components/modal.js';
import { toast } from '../../components/toast.js';
import { escapeHtml, icon, uid, $$ } from '../../core/utils.js';
import { db } from '../../services/db.js';

const el = mountAccount('addresses', 'Addresses');

async function saveAll(list) {
  await db.updateAndSync('users', el.user.id, { addresses: list });
}

function editAddress(addr) {
  const a = addr || { label: 'Home', name: el.user.name, phone: el.user.phone || '', line: '', area: '' };
  const m = openModal({
    title: addr ? 'Edit address' : 'Add address',
    content: `<form class="form-grid" data-f>
      <div class="field"><label>Label</label><select class="select" name="label">${['Home', 'Office', 'Other'].map((l) => `<option ${a.label === l ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
      <div class="field"><label>Full name</label><input class="input" name="name" value="${escapeHtml(a.name)}" required></div>
      <div class="field"><label>Phone</label><input class="input" name="phone" value="${escapeHtml(a.phone)}" required></div>
      <div class="field"><label>Area & city</label><input class="input" name="area" value="${escapeHtml(a.area)}" required></div>
      <div class="field full"><label>House / road</label><input class="input" name="line" value="${escapeHtml(a.line)}" required></div>
    </form>`,
    footer: '<button class="btn btn-outline" data-close>Cancel</button><button class="btn btn-primary" data-save>Save address</button>',
  });
  m.el.querySelector('[data-save]').onclick = async () => {
    const f = m.el.querySelector('[data-f]');
    if (!f.reportValidity()) return;
    const row = { label: f.label.value, name: f.name.value.trim(), phone: f.phone.value.trim(), area: f.area.value.trim(), line: f.line.value.trim() };
    const list = [...(el.user.addresses || [])];
    if (addr) Object.assign(list.find((x) => x.id === addr.id), row);
    else list.push({ id: uid('a'), ...row, isDefault: !list.length });
    try {
      await saveAll(list);
      m.close();
      toast('Address saved');
      render();
    } catch (error) { toast(error.message, 'error'); }
  };
}

function render() {
  const list = el.user.addresses || [];
  el.innerHTML = `
    <div class="row-between mb-2"><h2>Addresses</h2><button class="btn btn-primary btn-sm" data-add>${icon('plus')} Add address</button></div>
    ${list.length ? `<div class="addr-grid">${list.map((a) => `
      <div class="addr-card ${a.isDefault ? 'default' : ''}">
        <div class="row-between"><b>${icon(a.label === 'Office' ? 'building-2' : 'house')} ${escapeHtml(a.label)}</b>${a.isDefault ? '<span class="badge badge-primary">Default</span>' : ''}</div>
        <span class="small">${escapeHtml(a.name)} · ${escapeHtml(a.phone)}</span>
        <span class="small muted">${escapeHtml(a.line)}, ${escapeHtml(a.area)}</span>
        <div class="row mt-1">
          <button class="btn btn-outline btn-xs" data-edit="${a.id}">Edit</button>
          ${!a.isDefault ? `<button class="btn btn-ghost btn-xs" data-default="${a.id}">Set default</button><button class="btn btn-ghost btn-xs text-danger" data-del="${a.id}">Delete</button>` : ''}
        </div>
      </div>`).join('')}</div>` : emptyState('map-pin', 'No saved addresses', 'Add one to check out faster.')}`;
  el.querySelector('[data-add]').onclick = () => editAddress();
  $$('[data-edit]', el).forEach((b) => (b.onclick = () => editAddress(list.find((a) => a.id === b.dataset.edit))));
  $$('[data-default]', el).forEach((b) => (b.onclick = async () => {
    try { await saveAll(list.map((a) => ({ ...a, isDefault: a.id === b.dataset.default }))); render(); }
    catch (error) { toast(error.message, 'error'); }
  }));
  $$('[data-del]', el).forEach((b) => (b.onclick = async () => {
    if (!(await confirmDialog({ title: 'Delete address?', confirmText: 'Delete', danger: true }))) return;
    try { await saveAll(list.filter((a) => a.id !== b.dataset.del)); render(); }
    catch (error) { toast(error.message, 'error'); }
  }));
}

if (el) render();
