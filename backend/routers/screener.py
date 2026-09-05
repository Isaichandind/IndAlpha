from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from database import get_db
import models
import schemas
from services import calculate_alpha_score

router = APIRouter()

# --- Security Helpers ---
def _escape_like(value: str) -> str:
    """Escape SQL LIKE/ILIKE wildcard characters to prevent wildcard injection."""
    return value.replace('%', '\\%').replace('_', '\\_')

import yfinance as yf
import requests
@router.get("/market/indices")
def get_market_indices():
    symbols = {
        "NIFTY 50": "^NSEI",
        "SENSEX": "^BSESN",
        "BANK NIFTY": "^NSEBANK",
        "INDIA VIX": "^INDIAVIX"
    }
    
    response = []
    try:
        tickers = yf.Tickers(" ".join(symbols.values()))
        for name, symbol in symbols.items():
            info = tickers.tickers[symbol].fast_info
            current_price = info.last_price
            prev_close = info.previous_close
            change_pct = ((current_price - prev_close) / prev_close) * 100 if prev_close else 0
            response.append({
                "name": name,
                "value": current_price,
                "change": round(change_pct, 2)
            })
    except Exception as e:
        print(f"Error fetching indices: {e}")
        # Fallback to mock data if yfinance fails
        response = [
            {"name": "NIFTY 50", "value": 23465.60, "change": 0.82},
            {"name": "SENSEX", "value": 77042.82, "change": 0.76},
            {"name": "BANK NIFTY", "value": 50234.15, "change": -0.34},
            {"name": "INDIA VIX", "value": 13.42, "change": -2.10}
        ]
    return response

