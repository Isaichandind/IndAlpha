import React from 'react';
import { FilterX, Zap } from 'lucide-react';
import type { ScreenerFilters } from '../types';

interface FilterSidebarProps {
  filters: ScreenerFilters;
  setFilters: React.Dispatch<React.SetStateAction<ScreenerFilters>>;
  onApply: () => void;
  tradingDates: string[];
}

export const FilterSidebar: React.FC<FilterSidebarProps> = ({ filters, setFilters, onApply, tradingDates }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : (value === '' ? undefined : Number(value))
    }));
  };

  return (
    <div className="w-72 bg-indalpha-card border-r border-indalpha-border h-[calc(100vh-64px)] overflow-y-auto p-4 flex flex-col shrink-0">
      <h2 className="text-sm font-bold text-indalpha-muted uppercase mb-4 tracking-wider">Weightage Model</h2>
      <div className="mb-6">
        <div className="flex justify-between text-xs mb-2">
          <span className="text-indalpha-green font-medium">Fundamental: 65%</span>
          <span className="text-indalpha-text font-medium">Technical: 35%</span>
        </div>
        <div className="h-1.5 w-full bg-gray-700 rounded-full flex overflow-hidden">
          <div className="bg-indalpha-green h-full" style={{ width: '65%' }}></div>
          <div className="bg-gray-500 h-full" style={{ width: '35%' }}></div>
        </div>
      </div>

      <h2 className="text-sm font-bold text-indalpha-muted uppercase mb-4 tracking-wider border-b border-indalpha-border pb-2">General</h2>
      
      <div className="space-y-4 mb-6">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm text-indalpha-text">Sector</label>
          <select 
            name="sector" 
            value={filters.sector || ''} 
            onChange={(e) => setFilters(prev => ({ ...prev, sector: e.target.value === '' ? undefined : e.target.value }))}
            className="w-full bg-indalpha-card border border-indalpha-border rounded py-1.5 px-2 text-sm text-indalpha-text focus:outline-none focus:border-indalpha-green"
          >
            <option value="">All Sectors</option>
            <option value="Technology">Technology (IT Services)</option>
            <option value="Financial Services">Financial Services (Banks/NBFC)</option>
            <option value="Healthcare">Healthcare (Pharma)</option>
            <option value="Consumer Cyclical">Consumer Cyclical (Auto/Durables)</option>
            <option value="Consumer Defensive">Consumer Defensive (FMCG)</option>
            <option value="Basic Materials">Basic Materials (Metals/Cement/Chem)</option>
            <option value="Industrials">Industrials (Infrastructure/Capital Goods)</option>
            <option value="Energy">Energy</option>
            <option value="Communication Services">Communication Services (Telecom)</option>
            <option value="Utilities">Utilities</option>
            <option value="Real Estate">Real Estate</option>
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm text-indalpha-text">Search</label>
          <input 
            type="text" 
            name="search_text" 
            value={filters.search_text || ''} 
            onChange={(e) => setFilters(prev => ({ ...prev, search_text: e.target.value === '' ? undefined : e.target.value }))}
            className="w-full bg-indalpha-card border border-indalpha-border rounded py-1.5 px-2 text-sm text-indalpha-text focus:outline-none focus:border-indalpha-green" 
            placeholder="Name, Ticker, Sector..." 
          />
        </div>
      </div>

      <h2 className="text-sm font-bold text-indalpha-muted uppercase mb-4 tracking-wider border-b border-indalpha-border pb-2">Fundamentals</h2>
      
      <div className="space-y-4 mb-6">
        <div className="flex justify-between items-center">
          <label className="text-sm text-indalpha-text">Min ROCE (%)</label>
          <input type="number" name="min_roce" value={filters.min_roce || ''} onChange={handleChange} className="w-16 bg-transparent border-b border-indalpha-border text-right text-sm text-indalpha-text focus:outline-none focus:border-indalpha-green" placeholder="20" />
        </div>
        <div className="flex justify-between items-center">
          <label className="text-sm text-indalpha-text">Max P/E Ratio</label>
          <input type="number" name="max_pe" value={filters.max_pe || ''} onChange={handleChange} className="w-16 bg-transparent border-b border-indalpha-border text-right text-sm text-indalpha-text focus:outline-none focus:border-indalpha-green" placeholder="35" />
        </div>
        <div className="flex justify-between items-center">
          <label className="text-sm text-indalpha-text">Max Debt to Equity</label>
          <input type="number" step="0.1" name="max_debt_to_equity" value={filters.max_debt_to_equity || ''} onChange={handleChange} className="w-16 bg-transparent border-b border-indalpha-border text-right text-sm text-indalpha-text focus:outline-none focus:border-indalpha-green" placeholder="0.5" />
        </div>
        <div className="flex justify-between items-center">
          <label className="text-sm text-indalpha-text">Min Promoter Holding (%)</label>
          <input type="number" name="min_promoter_holding" value={filters.min_promoter_holding || ''} onChange={handleChange} className="w-16 bg-transparent border-b border-indalpha-border text-right text-sm text-indalpha-text focus:outline-none focus:border-indalpha-green" placeholder="50" />
        </div>
        <div className="flex justify-between items-center">
          <label className="text-sm text-indalpha-text">Max Pledged Promoter (%)</label>
          <input type="number" name="max_pledged_promoter" value={filters.max_pledged_promoter || ''} onChange={handleChange} className="w-16 bg-transparent border-b border-indalpha-border text-right text-sm text-indalpha-text focus:outline-none focus:border-indalpha-green" placeholder="5" />
        </div>
      </div>

      <h2 className="text-sm font-bold text-indalpha-muted uppercase mb-4 tracking-wider border-b border-indalpha-border pb-2">Technical Indicators</h2>
      
      <div className="space-y-4 mb-6">
        <div className="flex justify-between items-center">
          <label className="text-sm text-indalpha-text">Price {'>'} 50 EMA</label>
          <input type="checkbox" name="price_gt_50_ema" checked={filters.price_gt_50_ema || false} onChange={handleChange} className="w-4 h-4 accent-indalpha-green" />
        </div>
        <div className="flex justify-between items-center">
          <label className="text-sm text-indalpha-text">Price {'>'} 200 EMA</label>
          <input type="checkbox" name="price_gt_200_ema" checked={filters.price_gt_200_ema || false} onChange={handleChange} className="w-4 h-4 accent-indalpha-green" />
        </div>
        <div className="flex justify-between items-center">
          <label className="text-sm text-indalpha-text">Min Delivery Volume (%)</label>
          <input type="number" name="min_delivery_volume" value={filters.min_delivery_volume || ''} onChange={handleChange} className="w-16 bg-transparent border-b border-indalpha-border text-right text-sm text-indalpha-text focus:outline-none focus:border-indalpha-green" placeholder="40" />
        </div>
        <div className="flex justify-between items-center">
          <label className="text-sm text-indalpha-text">Supertrend Bullish</label>
          <input type="checkbox" name="supertrend_bullish" checked={filters.supertrend_bullish || false} onChange={handleChange} className="w-4 h-4 accent-indalpha-green" />
        </div>
      </div>

      <h2 className="text-sm font-bold text-indalpha-muted uppercase mb-4 tracking-wider border-b border-indalpha-border pb-2">Historical Performance</h2>
      
      <div className="space-y-4 mb-6">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm text-indalpha-text">Specific Date</label>
          <select 
            name="performance_date" 
            value={filters.performance_date || ''} 
            onChange={(e) => setFilters(prev => ({ ...prev, performance_date: e.target.value === '' ? undefined : e.target.value }))}
            className="w-full bg-indalpha-card border border-indalpha-border rounded py-1.5 px-2 text-sm text-indalpha-text focus:outline-none focus:border-indalpha-green" 
          >
            <option value="">Current (Live)</option>
            {tradingDates.map(date => (
              <option key={date} value={date}>{new Date(date).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric', weekday: 'short' })}</option>
            ))}
          </select>
        </div>
        <div className="flex justify-between items-center">
          <label className="text-sm text-indalpha-text">Min Gain (%)</label>
          <input type="number" step="0.1" name="min_change_pct" value={filters.min_change_pct || ''} onChange={handleChange} className="w-16 bg-transparent border-b border-indalpha-border text-right text-sm text-indalpha-text focus:outline-none focus:border-indalpha-green" placeholder="5" />
        </div>
        <div className="flex justify-between items-center">
          <label className="text-sm text-indalpha-text">Max Loss (%)</label>
          <input type="number" step="0.1" name="max_change_pct" value={filters.max_change_pct || ''} onChange={handleChange} className="w-16 bg-transparent border-b border-indalpha-border text-right text-sm text-indalpha-text focus:outline-none focus:border-indalpha-green" placeholder="-5" />
        </div>
      </div>
      
      <div className="mt-auto pt-4 border-t border-indalpha-border space-y-3">
        <div className="flex gap-2">
          <button 
            onClick={() => setFilters({})}
            className="flex-1 py-2 flex items-center justify-center gap-1.5 bg-indalpha-card/50 border border-indalpha-border/50 text-indalpha-muted rounded hover:bg-gray-700 hover:text-indalpha-text transition-colors text-xs font-medium"
            title="Clear all filters"
          >
            <FilterX className="w-3.5 h-3.5" /> Clear
          </button>
          <button 
            onClick={() => {
              setFilters(prev => ({
                ...prev,
                min_roce: 20,
                max_pe: 35,
                max_debt_to_equity: 0.5,
                min_promoter_holding: 50,
                max_pledged_promoter: 5,
                price_gt_50_ema: true,
                price_gt_200_ema: true
              }));
            }}
            className="flex-[2] py-2 flex items-center justify-center gap-1.5 bg-indalpha-green/10 border border-indalpha-green/30 text-indalpha-green rounded hover:bg-indalpha-green hover:text-black transition-colors text-xs font-bold"
          >
            <Zap className="w-3.5 h-3.5" /> Pro Strategy
          </button>
        </div>
        <button 
          onClick={onApply}
          className="w-full py-2.5 bg-indalpha-dark border border-indalpha-green text-indalpha-green rounded hover:bg-indalpha-green hover:text-black transition-colors font-bold shadow-[0_0_10px_rgba(34,197,94,0.1)] hover:shadow-[0_0_15px_rgba(34,197,94,0.4)] tracking-wide uppercase text-xs"
        >
          Apply Quant Filters
        </button>
      </div>
    </div>
  );
};
