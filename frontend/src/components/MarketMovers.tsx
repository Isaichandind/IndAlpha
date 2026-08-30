import React from 'react';
import { TrendingUp, ArrowUpRight, ArrowDownRight } from 'lucide-react';
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
      <div className="flex w-full overflow-hidden h-14 bg-indalpha-dark border-b border-gray-800 items-center px-4">
        <div className="w-48 h-6 bg-gray-900/50 rounded animate-pulse"></div>
      </div>
    );
  }

  // Double the lists to create seamless infinite scroll
  const combinedList = [...data.gainers, ...data.losers].sort(() => Math.random() - 0.5);
  const marqueeItems = [...combinedList, ...combinedList];

  return (
    <div className="relative flex w-full overflow-hidden h-12 bg-[#0a0c10] border-b border-gray-800 items-center">
      {/* Label overlay on left */}
      <div className="absolute left-0 top-0 bottom-0 z-10 flex items-center bg-gradient-to-r from-[#0a0c10] via-[#0a0c10] to-transparent pl-4 pr-12">
        <span className="text-xs font-bold text-indalpha-muted uppercase tracking-widest flex items-center gap-2">
          <TrendingUp size={14} className="text-indalpha-green" />
          Movers
        </span>
        {onDateSelect && tradingDates && (
          <select 
            className="ml-3 bg-gray-900 border border-gray-800 text-xs text-white rounded px-2 py-1 outline-none"
            value={selectedDate || ''}
            onChange={(e) => onDateSelect(e.target.value)}
          >
            <option value="">Live</option>
            {tradingDates.map(d => (
              <option key={d} value={d}>{new Date(d).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}</option>
            ))}
          </select>
        )}
      </div>

      {/* Marquee container */}
      <div className="flex animate-marquee hover:[animation-play-state:paused] whitespace-nowrap ml-32">
        {marqueeItems.map((stock, i) => {
          const isGainer = stock.change_pct >= 0;
          return (
            <div 
              key={`${stock.symbol}-${i}`}
              className="flex items-center gap-3 px-6 border-r border-gray-800/50 hover:bg-white/5 transition-colors cursor-pointer group"
            >
              <span className="font-bold text-white/90 text-sm tracking-wide group-hover:text-white">
                {stock.symbol.replace('.NS', '')}
              </span>
              <span className={`text-xs font-mono font-medium flex items-center gap-1 ${isGainer ? 'text-indalpha-green' : 'text-indalpha-red'}`}>
                ₹{stock.ltp.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                {isGainer ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                {isGainer ? '+' : ''}{stock.change_pct}%
              </span>
            </div>
          );
        })}
      </div>

      {/* Gradient overlay on right */}
      <div className="absolute right-0 z-10 h-full w-12 bg-gradient-to-l from-[#0a0c10] to-transparent pointer-events-none"></div>
    </div>
  );
};
