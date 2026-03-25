const CACHE_NAME = 'quran-app-cache-v4';
const urlsToCache = [
  './',
  './index.html',
  './almanhaj.html',
  './juz_amma.html',
  './juz_tabarak.html',
  './css/main.css',
  './css/components.css',
  './js/core/config.js',
  './js/data/api/GoogleSheetsApi.js',
  './js/data/repositories/CurriculumRepository.js',
  './js/domain/models/Student.js',
  './js/domain/usecases/GetCurriculumData.js',
  './js/presentation/views/StudentCardView.js',
  './js/presentation/views/DashboardView.js',
  './js/presentation/controllers/DashboardController.js',
  './js/presentation/app.js',
  './images/quran.png',
  './images/quran-icon.png',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames =>
      Promise.all(
        cacheNames
          .filter(name => name.startsWith('quran-app-cache-') && name !== CACHE_NAME)
          .map(name => caches.delete(name))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  event.respondWith(
    fetch(event.request)
      .then(networkResponse => {
        if (event.request.method === 'GET' && networkResponse.ok) {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return networkResponse;
      })
      .catch(() => caches.match(event.request))
  );
});
