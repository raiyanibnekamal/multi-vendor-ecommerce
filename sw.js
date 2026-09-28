// StreamCart PWA Service Worker
const CACHE_NAME = 'streamcart-v8-2026-09-28-fix';
const PRECACHE_ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './assets/css/main.css',
  './assets/css/base.css',
  './assets/css/layout.css',
  './assets/css/components.css',
  './assets/css/dashboard.css',
  './assets/img/icon.svg',
  './assets/img/icon-192.png',
  './assets/img/icon-512.png',
  './assets/js/pages/home.js',
  './assets/js/components/shell.js',
  './assets/js/core/config.js',
  './assets/js/core/utils.js',
  './assets/js/core/theme.js',
  './assets/js/core/i18n.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('[StreamCart SW] Pre-cache partial fail:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

async function cacheResponse(request, response) {
  if (!response || response.status !== 200 || response.type === 'opaque' || response.bodyUsed) return;
  try {
    const responseCopy = response.clone();
    const cache = await caches.open(CACHE_NAME);
    await cache.put(request, responseCopy);
  } catch (error) {
    console.warn('[StreamCart SW] Response cache skipped:', error);
  }
}

async function networkFirst(request, useIndexFallback = false) {
  try {
    const response = await fetch(request);
    await cacheResponse(request, response);
    if (response.bodyUsed) {
      return (await caches.match(request)) || new Response('', { status: 503, statusText: 'Service Unavailable' });
    }
    return response;
  } catch {
    return (await caches.match(request))
      || (useIndexFallback ? await caches.match('./index.html') : Response.error());
  }
}

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);

  // JavaScript must always come from the current deployment; stale modules break the app after updates.
  if (url.origin === location.origin && (url.pathname.endsWith('.js') || event.request.destination === 'script')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Never cache authenticated API responses or requests carrying API keys.
  if (url.origin !== location.origin && (event.request.headers.has('authorization') || event.request.headers.has('apikey'))) return;

  const useIndexFallback = event.request.mode === 'navigate' || event.request.headers.get('accept')?.includes('text/html');
  event.respondWith(networkFirst(event.request, useIndexFallback));
});
