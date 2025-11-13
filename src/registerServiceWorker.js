if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js', { scope: '/' })
      .then(registration => {
        console.log('[SW] Registered successfully:', registration.scope)
        
        // 檢查是否有更新
        registration.addEventListener('updatefound', () => {
          console.log('[SW] Update found')
          const newWorker = registration.installing
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              console.log('[SW] New worker state:', newWorker.state)
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // 有新版本可用
                console.log('[SW] New service worker available')
                // 可以提示用戶刷新頁面
                if (confirm('有新版本可用，是否重新載入頁面？')) {
                  window.location.reload()
                }
              }
            })
          }
        })
        
        // 定期檢查更新
        setInterval(() => {
          registration.update()
        }, 60000) // 每分鐘檢查一次
      })
      .catch(err => {
        console.error('[SW] Registration failed:', err)
      })
    
    // 監聽 service worker 更新
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('[SW] Controller changed')
    })
    
    // 監聽 service worker 消息
    navigator.serviceWorker.addEventListener('message', event => {
      console.log('[SW] Message received:', event.data)
    })
  })
}
