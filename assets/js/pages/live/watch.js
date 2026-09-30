import { mountShell } from '../../components/shell.js';
import { openQuickBuy } from '../../components/quickBuy.js';
import { ensureLogin } from '../../components/modal.js';
import { toast } from '../../components/toast.js';
import { emptyState, loading } from '../../components/cards.js';
import { routes } from '../../core/routes.js';
import { escapeHtml, icon, qs, $, $$, avatar, formatNumber, formatPrice, timeUntil, formatDateTime, safeMediaUrl } from '../../core/utils.js';
import { getStream, getStreamMessages, streamSync, streamChannel, sendChat, sendReaction, toggleStreamLike, simulateAudience, REACTIONS } from '../../services/live.js';
import { SAMPLE_VIDEOS } from '../../services/reels.js';
import { vendorSync, isFollowing, toggleFollow } from '../../services/vendors.js';
import { currentUser } from '../../core/auth.js';
import { toggleInList, inList } from '../../services/userdata.js';
import { track } from '../../services/ai.js';
import { db } from '../../services/db.js';
import { connectAgora } from '../../services/agora.js';
import { CONFIG } from '../../core/config.js';

document.body.classList.add('watch-page');
const main = mountShell({ active: 'live', footer: false, chat: false });
const id = qs('id');
let stopSim = null;
let agoraSession = null;
let muted = true;

function pinnedHtml(s) {
  const p = s.pinnedProductId && db.get('products', s.pinnedProductId);
  if (!p) return '';
  return `
    <div class="pinned" data-pinned>
      <img src="${escapeHtml(safeMediaUrl(p.thumbnail, p.title))}" alt="" onerror="this.onerror=null;this.src='${escapeHtml(safeMediaUrl('', p.title))}'">
      <div class="grow" style="min-width:0">
        <span class="tag">${icon('pin')} Pinned</span>
        <div class="t truncate">${escapeHtml(p.title)}</div>
        <div class="p">${formatPrice(p.price)} ${p.discount ? `<span class="badge badge-sale" style="height:18px">-${p.discount}%</span>` : ''}</div>
      </div>
      <button class="btn btn-live btn-sm" data-buy="${p.id}" ${p.stock <= 0 ? 'disabled' : ''}>${icon('zap')} Buy</button>
    </div>`;
}

function productsHtml(s) {
  return s.productIds.map((pid) => {
    const p = db.get('products', pid);
    if (!p) return '';
    return `<div class="sp-item ${pid === s.pinnedProductId ? 'is-pinned' : ''}">
      <img src="${escapeHtml(safeMediaUrl(p.thumbnail, p.title))}" alt="" onerror="this.onerror=null;this.src='${escapeHtml(safeMediaUrl('', p.title))}'">
      <div class="grow" style="min-width:0"><div class="t clamp-2">${escapeHtml(p.title)}</div><div class="p">${formatPrice(p.price)}</div></div>
      <button class="btn btn-primary btn-xs" data-buy="${p.id}">Buy</button>
    </div>`;
  }).join('');
}

function overlayHtml(s) {
  if (s.status === 'scheduled') {
    const reminded = inList('reminders', s.id);
    return `<div class="player-overlay"><div>
      <span class="badge badge-dark">${icon('calendar')} Scheduled</span>
      <div class="count" data-countdown>${timeUntil(s.scheduledAt)}</div>
      <p style="color:#cbd5e1">Starts ${formatDateTime(s.scheduledAt)}</p>
      <button class="btn ${reminded ? 'btn-soft' : 'btn-primary'} mt-2" data-remind>${icon('bell')} ${reminded ? 'Reminder set' : 'Remind me'}</button>
    </div></div>`;
  }
  return '';
}

