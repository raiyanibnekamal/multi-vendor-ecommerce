import { mountAccount } from './accountLayout.js';
import { productCard } from '../../components/cards.js';
import { toast } from '../../components/toast.js';
import { routes } from '../../core/routes.js';
import { escapeHtml, icon, avatar, formatDate, formatPrice, $ } from '../../core/utils.js';
import { getWishlistIds } from '../../services/cart.js';
import { getList } from '../../services/userdata.js';
import { recentlyViewedIds } from '../../services/ai.js';
import { db } from '../../services/db.js';

const el = mountAccount('profile');
if (el) render(el.user);

function render(user) {
  const orders = db.where('orders', (o) => o.customerId === user.id);
  const spent = orders.filter((o) => o.status !== 'cancelled').reduce((s, o) => s + o.total, 0);
  const viewed = recentlyViewedIds().map((id) => db.get('products', id)).filter(Boolean).slice(0, 4);

  el.innerHTML = `
    <div class="card card-pad row" style="gap:18px;flex-wrap:wrap">
      ${avatar(user.name, { size: 'lg' })}
      <div class="grow"><h2>${escapeHtml(user.name)}</h2><p class="muted small">${escapeHtml(user.email)} · Member since ${formatDate(user.joinedAt, { month: 'long', year: 'numeric' })}</p></div>
      <span class="badge badge-primary">${user.role}</span>
    </div>

    <div class="stats mt-2">
      <a class="stat" href="${routes.orders()}"><span class="ic">${icon('package')}</span><div><div class="val">${orders.length}</div><div class="lbl">Orders</div></div></a>
      <div class="stat"><span class="ic green">${icon('wallet')}</span><div><div class="val">${formatPrice(spent)}</div><div class="lbl">Total spent</div></div></div>
      <a class="stat" href="${routes.wishlist()}"><span class="ic red">${icon('heart')}</span><div><div class="val">${getWishlistIds().length}</div><div class="lbl">Wishlist</div></div></a>
      <a class="stat" href="${routes.following()}"><span class="ic violet">${icon('users')}</span><div><div class="val">${getList('following').length}</div><div class="lbl">Following</div></div></a>
    </div>

    <div class="dash-grid-2">
      <form class="card" data-profile>
        <div class="card-head"><h3>Personal information</h3></div>
        <div class="card-body stack">
          <div class="field"><label>Full name</label><input class="input" name="name" value="${escapeHtml(user.name)}" required></div>
          <div class="field"><label>Email</label><input class="input" type="email" name="email" value="${escapeHtml(user.email)}" required></div>
          <div class="field"><label>Phone</label><input class="input" name="phone" value="${escapeHtml(user.phone || '')}"></div>
          <button class="btn btn-primary" style="width:fit-content">Save changes</button>
        </div>
      </form>
      <form class="card" data-password>
        <div class="card-head"><h3>Security</h3></div>
        <div class="card-body stack">
          <div class="field"><label>Current password</label><input class="input" type="password" name="current" required></div>
          <div class="field"><label>New password</label><input class="input" type="password" name="next" minlength="6" required></div>
          <label class="check"><input type="checkbox" checked> Email me about order updates</label>
          <label class="check"><input type="checkbox" checked> Notify me when followed stores go live</label>
          <button class="btn btn-outline" style="width:fit-content">Update password</button>
        </div>
      </form>
    </div>

    ${viewed.length ? `<section class="section"><div class="section-head"><h3>Recently viewed</h3></div><div class="grid-products">${viewed.map(productCard).join('')}</div></section>` : ''}`;

  $('[data-profile]').onsubmit = (e) => {
    e.preventDefault();
    const f = e.target;
    db.update('users', user.id, { name: f.name.value.trim(), email: f.email.value.trim(), phone: f.phone.value.trim() });
    toast('Profile updated');
    render(db.get('users', user.id));
  };
  $('[data-password]').onsubmit = (e) => {
    e.preventDefault();
    const f = e.target;
    if (f.current.value !== user.password) return toast('Current password is incorrect', 'error');
    db.update('users', user.id, { password: f.next.value });
    f.reset();
    toast('Password updated');
  };
}
