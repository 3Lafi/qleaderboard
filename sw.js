// عامل الخدمة: يخزّن أصول التطبيق مؤقتاً ليعمل دون اتصال — بلا قائمة ملفات يدوية تُنسى عند إضافة/إعادة تسمية ملف
const CACHE_NAME = 'wisam-cache-v30-custom-board-images';

// الصدفة الأساسية فقط تُخزَّن مسبقاً؛ بقية الأصول تُخزَّن تلقائياً عند أول طلب لها (انظر fetch أدناه)
const PRECACHE_URLS = ['/', '/index.html'];

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
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE_URLS)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames =>
      Promise.all(cacheNames.filter(name => name !== CACHE_NAME).map(name => caches.delete(name)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  if (NEVER_INTERCEPT_HOSTS.includes(url.hostname)) {
    return; // اتركها تمر دون اعتراض حتى لا تُكسر اتصالات WebChannel الطويلة الخاصة بـ Firestore
  }

  if (CACHE_FIRST_HOSTS.includes(url.hostname)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  if (request.mode === 'navigate') {
    // Let the browser follow the live-preview HTTP redirect. Do not substitute
    // a previously cached SPA document for a public sharing URL.
    if (url.origin === self.location.origin && /^\/b\/[^/]+\/?$/.test(url.pathname)) return;
    event.respondWith(networkFirst(request));
    return;
  }

  if (url.origin === self.location.origin) {
    if (/\.(js|css)$/.test(url.pathname)) {
      event.respondWith(networkAssetFirst(request));
    } else {
      event.respondWith(staleWhileRevalidate(request, event));
    }
  }
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) await putInCache(request, response.clone());
  return response;
}

// تنقلات الصفحة (index.html): يُحاول الشبكة أولاً ليصل التحديث فوراً، ويسقط للنسخة المخزّنة عند تعذّر الاتصال
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) await putInCache(request, response.clone());
    return response;
  } catch {
    return (await caches.match(request)) || (await caches.match('/index.html'));
  }
}

// الأصول الثابتة (JS/CSS/صور): تُعرض من المخزن المؤقت فوراً للسرعة، وتُحدَّث في الخلفية لأي زيارة لاحقة
async function staleWhileRevalidate(request, event) {
  const cached = await caches.match(request);
  const networkPromise = fetch(request)
    .then(async response => {
      if (response.ok) await putInCache(request, response.clone());
      return response;
    })
    .catch(() => null);
  event.waitUntil(networkPromise);
  return cached || (await networkPromise) || Response.error();
}

async function putInCache(request, response) {
  const cache = await caches.open(CACHE_NAME);
  await cache.put(request, response);
}

// ملفات الشيفرة من الشبكة أولاً كي لا يجتمع إصدار قديم من مكوّن مع ملف جديد.
async function networkAssetFirst(request) {
  try {
    const response = await fetch(request, { cache: 'no-cache' });
    if (response.ok) await putInCache(request, response.clone());
    return response;
  } catch {
    return (await caches.match(request)) || Response.error();
  }
}
