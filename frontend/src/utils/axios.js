import axios from 'axios';

/**
 * Resolve base URL:
 * - Prefer VITE_API_URL (e.g. http://157.245.59.122:4700/api)
 * - Fallback to server with /api
 * - Normalize duplicate slashes
 */
function resolveBaseURL() {
  const envUrl =
    (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) ||
    (typeof process !== 'undefined' && process.env && process.env.VITE_API_URL) ||
    // 'http://157.245.59.122:4700/api'; 
    'http://localhost:4700/api'; 
  // Fix common mistakes like missing colon before port or stray slashes
  // (We can’t fix a missing colon automatically, so ensure your env is correct.)
  return envUrl.replace(/([^:]\/)\/+/g, '$1'); // collapse // (except after http:)
}

const instance = axios.create({
  baseURL: resolveBaseURL(),        // e.g. http://157.245.59.122:4700/api
  maxBodyLength: Infinity,
  maxContentLength: Infinity,
  timeout: 0,                       // no timeout for big uploads
  withCredentials: false,
});

// ─────────────────────────────────────────────────────────────────────────────
// REQUEST INTERCEPTOR: attach token + GM company override + multipart handling
// ─────────────────────────────────────────────────────────────────────────────
instance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;

      try {
        const payload = JSON.parse(atob((token.split('.')[1] || '').replace(/-/g, '+').replace(/_/g, '/')));
        const selectedCompany = localStorage.getItem('company');
        if (payload?.role === 'GeneralManager' && selectedCompany) {
          config.headers['x-company-override'] = selectedCompany;
        }
      } catch (e) {
        console.warn('⚠️ Invalid token payload', e);
      }
    }

    // Let the browser set the multipart boundary automatically
    if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
      if (config.headers && config.headers['Content-Type']) {
        delete config.headers['Content-Type'];
      }
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// ─────────────────────────────────────────────────────────────────────────────
// RESPONSE INTERCEPTOR: basic 401 handling (optional)
// ─────────────────────────────────────────────────────────────────────────────
instance.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err?.response?.status === 401) {
      // e.g. localStorage.removeItem('token'); window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default instance;
