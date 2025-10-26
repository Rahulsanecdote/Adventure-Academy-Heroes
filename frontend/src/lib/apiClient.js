import axios from 'axios';

const normalizeUrl = (url) => {
  if (!url) return url;
  return url.replace(/\/$/, '');
};

const inferBackendUrl = () => {
  const envUrl = normalizeUrl(process.env.REACT_APP_BACKEND_URL);
  if (envUrl) {
    return envUrl;
  }

  if (typeof window !== 'undefined') {
    const { protocol, hostname } = window.location;
    const defaultPort = process.env.REACT_APP_BACKEND_PORT || '8000';

    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return `${protocol}//${hostname}:${defaultPort}`;
    }

    return `${protocol}//${hostname}`;
  }

  return 'http://localhost:8000';
};

export const BACKEND_URL = inferBackendUrl();
export const API_BASE_URL = `${BACKEND_URL}/api`;

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

apiClient.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default apiClient;
