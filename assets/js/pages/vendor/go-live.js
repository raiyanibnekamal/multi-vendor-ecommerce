import { mountDashboard } from '../../components/dashboardLayout.js';
import { openModal, confirmDialog } from '../../components/modal.js';
import { toast } from '../../components/toast.js';
import { routes } from '../../core/routes.js';
import { escapeHtml, icon, qs, formatPrice, formatNumber, avatar, $, $$ } from '../../core/utils.js';
import { streamSync, scheduleStream, startStream, endStream, pinProduct, sendChat, streamChannel, simulateAudience } from '../../services/live.js';
import { SAMPLE_VIDEOS } from '../../services/reels.js';
import { channel } from '../../services/realtime.js';
import { db } from '../../services/db.js';
import { CONFIG } from '../../core/config.js';

const el = mountDashboard({ role: 'vendor', active: 'go-live', title: 'Go live studio' });
let stream = null;
let media = null;
let stopSim = null;
let timer = null;
const stats = { likes: 0, orders: 0, revenue: 0, peak: 0 };

function myProducts() {
  return db.where('products', (p) => p.vendorId === el.vendor.id && p.status === 'active');
}

async function startCamera(video, note) {
  try {
    media = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 }, audio: true });
    video.srcObject = media;
    video.muted = true;
    await video.play();
    note.textContent = 'Camera & mic connected';
  } catch {
    video.srcObject = null;
    video.src = SAMPLE_VIDEOS[1];
    video.loop = true;
    video.muted = true;
    video.play().catch(() => {});
    note.textContent = 'Camera unavailable — using a demo feed';
  }
}

function stopCamera() {
  media?.getTracks().forEach((t) => t.stop());
  media = null;
}

// ---------- Setup screen ----------
function renderSetup() {
  const pre = qs('id') ? streamSync(qs('id')) : null;
  const products = myProducts();
  const selected = new Set(pre?.productIds || products.slice(0, 3).map((p) => p.id));
  el.innerHTML = `
    <div class="dash-grid" style="margin-top:0">
      <div class="card" style="overflow:hidden">
        <div style="position:relative;aspect-ratio:16/9;background:#0f172a">
          <video data-preview playsinline style="width:100%;height:100%;object-fit:cover"></video>
          <div style="position:absolute;left:14px;top:14px" class="badge badge-dark" data-cam-note>Camera off</div>
        </div>
        <div class="card-body row wrap">
          <button class="btn btn-outline" data-cam>${icon('camera')} Test camera</button>
          <span class="small muted">Video is broadcast via ${'Agora/LiveKit'} in production. Chat, reactions and pins sync through Supabase Realtime.</span>
        </div>
      </div>
      <form class="card" data-f>
        <div class="card-head"><h3>Stream setup</h3></div>
        <div class="card-body stack">
          <div class="field"><label>Title</label><input class="input" name="title" required value="${escapeHtml(pre?.title || '')}" placeholder="e.g. Flash sale — live demo & giveaways"></div>
          <div class="field"><label>Products to feature</label>
            <input class="input mb-1" placeholder="Filter products" data-filter>
            <div style="max-height:300px;overflow:auto;border:1px solid var(--border);border-radius:10px;padding:8px" class="stack" data-plist>
              ${products.map((p) => `<label class="check" data-name="${escapeHtml(p.title.toLowerCase())}"><input type="checkbox" name="p" value="${p.id}" ${selected.has(p.id) ? 'checked' : ''}><img src="${p.thumbnail}" style="width:32px;height:32px;border-radius:6px;background:var(--surface-2);object-fit:contain"><span class="small grow">${escapeHtml(p.title)}</span><span class="xs muted">${formatPrice(p.price)}</span></label>`).join('')}
            </div></div>
          <label class="check"><input type="checkbox" checked> Notify my ${formatNumber(el.vendor.followers)} followers</label>
          ${el.vendor.status !== 'approved' ? `<div class="notice warning">${icon('clock')}<div>Your store must be approved before going live.</div></div>` : ''}
          <button class="btn btn-live btn-lg" ${el.vendor.status !== 'approved' ? 'disabled' : ''}>${icon('radio')} Go live</button>
        </div>
      </form>
    </div>`;
  $('[data-cam]').onclick = () => startCamera($('[data-preview]'), $('[data-cam-note]'));
  $('[data-filter]').oninput = (e) => $$('[data-name]').forEach((l) => l.classList.toggle('hidden', !l.dataset.name.includes(e.target.value.toLowerCase())));
  $('[data-f]').onsubmit = async (e) => {
    e.preventDefault();
    const f = e.target;
    const ids = [...f.querySelectorAll('[name=p]:checked')].map((c) => c.value);
    if (!ids.length) return toast('Select at least one product to feature', 'error');
    let s = pre;
    if (s) {
      try { await db.updateAndSync('streams', s.id, { title: f.title.value.trim(), productIds: ids, pinnedProductId: ids[0] }); }
      catch (error) { return toast(error.message, 'error'); }
    }
    else {
      const first = db.get('products', ids[0]);
      s = await scheduleStream({ vendorId: el.vendor.id, title: f.title.value.trim(), scheduledAt: new Date().toISOString(), productIds: ids, categoryId: first.categoryId, thumbnail: first.images[0] || first.thumbnail });
    }
    stopCamera();
    stream = await startStream(s.id);
    toast("You're live! 🔴");
    renderStudio();
  };
}

