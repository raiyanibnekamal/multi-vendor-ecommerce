import { mountShell } from '../../components/shell.js';
import { productCard, reelThumb, liveCard, priceHtml, emptyState, loading } from '../../components/cards.js';
import { openModal, ensureLogin } from '../../components/modal.js';
import { toast } from '../../components/toast.js';
import { routes } from '../../core/routes.js';
import { escapeHtml, icon, qs, $, $$, formatNumber, stars, avatar, timeAgo, uid } from '../../core/utils.js';
import { getProduct, getRelated, getReviews, addReview, categoryPath } from '../../services/catalog.js';
import { vendorSync, isFollowing, toggleFollow } from '../../services/vendors.js';
import { reelsForProduct } from '../../services/reels.js';
import { addToCart, inWishlist, toggleWishlist } from '../../services/cart.js';
import { track, getRecommendations } from '../../services/ai.js';
import { db } from '../../services/db.js';

const main = mountShell({ active: 'product' });
const id = qs('id');
let qty = 1;

async function render() {
  main.innerHTML = loading();
  const p = await getProduct(id);
  if (!p) {
    main.innerHTML = `<div class="container page">${emptyState('package-x', 'Product not found', 'It may have been removed by the seller.', `<a class="btn btn-primary" href="${routes.products()}">Browse products</a>`)}</div>`;
    return;
  }
  document.title = `${p.title} · StreamCart`;
  track('view', { productId: p.id });
  const v = vendorSync(p.vendorId);
  const path = categoryPath(p.categoryId);
  const reels = reelsForProduct(p.id);
  const streams = db.where('streams', (s) => s.status !== 'ended' && s.productIds.includes(p.id));
  const images = p.images.length ? p.images : [p.thumbnail];

  main.innerHTML = `
  <div class="container page">
    <nav class="breadcrumb"><a href="${routes.home()}">Home</a>${path.map((c) => `${icon('chevron-right')}<a href="${routes.products({ category: c.id })}">${escapeHtml(c.name)}</a>`).join('')}${icon('chevron-right')}<span class="truncate" style="max-width:240px">${escapeHtml(p.title)}</span></nav>

    <div class="pdp">
      <div class="gallery">
        <div class="gallery-thumbs">${images.map((src, i) => `<button class="${i === 0 ? 'active' : ''}" data-img="${src}"><img src="${src}" alt=""></button>`).join('')}</div>
        <div class="gallery-main">
          <img src="${images[0]}" alt="${escapeHtml(p.title)}" data-main-img>
          ${p.discount >= 5 ? `<span class="badge badge-sale" style="position:absolute;top:14px;left:14px">-${p.discount}%</span>` : ''}
        </div>
      </div>

      <div class="pdp-info">
        <a class="row small text-primary bold" href="${routes.vendor(v.id)}">${icon('store')} ${escapeHtml(v.name)} ${v.verified ? icon('badge-check') : ''}</a>
        <h1>${escapeHtml(p.title)}</h1>
        <div class="pdp-meta">
          <span class="row" style="gap:4px">${stars(p.rating)} <b style="color:var(--text)">${p.rating}</b> (${p.reviewCount} reviews)</span>
          <span>·</span><span>${formatNumber(p.sold)} sold</span>
          ${p.brand ? `<span>·</span><span>Brand: <b style="color:var(--text)">${escapeHtml(p.brand)}</b></span>` : ''}
        </div>
        <div class="pdp-price">
          ${priceHtml(p, true)}
          ${p.discount ? `<span class="small text-success bold">You save ${p.discount}%</span>` : ''}
        </div>
        <p class="muted">${escapeHtml(p.description)}</p>
        <div class="row-between mt-3">
          <div class="row"><span class="label">Quantity</span>
            <div class="qty"><button data-dec>${icon('minus')}</button><input value="1" readonly data-qty><button data-inc>${icon('plus')}</button></div>
          </div>
          <span class="small bold ${p.stock > 10 ? 'text-success' : p.stock > 0 ? 'text-warning' : 'text-danger'}">${p.stock > 10 ? `${icon('circle-check')} In stock` : p.stock > 0 ? `Only ${p.stock} left` : 'Out of stock'}</span>
        </div>
        <div class="pdp-actions">
          <button class="btn btn-outline btn-lg" data-cart ${p.stock <= 0 ? 'disabled' : ''}>${icon('shopping-cart')} Add to cart</button>
          <button class="btn btn-primary btn-lg" data-buy ${p.stock <= 0 ? 'disabled' : ''}>${icon('zap')} Buy now</button>
          <button class="btn btn-outline btn-lg btn-icon ${inWishlist(p.id) ? 'text-danger' : ''}" data-wishbtn title="Wishlist">${icon('heart')}</button>
          <button class="btn btn-outline btn-lg btn-icon" data-share title="Share">${icon('share-2')}</button>
        </div>
        <div class="pdp-perks">
          <div>${icon('truck')} Free delivery over ৳2,000</div>
          <div>${icon('rotate-ccw')} 7-day easy returns</div>
          <div>${icon('shield-check')} Secure payment</div>
          <div>${icon('badge-check')} 100% authentic</div>
        </div>
        <div class="seller-box">
          ${avatar(v.name, { color: v.color })}
          <div class="grow"><a href="${routes.vendor(v.id)}" class="bold">${escapeHtml(v.name)}</a><div class="xs muted">${icon('star')} ${v.rating} · ${formatNumber(v.followers)} followers · ${escapeHtml(v.location)}</div></div>
          <button class="btn btn-sm ${isFollowing(v.id) ? 'btn-soft' : 'btn-primary'}" data-follow>${isFollowing(v.id) ? 'Following' : 'Follow'}</button>
          <button class="btn btn-sm btn-outline" data-message>${icon('message-circle')} Chat</button>
        </div>
      </div>
    </div>

    ${reels.length || streams.length ? `
    <section class="section">
      <div class="section-head"><div><h2>${icon('clapperboard', 'text-primary')} See it in action</h2><p>Reels and live streams featuring this product</p></div></div>
      <div class="h-scroll" style="grid-auto-columns:170px">${streams.map((s) => `<div style="grid-column:span 2;min-width:300px">${liveCard(s)}</div>`).join('')}${reels.map(reelThumb).join('')}</div>
    </section>` : ''}

    <section class="section card">
      <div class="tabs" style="padding:0 12px">
        <button class="tab active" data-tab="desc">Description</button>
        <button class="tab" data-tab="specs">Specifications</button>
        <button class="tab" data-tab="reviews">Reviews <span class="badge">${p.reviewCount}</span></button>
      </div>
      <div class="card-body" data-tab-body></div>
    </section>

    <section class="section"><div class="section-head"><div><h2>Similar products</h2></div></div><div data-related>${loading()}</div></section>
    <section class="section"><div class="section-head"><div><h2>You may also like <span class="badge badge-ai">${icon('sparkles')} AI</span></h2><p>Personalised from your browsing</p></div></div><div data-recs>${loading()}</div></section>
  </div>`;

  bind(p, v);
  showTab('desc', p);
  getRelated(p).then((list) => ($('[data-related]').innerHTML = `<div class="grid-products">${list.slice(0, 5).map(productCard).join('')}</div>`));
  getRecommendations({ limit: 5, exclude: [p.id] }).then((r) => ($('[data-recs]').innerHTML = `<div class="grid-products">${r.items.map(productCard).join('')}</div>`));
}

