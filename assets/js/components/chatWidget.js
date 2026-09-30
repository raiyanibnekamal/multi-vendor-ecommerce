import { escapeHtml, icon, formatPrice, safeMediaUrl } from '../core/utils.js';
import { routes } from '../core/routes.js';
import { supportChat } from '../services/ai.js';
import { store } from '../core/store.js';
import { CONFIG } from '../core/config.js';

const QUICK = ['Track my order', 'Delivery time?', 'Return policy', 'Phone under 20k', 'Gift for her', 'Talk to a human'];

function linkHref(code) {
  if (code === 'login') return routes.login(location.pathname + location.search);
  if (code === 'register-vendor') return routes.register('vendor');
  if (code === 'live') return routes.live();
  if (code.startsWith('order:')) return routes.orderDetail(code.slice(6));
  return code;
}

function botHtml(res) {
  const text = escapeHtml(res.text).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
  const products = res.products?.length
    ? `<div class="mini-products">${res.products.map((p) => `<a href="${routes.product(p.id)}"><img src="${escapeHtml(safeMediaUrl(p.thumbnail, p.title))}" alt="" onerror="this.onerror=null;this.src='${escapeHtml(safeMediaUrl('', p.title))}'"><span class="grow"><span class="clamp-2">${escapeHtml(p.title)}</span><b class="text-primary">${formatPrice(p.price)}</b></span></a>`).join('')}</div>`
    : '';
  const links = res.links?.length ? `<div class="row wrap mt-1">${res.links.map((l) => `<a class="btn btn-soft btn-xs" href="${linkHref(l.href)}">${escapeHtml(l.label)}</a>`).join('')}</div>` : '';
  return text + products + links;
}

export function mountChatWidget() {
  if (document.querySelector('.ai-fab')) return;
  const fab = document.createElement('button');
  fab.className = 'ai-fab';
  fab.setAttribute('aria-label', 'Open AI assistant');
  fab.innerHTML = icon('bot');
  document.body.appendChild(fab);

  let panel = null;
  const history = store.get('chat_history', []);

  const addMsg = (who, html) => {
    const m = document.createElement('div');
    m.className = `ai-msg ${who}`;
    m.innerHTML = html;
    panel.querySelector('.ai-msgs').appendChild(m);
    m.scrollIntoView({ block: 'end' });
    return m;
  };

  const send = async (text) => {
    text = text.trim();
    if (!text) return;
    addMsg('user', escapeHtml(text));
    history.push({ who: 'user', html: escapeHtml(text) });
    const typing = addMsg('bot', '<span class="ai-typing"><span></span><span></span><span></span></span>');
    const res = await supportChat(text);
    const html = botHtml(res);
    typing.innerHTML = html;
    typing.scrollIntoView({ block: 'end' });
    history.push({ who: 'bot', html });
    store.set('chat_history', history.slice(-30));
  };

  const open = () => {
    if (panel) { panel.remove(); panel = null; return; }
    panel = document.createElement('div');
    panel.className = 'ai-panel';
    panel.innerHTML = `
      <div class="ai-head">
        <span class="avatar">${icon('bot')}</span>
        <div><strong>${CONFIG.APP_NAME} Assistant</strong><div class="xs" style="opacity:.85">AI-powered · replies instantly</div></div>
        <button class="close-btn" data-close aria-label="Close">${icon('x')}</button>
      </div>
      <div class="ai-msgs"></div>
      <div class="ai-quick">${QUICK.map((q) => `<button>${q}</button>`).join('')}</div>
      <form class="ai-input"><input placeholder="Ask anything…" aria-label="Message"><button aria-label="Send">${icon('send')}</button></form>`;
    document.body.appendChild(panel);
    addMsg('bot', `Hi! 👋 I'm your shopping assistant. Ask me about orders, delivery, returns — or describe what you're looking for.`);
    history.forEach((h) => addMsg(h.who, h.html));
    panel.querySelector('[data-close]').onclick = open;
    panel.querySelectorAll('.ai-quick button').forEach((b) => (b.onclick = () => send(b.textContent)));
    const form = panel.querySelector('form');
    form.onsubmit = (e) => { e.preventDefault(); const i = form.querySelector('input'); send(i.value); i.value = ''; };
    form.querySelector('input').focus();
  };

  fab.onclick = open;
  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-open-chat]')) { e.preventDefault(); if (!panel) open(); }
  });
}
