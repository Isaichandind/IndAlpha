import { useState, useEffect } from 'react';
import axios from '../api';
import { X, TrendingUp, TrendingDown, BarChart3, FileText, PieChart as PieChartIcon, BrainCircuit } from 'lucide-react';
import { StockChart } from './StockChart';
import { FinancialsView } from './FinancialsView';
import { HoldingsView } from './HoldingsView';
import { FundamentalAnalysis } from './FundamentalAnalysis';
import type { CandleData, StockQuote, SelectedStock, FullStockProfile } from '../types';

interface StockDetailPanelProps {
  stock: SelectedStock | null;
  onClose: () => void;
}

const PERIODS = [
  { label: '1D', value: '1d', interval: '5m' },
  { label: '1W', value: '5d', interval: '15m' },
  { label: '1M', value: '1mo', interval: '1d' },
  { label: '3M', value: '3mo', interval: '1d' },
  { label: '6M', value: '6mo', interval: '1d' },
  { label: '1Y', value: '1y', interval: '1wk' },
  { label: '5Y', value: '5y', interval: '1mo' },
  { label: 'MAX', value: 'max', interval: '1mo' },
];

export function StockDetailPanel({ stock, onClose }: StockDetailPanelProps) {
  const [activeTab, setActiveTab] = useState<'chart' | 'fundamentals' | 'financials' | 'holdings' | 'fundamental_ai'>('chart');
  const [activePeriod, setActivePeriod] = useState(PERIODS[4]); // 6M default
  const [candles, setCandles] = useState<CandleData[]>([]);
  const [quote, setQuote] = useState<StockQuote | null>(null);
  const [profile, setProfile] = useState<FullStockProfile | null>(null);
  const [chartLoading, setChartLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);



  useEffect(() => {
    if (!stock) return;

    let isMounted = true;
    
    // Clear previous stock's data
    setQuote(null);
    setProfile(null);
    
    const fetchQuote = async () => {
      try {
        const res = await axios.get(`/stock/${stock.symbol}/quote`);
        if (isMounted) setQuote(res.data);
      } catch (err) {
        console.error(err);
      }
    };

    const fetchProfile = async () => {
      setProfileLoading(true);
      try {
        const res = await axios.get(`/stock/${stock.symbol}`);
        if (isMounted) setProfile(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        if (isMounted) setProfileLoading(false);
      }
    };

    fetchQuote();
    fetchProfile();

    return () => {
      isMounted = false;
    };
  }, [stock]);

  useEffect(() => {
    if (!stock) return;
    
    let isMounted = true;
    setCandles([]);
    setChartLoading(true);

    const fetchChart = async () => {
      try {
        const res = await axios.get(`/stock/${stock.symbol}/chart`, {
          params: { period: activePeriod.value, interval: activePeriod.interval }
        });
        if (isMounted) setCandles(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        if (isMounted) setChartLoading(false);
      }
    };

    fetchChart();

    return () => {
      isMounted = false;
    };
  }, [stock, activePeriod]);

  if (!stock) return null;

  const isPositive = (quote?.change_pct ?? 0) >= 0;

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      
      {/* Panel */}
      <div className="relative w-full sm:w-[650px] h-full bg-indalpha-dark border-l border-indalpha-border flex flex-col animate-slide-in-right overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-4 border-b border-indalpha-border flex items-center justify-between shrink-0 bg-indalpha-dark">
          <div className="flex items-center gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-indalpha-text tracking-tight">{stock.symbol.split('.')[0]}</h2>
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold border ${
                  stock.exchange === 'NSE' 
                    ? 'bg-blue-900/30 text-blue-400 border-blue-800/50' 
                    : 'bg-orange-900/30 text-orange-400 border-orange-800/50'
                }`}>{stock.exchange}</span>
                {profile && (
                  <span className="text-[10px] px-2 py-0.5 rounded font-medium border bg-indalpha-card text-indalpha-text border-indalpha-border">
                    {profile.sector}
                  </span>
                )}
              </div>
              <p className="text-xs text-indalpha-muted mt-1">{stock.name}</p>
            </div>
          </div>
          
          {quote && (
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-xl font-bold text-indalpha-text font-mono">
                  ₹{quote.ltp.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
                <div className={`text-sm font-mono flex items-center justify-end gap-1 ${isPositive ? 'text-indalpha-green' : 'text-indalpha-red'}`}>
                  {isPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                  {isPositive ? '+' : ''}{quote.change.toFixed(2)} ({quote.change_pct.toFixed(2)}%)
                </div>
              </div>
            </div>
          )}
          
          <button onClick={onClose} className="text-indalpha-muted hover:text-indalpha-text transition-colors p-1 rounded hover:bg-indalpha-card ml-4">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-indalpha-border shrink-0 bg-indalpha-dark px-2 overflow-x-auto custom-scrollbar">
          {[
            { key: 'chart' as const, label: 'Chart & Price Action', icon: BarChart3 },
            { key: 'fundamentals' as const, label: 'Fundamentals & Tech', icon: FileText },
            { key: 'financials' as const, label: 'Financials (P&L)', icon: FileText },
            { key: 'holdings' as const, label: 'Holdings Pattern', icon: PieChartIcon },
            { key: 'fundamental_ai' as const, label: 'AI Engine (Level 2)', icon: BrainCircuit },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${
                activeTab === tab.key 
                  ? 'text-indalpha-green border-indalpha-green bg-indalpha-green/5' 
                  : 'text-indalpha-muted border-transparent hover:text-indalpha-text hover:bg-white/5'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar bg-indalpha-dark">
          {activeTab === 'chart' && (
            <div className="p-4 space-y-4">
              {/* Period selector */}
              <div className="flex gap-1 mb-2">
                {PERIODS.map(p => (
                  <button
                    key={p.label}
                    onClick={() => setActivePeriod(p)}
                    className={`px-3 py-1.5 text-xs rounded font-bold transition-colors ${
                      activePeriod.label === p.label
                        ? 'bg-indalpha-green text-black'
                        : 'text-indalpha-muted hover:text-indalpha-text bg-indalpha-card/50 hover:bg-gray-700'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {/* Chart */}
              <div className="rounded-xl overflow-hidden border border-indalpha-border shadow-lg">
                <StockChart candles={candles} loading={chartLoading} symbol={stock.symbol} />
              </div>

              {/* Quote stats */}
              {quote && (
                <div className="grid grid-cols-3 gap-3 pt-2">
                  <StatCard label="Prev Close" value={quote.prev_close !== undefined && quote.prev_close !== null ? `₹${quote.prev_close.toLocaleString('en-IN')}` : 'N/A'} />
                  <StatCard label="Day Range" value={quote.day_low && quote.day_high ? `₹${quote.day_low} — ₹${quote.day_high}` : 'N/A'} />
                  <StatCard label="Market Cap" value={quote.market_cap > 0 ? `₹${(quote.market_cap / 10000000).toLocaleString('en-IN', {maximumFractionDigits: 0})} Cr` : 'N/A'} />
                  <StatCard label="52W High" value={quote.year_high ? `₹${quote.year_high.toLocaleString('en-IN')}` : 'N/A'} highlight="green" />
                  <StatCard label="52W Low" value={quote.year_low ? `₹${quote.year_low.toLocaleString('en-IN')}` : 'N/A'} highlight="red" />
                  <StatCard label="Exchange" value={stock.exchange} />
                </div>
              )}
            </div>
          )}

          {activeTab === 'fundamentals' && (
            <div className="p-6">
              {profileLoading || !profile ? (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indalpha-green"></div>
                </div>
              ) : (
                <div className="space-y-8">
                  {/* Key Metrics */}
                  <section>
                    <h3 className="text-sm font-bold text-indalpha-text uppercase tracking-wider mb-4 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-indalpha-blue" />
                      Key Fundamentals
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      {(() => {
                        const fund = profile.fundamentals || {} as any;
                        return (
                          <>
                            <MetricCard 
                              title="P/E Ratio" 
                              value={fund.pe_ratio > 0 ? fund.pe_ratio.toFixed(2) : 'N/A'} 
                              subtitle="Price to Earnings"
                              good={fund.pe_ratio > 0 && fund.pe_ratio < 30}
                            />
                            <MetricCard 
                              title="ROCE" 
                              value={fund.roce !== undefined ? `${fund.roce.toFixed(2)}%` : 'N/A'} 
                              subtitle="Return on Capital Emp"
                              good={fund.roce > 15}
                            />
                            <MetricCard 
                              title="ROE" 
                              value={fund.roe !== undefined ? `${fund.roe.toFixed(2)}%` : 'N/A'} 
                              subtitle="Return on Equity"
                              good={fund.roe > 15}
                            />
                            <MetricCard 
                              title="Debt to Equity" 
                              value={fund.debt_to_equity !== undefined ? fund.debt_to_equity.toFixed(2) : 'N/A'} 
                              subtitle="Leverage Ratio"
                              good={fund.debt_to_equity !== undefined && fund.debt_to_equity < 1}
                            />
                            <MetricCard 
                              title="EPS" 
                              value={fund.eps !== undefined ? `₹${fund.eps.toFixed(2)}` : 'N/A'} 
                              subtitle="Earnings per Share"
                              good={fund.eps > 0}
                            />
                            <MetricCard 
                              title="Div Yield" 
                              value={fund.dividend_yield > 0 ? `${fund.dividend_yield.toFixed(2)}%` : '-'} 
                              subtitle="Dividend Yield"
                              good={fund.dividend_yield > 1}
                            />
                            <MetricCard 
                              title="Book Value" 
                              value={fund.book_value > 0 ? `₹${fund.book_value.toFixed(2)}` : '-'} 
                              subtitle="Book Value"
                            />
                            <MetricCard 
                              title="P/B Ratio" 
                              value={fund.pb_ratio > 0 ? fund.pb_ratio.toFixed(2) : '-'} 
                              subtitle="Price to Book"
                              good={fund.pb_ratio > 0 && fund.pb_ratio < 3}
                            />
                            <MetricCard 
                              title="Market Cap" 
                              value={profile.market_cap > 0 ? `₹${profile.market_cap.toLocaleString('en-IN', {maximumFractionDigits: 0})} Cr` : 'N/A'} 
                              subtitle="Company Size"
                            />
                            <MetricCard 
                              title="Sector" 
                              value={profile.sector || 'N/A'} 
                              subtitle="Industry"
                            />
                          </>
                        );
                      })()}
                    </div>
                  </section>

                  <div className="h-px bg-indalpha-card w-full" />

                  {/* Technicals */}
                  <section>
                    <h3 className="text-sm font-bold text-indalpha-text uppercase tracking-wider mb-4 flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-indalpha-purple" />
                      Technical Indicators (1D)
                    </h3>
                    <div className="bg-indalpha-card rounded-xl p-5 border border-indalpha-border space-y-5 shadow-lg">
                      {(() => {
                        const tech = profile.technicals || {} as any;
                        return (
                          <>
                            {/* RSI Gauge */}
                            <div>
                              <div className="flex justify-between items-end mb-2">
                                <span className="text-xs text-indalpha-muted font-bold tracking-wider uppercase">RSI (14)</span>
                                <span className={`text-lg font-mono font-bold ${
                                  tech.rsi_14 > 70 ? 'text-indalpha-red' : 
                                  tech.rsi_14 < 30 ? 'text-indalpha-green' : 'text-indalpha-text'
                                }`}>{tech.rsi_14 !== undefined ? tech.rsi_14.toFixed(1) : 'N/A'}</span>
                              </div>
                              <div className="h-2 w-full bg-indalpha-card rounded-full overflow-hidden flex">
                                <div className="h-full bg-indalpha-green opacity-80" style={{ width: '30%' }}></div>
                                <div className="h-full bg-gray-600 opacity-50" style={{ width: '40%' }}></div>
                                <div className="h-full bg-indalpha-red opacity-80" style={{ width: '30%' }}></div>
                              </div>
                              <div className="flex justify-between text-[10px] text-indalpha-muted font-bold mt-1 uppercase">
                                <span>Oversold (&lt;30)</span>
                                <span>Neutral</span>
                                <span>Overbought (&gt;70)</span>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4 pt-2">
                              <div className="bg-indalpha-card/50 p-3 rounded-lg border border-indalpha-border">
                                <div className="text-[10px] text-indalpha-muted font-bold uppercase tracking-wider mb-1">50-Day EMA</div>
                                <div className="text-sm font-mono font-bold text-indalpha-text">{tech.ema_50 !== undefined ? `₹${tech.ema_50.toLocaleString('en-IN')}` : 'N/A'}</div>
                              </div>
                              <div className="bg-indalpha-card/50 p-3 rounded-lg border border-indalpha-border">
                                <div className="text-[10px] text-indalpha-muted font-bold uppercase tracking-wider mb-1">200-Day EMA</div>
                                <div className="text-sm font-mono font-bold text-indalpha-text">{tech.ema_200 !== undefined ? `₹${tech.ema_200.toLocaleString('en-IN')}` : 'N/A'}</div>
                              </div>
                            </div>

                            <div className="pt-2">
                               <div className="flex items-center justify-between p-3 bg-indalpha-card/50 rounded-lg border border-indalpha-border">
                                 <span className="text-xs text-indalpha-muted font-bold uppercase tracking-wider">Supertrend Status</span>
                                 {tech.supertrend_bullish ? (
                                   <span className="px-2.5 py-1 bg-green-900/30 text-indalpha-green border border-green-800/50 rounded text-xs font-bold uppercase">Bullish</span>
                                 ) : (
                                   <span className="px-2.5 py-1 bg-red-900/30 text-indalpha-red border border-red-800/50 rounded text-xs font-bold uppercase">Bearish</span>
                                 )}
                               </div>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </section>
                </div>
              )}
            </div>
          )}



          {activeTab === 'financials' && (
            <div className="px-6">
              <FinancialsView symbol={stock.symbol} />
            </div>
          )}

          {activeTab === 'holdings' && (
            <div className="p-6">
              <HoldingsView symbol={stock.symbol} pledged={profile?.fundamentals?.pledged_promoter || 0} />
            </div>
          )}

          {activeTab === 'fundamental_ai' && (
            <div className="p-6">
              <FundamentalAnalysis symbol={stock.symbol} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, highlight }: { label: string; value: string; highlight?: 'green' | 'red' }) {
  return (
    <div className="bg-indalpha-card/60 rounded-xl p-3 border border-indalpha-border/80 shadow-sm transition-all hover:bg-indalpha-card/80 hover:border-indalpha-border">
      <div className="text-[10px] text-indalpha-muted font-bold uppercase tracking-wider mb-1.5">{label}</div>
      <div className={`text-sm font-medium font-mono ${
        highlight === 'green' ? 'text-indalpha-green drop-shadow-[0_0_8px_rgba(16,185,129,0.3)]' : 
        highlight === 'red' ? 'text-indalpha-red drop-shadow-[0_0_8px_rgba(239,68,68,0.3)]' : 
        'text-indalpha-text'
      }`}>{value}</div>
    </div>
  );
}

function MetricCard({ title, value, subtitle, good }: { title: string; value: string; subtitle: string; good?: boolean }) {
  return (
    <div className="bg-indalpha-card rounded-xl p-4 border border-indalpha-border shadow-sm hover:border-indalpha-border transition-colors group">
      <div className="text-xs text-indalpha-muted font-bold uppercase tracking-wider mb-1 group-hover:text-indalpha-text transition-colors">{title}</div>
      <div className={`text-xl font-bold font-mono mb-1 ${
        good === true ? 'text-indalpha-green' : good === false ? 'text-indalpha-text' : 'text-indalpha-text'
      }`}>{value}</div>
      <div className="text-[10px] text-indalpha-muted font-medium">{subtitle}</div>
    </div>
  );
}
