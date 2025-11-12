import axios from 'axios'
import { useAuthStore } from '@/store/auth'

const api = axios.create({
  baseURL: '/api',
  withCredentials: true // include cookies for refresh
})

api.interceptors.request.use(config => {
  const auth = useAuthStore()
  if (auth.accessToken) {
    config.headers.Authorization = `Bearer ${auth.accessToken}`
  }
  return config
})

api.interceptors.response.use(r => r, async err => {
  const original = err.config
  if (err.response?.status === 401 && !original._retry) {
    original._retry = true
    const auth = useAuthStore()
    const ok = await auth.refreshTokenIfNeeded()
    if (ok) {
      original.headers.Authorization = `Bearer ${auth.accessToken}`
      return api(original)
    } else {
      auth.logout()
    }
  }
  return Promise.reject(err)
})

export default api
