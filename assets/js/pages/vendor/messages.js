import { mountDashboard } from '../../components/dashboardLayout.js';
import { emptyState } from '../../components/cards.js';
import { escapeHtml, icon, avatar, timeAgo, formatDateTime, uid, $, $$ } from '../../core/utils.js';
import { db } from '../../services/db.js';

const el = mountDashboard({ role: 'vendor', active: 'messages', title: 'Messages' });
let activeId = null;
let showList = matchMedia('(max-width: 900px)').matches;

const SUGGEST = [
  [/warranty/i, 'Yes, it comes with a 1-year official warranty.'],
  [/stock|available|size|color|colour/i, 'Yes, it is in stock and ready to ship within 24 hours!'],
  [/price|koto|discount/i, 'The current price is shown on the product page. Use code LIVE50 for an extra ৳50 off!'],
  [/bkash|pay|cod|cash/i, 'We accept card, bKash, Nagad and Cash on Delivery.'],
  [/original|authentic/i, 'All our products are 100% authentic, sourced directly.'],
];

function suggestions(conv) {
  const last = conv.messages.filter((m) => m.from === 'customer').at(-1)?.text || '';
  const out = SUGGEST.filter(([re]) => re.test(last)).map(([, t]) => t);
  return [...new Set([...out, 'Thanks for reaching out! 😊', 'Let me check and get back to you shortly.'])].slice(0, 3);
}

function render() {
  const convs = db.where('conversations', (c) => c.vendorId === el.vendor.id).sort((a, b) => b.messages.at(-1).createdAt.localeCompare(a.messages.at(-1).createdAt));
  if (!convs.length) { el.innerHTML = `<div class="card">${emptyState('message-circle', 'No messages yet', 'Customer questions from product pages will appear here.')}</div>`; return; }
  activeId ||= convs[0].id;
  const conv = convs.find((c) => c.id === activeId);
  const customer = db.get('users', conv.customerId);
  el.innerHTML = `
    <div class="card msg-layout ${showList ? 'show-list' : ''}" style="margin:-8px 0 0">
      <div class="msg-list">
        ${convs.map((c) => {
          const u = db.get('users', c.customerId);
          const last = c.messages.at(-1);
          return `<a href="#" data-conv="${c.id}" class="${c.id === activeId ? 'active' : ''}">${avatar(u?.name || '?', { size: 'sm' })}<div class="grow" style="min-width:0"><div class="row-between"><b class="small">${escapeHtml(u?.name || 'Customer')}</b><span class="xs muted">${timeAgo(last.createdAt)}</span></div><div class="xs muted truncate">${last.from === 'vendor' ? 'You: ' : ''}${escapeHtml(last.text)}</div></div>${last.from === 'customer' ? '<span class="badge badge-primary" style="height:18px">new</span>' : ''}</a>`;
        }).join('')}
      </div>
      <div class="msg-thread">
        <div class="card-head"><button class="btn btn-ghost btn-icon btn-sm msg-back" data-back aria-label="Back">${icon('arrow-left')}</button>${avatar(customer?.name || '?', { size: 'sm' })}<div class="grow"><b>${escapeHtml(customer?.name || 'Customer')}</b><div class="xs muted">${escapeHtml(customer?.email || '')}</div></div></div>
        <div class="msg-body" data-body>
          ${conv.messages.map((m) => `<div class="bubble ${m.from === 'vendor' ? 'me' : 'them'}">${escapeHtml(m.text)}<time>${formatDateTime(m.createdAt)}</time></div>`).join('')}
        </div>
        <div class="chips" style="padding:10px 16px 0;background:var(--surface)">${icon('sparkles', 'text-primary')}${suggestions(conv).map((s) => `<button class="chip" style="height:30px;font-size:12.5px" data-sug="${escapeHtml(s)}">${escapeHtml(s)}</button>`).join('')}</div>
        <form class="msg-compose" data-form><input class="input" name="text" placeholder="Type a reply…" autocomplete="off"><button class="btn btn-primary">${icon('send')} Send</button></form>
      </div>
    </div>`;
  const body = $('[data-body]');
  body.scrollTop = body.scrollHeight;
  $$('[data-conv]').forEach((a) => (a.onclick = (e) => { e.preventDefault(); activeId = a.dataset.conv; showList = false; render(); }));
  $('[data-back]').onclick = () => { showList = true; render(); };
  const send = (text) => {
    if (!text.trim()) return;
    db.update('conversations', conv.id, (c) => ({ messages: [...c.messages, { id: uid('msg'), from: 'vendor', text: text.trim(), createdAt: new Date().toISOString() }] }));
    render();
  };
  $('[data-form]').onsubmit = (e) => { e.preventDefault(); send(e.target.text.value); };
  $$('[data-sug]').forEach((b) => (b.onclick = () => { $('[data-form]').text.value = b.dataset.sug; $('[data-form]').text.focus(); }));
}

if (el) render();
