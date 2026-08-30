from pydantic import BaseModel
from typing import Optional, List

class FundamentalsBase(BaseModel):
    roce: float
    roe: float
    pe_ratio: float
    debt_to_equity: float
    promoter_holding: float
    pledged_promoter: float
    eps: float
    dividend_yield: float
    pb_ratio: float
    book_value: float
    last_updated_date: Optional[str] = None

    class Config:
        from_attributes = True

class TechnicalsBase(BaseModel):
    rsi_14: float
    ema_50: float
    ema_200: float
    delivery_volume: float
    supertrend_bullish: bool

    class Config:
        from_attributes = True

class InstitutionalBase(BaseModel):
    q1_fii: float
    q2_fii: float
    q3_fii: float
    q4_fii: float
    q3_dii: float
    q3_mf: float

    class Config:
        from_attributes = True

class StockBase(BaseModel):
    ticker: str
    company_name: str
    sector: str
    ltp: float
    market_cap: float
    last_updated_date: Optional[str] = None

    class Config:
        from_attributes = True

class StockDetail(StockBase):
    fundamentals: Optional[FundamentalsBase] = None
    technicals: Optional[TechnicalsBase] = None
    institutional: Optional[InstitutionalBase] = None

class StockListResponse(StockBase):
    alpha_score: float
    change_pct: float = 0.0
    roce: float = 0.0
    roe: float = 0.0
    pe_ratio: float = 0.0
    debt_to_equity: float = 0.0
    promoter_holding: float = 0.0
    pledged_promoter: float = 0.0
    delivery_volume: float = 0.0
    eps: float = 0.0
    dividend_yield: float = 0.0
    pb_ratio: float = 0.0
    book_value: float = 0.0

class ScreenerFilter(BaseModel):
    sector: Optional[str] = None
    search_text: Optional[str] = None
    min_roce: Optional[float] = None
    max_pe: Optional[float] = None
    max_debt_to_equity: Optional[float] = None
    min_promoter_holding: Optional[float] = None
    max_pledged_promoter: Optional[float] = None
    
    price_gt_50_ema: Optional[bool] = None
    price_gt_200_ema: Optional[bool] = None
    min_rsi: Optional[float] = None
    max_rsi: Optional[float] = None
    min_delivery_volume: Optional[float] = None
    supertrend_bullish: Optional[bool] = None

    # Historical Filtering
    performance_date: Optional[str] = None # YYYY-MM-DD
    min_change_pct: Optional[float] = None
    max_change_pct: Optional[float] = None

class WatchlistItemBase(BaseModel):
    symbol: str
    name: str
    exchange: str

class WatchlistItemCreate(WatchlistItemBase):
    pass

class WatchlistItemResponse(WatchlistItemBase):
    id: int
    watchlist_id: int
    ltp: Optional[float] = None
    change_pct: Optional[float] = None

    class Config:
        from_attributes = True

class WatchlistBase(BaseModel):
    name: str

class WatchlistCreate(WatchlistBase):
    pass

class WatchlistResponse(WatchlistBase):
    id: int
    items: List[WatchlistItemResponse] = []

    class Config:
        from_attributes = True
