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
  console.log('SW installed');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Caching app shell');
        return cache.addAll(PRECACHE_URLS);
      })
      .then(() => self.skipWaiting()) // 立即激活新的 service worker
      .catch(err => console.error('Cache failed', err))
  );
});

// 激活事件 - 清理舊緩存
self.addEventListener('activate', event => {
  console.log('SW activated');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(cacheName => {
            return cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE;
          })
          .map(cacheName => {
            console.log('Deleting old cache', cacheName);
            return caches.delete(cacheName);
          })
      );
    })
    .then(() => self.clients.claim()) // 立即控制所有頁面
  );
});

// 獲取事件 - 實現離線策略
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // 跳過非 GET 請求
  if (request.method !== 'GET') {
    return;
  }

  // 跳過 API 請求（這些應該在線處理）
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // 處理導航請求（頁面請求）
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          // 如果成功，緩存並返回
          const responseClone = response.clone();
          caches.open(RUNTIME_CACHE).then(cache => {
            cache.put(request, responseClone);
          });
          return response;
        })
        .catch(() => {
          // 如果失敗，從緩存返回 index.html
          return caches.match('/index.html') || caches.match('/');
        })
    );
    return;
  }

  // 處理其他資源（CSS, JS, 圖片等）
  event.respondWith(
    caches.match(request)
      .then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse;
        }

        // 如果緩存中沒有，從網絡獲取
        return fetch(request)
          .then(response => {
            // 只緩存成功的響應
            if (response && response.status === 200) {
              const responseClone = response.clone();
              caches.open(RUNTIME_CACHE).then(cache => {
                cache.put(request, responseClone);
              });
            }
            return response;
          })
          .catch(() => {
            // 如果請求失敗且是圖片，可以返回一個占位符
            if (request.destination === 'image') {
              return new Response('', { status: 404 });
            }
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
