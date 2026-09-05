import React, { useState, useEffect } from 'react';
import api from '../api';
import type { FundamentalAnalysisResponse } from '../types';
import { 
  CheckCircle2, AlertTriangle, XCircle, ChevronRight, 
  BrainCircuit, ShieldAlert, TrendingUp, BarChart3,
  Activity, Scale, Shield, Factory, FileWarning
} from 'lucide-react';
import { SmartLoader } from './SmartLoader';

interface Props {
  symbol: string;
}

export const FundamentalAnalysis: React.FC<Props> = ({ symbol }) => {
  const [data, setData] = useState<FundamentalAnalysisResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnalysis = async () => {
      try {
        setLoading(true);
        setError(null);
        let aiModel = localStorage.getItem('gemini_model') || 'gemini-3.1-pro-preview';
        
        // Auto-upgrade deprecated models to latest to fix 404 NOT_FOUND errors dynamically for all users
        if (aiModel.includes('2.5')) {
          aiModel = 'gemini-3.1-pro-preview';
          localStorage.setItem('gemini_model', aiModel);
        }

        const apiKey = localStorage.getItem('gemini_api_key');

        if (!apiKey) {
          setError("Please configure your Gemini API Key in Settings to run AI Analysis.");
          setLoading(false);
          return;
        }

        const res = await api.get(`/stock/${symbol}/analyze`, {
          headers: {
            'X-Gemini-Model': aiModel,
            'X-Gemini-Api-Key': apiKey
          }
        });
        setData(res.data);
      } catch (err: any) {
        if (err.response?.status === 401) {
          setError("Invalid or missing Gemini API Key. Please update it in Settings.");
        } else {
          setError(err.response?.data?.detail || err.message || "Failed to run analysis");
        }
      } finally {
        setLoading(false);
      }
    };
    
    fetchAnalysis();
  }, [symbol]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <SmartLoader message={`AI Engine Analyzing ${symbol}...`} rotateIntervalMs={4000} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 rounded p-6 m-4 flex flex-col items-center">
        <XCircle className="w-10 h-10 text-red-500 mb-3" />
        <div className="text-red-400 font-medium">{error}</div>
      </div>
    );
  }

  if (!data) return null;

  const getVerdictStyle = (verdict: string) => {
    switch (verdict) {
      case 'STRONG_CONVICTION_BUY': return 'bg-indalpha-green/20 text-indalpha-green border-indalpha-green/40';
      case 'QUALITY_ACCUMULATE_ON_DIPS': return 'bg-blue-500/20 text-blue-400 border-blue-500/40';
      case 'WATCHLIST_NEUTRAL': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40';
      case 'AVOID_OR_EXIT': return 'bg-red-500/20 text-red-400 border-red-500/40';
      default: return 'bg-indalpha-card text-indalpha-text border-indalpha-border';
    }
  };

  const getVerdictIcon = (verdict: string) => {
    switch (verdict) {
      case 'STRONG_CONVICTION_BUY': return <CheckCircle2 className="w-6 h-6" />;
      case 'QUALITY_ACCUMULATE_ON_DIPS': return <TrendingUp className="w-6 h-6" />;
      case 'WATCHLIST_NEUTRAL': return <Activity className="w-6 h-6" />;
      case 'AVOID_OR_EXIT': return <AlertTriangle className="w-6 h-6" />;
      default: return null;
    }
  };

  const getRiskColor = (risk: string) => {
    if (risk === "LOW") return "text-indalpha-green";
    if (risk === "MEDIUM") return "text-yellow-400";
    if (risk === "HIGH") return "text-red-400";
    return "text-indalpha-muted";
  };

  return (
    <div className="space-y-6 animate-fade-in p-2">
      {/* Header & Verdict */}
      <div className="flex flex-col md:flex-row gap-6 items-start">
        {/* Composite Score Circle */}
        <div className="shrink-0 relative w-32 h-32 flex items-center justify-center rounded-full bg-indalpha-card border-4 border-indalpha-border shadow-[0_0_20px_rgba(0,0,0,0.5)]">
          <svg className="absolute inset-0 w-full h-full transform -rotate-90">
            <circle cx="60" cy="60" r="56" fill="transparent" stroke="currentColor" strokeWidth="8" className="text-gray-800" />
            <circle cx="60" cy="60" r="56" fill="transparent" stroke="currentColor" strokeWidth="8"
              strokeDasharray={2 * Math.PI * 56}
              strokeDashoffset={2 * Math.PI * 56 * (1 - data.scores.composite_score / 100)}
              className={data.scores.composite_score >= 80 ? 'text-indalpha-green' : data.scores.composite_score >= 65 ? 'text-blue-500' : data.scores.composite_score >= 50 ? 'text-yellow-500' : 'text-red-500'}
            />
          </svg>
          <div className="text-center z-10">
            <div className="text-3xl font-bold text-indalpha-text">{Math.round(data.scores.composite_score)}</div>
            <div className="text-[10px] text-indalpha-muted tracking-wider font-semibold">COMPOSITE</div>
          </div>
        </div>

        <div className="flex-1 space-y-4">
          <div>
            <h2 className="text-2xl font-semibold text-indalpha-text flex items-center gap-2">
              {data.company_name} <span className="text-indalpha-muted text-sm font-normal">({data.ticker})</span>
            </h2>
            <div className="text-indalpha-muted text-sm">Sector: {data.sector}</div>
          </div>
          
          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded border ${getVerdictStyle(data.verdict)}`}>
            {getVerdictIcon(data.verdict)}
            <span className="font-bold tracking-wide">{data.verdict.replace(/_/g, ' ')}</span>
          </div>

          {data.hard_veto_triggered && (
            <div className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 rounded bg-red-900/30 border border-red-500/50 text-red-400 text-sm font-medium">
              <ShieldAlert className="w-4 h-4" />
              HARD VETO TRIGGERED - AVOID
            </div>
          )}
        </div>
      </div>

      <p className="text-indalpha-text bg-indalpha-card/50 p-4 rounded-lg border border-indalpha-border/50 leading-relaxed text-sm">
        {data.final_rationale}
      </p>

      {/* 6 Dimension Sub-Scores */}
      <div>
        <h3 className="text-sm font-semibold text-indalpha-muted uppercase tracking-wider mb-4 border-b border-indalpha-border pb-2">6-Dimension Evaluation</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <ScoreCard title="Profitability & Return" score={data.scores.profitability_score} max={20} icon={<BarChart3 />} />
          <ScoreCard title="Solvency & Balance Sheet" score={data.scores.solvency_score} max={15} icon={<Scale />} />
          <ScoreCard title="Growth & Pipeline" score={data.scores.growth_pipeline_score} max={20} icon={<TrendingUp />} />
          <ScoreCard title="Business Moat & Tech" score={data.scores.business_moat_score} max={20} icon={<Factory />} />
          <ScoreCard title="Governance & Anti-Hype" score={data.scores.governance_score} max={15} icon={<Shield />} />
          <ScoreCard title="Technical Timing" score={data.scores.technical_timing_score} max={10} icon={<Activity />} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Key Metrics */}
        <div className="bg-indalpha-card border border-indalpha-border rounded-lg p-5">
          <h3 className="text-sm font-semibold text-indalpha-text mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-indalpha-green" /> Key Quantitative Metrics
          </h3>
          <div className="grid grid-cols-2 gap-y-4 gap-x-2 text-sm">
            <MetricItem label="ROCE" value={`${data.key_metrics_summary.roce_pct}%`} good={data.key_metrics_summary.roce_pct >= 15} />
            <MetricItem label="ROE" value={`${data.key_metrics_summary.roe_pct}%`} good={data.key_metrics_summary.roe_pct >= 15} />
            <MetricItem label="Sales CAGR (3Y)" value={`${data.key_metrics_summary.sales_cagr_3y_pct}%`} good={data.key_metrics_summary.sales_cagr_3y_pct >= 15} />
            <MetricItem label="PAT CAGR (3Y)" value={`${data.key_metrics_summary.pat_cagr_3y_pct}%`} good={data.key_metrics_summary.pat_cagr_3y_pct >= 15} />
            <MetricItem label="Debt to Equity" value={data.key_metrics_summary.debt_to_equity} good={data.key_metrics_summary.debt_to_equity <= 0.5} />
            <MetricItem label="Promoter Pledged" value={`${data.key_metrics_summary.promoter_pledge_pct}%`} bad={data.key_metrics_summary.promoter_pledge_pct > 10} />
            <div className="col-span-2 mt-2 pt-2 border-t border-indalpha-border">
              <div className="text-indalpha-muted text-xs mb-1">PE vs Industry</div>
              <div className="text-indalpha-text">{data.key_metrics_summary.pe_vs_industry}</div>
            </div>
          </div>
        </div>

        {/* Operational Moat */}
        <div className="bg-indalpha-card border border-indalpha-border rounded-lg p-5">
          <h3 className="text-sm font-semibold text-indalpha-text mb-4 flex items-center gap-2">
            <Factory className="w-4 h-4 text-indalpha-green" /> Operational Moat & Risks
          </h3>
          <div className="space-y-4 text-sm">
            <div>
              <div className="text-indalpha-muted text-xs mb-1">Integration Structure</div>
              <div className="text-indalpha-text">{data.operational_moat_analysis.integration_structure}</div>
            </div>
            <div>
              <div className="text-indalpha-muted text-xs mb-1">Technology Advantages</div>
              <div className="text-indalpha-text">{data.operational_moat_analysis.technology_advantages}</div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-indalpha-muted text-xs mb-1">Raw Material Risk</div>
                <div className={`font-medium ${getRiskColor(data.operational_moat_analysis.raw_material_risk)}`}>
                  {data.operational_moat_analysis.raw_material_risk}
                </div>
              </div>
              <div>
                <div className="text-indalpha-muted text-xs mb-1">Policy Risk</div>
                <div className={`font-medium ${getRiskColor(data.operational_moat_analysis.policy_dependency_risk)}`}>
                  {data.operational_moat_analysis.policy_dependency_risk}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Pros */}
        <div className="bg-indalpha-green/5 border border-indalpha-green/20 rounded-lg p-5">
          <h3 className="text-sm font-semibold text-indalpha-green mb-3 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> Strong Convictions (Pros)
          </h3>
          <ul className="space-y-2">
            {data.pros.map((pro, i) => (
              <li key={i} className="text-sm text-indalpha-text flex items-start gap-2">
                <ChevronRight className="w-4 h-4 mt-0.5 text-indalpha-green shrink-0" />
                <span>{pro}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Cons & Risks */}
        <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-5">
          <h3 className="text-sm font-semibold text-red-400 mb-3 flex items-center gap-2">
            <FileWarning className="w-4 h-4" /> Structural Risks (Cons)
          </h3>
          <ul className="space-y-2">
            {data.cons_and_risks.map((con, i) => (
              <li key={i} className="text-sm text-indalpha-text flex items-start gap-2">
                <XCircle className="w-3.5 h-3.5 mt-1 text-red-400 shrink-0" />
                <span>{con}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

const ScoreCard = ({ title, score, max, icon }: { title: string, score: number, max: number, icon: React.ReactNode }) => {
  const percentage = (score / max) * 100;
  let color = "text-indalpha-green bg-indalpha-green";
  if (percentage < 50) color = "text-red-500 bg-red-500";
  else if (percentage < 75) color = "text-yellow-500 bg-yellow-500";

  return (
    <div className="bg-indalpha-dark border border-indalpha-border rounded p-4 flex items-center gap-4">
      <div className={`p-2 rounded bg-indalpha-card/50 ${color.split(' ')[0]}`}>
        {React.isValidElement(icon) ? React.cloneElement(icon, { className: 'w-5 h-5' } as any) : icon}
      </div>
      <div className="flex-1">
        <div className="flex justify-between items-end mb-2">
          <div className="text-xs text-indalpha-muted font-medium">{title}</div>
          <div className="text-sm font-bold text-indalpha-text">{score}<span className="text-indalpha-muted text-xs font-normal">/{max}</span></div>
        </div>
        <div className="h-1.5 w-full bg-indalpha-card rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${color.split(' ')[1]}`} style={{ width: `${percentage}%` }}></div>
        </div>
      </div>
    </div>
  );
};

const MetricItem = ({ label, value, good, bad }: { label: string, value: string | number, good?: boolean, bad?: boolean }) => {
  let colorClass = "text-indalpha-text";
  if (good) colorClass = "text-indalpha-green font-medium";
  if (bad) colorClass = "text-red-500 font-medium";
  
  return (
    <div>
      <div className="text-indalpha-muted text-[11px] mb-0.5">{label}</div>
      <div className={`text-sm ${colorClass}`}>{value}</div>
    </div>
  );
};
