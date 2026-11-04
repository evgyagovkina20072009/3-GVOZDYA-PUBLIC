const VERSION = "three-nails-pwa-v10-calendar-print-toolbar";
const SHELL = ["./", "./index.html", "./style.css", "./mobile.css", "./mobile-header.css", "./mobile-header.js", "./print.css", "./help.css", "./app.js", "./desktop/preload-data.js", "./desktop/save-data.js", "./mobile.js", "./print.js", "./help.js", "./install.js", "./manifest.webmanifest", "./icons/icon.svg", "./icons/icon-192.png", "./icons/icon-512.png", "./assets/city-day.jpg", "./assets/city-night.jpg"];
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
    event.respondWith(fetch(req).catch(() => caches.match("./index.html")));
    return;
  }
  event.respondWith(caches.match(req, {ignoreSearch:true}).then(cached => cached || fetch(req)));
});
