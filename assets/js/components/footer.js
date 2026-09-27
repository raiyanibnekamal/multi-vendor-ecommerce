import { CONFIG } from '../core/config.js';
import { routes } from '../core/routes.js';
import { categoryTree } from '../services/catalog.js';
import { escapeHtml, t } from '../core/utils.js';
import { logoHtml } from './header.js';

export function renderFooter(el) {
  const roots = categoryTree();
  el.innerHTML = `
  <footer class="site-footer"><div class="container">
    <div class="footer-grid">
      <div>
        ${logoHtml()}
        <p style="max-width:340px">${t('{app} is a multi-vendor marketplace where you can watch product reels and live streams — and buy instantly without leaving the video.', { app: CONFIG.APP_NAME })}</p>
      </div>
      <div><h4>${t('Shop')}</h4><ul>${roots.map((r) => `<li><a href="${routes.products({ category: r.id })}">${escapeHtml(t(r.name))}</a></li>`).join('')}</ul></div>
      <div><h4>${t('Discover')}</h4><ul>
        <li><a href="${routes.reels()}">${t('Reels')}</a></li>
        <li><a href="${routes.live()}">${t('Live streams')}</a></li>
        <li><a href="${routes.products({ onSale: 1, sort: 'discount' })}">${t("Today's deals")}</a></li>
        <li><a href="${routes.categories()}">${t('All categories')}</a></li>
      </ul></div>
      <div><h4>${t('Account & Selling')}</h4><ul>
        <li><a href="${routes.account()}">${t('My account')}</a></li>
        <li><a href="${routes.orders()}">${t('Track orders')}</a></li>
        <li><a href="${routes.register('vendor')}">${t('Become a vendor')}</a></li>
        <li><a href="${routes.vendorDash()}">${t('Vendor dashboard')}</a></li>
      </ul></div>
    </div>
    <div class="footer-bottom">
      <span>© ${new Date().getFullYear()} ${CONFIG.APP_NAME}. ${t('Frontend prototype — data is mocked.')}</span>
      <div class="pay-badges"><span>VISA</span><span>Mastercard</span><span>bKash</span><span>Nagad</span><span>COD</span></div>
    </div>
  </div></footer>`;
}
