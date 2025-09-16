// Plugins
import { registerPlugins } from '@/plugins'
import '@/styles/main.css'

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

// 🕒 Day.js (Phnom Penh timezone)
import dayjs from '@/plugins/dayjs' // sets Asia/Phnom_Penh as default TZ

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
import socket, { joinSocketRoom } from '@/utils/socket'
app.config.globalProperties.$socket = socket
app.provide('$socket', socket)

// ✅ Provide Day.js globally (use inside components as this.$dayjs or inject('dayjs'))
app.config.globalProperties.$dayjs = dayjs
app.provide('dayjs', dayjs)

// ✅ I18n setup
const i18n = createI18n({
  legacy: false,
  locale: localStorage.getItem('lang') || 'en',
  fallbackLocale: 'en',
  messages: { en, kh, th }
})
app.use(i18n)

// ✅ Mount app
app.mount('#app')

// ✅ Optional: Join socket room immediately if user is logged in
joinSocketRoom()
