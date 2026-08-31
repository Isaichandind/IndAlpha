import sys
import os
import time

# Add backend directory to path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))
from database import SessionLocal
from models import Fundamentals, Stock
from yahooquery import Ticker

def _safe_float(val, default=0.0):
    try:
        import pandas as pd
        if val is None or pd.isna(val) or type(val) == dict:
            return default
        f = float(val)
        return round(f, 2)
    except:
        return default

def fix():
    db = SessionLocal()
    # Find all fundamentals with 0 ROCE
    funds = db.query(Fundamentals).filter((Fundamentals.roce == 0) | (Fundamentals.roe == 0)).all()
    
    total = len(funds)
    print(f"Found {total} stocks with missing ROCE/ROE. Fetching in bulk...")
    
    symbols = [f.ticker for f in funds]
    batch_size = 50
    
    fund_map = {f.ticker: f for f in funds}
    
    for i in range(0, len(symbols), batch_size):
        batch_syms = symbols[i:i+batch_size]
        print(f"Fetching batch {i//batch_size + 1}/{(total + batch_size - 1)//batch_size}...")
        
        try:
            t = Ticker(batch_syms, asynchronous=True)
            
            # Fetch all needed data
            summary_profile = t.summary_profile
            summary_detail = t.summary_detail
            key_stats = t.key_stats
            financial_data = t.financial_data
            
            for sym in batch_syms:
                fund = fund_map[sym]
                
                sp = summary_profile.get(sym, {}) if isinstance(summary_profile, dict) else {}
                sd = summary_detail.get(sym, {}) if isinstance(summary_detail, dict) else {}
                ks = key_stats.get(sym, {}) if isinstance(key_stats, dict) else {}
                fd = financial_data.get(sym, {}) if isinstance(financial_data, dict) else {}
                
                # YahooQuery returns string errors if symbol not found
                if isinstance(sp, str): sp = {}
                if isinstance(sd, str): sd = {}
                if isinstance(ks, str): ks = {}
                if isinstance(fd, str): fd = {}
                
                # ROE Calculation
                roe_val = ks.get('returnOnEquity')
                if not roe_val:
                    eps = ks.get('trailingEps', 0)
                    bv = ks.get('bookValue', 0)
                    if eps and bv and bv > 0:
                        roe_val = eps / bv
                    else:
                        roe_val = 0
                elif isinstance(roe_val, dict):
                    roe_val = 0
                        
                # ROCE Calculation
                roce_val = roe_val
                ebitda = fd.get('ebitda', 0)
                total_debt = fd.get('totalDebt', 0)
                shares = ks.get('sharesOutstanding', 0)
                bv = ks.get('bookValue', 0)
                
                if isinstance(ebitda, (int, float)) and isinstance(shares, (int, float)) and isinstance(bv, (int, float)):
                    if ebitda and shares and bv and bv > 0:
                        total_equity = shares * bv
                        capital_employed = total_equity + _safe_float(total_debt)
                        if capital_employed > 0:
                            roce_val = ebitda / capital_employed
                        
                fund.roce = _safe_float(roce_val * 100) if roce_val else 0.0
                fund.roe = _safe_float(roe_val * 100) if roe_val else 0.0
                fund.pe_ratio = _safe_float(sd.get('trailingPE', 0))
                fund.debt_to_equity = _safe_float(fd.get('debtToEquity', 0) / 100 if fd.get('debtToEquity') else 0)
                fund.promoter_holding = _safe_float(ks.get('heldPercentInsiders', 0) * 100 if ks.get('heldPercentInsiders') else 0)
                fund.eps = _safe_float(ks.get('trailingEps', 0))
                fund.dividend_yield = _safe_float(sd.get('dividendYield', 0) * 100 if sd.get('dividendYield') else 0)
                fund.pb_ratio = _safe_float(ks.get('priceToBook', 0))
                fund.book_value = _safe_float(ks.get('bookValue', 0))
            
            db.commit()
            time.sleep(1) # Be nice to the API
        except Exception as e:
            print(f"Error in batch starting with {batch_syms[0]}: {e}")
            db.rollback()

    print("Successfully updated missing fundamentals!")

if __name__ == '__main__':
    fix()
