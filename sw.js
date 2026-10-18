// Reforma Bible / IMS Study Bible — offline service worker
//
// Strategy: network-first, cache-fallback. Every time the app is opened
// with a connection, it fetches the latest version and silently updates
// the offline cache. Every time it's opened with NO connection (airplane
// mode, no signal, etc.), it serves the last successfully-loaded version
// from the cache instead of failing to load at all.
//
// This file must be uploaded to the SAME folder as the app's .html file
// on your hosting (Netlify/Vercel/Cloudflare Pages), so it's served from
// the same origin/path as the page that registers it.

var CACHE_NAME = 'reforma-bible-cache-v1';

self.addEventListener('install', function (event) {
  // Activate this new service worker as soon as it's installed, without
  // waiting for old tabs/instances to close first.
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      // Drop any caches left over from a previous version of this worker.
      return Promise.all(
        keys
          .filter(function (k) { return k !== CACHE_NAME; })
          .map(function (k) { return caches.delete(k); })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function (event) {
  // Only intercept simple GET requests — anything else (POST to an API,
  // etc.) should just go straight to the network as normal.
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request).then(function (networkResponse) {
      // Got a fresh copy from the network — stash it in the cache for
      // next time we're offline, then return it to the page as usual.
      var copy = networkResponse.clone();
      caches.open(CACHE_NAME).then(function (cache) {
        cache.put(event.request, copy);
      });
      return networkResponse;
    }).catch(function () {
      // Network failed (offline, no signal, etc.) — serve whatever we
      // have cached for this exact request instead.
      return caches.match(event.request);
    })
  );
});
