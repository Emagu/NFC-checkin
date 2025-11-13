import { useAuthStore } from '@/store/auth'

export function calcDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = deg => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function openCheckinDB() {
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

export async function getLocationById(id) {
  const db = await openCheckinDB();
  const tx = db.transaction('locations', 'readonly');
  const store = tx.objectStore('locations');
  return new Promise(resolve => {
    const req = store.get(Number(id));
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => resolve(null);
  });
}

export async function saveCheckinRecord(record) {
  const db = await openCheckinDB();
  const tx = db.transaction('checkins', 'readwrite');
  tx.objectStore('checkins').put(record);
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getAllCheckins() {
  const db = await openCheckinDB();
  const tx = db.transaction('checkins', 'readonly');
  const store = tx.objectStore('checkins');
  return new Promise((resolve, reject) => {
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export async function getUnsyncedCheckins() {
  const all = await getAllCheckins();
  return all.filter(item => !item.synced);
}

export async function uploadCheckinRecord(record, options = {}) {
  const { requireAuth = false, throwOnError = false } = options;
  const auth = useAuthStore();
  const tokenReady = await auth.refreshTokenIfNeeded();
  const hasToken = Boolean(auth.accessToken);

  if (!tokenReady || !hasToken) {
    const authError = new Error('尚未登入或登入已過期，請重新登入後再試');
    authError.status = 401;
    if (requireAuth || throwOnError) {
      if (throwOnError) {
        throw authError;
      }
      return { ok: false, status: 401, error: authError };
    }
    return { ok: false, status: 401, error: authError };
  }

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${auth.accessToken}`
  };

  try {
    const res = await fetch('/api/auth/checkin', {
      method: 'POST',
      headers,
      body: JSON.stringify(record)
    });

    if (res.status === 401) {
      auth.logout();
      const err = new Error('登入已過期，請重新登入');
      err.status = 401;
      if (throwOnError) {
        throw err;
      }
      return { ok: false, status: 401, error: err };
    }

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      const message = data?.message || `上傳失敗（HTTP ${res.status}）`;
      const err = new Error(message);
      err.status = res.status;
      err.response = data;
      if (throwOnError) {
        throw err;
      }
      return { ok: false, status: res.status, error: err };
    }

    return { ok: true, status: res.status };
  } catch (err) {
    if (throwOnError) {
      throw err;
    }
    return { ok: false, status: err.status ?? 0, error: err };
  }
}

export async function replaceLocations(list) {
  const db = await openCheckinDB();
  const tx = db.transaction('locations', 'readwrite');
  const store = tx.objectStore('locations');
  store.clear();
  for (const item of list) {
    store.put(item);
  }
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve(list.length);
    tx.onerror = () => reject(tx.error);
  });
}

export async function registerBackgroundSync(tag = 'sync-checkins') {
  if ('serviceWorker' in navigator && 'SyncManager' in window) {
    try {
      const reg = await navigator.serviceWorker.ready;
      await reg.sync.register(tag);
      return true;
    } catch (err) {
      console.warn('Sync registration failed', err);
      return false;
    }
  }
  return false;
}

