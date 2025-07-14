
import axios from 'axios';

const instance = axios.create({
  // baseURL: 'http://localhost:4700/api',
  baseURL: 'http://157.245.59.122:4700/api'
});

instance.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;

    try {
      const decoded = JSON.parse(atob(token.split('.')[1]));
      const selectedCompany = localStorage.getItem('company');

      // Only allow GM to override company
      if (decoded.role === 'GeneralManager' && selectedCompany) {
        config.headers['x-company-override'] = selectedCompany;
      }
    } catch (e) {
      console.warn('⚠️ Invalid token during request preparation', e);
    }
  }
  return config;
}, error => Promise.reject(error));

export default instance;
