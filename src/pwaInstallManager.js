let deferredPrompt = null
let listeners = []

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault()
  deferredPrompt = e
  listeners.forEach(fn => fn(true))
})

export default {
  onAvailable(cb){
    listeners.push(cb)
    if (deferredPrompt) cb(true)
  },
  async install(){
    if (!deferredPrompt) return false
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    deferredPrompt = null
    listeners.forEach(fn => fn(false))
    return outcome === 'accepted'
  },
  isAvailable(){ return !!deferredPrompt }
}
