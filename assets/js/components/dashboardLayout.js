import { requireRole, logout, currentVendor } from '../core/auth.js';
import { routes } from '../core/routes.js';
import { escapeHtml, icon, avatar, initIcons, t } from '../core/utils.js';
import { themeToggleHtml } from '../core/theme.js';
import { langToggleHtml } from '../core/i18n.js';
import { db } from '../services/db.js';
import { vendorOrdersSync } from '../services/orders.js';
import { logoHtml } from './header.js';
import { registerSW } from '../core/pwa.js';
import { channel } from '../services/realtime.js';

function vendorNav(vendor) {
  const vendorId = vendor?.id ?? null;
  const pending = vendorId ? vendorOrdersSync(vendorId).filter((o) => o.status === 'pending').length : 0;
  const isLive = vendorId ? db.where('streams', (s) => s.vendorId === vendorId && s.status === 'live').length : 0;
  const unread = vendorId ? db.where('conversations', (c) => c.vendorId === vendorId && c.messages.at(-1)?.from === 'customer').length : 0;
  return [
    ['dashboard', 'layout-dashboard', 'Overview'],
    'Catalog',
    ['products', 'package', 'Products'],
    ['inventory', 'boxes', 'Inventory'],
    'Sales',
    ['orders', 'shopping-bag', 'Orders', pending],
    ['analytics', 'chart-line', 'Analytics'],
    'Content',
    ['reels', 'clapperboard', 'Reels'],
    ['live', 'radio', 'Live streams', isLive ? 'LIVE' : 0],
    ['go-live', 'video', 'Go live studio'],
    'Engage',
    ['messages', 'message-circle', 'Messages', unread],
    ['settings', 'settings', 'Store settings'],
  ].map((x) => (typeof x === 'string' ? x : [...x.slice(0, 3), x[3], routes.vendorDash(x[0])]));
}

function adminNav() {
  const pendingVendors = db.where('vendors', (v) => v.status === 'pending').length;
  const modQueue = db.where('reels', (r) => r.status === 'pending' || r.status === 'flagged').length;
  const disputes = db.where('disputes', (d) => d.status === 'open').length;
  const payouts = db.where('payouts', (p) => p.status === 'requested').length;
  return [
    ['dashboard', 'layout-dashboard', 'Overview'],
    'Marketplace',
    ['vendors', 'store', 'Vendors', pendingVendors],
    ['customers', 'users', 'Customers'],
    ['products', 'package', 'Products'],
    ['categories', 'folder-tree', 'Categories'],
    'Content',
    ['moderation', 'shield-alert', 'Moderation', modQueue],
    'Commerce',
    ['orders', 'shopping-bag', 'Orders'],
    ['disputes', 'gavel', 'Disputes', disputes],
    ['payouts', 'wallet', 'Payouts', payouts],
    'Insights',
    ['analytics', 'chart-line', 'Analytics'],
    ['settings', 'settings', 'Settings'],
  ].map((x) => (typeof x === 'string' ? x : [...x.slice(0, 3), x[3], routes.adminDash(x[0])]));
}

/**
 * Guards the page by role, renders the dashboard layout and returns the content element.
 * Returns null (and redirects) if the user is not allowed.
 */
export function mountDashboard({ role, active, title }) {
  registerSW();
  channel('products');
  channel('orders');
  const user = requireRole(role);
  if (!user) return null;
  const vendor = role === 'vendor' ? currentVendor() : null;
  const nav = role === 'vendor' ? vendorNav(vendor) : adminNav();
  document.title = `${t(title)} · ${role === 'vendor' ? t('Vendor') : t('Admin')} · StreamCart`;

  const app = document.getElementById('app');
  app.innerHTML = `
  <div class="dash">
    <aside class="dash-side" data-side>
      <div class="row-between">${logoHtml(routes.home())}<span class="role-tag">${t(role)}</span></div>
      ${vendor ? `<div class="dash-store">${avatar(vendor.name, { size: 'sm', color: vendor.color })}<div class="grow"><div class="name truncate">${escapeHtml(vendor.name)}</div><div class="xs" style="color:#94a3b8">${vendor.status === 'approved' ? t('Verified seller') : t(vendor.status)}</div></div></div>` : ''}
      <nav class="dash-nav">
        ${nav.map((item) => typeof item === 'string'
          ? `<div class="group">${t(item)}</div>`
          : `<a href="${item[4]}" class="${item[0] === active ? 'active' : ''}">${icon(item[1])}<span>${t(item[2])}</span>${item[3] ? `<span class="badge">${item[3]}</span>` : ''}</a>`).join('')}
      </nav>
      <div class="bottom dash-nav">
        ${vendor ? `<a href="${routes.vendor(vendor.id)}">${icon('external-link')}<span>${t('View my store')}</span></a>` : ''}
        <a href="${routes.home()}">${icon('shopping-cart')}<span>${t('Back to marketplace')}</span></a>
        <a href="#" data-logout>${icon('log-out')}<span>${t('Sign out')}</span></a>
      </div>
    </aside>
    <div class="dash-main">
      <header class="dash-top">
        <button class="btn btn-ghost btn-icon dash-toggle" data-toggle aria-label="Menu">${icon('menu')}</button>
        <h1>${escapeHtml(t(title))}</h1>
        <div class="right">
          ${langToggleHtml('btn btn-ghost btn-icon')}
          ${themeToggleHtml('btn btn-ghost btn-icon')}
          <button class="btn btn-ghost btn-icon" title="${t('Notifications')}">${icon('bell')}</button>
          ${avatar(user.name, { size: 'sm' })}
          <div class="hide-sm"><div class="small bold">${escapeHtml(user.name)}</div><div class="xs muted">${user.email}</div></div>
        </div>
      </header>
      <div class="dash-content">
        ${vendor && vendor.status === 'pending' ? `<div class="notice warning mb-2">${icon('clock')}<div><b>${t('Your store is awaiting admin approval.')}</b> ${t("You can set up products now; they'll go public once approved.")}</div></div>` : ''}
        <div data-content></div>
      </div>
    </div>
  </div>`;
  app.querySelector('[data-logout]').onclick = (e) => { e.preventDefault(); logout(); };
  const side = app.querySelector('[data-side]');
  app.querySelector('[data-toggle]').onclick = (e) => { e.stopPropagation(); side.classList.toggle('open'); };
  document.addEventListener('click', (e) => { if (!e.target.closest('[data-side]')) side.classList.remove('open'); });
  initIcons();
  const content = app.querySelector('[data-content]');
  content.user = user;
  content.vendor = vendor;
  return content;
}
