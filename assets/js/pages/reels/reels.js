import { mountShell } from '../../components/shell.js';
import { openModal, ensureLogin } from '../../components/modal.js';
import { openQuickBuy } from '../../components/quickBuy.js';
import { toast } from '../../components/toast.js';
import { emptyState, loading } from '../../components/cards.js';
import { routes } from '../../core/routes.js';
import { escapeHtml, icon, qs, $, $$, avatar, formatNumber, formatPrice, timeAgo } from '../../core/utils.js';
import { getReels, isLiked, isSaved, toggleLike, toggleSave, recordShare, recordView, getComments, addComment, reelSync } from '../../services/reels.js';
import { vendorSync, isFollowing, toggleFollow } from '../../services/vendors.js';
import { rankReels, track } from '../../services/ai.js';
import { db } from '../../services/db.js';

document.body.classList.add('reels-page');
const main = mountShell({ active: 'reels', footer: false });
let muted = true;
let reels = [];

function productCardHtml(pid) {
  const p = db.get('products', pid);
  if (!p) return '';
  return `
    <div class="reel-product">
      <img src="${p.thumbnail}" alt="">
      <div class="grow" style="min-width:0">
        <div class="t truncate">${escapeHtml(p.title)}</div>
        <div class="p">${formatPrice(p.price)}${p.originalPrice > p.price ? `<s>${formatPrice(p.originalPrice)}</s>` : ''}</div>
      </div>
      <button class="btn btn-primary" data-buy="${p.id}" ${p.stock <= 0 ? 'disabled' : ''}>${p.stock > 0 ? `${icon('shopping-bag')}<span class="lbl">Buy now</span>` : 'Sold out'}</button>
    </div>`;
}

function reelHtml(r) {
  const v = vendorSync(r.vendorId);
  const following = isFollowing(v.id);
  return `
  <section class="reel" data-reel="${r.id}">
    <div class="reel-stage">
      <div class="reel-progress"></div>
      <video src="${r.videoUrl}" poster="${r.poster}" loop playsinline muted preload="metadata"></video>
      <div class="reel-top">
        <span class="badge" style="background:rgba(0,0,0,.4);color:#fff">${icon('eye')} ${formatNumber(r.views)}</span>
        <button class="glass" data-mute aria-label="Toggle sound">${icon(muted ? 'volume-x' : 'volume-2')}</button>
      </div>
      <div class="reel-paused"><span>${icon('play')}</span></div>
      <div class="reel-bottom">
        <div class="reel-author">
          ${avatar(v.name, { size: 'sm', color: v.color })}
          <a href="${routes.vendor(v.id)}">${escapeHtml(v.name)}</a>
          ${v.verified ? `<span style="color:#60a5fa">${icon('badge-check')}</span>` : ''}
          <button class="follow ${following ? 'on' : ''}" data-follow="${v.id}">${following ? 'Following' : 'Follow'}</button>
        </div>
        <p class="reel-caption">${escapeHtml(r.caption)}</p>
        <div class="reel-products ${r.productIds.length > 1 ? 'multi' : ''}">${r.productIds.map(productCardHtml).join('')}</div>
      </div>
    </div>
    <div class="reel-actions">
      <button class="reel-act ${isLiked(r.id) ? 'liked' : ''}" data-like><span class="c">${icon('heart')}</span><span data-n="likes">${formatNumber(r.likes)}</span></button>
      <button class="reel-act" data-comments><span class="c">${icon('message-circle')}</span><span data-n="comments">${formatNumber(r.comments)}</span></button>
      <button class="reel-act ${isSaved(r.id) ? 'saved' : ''}" data-save><span class="c">${icon('bookmark')}</span><span data-n="saves">${formatNumber(r.saves)}</span></button>
      <button class="reel-act" data-share><span class="c">${icon('send')}</span><span data-n="shares">${formatNumber(r.shares)}</span></button>
      <button class="reel-act shop" data-shop><span class="c">${icon('shopping-bag')}</span><span>Shop</span></button>
    </div>
  </section>`;
}

