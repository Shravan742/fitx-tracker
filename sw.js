// Service worker — app shell caching (offline-first)
const CACHE = 'fitx-v1';
const SHELL = [
  '/',
  '/index.html',
  '/css/main.css',
  '/js/app.js',
  '/js/db.js',
  '/js/profiles.js',
  '/js/macros.js',
  '/js/orm.js',
  '/js/suggestions.js',
  '/js/sync.js',
  '/js/views/onboarding.js',
  '/js/views/dashboard.js',
  '/js/views/workout.js',
  '/js/views/meals.js',
  '/js/views/sleep.js',
  '/js/views/profile.js',
  '/js/data/exercises.js',
  '/js/data/recipes.js',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js',
  'https://cdn.jsdelivr.net/npm/idb@8/build/umd.js',
  'https://cdn.jsdelivr.net/npm/dayjs@1.11.10/dayjs.min.js',
  'https://cdn.jsdelivr.net/npm/lottie-web@5.12.2/build/player/lottie.min.js',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  // Network-first for GitHub API (sync), cache-first for everything else
  if (e.request.url.includes('api.github.com')) {
    e.respondWith(fetch(e.request).catch(() => new Response('', { status: 503 })));
    return;
  }
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request).then(res => {
      const clone = res.clone();
      caches.open(CACHE).then(c => c.put(e.request, clone));
      return res;
    }))
  );
});
