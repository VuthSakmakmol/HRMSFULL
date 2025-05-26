import axios from 'axios'

const instance = axios.create({
  baseURL: 'http://localhost:4700/api'  // ✅ matches backend
})

// Auto-attach token if exists
instance.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export default instance
