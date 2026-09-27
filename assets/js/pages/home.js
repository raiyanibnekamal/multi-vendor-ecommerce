import { mountShell } from '../components/shell.js';
import { productCard, reelThumb, liveCard, vendorCard, loading } from '../components/cards.js';
import { routes } from '../core/routes.js';
import { escapeHtml, icon } from '../core/utils.js';
import { categoryTree, getProducts } from '../services/catalog.js';
import { getReels } from '../services/reels.js';
import { getStreams } from '../services/live.js';
import { getVendors } from '../services/vendors.js';
import { getRecommendations, rankReels } from '../services/ai.js';
import { db } from '../services/db.js';

const main = mountShell({ active: 'home' });

const sectionHead = (title, sub, href, extra = '') => `
  <div class="section-head"><div><h2>${title}</h2>${sub ? `<p>${sub}</p>` : ''}</div>${extra}${href ? `<a class="see-all" href="${href}">See all ${icon('arrow-right')}</a>` : ''}</div>`;

function categoryImage(rootId) {
  const ids = new Set(db.all('categories').filter((c) => c.parentId === rootId || db.get('categories', c.parentId)?.parentId === rootId).map((c) => c.id));
  return db.all('products').find((p) => ids.has(p.categoryId))?.thumbnail;
}

async function render() {
  const [reels, streams, vendors, deals, best, recs] = await Promise.all([
    getReels(), getStreams({ status: ['live', 'scheduled'] }), getVendors(),
    getProducts({ onSale: true, sort: 'discount', limit: 12 }), getProducts({ sort: 'popular', limit: 10 }), getRecommendations({ limit: 10 }),
  ]);
  const ranked = rankReels(reels);
  const live = streams.filter((s) => s.status === 'live');
  const tree = categoryTree();
  const heroDeal = deals.items[0];

  main.innerHTML = `
  <div class="container">
    <section class="hero">
      <div class="hero-main">
        <span class="eyebrow">${icon('sparkles')} Shoppable videos, live deals</span>
        <h1>Watch it. Love it.<br>Buy it instantly.</h1>
        <p>Discover products through reels and live streams from ${vendors.length}+ trusted sellers, and check out without leaving the video.</p>
        <div class="row wrap mt-3" style="gap:10px">
          <a class="btn btn-white btn-lg" href="${routes.reels()}">${icon('clapperboard')} Explore reels</a>
          <a class="btn btn-glass btn-lg" href="${routes.live()}">${icon('radio')} ${live.length ? `${live.length} live now` : 'Live streams'}</a>
        </div>
        <div class="hero-phones">${ranked.slice(0, 2).map(reelThumb).join('')}</div>
      </div>
      <div class="hero-side">
        ${live[0] ? `
        <a class="hero-tile" href="${routes.watch(live[0].id)}">
          <img src="${live[0].thumbnail}" alt="">
          <span class="badge badge-live" style="width:fit-content">LIVE</span>
          <h3 class="mt-1">${escapeHtml(live[0].title)}</h3>
          <span class="small" style="opacity:.85">${escapeHtml(db.get('vendors', live[0].vendorId)?.name || '')} · Tap to join</span>
        </a>` : ''}
        ${heroDeal ? `
        <a class="hero-tile light" href="${routes.product(heroDeal.id)}">
          <img src="${heroDeal.thumbnail}" alt="">
          <span class="badge badge-sale" style="width:fit-content">Up to ${heroDeal.discount}% off</span>
          <h3 class="mt-1" style="max-width:55%">Today's flash deals</h3>
          <span class="small text-primary bold">Shop deals →</span>
        </a>` : ''}
      </div>
    </section>

    <section class="perks">
      <div class="perk"><span class="ic">${icon('truck')}</span><div><b>Free delivery</b><span>On orders over ৳2,000</span></div></div>
      <div class="perk"><span class="ic">${icon('zap')}</span><div><b>Buy from videos</b><span>One tap from reels & live</span></div></div>
      <div class="perk"><span class="ic">${icon('shield-check')}</span><div><b>Secure payments</b><span>Card, bKash, Nagad, COD</span></div></div>
      <div class="perk"><span class="ic">${icon('rotate-ccw')}</span><div><b>7-day returns</b><span>Hassle-free refunds</span></div></div>
    </section>

    <section class="section">
      ${sectionHead('Shop by category', 'Browse nested categories and sub-categories', routes.categories())}
      <div class="cat-circles">
        ${tree.map((c) => `<a class="cat-circle" href="${routes.products({ category: c.id })}"><span class="ic"><img src="${categoryImage(c.id) || ''}" alt=""></span>${escapeHtml(c.name)}</a>`).join('')}
        <a class="cat-circle" href="${routes.products({ onSale: 1, sort: 'discount' })}"><span class="ic" style="background:#fee2e2;color:var(--danger)">${icon('flame')}</span>Deals</a>
      </div>
    </section>

    ${streams.length ? `
    <section class="section">
      ${sectionHead(`${icon('radio', 'text-danger')} Live & upcoming`, 'Join a stream, ask questions, buy pinned products in one tap', routes.live())}
      <div class="h-scroll live-strip">${streams.map(liveCard).join('')}</div>
    </section>` : ''}

    <section class="section">
      ${sectionHead('Trending reels', 'Short product videos, tap to shop what you see', routes.reels())}
      <div class="h-scroll reels-strip">${ranked.map(reelThumb).join('')}</div>
    </section>

    <section class="section">
      ${sectionHead(`<span class="ai-banner">Recommended for you <span class="badge badge-ai">${icon('sparkles')} AI</span></span>`, escapeHtml(recs.reason), routes.products())}
      <div class="grid-products">${recs.items.map(productCard).join('')}</div>
    </section>

    <section class="section">
      ${sectionHead('Flash deals', 'Biggest discounts right now', routes.products({ onSale: 1, sort: 'discount' }), '<div class="deal-timer" data-timer></div>')}
      <div class="h-scroll">${deals.items.map(productCard).join('')}</div>
    </section>

    <section class="section">
      ${sectionHead('Top sellers', 'Stores customers love', null)}
      <div class="grid-products">${vendors.slice(0, 6).map(vendorCard).join('')}</div>
    </section>

    <section class="section">
      ${sectionHead('Best sellers', 'Most purchased this month', routes.products({ sort: 'popular' }))}
      <div class="grid-products">${best.items.map(productCard).join('')}</div>
    </section>

    <section class="section">
      <div class="cta-vendor">
        <div>
          <span class="badge badge-primary mb-2">For sellers</span>
          <h2>Sell with video. Grow with live.</h2>
          <p>Open your store, post shoppable reels, go live to demo products, and track every order in real time.</p>
          <a class="btn btn-primary btn-lg mt-3" href="${routes.register('vendor')}">${icon('store')} Become a vendor</a>
        </div>
        <ul>
          <li>${icon('clapperboard')} Shoppable reels</li>
          <li>${icon('radio')} Live selling</li>
          <li>${icon('sparkles')} AI product tagging</li>
          <li>${icon('chart-line')} Sales analytics</li>
        </ul>
      </div>
    </section>
  </div>`;

  startDealTimer(main.querySelector('[data-timer]'));
}

function startDealTimer(el) {
  if (!el) return;
  const end = new Date(); end.setHours(23, 59, 59, 999);
  const tick = () => {
    const s = Math.max(0, Math.floor((end - Date.now()) / 1000));
    const pad = (n) => String(n).padStart(2, '0');
    el.innerHTML = `Ends in <span>${pad(Math.floor(s / 3600))}</span>:<span>${pad(Math.floor((s % 3600) / 60))}</span>:<span>${pad(s % 60)}</span>`;
  };
  tick();
  setInterval(tick, 1000);
}

main.innerHTML = loading();
render();