async function showTab(tab, p) {
  $$('[data-tab]').forEach((t) => t.classList.toggle('active', t.dataset.tab === tab));
  const body = $('[data-tab-body]');
  if (tab === 'desc') {
    body.innerHTML = `<p style="max-width:760px">${escapeHtml(p.description)}</p><p class="muted mt-2" style="max-width:760px">Sold and shipped by ${escapeHtml(vendorSync(p.vendorId).name)}. All products are checked for quality before dispatch. Tags: ${p.tags.map((t) => `<span class="badge">${escapeHtml(t)}</span>`).join(' ')}</p>`;
  } else if (tab === 'specs') {
    const rows = [['Brand', p.brand || 'Generic'], ['Category', categoryPath(p.categoryId).map((c) => c.name).join(' › ')], ['SKU', p.id.toUpperCase()], ['Stock', p.stock], ['Seller', vendorSync(p.vendorId).name], ['Warranty', /phone|laptop|tablet|watch/i.test(p.categoryId) ? '1 year official' : 'Not applicable']];
    body.innerHTML = `<table class="table" style="max-width:640px">${rows.map(([k, val]) => `<tr><td class="muted" style="width:200px">${k}</td><td>${escapeHtml(String(val))}</td></tr>`).join('')}</table>`;
  } else {
    body.innerHTML = loading();
    const reviews = await getReviews(p.id);
    const dist = [5, 4, 3, 2, 1].map((s) => reviews.filter((r) => r.rating === s).length);
    body.innerHTML = `
      <div class="rating-summary">
        <div class="center"><div class="big">${p.rating}</div>${stars(p.rating)}<div class="small muted mt-1">${p.reviewCount} reviews</div></div>
        <div class="stack" style="gap:6px">${dist.map((n, i) => `<div class="bar-row"><span>${5 - i}★</span><div class="progress"><span style="width:${reviews.length ? (n / reviews.length) * 100 : 0}%"></span></div><span>${n}</span></div>`).join('')}</div>
      </div>
      <hr class="divider">
      <form data-review-form class="stack" style="max-width:560px">
        <h4>Write a review</h4>
        <div class="star-input" data-stars>${[1, 2, 3, 4, 5].map((n) => `<button type="button" data-star="${n}" class="${n <= 5 ? 'on' : ''}">${icon('star')}</button>`).join('')}</div>
        <textarea class="textarea" name="text" placeholder="Share your experience with this product" required></textarea>
        <button class="btn btn-primary" style="width:fit-content">Submit review</button>
      </form>
      <hr class="divider">
      <div>${reviews.map((r) => `
        <div class="review">
          <div class="row">${avatar(r.userName, { size: 'sm' })}<div class="grow"><b class="small">${escapeHtml(r.userName)}</b> ${r.verified ? '<span class="badge badge-success">Verified purchase</span>' : ''}<div>${stars(r.rating)}</div></div><span class="xs muted">${timeAgo(r.createdAt)}</span></div>
          <p class="mt-1 small">${escapeHtml(r.text)}</p>
        </div>`).join('')}</div>`;
    let rating = 5;
    const starBtns = $$('[data-star]', body);
    starBtns.forEach((b) => (b.onclick = () => { rating = +b.dataset.star; starBtns.forEach((s) => s.classList.toggle('on', +s.dataset.star <= rating)); }));
    $('[data-review-form]').onsubmit = async (e) => {
      e.preventDefault();
      if (!(await ensureLogin('Sign in to write a review'))) return;
      await addReview(p.id, rating, e.target.text.value.trim());
      toast('Thanks! Your review was posted.');
      showTab('reviews', p);
    };
  }
}

