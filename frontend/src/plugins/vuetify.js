// plugins/vuetify.js
import '@mdi/font/css/materialdesignicons.css'
import 'vuetify/styles'

import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { VTimePicker } from 'vuetify/labs/VTimePicker' // ✅ labs component

export default createVuetify({
  components: {
    ...components,
    VTimePicker, // ✅ register it
  },
  directives,
  theme: {
    defaultTheme: 'light',
    themes: {
      light: {
        colors: {
          primary: '#1976D2',
          secondary: '#424242',
          accent: '#82B1FF',
          error: '#FF5252',
          info: '#2196F3',
          success: '#4CAF50',
          warning: '#FFC107',
        },
        variables: {
          'font-family': 'Kantumruy Pro, sans-serif',
        },
      },
    },
  },
})
