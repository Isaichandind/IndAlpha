import React, { useState } from 'react';
import { Settings2, Check } from 'lucide-react';
import type { StockData, SelectedStock } from '../types';
import { SmartLoader } from './SmartLoader';
import { formatCurrency } from '../utils/format';

interface ScreenerTableProps {
  stocks: StockData[];
  loading: boolean;
  onSelectStock?: (stock: SelectedStock) => void;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  onSort?: (key: string, order: 'asc' | 'desc') => void;
}

const AlphaGauge = ({ score }: { score: number }) => {
  const radius = 16;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;
  const colorClass = score >= 80 ? 'text-indalpha-green' : score >= 60 ? 'text-yellow-500' : 'text-indalpha-red';

  return (
    <div className="relative flex items-center justify-center w-10 h-10 mx-auto">
      <svg viewBox="0 0 40 40" className="w-full h-full transform -rotate-90">
        <circle cx="20" cy="20" r="16" stroke="currentColor" strokeWidth="2.5" fill="transparent" className="text-gray-800" />
        <circle cx="20" cy="20" r="16" stroke="currentColor" strokeWidth="2.5" fill="transparent" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} className={`${colorClass} transition-all duration-1000 ease-in-out`} strokeLinecap="round" />
      </svg>
      <span className={`absolute text-sm font-bold ${colorClass}`}>{score}</span>
    </div>
  );
};

type ColumnKey = 'rank' | 'ticker' | 'ltp' | 'change_pct' | 'mcap' | 'alpha' | 'roce' | 'pe' | 'de' | 'ph' | 'delivery' | 'eps' | 'div' | 'pb' | 'bv' | 'tag';

const ALL_COLUMNS: { key: ColumnKey; label: string; defaultVisible: boolean }[] = [
  { key: 'rank', label: 'Rank', defaultVisible: true },
  { key: 'ticker', label: 'Ticker & Company', defaultVisible: true },
  { key: 'ltp', label: 'LTP', defaultVisible: true },
  { key: 'change_pct', label: '1D Change %', defaultVisible: true },
  { key: 'mcap', label: 'Market Cap', defaultVisible: true },
  { key: 'alpha', label: 'Alpha Score', defaultVisible: true },
  { key: 'roce', label: 'ROCE / ROE', defaultVisible: true },
  { key: 'pe', label: 'P/E Ratio', defaultVisible: false },
  { key: 'pb', label: 'P/B Ratio', defaultVisible: false },
  { key: 'eps', label: 'EPS', defaultVisible: false },
  { key: 'div', label: 'Div Yield', defaultVisible: false },
  { key: 'de', label: 'Debt/Equity', defaultVisible: false },
  { key: 'ph', label: 'Promoter %', defaultVisible: true },
  { key: 'delivery', label: 'Delivery Vol %', defaultVisible: true },
  { key: 'bv', label: 'Book Value', defaultVisible: false },
  { key: 'tag', label: 'Tag', defaultVisible: false },
];

