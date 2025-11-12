<template>
  <div>
    <h1 class="text-2xl font-semibold mb-3">Home</h1>
    <p>Welcome — this route requires auth.</p>
    <button @click="logout" class="mt-4 px-3 py-2 bg-red-500 text-white rounded">Logout</button>
    <div class="mt-4">
      <button v-if="canInstall" @click="installApp" class="px-3 py-2 bg-blue-600 text-white rounded">📲 Install App</button>
    </div>
  </div>
</template>

<script>
import pwaInstallManager from '@/pwaInstallManager'
import { useAuthStore } from '@/store/auth'

export default {
  data(){ return { canInstall: false } },
  mounted(){
    pwaInstallManager.onAvailable(val => this.canInstall = val)
  },
  methods:{
    async installApp(){ await pwaInstallManager.install() },
    logout(){ useAuthStore().logout(); this.$router.push('/login') }
  }
}
</script>
