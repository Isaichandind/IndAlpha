import axios from 'axios';
import { auth } from './firebase';

export const api = axios.create();

api.interceptors.request.use(async (config) => {
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

  // Inject Firebase Auth Token
  try {
    const user = auth.currentUser;
    if (user) {
      const token = await user.getIdToken();
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (e) {
    // silently fail if not authenticated
  }

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
          let data = await res.json();
          
          // Apply client-side filtering for offline mode mock data
          if (url.includes('/screener/filter') && error.config.data) {
            try {
              const filters = JSON.parse(error.config.data);
              if (filters.sector) {
                data = data.filter((s: any) => s.sector && s.sector.toLowerCase().includes(filters.sector.toLowerCase()));
              }
              if (filters.market_cap_category) {
                data = data.filter((s: any) => {
                  if (filters.market_cap_category === 'Large Cap') return s.market_cap >= 20000;
                  if (filters.market_cap_category === 'Mid Cap') return s.market_cap >= 5000 && s.market_cap < 20000;
                  if (filters.market_cap_category === 'Small Cap') return s.market_cap < 5000;
                  return true;
                });
              }
              if (filters.min_roce !== undefined) data = data.filter((s: any) => s.roce >= filters.min_roce);
              if (filters.max_pe !== undefined) data = data.filter((s: any) => s.pe_ratio <= filters.max_pe);
              if (filters.max_debt_to_equity !== undefined) data = data.filter((s: any) => s.debt_to_equity <= filters.max_debt_to_equity);
              if (filters.min_promoter_holding !== undefined) data = data.filter((s: any) => s.promoter_holding >= filters.min_promoter_holding);
              if (filters.max_pledged_promoter !== undefined) data = data.filter((s: any) => s.pledged_promoter <= filters.max_pledged_promoter);
              if (filters.min_delivery_volume !== undefined) data = data.filter((s: any) => s.delivery_volume >= filters.min_delivery_volume);
            } catch (e) {
              console.error("Error parsing filters for mock data", e);
            }
          }

          // Simulate a successful Axios response
          return { data, status: 200, statusText: 'OK', headers: {}, config: error.config };
        }
        
        // Offline fallback for charts is removed to prevent displaying random fake data.
        if (url.includes('/chart')) {
          console.warn("Chart data fetch failed. Cannot provide mock chart data.");
          return Promise.reject(error);
        }

        // Mock trading dates for historical movers support
        if (url.includes('/market/trading-dates')) {
           const dates = [];
           const d = new Date();
           for(let i=1; i<=5; i++) {
               d.setDate(d.getDate() - 1);
               if(d.getDay() !== 0 && d.getDay() !== 6) {
                   dates.push(d.toISOString().split('T')[0]);
               }
           }
           return { data: dates, status: 200, statusText: 'OK', headers: {}, config: error.config };
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