@router.post("/screener/filter", response_model=List[schemas.StockListResponse])
def filter_stocks(filters: schemas.ScreenerFilter, db: Session = Depends(get_db)):
    query = db.query(models.Stock).join(models.Fundamentals).join(models.Technicals)

    if filters.performance_date:
        query = query.join(models.DailyPerformance).filter(models.DailyPerformance.date == filters.performance_date)
        if filters.min_change_pct is not None:
            query = query.filter(models.DailyPerformance.change_pct >= filters.min_change_pct)
        if filters.max_change_pct is not None:
            query = query.filter(models.DailyPerformance.change_pct <= filters.max_change_pct)


    if filters.sector:
        safe_sector = _escape_like(filters.sector)
        query = query.filter(models.Stock.sector.ilike(f"%{safe_sector}%"))
        
    if filters.market_cap_category:
        if filters.market_cap_category == "Large Cap":
            query = query.filter(models.Stock.market_cap > 20000)
        elif filters.market_cap_category == "Mid Cap":
            query = query.filter(models.Stock.market_cap.between(5000, 20000))
        elif filters.market_cap_category == "Small Cap":
            query = query.filter(models.Stock.market_cap < 5000)
    
    if filters.search_text:
        safe_text = _escape_like(filters.search_text)
        query = query.filter(
            (models.Stock.ticker.ilike(f"%{safe_text}%")) | 
            (models.Stock.company_name.ilike(f"%{safe_text}%")) |
            (models.Stock.sector.ilike(f"%{safe_text}%"))
        )

    if filters.min_roce is not None:
        query = query.filter(models.Fundamentals.roce >= filters.min_roce)
    if filters.max_pe is not None:
        query = query.filter(models.Fundamentals.pe_ratio <= filters.max_pe)
    if filters.max_debt_to_equity is not None:
        query = query.filter(models.Fundamentals.debt_to_equity <= filters.max_debt_to_equity)
    if filters.min_promoter_holding is not None:
        query = query.filter(models.Fundamentals.promoter_holding >= filters.min_promoter_holding)
    if filters.max_pledged_promoter is not None:
        query = query.filter(models.Fundamentals.pledged_promoter <= filters.max_pledged_promoter)

    if filters.price_gt_50_ema:
        query = query.filter(models.Stock.ltp > models.Technicals.ema_50)
    if filters.price_gt_200_ema:
        query = query.filter(models.Stock.ltp > models.Technicals.ema_200)
    
    if filters.min_rsi is not None:
        query = query.filter(models.Technicals.rsi_14 >= filters.min_rsi)
    if filters.max_rsi is not None:
        query = query.filter(models.Technicals.rsi_14 <= filters.max_rsi)
    
    if filters.min_delivery_volume is not None:
        query = query.filter(models.Technicals.delivery_volume >= filters.min_delivery_volume)
    
    if filters.supertrend_bullish is not None:
        query = query.filter(models.Technicals.supertrend_bullish == filters.supertrend_bullish)

    stocks = query.all()

    response = []
    for stock in stocks:
        alpha_score = calculate_alpha_score(stock, stock.fundamentals, stock.technicals)
        response.append(schemas.StockListResponse(
            ticker=stock.ticker,
            company_name=stock.company_name,
            sector=stock.sector,
            ltp=stock.ltp,
            market_cap=stock.market_cap,
            last_updated_date=stock.last_updated_date,
            change_pct=stock.change_pct,
            alpha_score=alpha_score,
            roce=stock.fundamentals.roce if stock.fundamentals else 0.0,
            roe=stock.fundamentals.roe if stock.fundamentals else 0.0,
            pe_ratio=stock.fundamentals.pe_ratio if stock.fundamentals else 0.0,
            debt_to_equity=stock.fundamentals.debt_to_equity if stock.fundamentals else 0.0,
            promoter_holding=stock.fundamentals.promoter_holding if stock.fundamentals else 0.0,
            pledged_promoter=stock.fundamentals.pledged_promoter if stock.fundamentals else 0.0,
            delivery_volume=stock.technicals.delivery_volume if stock.technicals else 0.0,
            eps=stock.fundamentals.eps if stock.fundamentals else 0.0,
            dividend_yield=stock.fundamentals.dividend_yield if stock.fundamentals else 0.0,
            pb_ratio=stock.fundamentals.pb_ratio if stock.fundamentals else 0.0,
            book_value=stock.fundamentals.book_value if stock.fundamentals else 0.0
        ))
        
        # Override ltp and change_pct if filtering by historical date
        if filters.performance_date and hasattr(stock, 'daily_performance'):
            # Find the performance record for this date
            hist_record = next((dp for dp in stock.daily_performance if dp.date == filters.performance_date), None)
            if hist_record:
                response[-1].ltp = hist_record.close_price
                response[-1].change_pct = hist_record.change_pct

    # Sort by change_pct if querying history, otherwise by alpha score
    if filters.performance_date:
        response.sort(key=lambda x: x.change_pct, reverse=True)
    else:
        response.sort(key=lambda x: x.alpha_score, reverse=True)
        
    return response

@router.post("/screener/sync")
def sync_market_data(db: Session = Depends(get_db)):
    stocks = db.query(models.Stock).all()
    if not stocks:
        return {"status": "success", "message": "No stocks to sync"}
        
    # Use stock.ticker directly since seed.py already appends .NS or .BO
    tickers_str = " ".join([stock.ticker for stock in stocks])
    try:
        tickers = yf.Tickers(tickers_str)
        for stock in stocks:
            try:
                yf_ticker = stock.ticker
                info = tickers.tickers[yf_ticker].fast_info
                
                # Update LTP and Market Cap (market cap from yf is in absolute INR, convert to Cr if needed, 
                # but our DB stores it as absolute or Lakh Cr. Let's just store what yfinance gives or keep it consistent)
                stock.ltp = info.last_price
                prev_close = info.previous_close or 0.0
                if prev_close > 0:
                    stock.change_pct = round(((stock.ltp - prev_close) / prev_close) * 100, 2)
                
                
                from datetime import datetime
                today_str = datetime.now().strftime("%Y-%m-%d")
                dp = db.query(models.DailyPerformance).filter(
                    models.DailyPerformance.ticker == stock.ticker,
                    models.DailyPerformance.date == today_str
                ).first()
                if not dp:
                    dp = models.DailyPerformance(
                        ticker=stock.ticker,
                        date=today_str,
                        close_price=stock.ltp,
                        change_pct=stock.change_pct,
                        volume=getattr(info, 'last_volume', 0) or 0
                    )
                    db.add(dp)
                else:
                    dp.close_price = stock.ltp
                    dp.change_pct = stock.change_pct
                    dp.volume = getattr(info, 'last_volume', 0) or dp.volume

            except Exception as e:
                print(f"Failed to update {stock.ticker}: {e}")
                
        db.commit()
        return {"status": "success", "message": "Market data synced successfully"}
    except Exception as e:
        print(f"Sync error: {e}")
        raise HTTPException(status_code=500, detail="Failed to sync market data")

