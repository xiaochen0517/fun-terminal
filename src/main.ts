import '@/terminal/theme.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { siteConfig } from '@/config/site'

document.title = siteConfig.title

const app = createApp(App)

app.use(createPinia())

app.mount('#app')
