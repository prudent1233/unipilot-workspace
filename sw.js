/* UniPilot service worker — conservative app-shell caching, no user data/API caching. */
'use strict';
const CACHE_PREFIX = 'unipilot-pwa-';
const CACHE_VERSION = 'v1';
const SHELL_CACHE = CACHE_PREFIX + CACHE_VERSION;
const OFFLINE_URL = '/offline.html';
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  OFFLINE_URL,
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable-192.png',
  '/icons/icon-maskable-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL_CACHE);
    // Install should not fail just because a redundant alias is unavailable.
    await Promise.all(PRECACHE_URLS.map(async url => {
      try {
        const response = await fetch(url, { cache: 'reload' });
        if (response.ok && response.type === 'basic') await cache.put(url, response);
      } catch (_) { /* Offline at install time: runtime navigation will retry. */ }
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(name => name.startsWith(CACHE_PREFIX) && name !== SHELL_CACHE)
      .map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});

async function networkFirstNavigation(request) {
  const cache = await caches.open(SHELL_CACHE);
  try {
    const response = await fetch(request);
    if (response && response.ok && response.type === 'basic') {
      // Refresh the root shell after each successful online navigation.
      await cache.put('/', response.clone());
      if (new URL(request.url).pathname === '/index.html') await cache.put('/index.html', response.clone());
    }
    return response;
  } catch (_) {
    return (await cache.match(request)) || (await cache.match('/')) ||
      (await cache.match('/index.html')) || (await cache.match(OFFLINE_URL));
  }
}

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  // Never intercept cross-origin resources, API calls, or requests with credentials.
  if (url.origin !== self.location.origin || request.credentials === 'include') return;

  if (request.mode === 'navigate') {
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  // Cache only the explicitly listed static shell assets. Everything else stays network-only.
  if (!PRECACHE_URLS.includes(url.pathname)) return;
  event.respondWith((async () => {
    const cache = await caches.open(SHELL_CACHE);
    const cached = await cache.match(url.pathname);
    const refresh = fetch(request).then(response => {
      if (response.ok && response.type === 'basic') cache.put(url.pathname, response.clone());
      return response;
    }).catch(() => null);
    if (cached) { event.waitUntil(refresh); return cached; }
    return (await refresh) || Response.error();
  })());
});
