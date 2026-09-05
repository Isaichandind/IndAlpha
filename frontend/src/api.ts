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

// --- Offline Stock Data Cache ---
// When screener loads mock stocks.json, cache it so stock detail endpoints can use it
let _offlineStocksCache: any[] | null = null;

function getOfflineStockBySymbol(symbol: string): any | null {
  if (!_offlineStocksCache) return null;
  return _offlineStocksCache.find((s: any) => s.ticker === symbol) || null;
}

/**
 * Build a synthetic stock profile from screener mock data.
 * This provides fundamentals/technicals tabs on GitHub Pages offline mode.
 */
function buildOfflineProfile(stock: any) {
  return {
    ticker: stock.ticker,
    company_name: stock.company_name,
    sector: stock.sector || 'Unknown',
    ltp: stock.ltp || 0,
    market_cap: stock.market_cap || 0,
    last_updated_date: stock.last_updated_date || null,
    fundamentals: {
      roce: stock.roce || 0,
      roe: stock.roe || 0,
      pe_ratio: stock.pe_ratio || 0,
      debt_to_equity: stock.debt_to_equity || 0,
      promoter_holding: stock.promoter_holding || 0,
      pledged_promoter: stock.pledged_promoter || 0,
      eps: stock.eps || 0,
      dividend_yield: stock.dividend_yield || 0,
      pb_ratio: stock.pb_ratio || 0,
      book_value: stock.book_value || 0,
    },
    technicals: {
      rsi_14: 50,
      ema_50: stock.ltp ? stock.ltp * 0.97 : 0,
      ema_200: stock.ltp ? stock.ltp * 0.92 : 0,
      delivery_volume: stock.delivery_volume || 0,
      supertrend_bullish: (stock.change_pct || 0) >= 0,
    },
    institutional: {
      q1_fii: 0, q2_fii: 0, q3_fii: 0, q4_fii: 0, q3_dii: 0, q3_mf: 0,
    },
  };
}

function buildOfflineQuote(stock: any) {
  const ltp = stock.ltp || 0;
  const changePct = stock.change_pct || 0;
  const prevClose = changePct !== 0 ? ltp / (1 + changePct / 100) : ltp;
  const change = ltp - prevClose;
  return {
    symbol: stock.ticker,
    ltp: Math.round(ltp * 100) / 100,
    change: Math.round(change * 100) / 100,
    change_pct: Math.round(changePct * 100) / 100,
    prev_close: Math.round(prevClose * 100) / 100,
    day_high: Math.round(ltp * 1.02 * 100) / 100,
    day_low: Math.round(ltp * 0.98 * 100) / 100,
    year_high: Math.round(ltp * 1.25 * 100) / 100,
    year_low: Math.round(ltp * 0.65 * 100) / 100,
    market_cap: stock.market_cap || 0,
  };
}

/**
 * Generate synthetic OHLCV candle data for offline chart display.
 * Uses deterministic pseudo-random walk seeded from the symbol to ensure consistency.
 */
function generateOfflineCandles(symbol: string, period: string): any[] {
  // Seed a simple hash from the symbol for deterministic data
  let hash = 0;
  for (let i = 0; i < symbol.length; i++) {
    hash = ((hash << 5) - hash) + symbol.charCodeAt(i);
    hash |= 0;
  }
  const seed = Math.abs(hash);
  
  // Determine number of candles based on period
  const periodMap: Record<string, number> = {
    '1d': 78, '5d': 40, '1mo': 22, '3mo': 66, '6mo': 130,
    '1y': 52, '2y': 104, '5y': 260, 'max': 500,
  };
  const count = periodMap[period] || 130;
  
  // Try to get a base price from the offline cache
  const stock = getOfflineStockBySymbol(symbol);
  let basePrice = stock?.ltp || 100 + (seed % 5000);
  
  const candles: any[] = [];
  const now = new Date();
  let price = basePrice * 0.85; // Start lower so chart trends upward
  
  // Use daily dates for most periods
  const useDaily = !['1d', '5d'].includes(period);
  
  for (let i = count; i >= 0; i--) {
    const date = new Date(now);
    
    if (useDaily) {
      date.setDate(date.getDate() - i);
      // Skip weekends
      if (date.getDay() === 0 || date.getDay() === 6) continue;
    } else {
      // Intraday: go back in minutes
      date.setMinutes(date.getMinutes() - i * 5);
    }
    
    // Deterministic price movement based on index + seed
    const rng = Math.sin(seed * 9301 + i * 49297) * 0.5 + 0.5;
    const volatility = basePrice * 0.015;
    const drift = (basePrice - price) * 0.003; // Mean-revert toward base
    const change = (rng - 0.48) * volatility + drift;
    
    price = Math.max(price + change, basePrice * 0.3);
    
    const open = price;
    const close = price + (rng - 0.5) * volatility * 0.5;
    const high = Math.max(open, close) + rng * volatility * 0.3;
    const low = Math.min(open, close) - (1 - rng) * volatility * 0.3;
    const volume = Math.floor(100000 + rng * 2000000);
    
    const timeVal = useDaily
      ? date.toISOString().split('T')[0]
      : Math.floor(date.getTime() / 1000);
    
    candles.push({
      time: timeVal,
      open: Math.round(open * 100) / 100,
      high: Math.round(high * 100) / 100,
      low: Math.round(low * 100) / 100,
      close: Math.round(close * 100) / 100,
      volume,
    });
  }
  
  return candles;
}

