import { defineStore } from 'pinia'
import { loginApi, refreshApi } from '@/api/auth'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    accessToken: localStorage.getItem('accessToken') || '',
    expireAt: parseInt(localStorage.getItem('expireAt') || '0')
  }),
  actions: {
    saveTokens({ accessToken, expiresIn, UserSN }){
      const now = Date.now()
      this.accessToken = accessToken
      this.expireAt = now + expiresIn * 1000
      localStorage.setItem('accessToken', accessToken)
      localStorage.setItem('expireAt', this.expireAt.toString())
      if(UserSN != null)
      {
        localStorage.setItem('UserSN', UserSN);
      }
    },
    async login(username, password){
      const data = await loginApi(username, password)
      // server sets refresh token cookie (HttpOnly); we save access token
      this.saveTokens(data)
    },
    async refreshTokenIfNeeded(){
      const now = Date.now()
      if (!this.accessToken || this.expireAt === 0) {
        return false
      }
      if (now < this.expireAt - 30000) return true
      try {
        const data = await refreshApi() // cookie auto-sent
        this.saveTokens(data)
        return true
      } catch (e) {
        console.warn('refresh failed', e)
        return false
      }
    },
    logout(){
      this.accessToken = ''
      this.expireAt = 0
      localStorage.removeItem('accessToken')
      localStorage.removeItem('expireAt')
    }
  }
})
