import axios from 'axios';

export const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: `${BASE_URL}/api`,
  withCredentials: true,
});

// Also attach bearer token as a fallback for environments where cookies
// are blocked (e.g. cross-site iframes during development).
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('cfm_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401 && !window.location.pathname.includes('/login')) {
      localStorage.removeItem('cfm_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
