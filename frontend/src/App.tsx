import { useState, useEffect } from 'react';
import axios from './api';
import { Save, Bell, RefreshCw, Settings, Menu, List, X, Search } from 'lucide-react';
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
import { AiChatWidget } from './components/AiChatWidget';
import { LockScreen } from './components/LockScreen';

import { LoginModal } from './components/LoginModal';
import { UserProfileModal } from './components/UserProfileModal';
import { auth } from './firebase';
import { onAuthStateChanged, type User } from 'firebase/auth';

function App() {
  const [sessionUser, setSessionUser] = useState<User | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const [stocks, setStocks] = useState<StockData[]>([]);
  const [indices, setIndices] = useState<IndexData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [filters, setFilters] = useState<ScreenerFilters>({});
  const [tableSearchQuery, setTableSearchQuery] = useState('');
  
  const [watchlists, setWatchlists] = useState<Watchlist[]>([]);
  const [activeWatchlistId, setActiveWatchlistId] = useState<number | null>(null);
  
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [showMobileWatchlist, setShowMobileWatchlist] = useState(false);
  
  const [moversData, setMoversData] = useState<MarketMoversData | null>(null);
  const [moversLoading, setMoversLoading] = useState<boolean>(true);
  const [tradingDates, setTradingDates] = useState<string[]>([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  
  // Stock detail panel state
  const [selectedStock, setSelectedStock] = useState<SelectedStock | null>(null);

  const [isUnlocked, setIsUnlocked] = useState<boolean>(() => {
    return sessionStorage.getItem('app_unlocked') === 'true';
  });



  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setSessionUser(user);
      setSessionLoading(false);
    });

    fetchIndices();
    fetchTradingDates();

    const handleOpenSettings = () => setIsSettingsOpen(true);
    document.addEventListener('open-settings', handleOpenSettings);
    
    return () => {
      document.removeEventListener('open-settings', handleOpenSettings);
      unsubscribe();
    };
  }, []);

  // Fetch watchlists when session changes
  useEffect(() => {
    if (sessionUser) {
      fetchWatchlists();
    } else {
      setWatchlists([]);
      setActiveWatchlistId(null);
    }
  }, [sessionUser]);

  useEffect(() => {
    fetchStocks();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  // Only refetch movers when performance_date changes, not on every filter tweak
  useEffect(() => {
    fetchMovers();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.performance_date]);

  useEffect(() => {
    if (activeWatchlistId !== null) {
      fetchWatchlistLivePrices(activeWatchlistId);
      const interval = setInterval(() => fetchWatchlistLivePrices(activeWatchlistId), 15000);
      return () => clearInterval(interval);
    }
  }, [activeWatchlistId]);

  const fetchWatchlists = async () => {
    try {
      const res = await axios.get('/watchlists');
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
      const res = await axios.get(`/watchlists/${id}/live`);
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
      const res = await axios.post('/watchlists', { name });
      setWatchlists([...watchlists, res.data]);
      setActiveWatchlistId(res.data.id);
    } catch (err) {
      alert("Failed to create watchlist. Name might exist.");
    }
  };

  const handleDeleteWatchlist = async (id: number) => {
    try {
      await axios.delete(`/watchlists/${id}`);
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
    if (!sessionUser) {
      setIsLoginModalOpen(true);
      return;
    }
    if (!activeWatchlistId) {
      alert("Please create or select a watchlist first");
      return;
    }
    try {
      await axios.post(`/watchlists/${activeWatchlistId}/items`, {
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
      await axios.delete(`/watchlists/${activeWatchlistId}/items/${symbol}`);
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
      const res = await axios.get('/market/indices');
      setIndices(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchTradingDates = async () => {
    try {
      const res = await axios.get('/market/trading-dates');
      setTradingDates(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchMovers = async () => {
    setMoversLoading(true);
    try {
      const url = filters.performance_date 
        ? `/market/movers?date=${filters.performance_date}` 
        : '/market/movers';
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
      const res = await axios.post('/screener/filter', filters);
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
      await axios.post('/screener/sync');
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

  const filteredTableStocks = stocks.filter(s => 
    s.ticker.toLowerCase().includes(tableSearchQuery.toLowerCase()) || 
    (s.company_name && s.company_name.toLowerCase().includes(tableSearchQuery.toLowerCase()))
  );

  if (!isUnlocked) {
    return (
      <LockScreen onUnlock={() => {
        sessionStorage.setItem('app_unlocked', 'true');
        setIsUnlocked(true);
      }} />
    );
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-indalpha-dark text-indalpha-text">
      {/* Top Navigation */}
      <header className="h-14 bg-indalpha-dark border-b border-indalpha-border flex items-center justify-between px-4 md:px-6 shrink-0 relative z-30">
        <div className="flex items-center gap-3 md:gap-6">
          <button 
            className="md:hidden text-indalpha-muted hover:text-indalpha-text"
            onClick={() => setShowMobileSidebar(!showMobileSidebar)}
          >
            {showMobileSidebar ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          
          <div className="font-bold text-lg flex items-center gap-1 md:gap-2">
            <span className="text-indalpha-green text-2xl font-mono">α</span>
            <span className="text-indalpha-text hidden sm:inline">IndAlpha</span>
            <span className="text-[9px] bg-indalpha-card px-1.5 py-0.5 rounded text-indalpha-muted border border-indalpha-border font-semibold tracking-wider">PRO</span>
          </div>
          
          <div className="hidden md:block">
            <GlobalSearch onAddStock={handleAddStock} onViewChart={handleViewChart} />
          </div>
        </div>
        <div className="flex items-center gap-2 md:gap-3">
          <div className="md:hidden">
            <GlobalSearch onAddStock={handleAddStock} onViewChart={handleViewChart} />
          </div>
          <button 
            onClick={syncMarketData}
            disabled={syncing}
            className="hidden sm:flex items-center gap-2 border border-indalpha-border text-indalpha-muted px-3 py-1.5 rounded-full text-xs font-medium hover:bg-indalpha-card transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin text-indalpha-green' : ''}`} /> 
            {syncing ? 'Syncing...' : 'Sync'}
          </button>
          <button className="hidden sm:flex items-center gap-1.5 border border-indalpha-green/50 text-indalpha-green px-3 py-1.5 rounded-full text-xs font-medium hover:bg-indalpha-green hover:text-black transition-colors">
            <Save className="w-3.5 h-3.5" /> Save
          </button>
          <button onClick={() => setIsSettingsOpen(true)} className="text-indalpha-muted hover:text-indalpha-text transition-colors">
            <Settings className="w-4 h-4 md:w-5 md:h-5" />
          </button>
          <button 
            className="md:hidden text-indalpha-muted hover:text-indalpha-text transition-colors ml-1"
            onClick={() => setShowMobileWatchlist(!showMobileWatchlist)}
          >
            {showMobileWatchlist ? <X className="w-5 h-5" /> : <List className="w-5 h-5" />}
          </button>
          
          {/* Auth Button */}
          {sessionLoading ? (
            <div className="w-8 h-8 rounded-full bg-white/5 animate-pulse"></div>
          ) : sessionUser ? (
            <button 
              onClick={() => setIsProfileModalOpen(true)}
              className="flex items-center justify-center w-8 h-8 text-sm font-semibold text-white transition-colors bg-blue-600 rounded-full hover:bg-blue-500"
              title="Profile"
            >
              {sessionUser.displayName?.[0]?.toUpperCase() || sessionUser.email?.[0]?.toUpperCase() || sessionUser.phoneNumber?.[0] || 'U'}
            </button>
          ) : (
            <button 
              onClick={() => setIsLoginModalOpen(true)}
              className="hidden sm:flex px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 rounded-full hover:bg-blue-500 transition-colors"
            >
              Sign In
            </button>
          )}

          <button className="hidden md:block text-indalpha-muted hover:text-indalpha-text transition-colors">
            <Bell className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Modals */}
      <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />
      <UserProfileModal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} user={sessionUser} />

      {/* Live Market Bar */}
      <div className="h-7 bg-black border-b border-indalpha-border flex items-center px-6 text-[11px] shrink-0 overflow-x-auto whitespace-nowrap scrollbar-hide">
        <div className="flex items-center gap-2 text-indalpha-green mr-6 font-semibold">
          <div className="w-1.5 h-1.5 rounded-full bg-indalpha-green animate-pulse"></div>
          LIVE
        </div>
        {indices.map(idx => (
          <div key={idx.name} className="flex items-center gap-1.5 mr-6">
            <span className="text-indalpha-muted">{idx.name}</span>
            <span className="font-mono text-indalpha-text">{idx.value.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
            <span className={`font-mono ${idx.change >= 0 ? 'text-indalpha-green' : 'text-indalpha-red'}`}>
              {idx.change >= 0 ? '+' : ''}{idx.change}%
            </span>
          </div>
        ))}
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Sidebar */}
        <div className={`
          absolute md:relative z-20 h-full bg-indalpha-dark border-r border-indalpha-border transition-transform duration-300 w-72 md:w-auto
          ${showMobileSidebar ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}>
          <FilterSidebar 
            filters={filters} 
            setFilters={setFilters} 
            onApply={() => {
              fetchStocks();
              setShowMobileSidebar(false);
            }} 
            tradingDates={tradingDates}
          />
        </div>

        {/* Overlay for mobile sidebar */}
        {showMobileSidebar && (
          <div 
            className="absolute inset-0 bg-black/50 z-10 md:hidden"
            onClick={() => setShowMobileSidebar(false)}
          />
        )}

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
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
              <h1 className="text-lg font-semibold text-indalpha-text flex items-center">
                Screener Output 
                <span className="text-xs font-normal text-indalpha-green ml-2 border border-indalpha-green/30 bg-indalpha-green/10 px-2 py-0.5 rounded">
                  {filteredTableStocks.length} stocks
                </span>
              </h1>
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-4 w-4 text-indalpha-muted" />
                  </div>
                  <input
                    type="text"
                    placeholder="Search in table..."
                    value={tableSearchQuery}
                    onChange={(e) => setTableSearchQuery(e.target.value)}
                    className="block w-full pl-9 pr-8 py-1.5 border border-indalpha-border rounded-full leading-5 bg-indalpha-card text-indalpha-text placeholder-indalpha-muted focus:outline-none focus:ring-1 focus:ring-indalpha-green focus:border-indalpha-green sm:text-sm transition-colors shadow-sm"
                  />
                  {tableSearchQuery && (
                    <button 
                      onClick={() => setTableSearchQuery('')}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-indalpha-muted hover:text-indalpha-text transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <button className="shrink-0 text-[11px] font-medium text-indalpha-muted hover:text-indalpha-text border border-indalpha-border rounded px-3 py-1.5 flex items-center gap-1.5 hover:bg-indalpha-card transition-colors">
                  Export CSV
                </button>
              </div>
            </div>
            
            <ScreenerTable stocks={filteredTableStocks} loading={loading} onSelectStock={handleViewChart} />
          </div>
        </div>
        
        {/* Right Sidebar - Watchlists */}
        <div className={`
          absolute md:relative right-0 z-20 h-full bg-indalpha-dark border-l border-indalpha-border transition-transform duration-300 w-80 md:w-auto
          ${showMobileWatchlist ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}
        `}>
          <WatchlistSidebar 
            watchlists={watchlists}
            activeWatchlistId={activeWatchlistId}
            setActiveWatchlistId={setActiveWatchlistId}
            onRemoveStock={handleRemoveStock}
            onCreateWatchlist={handleCreateWatchlist}
            onDeleteWatchlist={handleDeleteWatchlist}
            onSelectStock={(stock) => {
              handleViewChart(stock);
              setShowMobileWatchlist(false);
            }}
          />
        </div>
        
        {/* Overlay for mobile watchlist */}
        {showMobileWatchlist && (
          <div 
            className="absolute inset-0 bg-black/50 z-10 md:hidden"
            onClick={() => setShowMobileWatchlist(false)}
          />
        )}
      </div>

      {/* Stock Detail Panel (overlay) */}
      {selectedStock && (
        <StockDetailPanel stock={selectedStock} onClose={() => setSelectedStock(null)} />
      )}

      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      <AiChatWidget />
    </div>
  );
}

export default App;
