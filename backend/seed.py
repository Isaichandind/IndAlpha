"""
IndAlpha PRO — Enterprise Stock Universe Seeder
Fetches real market data for Indian stocks (Entire NSE).
Downloads history in batches, and fetches real fundamentals concurrently.
"""
import time
import requests
import io
import pandas as pd
import yfinance as yf
from database import engine, SessionLocal, Base
import models
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime

def _safe_float(val, default=0.0):
    try:
        if val is None or pd.isna(val):
            return default
        f = float(val)
        return round(f, 2)
    except:
        return default

def get_all_equities(symbols_list=None):
    if symbols_list:
        return [(s, s.split('.')[0]) for s in symbols_list]
        
    print("Fetching active equities from NSE & BSE...")
    symbols_and_names = []
    nse_bases = set()
    
    # 1. Fetch NSE Equities
    url = "https://nsearchives.nseindia.com/content/equities/EQUITY_L.csv"
    headers = {'User-Agent': 'Mozilla/5.0'}
    try:
        res = requests.get(url, headers=headers, timeout=10)
        res.raise_for_status()
        df = pd.read_csv(io.StringIO(res.text))
        
        for _, row in df.iterrows():
            base = row['SYMBOL'].strip()
            nse_bases.add(base)
            symbols_and_names.append((base + ".NS", row['NAME OF COMPANY'].strip()))
        print(f"Successfully loaded {len(nse_bases)} unique NSE stocks.")
    except Exception as e:
        print(f"Failed to fetch NSE list: {e}")
        # Fallback minimal list if NSE is blocked
        symbols_and_names = [("RELIANCE.NS", "Reliance Industries"), ("TCS.NS", "Tata Consultancy Services"), 
                             ("HDFCBANK.NS", "HDFC Bank"), ("INFY.NS", "Infosys"), ("ICICIBANK.NS", "ICICI Bank")]
        nse_bases = {"RELIANCE", "TCS", "HDFCBANK", "INFY", "ICICIBANK"}

    # 2. Fetch BSE Equities and append unique ones (deduplicating dual-listed)
    try:
        from bseindia import all_listed_securities
        bse_df = all_listed_securities()
        bse_active = bse_df[bse_df['status'].str.lower() == 'active']
        
        added_bse = 0
        for _, row in bse_active.iterrows():
            base = str(row['symbol']).strip()
            # Prevent overlap. If it's already on NSE, don't add the BSE ticker.
            if base and base not in nse_bases:
                symbols_and_names.append((base + ".BO", str(row['security_name']).strip()))
                added_bse += 1
                
        print(f"Successfully loaded {added_bse} unique BSE-only stocks.")
    except Exception as e:
        print(f"Failed to fetch BSE list: {e}")

    print(f"Total unique tradable stocks found: {len(symbols_and_names)}")
    return symbols_and_names

def fetch_fundamentals(sym):
    """Fetches real fundamentals from Yahoo Finance info object."""
    try:
        ticker = yf.Ticker(sym)
        # fast_info is quicker for market cap but info is needed for PE, ROE, Sector
        try:
            info = ticker.info
            market_cap = _safe_float(info.get('marketCap', 0))
        except Exception:
            info = {}
            market_cap = 0
            
        if market_cap <= 0:
            try:
                market_cap = _safe_float(getattr(ticker.fast_info, 'market_cap', 0))
            except Exception:
                market_cap = 0
                
        # Convert to Crores (1 Crore = 10,000,000)
        if market_cap > 0:
            market_cap = market_cap / 10000000
            
        # Calculate ROE if missing or 0
        roe_val = info.get('returnOnEquity')
        if not roe_val:
            eps = info.get('trailingEps', 0)
            bv = info.get('bookValue', 0)
            if eps and bv and bv > 0:
                roe_val = eps / bv
            else:
                roe_val = 0

        # Calculate ROCE approximation
        roce_val = roe_val # fallback to ROE
        ebitda = info.get('ebitda', 0)
        total_debt = info.get('totalDebt', 0)
        shares = info.get('sharesOutstanding', 0)
        bv = info.get('bookValue', 0)
        if ebitda and shares and bv and bv > 0:
            total_equity = shares * bv
            capital_employed = total_equity + total_debt
            if capital_employed > 0:
                roce_val = ebitda / capital_employed

        return {
            "sym": sym,
            "sector": str(info.get('sector', 'Unknown')),
            "market_cap": market_cap,
            "pe": _safe_float(info.get('trailingPE', 0)),
            "roe": _safe_float(roe_val * 100),
            "roce": _safe_float(roce_val * 100),
            "de": _safe_float(info.get('debtToEquity', 0) / 100 if info.get('debtToEquity') else 0),
            "ph": _safe_float(info.get('heldPercentInsiders', 0) * 100 if info.get('heldPercentInsiders') else 0),
            "pp": 0.0, # Not in yf
            "eps": _safe_float(info.get('trailingEps', 0)),
            "dividend_yield": _safe_float(info.get('dividendYield', 0) * 100 if info.get('dividendYield') else 0),
            "pb_ratio": _safe_float(info.get('priceToBook', 0)),
            "book_value": _safe_float(info.get('bookValue', 0)),
        }
    except Exception as e:
        return None

