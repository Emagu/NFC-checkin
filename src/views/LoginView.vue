<template>
  <div class="max-w-md bg-white p-6 rounded shadow">
    <h2 class="text-xl font-semibold mb-4">Login</h2>
    <form @submit.prevent="doLogin" class="space-y-3">
      <input v-model="username" placeholder="username" class="w-full border px-3 py-2 rounded"/>
      <input type="password" v-model="password" placeholder="password" class="w-full border px-3 py-2 rounded"/>
      <div class="flex items-center justify-between">
        <button class="px-4 py-2 bg-blue-600 text-white rounded">Login</button>
        <div v-if="loading">loading...</div>
      </div>
    </form>
    <p v-if="error" class="text-red-500 mt-2">{{ error }}</p>
  </div>
</template>

<script>
import { useAuthStore } from '@/store/auth'
export default {
  data(){ return { username: 'user', password: 'pass', error:'', loading:false } },
  methods:{
    async doLogin(){
      this.loading = true
      this.error = ''
      try{
        await useAuthStore().login(this.username, this.password)
        this.$router.push('/')
      }catch(e){
        this.error = 'Login failed'
      }finally{ this.loading = false }
    }
  }
}
</script>