@router.get("/stock/{symbol}/financials")
def get_stock_financials(symbol: str):
    """Fetch detailed annual and quarterly financials (Income Statement) from yfinance."""
    try:
        ticker = yf.Ticker(symbol)
        ann_fin = ticker.financials
        qtr_fin = ticker.quarterly_financials
        
        if ann_fin.empty and qtr_fin.empty and symbol.endswith('.BO'):
            # Fallback for BSE
            ns_symbol = symbol.replace('.BO', '.NS')
            ticker = yf.Ticker(ns_symbol)
            ann_fin = ticker.financials
            qtr_fin = ticker.quarterly_financials
            
        def parse_financials(fin_df):
            result = []
            if fin_df is None or fin_df.empty:
                return result
                
            for col in fin_df.columns:
                date_str = col.strftime('%b %Y') # e.g. Mar 2024
                
                def get_raw_val(key):
                    import math, pandas as pd
                    try:
                        if key in fin_df.index:
                            v = fin_df.loc[key, col]
                            if v is None or pd.isna(v) or math.isnan(v) or math.isinf(v):
                                return 0.0
                            return float(v)
                    except:
                        pass
                    return 0.0
                    
                def get_val(key):
                    return get_raw_val(key) / 10000000 # Convert to Crores
                    
                sales = get_val('Total Revenue')
                if sales == 0.0:
                    sales = get_val('Operating Revenue')
                    
                op_profit = get_val('Operating Income')
                
                expenses = get_val('Total Expenses')
                if expenses == 0.0 and sales > 0 and op_profit != 0:
                    expenses = sales - op_profit
                
                if op_profit == 0.0 and sales > 0 and expenses > 0:
                    op_profit = sales - expenses
                    
                opm = (op_profit / sales * 100) if sales > 0 else 0.0
                
                other_inc = get_val('Other Non Operating Income Expenses') + get_val('Interest Income Non Operating')
                
                interest = get_val('Interest Expense')
                if interest == 0.0:
                    interest = get_val('Net Non Operating Interest Income Expense')
                    if interest < 0:
                        interest = abs(interest)
                        
                depreciation = get_val('Reconciled Depreciation')
                pbt = get_val('Pretax Income')
                tax_prov = get_val('Tax Provision')
                tax_pct = (tax_prov / pbt * 100) if pbt > 0 else 0.0
                
                net_profit = get_val('Net Income')
                if net_profit == 0.0:
                    net_profit = get_val('Net Income Common Stockholders')
                
                eps = get_raw_val('Basic EPS')
                if eps == 0.0:
                    eps = get_raw_val('Diluted EPS')
                    
                result.append({
                    "date": date_str,
                    "timestamp": col.timestamp(),
                    "sales": round(sales, 2),
                    "expenses": round(expenses, 2),
                    "operating_profit": round(op_profit, 2),
                    "opm_pct": round(opm, 2),
                    "other_income": round(other_inc, 2),
                    "interest": round(interest, 2),
                    "depreciation": round(depreciation, 2),
                    "profit_before_tax": round(pbt, 2),
                    "tax_pct": round(tax_pct, 2),
                    "net_profit": round(net_profit, 2),
                    "eps": round(eps, 2)
                })
            
            # Sort chronologically ascending
            result.sort(key=lambda x: x['timestamp'])
            return result
            
        return {
            "annual": parse_financials(ann_fin),
            "quarterly": parse_financials(qtr_fin)
        }
    except Exception as e:
        print(f"Financials error: {e}")
        return {"annual": [], "quarterly": []}

