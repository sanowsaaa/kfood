const STATIC_CACHE = 'k-food-static-v2';
const IMAGE_CACHE = 'k-food-images-v2';
const ownCaches = new Set([STATIC_CACHE, IMAGE_CACHE]);
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const name of await caches.keys()) {
      // Retire this application's old API/HTML caches, not another app's caches.
      if (name.startsWith('k-food-') && !ownCaches.has(name)) await caches.delete(name);
    }
    await self.clients.claim();
  })());
});
async function cachedAsset(request, name, limit) {
  const cache = await caches.open(name);
  const stored = await cache.match(request);
  if (stored) return stored;
  const response = await fetch(request);
  if (response.ok && ['basic', 'cors', 'default'].includes(response.type)) {
    const type = response.headers.get('content-type') || '';
    // A hosting fallback can return HTML for a missing JavaScript chunk.
    if (name === IMAGE_CACHE ? type.startsWith('image/') : /javascript|text\/css/.test(type)) {
      try {
        await cache.put(request, response.clone());
        const keys = await cache.keys();
        for (const key of keys.slice(0, Math.max(0, keys.length - limit))) await cache.delete(key);
      } catch { /* Caching is optional; always deliver the network response. */ }
    }
  }
  return response;
}
self.addEventListener('fetch', event => {
  const request = event.request, url = new URL(request.url);
  if (request.method !== 'GET' || request.headers.has('authorization')) return;
  // API/auth/order responses must always come from the network and never fall
  // back to another session's data, even when the browser is offline.
  if (url.hostname.endsWith('.supabase.co') || url.pathname.startsWith('/api/') ||
      request.mode === 'navigate' || request.destination === 'document') return;
  if (url.origin === self.location.origin && /^\/assets\/.+-[a-zA-Z0-9_-]+\.(js|css)$/.test(url.pathname)) {
    event.respondWith(cachedAsset(request, STATIC_CACHE, 100)); return;
  }
  const publicImage = url.origin === self.location.origin ||
    url.hostname === 'readdy.ai' || url.hostname.endsWith('.readdy.ai') || url.hostname === 'res.cloudinary.com';
  if (request.destination === 'image' && publicImage && !url.searchParams.has('token')) {
    event.respondWith(cachedAsset(request, IMAGE_CACHE, 200));
  }
});
