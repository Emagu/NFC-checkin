<template>
  <div class="space-y-4">
    <h1 class="text-2xl font-semibold">打卡紀錄</h1>
    <div class="space-x-3">
      <button
        class="px-4 py-2 rounded bg-blue-600 text-white disabled:bg-gray-400"
        :disabled="downloading"
        @click="downloadPoints"
      >
        下載打卡點資訊
      </button>
      <button
        class="px-4 py-2 rounded bg-indigo-600 text-white disabled:bg-gray-400"
        :disabled="syncing"
        @click="manualSync"
      >
        手動上傳未同步打卡紀錄
      </button>
    </div>
    <p v-if="downloadMessage" class="text-sm text-gray-600">{{ downloadMessage }}</p>
    <p v-if="syncStatus" class="text-sm text-gray-600">{{ syncStatus }}</p>
    <ul v-if="records.length" class="list-disc pl-5 space-y-1">
      <li v-for="record in records" :key="record.id ?? record.time">
        {{ formatTime(record.time) }} - {{ record.location }} {{ record.synced ? '✅' : '❌(待同步)' }}
      </li>
    </ul>
    <p v-else>目前沒有打卡紀錄</p>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import {
  getAllCheckins,
  getUnsyncedCheckins,
  replaceLocations,
  saveCheckinRecord,
  registerBackgroundSync,
  uploadCheckinRecord
} from '@/utils/checkinDb'
import { useAuthStore } from '@/store/auth'

const records = ref([])
const syncStatus = ref('')
const downloadMessage = ref('')
const syncing = ref(false)
const downloading = ref(false)
const auth = useAuthStore()

function formatTime(value) {
  return new Date(value).toLocaleString()
}

async function loadRecords() {
  const list = await getAllCheckins()
  list.sort((a, b) => new Date(b.time) - new Date(a.time))
  records.value = list
}

async function downloadPoints() {
  if (downloading.value) return
  downloading.value = true
  downloadMessage.value = '下載中...'
  try {
    const res = await fetch('/api/auth/locations', {
      credentials: 'include'
    })
    if (!res.ok) throw new Error(res.statusText || '下載失敗')
    const list = await res.json()
    if (!Array.isArray(list)) throw new Error('資料格式錯誤')
    const normalized = list.map(item => ({
      id: Number(item.id),
      name: item.name ?? '',
      lat: item.lat != null ? Number(item.lat) : null,
      lng: item.lng != null ? Number(item.lng) : null,
      radius: item.radius ?? null
    }))
    const count = await replaceLocations(normalized)
    downloadMessage.value = `✅ 打卡點資訊已更新（${count} 筆）`
  } catch (err) {
    downloadMessage.value = `❌ 無法下載打卡點資訊：${err.message}`
  } finally {
    downloading.value = false
  }
}

async function manualSync() {
  if (syncing.value) return
  syncing.value = true
  syncStatus.value = '同步中...'
  try {
    const unsynced = await getUnsyncedCheckins()
    if (!unsynced.length) {
      syncStatus.value = '目前沒有待同步的紀錄'
      return
    }
    let successCount = 0
    let failureCount = 0
    for (const item of unsynced) {
      try {
        await uploadCheckinRecord(item, { requireAuth: true, throwOnError: true })
        item.synced = true
        await saveCheckinRecord(item)
        successCount += 1
      } catch (err) {
        console.warn('manualSync upload failed', err)
        if (err.status === 401 || err.message.includes('請重新登入')) {
          throw err
        }
        failureCount += 1
      }
    }
    if (failureCount === 0) {
      syncStatus.value = `同步完成（成功 ${successCount} 筆）`
    } else if (successCount === 0) {
      syncStatus.value = '同步失敗，請稍後再試'
    } else {
      syncStatus.value = `同步完成：成功 ${successCount} 筆，失敗 ${failureCount} 筆`
    }
  } catch (err) {
    syncStatus.value = `同步失敗：${err.message}`
  } finally {
    syncing.value = false
    await loadRecords()
  }
}

async function handleOnline() {
  const registered = await registerBackgroundSync()
  if (!registered) {
    await manualSync()
  }
}

onMounted(() => {
  loadRecords()
  window.addEventListener('online', handleOnline)
})

onUnmounted(() => {
  window.removeEventListener('online', handleOnline)
})
</script>


