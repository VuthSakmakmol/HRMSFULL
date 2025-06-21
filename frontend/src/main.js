// Plugins
import { registerPlugins } from '@/plugins'

// Components
import App from './App.vue'

// Composables
import { createApp } from 'vue'

// Font Awesome
import { library } from '@fortawesome/fontawesome-svg-core'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { fas } from '@fortawesome/free-solid-svg-icons'

// Charts
import VueApexCharts from 'vue3-apexcharts'

// I18n
import { createI18n } from 'vue-i18n'
import en from '@/locales/en'
import kh from '@/locales/kh'
import th from '@/locales/th'

// Styles
import 'unfonts.css'

// Register Font Awesome icons
library.add(fas)

// 🏁 Create app instance
const app = createApp(App)

// ✅ Register charts
app.component('apexchart', VueApexCharts)

// ✅ Register font awesome
app.component('font-awesome-icon', FontAwesomeIcon)

// ✅ Register Vuetify and other plugins
registerPlugins(app)

// ✅ Socket.IO globally
import socket from '@/socket'
app.config.globalProperties.$socket = socket
app.provide('$socket', socket)

// ✅ I18n setup
const i18n = createI18n({
  legacy: false,
  locale: localStorage.getItem('lang') || 'en', // Default or saved
  fallbackLocale: 'en',
  messages: {
    en,
    kh,
    th
  }
})
app.use(i18n)

// ✅ Mount app
app.mount('#app')
