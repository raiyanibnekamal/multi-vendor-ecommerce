import { icon, initIcons, escapeHtml, safeMediaUrl } from '../../core/utils.js';
import { routes } from '../../core/routes.js';
import { logoHtml } from '../../components/header.js';
import { db } from '../../services/db.js';
import { registerSW } from '../../core/pwa.js';

/** Split-screen auth layout. Returns the form container. */
export function mountAuth(sideTitle = 'Watch. Shop. Live.') {
  registerSW();

  const seededPosters = [
    'https://cdn.dummyjson.com/product-images/smartphones/samsung-galaxy-s8/1.webp',
    'https://cdn.dummyjson.com/product-images/womens-dresses/corset-with-black-skirt/1.webp',
    'https://cdn.dummyjson.com/product-images/beauty/red-lipstick/1.webp',
  ];

  const posters = Array.from(new Set([
    ...db.where('reels', (r) => r.status === 'approved').map((r) => r.poster).filter(Boolean),
    ...seededPosters,
  ])).slice(0, 3);

  document.getElementById('app').innerHTML = `
  <div class="auth">
    <aside class="auth-side">
      ${logoHtml(routes.home())}
      <div>
        <h2>${sideTitle}</h2>
        <ul>
          <li><span class="ic">${icon('clapperboard')}</span> Shoppable reels from trusted sellers</li>
          <li><span class="ic">${icon('radio')}</span> Live streams with one-tap buying</li>
          <li><span class="ic">${icon('sparkles')}</span> AI recommendations made for you</li>
          <li><span class="ic">${icon('shield-check')}</span> Secure checkout with card, bKash & COD</li>
        </ul>
        <div class="auth-reels">${posters.map((p) => `<img src="${escapeHtml(safeMediaUrl(p, 'Reel preview'))}" alt="">`).join('')}</div>
      </div>
      <span class="small" style="opacity:.75">Frontend prototype. Accounts and data are mocked in your browser.</span>
    </aside>
    <main class="auth-main"><div class="auth-box" data-box></div></main>
  </div>`;
  initIcons();
  return document.querySelector('[data-box]');
}

export function passwordField(name = 'password', placeholder = 'Password', value = '') {
  return `<div class="input-group" style="position:relative">${icon('lock')}<input class="input" type="password" name="${name}" placeholder="${placeholder}" value="${value}" required minlength="6" autocomplete="current-password"><button type="button" class="pw-toggle" data-pw aria-label="Show password">${icon('eye')}</button></div>`;
}

export function bindPasswordToggles(root) {
  root.querySelectorAll('[data-pw]').forEach((b) => (b.onclick = () => {
    const input = b.previousElementSibling;
    input.type = input.type === 'password' ? 'text' : 'password';
    b.innerHTML = icon(input.type === 'password' ? 'eye' : 'eye-off');
  }));
}
