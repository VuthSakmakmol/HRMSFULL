// src/utils/axios.js
import axios from 'axios';

const instance = axios.create({
  baseURL: import.meta.env?.VITE_API_URL || process.env.VITE_API_URL || 'http://localhost:4700/api',
  // Prevent client-side truncation for large imports (Node-only, harmless in browser)
  maxBodyLength: Infinity,
  maxContentLength: Infinity,
  timeout: 0, // no timeout for big uploads
  withCredentials: false,
});

// Attach auth + GM company override
instance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;

      try {
        const payload = JSON.parse(atob(token.split('.')[1] || ''));
        const selectedCompany = localStorage.getItem('company');
        if (payload?.role === 'GeneralManager' && selectedCompany) {
          config.headers['x-company-override'] = selectedCompany;
        }
      } catch (e) {
        console.warn('⚠️ Invalid token payload', e);
      }
    }

    // Ensure multipart requests don’t get blocked by default headers
    if (config.data instanceof FormData) {
      // Let the browser set proper Content-Type with boundary
      delete config.headers['Content-Type'];
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Optional: simple 401 handler (keeps your current behavior otherwise)
instance.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err?.response?.status === 401) {
      // e.g. localStorage.removeItem('token'); location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default instance;
