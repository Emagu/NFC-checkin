<template>
  <div class="space-y-4">
    <h1 class="text-2xl font-semibold">打卡頁面</h1>
    <div>
      <p>地點：<span>{{ locationDisplay }}</span></p>
      <p>時間：<span>{{ timeDisplay }}</span></p>
    </div>
    <p v-if="statusMessage" class="text-sm text-gray-600">{{ statusMessage }}</p>
    <button
      class="px-4 py-2 rounded bg-green-600 text-white disabled:bg-gray-400"
      :disabled="!point || submitting"
      @click="handleCheckin"
    >
      確認打卡
    </button>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import {
  calcDistance,
  getLocationById,
  saveCheckinRecord,
  registerBackgroundSync
} from '@/utils/checkinDb'

const route = useRoute()
const point = ref(null)
const timeDisplay = ref('')
const statusMessage = ref('')
const submitting = ref(false)
let timer = null

const locationDisplay = computed(() => {
  if (!point.value) return '❌ 無法找到打卡點'
  return `${point.value.name}（ID:${point.value.id}）`
})

function updateTime() {
  timeDisplay.value = new Date().toLocaleString()
}

async function loadPoint() {
  const id = route.query.id
  if (!id) {
    point.value = null
    statusMessage.value = '請透過有效的打卡連結進入此頁面'
    return
  }
  point.value = await getLocationById(id)
  if (!point.value) {
    statusMessage.value = '❌ 沒有對應的打卡點資料，請先於打卡紀錄頁下載'
  } else {
    statusMessage.value = ''
  }
}

function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('裝置不支援定位功能'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      resolve,
      reject,
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
    )
  })
}

async function tryUpload(record) {
  try {
    const res = await fetch('/api/checkin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record)
    })
    return res.ok
  } catch {
    return false
  }
}

async function handleCheckin() {
  if (!point.value || submitting.value) return
  submitting.value = true
  statusMessage.value = '定位中...'
  try {
    const pos = await getCurrentPosition()
    const { latitude, longitude } = pos.coords
    const targetLat = Number(point.value.lat)
    const targetLng = Number(point.value.lng)
    const dist = calcDistance(latitude, longitude, targetLat, targetLng)
    if (Number.isNaN(dist)) {
      statusMessage.value = '❌ 打卡點座標資料異常'
      submitting.value = false
      return
    }
    if (dist > 100) {
      alert(`❌ 您離打卡點超過 100 公尺（實際距離 ${Math.round(dist)} 公尺）`)
      statusMessage.value = '請靠近打卡點後再試一次'
      submitting.value = false
      return
    }
    const record = {
      user: localStorage.getItem('username') || 'anonymous',
      location: point.value.name,
      pointId: point.value.id,
      gps: { lat: latitude, lng: longitude },
      time: new Date().toISOString(),
      synced: false
    }
    const uploaded = await tryUpload(record)
    if (uploaded) {
      record.synced = true
      statusMessage.value = '✅ 打卡成功並同步雲端'
    } else {
      statusMessage.value = '📴 打卡已離線儲存，稍後會嘗試同步'
    }
    await saveCheckinRecord(record)
    if (!uploaded) {
      await registerBackgroundSync()
    }
  } catch (err) {
    alert('❌ 無法取得GPS位置：' + err.message)
    statusMessage.value = '定位失敗，請重試'
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  updateTime()
  timer = setInterval(updateTime, 1000)
  loadPoint()
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})

watch(
  () => route.query.id,
  () => {
    loadPoint()
  }
)
</script>

