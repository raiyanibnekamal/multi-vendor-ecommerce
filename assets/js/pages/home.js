import { mountShell } from '../components/shell.js';
import { productCard, reelThumb, liveCard, vendorCard, skeletonHome, priceHtml } from '../components/cards.js';
import { toast } from '../components/toast.js';
import { routes } from '../core/routes.js';
import { escapeHtml, icon, formatPrice, formatNumber, stars, avatar, digits, t } from '../core/utils.js';
import { categoryTree, descendantIds, getProducts } from '../services/catalog.js';
import { getReels } from '../services/reels.js';
import { getStreams } from '../services/live.js';
import { getVendors } from '../services/vendors.js';
import { getRecommendations, rankReels } from '../services/ai.js';
import { db } from '../services/db.js';

const main = mountShell({ active: 'home' });

const sectionHead = (title, sub, href, extra = '') => `
  <div class="section-head"><div><h2>${title}</h2>${sub ? `<p>${sub}</p>` : ''}</div>${extra}${href ? `<a class="see-all" href="${href}">${t('See all')} ${icon('arrow-right')}</a>` : ''}</div>`;

const CAT_STYLE = {
  electronics: ['#dbeafe', '#1d4ed8'], fashion: ['#fce7f3', '#be185d'], 'home-living': ['#fef3c7', '#b45309'],
  beauty: ['#ede9fe', '#6d28d9'], groceries: ['#dcfce7', '#15803d'], sports: ['#ffedd5', '#c2410c'],
};

const TESTIMONIALS = [
  ['Nusrat Jahan', 'Dhaka', 5, 'I saw the phone in a reel, tapped Buy now and it arrived the next day. Never leaving the video is a game changer!'],
  ['Arif Hossain', 'Chattogram', 5, 'Live streams feel like a real shop. I asked about the warranty in chat and the seller answered instantly.'],
  ['Farzana Akter', 'Sylhet', 4, 'The AI recommendations actually understand what I like. Found great skincare deals I would have missed.'],
];

function categoryImage(rootId) {
  const ids = new Set(descendantIds(rootId));
  return db.all('products').find((p) => ids.has(p.categoryId) && p.status === 'active')?.thumbnail;
}

function heroPhone(reel) {
  if (!reel) return '';
  const p = db.get('products', reel.productIds[0]);
  const v = db.get('vendors', reel.vendorId);
  return `
    <div class="hero-visual" aria-hidden="true">
      <div class="phone">
        <video src="${reel.videoUrl}" poster="${reel.poster}" muted autoplay loop playsinline preload="metadata"></video>
        <div class="phone-ui">
          <div class="row" style="gap:8px">${avatar(v?.name || '', { size: 'sm', color: v?.color })}<b class="small">@${escapeHtml(v?.slug || '')}</b></div>
          <p class="xs clamp-2">${escapeHtml(reel.caption)}</p>
        </div>
      </div>
      ${p ? `<a class="float-card float-product" href="${routes.product(p.id)}" tabindex="-1">
        <img src="${p.thumbnail}" alt="">
        <div style="min-width:0"><div class="xs bold truncate">${escapeHtml(p.title)}</div>${priceHtml(p)}</div>
        <span class="btn btn-primary btn-xs">${t('Buy now')}</span>
      </a>` : ''}
      <div class="float-card float-live">${icon('radio')} <b>${formatNumber(1240)}</b> ${t('watching live')}</div>
      <div class="float-card float-heart">${icon('heart')} ${formatNumber(reel.likes)}</div>
    </div>`;
}

