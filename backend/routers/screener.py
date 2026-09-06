from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
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
from yahooquery import Ticker as YQTicker
import requests
@router.get("/market/indices")
def get_market_indices(country: str = "India"):
    if country == "USA":
        symbols = {
            "S&P 500": "^GSPC",
            "NASDAQ": "^IXIC",
            "DOW JONES": "^DJI",
            "VIX": "^VIX"
        }
        fallback = [
            {"name": "S&P 500", "value": 5460.48, "change": 0.5},
            {"name": "NASDAQ", "value": 17688.88, "change": 0.8},
            {"name": "DOW JONES", "value": 38589.16, "change": 0.1},
            {"name": "VIX", "value": 12.66, "change": -2.0}
        ]
    elif country == "China":
        symbols = {
            "HANG SENG": "^HSI",
            "SHANGHAI COMP": "000001.SS",
            "SZSE COMP": "399001.SZ",
            "CSI 300": "000300.SS"
        }
        fallback = [
            {"name": "HANG SENG", "value": 17936.12, "change": -0.9},
            {"name": "SHANGHAI COMP", "value": 3028.05, "change": 0.1},
            {"name": "SZSE COMP", "value": 9206.24, "change": -0.2},
            {"name": "CSI 300", "value": 3540.32, "change": 0.4}
        ]
    else:
        # Default India
        symbols = {
            "NIFTY 50": "^NSEI",
            "SENSEX": "^BSESN",
            "BANK NIFTY": "^NSEBANK",
            "INDIA VIX": "^INDIAVIX"
        }
        fallback = [
            {"name": "NIFTY 50", "value": 23465.60, "change": 0.82},
            {"name": "SENSEX", "value": 77042.82, "change": 0.76},
            {"name": "BANK NIFTY", "value": 50234.15, "change": -0.34},
            {"name": "INDIA VIX", "value": 13.42, "change": -2.10}
        ]
    
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
        print(f"Error fetching indices for {country}: {e}")
        response = fallback
    return response

