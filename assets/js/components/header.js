import { CONFIG } from '../core/config.js';
import { routes, dashboardFor } from '../core/routes.js';
import { currentUser, logout } from '../core/auth.js';
import { escapeHtml, icon, avatar, debounce, on, qs, t, formatPrice } from '../core/utils.js';
import { themeToggleHtml } from '../core/theme.js';
import { langToggleHtml } from '../core/i18n.js';
import { cartCount, getWishlistIds } from '../services/cart.js';
import { categoryTree } from '../services/catalog.js';
import { suggest } from '../services/ai.js';
import { db } from '../services/db.js';

export function logoHtml(href = routes.home()) {
  return `<a class="logo" href="${href}"><span class="logo-mark">${icon('play')}</span><span>Stream<b>Cart</b></span></a>`;
}

function accountHtml(user) {
  if (!user) {
    return `<a class="icon-btn" href="${routes.login(location.pathname + location.search)}">${icon('user')}<span class="hide-sm">${t('Sign in')}</span></a>`;
  }
  const roleLinks = user.role === 'admin'
    ? `<a href="${routes.adminDash()}">${icon('shield-check')} ${t('Admin dashboard')}</a>`
    : user.role === 'vendor'
      ? `<a href="${routes.vendorDash()}">${icon('store')} ${t('Vendor dashboard')}</a><a href="${routes.vendorDash('go-live')}">${icon('radio')} ${t('Go live')}</a>`
      : '';
  return `
    <div class="account-menu">
      <button class="icon-btn" data-account-toggle>${avatar(user.name, { size: 'sm' })}<span class="hide-sm">${escapeHtml(user.name.split(' ')[0])}</span>${icon('chevron-down', 'hide-sm')}</button>
      <div class="dropdown" data-account-menu>
        <div class="who"><strong>${escapeHtml(user.name)}</strong><div class="xs muted">${escapeHtml(user.email)} · <span class="badge badge-primary" style="height:18px">${t(user.role)}</span></div></div>
        <hr>
        ${roleLinks}
        <a href="${routes.account()}">${icon('user')} ${t('My account')}</a>
        <a href="${routes.orders()}">${icon('package')} ${t('My orders')}</a>
        <a href="${routes.wishlist()}">${icon('heart')} ${t('Wishlist')}</a>
        <a href="${routes.saved()}">${icon('bookmark')} ${t('Saved reels')}</a>
        <a href="${routes.following()}">${icon('users')} ${t('Following')}</a>
        <hr>
        <button data-logout>${icon('log-out')} ${t('Sign out')}</button>
      </div>
    </div>`;
}

function megaHtml(root) {
  return `<div class="mega" data-mega="${root.id}"><div class="container mega-inner">
    ${root.children.map((c) => `
      <div><h4><a href="${routes.products({ category: c.id })}">${escapeHtml(t(c.name))}</a></h4>
        ${c.children.length ? `<ul>${c.children.map((g) => `<li><a href="${routes.products({ category: g.id })}">${escapeHtml(t(g.name))}</a></li>`).join('')}</ul>` : ''}
      </div>`).join('')}
    <div><h4><a href="${routes.products({ category: root.id })}" class="text-primary">${t('View all {name}', { name: escapeHtml(t(root.name)) })} →</a></h4></div>
  </div></div>`;
}

export function renderHeader(el, { active = '' } = {}) {
  const user = currentUser();
  const tree = categoryTree();
  const liveCount = db.where('streams', (s) => s.status === 'live').length;
  const currentCat = qs('category');

  el.innerHTML = `
    <div class="topbar"><div class="container">
      <span>${icon('truck')} ${t('Free delivery on orders over {amount}', { amount: formatPrice(CONFIG.FREE_SHIPPING_MIN) })}</span>
      <div class="topbar-links">
        <a href="${routes.register('vendor')}">${t('Sell on {app}', { app: CONFIG.APP_NAME })}</a>
        <a href="${routes.orders()}">${t('Track order')}</a>
        <a href="#" data-open-chat>${t('Help & support')}</a>
      </div>
    </div></div>
    <header class="site-header">
      <div class="container header-main">
        <button class="icon-btn menu-toggle" data-menu-toggle aria-label="Menu">${icon('menu')}</button>
        ${logoHtml()}
        <div class="header-search">
          <form data-search-form autocomplete="off">
            <input type="search" name="q" placeholder='${t('Try "phone under 20k" or "gift for her"')}' value="${escapeHtml(active === 'search' ? qs('q') || '' : '')}" aria-label="${t('Search')}">
            <span class="ai-chip">${icon('sparkles')} AI</span>
            <button type="submit" aria-label="${t('Search')}">${icon('search')}</button>
          </form>
          <div class="search-suggest hidden" data-suggest></div>
        </div>
        <div class="header-actions">
          <a class="icon-btn hide-sm ${active === 'reels' ? 'text-primary' : ''}" href="${routes.reels()}" title="${t('Reels')}">${icon('clapperboard')}<span>${t('Reels')}</span></a>
          <a class="icon-btn hide-sm" href="${routes.live()}" title="${t('Live')}">${icon('radio')}<span>${t('Live')}</span>${liveCount ? '<span class="live-dot"></span>' : ''}</a>
          <a class="icon-btn hide-sm" href="${routes.wishlist()}" title="${t('Wishlist')}">${icon('heart')}<span class="count ${getWishlistIds().length ? '' : 'hidden'}" data-wish-count>${getWishlistIds().length}</span></a>
          ${langToggleHtml()}
          ${themeToggleHtml()}
          <a class="icon-btn" href="${routes.cart()}" title="${t('Cart')}">${icon('shopping-cart')}<span class="count ${cartCount() ? '' : 'hidden'}" data-cart-count>${cartCount()}</span></a>
          ${accountHtml(user)}
        </div>
      </div>
      <nav class="cat-nav" data-cat-nav><div class="container">
        <div class="cat-nav-item"><a href="${routes.categories()}">${icon('layout-grid')} ${t('All categories')}</a></div>
        ${tree.map((r) => `<div class="cat-nav-item ${currentCat && currentCat === r.id ? 'active' : ''}" data-cat="${r.id}"><a href="${routes.products({ category: r.id })}">${escapeHtml(t(r.name))}</a></div>`).join('')}
        <div class="cat-nav-item"><a class="special" href="${routes.products({ onSale: 1, sort: 'discount' })}">${icon('flame')} ${t('Deals')}</a></div>
        <div class="cat-nav-item"><a class="special" href="${routes.live()}">${icon('radio')} ${t('Live now')}${liveCount ? ` (${liveCount})` : ''}</a></div>
      </div></nav>
      ${tree.map(megaHtml).join('')}
    </header>`;

  bindHeader(el);
}