async function render() {
  const [reels, streams, vendors, deals, best, recs, all] = await Promise.all([
    getReels(), getStreams({ status: ['live', 'scheduled'] }), getVendors(),
    getProducts({ onSale: true, sort: 'discount', limit: 12 }), getProducts({ sort: 'popular', limit: 10 }),
    getRecommendations({ limit: 10 }), getProducts({ limit: 1 }),
  ]);
  const ranked = rankReels(reels);
  const live = streams.filter((s) => s.status === 'live');
  const tree = categoryTree();
  const heroDeal = deals.items[0];
  const brands = [...new Set(db.all('products').map((p) => p.brand).filter(Boolean))].slice(0, 18);
  const totalViews = reels.reduce((n, r) => n + r.views, 0);

  main.innerHTML = `
  <div class="container home">
    <section class="hero">
      <div class="hero-main">
        <div class="blob b1"></div><div class="blob b2"></div><div class="blob b3"></div>
        <div class="hero-copy">
          <span class="eyebrow">${icon('sparkles')} ${t('Shoppable videos, live deals')}</span>
          <h1>${t('Watch it. Love it.')}<br><span class="shine">${t('Buy it instantly.')}</span></h1>
          <p>${t('Discover products through reels and live streams from {n}+ trusted sellers, and check out without leaving the video.', { n: digits(vendors.length) })}</p>
          <div class="row wrap mt-3" style="gap:10px">
            <a class="btn btn-white btn-lg" href="${routes.reels()}">${icon('clapperboard')} ${t('Explore reels')}</a>
            <a class="btn btn-glass btn-lg" href="${routes.live()}">${icon('radio')} ${live.length ? t('{n} live now', { n: digits(live.length) }) : t('Live streams')}</a>
          </div>
          <div class="hero-stats">
            <div><b data-count="${all.total}">0</b><span>${t('Products')}</span></div>
            <div><b data-count="${vendors.length}">0</b><span>${t('Sellers')}</span></div>
            <div><b data-count="${totalViews}" data-compact>0</b><span>${t('Reel views')}</span></div>
          </div>
        </div>
        ${heroPhone(ranked[0])}
      </div>
      <div class="hero-side">
        ${live[0] ? `
        <a class="hero-tile" href="${routes.watch(live[0].id)}">
          <img src="${live[0].thumbnail}" alt="">
          <span class="badge badge-live" style="width:fit-content">LIVE</span>
          <h3 class="mt-1">${escapeHtml(live[0].title)}</h3>
          <span class="small" style="opacity:.85">${escapeHtml(db.get('vendors', live[0].vendorId)?.name || '')} · ${t('Tap to join')}</span>
        </a>` : ''}
        ${heroDeal ? `
        <a class="hero-tile light" href="${routes.products({ onSale: 1, sort: 'discount' })}">
          <img src="${heroDeal.thumbnail}" alt="">
          <span class="badge badge-sale" style="width:fit-content">${t('Up to {n}% off', { n: digits(heroDeal.discount) })}</span>
          <h3 class="mt-1" style="max-width:55%">${t("Today's flash deals")}</h3>
          <span class="small text-primary bold">${t('Shop deals')} →</span>
        </a>` : ''}
      </div>
    </section>

    <section class="perks reveal">
      <div class="perk"><span class="ic">${icon('truck')}</span><div><b>${t('Free delivery')}</b><span>${t('On orders over {amount}', { amount: formatPrice(2000) })}</span></div></div>
      <div class="perk"><span class="ic">${icon('zap')}</span><div><b>${t('Buy from videos')}</b><span>${t('One tap from reels & live')}</span></div></div>
      <div class="perk"><span class="ic">${icon('shield-check')}</span><div><b>${t('Secure payments')}</b><span>${t('Card, bKash, Nagad, COD')}</span></div></div>
      <div class="perk"><span class="ic">${icon('rotate-ccw')}</span><div><b>${t('7-day returns')}</b><span>${t('Hassle-free refunds')}</span></div></div>
    </section>

    <section class="section reveal">
      ${sectionHead(t('Shop by category'), t('Browse nested categories and sub-categories'), routes.categories())}
      <div class="cat-tiles">
        ${tree.map((c) => {
          const [bg, fg] = CAT_STYLE[c.id] || ['#e0e7ff', '#4338ca'];
          return `<a class="cat-tile" href="${routes.products({ category: c.id })}" style="--cat-bg:${bg};--cat-fg:${fg}">
            <div><b>${escapeHtml(t(c.name))}</b><span>${t('{n} sub-categories', { n: digits(c.children.length) })}</span></div>
            <img src="${categoryImage(c.id) || ''}" alt="" loading="lazy">
          </a>`;
        }).join('')}
      </div>
    </section>

    ${streams.length ? `
    <section class="section reveal">
      ${sectionHead(`${icon('radio', 'text-danger')} ${t('Live & upcoming')}`, t('Join a stream, ask questions, buy pinned products in one tap'), routes.live())}
      <div class="h-scroll live-strip">${streams.map(liveCard).join('')}</div>
    </section>` : ''}

    <section class="section reveal">
      <div class="flash-band">
        <div class="flash-head">
          <div><span class="badge badge-sale">${icon('flame')} ${t('Flash sale')}</span><h2>${t('Deals end at midnight')}</h2><p>${t('Biggest discounts of the day, while stock lasts.')}</p></div>
          <div class="countdown" data-timer></div>
          <a class="btn btn-white" href="${routes.products({ onSale: 1, sort: 'discount' })}">${t('View all deals')} ${icon('arrow-right')}</a>
        </div>
        <div class="h-scroll flash-strip">${deals.items.map((p) => `
          <div class="flash-item">${productCard(p)}
            <div class="sold-bar"><div class="progress"><span style="width:${Math.min(95, Math.round((p.sold / (p.sold + p.stock || 1)) * 100))}%"></span></div><span class="xs">${t('{n} sold', { n: formatNumber(p.sold) })}</span></div>
          </div>`).join('')}</div>
      </div>
    </section>

    <section class="section reveal">
      ${sectionHead(t('Trending reels'), t('Short product videos, tap to shop what you see'), routes.reels())}
      <div class="h-scroll reels-strip">${ranked.map(reelThumb).join('')}</div>
    </section>

    <section class="section reveal">
      <div class="how">
        <div class="how-head"><h2>${t('Shopping, reimagined')}</h2><p>${t('From video to doorstep in three taps.')}</p></div>
        <div class="how-steps">
          <div class="how-step"><span class="n">1</span><span class="ic">${icon('clapperboard')}</span><b>${t('Watch')}</b><p>${t('Scroll reels or join a live stream from your favourite sellers.')}</p></div>
          <div class="how-step"><span class="n">2</span><span class="ic">${icon('tag')}</span><b>${t('Tap the product')}</b><p>${t('Every product in the video is tagged, see price and details instantly.')}</p></div>
          <div class="how-step"><span class="n">3</span><span class="ic">${icon('circle-check')}</span><b>${t('Checkout in-video')}</b><p>${t('Pay with card, bKash, Nagad or cash on delivery without leaving.')}</p></div>
        </div>
      </div>
    </section>

    <section class="section reveal">
      ${sectionHead(`<span class="ai-banner">${t('Recommended for you')} <span class="badge badge-ai">${icon('sparkles')} AI</span></span>`, escapeHtml(recs.personalised && recs.reasonName ? t("Because you're interested in {name}", { name: t(recs.reasonName) }) : t('Trending picks to get you started')), routes.products())}
      <div class="grid-products">${recs.items.map(productCard).join('')}</div>
    </section>

    <section class="section reveal promo-grid">
      <a class="promo promo-a" href="${routes.products({ category: 'fashion' })}">
        <div><span class="badge">${t('New season')}</span><h3>${t('Fashion week')}</h3><p>${t('Fresh styles from top local brands')}</p><span class="btn btn-white btn-sm">${t('Shop fashion')}</span></div>
        <img src="${categoryImage('fashion') || ''}" alt="" loading="lazy">
      </a>
      <a class="promo promo-b" href="${routes.products({ category: 'electronics' })}">
        <div><span class="badge">${t('Tech fest')}</span><h3>${t('Gadgets up to 30% off')}</h3><p>${t('Phones, laptops and accessories')}</p><span class="btn btn-white btn-sm">${t('Shop electronics')}</span></div>
        <img src="${categoryImage('electronics') || ''}" alt="" loading="lazy">
      </a>
    </section>

    <section class="section reveal">
      ${sectionHead(t('Top sellers'), t('Stores customers love'), null)}
      <div class="grid-products">${vendors.slice(0, 6).map(vendorCard).join('')}</div>
    </section>

    <section class="section reveal">
      ${sectionHead(t('Best sellers'), t('Most purchased this month'), routes.products({ sort: 'popular' }))}
      <div class="grid-products">${best.items.map(productCard).join('')}</div>
    </section>

    <section class="section reveal">
      <div class="brands"><div class="brands-track">${[...brands, ...brands].map((b) => `<a href="${routes.search(b)}">${escapeHtml(b)}</a>`).join('')}</div></div>
    </section>

    <section class="section reveal">
      ${sectionHead(t('What shoppers say'), t('Real reviews from our community'), null)}
      <div class="testimonials">${TESTIMONIALS.map(([name, city, rating, text]) => `
        <figure class="testimonial">${stars(rating)}<blockquote>“${escapeHtml(t(text))}”</blockquote>
          <figcaption>${avatar(name, { size: 'sm' })}<div><b>${escapeHtml(name)}</b><span>${escapeHtml(t(city))}</span></div></figcaption></figure>`).join('')}</div>
    </section>

    <section class="section reveal cta-grid">
      <div class="cta-vendor">
        <div>
          <span class="badge badge-primary mb-2">${t('For sellers')}</span>
          <h2>${t('Sell with video. Grow with live.')}</h2>
          <p>${t('Open your store, post shoppable reels, go live to demo products, and track every order in real time.')}</p>
          <a class="btn btn-primary btn-lg mt-3" href="${routes.register('vendor')}">${icon('store')} ${t('Become a vendor')}</a>
        </div>
        <ul>
          <li>${icon('clapperboard')} ${t('Shoppable reels')}</li>
          <li>${icon('radio')} ${t('Live selling')}</li>
          <li>${icon('sparkles')} ${t('AI product tagging')}</li>
          <li>${icon('chart-line')} ${t('Sales analytics')}</li>
        </ul>
      </div>
      <div class="cta-app">
        <span class="ic">${icon('smartphone')}</span>
        <h3>${t('Get the StreamCart app')}</h3>
        <p>${t('Install on your phone for a full-screen, app-like experience. No app store needed.')}</p>
        <button class="btn btn-gradient" data-install>${icon('download')} ${t('Install app')}</button>
        <form class="newsletter" data-newsletter>
          <input class="input" type="email" required placeholder="${t('Your email for deal alerts')}">
          <button class="btn btn-outline">${t('Subscribe')}</button>
        </form>
      </div>
    </section>
  </div>`;

  startDealTimer(main.querySelector('[data-timer]'));
  bindInstall(main.querySelector('[data-install]'));
  const news = main.querySelector('[data-newsletter]');
  if (news) news.onsubmit = (e) => { e.preventDefault(); e.target.reset(); toast(t("You're subscribed to deal alerts!")); };
  animateCounts(main);
  observeReveal(main);
}