function refreshCounts(section) {
  const r = reelSync(section.dataset.reel);
  ['likes', 'comments', 'saves', 'shares'].forEach((k) => ($(`[data-n="${k}"]`, section).textContent = formatNumber(r[k])));
}

async function openComments(reelId, section) {
  const m = openModal({ title: 'Comments', variant: window.innerWidth < 900 ? 'sheet' : 'drawer-right', content: loading() });
  const render = async () => {
    const list = await getComments(reelId);
    m.body.innerHTML = `
      <form class="row mb-2" data-cform style="gap:8px"><input class="input" name="text" placeholder="Add a comment…" required><button class="btn btn-primary btn-icon">${icon('send')}</button></form>
      <div class="comments-list">${list.length ? list.map((c) => `
        <div class="comment">${avatar(c.userName, { size: 'sm' })}<div><b>${escapeHtml(c.userName)}</b> <span class="xs muted">${timeAgo(c.createdAt)}</span><p>${escapeHtml(c.text)}</p></div></div>`).join('') : '<p class="muted center">No comments yet. Be the first!</p>'}</div>`;
    $('[data-cform]', m.body).onsubmit = async (e) => {
      e.preventDefault();
      if (!(await ensureLogin('Sign in to comment'))) return;
      await addComment(reelId, e.target.text.value.trim());
      refreshCounts(section);
      render();
    };
  };
  render();
}

function openShopList(r) {
  if (r.productIds.length === 1) return openQuickBuy(r.productIds[0], { source: 'reel' });
  const m = openModal({
    title: `Shop this reel (${r.productIds.length})`,
    variant: 'sheet',
    content: `<div class="stack">${r.productIds.map((pid) => {
      const p = db.get('products', pid);
      return p ? `<div class="row" style="gap:12px"><img src="${p.thumbnail}" style="width:56px;height:56px;border-radius:10px;background:var(--surface-2);object-fit:contain"><div class="grow"><div class="small bold clamp-2">${escapeHtml(p.title)}</div><b class="text-primary">${formatPrice(p.price)}</b></div><button class="btn btn-primary btn-sm" data-pick="${p.id}">Buy</button></div>` : '';
    }).join('')}</div>`,
  });
  $$('[data-pick]', m.body).forEach((b) => (b.onclick = () => { m.close(); openQuickBuy(b.dataset.pick, { source: 'reel' }); }));
}

function heartBurst(stage, x, y) {
  const h = document.createElement('div');
  h.className = 'heart-burst';
  h.style.left = `${x}px`;
  h.style.top = `${y}px`;
  h.innerHTML = icon('heart');
  stage.appendChild(h);
  setTimeout(() => h.remove(), 800);
}

function setLiked(section, liked) {
  $('[data-like]', section).classList.toggle('liked', liked);
  refreshCounts(section);
}