@router.get("/stock/{symbol}/holdings")
def get_stock_holdings(symbol: str):
    """Fetch holdings pattern (Promoter, FII/DII, Public) and insider roster."""
    import pandas as pd
    import numpy as np
    try:
        ticker = yf.Ticker(symbol)
        
        # Sometimes the API throws on empty or missing data, so we wrap in try-except
        try:
            info = ticker.info
        except Exception:
            info = {}
            
        insiders_pct = info.get('heldPercentInsiders', 0.0)
        institutions_pct = info.get('heldPercentInstitutions', 0.0)
        
        insiders_pct = float(insiders_pct) if insiders_pct is not None else 0.0
        institutions_pct = float(institutions_pct) if institutions_pct is not None else 0.0
        
        public_pct = max(0.0, 1.0 - insiders_pct - institutions_pct)
        
        shares_out = info.get('sharesOutstanding', 0)
        float_shares = info.get('floatShares', 0)
        
        shares_out = int(shares_out) if shares_out is not None else 0
        float_shares = int(float_shares) if float_shares is not None else 0
        
        roster = []
        try:
            roster_df = ticker.insider_roster_holders
            if roster_df is not None and not roster_df.empty:
                for idx, row in roster_df.iterrows():
                    shares = row.get("Shares Owned Directly")
                    date = row.get("Latest Transaction Date")
                    if pd.notnull(date) and hasattr(date, "strftime"):
                        date_str = date.strftime('%Y-%m-%d')
                    else:
                        date_str = str(date) if pd.notnull(date) else "N/A"
                        
                    raw_shares = int(shares) if pd.notnull(shares) else 0
                    pct = (raw_shares / shares_out * 100.0) if shares_out > 0 else 0.0

                    roster.append({
                        "name": str(row.get("Name", "")),
                        "position": str(row.get("Position", "")),
                        "shares": raw_shares,
                        "pct": pct,
                        "latest_transaction": str(row.get("Most Recent Transaction", "")),
                        "date": date_str
                    })
        except Exception as e:
            print(f"Error fetching roster for {symbol}: {e}")
            
        return {
            "summary": {
                "promoters_pct": round(insiders_pct * 100, 2),
                "institutions_pct": round(institutions_pct * 100, 2),
                "public_pct": round(public_pct * 100, 2),
                "shares_outstanding": shares_out,
                "float_shares": float_shares
            },
            "roster": roster
        }
    except Exception as e:
        print(f"Holdings error for {symbol}: {e}")
        return {
            "summary": {
                "promoters_pct": 0, "institutions_pct": 0, "public_pct": 0,
                "shares_outstanding": 0, "float_shares": 0
            },
            "roster": []
        }

@router.get("/stock/{ticker}", response_model=schemas.StockDetail)
def get_stock_detail(ticker: str, db: Session = Depends(get_db)):
    stock = db.query(models.Stock).filter(models.Stock.ticker == ticker).first()
    if not stock:
        raise HTTPException(status_code=404, detail="Stock not found")
    return stock