// ---------- Live studio ----------
function productList() {
  const s = streamSync(stream.id);
  return s.productIds.map((pid) => {
    const p = db.get('products', pid);
    if (!p) return '';
    const pinned = s.pinnedProductId === pid;
    return `<div class="feed-item" style="${pinned ? 'background:#fef2f2' : ''}">
      <img src="${p.thumbnail}" style="width:44px;height:44px;border-radius:8px;background:var(--surface-2);object-fit:contain">
      <div class="grow" style="min-width:0"><div class="small bold truncate">${escapeHtml(p.title)}</div><div class="xs muted">${formatPrice(p.price)} · ${p.stock} in stock</div></div>
      <button class="btn btn-sm ${pinned ? 'btn-live' : 'btn-outline'}" data-pin="${pid}">${icon('pin')} ${pinned ? 'Pinned' : 'Pin'}</button>
    </div>`;
  }).join('');
}

function addChat(m) {
  const box = $('[data-chat]');
  if (!box) return;
  const div = document.createElement('div');
  div.className = 'row';
  div.style.cssText = 'align-items:flex-start;gap:8px;font-size:13.5px';
  div.innerHTML = m.role === 'system'
    ? `<span class="xs text-success">${escapeHtml(m.text)}</span>`
    : `${avatar(m.userName, { size: 'sm' })}<div>${m.role === 'host' ? '<span class="badge badge-live" style="height:18px;font-size:10px">HOST</span> ' : ''}<b class="small">${escapeHtml(m.userName)}</b> <span>${escapeHtml(m.text)}</span></div>`;
  box.appendChild(div);
  while (box.children.length > 100) box.firstElementChild.remove();
  box.scrollTop = box.scrollHeight;
}

