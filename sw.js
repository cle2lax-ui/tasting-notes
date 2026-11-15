/* Blind Tasting Notes — offline app shell. Bump VERSION with every release so phones pick up the update. */
const VERSION = 'btn-v1.1';
const SHELL = ['./', 'index.html', 'logic.js', 'store.js', 'google.js', 'manifest.webmanifest',
  'icons/apple-touch-icon.png', 'icons/icon-192.png', 'icons/icon-512.png',
  'fonts/archivo-400.woff2', 'fonts/archivo-500.woff2', 'fonts/archivo-600.woff2', 'fonts/archivo-700.woff2',
  'fonts/playfair-500-italic.woff2', 'fonts/playfair-600-italic.woff2', 'fonts/playfair-700-italic.woff2',
  'fonts/playfair-600.woff2', 'fonts/playfair-700.woff2'];
self.addEventListener('install', e => { e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;          // Google sign-in and APIs always go to the network
  // the page itself: network first (so updates arrive), cached copy when offline
  if (e.request.mode === 'navigate') {
    e.respondWith(fetch(e.request).then(r => { const c = r.clone(); caches.open(VERSION).then(x => x.put('index.html', c)); return r; })
      .catch(() => caches.match('index.html')));
    return;
  }
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(hit => hit || fetch(e.request).then(r => {
    if (r.ok) { const c = r.clone(); caches.open(VERSION).then(x => x.put(e.request, c)); }
    return r;
  })));
});
