import { CONFIG } from './config.js';
import { t, digits, isBn } from './i18n.js';

export { t, digits, isBn };

const DATE_LOCALE = isBn ? 'bn-BD' : 'en-GB';

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export const ROOT = (() => {
  const bodyRoot = document.body?.dataset?.root;
  if (bodyRoot) return bodyRoot;

  const pathname = location.pathname.replace(/\/+$/, '');
  const pageMatch = pathname.match(/^(.*\/)[^/]+\.html?$/i);
  if (pageMatch) {
    const base = pageMatch[1] || '/';
    return base === '/' ? './' : base;
  }

  return './';
})();

export const url = (path = '') => ROOT + String(path).replace(/^\//, '');

export function qs(name) {
  return new URLSearchParams(location.search).get(name);
}

export function escapeHtml(str = '') {
  return String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function fallbackMediaUrl(label = 'Image', { width = 900, height = 900, bg = '#111827', fg = '#f8fafc' } = {}) {
  const safeLabel = String(label || 'Image').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <defs>
        <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stop-color="#1f2937" />
          <stop offset="100%" stop-color="#0f172a" />
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#g)" rx="32"/>
      <circle cx="${width * 0.5}" cy="${height * 0.38}" r="${Math.min(width, height) * 0.17}" fill="${bg}" opacity="0.92"/>
      <path d="M${width * 0.28} ${height * 0.45} L${width * 0.72} ${height * 0.45} L${width * 0.6} ${height * 0.68} L${width * 0.4} ${height * 0.68} Z" fill="${fg}" opacity="0.15"/>
      <text x="50%" y="57%" text-anchor="middle" fill="${fg}" font-size="${Math.max(34, Math.min(width, height) * 0.06)}" font-family="Segoe UI, Arial, sans-serif" font-weight="700">${safeLabel.slice(0, 18)}</text>
      <text x="50%" y="67%" text-anchor="middle" fill="${fg}" opacity="0.75" font-size="${Math.max(18, Math.min(width, height) * 0.03)}" font-family="Segoe UI, Arial, sans-serif">No image available</text>
    </svg>
  `;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

export function safeMediaUrl(url, fallbackLabel = 'Image', fallbackColors) {
  if (typeof url === 'string' && url.trim()) return url;
  return fallbackMediaUrl(fallbackLabel, fallbackColors);
}

export function formatPrice(n) {
  return `${CONFIG.CURRENCY}${digits(Math.round(n).toLocaleString('en-IN'))}`;
}

export function formatNumber(n) {
  if (n >= 1e6) return digits((n / 1e6).toFixed(1).replace(/\.0$/, '')) + 'M';
  if (n >= 1e3) return digits((n / 1e3).toFixed(1).replace(/\.0$/, '')) + 'K';
  return digits(n);
}

function safeDate(iso) {
  if (!iso) return null;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDate(iso, opts = { day: 'numeric', month: 'short', year: 'numeric' }) {
  const date = safeDate(iso);
  if (!date) return '—';
  return date.toLocaleDateString(DATE_LOCALE, opts);
}

export function formatDateTime(iso) {
  const date = safeDate(iso);
  if (!date) return '—';
  return date.toLocaleString(DATE_LOCALE, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function timeAgo(iso) {
  const date = safeDate(iso);
  if (!date) return t('recently');
  const s = Math.floor((Date.now() - date.getTime()) / 1000);
  if (s < 0) return t('in {time}', { time: timeUntil(iso) });
  if (s < 60) return t('just now');
  const m = Math.floor(s / 60); if (m < 60) return t('{n}m ago', { n: digits(m) });
  const h = Math.floor(m / 60); if (h < 24) return t('{n}h ago', { n: digits(h) });
  const d = Math.floor(h / 24); if (d < 30) return t('{n}d ago', { n: digits(d) });
  return formatDate(iso);
}

export function timeUntil(iso) {
  const date = safeDate(iso);
  if (!date) return '—';
  const s = Math.max(0, Math.floor((date.getTime() - Date.now()) / 1000));
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
  if (d > 0) return t('{d}d {h}h', { d: digits(d), h: digits(h) });
  if (h > 0) return t('{h}h {m}m', { h: digits(h), m: digits(m) });
  return t('{m}m', { m: digits(m) });
}

export function debounce(fn, ms = 250) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

export function uid(prefix = 'id') {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export function initials(name = '') {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('');
}

const AVATAR_COLORS = ['#2563eb', '#4f46e5', '#0891b2', '#0f766e', '#16a34a', '#d97706', '#db2777', '#7c3aed', '#dc2626', '#475569'];
export function colorFor(key = '') {
  let h = 0;
  for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

export function avatar(name, { size = '', color } = {}) {
  return `<span class="avatar ${size ? 'avatar-' + size : ''}" style="background:${color || colorFor(name)}">${escapeHtml(initials(name))}</span>`;
}

export function icon(name, cls = '') {
  return `<i data-lucide="${name}" class="${cls}"></i>`;
}

export function stars(rating) {
  let out = '<span class="stars">';
  for (let i = 1; i <= 5; i++) out += `<i data-lucide="star" class="${i <= Math.round(rating) ? 'on' : ''}"></i>`;
  return out + '</span>';
}

export function statusBadge(status) {
  const label = t(String(status).replace(/_/g, ' ').replace('resolved ', 'resolved: '));
  return `<span class="status status-${status}">${escapeHtml(label)}</span>`;
}

export function seeded(seed) {
  let s = 0;
  for (const ch of String(seed)) s = (s * 31 + ch.charCodeAt(0)) | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function emit(name, detail) {
  window.dispatchEvent(new CustomEvent(name, { detail }));
}

export function on(name, fn) {
  window.addEventListener(name, (e) => fn(e.detail));
}

/** Renders Lucide icons for any newly inserted <i data-lucide> elements. */
export function initIcons() {
  let queued = false;
  const run = () => {
    queued = false;
    if (window.lucide && document.querySelector('i[data-lucide]')) window.lucide.createIcons();
  };
  const schedule = () => { if (!queued) { queued = true; requestAnimationFrame(run); } };
  new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });
  schedule();
}