function bind(p, v) {
  $$('[data-img]').forEach((b) => (b.onclick = () => {
    $('[data-main-img]').src = b.dataset.img;
    $$('[data-img]').forEach((x) => x.classList.toggle('active', x === b));
  }));
  const q = $('[data-qty]');
  $('[data-dec]').onclick = () => { qty = Math.max(1, qty - 1); q.value = qty; };
  $('[data-inc]').onclick = () => { qty = Math.min(p.stock, qty + 1); q.value = qty; };
  $('[data-cart]').onclick = () => {
    try { addToCart(p.id, qty); track('cart', { productId: p.id }); toast('Added to cart', 'success', { action: 'View cart', href: routes.cart() }); } catch (e) { toast(e.message, 'error'); }
  };
  $('[data-buy]').onclick = () => {
    try { addToCart(p.id, qty); location.href = routes.checkout(); } catch (e) { toast(e.message, 'error'); }
  };
  $('[data-wishbtn]').onclick = (e) => {
    const now = toggleWishlist(p.id);
    e.currentTarget.classList.toggle('text-danger', now);
    toast(now ? 'Saved to wishlist' : 'Removed from wishlist', now ? 'success' : 'info');
  };
  $('[data-share]').onclick = async () => {
    await navigator.clipboard?.writeText(location.href).catch(() => {});
    toast('Product link copied', 'info');
  };
  $('[data-follow]').onclick = async (e) => {
    const btn = e.currentTarget;
    if (!(await ensureLogin('Sign in to follow stores'))) return;
    const now = toggleFollow(v.id);
    btn.textContent = now ? 'Following' : 'Follow';
    btn.className = `btn btn-sm ${now ? 'btn-soft' : 'btn-primary'}`;
  };
  $('[data-message]').onclick = async () => {
    const user = await ensureLogin('Sign in to chat with the seller');
    if (!user) return;
    const m = openModal({
      title: `Message ${v.name}`,
      content: `<div class="row mb-2"><img src="${p.thumbnail}" style="width:48px;height:48px;border-radius:8px;background:var(--surface-2);object-fit:contain"><span class="small">${escapeHtml(p.title)}</span></div>
        <textarea class="textarea" data-msg>Hi, I'm interested in "${escapeHtml(p.title)}". Is it available?</textarea>`,
      footer: '<button class="btn btn-outline" data-close>Cancel</button><button class="btn btn-primary" data-send>Send</button>',
    });
    m.el.querySelector('[data-send]').onclick = () => {
      const text = m.el.querySelector('[data-msg]').value.trim();
      if (!text) return;
      const conv = db.all('conversations').find((c) => c.vendorId === v.id && c.customerId === user.id);
      const msg = { id: uid('msg'), from: 'customer', text, createdAt: new Date().toISOString() };
      if (conv) db.update('conversations', conv.id, (c) => ({ messages: [...c.messages, msg] }));
      else db.insert('conversations', { id: uid('m'), vendorId: v.id, customerId: user.id, messages: [msg] });
      m.close();
      toast('Message sent to the seller');
    };
  };
  $$('[data-tab]').forEach((t) => (t.onclick = () => showTab(t.dataset.tab, p)));
}

render();
