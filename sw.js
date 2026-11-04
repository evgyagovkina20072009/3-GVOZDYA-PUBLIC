const VERSION = "three-nails-pwa-v15-bold-day-headings";
const SHELL = ["./", "./index.html", "./style.css", "./mobile.css", "./mobile-header.css", "./mobile-header.js", "./print.css", "./help.css", "./app.js", "./desktop/preload-data.js", "./desktop/save-data.js", "./mobile.js", "./tablet-scale.js", "./print.js", "./help.js", "./install.js", "./manifest.webmanifest", "./icons/icon.svg", "./icons/icon-192.png", "./icons/icon-512.png", "./assets/city-day.jpg", "./assets/city-night.jpg"];
self.addEventListener("install", event => {
  event.waitUntil(caches.open(VERSION).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith("three-nails-pwa-") && k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", event => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== self.location.origin) return;
  if (req.mode === "navigate") {
    event.respondWith(fetch(req, { cache: "no-store" }).catch(() => caches.match("./index.html")));
    return;
  }
  // Previously cache-first with ignoreSearch pinned older app.js/mobile.css
  // even after HTML version parameters changed. Prefer fresh online application files.
  const isShellFile = /\.(?:js|css|html)$/i.test(url.pathname);
  if (isShellFile) {
    event.respondWith(
      fetch(req, { cache: "no-store" }).then(response => {
        if (response.ok) {
          const copy = response.clone();
          event.waitUntil(caches.open(VERSION).then(cache => cache.put(req, copy)));
        }
        return response;
      }).catch(() => caches.match(req, { ignoreSearch: true }))
    );
    return;
  }
  event.respondWith(caches.match(req, { ignoreSearch: true }).then(cached => cached || fetch(req)));
});