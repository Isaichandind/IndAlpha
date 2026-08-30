import { useState, useEffect } from 'react';
import axios from './api';
import { Save, Bell, RefreshCw, Settings } from 'lucide-react';
import { SettingsModal } from './components/SettingsModal';
import { ScreenerTable } from './components/ScreenerTable';
import { FilterSidebar } from './components/FilterSidebar';
import { GlobalSearch } from './components/GlobalSearch';
import type { SearchResult } from './components/GlobalSearch';
import { WatchlistSidebar } from './components/WatchlistSidebar';
import { StockDetailPanel } from './components/StockDetailPanel';
import { QueryBar } from './components/QueryBar';
import { MarketMovers } from './components/MarketMovers';
import type { StockData, IndexData, ScreenerFilters, Watchlist, SelectedStock, MarketMoversData } from './types';

function App() {
  const [stocks, setStocks] = useState<StockData[]>([]);
  const [indices, setIndices] = useState<IndexData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [filters, setFilters] = useState<ScreenerFilters>({});
  
  const [watchlists, setWatchlists] = useState<Watchlist[]>([]);
  const [activeWatchlistId, setActiveWatchlistId] = useState<number | null>(null);
  
  const [moversData, setMoversData] = useState<MarketMoversData | null>(null);
  const [moversLoading, setMoversLoading] = useState<boolean>(true);
  const [tradingDates, setTradingDates] = useState<string[]>([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  
  // Stock detail panel state
  const [selectedStock, setSelectedStock] = useState<SelectedStock | null>(null);

  const API_URL = '';

  useEffect(() => {
    fetchIndices();
    fetchWatchlists();
    fetchTradingDates();
    fetchMovers();

    const handleOpenSettings = () => setIsSettingsOpen(true);
    document.addEventListener('open-settings', handleOpenSettings);
    return () => document.removeEventListener('open-settings', handleOpenSettings);
  }, []);

  useEffect(() => {
    fetchStocks();
    fetchMovers();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  useEffect(() => {
    if (activeWatchlistId !== null) {
      fetchWatchlistLivePrices(activeWatchlistId);
      const interval = setInterval(() => fetchWatchlistLivePrices(activeWatchlistId), 15000);
      return () => clearInterval(interval);
    }
  }, [activeWatchlistId]);

  const fetchWatchlists = async () => {
    try {
      const res = await axios.get(`${API_URL}/watchlists`);
      setWatchlists(res.data);
      if (res.data.length > 0 && activeWatchlistId === null) {
        setActiveWatchlistId(res.data[0].id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchWatchlistLivePrices = async (id: number) => {
    try {
      const res = await axios.get(`${API_URL}/watchlists/${id}/live`);
      setWatchlists(prev => prev.map(w => {
        if (w.id === id) {
          return { ...w, items: res.data };
        }
        return w;
      }));
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateWatchlist = async (name: string) => {
    try {
      const res = await axios.post(`${API_URL}/watchlists`, { name });
      setWatchlists([...watchlists, res.data]);
      setActiveWatchlistId(res.data.id);
    } catch (err) {
      alert("Failed to create watchlist. Name might exist.");
    }
  };

  const handleDeleteWatchlist = async (id: number) => {
    try {
      await axios.delete(`${API_URL}/watchlists/${id}`);
      const updated = watchlists.filter(w => w.id !== id);
      setWatchlists(updated);
      if (updated.length > 0) {
        setActiveWatchlistId(updated[0].id);
      } else {
        setActiveWatchlistId(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddStock = async (stock: SearchResult) => {
    if (!activeWatchlistId) {
      alert("Please create or select a watchlist first");
      return;
    }
    try {
      await axios.post(`${API_URL}/watchlists/${activeWatchlistId}/items`, {
        symbol: stock.symbol,
        name: stock.name,
        exchange: stock.exchange
      });
      fetchWatchlistLivePrices(activeWatchlistId);
    } catch (err: any) {
      if (err.response?.status === 400) {
        alert("Stock is already in this watchlist");
      } else {
        console.error(err);
      }
    }
  };

  const handleRemoveStock = async (symbol: string) => {
    if (!activeWatchlistId) return;
    try {
      await axios.delete(`${API_URL}/watchlists/${activeWatchlistId}/items/${symbol}`);
      setWatchlists(prev => prev.map(w => {
        if (w.id === activeWatchlistId) {
          return { ...w, items: w.items.filter(i => i.symbol !== symbol) };
        }
        return w;
      }));
    } catch (err) {
      console.error(err);
    }
  };

  const fetchIndices = async () => {
    try {
      const res = await axios.get(`${API_URL}/market/indices`);
      setIndices(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchTradingDates = async () => {
    try {
      const res = await axios.get(`${API_URL}/market/trading-dates`);
      setTradingDates(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchMovers = async () => {
    setMoversLoading(true);
    try {
      const url = filters.performance_date 
        ? `${API_URL}/market/movers?date=${filters.performance_date}` 
        : `${API_URL}/market/movers`;
      const res = await axios.get(url);
      setMoversData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setMoversLoading(false);
    }
  };

  const fetchStocks = async () => {
    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/screener/filter`, filters);
      setStocks(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const syncMarketData = async () => {
    setSyncing(true);
    try {
      await axios.post(`${API_URL}/screener/sync`);
      await fetchIndices();
      await fetchStocks();
    } catch (err) {
      console.error(err);
    } finally {
      setSyncing(false);
    }
  };

  const handleViewChart = (stock: SelectedStock) => {
    setSelectedStock(stock);
  };

  const handleQueryResults = (results: StockData[]) => {
    setStocks(results);
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-indalpha-dark text-indalpha-text">
      {/* Top Navigation */}
      <header className="h-14 bg-indalpha-dark border-b border-gray-800 flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-6">
          <div className="font-bold text-lg flex items-center gap-2">
            <span className="text-indalpha-green text-2xl font-mono">α</span>
            <span className="text-white">IndAlpha</span>
            <span className="text-[9px] bg-gray-800 px-1.5 py-0.5 rounded text-indalpha-muted border border-gray-700 font-semibold tracking-wider">PRO</span>
          </div>
          <GlobalSearch onAddStock={handleAddStock} onViewChart={handleViewChart} />
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={syncMarketData}
            disabled={syncing}
            className="flex items-center gap-2 border border-gray-700 text-gray-300 px-3 py-1.5 rounded-full text-xs font-medium hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin text-indalpha-green' : ''}`} /> 
            {syncing ? 'Syncing...' : 'Sync'}
          </button>
          <button className="flex items-center gap-1.5 border border-indalpha-green/50 text-indalpha-green px-3 py-1.5 rounded-full text-xs font-medium hover:bg-indalpha-green hover:text-black transition-colors">
            <Save className="w-3.5 h-3.5" /> Save
          </button>
          <button onClick={() => setIsSettingsOpen(true)} className="text-gray-500 hover:text-white transition-colors">
            <Settings className="w-4 h-4" />
          </button>
          <button className="text-gray-500 hover:text-white transition-colors">
            <Bell className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Live Market Bar */}
      <div className="h-7 bg-black border-b border-gray-800 flex items-center px-6 text-[11px] shrink-0 overflow-x-auto whitespace-nowrap scrollbar-hide">
        <div className="flex items-center gap-2 text-indalpha-green mr-6 font-semibold">
          <div className="w-1.5 h-1.5 rounded-full bg-indalpha-green animate-pulse"></div>
          LIVE
        </div>
        {indices.map(idx => (
          <div key={idx.name} className="flex items-center gap-1.5 mr-6">
            <span className="text-gray-500">{idx.name}</span>
            <span className="font-mono text-white">{idx.value.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
            <span className={`font-mono ${idx.change >= 0 ? 'text-indalpha-green' : 'text-indalpha-red'}`}>
              {idx.change >= 0 ? '+' : ''}{idx.change}%
            </span>
          </div>
        ))}
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <div className="flex flex-col border-r border-gray-800 h-full shrink-0">
          <FilterSidebar 
            filters={filters} 
            setFilters={setFilters} 
            onApply={fetchStocks} 
            tradingDates={tradingDates}
          />
        </div>

        {/* Center Main */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <MarketMovers 
            data={moversData} 
            loading={moversLoading} 
            onDateSelect={(date) => setFilters(prev => ({ ...prev, performance_date: date }))}
            selectedDate={filters.performance_date}
            tradingDates={tradingDates}
          />
          
          {/* Query Bar */}
          <div className="p-4 pb-0 shrink-0">
            <QueryBar onResults={handleQueryResults} onLoading={setLoading} />
          </div>
          
          <div className="flex-1 p-4 pt-4 overflow-y-auto custom-scrollbar">
            <div className="flex justify-between items-center mb-4">
              <h1 className="text-lg font-semibold text-white">
                Screener Output 
                <span className="text-xs font-normal text-indalpha-green ml-2 border border-indalpha-green/30 bg-indalpha-green/10 px-2 py-0.5 rounded">
                  {stocks.length} stocks
                </span>
              </h1>
              <div className="flex gap-2">
                <button className="text-[11px] text-indalpha-muted hover:text-white border border-gray-700 rounded px-2.5 py-1 flex items-center gap-1.5 hover:bg-gray-800 transition-colors">
                  Export CSV
                </button>
              </div>
            </div>
            
            <ScreenerTable stocks={stocks} loading={loading} onSelectStock={handleViewChart} />
          </div>
        </div>
        
        {/* Right Sidebar - Watchlists */}
        <WatchlistSidebar 
          watchlists={watchlists}
          activeWatchlistId={activeWatchlistId}
          setActiveWatchlistId={setActiveWatchlistId}
          onRemoveStock={handleRemoveStock}
          onCreateWatchlist={handleCreateWatchlist}
          onDeleteWatchlist={handleDeleteWatchlist}
          onSelectStock={handleViewChart}
        />
      </div>

      {/* Stock Detail Panel (overlay) */}
      {selectedStock && (
        <StockDetailPanel stock={selectedStock} onClose={() => setSelectedStock(null)} />
      )}

      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  );
}

export default App;