@router.get("/screener/search")
def search_stocks(q: str, db: Session = Depends(get_db)):
    if not q:
        return []

    results = []
    seen = set()

    # 1. Local DB Search (Fast and precise)
    safe_q = _escape_like(q)
    local_query = db.query(models.Stock).filter(
        (models.Stock.ticker.ilike(f"%{safe_q}%")) |
        (models.Stock.company_name.ilike(f"%{safe_q}%"))
    ).limit(10).all()

    for stock in local_query:
        exchange = 'NSE' if stock.ticker.endswith('.NS') else 'BSE'
        results.append({
            'symbol': stock.ticker,
            'name': stock.company_name,
            'exchange': exchange,
            'type': 'EQUITY',
            'score': 1000  # High score for known seeded stocks
        })
        seen.add(stock.ticker)

    # 2. Yahoo Finance Search (Fallback)
    if len(q) >= 2 and len(results) < 10:
        url = f"https://query2.finance.yahoo.com/v1/finance/search?q={q}&quotesCount=10&country=India"
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        try:
            response = requests.get(url, headers=headers, timeout=5)
            response.raise_for_status()
            data = response.json()
            
            if 'quotes' in data:
                for quote in data['quotes']:
                    symbol = quote.get('symbol', '')
                    if (symbol.endswith('.NS') or symbol.endswith('.BO')) and symbol not in seen:
                        exchange = 'NSE' if symbol.endswith('.NS') else 'BSE'
                        results.append({
                            'symbol': symbol,
                            'name': quote.get('shortname', symbol),
                            'exchange': exchange,
                            'type': quote.get('quoteType', 'EQUITY'),
                            'score': quote.get('score', 0)
                        })
                        seen.add(symbol)
        except Exception as e:
            print(f"Search API error: {e}")

    results.sort(key=lambda x: (x['score'], x['exchange'] == 'NSE'), reverse=True)
    return results[:10]

# Whitelist of allowed period and interval values to prevent arbitrary yfinance params
_VALID_PERIODS = frozenset({'1d', '5d', '1mo', '3mo', '6mo', '1y', '2y', '5y', '10y', 'max', 'ytd'})
_VALID_INTERVALS = frozenset({'1m', '2m', '5m', '15m', '30m', '60m', '90m', '1h', '1d', '5d', '1wk', '1mo', '3mo'})

@router.get("/stock/{symbol}/chart")
def get_stock_chart(symbol: str, period: str = "6mo", interval: str = "1d"):
    """Fetch OHLCV candle data for charting."""
    # Validate params against whitelist
    if period not in _VALID_PERIODS:
        raise HTTPException(status_code=422, detail=f"Invalid period: {period}")
    if interval not in _VALID_INTERVALS:
        raise HTTPException(status_code=422, detail=f"Invalid interval: {interval}")
    
    try:
        ticker = yf.Ticker(symbol)
        hist = ticker.history(period=period, interval=interval)
        
        # Fallback for BSE (.BO) stocks missing historical data
        if hist.empty and symbol.endswith('.BO'):
            ns_symbol = symbol.replace('.BO', '.NS')
            print(f"BSE history empty for {symbol}. Falling back to {ns_symbol}")
            ticker = yf.Ticker(ns_symbol)
            hist = ticker.history(period=period, interval=interval)
            
        if hist.empty:
            return []
            
        # Drop rows with NaN in Close
        hist = hist.dropna(subset=['Close'])
        
        candles = []
        seen_times = set()
        
        for date, row in hist.iterrows():
            if interval in ('1d', '1wk', '1mo'):
                time_val = date.strftime('%Y-%m-%d')
            else:
                time_val = int(date.timestamp())
                
            if time_val in seen_times:
                continue
            seen_times.add(time_val)
            
            candles.append({
                "time": time_val,
                "open": round(row["Open"], 2),
                "high": round(row["High"], 2),
                "low": round(row["Low"], 2),
                "close": round(row["Close"], 2),
                "volume": int(row["Volume"])
            })
            
        # Ensure strict chronological order for lightweight-charts
        candles.sort(key=lambda x: x["time"])
        return candles
    except HTTPException:
        raise  # Re-raise validation errors
    except Exception as e:
        print(f"Chart data error for {symbol}: {e}")
        raise HTTPException(status_code=502, detail="Failed to fetch chart data from upstream provider")

def _safe_float(val, default=0.0):
    """Safely convert a value to float, handling None/NaN/Inf."""
    import math as _math
    if val is None:
        return default
    try:
        f = float(val)
        if _math.isnan(f) or _math.isinf(f):
            return default
        return f
    except (TypeError, ValueError):
        return default

