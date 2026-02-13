import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import { registerSW } from 'virtual:pwa-register'

const updateSW = registerSW({
  onNeedRefresh() {
    if (confirm('Yeni içerik mevcut. Yenilemek ister misiniz?')) {
      updateSW(true)
    }
  }
})

createApp(App).mount('#app')
