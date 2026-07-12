const CACHE_NAME = 'quran-app-v5';

const urlsToCache = [
  './',
  './index.html',
  './css/main.css',
  './css/components.css',
  './css/admin.css',
  './manifest.json',
  './js/app.js',
  './js/sw-register.js',
  './js/core/config.js',
  './js/core/firebase.js',
  './js/core/authState.js',
  './js/core/router.js',
  './js/core/quran-data.js',
  './js/core/curriculum-data.js',
  './js/domain/models/Student.js',
  './js/domain/models/Leaderboard.js',
  './js/domain/usecases/RankStudents.js',
  './js/domain/usecases/ClassProgress.js',
  './js/data/repositories/BoardRepository.js',
  './js/presentation/views/ui.js',
  './js/presentation/views/StudentCardView.js',
  './js/presentation/views/ClassProgressView.js',
  './js/presentation/views/SurahPickerView.js',
  './js/presentation/pages/LandingPage.js',
  './js/presentation/pages/LoginPage.js',
  './js/presentation/pages/MyBoardsPage.js',
  './js/presentation/pages/BoardSettingsPage.js',
  './js/presentation/pages/StudentsPage.js',
  './js/presentation/pages/BoardPage.js',
  './js/presentation/pages/NotFoundPage.js',
  './images/quran.png',
  './images/quran-icon.png',
];

// أصول Firebase مثبّتة بإصدار محدد فهي غير قابلة للتغيير — يصح تخزينها أولاً بأولاً بلا انتهاء صلاحية
const CACHE_FIRST_HOSTS = ['www.gstatic.com', 'fonts.googleapis.com', 'fonts.gstatic.com'];

// مضيفات Firebase الحية (المصادقة وقاعدة البيانات) يجب ألا يعترضها الـ SW إطلاقاً
const NEVER_INTERCEPT_HOSTS = [
  'firestore.googleapis.com',
  'identitytoolkit.googleapis.com',
  'securetoken.googleapis.com',
  'accounts.google.com',
  'apis.google.com',
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
          .filter(name => name.startsWith('quran-app-') && name !== CACHE_NAME)
          .map(name => caches.delete(name))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  if (NEVER_INTERCEPT_HOSTS.includes(url.hostname)) {
    return; // اتركها تمر دون اعتراض حتى لا تُكسر اتصالات WebChannel الطويلة الخاصة بـ Firestore
  }

  if (CACHE_FIRST_HOSTS.includes(url.hostname)) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(networkResponse => {
          if (networkResponse.ok) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return networkResponse;
        });
      })
    );
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(networkResponse => {
        if (event.request.method === 'GET' && networkResponse.ok) {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return networkResponse;
      })
      .catch(() => caches.match(event.request).then(cached => {
        if (cached) return cached;
        if (event.request.mode === 'navigate') return caches.match('./index.html');
        return Response.error();
      }))
  );
});