function animateCounts(root) {
  root.querySelectorAll('[data-count]').forEach((el) => {
    const target = +el.dataset.count;
    const compact = el.hasAttribute('data-compact');
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min(1, (now - start) / 900);
      const n = Math.round(target * (1 - (1 - p) ** 3));
      el.textContent = compact ? formatNumber(n) : digits(n);
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

function observeReveal(root) {
  const nodes = root.querySelectorAll('.reveal');
  if (!nodes.length) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    nodes.forEach((el) => el.classList.add('in'));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { threshold: 0.1 });
  nodes.forEach((el) => io.observe(el));
}

function startDealTimer(el) {
  if (!el) return;
  const end = new Date(); end.setHours(23, 59, 59, 999);
  const box = (n, label) => `<div><b>${digits(String(n).padStart(2, '0'))}</b><span>${label}</span></div>`;
  const tick = () => {
    const s = Math.max(0, Math.floor((end - Date.now()) / 1000));
    el.innerHTML = box(Math.floor(s / 3600), t('Hours')) + box(Math.floor((s % 3600) / 60), t('Minutes')) + box(s % 60, t('Seconds'));
  };
  tick();
  setInterval(tick, 1000);
}

let installPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installPrompt = e; });
function bindInstall(btn) {
  if (!btn) return;
  btn.onclick = async () => {
    if (installPrompt) { installPrompt.prompt(); installPrompt = null; return; }
    const ios = /iphone|ipad/i.test(navigator.userAgent);
    toast(ios ? t('Tap Share, then "Add to Home Screen"') : t('Use your browser menu → "Install app" / "Add to Home screen"'), 'info');
  };
}

main.innerHTML = skeletonHome();
render();
