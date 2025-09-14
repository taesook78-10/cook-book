
// v1.0.4 - share target support + root icon paths + updated cache
const CACHE_NAME = 'youtube-recipe-v1.0.4';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './icon-72x72.png',
  './icon-96x96.png',
  './icon-128x128.png',
  './icon-144x144.png',
  './icon-152x152.png',
  './icon-192x192.png',
  './icon-384x384.png',
  './icon-512x512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.map((n) => (n !== CACHE_NAME ? caches.delete(n) : undefined)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Handle Web Share Target (POST to ?share-target)
  if (request.method === 'POST' && url.searchParams.has('share-target')) {
    event.respondWith((async () => {
      try {
        const formData = await request.formData();
        const sharedUrl = formData.get('url') || '';
        const sharedText = formData.get('text') || '';
        const sharedTitle = formData.get('title') || '';
        const payload = encodeURIComponent(sharedUrl || sharedText || sharedTitle || '');
        // Redirect to app with #shared= payload
        return Response.redirect(`./#shared=${payload}`, 303);
      } catch (e) {
        // Fallback to app shell
        const cache = await caches.open(CACHE_NAME);
        const shell = await cache.match('./index.html') || await fetch('./index.html');
        return new Response(await shell.text(), { headers: { 'Content-Type': 'text/html' } });
      }
    })());
    return;
  }

  if (request.method !== 'GET') return;

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;

      return fetch(request).then((response) => {
        try {
          const isOk = response && response.status === 200;
          const isBasic = response.type === 'basic';
          if (isOk && isBasic) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
        } catch (_) {}
        return response;
      }).catch(() => {
        if (request.destination === 'document') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
