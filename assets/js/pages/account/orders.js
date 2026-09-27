import { mountAccount } from './accountLayout.js';
import { emptyState, loading } from '../../components/cards.js';
import { routes } from '../../core/routes.js';
import { escapeHtml, icon, formatPrice, formatDate, statusBadge, $, $$ } from '../../core/utils.js';
import { getMyOrders } from '../../services/orders.js';

const el = mountAccount('orders', 'Orders');
let tab = 'all';
let orders = [];

const TABS = [['all', 'All'], ['pending', 'Pending'], ['processing', 'Processing'], ['shipped', 'Shipped'], ['delivered', 'Delivered'], ['cancelled', 'Cancelled']];

function render() {
  const list = tab === 'all' ? orders : orders.filter((o) => o.status === tab);
  el.innerHTML = `
    <div class="row-between mb-2"><h2>My orders</h2><span class="muted small">${orders.length} total</span></div>
    <div class="tabs mb-3">${TABS.map(([k, l]) => `<button class="tab ${tab === k ? 'active' : ''}" data-tab="${k}">${l} <span class="badge">${k === 'all' ? orders.length : orders.filter((o) => o.status === k).length}</span></button>`).join('')}</div>
    ${list.length ? list.map((o) => `
      <div class="order-card">
        <div class="order-card-head">
          <div class="row wrap" style="gap:16px"><b>${o.id}</b><span class="muted">Placed ${formatDate(o.createdAt)}</span>${o.source !== 'store' ? `<span class="badge badge-primary">${icon(o.source === 'live' ? 'radio' : 'clapperboard')} via ${o.source}</span>` : ''}</div>
          ${statusBadge(o.status)}
        </div>
        <div class="order-card-body">
          <div class="order-thumbs">${o.items.slice(0, 4).map((it) => `<img src="${it.thumbnail}" alt="" title="${escapeHtml(it.title)}">`).join('')}${o.items.length > 4 ? `<span class="muted small">+${o.items.length - 4}</span>` : ''}</div>
          <div class="grow"><div class="small bold clamp-2">${escapeHtml(o.items.map((i) => i.title).join(', '))}</div><div class="xs muted">${o.items.reduce((s, i) => s + i.qty, 0)} items · ${o.paymentMethod.toUpperCase()} · ${o.paymentStatus}</div></div>
          <div style="text-align:right"><div class="bold">${formatPrice(o.total)}</div><a class="btn btn-outline btn-sm mt-1" href="${routes.orderDetail(o.id)}">View details</a></div>
        </div>
      </div>`).join('') : emptyState('package', tab === 'all' ? 'No orders yet' : `No ${tab} orders`, 'When you buy something it will show up here.', `<a class="btn btn-primary" href="${routes.products()}">Start shopping</a>`)}`;
  $$('[data-tab]').forEach((b) => (b.onclick = () => { tab = b.dataset.tab; render(); }));
}

if (el) {
  el.innerHTML = loading();
  getMyOrders().then((list) => { orders = list; render(); });
}