async function render() {
  stopSim?.();
  main.innerHTML = loading();
  const s = await getStream(id);
  if (!s) {
    main.innerHTML = `<div class="container page" style="color:#fff">${emptyState('radio', 'Stream not found', '', `<a class="btn btn-primary" href="${routes.live()}">Browse live streams</a>`)}</div>`;
    return;
  }
  const v = vendorSync(s.vendorId);
  const chatHistory = getStreamMessages(s.id);
  document.title = `${s.title} · Live · StreamCart`;
  const statusBadge = s.status === 'live' ? '<span class="badge badge-live">LIVE</span>' : s.status === 'ended' ? '<span class="badge badge-dark">REPLAY</span>' : '';

  main.innerHTML = `
  <div class="watch">
    <div class="watch-left">
      <div class="player">
          ${s.status === 'live' ? '<div class="agora-viewer-stage" data-agora-video></div>' : `<video src="${s.videoUrl || SAMPLE_VIDEOS[1]}" poster="${s.thumbnail}" ${s.status !== 'scheduled' ? 'autoplay' : ''} muted loop playsinline></video>`}
        <div class="shade"></div>
        <div class="player-top">
          ${statusBadge}
          ${s.status === 'live' ? `<span class="badge glass">${icon('eye')} <span data-viewers>${formatNumber(s.viewers)}</span></span>` : ''}
          <span class="badge glass">${icon('heart')} <span data-likes>${formatNumber(s.likes)}</span></span>
          <div class="right"><button class="glass" data-mute aria-label="Sound">${icon('volume-x')}</button><button class="glass" data-share aria-label="Share">${icon('share-2')}</button></div>
        </div>
        <div data-buypop></div>
        <div class="reactions-layer" data-reactions></div>
        <div data-pin-slot>${s.status !== 'scheduled' ? pinnedHtml(s) : ''}</div>
        ${overlayHtml(s)}
      </div>

      <div class="stream-info">
        ${avatar(v.name, { color: v.color })}
        <div class="grow">
          <h1>${escapeHtml(s.title)}</h1>
          <div class="small muted"><a href="${routes.vendor(v.id)}" style="color:#e5e7eb;font-weight:600">${escapeHtml(v.name)}</a> · ${formatNumber(v.followers)} followers</div>
        </div>
        <button class="btn ${isFollowing(v.id) ? 'btn-soft' : 'btn-primary'}" data-follow>${isFollowing(v.id) ? 'Following' : `${icon('plus')} Follow`}</button>
      </div>

      <div class="stream-products">
        <h3>${icon('shopping-bag')} Products in this ${s.status === 'ended' ? 'replay' : 'stream'} (${s.productIds.length})</h3>
        <div class="sp-list" data-products>${productsHtml(s)}</div>
      </div>
    </div>

    <aside class="chat">
      <div class="chat-head"><strong>${icon('message-circle')} Live chat</strong><span class="xs" style="color:#9ca3af">${s.status === 'live' ? 'Be respectful 💙' : s.status === 'ended' ? 'Chat replay' : 'Opens when live'}</span></div>
      <div class="chat-msgs" data-msgs>
        <div class="chat-msg system">${icon('shield-check')} Welcome! Pinned products can be bought without leaving the stream.</div>
      </div>
      ${s.status === 'live' ? `
      <div class="chat-react">${REACTIONS.map((r) => `<button data-react="${r}">${r}</button>`).join('')}</div>
      <form class="chat-form" data-chat-form><input name="text" placeholder="Say something…" maxlength="200" autocomplete="off"><button aria-label="Send">${icon('send')}</button></form>` : ''}
    </aside>
  </div>`;

  bind(s, v);
  if (s.status === 'live') {
    const stage = $('[data-agora-video]');
    try {
      agoraSession = await connectAgora(s.id, 'subscriber', stage, { muted });
    } catch (error) {
      const fallback = document.createElement('video');
      fallback.src = s.videoUrl || SAMPLE_VIDEOS[1];
      fallback.poster = s.thumbnail || '';
      fallback.autoplay = true;
      fallback.muted = true;
      fallback.loop = true;
      fallback.playsInline = true;
      stage.replaceChildren(fallback);
      fallback.play().catch(() => {});
      toast(`${error.message} Showing the replay preview instead.`, 'error');
    }
    startRealtime(s);
  }
  chatHistory.forEach(addChat);
  if (s.status === 'ended' && !chatHistory.length) replayChat();
  if (s.status === 'scheduled') {
    const el = $('[data-countdown]');
    setInterval(() => el && (el.textContent = timeUntil(s.scheduledAt)), 30000);
  }
}

function addChat(m) {
  const box = $('[data-msgs]');
  if (!box) return;
  const me = currentUser();
  const cls = m.role === 'host' ? 'host' : m.role === 'system' ? 'system' : me && m.userId === me.id ? 'me' : '';
  const el = document.createElement('div');
  el.className = `chat-msg ${cls}`;
  el.innerHTML = m.role === 'system'
    ? escapeHtml(m.text)
    : `${avatar(m.userName, { size: 'sm' })}<div>${m.role === 'host' ? '<span class="host-tag">HOST</span>' : ''}<b>${escapeHtml(m.userName)}</b>${escapeHtml(m.text)}</div>`;
  const atBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 60;
  box.appendChild(el);
  while (box.children.length > 120) box.firstElementChild.remove();
  if (atBottom) box.scrollTop = box.scrollHeight;
}

function floatReaction(emoji) {
  const layer = $('[data-reactions]');
  if (!layer) return;
  const el = document.createElement('span');
  el.className = 'reaction';
  el.textContent = emoji;
  el.style.left = `${Math.random() * 30}px`;
  el.style.setProperty('--dx', `${Math.random() * 40 - 20}px`);
  layer.appendChild(el);
  setTimeout(() => el.remove(), 2600);
}