function bindReel(section) {
  const r = reels.find((x) => x.id === section.dataset.reel);
  const video = $('video', section);
  const stage = $('.reel-stage', section);
  const progress = $('.reel-progress', section);

  video.addEventListener('timeupdate', () => { if (video.duration) progress.style.width = `${(video.currentTime / video.duration) * 100}%`; });

  let lastTap = 0;
  stage.addEventListener('click', async (e) => {
    if (e.target.closest('button, a, .reel-product')) return;
    const now = Date.now();
    if (now - lastTap < 300) {
      const rect = stage.getBoundingClientRect();
      heartBurst(stage, e.clientX - rect.left, e.clientY - rect.top);
      if (!isLiked(r.id) && (await ensureLogin('Sign in to like reels'))) { toggleLike(r.id); track('like', { productId: r.productIds[0] }); setLiked(section, true); }
      lastTap = 0;
      return;
    }
    lastTap = now;
    setTimeout(() => {
      if (lastTap !== now) return;
      if (video.paused) { video.play().catch(() => {}); section.classList.remove('is-paused'); }
      else { video.pause(); section.classList.add('is-paused'); }
    }, 280);
  });

  $('[data-mute]', section).onclick = () => {
    muted = !muted;
    $$('.reel video').forEach((vid) => (vid.muted = muted));
    $$('[data-mute]').forEach((b) => (b.innerHTML = icon(muted ? 'volume-x' : 'volume-2')));
  };
  $('[data-like]', section).onclick = async () => {
    if (!(await ensureLogin('Sign in to like reels'))) return;
    const now = toggleLike(r.id);
    if (now) track('like', { productId: r.productIds[0] });
    setLiked(section, now);
  };
  $('[data-save]', section).onclick = async (e) => {
    const btn = e.currentTarget;
    if (!(await ensureLogin('Sign in to save reels'))) return;
    const now = toggleSave(r.id);
    btn.classList.toggle('saved', now);
    refreshCounts(section);
    toast(now ? 'Saved to your collection' : 'Removed from saved', now ? 'success' : 'info', now ? { action: 'View', href: routes.saved() } : {});
  };
  $('[data-share]', section).onclick = async () => {
    const link = new URL(routes.reels(r.id), location.href).href;
    if (navigator.share) navigator.share({ title: 'StreamCart reel', text: r.caption, url: link }).catch(() => {});
    else await navigator.clipboard?.writeText(link).catch(() => {});
    recordShare(r.id);
    refreshCounts(section);
    toast('Reel link copied — share it anywhere!', 'info');
  };
  $('[data-comments]', section).onclick = () => openComments(r.id, section);
  $('[data-shop]', section).onclick = () => openShopList(r);
  $$('[data-buy]', section).forEach((b) => (b.onclick = () => { video.pause(); openQuickBuy(b.dataset.buy, { source: 'reel' }); }));
  $('[data-follow]', section).onclick = async (e) => {
    if (!(await ensureLogin('Sign in to follow stores'))) return;
    const now = toggleFollow(e.currentTarget.dataset.follow);
    $$(`[data-follow="${r.vendorId}"]`).forEach((b) => { b.classList.toggle('on', now); b.textContent = now ? 'Following' : 'Follow'; });
  };
}

function observe(feed) {
  const seen = new Set();
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      const video = $('video', en.target);
      if (en.isIntersecting && en.intersectionRatio > 0.6) {
        video.muted = muted;
        video.currentTime = 0;
        video.play().catch(() => en.target.classList.add('is-paused'));
        en.target.classList.remove('is-paused');
        const id = en.target.dataset.reel;
        history.replaceState(null, '', routes.reels(id));
        if (!seen.has(id)) {
          seen.add(id);
          recordView(id);
          track('reel_watch', { productId: reelSync(id)?.productIds[0] });
        }
      } else {
        video.pause();
      }
    });
  }, { root: feed, threshold: [0, 0.6, 1] });
  $$('.reel', feed).forEach((s) => io.observe(s));
}

async function init() {
  main.innerHTML = `<div class="reels-feed">${loading()}</div>`;
  const all = await getReels();
  const startId = qs('id');
  reels = rankReels(all);
  if (startId) {
    const i = reels.findIndex((r) => r.id === startId);
    if (i > 0) reels.unshift(...reels.splice(i, 1));
  }
  if (!reels.length) {
    main.innerHTML = `<div class="container page" style="color:#fff">${emptyState('clapperboard', 'No reels yet', 'Check back soon!')}</div>`;
    return;
  }
  main.innerHTML = `
    <div class="reels-feed" data-feed>${reels.map(reelHtml).join('')}</div>
    <div class="reels-nav"><button data-prev aria-label="Previous">${icon('chevron-up')}</button><button data-next aria-label="Next">${icon('chevron-down')}</button></div>
    <div class="reels-hint"><span class="kbd">↑</span><span class="kbd">↓</span> navigate · double-tap to like · tap product to buy</div>`;
  const feed = $('[data-feed]');
  $$('.reel', feed).forEach(bindReel);
  observe(feed);
  const go = (dir) => feed.scrollBy({ top: dir * feed.clientHeight, behavior: 'smooth' });
  $('[data-prev]').onclick = () => go(-1);
  $('[data-next]').onclick = () => go(1);
  document.addEventListener('keydown', (e) => {
    if (document.querySelector('.overlay') || e.target.matches('input, textarea')) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); go(1); }
    if (e.key === 'ArrowUp') { e.preventDefault(); go(-1); }
  });
}

init();
