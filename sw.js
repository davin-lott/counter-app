/**
 * Service Worker for Offline Event Counter PWA
 * 
 * Implements standard caching for local-first execution.
 */

const CACHE_NAME = 'event-counter-cache-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  'https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap'
];

// 1. Installation - Cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Caching app shell assets');
        // Use addAll to pre-cache standard shell assets
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

// 3. Fetch - Offline Caching Strategy
self.addEventListener('fetch', (event) => {
  // Exclude Google Script POST requests or other non-GET API requests
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Serve cached asset if present
      if (cachedResponse) {
        // Asynchronously update cache in the background (Stale-While-Revalidate)
        fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, networkResponse);
              });
            }
          })
          .catch(() => { /* Silent catch if offline */ });
          
        return cachedResponse;
      }

      // Fallback to standard network request
      return fetch(event.request)
        .then((networkResponse) => {
          // Cache newly requested GET resources on-the-fly (e.g., dynamic Google font files)
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic' && !event.request.url.includes('googleapis') && !event.request.url.includes('gstatic')) {
            return networkResponse;
          }

          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });

          return networkResponse;
        })
        .catch(() => {
          // If offline and request is for page, return cached entry
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
        });
    })
  );
});
