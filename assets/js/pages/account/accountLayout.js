import { mountShell } from '../../components/shell.js';
import { requireRole, logout } from '../../core/auth.js';
import { routes, dashboardFor } from '../../core/routes.js';
import { escapeHtml, icon, avatar } from '../../core/utils.js';
import { getWishlistIds } from '../../services/cart.js';
import { getList } from '../../services/userdata.js';
import { db } from '../../services/db.js';

/** Guards the page (any signed-in role) and renders the account sidebar. Returns the content element. */
export function mountAccount(active, title) {
  const user = requireRole();
  if (!user) return null;
  const main = mountShell({ active: 'account' });
  const orders = db.where('orders', (o) => o.customerId === user.id).length;
  const links = [
    ['profile', 'user', 'Profile', routes.account()],
    ['orders', 'package', 'My orders', routes.orders(), orders],
    ['wishlist', 'heart', 'Wishlist', routes.wishlist(), getWishlistIds().length],
    ['saved', 'bookmark', 'Saved reels', routes.saved(), getList('savedReels').length],
    ['following', 'users', 'Following', routes.following(), getList('following').length],
    ['addresses', 'map-pin', 'Addresses', routes.addresses()],
  ];
  main.innerHTML = `
  <div class="container page">
    <nav class="breadcrumb"><a href="${routes.home()}">Home</a>${icon('chevron-right')}<a href="${routes.account()}">My account</a>${title ? `${icon('chevron-right')}<span>${escapeHtml(title)}</span>` : ''}</nav>
    <div class="account">
      <aside class="account-nav">
        <div class="account-user">${avatar(user.name)}<div style="min-width:0"><b class="truncate" style="display:block">${escapeHtml(user.name)}</b><span class="xs muted truncate" style="display:block">${escapeHtml(user.email)}</span></div></div>
        ${user.role !== 'customer' ? `<a href="${dashboardFor(user.role)}">${icon(user.role === 'admin' ? 'shield-check' : 'store')} ${user.role === 'admin' ? 'Admin' : 'Vendor'} dashboard</a>` : ''}
        ${links.map(([k, ic, label, href, n]) => `<a href="${href}" class="${active === k ? 'active' : ''}">${icon(ic)} ${label}${n ? `<span class="badge">${n}</span>` : ''}</a>`).join('')}
        <button data-logout>${icon('log-out')} Sign out</button>
      </aside>
      <section data-account-content></section>
    </div>
  </div>`;
  main.querySelector('[data-logout]').onclick = () => logout();
  const content = main.querySelector('[data-account-content]');
  content.user = user;
  return content;
}
