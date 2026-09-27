import { mountDashboard } from '../../components/dashboardLayout.js';
import { confirmDialog } from '../../components/modal.js';
import { toast } from '../../components/toast.js';
import { icon, escapeHtml, $ } from '../../core/utils.js';
import { store } from '../../core/store.js';
import { routes } from '../../core/routes.js';
import { CONFIG } from '../../core/config.js';
import { db } from '../../services/db.js';
import { COUPONS } from '../../services/orders.js';

const el = mountDashboard({ role: 'admin', active: 'settings', title: 'Platform settings' });
const DEFAULTS = {
  commission: 10, freeShippingMin: CONFIG.FREE_SHIPPING_MIN, shippingFee: CONFIG.SHIPPING_FEE,
  autoApproveReels: false, aiModeration: true, aiRecommendations: true, aiSupport: true,
  gateways: { card: true, bkash: true, nagad: true, cod: true }, videoProvider: CONFIG.LIVE_PROVIDER,
};

function render() {
  const s = { ...DEFAULTS, ...store.get('platform_settings', {}) };
  const sw = (name, on, label, hint = '') => `<label class="row-between small" style="gap:16px"><span>${label}${hint ? `<div class="xs muted">${hint}</div>` : ''}</span><label class="switch"><input type="checkbox" name="${name}" ${on ? 'checked' : ''}><span></span></label></label>`;
  el.innerHTML = `
    <form data-form>
      <div class="dash-head" style="margin-top:0"><div><h2>Platform settings</h2><p>Marketplace-wide defaults. In production these live in a <code>settings</code> table editable only by admins (RLS).</p></div><button class="btn btn-primary">${icon('save')} Save settings</button></div>
      <div class="dash-grid-2">
        <div class="card"><div class="card-head"><h3>${icon('badge-percent')} Fees & shipping</h3></div><div class="card-body form-grid">
          <div class="field"><label>Default commission (%)</label><input class="input" type="number" name="commission" value="${s.commission}" min="0" max="50"></div>
          <div class="field"><label>Shipping fee (৳)</label><input class="input" type="number" name="shippingFee" value="${s.shippingFee}"></div>
          <div class="field full"><label>Free shipping above (৳)</label><input class="input" type="number" name="freeShippingMin" value="${s.freeShippingMin}"></div>
        </div></div>
        <div class="card"><div class="card-head"><h3>${icon('credit-card')} Payment gateways</h3></div><div class="card-body stack">
          ${sw('gw_card', s.gateways.card, 'Card (Stripe / SSLCommerz)')}
          ${sw('gw_bkash', s.gateways.bkash, 'bKash')}
          ${sw('gw_nagad', s.gateways.nagad, 'Nagad')}
          ${sw('gw_cod', s.gateways.cod, 'Cash on delivery')}
        </div></div>
        <div class="card"><div class="card-head"><h3>${icon('sparkles')} AI features</h3></div><div class="card-body stack">
          ${sw('aiRecommendations', s.aiRecommendations, 'Personalised recommendations', 'Home feed, product pages and reel ranking')}
          ${sw('aiModeration', s.aiModeration, 'AI pre-screening of reels', 'Flags risky captions and untagged videos')}
          ${sw('aiSupport', s.aiSupport, 'AI shopping assistant', 'Chat widget on storefront pages')}
          ${sw('autoApproveReels', s.autoApproveReels, 'Auto-approve reels with a high AI safety score')}
        </div></div>
        <div class="card"><div class="card-head"><h3>${icon('radio')} Live video provider</h3></div><div class="card-body stack">
          <label class="radio-card"><input type="radio" name="videoProvider" value="livekit" ${s.videoProvider === 'livekit' ? 'checked' : ''}><div><b>LiveKit</b><div class="xs muted">Open-source WebRTC SFU, self-host or cloud. Token minted by a Supabase Edge Function.</div></div></label>
          <label class="radio-card"><input type="radio" name="videoProvider" value="agora" ${s.videoProvider === 'agora' ? 'checked' : ''}><div><b>Agora</b><div class="xs muted">Managed global network, pay per minute. Token minted by an Edge Function.</div></div></label>
        </div></div>
      </div>
    </form>
    <div class="dash-grid-2">
      <div class="card"><div class="card-head"><h3>${icon('ticket-percent')} Active coupons</h3></div>
        ${Object.entries(COUPONS).map(([code, c]) => `<div class="feed-item"><span class="badge badge-primary">${escapeHtml(code)}</span><span class="small grow">${escapeHtml(c.label || '')}</span></div>`).join('')}</div>
      <div class="card"><div class="card-head"><h3>${icon('database')} Demo data</h3></div><div class="card-body stack">
        <p class="small muted">All data in this demo lives in your browser's localStorage. Reset to restore the original seed data (orders, reels, vendors…) and sign out.</p>
        <button class="btn btn-danger" style="width:fit-content" data-reset>${icon('rotate-ccw')} Reset demo data</button>
      </div></div>
    </div>`;

  $('[data-form]').onsubmit = (e) => {
    e.preventDefault();
    const f = e.target;
    store.set('platform_settings', {
      commission: +f.commission.value, shippingFee: +f.shippingFee.value, freeShippingMin: +f.freeShippingMin.value,
      autoApproveReels: f.autoApproveReels.checked, aiModeration: f.aiModeration.checked, aiRecommendations: f.aiRecommendations.checked, aiSupport: f.aiSupport.checked,
      gateways: { card: f.gw_card.checked, bkash: f.gw_bkash.checked, nagad: f.gw_nagad.checked, cod: f.gw_cod.checked },
      videoProvider: f.videoProvider.value,
    });
    toast('Settings saved');
  };
  $('[data-reset]').onclick = async () => {
    if (!(await confirmDialog({ title: 'Reset all demo data?', message: 'Every change made in this browser will be lost.', confirmText: 'Reset', danger: true }))) return;
    db.resetAll();
    location.href = routes.home();
  };
}

if (el) render();