function showBuyPop(name, productTitle) {
  const slot = $('[data-buypop]');
  if (!slot) return;
  slot.innerHTML = `<div class="buy-pop">${avatar(name, { size: 'sm' })} ${escapeHtml(name)} just bought ${escapeHtml(productTitle.split(' ').slice(0, 3).join(' '))} 🛒</div>`;
  setTimeout(() => (slot.innerHTML = ''), 3500);
}

function updatePinned(productId) {
  const s = streamSync(id);
  s.pinnedProductId = productId;
  $('[data-pin-slot]').innerHTML = pinnedHtml(s);
  $('[data-products]').innerHTML = productsHtml(s);
  const p = db.get('products', productId);
  if (p) addChat({ role: 'system', text: `📌 ${p.title} was pinned — tap Buy to order instantly` });
}

function startRealtime(s) {
  const ch = streamChannel(s.id);
  ch.on('chat', addChat)
    .on('reaction', floatReaction)
    .on('pin', updatePinned)
    .on('status', (st) => { if (st === 'ended') { toast('The stream has ended', 'info'); setTimeout(render, 800); } });
  stopSim = CONFIG.USE_MOCK ? simulateAudience(s.id, {
    onChat: addChat,
    onReaction: floatReaction,
    onViewers: (n) => { const el = $('[data-viewers]'); if (el) el.textContent = formatNumber(n); },
    onPurchase: (name) => { const p = db.get('products', streamSync(s.id).pinnedProductId); if (p) showBuyPop(name, p.title); },
  }) : null;
}

function replayChat() {
  ['Hello everyone! 👋', 'Price koto?', 'Just ordered 🛒', 'Amazing quality 🔥', 'Thanks for watching!'].forEach((t, i) =>
    addChat({ userName: i === 4 ? 'Host' : ['Rakib', 'Mim', 'Sabbir', 'Nabila'][i], role: i === 4 ? 'host' : 'viewer', text: t }));
}

function bind(s, v) {
  const video = $('.player video');
  $('[data-mute]').onclick = (e) => {
    muted = !muted;
    if (video) video.muted = muted;
    void agoraSession?.setMuted(muted);
    e.currentTarget.innerHTML = icon(muted ? 'volume-x' : 'volume-2');
  };
  $('[data-share]').onclick = async () => { await navigator.clipboard?.writeText(location.href).catch(() => {}); toast('Stream link copied', 'info'); };
  $('[data-follow]').onclick = async (e) => {
    const btn = e.currentTarget;
    if (!(await ensureLogin('Sign in to follow stores'))) return;
    try {
      const now = await toggleFollow(v.id);
      btn.className = `btn ${now ? 'btn-soft' : 'btn-primary'}`;
      btn.innerHTML = now ? 'Following' : `${icon('plus')} Follow`;
    } catch (error) { toast(error.message, 'error'); }
  };
  $('[data-remind]')?.addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    if (!(await ensureLogin('Sign in to set reminders'))) return;
    const on = toggleInList('reminders', s.id);
    btn.className = `btn ${on ? 'btn-soft' : 'btn-primary'} mt-2`;
    btn.innerHTML = `${icon('bell')} ${on ? 'Reminder set' : 'Remind me'}`;
    toast(on ? "We'll notify you when it starts" : 'Reminder removed', on ? 'success' : 'info');
  });
  $$('[data-react]').forEach((b) => (b.onclick = async () => {
    sendReaction(s.id, b.dataset.react);
    try {
      const result = await toggleStreamLike(s.id);
      const el = $('[data-likes]');
      if (el) el.textContent = formatNumber(result.likes);
    } catch (error) { toast(error.message, 'error'); }
  }));
  $('[data-chat-form]')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = e.target.text;
    const text = input.value.trim();
    if (!text) return;
    const user = await ensureLogin('Sign in to chat');
    if (!user) return;
    try {
      await sendChat(s.id, { userId: user.id, userName: user.name.split(' ')[0], text, role: user.vendorId === s.vendorId ? 'host' : 'viewer' });
      input.value = '';
    } catch (error) { toast(error.message, 'error'); }
  });
}

main.addEventListener('click', (e) => {
  const b = e.target.closest('[data-buy]');
  if (!b) return;
  track('view', { productId: b.dataset.buy });
  openQuickBuy(b.dataset.buy, {
    source: 'live',
    onDone: () => { void sendChat(id, { role: 'system', text: `🎉 ${currentUser()?.name.split(' ')[0]} just placed an order!` }).catch((error) => toast(error.message, 'error')); },
  });
});
window.addEventListener('beforeunload', () => { stopSim?.(); void agoraSession?.close(); });
render();
