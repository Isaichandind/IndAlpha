import React, { useState, useEffect, useRef } from 'react';
import axios from '../api';
import { Terminal, Zap, AlertCircle } from 'lucide-react';
import type { StockData } from '../types';

interface QueryBarProps {
  onResults: (stocks: StockData[]) => void;
  onLoading: (loading: boolean) => void;
}

const FIELD_SUGGESTIONS = [
  'ROCE', 'ROE', 'PE', 'Market Cap', 'Debt to Equity',
  'Promoter Holding', 'Pledged', 'RSI', 'Delivery Volume',
  'EPS', 'Dividend Yield', 'PB Ratio', 'Book Value'
];

const EXAMPLE_QUERIES = [
  'ROCE > 15 AND PE < 30',
  'Market Cap > 100000 AND ROE > 18',
  'EPS > 50 AND Dividend Yield > 2',
  'ROCE > 20 AND PE < 25 AND PB Ratio < 3',
];

export function QueryBar({ onResults, onLoading }: QueryBarProps) {
  const [query, setQuery] = useState('');
  const [showHelp, setShowHelp] = useState(false);
  const [error, setError] = useState('');
  const [resultCount, setResultCount] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const helpRef = useRef<HTMLDivElement>(null);

  const API_URL = '';

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (helpRef.current && !helpRef.current.contains(event.target as Node)) {
        setShowHelp(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const runQuery = async () => {
    if (!query.trim()) {
      setError('Enter a query expression');
      return;
    }
    
    setError('');
    onLoading(true);
    try {
      const res = await axios.get(`${API_URL}/screener/query`, { params: { q: query } });
      onResults(res.data);
      setResultCount(res.data.length);
    } catch (err) {
      setError('Query failed. Check your expression.');
      console.error(err);
    } finally {
      onLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      runQuery();
    }
  };

  const insertExample = (example: string) => {
    setQuery(example);
    setShowHelp(false);
    inputRef.current?.focus();
  };

  return (
    <div className="relative" ref={helpRef}>
      <div className="flex items-center gap-2 bg-gray-900/80 border border-gray-700 rounded-lg p-1 pl-3">
        <Terminal className="w-4 h-4 text-indalpha-green shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setError(''); }}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowHelp(true)}
          placeholder="Query: ROCE > 20 AND PE < 30 AND Market Cap > 5000"
          className="bg-transparent text-sm text-white flex-1 focus:outline-none placeholder:text-gray-500 font-mono py-1.5"
        />
        {resultCount !== null && (
          <span className="text-[10px] text-indalpha-green bg-indalpha-green/10 border border-indalpha-green/30 px-2 py-0.5 rounded font-mono shrink-0">
            {resultCount} found
          </span>
        )}
        <button
          onClick={runQuery}
          className="bg-indalpha-green text-black px-3 py-1.5 rounded-md text-xs font-bold hover:bg-emerald-400 transition-colors flex items-center gap-1 shrink-0"
        >
          <Zap className="w-3 h-3" /> Run
        </button>
      </div>

      {error && (
        <div className="absolute top-full mt-1 left-0 flex items-center gap-1 text-xs text-indalpha-red">
          <AlertCircle className="w-3 h-3" /> {error}
        </div>
      )}

      {showHelp && (
        <div className="absolute top-full mt-2 left-0 w-full bg-gray-900/95 backdrop-blur-md border border-gray-700 rounded-xl shadow-2xl p-4 z-50 animate-fade-in">
          <div className="text-[10px] uppercase text-indalpha-muted tracking-wider mb-2 font-semibold">Available Fields</div>
          <div className="flex flex-wrap gap-1.5 mb-4">
            {FIELD_SUGGESTIONS.map(f => (
              <span
                key={f}
                onClick={() => setQuery(prev => prev ? `${prev} AND ${f} ` : `${f} `)}
                className="text-[11px] bg-gray-800 text-indalpha-text px-2 py-0.5 rounded cursor-pointer hover:bg-gray-700 hover:text-white transition-colors border border-gray-700"
              >
                {f}
              </span>
            ))}
          </div>
          <div className="text-[10px] uppercase text-indalpha-muted tracking-wider mb-2 font-semibold">Example Queries</div>
          <div className="space-y-1.5">
            {EXAMPLE_QUERIES.map(eq => (
              <button
                key={eq}
                onClick={() => insertExample(eq)}
                className="w-full text-left text-xs text-gray-400 hover:text-indalpha-green font-mono py-1 px-2 rounded hover:bg-gray-800 transition-colors"
              >
                {eq}
              </button>
            ))}
          </div>
          <div className="mt-3 pt-2 border-t border-gray-800 text-[10px] text-gray-600">
            Operators: <code className="text-gray-500">&gt;</code> <code className="text-gray-500">&gt;=</code> <code className="text-gray-500">&lt;</code> <code className="text-gray-500">&lt;=</code> <code className="text-gray-500">=</code> • Combine with <code className="text-gray-500">AND</code>
          </div>
        </div>
      )}
    </div>
  );
}
