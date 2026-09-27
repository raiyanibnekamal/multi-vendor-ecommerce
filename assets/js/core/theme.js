import { store } from './store.js';
import { emit } from './utils.js';

const META = { light: '#ffffff', dark: '#111827' };

export function getTheme() {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}

export function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', META[theme]);
  store.set('theme', theme);
  emit('theme:change', theme);
}

export function toggleTheme() {
  setTheme(getTheme() === 'dark' ? 'light' : 'dark');
}

export function themeToggleHtml(cls = 'icon-btn') {
  return `<button class="${cls} theme-toggle" data-theme-toggle aria-label="Toggle dark mode" title="Dark / light mode"><i data-lucide="moon" class="i-moon"></i><i data-lucide="sun" class="i-sun"></i></button>`;
}

document.addEventListener('click', (e) => {
  if (e.target.closest('[data-theme-toggle]')) toggleTheme();
});
