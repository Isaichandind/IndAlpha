import React, { useState, useEffect } from 'react';
import type { DeepFinancialsResponse, FinancialStatement } from '../types';
import api from '../api';

interface Props {
  symbol: string;
}

export const FinancialsView: React.FC<Props> = ({ symbol }) => {
  const [data, setData] = useState<DeepFinancialsResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFinancials = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get<DeepFinancialsResponse>(`/stock/${symbol}/financials`);
        const json = res.data;
        setData(json);
      } catch (err) {
        setError('Data unavailable or rate limited');
      } finally {
        setLoading(false);
      }
    };
    
    fetchFinancials();
  }, [symbol]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64 text-slate-400">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500 mr-3"></div>
        Fetching comprehensive financials...
      </div>
    );
  }

  if (error || !data) {
    return <div className="p-8 text-center text-red-400">{error}</div>;
  }

  const FinancialTable = ({ data: statements, title }: { data: FinancialStatement[], title: string }) => {
    if (!statements || statements.length === 0) {
      return null;
    }

    const formatVal = (val: number) => {
      if (val === 0) return '0';
      return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(val);
    };

    return (
      <div className="bg-[#1c2236] rounded-xl p-6 border border-[#2d3748] mb-8 shadow-xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold text-slate-100">{title}</h2>
          <span className="text-xs text-slate-400">Consolidated Figures in Rs. Crores</span>
        </div>
        
        <div className="overflow-x-auto custom-scrollbar pb-4">
          <table className="w-full text-sm text-right">
            <thead>
              <tr className="border-b border-[#2d3748] text-slate-400">
                <th className="text-left py-3 px-4 font-medium sticky left-0 bg-[#1c2236] z-10 w-48">Metric</th>
                {statements.map((stmt, idx) => (
                  <th key={idx} className="py-3 px-4 font-semibold whitespace-nowrap min-w-[90px]">{stmt.date}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2d3748]">
              <tr className="hover:bg-[#252d43] transition-colors group">
                <td className="text-left py-3 px-4 text-slate-300 font-medium sticky left-0 bg-[#1c2236] group-hover:bg-[#252d43] z-10">Sales</td>
                {statements.map((stmt, idx) => <td key={idx} className="py-3 px-4">{formatVal(stmt.sales)}</td>)}
              </tr>
              <tr className="hover:bg-[#252d43] transition-colors group">
                <td className="text-left py-3 px-4 text-slate-300 font-medium sticky left-0 bg-[#1c2236] group-hover:bg-[#252d43] z-10">Expenses</td>
                {statements.map((stmt, idx) => <td key={idx} className="py-3 px-4">{formatVal(stmt.expenses)}</td>)}
              </tr>
              <tr className="hover:bg-[#252d43] transition-colors group font-semibold text-white bg-[#252d43]/30">
                <td className="text-left py-3 px-4 sticky left-0 bg-[#1c2236] group-hover:bg-[#252d43] z-10">Operating Profit</td>
                {statements.map((stmt, idx) => <td key={idx} className="py-3 px-4">{formatVal(stmt.operating_profit)}</td>)}
              </tr>
              <tr className="hover:bg-[#252d43] transition-colors group text-slate-400 text-xs">
                <td className="text-left py-2 px-4 sticky left-0 bg-[#1c2236] group-hover:bg-[#252d43] z-10">OPM %</td>
                {statements.map((stmt, idx) => <td key={idx} className="py-2 px-4">{stmt.opm_pct.toFixed(0)}%</td>)}
              </tr>
              <tr className="hover:bg-[#252d43] transition-colors group">
                <td className="text-left py-3 px-4 text-slate-300 font-medium sticky left-0 bg-[#1c2236] group-hover:bg-[#252d43] z-10">Other Income</td>
                {statements.map((stmt, idx) => <td key={idx} className="py-3 px-4">{formatVal(stmt.other_income)}</td>)}
              </tr>
              <tr className="hover:bg-[#252d43] transition-colors group">
                <td className="text-left py-3 px-4 text-slate-300 font-medium sticky left-0 bg-[#1c2236] group-hover:bg-[#252d43] z-10">Interest</td>
                {statements.map((stmt, idx) => <td key={idx} className="py-3 px-4">{formatVal(stmt.interest)}</td>)}
              </tr>
              <tr className="hover:bg-[#252d43] transition-colors group">
                <td className="text-left py-3 px-4 text-slate-300 font-medium sticky left-0 bg-[#1c2236] group-hover:bg-[#252d43] z-10">Depreciation</td>
                {statements.map((stmt, idx) => <td key={idx} className="py-3 px-4">{formatVal(stmt.depreciation)}</td>)}
              </tr>
              <tr className="hover:bg-[#252d43] transition-colors group font-semibold text-white bg-[#252d43]/30">
                <td className="text-left py-3 px-4 sticky left-0 bg-[#1c2236] group-hover:bg-[#252d43] z-10">Profit before tax</td>
                {statements.map((stmt, idx) => <td key={idx} className="py-3 px-4">{formatVal(stmt.profit_before_tax)}</td>)}
              </tr>
              <tr className="hover:bg-[#252d43] transition-colors group text-slate-400 text-xs">
                <td className="text-left py-2 px-4 sticky left-0 bg-[#1c2236] group-hover:bg-[#252d43] z-10">Tax %</td>
                {statements.map((stmt, idx) => <td key={idx} className="py-2 px-4">{stmt.tax_pct.toFixed(0)}%</td>)}
              </tr>
              <tr className="hover:bg-[#252d43] transition-colors group font-bold text-emerald-400 bg-emerald-900/10">
                <td className="text-left py-3 px-4 sticky left-0 bg-[#1c2236] group-hover:bg-emerald-900/20 z-10 border-t border-emerald-900/30">Net Profit</td>
                {statements.map((stmt, idx) => <td key={idx} className="py-3 px-4 border-t border-emerald-900/30">{formatVal(stmt.net_profit)}</td>)}
              </tr>
              <tr className="hover:bg-[#252d43] transition-colors group text-indigo-300 font-medium">
                <td className="text-left py-4 px-4 sticky left-0 bg-[#1c2236] group-hover:bg-[#252d43] z-10 border-t border-[#2d3748]">EPS in Rs</td>
                {statements.map((stmt, idx) => <td key={idx} className="py-4 px-4 border-t border-[#2d3748]">{stmt.eps.toFixed(2)}</td>)}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="mt-4 pb-12 fade-in">
      <FinancialTable title="Quarterly Results" data={data.quarterly} />
      <FinancialTable title="Profit & Loss" data={data.annual} />
      
      {(!data.quarterly?.length && !data.annual?.length) && (
        <div className="text-center p-8 text-slate-400 bg-[#1c2236] rounded-xl border border-[#2d3748]">
          Detailed financial history is not available for this stock.
        </div>
      )}
    </div>
  );
};
