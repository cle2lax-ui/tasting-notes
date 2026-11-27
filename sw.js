/* Tasting Notes — offline app shell. VERSION changes with every release; ASSETS only when a font, photo, icon or library changes. */
const VERSION = 'btn-v2.72', ASSETS = 'btn-assets-1501e0271c';
const CODE = ["./", "index.html", "logic.js?v=2.72", "store.js?v=2.72", "google.js?v=2.72", "lexicon.js?v=2.72", "app.js?v=2.72", "app2.js?v=2.72", "dash.js?v=2.72", "manifest.webmanifest", "manifest-local.webmanifest", "privacy.html", "credits.html"];
const STATIC = ["lib/jspdf.min.js", "fonts/archivo-400.woff2", "fonts/archivo-500.woff2", "fonts/archivo-600.woff2", "fonts/archivo-700.woff2", "fonts/playfair-600.woff2", "fonts/playfair-700.woff2", "fonts/pdf/archivo-400.ttf", "fonts/pdf/archivo-600.ttf", "fonts/pdf/playfair-700.ttf", "icons/apple-touch-icon.png", "icons/icon-192.png", "icons/icon-512.png", "icons/icon-maskable-512.png", "aromas/acetaldehyde.webp", "aromas/almond.webp", "aromas/apple.webp", "aromas/apricot.webp", "aromas/asparagus.webp", "aromas/banana.webp", "aromas/biscuit-graham-cracker.webp", "aromas/black-cherry.webp", "aromas/black-plum.webp", "aromas/black-white-pepper.webp", "aromas/blackberry.webp", "aromas/blackcurrant.webp", "aromas/blossom.webp", "aromas/blueberry.webp", "aromas/bread-dough.webp", "aromas/bread.webp", "aromas/brioche.webp", "aromas/butter.webp", "aromas/candy.webp", "aromas/caramel.webp", "aromas/cedar.webp", "aromas/charred-wood.webp", "aromas/cheese.webp", "aromas/chocolate.webp", "aromas/cinnamon.webp", "aromas/cloves.webp", "aromas/coconut.webp", "aromas/coffee.webp", "aromas/cooked-cherry.webp", "aromas/cooked-fruit.webp", "aromas/cooked-plum.webp", "aromas/cranberry.webp", "aromas/cream.webp", "aromas/dill.webp", "aromas/dried-apricot.webp", "aromas/dried-fruit.webp", "aromas/earth.webp", "aromas/elderflower.webp", "aromas/eucalyptus.webp", "aromas/fennel.webp", "aromas/fig.webp", "aromas/forest-floor.webp", "aromas/ginger.webp", "aromas/gooseberry.webp", "aromas/grape.webp", "aromas/grapefruit.webp", "aromas/grass.webp", "aromas/green-bell-pepper.webp", "aromas/hazelnut.webp", "aromas/honey.webp", "aromas/honeysuckle.webp", "aromas/jasmine.webp", "aromas/leather.webp", "aromas/lemon.webp", "aromas/licorice.webp", "aromas/lime.webp", "aromas/lychee.webp", "aromas/mango.webp", "aromas/meat.webp", "aromas/melon.webp", "aromas/mint.webp", "aromas/mushroom.webp", "aromas/nectarine.webp", "aromas/nutmeg.webp", "aromas/orange-marmalade.webp", "aromas/orange.webp", "aromas/oregano.webp", "aromas/passion-fruit.webp", "aromas/pastry.webp", "aromas/peach.webp", "aromas/pear.webp", "aromas/petrol.webp", "aromas/pineapple.webp", "aromas/prune.webp", "aromas/raisin.webp", "aromas/raspberry.webp", "aromas/red-cherry.webp", "aromas/red-plum.webp", "aromas/redcurrant.webp", "aromas/ripe-fruit.webp", "aromas/rose.webp", "aromas/smoke.webp", "aromas/strawberry.webp", "aromas/thyme.webp", "aromas/toasted-bread.webp", "aromas/tobacco.webp", "aromas/tomato-leaf.webp", "aromas/unripe-fruit.webp", "aromas/vanilla.webp", "aromas/violet.webp", "aromas/walnut.webp", "aromas/wet-leaves.webp", "aromas/wet-stones.webp", "aromas/yogurt.webp"];
const fresh = u => new Request(u, { cache: 'reload' });
self.addEventListener('install', e => {
  e.waitUntil(Promise.all([
    caches.open(VERSION).then(c => c.addAll(CODE.map(fresh))),
    caches.open(ASSETS).then(c => Promise.all(STATIC.map(u => c.match(u).then(hit => hit || c.add(fresh(u))))))   // only what's missing
  ]).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION && k !== ASSETS).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;              // Google sign-in and APIs always go to the network
  if (u.pathname.indexOf('/v2/') >= 0) return;                                        // the old 2.0 preview folder has its own worker
  if (e.request.mode === 'navigate') {                                                 // the page itself: network first, cached copy when offline
    e.respondWith(fetch(e.request, { cache: 'no-store' }).then(r => { const c = r.clone(); caches.open(VERSION).then(x => x.put('index.html', c)); return r; })
      .catch(() => caches.match('index.html')));
    return;
  }
  e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request).then(r => {
    if (r.ok) { const c = r.clone(), home = /\/(fonts|aromas|icons|lib)\//.test(u.pathname) ? ASSETS : VERSION; caches.open(home).then(x => x.put(e.request, c)); }
    return r;
  })));
});
