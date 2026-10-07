const CACHE_NAME = 'k-food-cache-v1';
const STATIC_CACHE = 'k-food-static-v1';
const IMAGE_CACHE = 'k-food-images-v1';
const API_CACHE = 'k-food-api-v1';

// Ресурси за кеширане
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json'
];

// Install event - кеширане на статични ресурси
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate event - изчистване на стари кешове
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => {
            return name !== CACHE_NAME && 
                   name !== STATIC_CACHE && 
                   name !== IMAGE_CACHE && 
                   name !== API_CACHE;
          })
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch event - стратегия за кеширане
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // НЕ кешираме POST, PUT, DELETE, PATCH заявки
  if (request.method !== 'GET') {
    return;
  }

  // Изображения - Cache First (1 година)
  if (request.destination === 'image' || url.pathname.includes('/api/search-image')) {
    event.respondWith(
      caches.open(IMAGE_CACHE).then((cache) => {
        return cache.match(request).then((response) => {
          if (response) {
            return response;
          }
          return fetch(request).then((networkResponse) => {
            if (networkResponse.ok) {
              cache.put(request, networkResponse.clone());
            }
            return networkResponse;
          }).catch(() => response || fetch(request));
        });
      })
    );
    return;
  }

  // API заявки - Network First с fallback към кеш (само GET)
  if (url.pathname.includes('/api/') || url.hostname.includes('supabase')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(API_CACHE).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          return caches.match(request).then(cached => cached || fetch(request));
        })
    );
    return;
  }

  // Статични ресурси - Cache First
  if (request.destination === 'script' || 
      request.destination === 'style' || 
      request.destination === 'font') {
    event.respondWith(
      caches.open(STATIC_CACHE).then((cache) => {
        return cache.match(request).then((response) => {
          if (response) {
            return response;
          }
          return fetch(request).then((networkResponse) => {
            if (networkResponse.ok) {
              cache.put(request, networkResponse.clone());
            }
            return networkResponse;
          }).catch(() => response || fetch(request));
        });
      })
    );
    return;
  }

  // HTML страници - Network First
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(request).then(cached => cached || fetch(request));
      })
  );
});
