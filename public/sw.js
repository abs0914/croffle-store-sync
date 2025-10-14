/**
 * CROFFLE STORE POS - SERVICE WORKER
 * 
 * Comprehensive offline support with:
 * - Multiple caching strategies for different resource types
 * - Background sync for offline transactions
 * - Progressive data loading with priority-based resource fetching
 * - Intelligent cache management and cleanup
 * - Push notification support for sync status
 */

const CACHE_VERSION = 'v1.0.0';
const CACHE_NAMES = {
  static: `croffle-static-${CACHE_VERSION}`,
  dynamic: `croffle-dynamic-${CACHE_VERSION}`,
  api: `croffle-api-${CACHE_VERSION}`,
  images: `croffle-images-${CACHE_VERSION}`,
  fonts: `croffle-fonts-${CACHE_VERSION}`
};

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/offline.html',
  // Core CSS and JS will be added dynamically
];

const API_CACHE_PATTERNS = [
  /\/api\/stores/,
  /\/api\/products/,
  /\/api\/categories/,
  /\/api\/inventory/,
  /\/rest\/v1\/stores/,
  /\/rest\/v1\/products/,
  /\/rest\/v1\/categories/,
  /\/rest\/v1\/inventory_stock/
];

const CACHE_STRATEGIES = {
  static: 'cache-first',
  dynamic: 'network-first',
  api: 'network-first-with-cache-fallback',
  images: 'cache-first-with-network-fallback',
  fonts: 'cache-first'
};

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker installing...');
  
  event.waitUntil(
    Promise.all([
      caches.open(CACHE_NAMES.static).then((cache) => {
        console.log('📦 Caching static assets...');
        return cache.addAll(STATIC_ASSETS);
      }),
      // Skip waiting to activate immediately
      self.skipWaiting()
    ])
  );
});

// Activate event - cleanup old caches
self.addEventListener('activate', (event) => {
  console.log('✅ Service Worker activating...');
  
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (!Object.values(CACHE_NAMES).includes(cacheName)) {
              console.log('🗑️ Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Claim all clients
      self.clients.claim()
    ])
  );
});

// Fetch event - handle all network requests
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests and chrome-extension requests
  if (request.method !== 'GET' || url.protocol === 'chrome-extension:') {
    return;
  }

  // Determine caching strategy based on request type
  if (isStaticAsset(url)) {
    event.respondWith(handleStaticAsset(request));
  } else if (isApiRequest(url)) {
    event.respondWith(handleApiRequest(request));
  } else if (isImageRequest(url)) {
    event.respondWith(handleImageRequest(request));
  } else if (isFontRequest(url)) {
    event.respondWith(handleFontRequest(request));
  } else {
    event.respondWith(handleDynamicRequest(request));
  }
});

// Background sync event
self.addEventListener('sync', (event) => {
  console.log('🔄 Background sync triggered:', event.tag);
  
  if (event.tag === 'offline-transactions-sync') {
    event.waitUntil(syncOfflineTransactions());
  } else if (event.tag === 'product-cache-update') {
    event.waitUntil(updateProductCache());
  }
});

// Push notification event
self.addEventListener('push', (event) => {
  console.log('📱 Push notification received:', event.data?.text());
  
  if (event.data) {
    const data = event.data.json();
    event.waitUntil(showNotification(data));
  }
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('🔔 Notification clicked:', event.notification.tag);
  
  event.notification.close();
  
  // Handle different notification types
  if (event.notification.tag === 'sync-complete') {
    event.waitUntil(focusOrOpenApp('/pos'));
  } else if (event.notification.tag === 'sync-failed') {
    event.waitUntil(focusOrOpenApp('/pos?sync=retry'));
  }
});

// Message event - handle messages from main thread
self.addEventListener('message', (event) => {
  const { type, data } = event.data;
  
  switch (type) {
    case 'CACHE_PRODUCTS':
      event.waitUntil(cacheProducts(data.products));
      break;
    case 'TRIGGER_SYNC':
      event.waitUntil(triggerBackgroundSync());
      break;
    case 'CLEAR_CACHE':
      event.waitUntil(clearSpecificCache(data.cacheName));
      break;
    case 'GET_CACHE_STATUS':
      event.waitUntil(getCacheStatus().then(status => {
        event.ports[0].postMessage(status);
      }));
      break;
  }
});

// Helper functions

function isStaticAsset(url) {
  return url.pathname.match(/\.(js|css|html|ico|png|jpg|jpeg|svg|woff|woff2|ttf)$/) ||
         url.pathname === '/' ||
         url.pathname.startsWith('/assets/');
}

function isApiRequest(url) {
  return API_CACHE_PATTERNS.some(pattern => pattern.test(url.pathname)) ||
         url.hostname.includes('supabase') ||
         url.pathname.startsWith('/api/');
}

function isImageRequest(url) {
  return url.pathname.match(/\.(png|jpg|jpeg|gif|webp|svg)$/);
}

function isFontRequest(url) {
  return url.pathname.match(/\.(woff|woff2|ttf|eot)$/);
}