@router.get("/stock/{symbol}/quote")
def get_stock_quote(symbol: str):
    """Fetch real-time quote data for a stock."""
    try:
        ticker = yf.Ticker(symbol)
        info = ticker.fast_info
        
        prev_close = _safe_float(info.previous_close)
        ltp = _safe_float(info.last_price)
        change = ltp - prev_close
        change_pct = (change / prev_close * 100) if prev_close > 0 else 0
        
        return {
            "symbol": symbol,
            "ltp": round(ltp, 2),
            "change": round(change, 2),
            "change_pct": round(change_pct, 2),
            "prev_close": round(prev_close, 2),
            "day_high": round(_safe_float(info.day_high), 2),
            "day_low": round(_safe_float(info.day_low), 2),
            "year_high": round(_safe_float(info.year_high), 2),
            "year_low": round(_safe_float(info.year_low), 2),
            "market_cap": _safe_float(info.market_cap)
        }
    except Exception as e:
        print(f"Quote error: {e}")
        return {
            "symbol": symbol, 
            "ltp": 0, 
            "change": 0, 
            "change_pct": 0,
            "prev_close": 0,
            "day_high": 0,
            "day_low": 0,
            "year_high": 0,
            "year_low": 0,
            "market_cap": 0
        }



import re as _re

# --- Screener Query Parser ---
FIELD_MAP = {
    "market cap": "market_cap",
    "marketcap": "market_cap",
    "roce": "roce",
    "roe": "roe",
    "pe": "pe_ratio",
    "pe ratio": "pe_ratio",
    "debt to equity": "debt_to_equity",
    "de": "debt_to_equity",
    "promoter holding": "promoter_holding",
    "pledged": "pledged_promoter",
    "pledged promoter": "pledged_promoter",
    "rsi": "rsi_14",
    "delivery volume": "delivery_volume",
    "delivery": "delivery_volume",
    "eps": "eps",
    "dividend yield": "dividend_yield",
    "pb": "pb_ratio",
    "pb ratio": "pb_ratio",
    "price to book": "pb_ratio",
    "book value": "book_value",
}

_MAX_QUERY_LENGTH = 500
_MAX_QUERY_CONDITIONS = 10

def _parse_query_to_filters(query_str: str, db: Session):
    """Parse a text query like 'ROCE > 20 AND PE < 30' into SQLAlchemy filters."""
    query_str = query_str.strip()
    if not query_str:
        return db.query(models.Stock).join(models.Fundamentals).join(models.Technicals)
    
    # Input length validation to prevent abuse
    if len(query_str) > _MAX_QUERY_LENGTH:
        raise HTTPException(status_code=422, detail=f"Query too long (max {_MAX_QUERY_LENGTH} characters)")
    
    base_query = db.query(models.Stock).join(models.Fundamentals).join(models.Technicals)
    
    # Split on AND (case insensitive)
    conditions = _re.split(r'\s+AND\s+', query_str, flags=_re.IGNORECASE)
    
    # Limit number of conditions to prevent excessive DB queries
    if len(conditions) > _MAX_QUERY_CONDITIONS:
        conditions = conditions[:_MAX_QUERY_CONDITIONS]
    
    for cond in conditions:
        cond = cond.strip()
        # Match pattern: field_name operator value
        match = _re.match(r'(.+?)\s*(>=|<=|>|<|=)\s*([\d.]+)', cond)
        if not match:
            continue
        
        field_raw = match.group(1).strip().lower()
        op = match.group(2)
        value = float(match.group(3))
        
        db_field = FIELD_MAP.get(field_raw)
        if not db_field:
            continue
        
        # Map to the correct model column
        column = None
        if hasattr(models.Stock, db_field):
            column = getattr(models.Stock, db_field)
        elif hasattr(models.Fundamentals, db_field):
            column = getattr(models.Fundamentals, db_field)
        elif hasattr(models.Technicals, db_field):
            column = getattr(models.Technicals, db_field)
        
        if column is None:
            continue
        
        if op == ">":
            base_query = base_query.filter(column > value)
        elif op == ">=":
            base_query = base_query.filter(column >= value)
        elif op == "<":
            base_query = base_query.filter(column < value)
        elif op == "<=":
            base_query = base_query.filter(column <= value)
        elif op == "=":
            base_query = base_query.filter(column == value)
    
    return base_query

