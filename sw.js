// Service worker for Lil Lil Kids App
// This service worker caches all of the app's static assets so that the
// application can run offline after the first visit.  It listens for the
// install event to pre‑cache core resources and then serves them from
// cache on subsequent requests.  Additional resources are added to the
// cache on demand via the fetch handler.

const CACHE_NAME = 'lil-lil-kids-cache-v1';

// List of core files to pre‑cache.  These files are essential for
// loading the app shell.  We include HTML, CSS, JS and icon.  The
// remaining assets (images, sounds) will be added dynamically on
// demand when first requested.
const CORE_FILES = [
  '/',
  '/app_index.html',
  '/app_script.js',
  '/app_style.css',
  '/app_icon.png'
];

self.addEventListener('install', event => {
  // Perform installation steps: pre‑cache core files
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(CORE_FILES);
    })
  );
});

self.addEventListener('activate', event => {
  // Clean up old caches when activating new worker
  event.waitUntil(
    caches.keys().then(keyList => {
      return Promise.all(
        keyList.map(key => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
});

self.addEventListener('fetch', event => {
  // Respond with cached resource if available; otherwise fetch and cache it
  event.respondWith(
    caches.match(event.request).then(response => {
      if (response) {
        return response;
      }
      return fetch(event.request).then(res => {
        // Only cache GET requests for same‑origin resources
        if (!event.request.url.startsWith(self.location.origin)) {
          return res;
        }
        return caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, res.clone());
          return res;
        });
      }).catch(() => {
        // Optionally return a fallback when offline (e.g. a generic
        // offline page).  For now, just fail silently.
      });
    })
  );
});