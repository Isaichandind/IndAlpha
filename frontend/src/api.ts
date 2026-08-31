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

// Offline Mode Fallback Interceptor
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Check if it's a network error (backend unreachable/CORS blocked/down)
    if (!error.response || error.code === 'ERR_NETWORK') {
      console.warn("Backend unreachable. Falling back to offline mock data.");
      const url = error.config.url;
      const method = error.config.method?.toLowerCase();
      
      try {
        const getMockUrl = () => {
          if (url.includes('/screener/filter') || url.includes('/screener/query')) return '/mock_data/stocks.json';
          if (url.includes('/market/indices')) return '/mock_data/indices.json';
          if (url.includes('/market/movers')) return '/mock_data/movers.json';
          return null;
        };

        const mockUrl = getMockUrl();
        if (mockUrl) {
          // Adjust base URL path for GitHub Pages relative hosting if needed
          const basePath = import.meta.env.BASE_URL || '/';
          const cleanMockUrl = (basePath + mockUrl).replace(/\/\//g, '/');
          
          const res = await fetch(cleanMockUrl);
          const data = await res.json();
          // Simulate a successful Axios response
          return { data, status: 200, statusText: 'OK', headers: {}, config: error.config };
        }
        
        // Return empty array for watchlists/custom endpoints in offline mode
        if (url.includes('/watchlists') && method === 'get') {
          return { data: [], status: 200, statusText: 'OK', headers: {}, config: error.config };
        }
      } catch (mockErr) {
        console.error("Failed to load offline mock data", mockErr);
      }
    }
    return Promise.reject(error);
  }
);

export default api;