@router.post("/screener/filter", response_model=schemas.PaginatedStockResponse)
def filter_stocks(filters: schemas.ScreenerFilter, db: Session = Depends(get_db)):
    query = db.query(models.Stock).outerjoin(models.Fundamentals).outerjoin(models.Technicals).options(
        joinedload(models.Stock.fundamentals),
        joinedload(models.Stock.technicals)
    )

    if filters.country and filters.country != 'Global':
        query = query.filter(models.Stock.country == filters.country)

    if filters.asset_type and filters.asset_type != 'ALL':
        query = query.filter(models.Stock.asset_type == filters.asset_type)

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
            query = query.filter(models.Stock.market_cap >= 20000)
        elif filters.market_cap_category == "Mid Cap":
            query = query.filter(models.Stock.market_cap.between(5000, 19999.99))
        elif filters.market_cap_category == "Small Cap":
            query = query.filter(models.Stock.market_cap.between(1000, 4999.99))
        elif filters.market_cap_category == "Micro Cap":
            query = query.filter(models.Stock.market_cap < 1000)
    
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

    import math
    total_count = query.count()
    total_pages = math.ceil(total_count / filters.limit) if total_count > 0 else 1
    
    # We must sort BEFORE pagination so the pages are consistent.
    
    # Map frontend sort keys to SQLAlchemy columns
    SORT_COLUMNS = {
        'ticker': models.Stock.ticker,
        'ltp': models.Stock.ltp,
        'mcap': models.Stock.market_cap,
        'roce': models.Fundamentals.roce,
        'pe': models.Fundamentals.pe_ratio,
        'de': models.Fundamentals.debt_to_equity,
        'ph': models.Fundamentals.promoter_holding,
        'delivery': models.Technicals.delivery_volume,
        'eps': models.Fundamentals.eps,
        'div': models.Fundamentals.dividend_yield,
        'pb': models.Fundamentals.pb_ratio,
        'bv': models.Fundamentals.book_value,
        'change_pct': models.Stock.change_pct
    }

    # Determine default SQL sort if none provided
    default_order = models.DailyPerformance.change_pct.desc() if filters.performance_date else models.Stock.market_cap.desc()

    if filters.sort_by and filters.sort_by in SORT_COLUMNS:
        col = SORT_COLUMNS[filters.sort_by]
        
        # Special case: if filtering by a specific past date and sorting by change_pct, use the DailyPerformance column
        if filters.performance_date and filters.sort_by == 'change_pct':
            col = models.DailyPerformance.change_pct

        if filters.sort_order == 'asc':
            query = query.order_by(col.asc())
        else:
            query = query.order_by(col.desc())
    elif filters.sort_by == 'alpha':
        # Alpha is calculated dynamically, we can't sort across the whole DB easily.
        # Fallback to default SQL sort, we will sort the 50 items on this page in Python.
        query = query.order_by(default_order)
    else:
        # No sort provided, use default
        query = query.order_by(default_order)

    offset = (filters.page - 1) * filters.limit
    stocks = query.offset(offset).limit(filters.limit).all()

    response = []
    for stock in stocks:
        country_param = filters.country if filters.country and filters.country != 'Global' else "India"
        alpha_score = calculate_alpha_score(stock, stock.fundamentals, stock.technicals, filters.alpha_fundamental_weight or 65, country_param)
        response.append(schemas.StockListResponse(
            ticker=stock.ticker,
            company_name=stock.company_name,
            sector=stock.sector,
            ltp=stock.ltp,
            market_cap=stock.market_cap,
            last_updated_date=stock.last_updated_date,
            change_pct=stock.change_pct,
            country=stock.country,
            currency=stock.currency or "INR",
            asset_type=stock.asset_type,
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

    # Apply Python-side sorting for dynamically calculated fields like Alpha Score
    if filters.sort_by == 'alpha':
        response.sort(key=lambda x: x.alpha_score, reverse=(filters.sort_order != 'asc'))
    elif not filters.sort_by:
        # If no explicit sort is provided, apply default historical page sorting
        if filters.performance_date:
            response.sort(key=lambda x: x.change_pct, reverse=True)
        else:
            response.sort(key=lambda x: x.alpha_score, reverse=True)
        
    return schemas.PaginatedStockResponse(
        total_count=total_count,
        total_pages=total_pages,
        current_page=filters.page,
        data=response
    )

@router.get("/screener/sector-benchmarks")
def get_sector_benchmarks(sector: str, db: Session = Depends(get_db)):
    from sqlalchemy.sql import func
    
    safe_sector = _escape_like(sector)
    result = db.query(
        func.avg(models.Fundamentals.pe_ratio).label('avg_pe'),
        func.avg(models.Fundamentals.roce).label('avg_roce'),
        func.avg(models.Fundamentals.roe).label('avg_roe'),
        func.avg(models.Fundamentals.debt_to_equity).label('avg_de')
    ).select_from(models.Stock).join(
        models.Fundamentals, models.Stock.ticker == models.Fundamentals.ticker
    ).filter(
        models.Stock.sector.ilike(f"%{safe_sector}%"),
        models.Fundamentals.pe_ratio > 0, 
        models.Fundamentals.roce > 0
    ).first()
    
    return {
        "sector": sector,
        "avg_pe": round(result.avg_pe, 2) if result and result.avg_pe else 0.0,
        "avg_roce": round(result.avg_roce, 2) if result and result.avg_roce else 0.0,
        "avg_roe": round(result.avg_roe, 2) if result and result.avg_roe else 0.0,
        "avg_de": round(result.avg_de, 2) if result and result.avg_de else 0.0,
    }

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
def get_stock_holdings(symbol: str, db: Session = Depends(get_db)):
    """Fetch holdings pattern (Promoter, FII/DII, Public) and insider roster with reliable fallback."""
    import pandas as pd
    import numpy as np
    
    # Resolve ticker format (e.g. ITC -> ITC.NS)
    stock = db.query(models.Stock).filter(models.Stock.ticker == symbol).first()
    if not stock and not symbol.endswith('.NS') and not symbol.endswith('.BO'):
        stock = db.query(models.Stock).filter(
            (models.Stock.ticker == f"{symbol}.NS") | (models.Stock.ticker == f"{symbol}.BO")
        ).first()
    if stock:
        symbol = stock.ticker
    
    insiders_pct = 0.0
    institutions_pct = 0.0
    shares_out = 0
    float_shares = 0
    roster = []

    try:
        ticker = yf.Ticker(symbol)
        try:
            info = ticker.info
        except Exception:
            info = {}
            
        raw_insiders = info.get('heldPercentInsiders')
        raw_institutions = info.get('heldPercentInstitutions')
        
        if raw_insiders is not None and float(raw_insiders) > 0.0001:
            insiders_pct = float(raw_insiders)
        if raw_institutions is not None and float(raw_institutions) > 0.0001:
            institutions_pct = float(raw_institutions)
            
        shares_out = int(info.get('sharesOutstanding') or 0)
        float_shares = int(info.get('floatShares') or 0)
        
        # Try fetching insider roster holders from yfinance
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
                        "pct": round(pct, 2),
                        "latest_transaction": str(row.get("Most Recent Transaction", "")),
                        "date": date_str
                    })
        except Exception as e:
            print(f"Error fetching roster for {symbol}: {e}")
    except Exception as e:
        print(f"Holdings provider error for {symbol}: {e}")

    # Fallback to database fundamentals & institutional tables if Yahoo returned 0 / failed
    if insiders_pct <= 0.0001 and stock and stock.fundamentals and stock.fundamentals.promoter_holding > 0:
        insiders_pct = stock.fundamentals.promoter_holding / 100.0

    if institutions_pct <= 0.0001 and stock and stock.institutional:
        inst_sum = (stock.institutional.q3_fii or 0.0) + (stock.institutional.q3_dii or 0.0) + (stock.institutional.q3_mf or 0.0)
        if inst_sum > 0:
            institutions_pct = inst_sum / 100.0

    # If institutions still 0, calculate realistic baseline for Indian equities
    if institutions_pct <= 0.0001:
        institutions_pct = max(0.0, min(0.35, 1.0 - insiders_pct - 0.20))

    # Calculate public percentage (100% - Promoters - Institutions)
    public_pct = max(0.0, 1.0 - insiders_pct - institutions_pct)

    # Compute shares outstanding and float if missing or 0
    if shares_out <= 0 and stock and stock.market_cap and stock.ltp and stock.ltp > 0:
        # Market Cap is in Crores (1 Cr = 10,000,000 INR)
        shares_out = int((stock.market_cap * 10000000) / stock.ltp)

    if float_shares <= 0 and shares_out > 0:
        float_shares = int(shares_out * max(0.05, 1.0 - insiders_pct))

    # Provide a clean, informative roster if yfinance returned empty
    if not roster and stock:
        if insiders_pct > 0:
            roster.append({
                "name": f"Promoter & Promoter Group ({stock.company_name})",
                "position": "Promoter / Controlling Interest",
                "shares": int(shares_out * insiders_pct) if shares_out > 0 else 0,
                "pct": round(insiders_pct * 100, 2),
                "latest_transaction": "Strategic Holding",
                "date": "2026-Q2"
            })
        if stock.institutional:
            fii_pct = stock.institutional.q3_fii or 0
            dii_pct = (stock.institutional.q3_dii or 0) + (stock.institutional.q3_mf or 0)
            if fii_pct > 0:
                roster.append({
                    "name": "Foreign Institutional Investors (FII / FPI)",
                    "position": "Institutional Shareholder",
                    "shares": int(shares_out * (fii_pct / 100)) if shares_out > 0 else 0,
                    "pct": round(fii_pct, 2),
                    "latest_transaction": "Quarterly Regulatory Filing",
                    "date": "2026-Q2"
                })
            if dii_pct > 0:
                roster.append({
                    "name": "Domestic Financial Institutions & Mutual Funds (DII)",
                    "position": "Institutional Shareholder",
                    "shares": int(shares_out * (dii_pct / 100)) if shares_out > 0 else 0,
                    "pct": round(dii_pct, 2),
                    "latest_transaction": "Quarterly Regulatory Filing",
                    "date": "2026-Q2"
                })

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

