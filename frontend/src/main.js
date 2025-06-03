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

// ✅ Register apexchart ONCE
app.component('apexchart', VueApexCharts)

// ✅ Register font-awesome globally
app.component('font-awesome-icon', FontAwesomeIcon)

// ✅ Register Vuetify and other plugins
registerPlugins(app)

// ✅ Mount app
app.mount('#app')
