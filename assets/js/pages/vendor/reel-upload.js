import { mountDashboard } from '../../components/dashboardLayout.js';
import { toast } from '../../components/toast.js';
import { routes } from '../../core/routes.js';
import { escapeHtml, icon, formatPrice, debounce, $, $$ } from '../../core/utils.js';
import { createReel, SAMPLE_VIDEOS } from '../../services/reels.js';
import { uploadFile } from '../../services/storage.js';
import { suggestTags } from '../../services/ai.js';
import { db } from '../../services/db.js';

const el = mountDashboard({ role: 'vendor', active: 'reels', title: 'New reel' });
let tagged = [];
let videoFile = null;
let previewUrl = null;
let sampleIndex = 0;

function render() {
  el.innerHTML = `
    <a class="small muted row mb-2" href="${routes.vendorDash('reels')}">${icon('arrow-left')} Back to reels</a>
    <div class="dash-grid" style="margin-top:0;grid-template-columns:1.2fr 1fr">
      <div class="stack" style="gap:16px">
        <div class="card"><div class="card-head"><h3>1. Upload video</h3><span class="xs muted">Vertical 9:16 · max 60s</span></div><div class="card-body stack">
          <label class="dropzone" data-drop>
            <div class="ic">${icon('upload')}</div><b>Drop a video or click to upload</b><div class="small muted">MP4 / WebM / MOV. Stored in Supabase Storage in production.</div>
            <input type="file" accept="video/*" hidden data-file>
          </label>
          <div class="row"><span class="small muted">No video handy?</span><button type="button" class="btn btn-outline btn-sm" data-sample>${icon('film')} Use a sample clip</button><button type="button" class="btn btn-outline btn-sm" data-record>${icon('camera')} Record</button></div>
        </div></div>

        <div class="card"><div class="card-head"><h3>2. Caption</h3></div><div class="card-body">
          <textarea class="textarea" data-caption maxlength="220" placeholder="Describe your reel. Mention products, e.g. 'Unboxing the new Samsung phone + earbuds #tech'"></textarea>
          <div class="row-between mt-1"><span class="hint">Hashtags help discovery</span><span class="hint" data-count>0/220</span></div>
        </div></div>

        <div class="card">
          <div class="card-head"><h3>3. Tag products</h3><button type="button" class="btn btn-gradient btn-sm" data-ai>${icon('sparkles')} Auto-tag with AI</button></div>
          <div class="card-body stack">
            <div data-ai-result></div>
            <div class="input-group">${icon('search')}<input class="input" placeholder="Search your products to tag manually" data-search></div>
            <div data-search-results class="stack" style="gap:6px"></div>
            <div><div class="label mb-1">Tagged (${'<span data-tag-count>0</span>'}/5)</div><div class="stack" style="gap:6px" data-tagged></div></div>
          </div>
        </div>
      </div>

      <div class="stack" style="gap:16px">
        <div class="card card-pad" style="position:sticky;top:80px">
          <h3 class="mb-2">Preview</h3>
          <div class="reel-thumb" style="max-width:260px;margin:0 auto" data-preview>
            <div class="center" style="position:absolute;inset:0;display:grid;place-items:center;color:#94a3b8;z-index:0">${icon('video')}<br><span class="small">Your video preview</span></div>
          </div>
          <label class="check mt-2"><input type="checkbox" checked data-comments> Allow comments</label><br>
          <label class="check mt-1"><input type="checkbox" checked> Share to followers' feed</label>
          <div class="notice mt-2">${icon('shield-check')}<div>New reels are reviewed by our moderation team before appearing in the public feed.</div></div>
          <button class="btn btn-primary btn-lg btn-block mt-2" data-post>${icon('send')} Post reel</button>
        </div>
      </div>
    </div>`;
  bind();
  renderTagged();
}

function setPreview(src) {
  if (previewUrl?.startsWith('blob:') && previewUrl !== src) URL.revokeObjectURL(previewUrl);
  previewUrl = src;
  const p = $('[data-preview]');
  p.innerHTML = `<video src="${src}" autoplay muted loop playsinline style="opacity:1"></video>
    <div class="bottom" style="z-index:2"><p class="clamp-2" data-prev-caption>${escapeHtml($('[data-caption]').value)}</p>
      ${tagged[0] ? `<div class="row mt-1" style="background:#fff;color:#0f172a;padding:6px;border-radius:10px;gap:6px"><img src="${db.get('products', tagged[0]).thumbnail}" style="width:32px;height:32px;border-radius:6px;object-fit:contain;opacity:1"><span class="xs bold truncate">${escapeHtml(db.get('products', tagged[0]).title)}</span></div>` : ''}</div>`;
}

function productRow(p, action) {
  return `<div class="row" style="gap:10px;padding:8px;border:1px solid var(--border);border-radius:10px">
    <img src="${p.thumbnail}" style="width:40px;height:40px;border-radius:8px;background:var(--surface-2);object-fit:contain">
    <div class="grow" style="min-width:0"><div class="small bold truncate">${escapeHtml(p.title)}</div><div class="xs muted">${formatPrice(p.price)} · ${p.stock} in stock</div></div>${action}</div>`;
}

