import { mountShell } from '../../components/shell.js';
import { liveCard, emptyState, loading } from '../../components/cards.js';
import { toast } from '../../components/toast.js';
import { ensureLogin } from '../../components/modal.js';
import { routes } from '../../core/routes.js';
import { escapeHtml, icon, $, $$, formatDateTime } from '../../core/utils.js';
import { getStreams } from '../../services/live.js';
import { getList, toggleInList } from '../../services/userdata.js';
import { categoryById, rootOf } from '../../services/catalog.js';
import { db } from '../../services/db.js';

const main = mountShell({ active: 'live' });
let filter = 'all';

async function render() {
  main.innerHTML = loading();
  const all = await getStreams();
  const inFilter = (s) => filter === 'all' || rootOf(s.categoryId)?.id === filter;
  const live = all.filter((s) => s.status === 'live' && inFilter(s));
  const upcoming = all.filter((s) => s.status === 'scheduled' && inFilter(s)).sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
  const replays = all.filter((s) => s.status === 'ended' && inFilter(s));
  const roots = [...new Set(all.map((s) => rootOf(s.categoryId)?.id).filter(Boolean))];
  const reminders = getList('reminders');
  const totalViewers = all.filter((s) => s.status === 'live').reduce((n, s) => n + s.viewers, 0);

  main.innerHTML = `
  <div class="container page">
    <div class="live-hero">
      <div>
        <span class="badge badge-live mb-1">LIVE SHOPPING</span>
        <h1>Shop live with your favourite sellers</h1>
        <p>Watch product demos, ask questions in chat and buy pinned products with one tap.</p>
      </div>
      <div class="row" style="gap:24px">
        <div><div style="font-size:30px;font-weight:800">${all.filter((s) => s.status === 'live').length}</div><div class="small" style="color:#cbd5e1">live now</div></div>
        <div><div style="font-size:30px;font-weight:800">${totalViewers.toLocaleString('en-IN')}</div><div class="small" style="color:#cbd5e1">watching</div></div>
      </div>
    </div>

    <div class="chips mb-3">
      <button class="chip ${filter === 'all' ? 'active' : ''}" data-f="all">All</button>
      ${roots.map((r) => `<button class="chip ${filter === r ? 'active' : ''}" data-f="${r}">${escapeHtml(categoryById(r).name)}</button>`).join('')}
    </div>

    <section>
      <div class="section-head"><h2>${icon('radio', 'text-danger')} Live now</h2></div>
      ${live.length ? `<div class="live-featured">${live[0] ? liveCard(live[0]) : ''}<div class="stack">${live.slice(1).map(liveCard).join('')}</div></div>` : emptyState('radio', 'No one is live right now', 'Check the upcoming schedule below.')}
    </section>

    <section class="section">
      <div class="section-head"><div><h2>${icon('calendar', 'text-primary')} Upcoming</h2><p>Set a reminder and we'll notify you when they go live</p></div></div>
      ${upcoming.length ? `<div class="live-grid">${upcoming.map((s) => `
        <div class="stack" style="gap:8px">
          ${liveCard(s)}
          <div class="row-between"><span class="small muted">${icon('clock')} ${formatDateTime(s.scheduledAt)}</span>
          <button class="btn btn-sm ${reminders.includes(s.id) ? 'btn-soft' : 'btn-outline'}" data-remind="${s.id}">${icon(reminders.includes(s.id) ? 'bell-ring' : 'bell')} ${reminders.includes(s.id) ? 'Reminder set' : 'Remind me'}</button></div>
        </div>`).join('')}</div>` : emptyState('calendar', 'Nothing scheduled')}
    </section>

    ${replays.length ? `
    <section class="section">
      <div class="section-head"><h2>${icon('history', 'text-primary')} Replays</h2></div>
      <div class="live-grid">${replays.map(liveCard).join('')}</div>
    </section>` : ''}
  </div>`;

  $$('[data-f]').forEach((b) => (b.onclick = () => { filter = b.dataset.f; render(); }));
  $$('[data-remind]').forEach((b) => (b.onclick = async () => {
    if (!(await ensureLogin('Sign in to set reminders'))) return;
    const on = toggleInList('reminders', b.dataset.remind);
    const s = db.get('streams', b.dataset.remind);
    toast(on ? `We'll remind you when "${s.title}" starts` : 'Reminder removed', on ? 'success' : 'info');
    render();
  }));
}

render();