@router.get("/screener/query")
def query_screener(q: str = "", db: Session = Depends(get_db)):
    """Text-based screener query endpoint."""
    filtered_query = _parse_query_to_filters(q, db)
    stocks = filtered_query.all()
    
    response = []
    for stock in stocks:
        alpha_score = calculate_alpha_score(stock, stock.fundamentals, stock.technicals)
        response.append({
            "ticker": stock.ticker,
            "company_name": stock.company_name,
            "sector": stock.sector,
            "ltp": stock.ltp,
            "market_cap": stock.market_cap,
            "last_updated_date": stock.last_updated_date,
            "alpha_score": alpha_score,
            "change_pct": stock.change_pct,
            "roce": stock.fundamentals.roce if stock.fundamentals else 0.0,
            "roe": stock.fundamentals.roe if stock.fundamentals else 0.0,
            "pe_ratio": stock.fundamentals.pe_ratio if stock.fundamentals else 0.0,
            "debt_to_equity": stock.fundamentals.debt_to_equity if stock.fundamentals else 0.0,
            "promoter_holding": stock.fundamentals.promoter_holding if stock.fundamentals else 0.0,
            "pledged_promoter": stock.fundamentals.pledged_promoter if stock.fundamentals else 0.0,
            "delivery_volume": stock.technicals.delivery_volume if stock.technicals else 0.0,
            "eps": stock.fundamentals.eps if stock.fundamentals else 0.0,
            "dividend_yield": stock.fundamentals.dividend_yield if stock.fundamentals else 0.0,
            "pb_ratio": stock.fundamentals.pb_ratio if stock.fundamentals else 0.0,
            "book_value": stock.fundamentals.book_value if stock.fundamentals else 0.0
        })
    
    response.sort(key=lambda x: x["alpha_score"], reverse=True)
    return response

@router.get("/market/movers")
def get_market_movers(date: str = None, db: Session = Depends(get_db)):
    if date:
        # Historical movers
        gainers_dp = db.query(models.DailyPerformance).filter(models.DailyPerformance.date == date).order_by(models.DailyPerformance.change_pct.desc()).limit(5).all()
        losers_dp = db.query(models.DailyPerformance).filter(models.DailyPerformance.date == date).order_by(models.DailyPerformance.change_pct.asc()).limit(5).all()
        
        return {
            "gainers": [{"symbol": dp.stock.ticker, "name": dp.stock.company_name, "ltp": dp.close_price, "change_pct": dp.change_pct} for dp in gainers_dp if dp.stock],
            "losers": [{"symbol": dp.stock.ticker, "name": dp.stock.company_name, "ltp": dp.close_price, "change_pct": dp.change_pct} for dp in losers_dp if dp.stock]
        }
    else:
        # Current live movers
        gainers = db.query(models.Stock).order_by(models.Stock.change_pct.desc()).limit(5).all()
        losers = db.query(models.Stock).order_by(models.Stock.change_pct.asc()).limit(5).all()
        return {
            "gainers": [{"symbol": s.ticker, "name": s.company_name, "ltp": s.ltp, "change_pct": s.change_pct} for s in gainers],
            "losers": [{"symbol": s.ticker, "name": s.company_name, "ltp": s.ltp, "change_pct": s.change_pct} for s in losers]
        }
@router.get("/market/trading-dates")
def get_trading_dates(db: Session = Depends(get_db)):
    # Get distinct dates from DailyPerformance
    dates = db.query(models.DailyPerformance.date).distinct().order_by(models.DailyPerformance.date.desc()).all()
    return [date[0] for date in dates]
