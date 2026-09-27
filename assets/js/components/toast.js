import { escapeHtml } from '../core/utils.js';

const ICONS = { success: 'circle-check', error: 'circle-alert', info: 'info' };

export function toast(message, type = 'success', { action, href, duration = 2800 } = {}) {
  let stack = document.querySelector('.toast-stack');
  if (!stack) {
    stack = document.createElement('div');
    stack.className = 'toast-stack';
    document.body.appendChild(stack);
  }
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<i data-lucide="${ICONS[type] || 'info'}"></i><span>${escapeHtml(message)}</span>${action && href ? `<a href="${href}">${escapeHtml(action)}</a>` : ''}`;
  stack.appendChild(el);
  setTimeout(() => {
    el.style.transition = 'opacity .25s, transform .25s';
    el.style.opacity = '0';
    el.style.transform = 'translateY(-6px)';
    setTimeout(() => el.remove(), 260);
  }, duration);
}
