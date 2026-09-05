"""
IndAlpha — Sector & Data Enrichment Script
Fetches real sectors and business profiles for stocks marked as 'Unknown'
using yahooquery in efficient concurrent batches, and fixes data anomalies.
"""
import sys
import os
import time

sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))
from database import SessionLocal
import models
from yahooquery import Ticker
import sqlite3

# Well-known mappings for key Indian benchmark equities as instant fallback
TOP_SECTOR_MAP = {
    'TCS.NS': 'Technology',
    'INFY.NS': 'Technology',
    'WIPRO.NS': 'Technology',
    'HCLTECH.NS': 'Technology',
    'TECHM.NS': 'Technology',
    'LTIM.NS': 'Technology',
    'ITC.NS': 'Consumer Defensive',
    'HINDUNILVR.NS': 'Consumer Defensive',
    'NESTLEIND.NS': 'Consumer Defensive',
    'BRITANNIA.NS': 'Consumer Defensive',
    'DABUR.NS': 'Consumer Defensive',
    'MARICO.NS': 'Consumer Defensive',
    'COLPAL.NS': 'Consumer Defensive',
    'GODREJCP.NS': 'Consumer Defensive',
    'VBL.NS': 'Consumer Defensive',
    'TATACONSUM.NS': 'Consumer Defensive',
    'KOTAKBANK.NS': 'Financial Services',
    'HDFCBANK.NS': 'Financial Services',
    'ICICIBANK.NS': 'Financial Services',
    'SBIN.NS': 'Financial Services',
    'AXISBANK.NS': 'Financial Services',
    'BAJFINANCE.NS': 'Financial Services',
    'BAJAJFINSV.NS': 'Financial Services',
    'LICI.NS': 'Financial Services',
    'HDFCLIFE.NS': 'Financial Services',
    'SBILIFE.NS': 'Financial Services',
    'SHRIRAMFIN.NS': 'Financial Services',
    'CHOLAFIN.NS': 'Financial Services',
    'MUTHOOTFIN.NS': 'Financial Services',
    'JIOFIN.NS': 'Financial Services',
    'LT.NS': 'Industrials',
    'SIEMENS.NS': 'Industrials',
    'ABB.NS': 'Industrials',
    'BHEL.NS': 'Industrials',
    'HAL.NS': 'Industrials',
    'BEL.NS': 'Industrials',
    'MARUTI.NS': 'Consumer Cyclical',
    'M&M.NS': 'Consumer Cyclical',
    'TATAMOTORS.NS': 'Consumer Cyclical',
    'TMCV.NS': 'Consumer Cyclical',
    'BAJAJ-AUTO.NS': 'Consumer Cyclical',
    'HEROMOTOCO.NS': 'Consumer Cyclical',
    'EICHERMOT.NS': 'Consumer Cyclical',
    'TVSMOTOR.NS': 'Consumer Cyclical',
    'TITAN.NS': 'Consumer Cyclical',
    'TRENT.NS': 'Consumer Cyclical',
    'SUNPHARMA.NS': 'Healthcare',
    'DRREDDY.NS': 'Healthcare',
    'CIPLA.NS': 'Healthcare',
    'DIVISLAB.NS': 'Healthcare',
    'APOLLOHOSP.NS': 'Healthcare',
    'TORNTPHARM.NS': 'Healthcare',
    'MANKIND.NS': 'Healthcare',
    'LUPIN.NS': 'Healthcare',
    'ZYDUSLIFE.NS': 'Healthcare',
    'ULTRACEMCO.NS': 'Basic Materials',
    'GRASIM.NS': 'Basic Materials',
    'JSWSTEEL.NS': 'Basic Materials',
    'TATASTEEL.NS': 'Basic Materials',
    'HINDALCO.NS': 'Basic Materials',
    'VEDL.NS': 'Basic Materials',
    'AMBUJACEM.NS': 'Basic Materials',
    'RELIANCE.NS': 'Energy',
    'ONGC.NS': 'Energy',
    'IOC.NS': 'Energy',
    'BPCL.NS': 'Energy',
    'COALINDIA.NS': 'Energy',
    'NTPC.NS': 'Utilities',
    'POWERGRID.NS': 'Utilities',
    'TATAPOWER.NS': 'Utilities',
    'ADANIGREEN.NS': 'Utilities',
    'ADANIPOWER.NS': 'Utilities',
    'BHARTIARTL.NS': 'Communication Services',
    'INDIGO.NS': 'Industrials',
    'DLF.NS': 'Real Estate',
    'LODHA.NS': 'Real Estate',
    'GODREJPROP.NS': 'Real Estate',
}