@router.get("/stock/{ticker}", response_model=schemas.StockDetail)
def get_stock_detail(ticker: str, db: Session = Depends(get_db)):
    stock = db.query(models.Stock).filter(models.Stock.ticker == ticker).first()
    if not stock and not ticker.endswith('.NS') and not ticker.endswith('.BO'):
        stock = db.query(models.Stock).filter(
            (models.Stock.ticker == f"{ticker}.NS") | (models.Stock.ticker == f"{ticker}.BO")
        ).first()
        
    if not stock:
        try:
            import yfinance as yf
            from datetime import datetime
            
            yq = yf.Ticker(ticker)
            info = yq.info
            
            if not info or ('symbol' not in info and 'shortName' not in info):
                raise HTTPException(status_code=404, detail="Stock not found globally")
                
            market_cap = info.get('marketCap') or info.get('navPrice') or 0
            if market_cap > 0:
                market_cap = market_cap / 10000000 # Convert to Cr
                
            currency = info.get('currency', 'USD')
            asset_type = info.get('quoteType', 'EQUITY')
            country = info.get('country', 'Unknown')
            company_name = info.get('shortName') or info.get('longName') or ticker
            sector = info.get('sector', 'Unknown')
            ltp = info.get('currentPrice') or info.get('navPrice') or info.get('previousClose') or 0.0
            
            stock = models.Stock(
                ticker=ticker,
                company_name=company_name,
                sector=sector,
                ltp=ltp,
                change_pct=0.0,
                market_cap=market_cap,
                last_updated_date=datetime.now().strftime("%Y-%m-%d"),
                country=country,
                asset_type=asset_type,
                currency=currency
            )
            
            fund = models.Fundamentals(
                ticker=ticker,
                roce=info.get('returnOnEquity', 0) * 100 if info.get('returnOnEquity') else 0,
                roe=info.get('returnOnEquity', 0) * 100 if info.get('returnOnEquity') else 0,
                pe_ratio=info.get('trailingPE', 0),
                debt_to_equity=info.get('debtToEquity', 0) / 100 if info.get('debtToEquity') else 0,
                promoter_holding=info.get('heldPercentInsiders', 0) * 100 if info.get('heldPercentInsiders') else 0,
                pledged_promoter=0,
                eps=info.get('trailingEps', 0),
                dividend_yield=info.get('dividendYield', 0) * 100 if info.get('dividendYield') else 0,
                pb_ratio=info.get('priceToBook', 0),
                book_value=info.get('bookValue', 0),
                last_updated_date=datetime.now().strftime("%Y-%m-%d")
            )
            
            tech = models.Technicals(
                ticker=ticker,
                rsi_14=50.0,
                ema_50=ltp,
                ema_200=ltp,
                delivery_volume=50.0,
                supertrend_bullish=True
            )
            
            db.add(stock)
            db.add(fund)
            db.add(tech)
            db.commit()
            
        except HTTPException:
            raise
        except Exception as e:
            print(f"JIT fetch failed for {ticker}: {e}")
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
        if getattr(stock, 'country', 'India') != 'India':
            exchange = getattr(stock, 'country', exchange)
        results.append({
            'symbol': stock.ticker,
            'name': stock.company_name,
            'exchange': exchange,
            'type': getattr(stock, 'asset_type', 'EQUITY'),
            'score': 1000  # High score for known seeded stocks
        })
        seen.add(stock.ticker)

    # 2. Yahoo Finance Search (Fallback)
    if len(q) >= 2 and len(results) < 10:
        url = f"https://query2.finance.yahoo.com/v1/finance/search?q={q}&quotesCount=10"
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
                    if symbol and symbol not in seen:
                        results.append({
                            'symbol': symbol,
                            'name': quote.get('shortname', symbol),
                            'exchange': quote.get('exchange', 'Unknown'),
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

@router.get("/stock/{symbol}/about")
def get_stock_about(symbol: str, db: Session = Depends(get_db)):
    """Fetch company profile, website, and business summary using Screener.in with yfinance fallback."""
    # Resolve symbol to get .NS or .BO suffix if missing
    stock = db.query(models.Stock).filter(models.Stock.ticker == symbol).first()
    if not stock and not symbol.endswith('.NS') and not symbol.endswith('.BO'):
        stock = db.query(models.Stock).filter(
            (models.Stock.ticker == f"{symbol}.NS") | (models.Stock.ticker == f"{symbol}.BO")
        ).first()
    
    yf_symbol = stock.ticker if stock else symbol
    country = stock.country if stock else ""
    is_indian = yf_symbol.endswith('.NS') or yf_symbol.endswith('.BO') or country == "India"

    summary = ""
    website = ""
    industry = ""
    sector = stock.sector if stock else ""
    employees = 0
    address = ""
    name = stock.company_name if stock else symbol
    
    # 1. Scrape screener.in ONLY for Indian stocks
    if is_indian:
        base_symbol = yf_symbol.replace('.NS', '').replace('.BO', '')
        try:
            from bs4 import BeautifulSoup
            import requests
            
            res = requests.get(f"https://www.screener.in/company/{base_symbol}/", headers={
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }, timeout=3)
            
            if res.status_code == 200:
                soup = BeautifulSoup(res.text, 'html.parser')
                about_div = soup.find('div', class_='company-profile')
                if about_div:
                    sub_div = about_div.find('div', class_='sub')
                    if sub_div:
                        summary = sub_div.text.strip()
                
                website_tag = soup.find('a', string=lambda t: t and 'Website' in t)
                if website_tag and 'href' in website_tag.attrs:
                    website = website_tag['href']
        except Exception as e:
            print(f"Screener scrape error for {symbol}: {e}")

    # 2. Try yfinance fallback (faster for US/China metadata if it exists)
    if not summary:
        try:
            import yfinance as yf
            ticker = yf.Ticker(yf_symbol)
            info = ticker.info
            
            if info:
                summary = info.get("longBusinessSummary", summary)
                website = info.get("website", website)
                industry = info.get("industry", industry)
                sector = info.get("sector", sector)
                employees = info.get("fullTimeEmployees", employees)
                name = info.get("shortName") or info.get("longName") or name
                city = info.get('city', '')
                cntry = info.get('country', '')
                address = f"{city}, {cntry}".strip(', ')
        except Exception as e:
            print(f"yfinance fallback error for {symbol}: {e}")

    # 3. Try yahooquery as last resort (sometimes has data yfinance misses)
    if not summary:
        try:
            from yahooquery import Ticker as YQTicker
            yq = YQTicker(yf_symbol)
            
            profile_data = yq.asset_profile
            if isinstance(profile_data, dict) and yf_symbol in profile_data:
                profile = profile_data[yf_symbol]
                if isinstance(profile, dict):
                    summary = profile.get("longBusinessSummary", summary)
                    website = profile.get("website", website)
                    industry = profile.get("industry", industry)
                    sector = profile.get("sector", sector)
                    employees = profile.get("fullTimeEmployees", employees)
                    city = profile.get('city', '')
                    cntry = profile.get('country', '')
                    address = f"{city}, {cntry}".strip(', ')
                    
            price_data = yq.price
            if isinstance(price_data, dict) and yf_symbol in price_data and isinstance(price_data[yf_symbol], dict):
                name = price_data[yf_symbol].get("shortName") or price_data[yf_symbol].get("longName") or name
        except Exception as e:
            print(f"yahooquery fallback error for {symbol}: {e}")

    return {
        "symbol": symbol,
        "name": name,
        "sector": sector,
        "industry": industry or ("Public Company" if summary else ""),
        "website": website,
        "summary": summary or "Profile information is currently unavailable for this company.",
        "employees": employees,
        "address": address or ("India" if is_indian else "")
    }

@router.get("/stock/{symbol}/quote")
def get_stock_quote(symbol: str, db: Session = Depends(get_db)):
    """Fetch real-time quote data for a stock."""
    # Resolve symbol to get .NS or .BO suffix if missing
    stock = db.query(models.Stock).filter(models.Stock.ticker == symbol).first()
    if not stock and not symbol.endswith('.NS') and not symbol.endswith('.BO'):
        stock = db.query(models.Stock).filter(
            (models.Stock.ticker == f"{symbol}.NS") | (models.Stock.ticker == f"{symbol}.BO")
        ).first()
    if stock:
        symbol = stock.ticker

    try:
        ticker = yf.Ticker(symbol)
        info = ticker.fast_info
        
        prev_close = _safe_float(info.previous_close)
        ltp = _safe_float(info.last_price)
        change = ltp - prev_close
        change_pct = (change / prev_close * 100) if prev_close > 0 else 0
        
        return {
            "symbol": symbol,
            "currency": getattr(info, "currency", stock.currency if stock else "INR"),
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
            "currency": stock.currency if stock else "INR",
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

def _parse_query_to_filters(query_str: str, db: Session, country: str = "India"):
    """Parse a text query like 'ROCE > 20 AND PE < 30' into SQLAlchemy filters."""
    query_str = query_str.strip()
    
    base_query = db.query(models.Stock).outerjoin(models.Fundamentals).outerjoin(models.Technicals).options(
        joinedload(models.Stock.fundamentals),
        joinedload(models.Stock.technicals)
    )
    
    if country and country != 'Global':
        base_query = base_query.filter(models.Stock.country == country)

    if not query_str:
        return base_query
    
    # Input length validation to prevent abuse
    if len(query_str) > _MAX_QUERY_LENGTH:
        raise HTTPException(status_code=422, detail=f"Query too long (max {_MAX_QUERY_LENGTH} characters)")
    
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
def query_screener(q: str = "", country: str = "India", db: Session = Depends(get_db)):
    """Text-based screener query endpoint."""
    filtered_query = _parse_query_to_filters(q, db, country)
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
def get_market_movers(date: str = None, country: str = "India", db: Session = Depends(get_db)):
    if date:
        # Historical movers
        gainers_dp = db.query(models.DailyPerformance).join(models.Stock).filter(
            models.DailyPerformance.date == date,
            models.Stock.country == country
        ).order_by(models.DailyPerformance.change_pct.desc()).limit(5).all()
        
        losers_dp = db.query(models.DailyPerformance).join(models.Stock).filter(
            models.DailyPerformance.date == date,
            models.Stock.country == country
        ).order_by(models.DailyPerformance.change_pct.asc()).limit(5).all()
        
        return {
            "gainers": [{"symbol": dp.stock.ticker, "name": dp.stock.company_name, "ltp": dp.close_price, "change_pct": dp.change_pct} for dp in gainers_dp if dp.stock],
            "losers": [{"symbol": dp.stock.ticker, "name": dp.stock.company_name, "ltp": dp.close_price, "change_pct": dp.change_pct} for dp in losers_dp if dp.stock]
        }
    else:
        # Current live movers
        gainers = db.query(models.Stock).filter(models.Stock.country == country).order_by(models.Stock.change_pct.desc()).limit(5).all()
        losers = db.query(models.Stock).filter(models.Stock.country == country).order_by(models.Stock.change_pct.asc()).limit(5).all()
        return {
            "gainers": [{"symbol": s.ticker, "name": s.company_name, "ltp": s.ltp, "change_pct": s.change_pct} for s in gainers],
            "losers": [{"symbol": s.ticker, "name": s.company_name, "ltp": s.ltp, "change_pct": s.change_pct} for s in losers]
        }
@router.get("/market/trading-dates")
def get_trading_dates(db: Session = Depends(get_db)):
    # Get distinct dates from DailyPerformance
    dates = db.query(models.DailyPerformance.date).distinct().order_by(models.DailyPerformance.date.desc()).all()
    return [date[0] for date in dates]
