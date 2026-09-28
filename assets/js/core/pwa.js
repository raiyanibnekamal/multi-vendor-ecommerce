// PWA Registration and Install Prompt Helper
import { toast } from '../components/toast.js';
import { t } from './utils.js';

let deferredPrompt = null;
let registrationPromise = null;

export function registerSW() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return null;
  if (registrationPromise) return registrationPromise;

  const isLocal = ['localhost', '127.0.0.1'].includes(window.location.hostname);
  if (isLocal) {
    // In local development, ensure stale service workers are cleared without breaking active module fetches
    registrationPromise = navigator.serviceWorker.getRegistrations().then((registrations) => {
      if (registrations.length > 0) {
        return Promise.all(registrations.map((r) => r.unregister()));
      }
    }).catch(() => null);
    return registrationPromise;
  }

  const root = document.body?.dataset?.root || './';
  const swUrl = root.endsWith('/') ? `${root}sw.js?v=20260928-11` : `${root}/sw.js?v=20260928-11`;
  registrationPromise = navigator.serviceWorker.register(swUrl, { scope: root || './' }).catch((err) => {
    console.warn('[StreamCart PWA] Service Worker registration failed:', err);
    return null;
  });
  return registrationPromise;
}

// Global listener for install prompt
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    window.dispatchEvent(new CustomEvent('pwa:ready-to-install'));
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    console.log('[StreamCart PWA] App was installed successfully.');
  });
}

export function promptInstall() {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then((choiceResult) => {
      if (choiceResult.outcome === 'accepted') {
        console.log('[StreamCart PWA] User accepted the install prompt');
      }
      deferredPrompt = null;
    });
  } else {
    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    if (isIos) {
      toast(t('Tap Share, then "Add to Home Screen"'), 'info');
    } else {
      toast(t('Use your browser menu → "Install app" / "Add to Home screen"'), 'info');
    }
  }
}

export function getDeferredPrompt() {
  return deferredPrompt;
}