// Caching strategy implementations

async function handleStaticAsset(request) {
  try {
    const cache = await caches.open(CACHE_NAMES.static);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.error('❌ Static asset fetch failed:', error);
    return new Response('Offline', { status: 503 });
  }
}

async function handleApiRequest(request) {
  const cache = await caches.open(CACHE_NAMES.api);
  
  try {
    // Try network first
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache successful responses
      cache.put(request, networkResponse.clone());
      return networkResponse;
    } else {
      throw new Error(`Network response not ok: ${networkResponse.status}`);
    }
  } catch (error) {
    console.log('🌐 Network failed, trying cache for:', request.url);
    
    // Fallback to cache
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      // Add offline indicator header
      const response = cachedResponse.clone();
      response.headers.set('X-Served-From', 'cache');
      return response;
    }
    
    // Return offline response
    return new Response(
      JSON.stringify({ 
        error: 'Offline', 
        message: 'No cached data available',
        offline: true 
      }),
      { 
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

async function handleImageRequest(request) {
  try {
    const cache = await caches.open(CACHE_NAMES.images);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    // Return placeholder image for failed image requests
    return new Response(
      '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><rect width="200" height="200" fill="#f0f0f0"/><text x="100" y="100" text-anchor="middle" dy=".3em" fill="#999">Image Offline</text></svg>',
      { headers: { 'Content-Type': 'image/svg+xml' } }
    );
  }
}

async function handleFontRequest(request) {
  try {
    const cache = await caches.open(CACHE_NAMES.fonts);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.error('❌ Font fetch failed:', error);
    return new Response('', { status: 503 });
  }
}

async function handleDynamicRequest(request) {
  const cache = await caches.open(CACHE_NAMES.dynamic);
  
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      const offlineResponse = await caches.match('/offline.html');
      return offlineResponse || new Response('Offline', { status: 503 });
    }
    
    return new Response('Offline', { status: 503 });
  }
}

// Background sync functions

async function syncOfflineTransactions() {
  try {
    console.log('🔄 Starting background sync for offline transactions...');
    
    // This would integrate with the IntelligentSyncManager
    // For now, we'll send a message to the main thread
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'BACKGROUND_SYNC_TRIGGERED',
        data: { syncType: 'transactions' }
      });
    });
    
    console.log('✅ Background sync completed');
  } catch (error) {
    console.error('❌ Background sync failed:', error);
    throw error;
  }
}

async function updateProductCache() {
  try {
    console.log('📦 Updating product cache...');
    
    // Fetch latest products and cache them
    const response = await fetch('/api/products');
    if (response.ok) {
      const products = await response.json();
      await cacheProducts(products);
    }
    
    console.log('✅ Product cache updated');
  } catch (error) {
    console.error('❌ Product cache update failed:', error);
  }
}

async function cacheProducts(products) {
  const cache = await caches.open(CACHE_NAMES.api);
  
  // Cache individual product requests
  for (const product of products) {
    const productUrl = `/api/products/${product.id}`;
    const productResponse = new Response(JSON.stringify(product), {
      headers: { 'Content-Type': 'application/json' }
    });
    await cache.put(productUrl, productResponse);
  }
  
  console.log(`📦 Cached ${products.length} products`);
}

async function triggerBackgroundSync() {
  try {
    await self.registration.sync.register('offline-transactions-sync');
    console.log('🔄 Background sync registered');
  } catch (error) {
    console.error('❌ Background sync registration failed:', error);
  }
}

async function showNotification(data) {
  const options = {
    body: data.body,
    icon: '/icon-192x192.png',
    badge: '/icon-72x72.png',
    tag: data.tag || 'default',
    requireInteraction: data.requireInteraction || false,
    actions: data.actions || []
  };
  
  return self.registration.showNotification(data.title, options);
}

async function focusOrOpenApp(url = '/') {
  const clients = await self.clients.matchAll({ type: 'window' });
  
  // Try to focus existing window
  for (const client of clients) {
    if (client.url.includes(url) && 'focus' in client) {
      return client.focus();
    }
  }
  
  // Open new window
  if (self.clients.openWindow) {
    return self.clients.openWindow(url);
  }
}

async function clearSpecificCache(cacheName) {
  if (CACHE_NAMES[cacheName]) {
    await caches.delete(CACHE_NAMES[cacheName]);
    console.log(`🗑️ Cleared cache: ${cacheName}`);
  }
}

async function getCacheStatus() {
  const status = {};
  
  for (const [name, cacheName] of Object.entries(CACHE_NAMES)) {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    status[name] = {
      name: cacheName,
      entries: keys.length,
      size: await getCacheSize(cache)
    };
  }
  
  return status;
}

async function getCacheSize(cache) {
  let size = 0;
  const keys = await cache.keys();
  
  for (const key of keys) {
    const response = await cache.match(key);
    if (response) {
      const blob = await response.blob();
      size += blob.size;
    }
  }
  
  return size;
}

console.log('🚀 Croffle Store POS Service Worker loaded');