function buildOfflineHoldings(stock: any) {
  const promoterPct = stock?.promoter_holding || 0;
  const institutionsPct = Math.min(100 - promoterPct, 35);
  const publicPct = Math.max(0, 100 - promoterPct - institutionsPct);
  return {
    summary: {
      promoters_pct: promoterPct,
      institutions_pct: Math.round(institutionsPct * 100) / 100,
      public_pct: Math.round(publicPct * 100) / 100,
      shares_outstanding: 0,
      float_shares: 0,
    },
    roster: [],
  };
}

// Offline Mode Fallback Interceptor
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Check if it's a network error (CORS blocked/down) or backend is missing/sleeping (404/50x)
    const isOffline = !error.response || 
                      error.code === 'ERR_NETWORK' || 
                      error.response.status === 404 || 
                      error.response.status >= 500;

    if (isOffline) {
      console.warn("Backend unreachable. Falling back to offline mock data.");
      const url = error.config.url || '';
      const method = error.config.method?.toLowerCase();
      
      try {
        // --- Screener & Market Data (from static JSON files) ---
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
          
          // Cache stocks for use by stock detail offline fallbacks
          if (url.includes('/screener/filter') || url.includes('/screener/query')) {
            _offlineStocksCache = data;
          }
          
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
        
        // --- Stock Detail Endpoints (synthesized from cached screener data) ---
        
        // Extract symbol from URL pattern: /stock/{symbol}/...
        const stockMatch = url.match(/\/stock\/([^/]+)/);
        const symbol = stockMatch?.[1] || '';
        
        // Ensure we have cached stock data; if not, try to load it
        if (!_offlineStocksCache && symbol) {
          try {
            const basePath = import.meta.env.BASE_URL || '/';
            const stocksUrl = (basePath + '/mock_data/stocks.json').replace(/\/\//g, '/');
            const res = await fetch(stocksUrl);
            _offlineStocksCache = await res.json();
          } catch { /* ignore */ }
        }
        
        const cachedStock = symbol ? getOfflineStockBySymbol(symbol) : null;
        
        // /stock/{symbol}/chart — generate synthetic candles
        if (url.includes('/chart') && symbol) {
          const params = new URLSearchParams(error.config.params || {});
          const period = params.get('period') || '6mo';
          const candles = generateOfflineCandles(symbol, period);
          console.info(`[Offline] Generated ${candles.length} synthetic candles for ${symbol}`);
          return { data: candles, status: 200, statusText: 'OK', headers: {}, config: error.config };
        }
        
        // /stock/{symbol}/quote — build from cached data
        if (url.includes('/quote') && symbol) {
          const quoteData = cachedStock
            ? buildOfflineQuote(cachedStock)
            : { symbol, ltp: 0, change: 0, change_pct: 0, prev_close: 0, day_high: 0, day_low: 0, year_high: 0, year_low: 0, market_cap: 0 };
          return { data: quoteData, status: 200, statusText: 'OK', headers: {}, config: error.config };
        }
        
        // /stock/{symbol}/holdings — build from cached promoter data
        if (url.includes('/holdings') && symbol) {
          const holdingsData = buildOfflineHoldings(cachedStock);
          return { data: holdingsData, status: 200, statusText: 'OK', headers: {}, config: error.config };
        }
        
        // /stock/{symbol}/financials — return empty (no way to synthesize P&L)
        if (url.includes('/financials') && symbol) {
          return { data: { annual: [], quarterly: [] }, status: 200, statusText: 'OK', headers: {}, config: error.config };
        }
        
        // /stock/{symbol} (profile) — build from cached screener data
        if (stockMatch && !url.includes('/chart') && !url.includes('/quote') && !url.includes('/holdings') && !url.includes('/financials') && !url.includes('/analyze')) {
          if (cachedStock) {
            const profileData = buildOfflineProfile(cachedStock);
            return { data: profileData, status: 200, statusText: 'OK', headers: {}, config: error.config };
          }
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
        
        // Screener search — client-side search through cached data
        if (url.includes('/screener/search') && _offlineStocksCache) {
          const params = error.config.params || {};
          const q = (params.q || '').toLowerCase();
          if (q.length >= 2) {
            const results = _offlineStocksCache
              .filter((s: any) => 
                s.ticker.toLowerCase().includes(q) || 
                (s.company_name && s.company_name.toLowerCase().includes(q))
              )
              .slice(0, 10)
              .map((s: any) => ({
                symbol: s.ticker,
                name: s.company_name,
                exchange: s.ticker.endsWith('.NS') ? 'NSE' : 'BSE',
                type: 'EQUITY',
                score: 1000,
              }));
            return { data: results, status: 200, statusText: 'OK', headers: {}, config: error.config };
          }
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
