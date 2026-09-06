import React, { useState, useEffect, useRef } from 'react';
import axios from '../api';
import { Search, Loader2, BarChart3, Plus, Command } from 'lucide-react';
import type { SelectedStock } from '../types';

export interface SearchResult {
  symbol: string;
  name: string;
  exchange: string;
  type: string;
  score: number;
}

interface GlobalSearchProps {
  onAddStock: (stock: SearchResult) => void;
  onViewChart: (stock: SelectedStock) => void;
}

export function GlobalSearch({ onAddStock, onViewChart }: GlobalSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  


  // Global Ctrl+K hotkey
  useEffect(() => {
    function handleGlobalKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === '/' && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }
    document.addEventListener('keydown', handleGlobalKey);
    return () => document.removeEventListener('keydown', handleGlobalKey);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchResults = async (searchQuery: string) => {
    setIsLoading(true);
    try {
      const res = await axios.get('/screener/search', {
        params: { q: searchQuery }
      });
      if (Array.isArray(res.data)) {
        setResults(res.data);
      } else {
        console.warn("Search returned non-array data:", res.data);
        setResults([]);
      }
      setIsOpen(true);
      setSelectedIndex(-1);
    } catch (err) {
      console.error('Search error:', err);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (query.trim().length >= 2) {
        fetchResults(query);
      } else {
        setResults([]);
        setIsOpen(false);
      }
    }, 150);

    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || results.length === 0) {
      if (e.key === 'Escape') {
        inputRef.current?.blur();
        setIsOpen(false);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev < results.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < results.length) {
        handleAddToWatchlist(results[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      inputRef.current?.blur();
    }
  };

  const handleAddToWatchlist = (result: SearchResult) => {
    onAddStock(result);
    setQuery('');
    setIsOpen(false);
  };

  const handleViewChart = (result: SearchResult) => {
    onViewChart({ symbol: result.symbol, name: result.name, exchange: result.exchange });
    setQuery('');
    setIsOpen(false);
  };

  const getTypeBadge = (type: string | null | undefined) => {
    if (!type) return { label: 'UNK', color: 'bg-indalpha-card text-indalpha-muted border-indalpha-border' };
    const t = type.toUpperCase();
    if (t === 'EQUITY') return { label: 'EQ', color: 'bg-blue-900/30 text-blue-400 border-blue-800/50' };
    if (t === 'ETF') return { label: 'ETF', color: 'bg-purple-900/30 text-purple-400 border-purple-800/50' };
    if (t === 'INDEX') return { label: 'IDX', color: 'bg-yellow-900/30 text-yellow-400 border-yellow-800/50' };
    return { label: t.slice(0, 3), color: 'bg-indalpha-card text-indalpha-muted border-indalpha-border' };
  };

  return (
    <div className="relative w-48 sm:w-64 md:w-96 z-50" ref={wrapperRef}>
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-indalpha-muted" />
        <input 
          ref={inputRef}
          type="text" 
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => { if (results.length > 0) setIsOpen(true); }}
          placeholder="Search stocks..." 
          className="bg-indalpha-card border border-indalpha-border rounded-full py-1.5 pl-10 pr-20 text-sm w-full focus:outline-none focus:border-indalpha-green focus:ring-1 focus:ring-indalpha-green text-indalpha-text transition-all placeholder:text-indalpha-muted"
        />
        {isLoading ? (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <Loader2 className="w-4 h-4 text-indalpha-green animate-spin" />
          </div>
        ) : (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-gray-600">
            <Command className="w-3 h-3" />
            <span className="text-[10px] font-mono">K</span>
          </div>
        )}
      </div>

      {isOpen && results.length > 0 && (
        <div className="absolute top-full mt-2 w-full bg-indalpha-card/95 backdrop-blur-md border border-indalpha-border rounded-xl shadow-2xl overflow-hidden animate-fade-in">
          <ul className="max-h-96 overflow-y-auto py-1 custom-scrollbar">
            {results.map((result, index) => {
              const badge = getTypeBadge(result.type);
              return (
                <li 
                  key={result.symbol}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`px-3 py-2.5 cursor-pointer transition-colors group ${
                    index === selectedIndex ? 'bg-indalpha-card' : 'hover:bg-indalpha-card/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col overflow-hidden" onClick={() => handleViewChart(result)}>
                      <div className="flex items-center gap-2">
                        <span className="text-indalpha-text font-medium text-sm">{result.name}</span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-sm font-bold border ${badge.color}`}>{badge.label}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-indalpha-muted text-xs font-mono">{result.symbol}</span>
                        <span className={`text-[9px] px-1 rounded-sm font-bold border ${
                          result.exchange === 'NSE' 
                            ? 'bg-blue-900/30 text-blue-400 border-blue-800/50' 
                            : result.exchange === 'BSE'
                              ? 'bg-orange-900/30 text-orange-400 border-orange-800/50'
                              : 'bg-emerald-900/30 text-emerald-400 border-emerald-800/50'
                        }`}>{result.exchange}</span>
                      </div>
                    </div>
                    
                    {/* Quick action buttons */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleAddToWatchlist(result); }}
                        className="p-1.5 rounded bg-indalpha-green/10 text-indalpha-green hover:bg-indalpha-green/20 transition-colors"
                        title="Add to Watchlist"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleViewChart(result); }}
                        className="p-1.5 rounded bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors"
                        title="View Chart"
                      >
                        <BarChart3 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
          <div className="px-3 py-2 border-t border-indalpha-border flex items-center gap-3 text-[10px] text-gray-600">
            <span><kbd className="bg-indalpha-card px-1 rounded text-indalpha-muted">↑↓</kbd> Navigate</span>
            <span><kbd className="bg-indalpha-card px-1 rounded text-indalpha-muted">Enter</kbd> Add to WL</span>
            <span><kbd className="bg-indalpha-card px-1 rounded text-indalpha-muted">Esc</kbd> Close</span>
          </div>
        </div>
      )}
      
      {isOpen && !isLoading && query.length >= 2 && results.length === 0 && (
        <div className="absolute top-full mt-2 w-full bg-indalpha-card/95 backdrop-blur-md border border-indalpha-border rounded-xl shadow-2xl p-4 text-center text-sm text-indalpha-muted animate-fade-in">
          No stocks found matching "{query}"
        </div>
      )}
    </div>
  );
}
