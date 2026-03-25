const CACHE_NAME = 'quran-app-cache-v2';
const urlsToCache = [
  './',
  './index.html',
  './almanhaj.html',
  './juz_amma.html',
  './juz_tabarak.html',
  './css/main.css',
  './css/components.css'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(name => name.startsWith('quran-app-cache-') && name !== CACHE_NAME)
          .map(name => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  // Use Network First, fallback to Cache strategy
  event.respondWith(
    fetch(event.request)
      .then(networkResponse => {
        // Only cache successful GET requests
        if (event.request.method === 'GET' && networkResponse.ok) {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});
