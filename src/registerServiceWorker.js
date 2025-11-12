if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js', { scope: '/' })
      .then(() => console.log('SW registered'))
      .catch(err => console.error('SW register failed', err))
  })
}
