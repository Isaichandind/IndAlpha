import React, { useState } from 'react';
import { Plus, X, List, Trash2, TrendingUp, TrendingDown, BarChart3 } from 'lucide-react';
import type { Watchlist, SelectedStock } from '../types';

interface WatchlistSidebarProps {
  watchlists: Watchlist[];
  activeWatchlistId: number | null;
  setActiveWatchlistId: (id: number) => void;
  onRemoveStock: (symbol: string) => void;
  onCreateWatchlist: (name: string) => void;
  onDeleteWatchlist: (id: number) => void;
  onSelectStock: (stock: SelectedStock) => void;
}

export function WatchlistSidebar({
  watchlists,
  activeWatchlistId,
  setActiveWatchlistId,
  onRemoveStock,
  onCreateWatchlist,
  onDeleteWatchlist,
  onSelectStock
}: WatchlistSidebarProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [newWatchlistName, setNewWatchlistName] = useState('');

  const activeWatchlist = watchlists.find(w => w.id === activeWatchlistId);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (newWatchlistName.trim()) {
      onCreateWatchlist(newWatchlistName.trim());
      setNewWatchlistName('');
      setIsCreating(false);
    }
  };

  return (
    <div className="w-80 bg-indalpha-dark border-l border-indalpha-border flex flex-col h-full shrink-0">
      <div className="p-4 border-b border-indalpha-border flex items-center justify-between">
        <div className="flex items-center gap-2 text-indalpha-text font-semibold">
          <List className="w-4 h-4 text-indalpha-green" />
          Watchlists
        </div>
        <button 
          onClick={() => setIsCreating(true)}
          className="text-indalpha-muted hover:text-indalpha-text transition-colors"
          title="Create New Watchlist"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {isCreating && (
        <form onSubmit={handleCreate} className="p-4 border-b border-indalpha-border bg-indalpha-card">
          <div className="flex items-center gap-2">
            <input 
              type="text" 
              autoFocus
              value={newWatchlistName}
              onChange={(e) => setNewWatchlistName(e.target.value)}
              placeholder="Watchlist Name" 
              className="bg-black border border-indalpha-border rounded px-2 py-1 text-sm w-full focus:outline-none focus:border-indalpha-green text-indalpha-text"
            />
            <button type="submit" className="bg-indalpha-green text-black px-2 py-1 rounded text-sm font-medium">Add</button>
            <button type="button" onClick={() => setIsCreating(false)} className="text-indalpha-muted hover:text-indalpha-text">
              <X className="w-4 h-4" />
            </button>
          </div>
        </form>
      )}

      <div className="p-2 border-b border-indalpha-border">
        <select 
          className="w-full bg-indalpha-card border border-indalpha-border text-indalpha-text text-sm rounded p-2 focus:outline-none focus:border-indalpha-green"
          value={activeWatchlistId || ''}
          onChange={(e) => setActiveWatchlistId(Number(e.target.value))}
        >
          {watchlists.map(w => (
            <option key={w.id} value={w.id}>{w.name} ({w.items?.length || 0})</option>
          ))}
        </select>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {activeWatchlist?.items && activeWatchlist.items.length > 0 ? (
          <div className="flex flex-col">
            {activeWatchlist.items.map(item => (
              <div key={item.symbol} className="group flex items-center justify-between p-3 border-b border-indalpha-border hover:bg-indalpha-card/50 transition-colors">
                <div className="flex flex-col overflow-hidden">
                  <div className="flex items-center gap-2">
                    <span className="text-indalpha-text font-medium text-sm">{item.symbol.split('.')[0]}</span>
                    <span className={`text-[9px] px-1.5 rounded-sm border ${item.exchange === 'NSE' ? 'text-blue-400 border-blue-800/50 bg-blue-900/20' : 'text-orange-400 border-orange-800/50 bg-orange-900/20'}`}>
                      {item.exchange}
                    </span>
                  </div>
                  <span className="text-indalpha-muted text-xs truncate w-32" title={item.name}>{item.name}</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); onSelectStock({ symbol: item.symbol, name: item.name, exchange: item.exchange }); }}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded text-blue-400 hover:bg-blue-900/20 transition-all"
                    title="View Chart"
                  >
                    <BarChart3 className="w-3.5 h-3.5" />
                  </button>
                  <div className="flex flex-col items-end">
                    <span className="text-indalpha-text text-sm font-mono">
                      {item.ltp ? item.ltp.toLocaleString(undefined, {minimumFractionDigits: 2}) : '-'}
                    </span>
                    {item.change_pct !== undefined ? (
                      <span className={`text-xs font-mono flex items-center gap-0.5 ${item.change_pct >= 0 ? 'text-indalpha-green' : 'text-indalpha-red'}`}>
                        {item.change_pct >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {Math.abs(item.change_pct).toFixed(2)}%
                      </span>
                    ) : (
                      <span className="text-xs text-indalpha-muted">-</span>
                    )}
                  </div>
                  <button 
                    onClick={() => onRemoveStock(item.symbol)}
                    className="opacity-0 group-hover:opacity-100 text-indalpha-muted hover:text-red-400 transition-all"
                    title="Remove from Watchlist"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
           <div className="flex flex-col items-center justify-center h-40 text-center px-4">
             <List className="w-8 h-8 text-gray-700 mb-2" />
             <p className="text-indalpha-muted text-sm">This watchlist is empty</p>
             <p className="text-gray-600 text-xs mt-1">Search for a stock to add it here.</p>
           </div>
        )}
      </div>
      
      {activeWatchlist && watchlists.length > 1 && (
        <div className="p-3 border-t border-indalpha-border">
          <button 
            onClick={() => onDeleteWatchlist(activeWatchlist.id)}
            className="w-full flex items-center justify-center gap-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-900/20 py-2 rounded transition-colors"
          >
            <Trash2 className="w-3 h-3" /> Delete Watchlist
          </button>
        </div>
      )}
    </div>
  );
}
