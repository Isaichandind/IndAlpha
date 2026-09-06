export interface IndexData {
  name: string;
  value: number;
  change: number;
}

export interface StockData {
  ticker: string;
  company_name: string;
  sector: string;
  ltp: number;
  market_cap: number;
  last_updated_date?: string;
  country?: string;
  asset_type?: string;
  currency?: string;
  alpha_score: number;
  roce: number;
  roe: number;
  pledged_promoter: number;
  delivery_volume: number;
  change_pct?: number;
  pe_ratio: number;
  debt_to_equity: number;
  promoter_holding: number;
  eps: number;
  dividend_yield: number;
  pb_ratio: number;
  book_value: number;
}

export interface ScreenerFilters {
  sector?: string;
  search_text?: string;
  min_roce?: number;
  max_pe?: number;
  max_debt_to_equity?: number;
  min_promoter_holding?: number;
  max_pledged_promoter?: number;
  price_gt_50_ema?: boolean;
  price_gt_200_ema?: boolean;
  min_rsi?: number;
  max_rsi?: number;
  min_delivery_volume?: number;
  supertrend_bullish?: boolean;
  performance_date?: string;
  min_change_pct?: number;
  max_change_pct?: number;
  market_cap_category?: string;
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  alpha_fundamental_weight?: number;
  country?: string;
}

export interface PaginatedStockResponse {
  total_count: number;
  total_pages: number;
  current_page: number;
  data: StockData[];
}

export interface WatchlistItem {
  id: number;
  watchlist_id: number;
  symbol: string;
  name: string;
  exchange: string;
  ltp?: number;
  change_pct?: number;
}

export interface Watchlist {
  id: number;
  name: string;
  items: WatchlistItem[];
}

// --- Phase 1 New Types ---

export interface CandleData {
  time: string | number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface StockQuote {
  symbol: string;
  ltp: number;
  change: number;
  change_pct: number;
  prev_close: number;
  day_high: number;
  day_low: number;
  year_high: number;
  year_low: number;
  market_cap: number;
  currency?: string;
}

export interface SelectedStock {
  symbol: string;
  name: string;
  exchange: string;
  type?: string;
}

export interface MoverStock {
  symbol: string;
  name: string;
  ltp: number;
  change_pct: number;
}

export interface MarketMoversData {
  gainers: MoverStock[];
  losers: MoverStock[];
}

export interface FullStockProfile {
  ticker: string;
  company_name: string;
  sector: string;
  ltp: number;
  market_cap: number;
  last_updated_date?: string;
  country?: string;
  asset_type?: string;
  currency?: string;
  fundamentals: {
    roce: number;
    roe: number;
    pe_ratio: number;
    debt_to_equity: number;
    promoter_holding: number;
    pledged_promoter: number;
    eps: number;
    dividend_yield: number;
    pb_ratio: number;
    book_value: number;
  };
  technicals: {
    rsi_14: number;
    ema_50: number;
    ema_200: number;
    delivery_volume: number;
    supertrend_bullish: boolean;
  };
  institutional: {
    q1_fii: number;
    q2_fii: number;
    q3_fii: number;
    q4_fii: number;
    q3_dii: number;
    q3_mf: number;
  };
}

export interface FinancialStatement {
  date: string;
  timestamp: number;
  sales: number;
  expenses: number;
  operating_profit: number;
  opm_pct: number;
  other_income: number;
  interest: number;
  depreciation: number;
  profit_before_tax: number;
  tax_pct: number;
  net_profit: number;
  eps: number;
}

export interface DeepFinancialsResponse {
  annual: FinancialStatement[];
  quarterly: FinancialStatement[];
}

export interface InsiderRosterEntry {
  name: string;
  position: string;
  shares: number;
  pct: number;
  latest_transaction: string;
  date: string;
}

export interface CompanyAbout {
  symbol: string;
  name: string;
  sector: string;
  industry: string;
  website: string;
  summary: string;
  employees: number;
  address: string;
}

export interface HoldingsResponse {
  summary: {
    promoters_pct: number;
    institutions_pct: number;
    public_pct: number;
    shares_outstanding: number;
    float_shares: number;
  };
  roster: InsiderRosterEntry[];
}

export interface FundamentalScores {
  composite_score: number;
  profitability_score: number;
  solvency_score: number;
  growth_pipeline_score: number;
  business_moat_score: number;
  governance_score: number;
  technical_timing_score: number;
}

export interface KeyMetricsSummary {
  pe_vs_industry: string;
  pb_ratio: number;
  roe_pct: number;
  roce_pct: number;
  ebitda_margin_pct: number;
  debt_to_equity: number;
  sales_cagr_3y_pct: number;
  pat_cagr_3y_pct: number;
  order_book_cr: number;
  promoter_holding_pct: number;
  promoter_pledge_pct: number;
  institutional_holding_pct: number;
}

export interface OperationalMoatAnalysis {
  integration_structure: string;
  technology_advantages: string;
  raw_material_risk: "LOW" | "MEDIUM" | "HIGH";
  policy_dependency_risk: "LOW" | "MEDIUM" | "HIGH";
  esg_standing: string;
}

export interface TechnicalTimingAnalysis {
  dma_status: "GOLDEN_CROSS" | "DEATH_CROSS" | "CONSOLIDATION";
  rsi_14_status: "OVERSOLD_ACCUMULATION" | "NEUTRAL" | "OVERBOUGHT";
  recommended_entry_strategy: string;
}

export interface FundamentalAnalysisResponse {
  ticker: string;
  company_name: string;
  sector: string;
  scores: FundamentalScores;
  verdict: "STRONG_CONVICTION_BUY" | "QUALITY_ACCUMULATE_ON_DIPS" | "WATCHLIST_NEUTRAL" | "AVOID_OR_EXIT";
  hard_veto_triggered: boolean;
  key_metrics_summary: KeyMetricsSummary;
  operational_moat_analysis: OperationalMoatAnalysis;
  technical_timing_analysis: TechnicalTimingAnalysis;
  pros: string[];
  cons_and_risks: string[];
  final_rationale: string;
}

export interface SectorBenchmarks {
  sector: string;
  avg_pe: number;
  avg_roce: number;
  avg_roe: number;
  avg_de: number;
}

