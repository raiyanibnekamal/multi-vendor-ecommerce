import { CONFIG } from './config.js';
import { emit } from './utils.js';

const key = (k) => CONFIG.STORAGE_PREFIX + k;

export const store = {
  get(k, fallback = null) {
    try {
      const v = localStorage.getItem(key(k));
      return v === null ? fallback : JSON.parse(v);
    } catch {
      return fallback;
    }
  },
  set(k, value) {
    localStorage.setItem(key(k), JSON.stringify(value));
    emit(`store:${k}`, value);
  },
  remove(k) {
    localStorage.removeItem(key(k));
    emit(`store:${k}`, null);
  },
  clearAll() {
    Object.keys(localStorage).filter((k) => k.startsWith(CONFIG.STORAGE_PREFIX)).forEach((k) => localStorage.removeItem(k));
  },
};

// Keeps badges in sync when another tab changes cart/wishlist.
window.addEventListener('storage', (e) => {
  if (e.key?.startsWith(CONFIG.STORAGE_PREFIX)) {
    const k = e.key.slice(CONFIG.STORAGE_PREFIX.length);
    emit(`store:${k}`, e.newValue ? JSON.parse(e.newValue) : null);
  }
});
