const CACHE_NAME = 'nfc-checkin-v1';
const RUNTIME_CACHE = 'nfc-checkin-runtime-v1';

// 需要預緩存的關鍵資源
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json'
];

// 安裝事件 - 預緩存關鍵資源
self.addEventListener('install', event => {
  console.log('[SW] Installing service worker...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Caching app shell:', PRECACHE_URLS);
        // 使用 addAll，如果任何一個失敗都會導致整個安裝失敗
        // 改用 Promise.all 來處理，即使某些資源失敗也能繼續
        return Promise.allSettled(
          PRECACHE_URLS.map(url => 
            fetch(url)
              .then(response => {
                if (response.ok) {
                  return cache.put(url, response);
                }
                throw new Error(`Failed to fetch ${url}: ${response.status}`);
              })
              .catch(err => {
                console.warn(`[SW] Failed to cache ${url}:`, err);
                // 不拋出錯誤，讓其他資源繼續緩存
              })
          )
        ).then(() => {
          console.log('[SW] App shell cached');
        });
      })
      .then(() => {
        console.log('[SW] Service worker installed');
        return self.skipWaiting(); // 立即激活新的 service worker
      })
      .catch(err => {
        console.error('[SW] Installation failed:', err);
        // 即使緩存失敗，也繼續安裝
        return self.skipWaiting();
      })
  );
});

// 激活事件 - 清理舊緩存並立即控制頁面
self.addEventListener('activate', event => {
  console.log('[SW] Activating service worker...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      console.log('[SW] Found caches:', cacheNames);
      return Promise.all(
        cacheNames
          .filter(cacheName => {
            return cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE;
          })
          .map(cacheName => {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          })
      );
    })
    .then(() => {
      console.log('[SW] Service worker activated');
      // 立即控制所有頁面，這樣才能攔截後續請求
      return self.clients.claim();
    })
    .then(() => {
      console.log('[SW] Claimed all clients, now controlling pages');
      // 檢查緩存中是否有 JS 文件
      return caches.open(RUNTIME_CACHE).then(cache => {
        return cache.keys().then(keys => {
          const hasJS = keys.some(key => {
            const url = typeof key === 'string' ? key : key.url;
            return url.includes('.js') || url.includes('/assets/');
          });
          console.log('[SW] Cache check - has JS files:', hasJS, 'Total cached:', keys.length);
          
          // 通知所有客戶端 Service Worker 已激活
          return self.clients.matchAll().then(clients => {
            clients.forEach(client => {
              client.postMessage({ 
                type: 'SW_ACTIVATED',
                shouldReload: !hasJS // 如果沒有 JS 文件，建議重新載入
              });
            });
          });
        });
      });
    })
  );
});

// 獲取事件 - 實現離線策略
self.addEventListener('fetch', event => {
  const { request } = event
  const url = new URL(request.url)

  // 只處理同源請求
  if (url.origin !== location.origin) {
    return
  }

  // 跳過非 GET 請求
  if (request.method !== 'GET') {
    return
  }

  // 跳過 API 請求（這些應該在線處理）
  if (url.pathname.startsWith('/api/')) {
    return
  }

  // 調試日誌 - 只記錄資源請求，避免日誌過多
  if (request.mode !== 'navigate') {
    console.log('[SW] Fetching:', request.url, 'mode:', request.mode, 'destination:', request.destination)
  }

  event.respondWith(handleRequest(request))
})

async function handleRequest(request) {
  const cache = await caches.open(RUNTIME_CACHE)
  const normalizedRequest = request.redirect === 'follow'
    ? request
    : new Request(request, { redirect: 'follow' })

  // 導航請求（SPA 頁面）
  if (request.mode === 'navigate') {
    try {
      const networkResponse = await fetch(normalizedRequest)
      if (networkResponse && networkResponse.status === 200 && networkResponse.type !== 'opaqueredirect') {
        console.log('[SW] Caching navigation:', request.url)
        await cache.put(request, networkResponse.clone())
      }
      return networkResponse
    } catch (err) {
      console.log('[SW] Network failed for navigation, checking cache:', request.url)
      const cached = await cache.match(request)
      if (cached) {
        console.log('[SW] Found cached navigation:', request.url)
        return cached
      }
      const fallback = (await caches.match('/index.html')) || (await caches.match('/'))
      if (fallback) {
        console.log('[SW] Using fallback index.html')
        return fallback
      }
      return offlineFallback()
    }
  }

  // 其他靜態資源（JS、CSS、圖片等）
  try {
    const networkResponse = await fetch(normalizedRequest)
    if (networkResponse && networkResponse.status === 200 && networkResponse.type !== 'opaqueredirect') {
      console.log('[SW] Caching resource:', request.url, 'status:', networkResponse.status)
      // 使用 request 和 request.url 都嘗試緩存，確保能匹配
      await cache.put(request, networkResponse.clone())
      // 同時用 URL 字符串作為 key 緩存，以確保匹配
      await cache.put(request.url, networkResponse.clone())
    } else {
      console.log('[SW] Response not cacheable:', request.url, 'status:', networkResponse?.status, 'type:', networkResponse?.type)
    }
    return networkResponse
  } catch (err) {
    console.log('[SW] Network failed for resource, checking cache:', request.url, err)
    // 嘗試用 request 對象匹配
    let cached = await cache.match(request)
    if (cached) {
      console.log('[SW] Found cached resource (by request):', request.url)
      return cached
    }
    // 嘗試用 URL 字符串匹配
    cached = await cache.match(request.url)
    if (cached) {
      console.log('[SW] Found cached resource (by URL):', request.url)
      return cached
    }
    console.log('[SW] Resource not in cache:', request.url)
    return offlineFallback()
  }
}

function offlineFallback() {
  return new Response('Resource not available offline', {
    status: 503,
    statusText: 'Service Unavailable',
    headers: { 'Content-Type': 'text/plain' }
  })
}

self.addEventListener('sync', event => {
  if (event.tag === 'sync-checkins') {
    event.waitUntil(syncCheckins());
  }
});

self.addEventListener('push', event => {
  const data = event.data ? event.data.text() : 'Push message';
  event.waitUntil(
    self.registration.showNotification('NFC Checkin', { body: data })
  );
});