function bindHeader(el) {
  // account dropdown
  const toggle = el.querySelector('[data-account-toggle]');
  const menu = el.querySelector('[data-account-menu]');
  if (toggle) {
    toggle.onclick = (e) => { e.stopPropagation(); menu.classList.toggle('open'); };
    document.addEventListener('click', (e) => { if (!e.target.closest('.account-menu')) menu.classList.remove('open'); });
  }
  el.querySelector('[data-logout]')?.addEventListener('click', () => logout());
  el.querySelector('[data-menu-toggle]')?.addEventListener('click', () => el.querySelector('[data-cat-nav]').classList.toggle('open'));

  // mega menu
  let hideTimer;
  const hideAll = () => el.querySelectorAll('.mega').forEach((m) => m.classList.remove('open'));
  el.querySelectorAll('[data-cat]').forEach((item) => {
    const mega = el.querySelector(`[data-mega="${item.dataset.cat}"]`);
    const show = () => { clearTimeout(hideTimer); hideAll(); mega.classList.add('open'); };
    const hide = () => { hideTimer = setTimeout(() => mega.classList.remove('open'), 150); };
    item.addEventListener('mouseenter', show);
    item.addEventListener('mouseleave', hide);
    mega.addEventListener('mouseenter', () => clearTimeout(hideTimer));
    mega.addEventListener('mouseleave', hide);
  });

  // search + suggestions
  const form = el.querySelector('[data-search-form]');
  const input = form.querySelector('input');
  const box = el.querySelector('[data-suggest]');
  form.onsubmit = (e) => {
    e.preventDefault();
    const q = input.value.trim();
    if (q) location.href = routes.search(q);
  };
  const render = debounce(() => {
    const q = input.value.trim();
    if (q.length < 2) { box.classList.add('hidden'); return; }
    const { products, categories } = suggest(q);
    box.innerHTML = `
      <a href="${routes.search(q)}">${icon('sparkles', 'text-primary')}<span>${t('Smart search for "{q}" across products, reels & live', { q: `<b>${escapeHtml(q)}</b>` })}</span></a>
      ${categories.length ? `<div class="label">${t('Categories')}</div>${categories.map((c) => `<a href="${routes.products({ category: c.id })}">${icon('folder')} ${escapeHtml(t(c.name))}</a>`).join('')}` : ''}
      ${products.length ? `<div class="label">${t('Products')}</div>${products.map((p) => `<a href="${routes.product(p.id)}"><img src="${p.thumbnail}" alt=""><span class="truncate">${escapeHtml(p.title)}</span></a>`).join('')}` : ''}`;
    box.classList.remove('hidden');
  }, 150);
  input.addEventListener('input', render);
  input.addEventListener('focus', render);
  document.addEventListener('click', (e) => { if (!e.target.closest('.header-search')) box.classList.add('hidden'); });
}

export function bindHeaderCounts() {
  on('store:cart', () => {
    const n = cartCount();
    document.querySelectorAll('[data-cart-count]').forEach((b) => { b.textContent = n; b.classList.toggle('hidden', !n); });
  });
  on('store:wishlist', () => {
    const n = getWishlistIds().length;
    document.querySelectorAll('[data-wish-count]').forEach((b) => { b.textContent = n; b.classList.toggle('hidden', !n); });
  });
}

export function renderBottomNav(el, active) {
  const user = currentUser();
  const n = cartCount();
  const items = [
    ['home', 'house', t('Home'), routes.home()],
    ['reels', 'clapperboard', t('Reels'), routes.reels()],
    ['live', 'radio', t('Live'), routes.live()],
    ['cart', 'shopping-cart', t('Cart'), routes.cart()],
    ['account', 'user', user ? t('Account') : t('Sign in'), user ? dashboardFor(user.role) : routes.login()],
  ];
  el.innerHTML = items.map(([key, ic, label, href]) => `
    <a href="${href}" class="${active === key ? 'active' : ''}">${icon(ic)}<span>${label}</span>${key === 'cart' ? `<span class="count ${n ? '' : 'hidden'}" data-cart-count>${n}</span>` : ''}</a>`).join('');
}
