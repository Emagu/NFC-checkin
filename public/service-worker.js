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
  event.respondWith(
    caches.match(event.request).then(res => res || fetch(event.request))
  );
});

self.addEventListener('push', event => {
  const data = event.data ? event.data.text() : 'Push message';
  event.waitUntil(
    self.registration.showNotification('NFC Checkin', { body: data })
  );
});