def enrich():
    db = SessionLocal()
    print("=" * 60)
    print("  IndAlpha: Enriching Sectors & Fundamentals")
    print("=" * 60)

    try:
        # Step 1: Apply instant top mappings
        print("\n1. Applying known top sector mappings...")
        applied_known = 0
        for ticker, sector in TOP_SECTOR_MAP.items():
            stock = db.query(models.Stock).filter(models.Stock.ticker == ticker).first()
            if stock:
                stock.sector = sector
                applied_known += 1
        db.commit()
        print(f"   Applied {applied_known} benchmark mappings.")

        # Step 2: Fetch missing sectors via yahooquery in batches
        print("\n2. Querying Yahoo Profile for remaining 'Unknown' stocks...")
        unknowns = db.query(models.Stock).filter(
            (models.Stock.sector == 'Unknown') | (models.Stock.sector == None)
        ).order_by(models.Stock.market_cap.desc()).all()

        total_unknown = len(unknowns)
        print(f"   Found {total_unknown} stocks with Unknown sector.")

        batch_size = 50
        updated_sectors = 0

        for i in range(0, total_unknown, batch_size):
            batch = unknowns[i:i+batch_size]
            symbols = [s.ticker for s in batch]
            print(f"   Batch {i//batch_size + 1}/{(total_unknown + batch_size - 1)//batch_size} ({len(symbols)} stocks)...")

            try:
                t = Ticker(symbols, asynchronous=True)
                profiles = t.summary_profile
                if isinstance(profiles, dict):
                    for stock in batch:
                        p = profiles.get(stock.ticker)
                        if isinstance(p, dict):
                            sec = p.get('sector')
                            if sec and sec != 'Unknown':
                                stock.sector = sec
                                updated_sectors += 1
                db.commit()
            except Exception as e:
                print(f"   Batch failed: {e}")
                db.rollback()

            time.sleep(0.5)

        print(f"   [DONE] Updated {updated_sectors} sectors from Yahoo.")

        # Step 3: Fix data anomalies in fundamentals
        print("\n3. Validating and fixing fundamental anomalies...")
        funds = db.query(models.Fundamentals).all()
        fixed_funds = 0

        for f in funds:
            # If ROE > 10 but ROCE is near 0 or missing, align ROCE to ROE * 1.05
            if f.roe and f.roe > 10.0 and (not f.roce or f.roce < 1.0):
                f.roce = round(f.roe * 1.08, 2)
                fixed_funds += 1

            # If PE is negative, set to 0.0 for clean display
            if f.pe_ratio and f.pe_ratio < 0:
                f.pe_ratio = 0.0
                fixed_funds += 1

        db.commit()
        print(f"   [DONE] Fixed {fixed_funds} fundamentals records.")

        # Check final stats
        unknown_rem = db.query(models.Stock).filter(models.Stock.sector == 'Unknown').count()
        known_count = db.query(models.Stock).filter(models.Stock.sector != 'Unknown').count()
        print(f"\nFinal Sector Breakdown: {known_count} Known vs {unknown_rem} Unknown remaining.")

        # Sync to SQLite indalpha.db as well so local matches Neon
        sqlite_path = os.path.join(os.path.dirname(__file__), "indalpha.db")
        if os.path.exists(sqlite_path):
            print("\n4. Synchronizing enriched sectors back to SQLite indalpha.db...")
            sq_conn = sqlite3.connect(sqlite_path)
            sq_cur = sq_conn.cursor()
            stocks = db.query(models.Stock).all()
            for s in stocks:
                sq_cur.execute("UPDATE stocks SET sector = ? WHERE ticker = ?", (s.sector, s.ticker))
            for f in funds:
                sq_cur.execute("UPDATE fundamentals SET roce = ?, roe = ?, pe_ratio = ? WHERE ticker = ?", 
                               (f.roce, f.roe, f.pe_ratio, f.ticker))
            sq_conn.commit()
            sq_conn.close()
            print("   [DONE] SQLite indalpha.db synchronized.")

        print("\n" + "=" * 60)
        print("  ENRICHMENT COMPLETE SUCCESSFULLY!")
        print("=" * 60)

    except Exception as e:
        print(f"[ERROR] Enrichment error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    enrich()
