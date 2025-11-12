import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './assets/tailwind.css'
import './registerServiceWorker'
import pwaInstallManager from './pwaInstallManager'

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.provide('pwaInstallManager', pwaInstallManager)
app.mount('#app')

console.log('App started')
