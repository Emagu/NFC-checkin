import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '@/views/HomeView.vue'
import AboutView from '@/views/AboutView.vue'
import LoginView from '@/views/LoginView.vue'
import CheckinView from '@/views/CheckinView.vue'
import RecordsView from '@/views/RecordsView.vue'
import { useAuthStore } from '@/store/auth'

const routes = [
  { path: '/', component: HomeView, meta: { auth: true } },
  { path: '/about', component: AboutView},
  { path: '/login', component: LoginView },
  { path: '/checkin', component: CheckinView, meta: { auth: true }  },
  { path: '/records', component: RecordsView, meta: { auth: true }  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach(async (to, from, next) => {
  const auth = useAuthStore()
  if (to.meta.auth) {
    const ok = await auth.refreshTokenIfNeeded()
    if (!ok) {
      // 如果裝置未連線，允許繼續訪問（離線模式）
      if (!navigator.onLine) {
        return next()
      }
      // 裝置已連線但 token 刷新失敗，跳轉到登入頁
      return next('/login')
    }
  }
  next()
})

export default router
