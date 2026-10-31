/* Три гвоздя — кешируются только общедоступные файлы приложения.
 * Личные задачи из localStorage никогда не кэшируются. */
const CACHE = 'three-nails-pwa-v1';
const SHELL = [
  './', './index.html', './style.css', './mobile.css',
  './print.css', './help.css', './app.js', './mobile.js',
  './print.js', './help.js', './manifest.webmanifest',
  './icons/icon-192.png', './icons/icon-512.png'
];
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(key => key.startsWith('three-nails-pwa-') && key !== CACHE)
        .map(key => caches.delete(key))
    )).then(() => self.clients.claim())
  );
});
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  event.respondWith(
    fetch(req).then(response => {
      if (response.ok && response.type === 'basic') {
        const copy = response.clone();
        event.waitUntil(caches.open(CACHE).then(cache => cache.put(req, copy)));
      }
      return response;
    }).catch(async () => {
      const cache = await caches.open(CACHE);
      return (await cache.match(req, {ignoreSearch:true})) ||
        (req.mode === 'navigate' ? await cache.match('./index.html') : Response.error());
    })
  );
});
