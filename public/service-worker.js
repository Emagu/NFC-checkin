const CACHE_NAME = 'nfc-checkin-v1';
const RUNTIME_CACHE = 'nfc-checkin-runtime-v1';

// 需要預緩存的關鍵資源
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json'
];

async function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('checkinDB', 2);
    request.onupgradeneeded = event => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('checkins')) {
        db.createObjectStore('checkins', { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains('locations')) {
        db.createObjectStore('locations', { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getUnsyncedCheckins() {
  const db = await openDB();
  const tx = db.transaction('checkins', 'readonly');
  const store = tx.objectStore('checkins');
  return new Promise((resolve, reject) => {
    const req = store.getAll();
    req.onsuccess = () => {
      const result = (req.result || []).filter(item => !item.synced);
      resolve(result);
    };
    req.onerror = () => reject(req.error);
  });
}

async function saveCheckin(record) {
  const db = await openDB();
  const tx = db.transaction('checkins', 'readwrite');
  tx.objectStore('checkins').put(record);
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function syncCheckins() {
  try {
    const unsynced = await getUnsyncedCheckins();
    for (const item of unsynced) {
      try {
        const res = await fetch('/api/checkin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item)
        });
        if (res.ok) {
          item.synced = true;
          await saveCheckin(item);
        }
      } catch (err) {
        console.warn('Background sync upload failed', err);
      }
    }
  } catch (err) {
    console.warn('Background sync failed', err);
  }
}

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

// 激活事件 - 清理舊緩存
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
      return self.clients.claim(); // 立即控制所有頁面
    })
  );
});

// 獲取事件 - 實現離線策略
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // 只處理同源請求
  if (url.origin !== location.origin) {
    return;
  }

  // 跳過非 GET 請求
  if (request.method !== 'GET') {
    return;
  }

  // 跳過 API 請求（這些應該在線處理）
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // 調試日誌（可選，生產環境可移除）
  // console.log('[SW] Fetching:', request.url);

  // 處理導航請求（頁面請求）- 使用 Network First with Cache Fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request, { redirect: 'follow' })
        .then(response => {
          // 如果成功，緩存並返回
          if (response && response.status === 200 && response.type !== 'opaqueredirect') {
            const responseClone = response.clone();
            caches.open(RUNTIME_CACHE).then(cache => {
              // 創建一個新的 Request 對象用於緩存，避免重定向問題
              cache.put(request.url, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // 如果網絡失敗，嘗試從緩存返回
          return caches.match(request.url)
            .then(cachedResponse => {
              if (cachedResponse) {
                return cachedResponse;
              }
              // 如果緩存中也沒有該路徑，返回 index.html（SPA 回退）
              return caches.match('/index.html') || caches.match('/');
            });
        })
    );
    return;
  }

  // 處理其他資源（CSS, JS, 圖片等）- 使用 Network First with Cache Fallback
  event.respondWith(
    fetch(request, { redirect: 'follow' })
      .then(response => {
        // 如果網絡請求成功，緩存並返回
        if (response && response.status === 200 && response.type !== 'opaqueredirect') {
          const responseClone = response.clone();
          caches.open(RUNTIME_CACHE).then(cache => {
            // 使用 request.url 作為 key，避免重定向問題
            cache.put(request.url, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // 網絡請求失敗，嘗試從緩存返回
        return caches.match(request.url)
          .then(cachedResponse => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // 如果緩存中也沒有，返回適當的錯誤響應
            return new Response('Resource not available offline', { 
              status: 503, 
              statusText: 'Service Unavailable',
              headers: { 'Content-Type': 'text/plain' }
            });
          });
      })
  );
});

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
