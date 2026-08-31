import { useEffect, useState } from 'react';
import type { HoldingsResponse, InsiderRosterEntry } from '../types';
import api from '../api';
import { TrendingDown, X, User, Briefcase, Activity, Calendar } from 'lucide-react';

interface HoldingsViewProps {
  symbol: string;
  pledged: number;
}

export function HoldingsView({ symbol, pledged }: HoldingsViewProps) {
  const [data, setData] = useState<HoldingsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedInsider, setSelectedInsider] = useState<InsiderRosterEntry | null>(null);

  useEffect(() => {
    let active = true;
    const fetchHoldings = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get<HoldingsResponse>(`/stock/${symbol}/holdings`);
        const json = res.data;
        if (active) setData(json);
      } catch (err) {
        if (active) setError('Holdings data unavailable');
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchHoldings();
    return () => { active = false; };
  }, [symbol]);

  if (loading) {
    return (
      <div className="flex flex-col space-y-6 animate-pulse">
        <div className="h-24 bg-indalpha-card rounded-xl border border-indalpha-border"></div>
        <div className="h-64 bg-indalpha-card rounded-xl border border-indalpha-border"></div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 text-center text-red-400 bg-indalpha-card rounded-xl border border-indalpha-border">
        {error || 'Data unavailable'}
      </div>
    );
  }

  const formatNum = (num: number) => {
    if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(2) + 'k';
    return num.toLocaleString();
  };

  const { promoters_pct, institutions_pct, public_pct, shares_outstanding, float_shares } = data.summary;
  
  // Guard against 0 total
  const hasData = promoters_pct > 0 || institutions_pct > 0 || public_pct > 0;

  return (
    <div className="space-y-6">
      
      {/* Visual Breakdown */}
      <div className="bg-indalpha-card p-6 rounded-xl border border-indalpha-border">
        <h3 className="text-[#a0abc0] text-sm font-semibold mb-4 uppercase tracking-wider">Holding Pattern</h3>
        
        {!hasData ? (
          <div className="text-center text-indalpha-muted py-4">No aggregate holding data available.</div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-between text-sm">
              <div className="text-blue-400 font-medium">Promoters: {promoters_pct.toFixed(2)}%</div>
              <div className="text-purple-400 font-medium">Institutions: {institutions_pct.toFixed(2)}%</div>
              <div className="text-emerald-400 font-medium">Public: {public_pct.toFixed(2)}%</div>
            </div>
            
            <div className="h-4 w-full bg-indalpha-dark rounded-full overflow-hidden flex">
              <div style={{ width: `${promoters_pct}%` }} className="bg-blue-500 h-full transition-all duration-1000 ease-out" />
              <div style={{ width: `${institutions_pct}%` }} className="bg-purple-500 h-full transition-all duration-1000 ease-out" />
              <div style={{ width: `${public_pct}%` }} className="bg-emerald-500 h-full transition-all duration-1000 ease-out" />
            </div>
          </div>
        )}
      </div>

      {/* Pledged Alert */}
      {pledged > 0 && (
        <div className="bg-red-900/10 border border-red-900/30 rounded-lg p-4 flex gap-3">
          <div className="mt-0.5">
            <TrendingDown className="w-5 h-5 text-indalpha-red" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-indalpha-red">Pledged Holdings Alert</h4>
            <p className="text-xs text-red-200/70 mt-1">
              {pledged}% of the promoter holdings are pledged. 
              High pledging can be a risk factor during market downturns.
            </p>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-indalpha-card p-4 rounded-xl border border-indalpha-border flex flex-col justify-center items-center text-center">
          <div className="text-indalpha-muted text-xs uppercase mb-1">Shares Outstanding</div>
          <div className="text-lg font-bold text-indalpha-text">{shares_outstanding ? formatNum(shares_outstanding) : 'N/A'}</div>
        </div>
        <div className="bg-indalpha-card p-4 rounded-xl border border-indalpha-border flex flex-col justify-center items-center text-center">
          <div className="text-indalpha-muted text-xs uppercase mb-1">Free Float</div>
          <div className="text-lg font-bold text-indalpha-text">{float_shares ? formatNum(float_shares) : 'N/A'}</div>
        </div>
        <div className="bg-indalpha-card p-4 rounded-xl border border-indalpha-border flex flex-col justify-center items-center text-center">
          <div className="text-indalpha-muted text-xs uppercase mb-1">Promoter Holding</div>
          <div className="text-lg font-bold text-blue-400">{promoters_pct.toFixed(2)}%</div>
        </div>
        <div className="bg-indalpha-card p-4 rounded-xl border border-indalpha-border flex flex-col justify-center items-center text-center">
          <div className="text-indalpha-muted text-xs uppercase mb-1">Institutional</div>
          <div className="text-lg font-bold text-purple-400">{institutions_pct.toFixed(2)}%</div>
        </div>
      </div>

      {/* Insider Roster Table */}
      <div className="bg-indalpha-card rounded-xl border border-indalpha-border overflow-hidden">
        <h3 className="text-[#a0abc0] text-sm font-semibold p-4 border-b border-indalpha-border bg-indalpha-card uppercase tracking-wider">
          Insider Roster (Promoters & Board)
        </h3>
        
        {(!data.roster || data.roster.length === 0) ? (
          <div className="p-8 text-center text-indalpha-muted">
            Detailed insider roster is not available for this stock.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-indalpha-text">
              <thead className="text-xs text-indalpha-muted bg-indalpha-card uppercase border-b border-indalpha-border">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Position</th>
                  <th className="px-4 py-3 font-medium text-right">Shares Held</th>
                  <th className="px-4 py-3 font-medium">Recent Txn</th>
                  <th className="px-4 py-3 font-medium">Reported Date</th>
                </tr>
              </thead>
              <tbody>
                {data.roster.map((insider, i) => (
                  <tr 
                    key={i} 
                    className="border-b border-indalpha-border/50 hover:bg-indalpha-card hover:brightness-110/70 transition-colors cursor-pointer group"
                    onClick={() => setSelectedInsider(insider)}
                  >
                    <td className="px-4 py-3 font-medium text-indalpha-text group-hover:text-indalpha-green transition-colors">{insider.name || 'N/A'}</td>
                    <td className="px-4 py-3 text-emerald-400">{insider.position === 'UNREPORTED' ? 'N/A' : insider.position}</td>
                    <td className="px-4 py-3 text-right font-mono text-indalpha-text">
                      {insider.shares > 0 ? insider.shares.toLocaleString() : '-'}
                      {insider.pct > 0 && <span className="text-xs text-indalpha-muted ml-2">({insider.pct.toFixed(2)}%)</span>}
                    </td>
                    <td className="px-4 py-3">{insider.latest_transaction || '-'}</td>
                    <td className="px-4 py-3 text-indalpha-muted">{insider.date || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Insider Details Modal */}
      {selectedInsider && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedInsider(null)}>
          <div 
            className="bg-indalpha-card rounded-2xl border border-indalpha-border shadow-2xl max-w-md w-full overflow-hidden flex flex-col transform transition-all"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-5 border-b border-indalpha-border bg-indalpha-card">
              <h3 className="font-bold text-indalpha-text flex items-center gap-2">
                <User className="w-5 h-5 text-indalpha-blue" />
                Insider Profile
              </h3>
              <button 
                onClick={() => setSelectedInsider(null)}
                className="text-indalpha-muted hover:text-indalpha-text transition-colors p-1 rounded-lg hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div>
                <div className="text-2xl font-bold text-indalpha-text mb-1">{selectedInsider.name || 'Unknown Entity'}</div>
                <div className="flex items-center gap-2 text-indalpha-green font-medium text-sm">
                  <Briefcase className="w-4 h-4" />
                  {selectedInsider.position === 'UNREPORTED' ? 'General Insider / Board Member' : selectedInsider.position}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-indalpha-dark p-4 rounded-xl border border-indalpha-border/50">
                  <div className="text-xs font-bold text-indalpha-muted uppercase tracking-wider mb-1">Total Shares</div>
                  <div className="text-xl font-mono font-bold text-indalpha-text">
                    {selectedInsider.shares > 0 ? selectedInsider.shares.toLocaleString() : 'N/A'}
                  </div>
                </div>
                <div className="bg-indalpha-dark p-4 rounded-xl border border-indalpha-border/50">
                  <div className="text-xs font-bold text-indalpha-muted uppercase tracking-wider mb-1">Ownership</div>
                  <div className="text-xl font-mono font-bold text-indalpha-blue">
                    {selectedInsider.pct > 0 ? `${selectedInsider.pct.toFixed(3)}%` : '< 0.01%'}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-bold text-indalpha-muted uppercase tracking-wider border-b border-indalpha-border pb-2">Recent Activity</h4>
                <div className="flex items-center justify-between bg-blue-900/10 border border-blue-900/30 p-3 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Activity className={`w-5 h-5 ${selectedInsider.latest_transaction === 'Acquisition' ? 'text-indalpha-green' : selectedInsider.latest_transaction === 'Sale' ? 'text-indalpha-red' : 'text-indalpha-muted'}`} />
                    <div>
                      <div className="text-sm font-bold text-indalpha-text">{selectedInsider.latest_transaction || 'No recent transactions'}</div>
                      <div className="text-xs text-indalpha-muted flex items-center gap-1 mt-0.5">
                        <Calendar className="w-3 h-3" />
                        {selectedInsider.date || 'N/A'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
