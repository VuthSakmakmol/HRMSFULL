import axios from 'axios';

const instance = axios.create({
  // baseURL: 'http://localhost:4700/api'
  baseURL: 'http://157.245.59.122:4700/api'
});

instance.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default instance;