export const ScreenerTable: React.FC<ScreenerTableProps> = ({ stocks, loading, onSelectStock, sortBy, sortOrder, onSort }) => {
  const [visibleColumns, setVisibleColumns] = useState<Set<ColumnKey>>(
    new Set(ALL_COLUMNS.filter(c => c.defaultVisible).map(c => c.key))
  );
  const [showColumnMenu, setShowColumnMenu] = useState(false);

  const toggleColumn = (key: ColumnKey) => {
    setVisibleColumns(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        if (next.size > 3) next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <SmartLoader message="Running screener query..." rotateIntervalMs={0} />
      </div>
    );
  }

  if (stocks.length === 0) {
    return <div className="flex items-center justify-center h-64 text-indalpha-muted">No stocks matched your criteria.</div>;
  }

  const handleRowClick = (stock: StockData) => {
    if (onSelectStock) {
      const symbol = stock.ticker.includes('.') ? stock.ticker : `${stock.ticker}.NS`;
      let exchange = 'NSE';
      if (symbol.endsWith('.HK')) exchange = 'HKEX';
      else if (symbol.endsWith('.SS')) exchange = 'SSE';
      else if (symbol.endsWith('.SZ')) exchange = 'SZSE';
      else if (symbol.endsWith('.BO')) exchange = 'BSE';
      else if (stock.country === 'USA') exchange = 'NASDAQ/NYSE';
      
      onSelectStock({
        symbol,
        name: stock.company_name,
        exchange,
      });
    }
  };

  return (
    <div className="bg-indalpha-card rounded-lg border border-indalpha-border flex flex-col h-full relative overflow-hidden">
      
      {/* Table Toolbar */}
      <div className="flex justify-end p-2 border-b border-indalpha-border bg-indalpha-card/50">
        <div className="relative">
          <button 
            onClick={() => setShowColumnMenu(!showColumnMenu)}
            className="flex items-center gap-2 px-3 py-1.5 bg-indalpha-card hover:bg-gray-700 text-indalpha-text text-xs rounded transition-colors border border-indalpha-border hover:border-indalpha-border"
          >
            <Settings2 size={14} />
            Columns
          </button>
          
          {showColumnMenu && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-indalpha-card border border-indalpha-border rounded-lg shadow-2xl z-50 py-2">
              <div className="px-3 pb-2 mb-2 border-b border-indalpha-border text-[10px] text-indalpha-green font-bold uppercase tracking-wider">Toggle Columns</div>
              <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                {ALL_COLUMNS.map(col => (
                  <label 
                    key={col.key} 
                    className="flex items-center px-3 py-2 hover:bg-white/5 cursor-pointer transition-colors group"
                    onClick={(e) => {
                      e.preventDefault();
                      toggleColumn(col.key);
                    }}
                  >
                    <div className={`w-4 h-4 rounded border flex items-center justify-center mr-3 ${visibleColumns.has(col.key) ? 'bg-indalpha-green border-indalpha-green text-black' : 'border-indalpha-border group-hover:border-gray-400'}`}>
                      {visibleColumns.has(col.key) && <Check size={12} strokeWidth={4} />}
                    </div>
                    <span className={`text-sm ${visibleColumns.has(col.key) ? 'text-indalpha-text font-medium' : 'text-indalpha-muted group-hover:text-indalpha-text'}`}>{col.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="overflow-x-auto flex-1 custom-scrollbar">
        <table className="min-w-full text-left text-sm text-indalpha-text whitespace-nowrap">
          <thead className="bg-indalpha-card border-b border-indalpha-border text-xs uppercase text-indalpha-muted sticky top-0 z-10">
            <tr>
              {ALL_COLUMNS.map(col => visibleColumns.has(col.key) && (
                <th 
                  key={col.key} 
                  className={`px-6 py-4 font-semibold select-none ${col.key === 'rank' ? '' : 'cursor-pointer hover:text-indalpha-green transition-colors'} ${col.key === 'alpha' ? 'text-center' : ''}`}
                  onClick={() => {
                    if (col.key === 'rank' || !onSort) return;
                    if (sortBy === col.key) {
                      onSort(col.key, sortOrder === 'desc' ? 'asc' : 'desc');
                    } else {
                      onSort(col.key, 'desc'); // default new sort to desc
                    }
                  }}
                >
                  <div className={`flex items-center gap-1 ${col.key === 'alpha' ? 'justify-center' : ''}`}>
                    {col.label}
                    {sortBy === col.key && (
                      <span className="text-indalpha-green">
                        {sortOrder === 'desc' ? '↓' : '↑'}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {stocks.map((stock, idx) => (
              <tr
                key={stock.ticker}
                className="hover:bg-indalpha-card/50 transition-colors cursor-pointer group"
                onClick={() => handleRowClick(stock)}
              >
                {visibleColumns.has('rank') && <td className="px-6 py-4 text-indalpha-muted font-mono">{String(idx + 1).padStart(2, '0')}</td>}
                {visibleColumns.has('ticker') && (
                  <td className="px-6 py-4">
                    <div className="font-bold text-indalpha-text group-hover:text-indalpha-green transition-colors">{stock.ticker}</div>
                    <div className="text-xs text-indalpha-muted truncate w-32 md:w-48">{stock.company_name}</div>
                    {stock.last_updated_date && stock.last_updated_date !== new Date().toISOString().split('T')[0] && (
                      <div className="text-[10px] text-yellow-500/80 mt-1 italic font-medium tracking-wide">
                        ⚠️ Data from: {stock.last_updated_date}
                      </div>
                    )}
                  </td>
                )}
                {visibleColumns.has('ltp') && (
                  <td className="px-6 py-4 text-indalpha-text font-mono font-medium">
                    {formatCurrency(stock.ltp, stock.currency, 2, 2)}
                  </td>
                )}
                {visibleColumns.has('change_pct') && (
                  <td className="px-6 py-4 font-semibold">
                    {stock.change_pct !== undefined && (
                      <span className={`${stock.change_pct >= 0 ? 'text-indalpha-green' : 'text-indalpha-red'}`}>
                        {stock.change_pct >= 0 ? '+' : ''}{stock.change_pct.toFixed(2)}%
                      </span>
                    )}
                  </td>
                )}
                {visibleColumns.has('mcap') && (
                  <td className="px-6 py-4 text-indalpha-text font-mono">
                    {stock.market_cap > 0 ? `${formatCurrency(stock.market_cap, stock.currency, 0, 0)} ${stock.country === 'India' ? 'Cr' : 'M'}` : <span className="text-gray-600 italic">N/A</span>}
                  </td>
                )}
                {visibleColumns.has('alpha') && (
                  <td className="px-6 py-4">
                    <AlphaGauge score={stock.alpha_score} />
                  </td>
                )}
                {visibleColumns.has('roce') && (
                  <td className="px-6 py-4">
                    <div className="text-indalpha-text">{stock.roce}% ROCE</div>
                    <div className="text-xs text-indalpha-green">{stock.roe}% ROE</div>
                  </td>
                )}
                {visibleColumns.has('pe') && <td className="px-6 py-4 text-indalpha-text font-mono">{stock.pe_ratio > 0 ? stock.pe_ratio.toFixed(2) : '-'}</td>}
                {visibleColumns.has('pb') && <td className="px-6 py-4 text-indalpha-text font-mono">{stock.pb_ratio > 0 ? stock.pb_ratio.toFixed(2) : '-'}</td>}
                {visibleColumns.has('eps') && <td className="px-6 py-4 text-indalpha-text font-mono">{stock.eps > 0 ? formatCurrency(stock.eps, stock.currency, 2, 2) : '-'}</td>}
                {visibleColumns.has('div') && <td className="px-6 py-4 text-indalpha-text font-mono">{stock.dividend_yield > 0 ? `${stock.dividend_yield.toFixed(2)}%` : '-'}</td>}
                {visibleColumns.has('de') && <td className="px-6 py-4 text-indalpha-text font-mono">{stock.debt_to_equity.toFixed(2)}</td>}
                {visibleColumns.has('ph') && <td className="px-6 py-4 text-indalpha-text font-mono">{stock.promoter_holding.toFixed(2)}%</td>}
                
                {visibleColumns.has('delivery') && (
                  <td className="px-6 py-4">
                    <div className="w-16 bg-gray-700 rounded-full h-1.5 mt-2">
                      <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${stock.delivery_volume}%` }}></div>
                    </div>
                    <div className="text-xs text-indalpha-muted mt-1">{stock.delivery_volume}%</div>
                  </td>
                )}
                
                {visibleColumns.has('bv') && <td className="px-6 py-4 text-indalpha-text font-mono">{stock.book_value > 0 ? formatCurrency(stock.book_value, stock.currency, 2, 2) : '-'}</td>}
                
                {visibleColumns.has('tag') && (
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${stock.pledged_promoter > 0 ? 'bg-red-900/50 text-red-400' : 'bg-green-900/50 text-green-400'}`}>
                      {stock.pledged_promoter > 0 ? 'ASM-1' : 'Clean'}
                    </span>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {showColumnMenu && (
        <div className="fixed inset-0 z-40" onClick={() => setShowColumnMenu(false)} />
      )}
    </div>
  );
};
