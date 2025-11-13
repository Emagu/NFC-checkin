if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js', { scope: '/' })
      .then(registration => {
        console.log('SW registered successfully', registration.scope)
        
        // 檢查是否有更新
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // 有新版本可用
              console.log('New service worker available')
              // 可以提示用戶刷新頁面
              if (confirm('有新版本可用，是否重新載入頁面？')) {
                window.location.reload()
              }
            }
          })
        })
      })
      .catch(err => console.error('SW register failed', err))
    
    // 監聽 service worker 更新
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('Service worker controller changed')
    })
  })
}
