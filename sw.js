/**
 * Service Worker for Offline Event Counter PWA
 * 
 * Implements a strict Cache-First (Cache falling back to Network) strategy
 * to ensure 100% offline functionality after the initial install.
 */

const CACHE_NAME = 'event-counter-cache-v2';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// 1. Installation - Cache static local assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Pre-caching static assets for offline use');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => self.skipWaiting()) // Force activation
  );
});

// 2. Activation - Clear out-of-date caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Deleting obsolete cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim()) // Acquire control over active clients
  );
});

// 3. Fetch - Offline Cache-First Caching Strategy
self.addEventListener('fetch', (event) => {
  // Exclude Google Script POST requests or other non-GET API requests
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // 1. Return cached asset if present immediately
      if (cachedResponse) {
        return cachedResponse;
      }

      // 2. Otherwise, fetch from network
      return fetch(event.request)
        .then((networkResponse) => {
          // Check if valid response and from the same origin before caching
          if (
            !networkResponse ||
            networkResponse.status !== 200 ||
            networkResponse.type !== 'basic'
          ) {
            return networkResponse;
          }

          // Cache newly requested GET resources on-the-fly (dynamic local assets)
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });

          return networkResponse;
        })
        .catch(() => {
          // Offline fallback for page navigation
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
        });
    })
  );
});
