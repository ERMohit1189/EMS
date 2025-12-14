const CACHE_NAME = 'ems-portal-v4';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json'
];

// Install event - cache essential files
self.addEventListener('install', event => {
  console.log('[Service Worker] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[Service Worker] Caching essential files');
      return cache.addAll(urlsToCache).catch(err => {
        console.log('[Service Worker] Cache addAll error:', err);
      });
    })
  );
  self.skipWaiting();
  console.log('[Service Worker] Installation complete');
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', event => {
  const { request } = event;

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Handle API requests with network-first (then cached fallback)
  if (request.url.includes('/api/')) {
    event.respondWith(
      fetch(request)
        .then(response => {
          // Optionally cache API responses for offline, but prefer fresh data
          if (response && response.ok) {
            const respClone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(request, respClone));
          }
          return response;
        })
        .catch(error => {
          // Try to return cached response if available
          return caches.match(request).then(cachedResponse => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // If no cache and fetch failed, return error response
            return new Response(
              JSON.stringify({ error: 'Network error - offline' }),
              {
                status: 503,
                statusText: 'Service Unavailable',
                headers: { 'Content-Type': 'application/json' }
              }
            );
          }).catch(() => {
            // Fallback for cache.match error
            return new Response(
              JSON.stringify({ error: 'Network error - offline' }),
              {
                status: 503,
                statusText: 'Service Unavailable',
                headers: { 'Content-Type': 'application/json' }
              }
            );
          });
        })
    );
    return;
  }

  // For navigation requests (HTML pages) use network-first to avoid serving stale index.html
  const acceptHeader = request.headers.get('accept') || '';
  const isNavigation = request.mode === 'navigate' || acceptHeader.includes('text/html');

  if (isNavigation) {
    event.respondWith(
      fetch(request)
        .then(response => {
          // Update the cache with the latest index.html for offline support
          if (response && response.ok) {
            const respClone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put('/index.html', respClone));
          }
          return response;
        })
        .catch(() => {
          return caches.match('/index.html').then(cachedResponse => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // Return error page if cache not available
            return new Response(
              '<!DOCTYPE html><html><body><h1>Service Unavailable</h1><p>The server is offline and no cached content is available.</p></body></html>',
              {
                status: 503,
                statusText: 'Service Unavailable',
                headers: { 'Content-Type': 'text/html' }
              }
            );
          });
        })
    );
    return;
  }

  // For other static assets (JS/CSS) - ALWAYS fetch from network in development, fallback to cache
  // This ensures you always get the latest code changes
  event.respondWith(
    fetch(request)
      .then(response => {
        if (!response || response.status !== 200) return response;
        // Cache the response for offline use
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(request, responseToCache));
        return response;
      })
      .catch(() => {
        // Only use cache if network fails (offline)
        return caches.match(request).then(cachedResponse => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // Fallback to index.html for navigation
          return caches.match('/index.html').then(indexResponse => {
            return indexResponse || new Response(
              'Resource not available',
              { status: 404, statusText: 'Not Found' }
            );
          }).catch(() => {
            return new Response(
              'Resource not available',
              { status: 404, statusText: 'Not Found' }
            );
          });
        });
      })
  );
  return;
});

// Message event - handle skip waiting
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
