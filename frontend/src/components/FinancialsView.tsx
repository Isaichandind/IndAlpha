import React, { useState, useEffect } from 'react';
import type { DeepFinancialsResponse, FinancialStatement } from '../types';
import api from '../api';
import { SmartLoader } from './SmartLoader';

interface Props {
  symbol: string;
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
    <div className="bg-indalpha-card rounded-xl p-6 border border-indalpha-border mb-8 shadow-xl">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold text-indalpha-text">{title}</h2>
        <span className="text-xs text-indalpha-muted">Consolidated Figures in Rs. Crores</span>
      </div>
      
      <div className="overflow-x-auto custom-scrollbar pb-4">
        <table className="w-full text-sm text-right">
          <thead>
            <tr className="border-b border-indalpha-border text-indalpha-muted">
              <th className="text-left py-3 px-4 font-medium sticky left-0 bg-indalpha-card z-10 w-48">Metric</th>
              {statements.map((stmt, idx) => (
                <th key={idx} className="py-3 px-4 font-semibold whitespace-nowrap min-w-[90px]">{stmt.date}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#2d3748]">
            <tr className="hover:bg-indalpha-card transition-colors group">
              <td className="text-left py-3 px-4 text-indalpha-text font-medium sticky left-0 bg-indalpha-card group-hover:bg-indalpha-card z-10">Sales</td>
              {statements.map((stmt, idx) => <td key={idx} className="py-3 px-4">{formatVal(stmt.sales)}</td>)}
            </tr>
            <tr className="hover:bg-indalpha-card transition-colors group">
              <td className="text-left py-3 px-4 text-indalpha-text font-medium sticky left-0 bg-indalpha-card group-hover:bg-indalpha-card z-10">Expenses</td>
              {statements.map((stmt, idx) => <td key={idx} className="py-3 px-4">{formatVal(stmt.expenses)}</td>)}
            </tr>
            <tr className="hover:bg-indalpha-card transition-colors group font-semibold text-indalpha-text bg-indalpha-card/30">
              <td className="text-left py-3 px-4 sticky left-0 bg-indalpha-card group-hover:bg-indalpha-card z-10">Operating Profit</td>
              {statements.map((stmt, idx) => <td key={idx} className="py-3 px-4">{formatVal(stmt.operating_profit)}</td>)}
            </tr>
            <tr className="hover:bg-indalpha-card transition-colors group text-indalpha-muted text-xs">
              <td className="text-left py-2 px-4 sticky left-0 bg-indalpha-card group-hover:bg-indalpha-card z-10">OPM %</td>
              {statements.map((stmt, idx) => <td key={idx} className="py-2 px-4">{stmt.opm_pct.toFixed(0)}%</td>)}
            </tr>
            <tr className="hover:bg-indalpha-card transition-colors group">
              <td className="text-left py-3 px-4 text-indalpha-text font-medium sticky left-0 bg-indalpha-card group-hover:bg-indalpha-card z-10">Other Income</td>
              {statements.map((stmt, idx) => <td key={idx} className="py-3 px-4">{formatVal(stmt.other_income)}</td>)}
            </tr>
            <tr className="hover:bg-indalpha-card transition-colors group">
              <td className="text-left py-3 px-4 text-indalpha-text font-medium sticky left-0 bg-indalpha-card group-hover:bg-indalpha-card z-10">Interest</td>
              {statements.map((stmt, idx) => <td key={idx} className="py-3 px-4">{formatVal(stmt.interest)}</td>)}
            </tr>
            <tr className="hover:bg-indalpha-card transition-colors group">
              <td className="text-left py-3 px-4 text-indalpha-text font-medium sticky left-0 bg-indalpha-card group-hover:bg-indalpha-card z-10">Depreciation</td>
              {statements.map((stmt, idx) => <td key={idx} className="py-3 px-4">{formatVal(stmt.depreciation)}</td>)}
            </tr>
            <tr className="hover:bg-indalpha-card transition-colors group font-semibold text-indalpha-text bg-indalpha-card/30">
              <td className="text-left py-3 px-4 sticky left-0 bg-indalpha-card group-hover:bg-indalpha-card z-10">Profit before tax</td>
              {statements.map((stmt, idx) => <td key={idx} className="py-3 px-4">{formatVal(stmt.profit_before_tax)}</td>)}
            </tr>
            <tr className="hover:bg-indalpha-card transition-colors group text-indalpha-muted text-xs">
              <td className="text-left py-2 px-4 sticky left-0 bg-indalpha-card group-hover:bg-indalpha-card z-10">Tax %</td>
              {statements.map((stmt, idx) => <td key={idx} className="py-2 px-4">{stmt.tax_pct.toFixed(0)}%</td>)}
            </tr>
            <tr className="hover:bg-indalpha-card transition-colors group font-bold text-emerald-400 bg-emerald-900/10">
              <td className="text-left py-3 px-4 sticky left-0 bg-indalpha-card group-hover:bg-emerald-900/20 z-10 border-t border-emerald-900/30">Net Profit</td>
              {statements.map((stmt, idx) => <td key={idx} className="py-3 px-4 border-t border-emerald-900/30">{formatVal(stmt.net_profit)}</td>)}
            </tr>
            <tr className="hover:bg-indalpha-card transition-colors group text-indigo-300 font-medium">
              <td className="text-left py-4 px-4 sticky left-0 bg-indalpha-card group-hover:bg-indalpha-card z-10 border-t border-indalpha-border">EPS in Rs</td>
              {statements.map((stmt, idx) => <td key={idx} className="py-4 px-4 border-t border-indalpha-border">{stmt.eps.toFixed(2)}</td>)}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

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
      <div className="flex justify-center items-center h-64 text-indalpha-muted">
        <SmartLoader message="Fetching comprehensive financials..." rotateIntervalMs={0} />
      </div>
    );
  }

  if (error || !data) {
    return <div className="p-8 text-center text-red-400">{error}</div>;
  }

  return (
    <div className="mt-4 pb-12 fade-in">
      <FinancialTable title="Quarterly Results" data={data.quarterly} />
      <FinancialTable title="Profit & Loss" data={data.annual} />
      
      {(!data.quarterly?.length && !data.annual?.length) && (
        <div className="text-center p-8 text-indalpha-muted bg-indalpha-card rounded-xl border border-indalpha-border">
          Detailed financial history is not available for this stock.
        </div>
      )}
    </div>
  );
};