function renderStudio() {
  const s = streamSync(stream.id);
  const started = new Date(s.startedAt).getTime();
  el.innerHTML = `
    <div class="dash-head">
      <div class="row"><span class="badge badge-live">LIVE</span><h2>${escapeHtml(s.title)}</h2></div>
      <div class="row"><a class="btn btn-outline btn-sm" href="${routes.watch(s.id)}" target="_blank">${icon('external-link')} Open viewer page</a><button class="btn btn-danger" data-end>${icon('square')} End stream</button></div>
    </div>
    <div class="stats">
      <div class="stat"><span class="ic red">${icon('clock')}</span><div><div class="lbl">Duration</div><div class="val" data-dur>00:00</div></div></div>
      <div class="stat"><span class="ic violet">${icon('users')}</span><div><div class="lbl">Viewers</div><div class="val" data-viewers>${formatNumber(s.viewers || 0)}</div></div></div>
      <div class="stat"><span class="ic">${icon('heart')}</span><div><div class="lbl">Reactions</div><div class="val" data-likes>0</div></div></div>
      <div class="stat"><span class="ic green">${icon('shopping-bag')}</span><div><div class="lbl">Live orders</div><div class="val" data-orders>0</div><div class="xs muted" data-revenue>${formatPrice(0)}</div></div></div>
    </div>
    <div class="dash-grid">
      <div class="stack" style="gap:16px">
        <div class="card" style="overflow:hidden">
          <div style="position:relative;aspect-ratio:16/9;background:#000">
            <video data-cam playsinline style="width:100%;height:100%;object-fit:cover"></video>
            <span class="badge badge-dark" style="position:absolute;left:14px;top:14px" data-cam-note>Connecting…</span>
          </div>
          <div class="card-body row">
            <button class="btn btn-outline btn-sm" data-mic>${icon('mic')} Mute</button>
            <button class="btn btn-outline btn-sm" data-camtoggle>${icon('video')} Camera</button>
            <span class="small muted" style="margin-left:auto">Tip: pin a product while you demo it — viewers can buy in one tap.</span>
          </div>
        </div>
        <div class="card"><div class="card-head"><h3>${icon('shopping-bag')} Products — tap to pin</h3></div><div data-products>${productList()}</div></div>
      </div>
      <div class="card" style="display:flex;flex-direction:column;height:640px">
        <div class="card-head"><h3>${icon('message-circle')} Live chat</h3><span class="badge badge-success">${icon('radio')} Realtime</span></div>
        <div data-chat style="flex:1;overflow-y:auto;padding:14px 16px;display:flex;flex-direction:column;gap:10px"></div>
        <div class="chips" style="padding:0 12px 8px">${['Thanks for joining! 👋', 'Use code LIVE50 for ৳50 off', 'Link is pinned below 📌', 'Cash on delivery available ✅'].map((t) => `<button class="chip" style="height:28px;font-size:12px" data-quick="${escapeHtml(t)}">${escapeHtml(t)}</button>`).join('')}</div>
        <form class="row" style="padding:12px;border-top:1px solid var(--border)" data-chat-form><input class="input" name="text" placeholder="Reply as host…" autocomplete="off"><button class="btn btn-primary btn-icon">${icon('send')}</button></form>
      </div>
    </div>`;

  startCamera($('[data-cam]'), $('[data-cam-note]'));
  timer = setInterval(() => {
    const sec = Math.floor((Date.now() - started) / 1000);
    const pad = (n) => String(n).padStart(2, '0');
    $('[data-dur]').textContent = `${sec >= 3600 ? Math.floor(sec / 3600) + ':' : ''}${pad(Math.floor((sec % 3600) / 60))}:${pad(sec % 60)}`;
  }, 1000);

  const ch = streamChannel(s.id);
  ch.on('chat', (m) => { if (!m.fromStudio) addChat(m); });
  ch.on('reaction', () => { stats.likes++; $('[data-likes]').textContent = formatNumber(stats.likes); });
  channel('orders').on('order:new', (o) => {
    const mine = o.items.filter((it) => it.vendorId === el.vendor.id);
    if (!mine.length || o.source !== 'live') return;
    stats.orders++;
    stats.revenue += mine.reduce((sum, it) => sum + it.price * it.qty, 0);
    $('[data-orders]').textContent = stats.orders;
    $('[data-revenue]').textContent = formatPrice(stats.revenue);
    addChat({ role: 'system', text: `🛒 New order from ${o.customerName} — ${formatPrice(o.total)}` });
    toast(`Live order from ${o.customerName}!`);
  });
  stopSim = simulateAudience(s.id, {
    onChat: addChat,
    onReaction: () => { stats.likes++; $('[data-likes]').textContent = formatNumber(stats.likes); },
    onViewers: (n) => {
      stats.peak = Math.max(stats.peak, n);
      $('[data-viewers]').textContent = formatNumber(n);
      if (CONFIG.USE_MOCK) db.updateLocal('streams', s.id, { viewers: n });
    },
  });

  const reply = async (text) => {
    try {
      const message = await sendChat(s.id, { userId: el.user.id, userName: el.vendor.name, text, role: 'host', fromStudio: true });
      addChat(message);
    } catch (error) { toast(error.message, 'error'); }
  };
  $('[data-chat-form]').onsubmit = async (e) => { e.preventDefault(); const t = e.target.text.value.trim(); if (t) await reply(t); e.target.text.value = ''; };
  $$('[data-quick]').forEach((b) => (b.onclick = async () => reply(b.dataset.quick)));
  $('[data-products]').onclick = async (e) => {
    const b = e.target.closest('[data-pin]');
    if (!b) return;
    try {
      await pinProduct(s.id, b.dataset.pin);
      $('[data-products]').innerHTML = productList();
      addChat({ role: 'system', text: `📌 Pinned ${db.get('products', b.dataset.pin).title} for viewers` });
    } catch (error) { toast(error.message, 'error'); }
  };
  $('[data-mic]').onclick = (e) => {
    const track = media?.getAudioTracks()[0];
    if (track) track.enabled = !track.enabled;
    e.currentTarget.innerHTML = track && !track.enabled ? `${icon('mic-off')} Unmute` : `${icon('mic')} Mute`;
  };
  $('[data-camtoggle]').onclick = () => { const t = media?.getVideoTracks()[0]; if (t) t.enabled = !t.enabled; };
  $('[data-end]').onclick = async () => {
    if (!(await confirmDialog({ title: 'End live stream?', message: 'Viewers will see the stream has ended. A replay will be available.', confirmText: 'End stream', danger: true }))) return;
    const duration = $('[data-dur]').textContent;
    stopSim?.();
    clearInterval(timer);
    stopCamera();
    await endStream(s.id);
    if (CONFIG.USE_MOCK) db.updateLocal('streams', s.id, { peakViewers: stats.peak, likes: (s.likes || 0) + stats.likes });
    const m = openModal({
      title: 'Stream summary',
      content: `<div class="stats">
        <div class="stat"><div><div class="lbl">Duration</div><div class="val">${duration}</div></div></div>
        <div class="stat"><div><div class="lbl">Peak viewers</div><div class="val">${formatNumber(stats.peak)}</div></div></div>
        <div class="stat"><div><div class="lbl">Orders</div><div class="val">${stats.orders}</div></div></div>
        <div class="stat"><div><div class="lbl">Revenue</div><div class="val">${formatPrice(stats.revenue)}</div></div></div>
      </div>`,
      footer: `<a class="btn btn-primary" href="${routes.vendorDash('live')}">Done</a>`,
      onClose: () => (location.href = routes.vendorDash('live')),
    });
  };
}

if (el) {
  const existing = db.where('streams', (s) => s.vendorId === el.vendor.id && s.status === 'live')[0];
  if (existing) { stream = existing; renderStudio(); }
  else renderSetup();
  window.addEventListener('beforeunload', () => { stopSim?.(); stopCamera(); });
}
