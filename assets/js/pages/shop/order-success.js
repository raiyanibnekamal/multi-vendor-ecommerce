import { mountShell } from '../../components/shell.js';
import { productCard, emptyState } from '../../components/cards.js';
import { routes } from '../../core/routes.js';
import { requireRole } from '../../core/auth.js';
import { escapeHtml, icon, qs, formatPrice, formatDate } from '../../core/utils.js';
import { getOrder, PAYMENT_METHODS } from '../../services/orders.js';
import { getRecommendations } from '../../services/ai.js';

const user = requireRole();
const main = mountShell({ active: 'checkout' });

async function render() {
  const order = await getOrder(qs('id'));
  if (!order || order.customerId !== user.id) {
    main.innerHTML = `<div class="container page">${emptyState('package-x', 'Order not found', '', `<a class="btn btn-primary" href="${routes.orders()}">My orders</a>`)}</div>`;
    return;
  }
  const eta = new Date(Date.now() + 3 * 86400000);
  const recs = await getRecommendations({ limit: 5, exclude: order.items.map((i) => i.productId) });
  main.innerHTML = `
  <div class="container page">
    <div class="success-box card card-pad" style="padding:40px 28px">
      <div class="check">${icon('circle-check')}</div>
      <h1>Thank you, ${escapeHtml(user.name.split(' ')[0])}!</h1>
      <p class="muted mt-1">Your order <b>${order.id}</b> has been placed. The seller has been notified in real time.</p>
      <div class="stats mt-3" style="text-align:left">
        <div class="stat"><span class="ic">${icon('receipt')}</span><div><div class="lbl">Total</div><div class="val" style="font-size:20px">${formatPrice(order.total)}</div></div></div>
        <div class="stat"><span class="ic green">${icon('credit-card')}</span><div><div class="lbl">Payment</div><div class="bold">${PAYMENT_METHODS.find((p) => p.id === order.paymentMethod)?.name}</div><div class="xs muted">${order.paymentStatus}</div></div></div>
        <div class="stat"><span class="ic violet">${icon('truck')}</span><div><div class="lbl">Estimated delivery</div><div class="bold">${formatDate(eta.toISOString(), { weekday: 'short', day: 'numeric', month: 'short' })}</div></div></div>
      </div>
      <div class="row mt-3" style="justify-content:center;flex-wrap:wrap">
        <a class="btn btn-primary btn-lg" href="${routes.orderDetail(order.id)}">${icon('package')} Track order</a>
        <a class="btn btn-outline btn-lg" href="${routes.home()}">Continue shopping</a>
      </div>
    </div>
    <section class="section"><div class="section-head"><div><h2>Picked for you next <span class="badge badge-ai">${icon('sparkles')} AI</span></h2><p>${escapeHtml(recs.reason)}</p></div></div><div class="grid-products">${recs.items.map(productCard).join('')}</div></section>
  </div>`;
}

if (user) render();
