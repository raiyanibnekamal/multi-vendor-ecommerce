// Tiny i18n: English strings are the keys; missing Bangla entries fall back to English.
// Reads localStorage directly (not store.js) so utils.js can import it without a cycle.
import { CONFIG } from './config.js';
import { BN } from './i18n.bn.js';

const KEY = CONFIG.STORAGE_PREFIX + 'lang';

export const LANG = (() => {
  try { return JSON.parse(localStorage.getItem(KEY)) === 'bn' ? 'bn' : 'en'; } catch { return 'en'; }
})();
export const isBn = LANG === 'bn';

export function t(str, vars) {
  let out = isBn ? BN[str] ?? str : str;
  if (vars) out = out.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
  return out;
}

const BN_DIGITS = '০১২৩৪৫৬৭৮৯';
export function digits(value) {
  return isBn ? String(value).replace(/\d/g, (d) => BN_DIGITS[d]) : String(value);
}

export function setLang(lang) {
  localStorage.setItem(KEY, JSON.stringify(lang));
  location.reload();
}

export function langToggleHtml(cls = 'icon-btn') {
  return `<button class="${cls} lang-toggle" data-lang-toggle aria-label="Switch language" title="${isBn ? 'Switch to English' : 'বাংলায় দেখুন'}"><span class="lang-pill">${isBn ? 'EN' : 'বাং'}</span></button>`;
}

document.documentElement.lang = LANG;
document.addEventListener('click', (e) => {
  if (e.target.closest('[data-lang-toggle]')) setLang(isBn ? 'en' : 'bn');
});
