// Generated at build time by tools/sw-plugin.ts. Precaches the app for offline use.
const CACHE = "cs-mwqvzht1";
const FILES = ["./","./index.html","./favicon.svg","./assets/index-Dqe0VAEv.js","./assets/cases-glv-12-301-DeEJj7Sj.js","./assets/cdm-hrp-301-B9DrpH9W.js","./assets/docx-37lk3NNJ.js","./assets/handoff-BvB3BfP5.js","./assets/sdtm-glv-12-301-DJ0jDBBq.js","./assets/sdtm-hrp-301-CHU6hVpt.js","./assets/index-jQWL4fha.css"];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith("cs-") && k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return; // the classroom API is never cached
  if (req.mode === 'navigate') { e.respondWith(fetch(req).then((r) => { const c = r.clone(); caches.open(CACHE).then((x) => x.put('./index.html', c)); return r; }).catch(() => caches.match('./index.html'))); return; }
  e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((r) => { if (r.ok) { const c = r.clone(); caches.open(CACHE).then((x) => x.put(req, c)); } return r; })));
});