function renderTagged() {
  $('[data-tag-count]').textContent = tagged.length;
  $('[data-tagged]').innerHTML = tagged.map((id) => productRow(db.get('products', id), `<button class="btn btn-ghost btn-sm btn-icon text-danger" data-untag="${id}">${icon('x')}</button>`)).join('') || '<p class="small muted">No products tagged yet.</p>';
  $$('[data-untag]').forEach((b) => (b.onclick = () => { tagged = tagged.filter((t) => t !== b.dataset.untag); renderTagged(); }));
  if (previewUrl) setPreview(previewUrl);
}

function tag(id) {
  if (tagged.includes(id)) return;
  if (tagged.length >= 5) return toast('You can tag up to 5 products', 'error');
  tagged.push(id);
  renderTagged();
}

function bind() {
  const file = $('[data-file]');
  const drop = $('[data-drop]');
  const useFile = (f) => {
    if (!f || !f.type.startsWith('video/')) return toast('Please choose a video file', 'error');
    videoFile = f;
    setPreview(URL.createObjectURL(f));
    toast(`Loaded ${f.name}`, 'info');
  };
  file.onchange = () => useFile(file.files[0]);
  drop.ondragover = (e) => { e.preventDefault(); drop.classList.add('drag'); };
  drop.ondragleave = () => drop.classList.remove('drag');
  drop.ondrop = (e) => { e.preventDefault(); drop.classList.remove('drag'); useFile(e.dataTransfer.files[0]); };
  $('[data-sample]').onclick = () => { videoFile = null; setPreview(SAMPLE_VIDEOS[sampleIndex++ % SAMPLE_VIDEOS.length]); };
  $('[data-record]').onclick = () => toast('In-browser recording uses MediaRecorder — try the Go Live studio to test your camera.', 'info');

  const cap = $('[data-caption]');
  cap.oninput = () => { $('[data-count]').textContent = `${cap.value.length}/220`; const pc = $('[data-prev-caption]'); if (pc) pc.textContent = cap.value; };

  $('[data-ai]').onclick = async (e) => {
    const btn = e.currentTarget;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner" style="width:16px;height:16px;border-width:2px;border-color:rgba(255,255,255,.4);border-top-color:#fff"></span> Analysing video…';
    const res = await suggestTags({ vendorId: el.vendor.id, caption: cap.value, fileName: videoFile?.name || '' });
    btn.disabled = false;
    btn.innerHTML = `${icon('sparkles')} Auto-tag with AI`;
    $('[data-ai-result]').innerHTML = `
      <div class="notice ${res.fromContent ? 'success' : ''}">${icon('sparkles')}<div>${res.fromContent ? `Detected: <b>${res.labels.map(escapeHtml).join(', ')}</b>` : 'Not enough signal in the caption — showing your best sellers. Add product names to the caption for better matches.'}</div></div>
      <div class="stack mt-1" style="gap:6px">${res.suggestions.map((s) => productRow(s.product, `<span class="badge ${s.confidence > 75 ? 'badge-success' : 'badge-warning'}">${s.confidence}%</span><button class="btn btn-soft btn-sm" data-tag="${s.product.id}">${tagged.includes(s.product.id) ? 'Tagged' : 'Tag'}</button>`)).join('')}</div>
      <button class="btn btn-outline btn-sm mt-1" data-tag-all>Tag all high-confidence</button>`;
    $$('[data-tag]', $('[data-ai-result]')).forEach((b) => (b.onclick = () => { tag(b.dataset.tag); b.textContent = 'Tagged'; }));
    $('[data-tag-all]').onclick = () => res.suggestions.filter((s) => s.confidence > 75 || !res.fromContent).slice(0, 3).forEach((s) => tag(s.product.id));
  };

  const search = $('[data-search]');
  search.oninput = debounce(() => {
    const q = search.value.trim().toLowerCase();
    const list = q ? db.where('products', (p) => p.vendorId === el.vendor.id && p.title.toLowerCase().includes(q)).slice(0, 5) : [];
    $('[data-search-results]').innerHTML = list.map((p) => productRow(p, `<button class="btn btn-soft btn-sm" data-add="${p.id}">${icon('plus')} Tag</button>`)).join('');
    $$('[data-add]').forEach((b) => (b.onclick = () => { tag(b.dataset.add); search.value = ''; $('[data-search-results]').innerHTML = ''; }));
  }, 150);

  $('[data-post]').onclick = async (e) => {
    if (!previewUrl) return toast('Upload a video first', 'error');
    if (!cap.value.trim()) return toast('Add a caption', 'error');
    if (!tagged.length) return toast('Tag at least one product so viewers can buy', 'error');
    const btn = e.currentTarget;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner" style="width:18px;height:18px;border-width:2px;border-color:rgba(255,255,255,.4);border-top-color:#fff"></span> Uploading…';

    let uploadedVideoUrl = previewUrl;
    if (videoFile) {
      uploadedVideoUrl = await uploadFile('reels', videoFile);
    }

    const first = db.get('products', tagged[0]);
    await createReel({
      vendorId: el.vendor.id, caption: cap.value.trim(), productIds: tagged,
      videoUrl: uploadedVideoUrl || previewUrl,
      poster: first.images[0] || first.thumbnail,
    });
    toast('Reel submitted for review 🎬');
    setTimeout(() => (location.href = routes.vendorDash('reels')), 600);
  };
}

if (el) render();
