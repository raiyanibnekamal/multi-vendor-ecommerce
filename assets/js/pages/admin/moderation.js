import { mountDashboard } from '../../components/dashboardLayout.js';
import { openModal } from '../../components/modal.js';
import { toast } from '../../components/toast.js';
import { emptyState } from '../../components/cards.js';
import { escapeHtml, icon, avatar, formatNumber, timeAgo, statusBadge, $, $$ } from '../../core/utils.js';
import { updateReel, deleteReel } from '../../services/reels.js';
import { db } from '../../services/db.js';
import { resolveMediaUrl } from '../../services/storage.js';
import { reviewReelWithAI } from '../../services/ai.js';

const el = mountDashboard({ role: 'admin', active: 'moderation', title: 'Content moderation' });
let tab = 'queue';
const FLAG_WORDS = /fake|scam|replica|copy|cheap price guaranteed|100% cure/i;
const aiReviews = new Map();

function aiReview(r) {
  if (aiReviews.has(r.id)) return aiReviews.get(r.id);
  const flags = [];
  if (FLAG_WORDS.test(r.caption)) flags.push('Caption contains risky claim words');
  if (!r.productIds.length) flags.push('No products tagged');
  if (r.productIds.some((id) => !db.get('products', id))) flags.push('Tagged product no longer exists');
  if (r.status === 'flagged') flags.push(r.flagReason || 'Reported by viewers');
  return { flags, score: Math.max(8, 96 - flags.length * 27) };
}

function card(r) {
  const v = db.get('vendors', r.vendorId);
  const ai = aiReview(r);
  const products = r.productIds.map((id) => db.get('products', id)).filter(Boolean);
  return `<div class="card mod-card">
    <button class="mod-media" data-preview="${r.id}">
      <img src="${r.poster}" alt="">
      <span style="position:absolute;inset:0;display:grid;place-items:center;color:#fff">${icon('circle-play')}</span>
    </button>
    <div class="card-body stack grow" style="gap:10px;min-width:0">
      <div class="row-between"><div class="row">${avatar(v?.name || '?', { size: 'sm', color: v?.color })}<div><b class="small">${escapeHtml(v?.name || 'Unknown')}</b><div class="xs muted">${timeAgo(r.createdAt)} · ${formatNumber(r.views)} views</div></div></div>${statusBadge(r.status)}</div>
      <p class="small">${escapeHtml(r.caption)}</p>
      <div class="row wrap" style="gap:6px">${products.map((p) => `<span class="badge">${icon('tag')} ${escapeHtml(p.title.slice(0, 28))}</span>`).join('') || '<span class="xs muted">No products tagged</span>'}</div>
      <div class="notice ${ai.flags.length ? 'warning' : 'success'}" style="padding:10px 12px">${icon('sparkles')}<div class="small"><b>AI safety score ${ai.score}/100</b>${ai.flags.length ? `<div class="xs">${ai.flags.map(escapeHtml).join(' · ')}</div>` : '<div class="xs">No policy issues detected</div>'}</div></div>
      <div class="row wrap">
        <button class="btn btn-soft btn-sm" data-ai-review="${r.id}">${icon('sparkles')} Groq review</button>
        ${r.status !== 'approved' ? `<button class="btn btn-success btn-sm" data-act="approved" data-id="${r.id}">${icon('check')} Approve</button>` : ''}
        ${r.status !== 'rejected' ? `<button class="btn btn-outline btn-sm" data-act="rejected" data-id="${r.id}">${icon('x')} Reject</button>` : ''}
        <button class="btn btn-ghost btn-sm text-danger" data-del="${r.id}">${icon('trash-2')} Remove</button>
      </div>
    </div>
  </div>`;
}

function render() {
  const all = db.all('reels');
  const queue = all.filter((r) => r.status === 'pending' || r.status === 'flagged');
  const list = tab === 'queue' ? queue : tab === 'all' ? all : all.filter((r) => r.status === tab);
  const comments = db.all('reelComments').filter((c) => FLAG_WORDS.test(c.text) || c.flagged);
  el.innerHTML = `
    <div class="dash-head"><div><h2>Content moderation</h2><p>Review reels before they reach the feed. AI pre-screens every upload.</p></div></div>
    <div class="tabs mb-2">${[['queue', `Review queue`, queue.length], ['approved', 'Approved'], ['rejected', 'Rejected'], ['all', 'All reels', all.length]].map(([k, l, n]) => `<button class="tab ${tab === k ? 'active' : ''}" data-tab="${k}">${l}${n != null ? ` <span class="badge">${n}</span>` : ''}</button>`).join('')}</div>
    ${list.length ? `<div class="mod-grid">${list.map(card).join('')}</div>`
      : `<div class="card">${emptyState('shield-check', tab === 'queue' ? 'All caught up!' : 'Nothing here', tab === 'queue' ? 'No reels are waiting for review.' : '')}</div>`}
    <div class="card mt-3"><div class="card-head"><h3>${icon('message-square-warning')} Flagged comments</h3><span class="small muted">${comments.length}</span></div>
      ${comments.map((c) => `<div class="feed-item"><div class="grow"><b class="small">${escapeHtml(c.userName)}</b> <span class="small">${escapeHtml(c.text)}</span><div class="xs muted">on reel ${c.reelId}</div></div><button class="btn btn-ghost btn-xs text-danger" data-cdel="${c.id}">Delete</button></div>`).join('') || '<p class="small muted card-body">No flagged comments.</p>'}
    </div>`;

  $$('[data-tab]').forEach((b) => (b.onclick = () => { tab = b.dataset.tab; render(); }));
  $$('[data-act]').forEach((b) => (b.onclick = async () => {
    await updateReel(b.dataset.id, { status: b.dataset.act });
    toast(b.dataset.act === 'approved' ? 'Reel approved — now live in the feed' : 'Reel rejected', b.dataset.act === 'approved' ? 'success' : 'info');
    render();
  }));
  $$('[data-ai-review]').forEach((b) => (b.onclick = async () => {
    const reel = db.get('reels', b.dataset.aiReview);
    b.disabled = true;
    b.textContent = 'Reviewing…';
    const review = await reviewReelWithAI(reel);
    if (!review) {
      toast('AI review unavailable. Check the Groq server configuration.', 'error');
      b.disabled = false;
      b.innerHTML = `${icon('sparkles')} Groq review`;
      return;
    }
    aiReviews.set(reel.id, review);
    toast('AI review complete. Please make the final moderation decision.', 'success');
    render();
  }));
  $$('[data-del]').forEach((b) => (b.onclick = async () => { await deleteReel(b.dataset.del); toast('Reel removed', 'info'); render(); }));
  $$('[data-cdel]').forEach((b) => (b.onclick = () => { db.remove('reelComments', b.dataset.cdel); toast('Comment deleted', 'info'); render(); }));
  $$('[data-preview]').forEach((b) => (b.onclick = async () => {
    const r = db.get('reels', b.dataset.preview);
    const videoUrl = await resolveMediaUrl(r.videoUrl);
    openModal({ title: 'Preview', size: 'sm', content: `<video ${videoUrl ? `src="${videoUrl}"` : ''} poster="${r.poster}" controls autoplay playsinline style="width:100%;aspect-ratio:9/16;background:#000;border-radius:12px;object-fit:cover"></video>` });
  }));
}

if (el) render();
