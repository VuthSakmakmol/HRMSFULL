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
import VueApexCharts from 'vue3-apexcharts'

// Styles
import 'unfonts.css'

// Register Font Awesome icons
library.add(fas)

const app = createApp(App)

// ✅ ApexCharts
app.component('apexchart', VueApexCharts)

// ✅ Font Awesome
app.component('font-awesome-icon', FontAwesomeIcon)

// ✅ Plugins like Vuetify
registerPlugins(app)

// ✅ Register Socket.IO globally
import socket from '@/socket'
app.config.globalProperties.$socket = socket
app.provide('$socket', socket)

// ✅ Mount App
app.mount('#app')
