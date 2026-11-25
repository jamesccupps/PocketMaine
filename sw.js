// Keeps a copy of the game so the installed app opens with no connection.
// The network is always tried first, so a new version shows up as soon as there is a connection; after three seconds
// without an answer the saved copy is shown instead.
const CACHE = 'pocket-maine-v1';
self.addEventListener('install', e => { self.skipWaiting(); e.waitUntil(caches.open(CACHE).then(c => c.addAll(['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png']))); });
self.addEventListener('activate', e => { e.waitUntil(self.clients.claim()); });
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  // On a weak connection the network can hang for a long time before it fails, so the cached copy is used if nothing
  // has come back in three seconds. The fetch carries on in the background and refreshes the cache for next time.
  const cached = () => caches.match(e.request, { ignoreSearch: true }).then(r => r || caches.match('./index.html'));
  const net = fetch(e.request).then(r => { if (r && r.ok) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); } return r; });
  net.catch(() => {});      // a late failure after the cached copy has been served is not an error
  e.respondWith(Promise.race([net, new Promise(res => setTimeout(() => res(null), 3000))]).then(r => r || cached().then(c => c || net)).catch(cached));
});
