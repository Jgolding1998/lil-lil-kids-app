// Service worker for Lil Lil Kids App
// This service worker caches all of the app's static assets so that the
// application can run offline after the first visit.  It listens for the
// install event to pre‑cache core resources and then serves them from
// cache on subsequent requests.  Additional resources are added to the
// cache on demand via the fetch handler.

// Bump the cache version whenever any assets are updated so that
// browsers will fetch fresh versions rather than serving from an old
// service worker cache. Changing this constant forces a new cache
// to be created and the old one deleted during activation.
// Bump the cache name to v4 whenever assets like background music or
// scripts are updated.  Incrementing this value forces the browser
// to fetch and cache fresh versions of files instead of serving
// outdated resources from a previous cache.
// Update the cache version to v6 so browsers fetch the latest assets,
// including updated styles and scripts for improved pinch‑zoom handling.
const CACHE_NAME = 'lil-lil-kids-cache-v6';

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