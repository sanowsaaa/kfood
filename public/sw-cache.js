
// СУПЕР АГРЕСИВЕН SERVICE WORKER за максимална скорост
const CACHE_NAME = 'k-food-ultra-cache-v1';
const STATIC_CACHE = 'k-food-static-v1';
const API_CACHE = 'k-food-api-v1';
const IMAGE_CACHE = 'k-food-images-v1';

// Ресурси за мигновено кеширане
const CRITICAL_RESOURCES = [
  '/',
  '/src/main.tsx',
  '/src/pages/home/page.tsx',
  '/src/components/OptimizedImage.tsx',
  '/src/components/SkeletonLoader.tsx',
  'https://cdn.jsdelivr.net/npm/remixicon@4.0.0/fonts/remixicon.css',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap'
];

// Стратегии за кеширане
const CACHE_STRATEGIES = {
  // Мигновено от cache, после update
  CACHE_FIRST: 'cache-first',
  // Мрежата първо, cache backup
  NETWORK_FIRST: 'network-first',  
  // Най-бързият отговор печели
  FASTEST: 'fastest'
};

self.addEventListener('install', event => {
  event.waitUntil(
    Promise.all([
      // Кешираме критичните ресурси мигновено
      caches.open(STATIC_CACHE).then(cache => 
        cache.addAll(CRITICAL_RESOURCES)
      ),
      // Пропускаме waiting фазата за мигновена активация
      self.skipWaiting()
    ])
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    Promise.all([
      // Почистваме старите кешове
      caches.keys().then(cacheNames =>
        Promise.all(
          cacheNames
            .filter(name => !name.includes('v1'))
            .map(name => caches.delete(name))
        )
      ),
      // Поемаме контрола мигновено
      self.clients.claim()
    ])
  );
});

self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // НЕ кешираме POST, PUT, DELETE, PATCH заявки
  if (request.method !== 'GET') {
    return;
  }

  // HTML файлове - Network first с бърз fallback
  if (request.destination === 'document') {
    event.respondWith(handleDocumentRequest(request));
  }
  // JS/CSS файлове - Cache first
  else if (request.destination === 'script' || request.destination === 'style') {
    event.respondWith(handleStaticRequest(request));
  }
  // Изображения - Cache first с компресия
  else if (request.destination === 'image') {
    event.respondWith(handleImageRequest(request));
  }
  // API заявки - Network first с cache backup
  else if (url.origin === location.origin && url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request));
  }
  // Всичко останало - най-бързата стратегия
  else {
    event.respondWith(handleFastestRequest(request));
  }
});

// Обработка на HTML документи
async function handleDocumentRequest(request) {
  try {
    // Опитваме мрежата първо за fresh content
    const networkResponse = await fetch(request);
    
    // Кешираме за следващия път
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    // Fallback към cache ако мрежата е недостъпна
    const cachedResponse = await caches.match(request);
    return cachedResponse || new Response('Офлайн режим - моля опитайте отново', {
      status: 503,
      statusText: 'Service Unavailable'
    });
  }
}

// Обработка на статичните ресурси
async function handleStaticRequest(request) {
  // Cache first - мигновена скорост
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    return new Response('Ресурсът не е намерен', { status: 404 });
  }
}

// Обработка на изображения с компресия
async function handleImageRequest(request) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);
    
    // Кешираме само успешните отговори
    if (networkResponse.ok) {
      const cache = await caches.open(IMAGE_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    // Fallback placeholder изображение
    return new Response(
      '<svg width="300" height="200" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#f3f4f6"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="#9ca3af">Изображение</text></svg>',
      { headers: { 'Content-Type': 'image/svg+xml' } }
    );
  }
}

// Обработка на API заявки
async function handleApiRequest(request) {
  try {
    // Network first за fresh данни
    const networkResponse = await fetch(request);
    
    // Кешираме GET заявките за backup
    if (request.method === 'GET' && networkResponse.ok) {
      const cache = await caches.open(API_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    // Fallback към cache само за GET заявки
    if (request.method === 'GET') {
      const cachedResponse = await caches.match(request);
      if (cachedResponse) {
        return cachedResponse;
      }
    }
    
    return new Response(JSON.stringify({ error: 'Мрежовата връзка е недостъпна' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Най-бърза стратегия - cache и network състезание
async function handleFastestRequest(request) {
  const cachePromise = caches.match(request);
  const networkPromise = fetch(request).catch(() => null);

  // Връщаме първия успешен отговор
  const response = await Promise.race([
    cachePromise.then(res => res || networkPromise),
    networkPromise.then(res => res || cachePromise)
  ]);

  // Ъпдейтваме cache в background
  if (response && response.ok) {
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, response.clone());
  }

  return response || new Response('Ресурсът не е достъпен', { status: 404 });
}

// Background sync за офлайн действия
self.addEventListener('sync', event => {
  if (event.tag === 'background-sync') {
    event.waitUntil(
      // Sync логика за офлайн операции
      console.log('Background sync triggered')
    );
  }
});

// Push notifications за ъпдейти
self.addEventListener('push', event => {
  const options = {
    body: 'Има нови продукти в K-FOOD!',
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    vibrate: [100, 50, 100],
    data: { url: '/' },
    actions: [
      { action: 'explore', title: 'Разгледай' },
      { action: 'close', title: 'Затвори' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('K-FOOD Ъпдейт', options)
  );
});
