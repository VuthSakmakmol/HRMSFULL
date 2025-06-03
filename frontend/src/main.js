/**
 * main.js
 *
 * Bootstraps Vuetify and other plugins then mounts the App
 */

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

// Styles
import 'unfonts.css'

// Register Font Awesome icons
library.add(fas)

const app = createApp(App)

// Register global font-awesome-icon component
app.component('font-awesome-icon', FontAwesomeIcon)

registerPlugins(app)

app.mount('#app')
