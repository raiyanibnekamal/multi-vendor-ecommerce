import { CONFIG } from './config.js';

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export const ROOT = document.body?.dataset.root ?? './';
export const url = (path = '') => ROOT + path.replace(/^\//, '');

export function qs(name) {
  return new URLSearchParams(location.search).get(name);
}

export function escapeHtml(str = '') {
  return String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function formatPrice(n) {
  return `${CONFIG.CURRENCY}${Math.round(n).toLocaleString('en-IN')}`;
}

export function formatNumber(n) {
  if (n >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'K';
  return String(n);
}

export function formatDate(iso, opts = { day: 'numeric', month: 'short', year: 'numeric' }) {
  return new Date(iso).toLocaleDateString('en-GB', opts);
}

export function formatDateTime(iso) {
  return new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function timeAgo(iso) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 0) return 'in ' + timeUntil(iso);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60); if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24); if (d < 30) return `${d}d ago`;
  return formatDate(iso);
}

export function timeUntil(iso) {
  const s = Math.max(0, Math.floor((new Date(iso).getTime() - Date.now()) / 1000));
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
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
  const label = String(status).replace(/_/g, ' ').replace('resolved ', 'resolved: ');
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
