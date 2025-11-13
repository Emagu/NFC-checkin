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

self.addEventListener('install', event => {
  console.log('SW installed');
  event.waitUntil(
    caches.open('v1').then(cache => cache.addAll([
      '/',
      '/index.html',
      '/src/main.js'
    ]))
  );
});

self.addEventListener('fetch', event => {
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('/index.html'))
    );
  } else {
    event.respondWith(
      caches.match(event.request).then((resp) => resp || fetch(event.request))
    );
  }
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