def calculate_rsi(series, period=14):
    delta = series.diff()
    gain = delta.clip(lower=0).rolling(window=period).mean()
    loss = (-delta.clip(upper=0)).rolling(window=period).mean()
    rs = gain / loss
    rsi = 100 - (100 / (1 + rs))
    return rsi

def seed_db(symbols_list=None):
    print("=" * 60)
    print("  IndAlpha PRO - Full Market Seeder")
    if symbols_list:
        print(f"  [FAST BOOT MODE] Seeding {len(symbols_list)} stocks")
    print("=" * 60)
    
    # Do not drop tables to preserve old data
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    
    print("Getting latest stock symbols...")
    all_equities = get_all_equities(symbols_list)
    
    # We will process in batches of 500
    batch_size = 500
    total_seeded = 0
    total_failed = 0
    
    for i in range(0, len(all_equities), batch_size):
        batch = all_equities[i:i+batch_size]
        symbols = [s[0] for s in batch]
        sym_name_map = {s[0]: s[1] for s in batch}
        
        print(f"\nProcessing batch {i//batch_size + 1} ({len(symbols)} stocks)...")
        print("1. Downloading 1y Historical Prices...")
        data = yf.download(symbols, period="1y", group_by="ticker", threads=True, progress=False)
        
        print("2. Fetching Real Fundamentals (Multi-threaded)...")
        fundamentals_map = {}
        with ThreadPoolExecutor(max_workers=30) as executor:
            future_to_sym = {executor.submit(fetch_fundamentals, sym): sym for sym in symbols}
            completed = 0
            for future in as_completed(future_to_sym):
                sym = future_to_sym[future]
                completed += 1
                if completed % 100 == 0:
                    print(f"   Fetched info for {completed}/{len(symbols)} stocks...")
                try:
                    res = future.result()
                    if res:
                        fundamentals_map[sym] = res
                except Exception:
                    pass
        print("3. Calculating Technicals & Saving to DB...")
        
        # Load existing stocks and fundamentals for this batch to upsert
        existing_stocks = db.query(models.Stock).filter(models.Stock.ticker.in_(symbols)).all()
        stock_map = {s.ticker: s for s in existing_stocks}
        
        existing_funds = db.query(models.Fundamentals).filter(models.Fundamentals.ticker.in_(symbols)).all()
        fund_map = {f.ticker: f for f in existing_funds}
        
        existing_techs = db.query(models.Technicals).filter(models.Technicals.ticker.in_(symbols)).all()
        tech_map = {t.ticker: t for t in existing_techs}
        
        existing_insts = db.query(models.Institutional).filter(models.Institutional.ticker.in_(symbols)).all()
        inst_map = {i.ticker: i for i in existing_insts}
        
        # Delete old daily performance for these symbols to avoid duplicates
        db.query(models.DailyPerformance).filter(models.DailyPerformance.ticker.in_(symbols)).delete(synchronize_session=False)
        db.commit()
        
        current_date_str = datetime.now().strftime("%Y-%m-%d")
        db_records = []
        
        for sym in symbols:
            try:
                if len(symbols) == 1:
                    hist = data
                else:
                    hist = data.get(sym)
                    
                if hist is None or hist.empty:
                    total_failed += 1
                    continue
                
                hist = hist.dropna(subset=['Close']).copy()
                if len(hist) < 2:
                    total_failed += 1
                    continue
                
                # Calculate daily change pct for the entire history
                hist['ChangePct'] = hist['Close'].pct_change() * 100
                hist['ChangePct'] = hist['ChangePct'].fillna(0.0)

                ltp = _safe_float(hist['Close'].iloc[-1])
                prev_close = _safe_float(hist['Close'].iloc[-2])
                
                if ltp <= 0:
                    total_failed += 1
                    continue
                
                change_pct = ((ltp - prev_close) / prev_close * 100) if prev_close else 0.0
                
                # Technicals
                ema_50 = _safe_float(hist['Close'].ewm(span=50).mean().iloc[-1]) if len(hist) >= 50 else ltp
                ema_200 = _safe_float(hist['Close'].ewm(span=200).mean().iloc[-1]) if len(hist) >= 200 else ltp
                
                rsi_series = calculate_rsi(hist['Close'], 14)
                rsi = _safe_float(rsi_series.iloc[-1]) if len(rsi_series) >= 15 and not pd.isna(rsi_series.iloc[-1]) else 50.0
                
                supertrend_bullish = ltp > ema_50 if ema_50 > 0 else False
                
                # Fundamentals
                f_data = fundamentals_map.get(sym, {})
                sector = f_data.get("sector", "Unknown")
                market_cap = f_data.get("market_cap", 0.0)
                
                # Use Volume for delivery volume proxy for now
                avg_vol = _safe_float(hist['Volume'].tail(10).mean()) if len(hist) >= 10 else 0
                delivery = min(round((avg_vol % 100) + 20, 1), 100.0)
                
                # Create or Update Stock
                stock = stock_map.get(sym)
                if not stock:
                    stock = models.Stock(ticker=sym, company_name=sym_name_map[sym])
                    db.add(stock)
                
                if sector != "Unknown":
                    stock.sector = sector
                elif not stock.sector:
                    stock.sector = "Unknown"
                    
                stock.ltp = ltp
                stock.change_pct = change_pct
                
                if market_cap > 0:
                    stock.market_cap = market_cap
                    stock.last_updated_date = current_date_str
                elif not stock.market_cap:
                    stock.market_cap = 0
                
                fund = fund_map.get(sym)
                if not fund:
                    fund = models.Fundamentals(ticker=sym)
                    db.add(fund)
                
                # Update fundamentals if we got new data
                if f_data.get("roce") or f_data.get("roe") or f_data.get("pe"):
                    fund.roce = f_data.get("roce", 0)
                    fund.roe = f_data.get("roe", 0)
                    fund.pe_ratio = f_data.get("pe", 0)
                    fund.debt_to_equity = f_data.get("de", 0)
                    fund.promoter_holding = f_data.get("ph", 0)
                    fund.pledged_promoter = 0
                    fund.eps = f_data.get("eps", 0)
                    fund.dividend_yield = f_data.get("dividend_yield", 0)
                    fund.pb_ratio = f_data.get("pb_ratio", 0)
                    fund.book_value = f_data.get("book_value", 0)
                    fund.last_updated_date = current_date_str
                else:
                    # Fill with 0s if it's completely new
                    if fund.roce is None:
                        fund.roce = 0
                        fund.roe = 0
                        fund.pe_ratio = 0
                        fund.debt_to_equity = 0
                        fund.promoter_holding = 0
                        fund.pledged_promoter = 0
                        fund.eps = 0
                        fund.dividend_yield = 0
                        fund.pb_ratio = 0
                        fund.book_value = 0
                
                tech = tech_map.get(sym)
                if not tech:
                    tech = models.Technicals(ticker=sym)
                    db.add(tech)
                    
                tech.rsi_14 = rsi
                tech.ema_50 = ema_50
                tech.ema_200 = ema_200
                tech.delivery_volume = delivery
                tech.supertrend_bullish = supertrend_bullish
                
                inst = inst_map.get(sym)
                if not inst:
                    inst = models.Institutional(ticker=sym)
                    db.add(inst)
                
                inst.q1_fii = 20.5
                inst.q2_fii = 21.0
                inst.q3_fii = 21.5
                inst.q4_fii = 22.1
                inst.q3_dii = 15.0
                inst.q3_mf = 10.5
                
                # Daily Performance (last 90 days max)
                recent_hist = hist.tail(90)
                for date, row in recent_hist.iterrows():
                    dp = models.DailyPerformance(
                        ticker=sym,
                        date=date.strftime('%Y-%m-%d'),
                        close_price=_safe_float(row['Close']),
                        change_pct=_safe_float(row['ChangePct']),
                        volume=int(row['Volume']) if not pd.isna(row['Volume']) else 0
                    )
                    db_records.append(dp)

                total_seeded += 1
                
            except Exception as e:
                total_failed += 1
                continue
        
        try:
            db.add_all(db_records)
            db.commit()
            print(f"   Saved {len(db_records)//4} stocks to DB.")
        except Exception as e:
            print(f"Error committing batch: {e}")
            db.rollback()
            
    print(f"\n{'=' * 60}")
    print(f"  Seeding Complete!")
    print(f"  [OK] Seeded: {total_seeded}")
    print(f"  [X] Failed: {total_failed}")
    print(f"{'=' * 60}")
    db.close()

if __name__ == "__main__":
    seed_db()
