import axios from 'axios';

export const api = axios.create();

api.interceptors.request.use((config) => {
  const customUrl = localStorage.getItem('backend_url');
  const envUrl = import.meta.env.VITE_API_URL;
  const isProd = import.meta.env.PROD;
  
  // Priority: 1. Custom Settings URL -> 2. Env Var -> 3. Auto-Render URL -> 4. Localhost
  let baseUrl = customUrl || envUrl;
  if (!baseUrl) {
    baseUrl = isProd ? 'https://indalpha-backend.onrender.com/api' : 'http://localhost:8000/api';
  }
  
  // Ensure no trailing slash
  config.baseURL = baseUrl.replace(/\/$/, '');
  return config;
});

export default api;
