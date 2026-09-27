import { initIcons, on } from '../core/utils.js';
import { renderHeader, bindHeaderCounts, renderBottomNav } from './header.js';
import { renderFooter } from './footer.js';
import { bindCardActions } from './cards.js';
import { mountChatWidget } from './chatWidget.js';
import { registerSW } from '../core/pwa.js';
import { channel } from '../services/realtime.js';

/**
 * Mounts the storefront layout (header, footer, mobile nav, AI chat) into #app
 * and returns the <main> element for the page to render into.
 */
export function mountShell({ active = '', footer = true, chat = true, bottomNav = true } = {}) {
  registerSW();
  channel('products');
  channel('orders');
  const app = document.getElementById('app');
  app.innerHTML = `<div data-header></div><main id="main"></main>${footer ? '<div data-footer></div>' : ''}${bottomNav ? '<nav class="bottom-nav" data-bottom-nav></nav>' : ''}`;
  const headerEl = app.querySelector('[data-header]');
  const bottomEl = app.querySelector('[data-bottom-nav]');

  renderHeader(headerEl, { active });
  bindHeaderCounts();
  if (footer) renderFooter(app.querySelector('[data-footer]'));
  if (bottomEl) {
    renderBottomNav(bottomEl, active);
    document.body.classList.add('has-bottom-nav');
  }
  on('store:session', () => {
    renderHeader(headerEl, { active });
    if (bottomEl) renderBottomNav(bottomEl, active);
  });

  bindCardActions();
  if (chat) mountChatWidget();
  initIcons();
  return app.querySelector('#main');
}
