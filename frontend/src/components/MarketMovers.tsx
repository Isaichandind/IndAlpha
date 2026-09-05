import React from 'react';
import { TrendingUp, TrendingDown, Calendar } from 'lucide-react';
import type { MarketMoversData } from '../types';

interface MarketMoversProps {
  data: MarketMoversData | null;
  loading: boolean;
  onDateSelect?: (date: string) => void;
  selectedDate?: string;
  tradingDates?: string[];
}

export const MarketMovers: React.FC<MarketMoversProps> = ({ data, loading, onDateSelect, selectedDate, tradingDates }) => {
  if (loading || !data) {
    return (
      <div className="w-full bg-indalpha-dark border-b border-indalpha-border p-4">
        <div className="flex gap-4">
          <div className="flex-1 h-24 bg-indalpha-card/50 rounded animate-pulse"></div>
          <div className="flex-1 h-24 bg-indalpha-card/50 rounded animate-pulse"></div>
        </div>
      </div>
    );
  }

  // Take top 3 for a compact UI
  const topGainers = data.gainers.slice(0, 3);
  const topLosers = data.losers.slice(0, 3);

  return (
    <div className="w-full bg-indalpha-dark border-b border-indalpha-border p-4 lg:p-6 shrink-0">
      
      {/* Header & Controls */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-bold text-indalpha-text uppercase tracking-widest flex items-center gap-2">
            Market Dashboard
          </h2>
          {onDateSelect && tradingDates && (
            <div className="flex items-center gap-2 bg-indalpha-card border border-indalpha-border rounded px-2 py-1">
              <Calendar size={12} className="text-indalpha-muted" />
              <select 
                className="bg-transparent text-xs text-indalpha-text outline-none cursor-pointer"
                value={selectedDate || ''}
                onChange={(e) => onDateSelect(e.target.value)}
              >
                <option value="" className="bg-indalpha-card text-indalpha-text">Live / Today</option>
                {tradingDates.map(d => (
                  <option key={d} value={d} className="bg-indalpha-card text-indalpha-text">{new Date(d).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Dual Pane Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Top Gainers */}
        <div className="bg-indalpha-card/30 rounded-lg border border-indalpha-green/20 overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-1.5 border-b border-indalpha-green/20 bg-indalpha-green/10">
            <TrendingUp size={14} className="text-indalpha-green" />
            <h3 className="text-[10px] font-semibold text-indalpha-green tracking-wide">TOP GAINERS</h3>
          </div>
          <div className="grid grid-cols-3 divide-x divide-indalpha-border/50">
            {topGainers.map((stock) => (
              <div key={stock.symbol} className="flex flex-col items-center justify-center p-2 hover:bg-white/5 transition-colors cursor-pointer group">
                <span className="font-bold text-indalpha-text text-[11px] group-hover:text-indalpha-green transition-colors truncate w-full text-center">
                  {stock.symbol.replace('.NS', '')}
                </span>
                <div className="flex items-center justify-center gap-1.5 text-[11px] font-mono mt-1">
                  <span className="text-indalpha-muted">₹{stock.ltp.toLocaleString('en-IN', { maximumFractionDigits: 1 })}</span>
                  <span className="text-indalpha-green font-semibold">
                    +{stock.change_pct.toFixed(1)}%
                  </span>
                </div>
              </div>
            ))}
            {topGainers.length === 0 && (
              <div className="col-span-3 p-2 text-xs text-indalpha-muted text-center italic">No gainers found.</div>
            )}
          </div>
        </div>

        {/* Top Losers */}
        <div className="bg-indalpha-card/30 rounded-lg border border-indalpha-red/20 overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-1.5 border-b border-indalpha-red/20 bg-indalpha-red/10">
            <TrendingDown size={14} className="text-indalpha-red" />
            <h3 className="text-[10px] font-semibold text-indalpha-red tracking-wide">TOP LOSERS</h3>
          </div>
          <div className="grid grid-cols-3 divide-x divide-indalpha-border/50">
            {topLosers.map((stock) => (
              <div key={stock.symbol} className="flex flex-col items-center justify-center p-2 hover:bg-white/5 transition-colors cursor-pointer group">
                <span className="font-bold text-indalpha-text text-[11px] group-hover:text-indalpha-red transition-colors truncate w-full text-center">
                  {stock.symbol.replace('.NS', '')}
                </span>
                <div className="flex items-center justify-center gap-1.5 text-[11px] font-mono mt-1">
                  <span className="text-indalpha-muted">₹{stock.ltp.toLocaleString('en-IN', { maximumFractionDigits: 1 })}</span>
                  <span className="text-indalpha-red font-semibold">
                    {stock.change_pct.toFixed(1)}%
                  </span>
                </div>
              </div>
            ))}
            {topLosers.length === 0 && (
              <div className="col-span-3 p-2 text-xs text-indalpha-muted text-center italic">No losers found.</div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
