<template>
  <div class="min-h-screen bg-gray-50 text-gray-800 p-6">
    <nav class="flex items-center justify-between mb-6">
      <div class="text-xl font-bold">NFC Checkin</div>
      <div class="space-x-3">
        <router-link to="/" class="hover:underline">Home</router-link>
        <router-link to="/records" class="hover:underline">Records</router-link>
        <router-link to="/about" class="hover:underline">About</router-link>
        <router-link to="/login" class="hover:underline">Login</router-link>
      </div>
    </nav>
    <slot />
    <router-view />
  </div>
</template>

<script>
export default {}
</script>
