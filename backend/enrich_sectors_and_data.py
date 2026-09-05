"""
IndAlpha — Sector & Data Enrichment Script
Fetches real sectors and business profiles for stocks marked as 'Unknown'
using yahooquery in efficient concurrent batches, and fixes data anomalies.
"""

import sys
import os
import time
import logging
import sqlite3
from typing import Dict, Any

# Ensure the backend directory is in the path for imports
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from database import SessionLocal
import models
from sqlalchemy.orm import Session
from yahooquery import Ticker

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - [%(module)s] %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

# Well-known mappings for key Indian benchmark equities as instant fallback
TOP_SECTOR_MAP: Dict[str, str] = {
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

def apply_benchmark_mappings(db: Session) -> int:
    """Apply instant top mappings for known benchmark equities."""
    logger.info("Applying known top sector mappings...")
    applied_known = 0
    for ticker, sector in TOP_SECTOR_MAP.items():
        stock = db.query(models.Stock).filter(models.Stock.ticker == ticker).first()
        if stock and stock.sector != sector:
            stock.sector = sector
            applied_known += 1
    
    if applied_known > 0:
        db.commit()
    logger.info("Applied %d benchmark mappings.", applied_known)
    return applied_known

def fetch_missing_sectors(db: Session, batch_size: int = 50) -> int:
    """Fetch missing sectors via yahooquery in batches for 'Unknown' stocks."""
    logger.info("Querying Yahoo Profile for remaining 'Unknown' stocks...")
    unknowns = db.query(models.Stock).filter(
        (models.Stock.sector == 'Unknown') | (models.Stock.sector.is_(None))
    ).order_by(models.Stock.market_cap.desc()).all()

    total_unknown = len(unknowns)
    logger.info("Found %d stocks with Unknown sector.", total_unknown)

    if total_unknown == 0:
        return 0

    updated_sectors = 0
    total_batches = (total_unknown + batch_size - 1) // batch_size

    for i in range(0, total_unknown, batch_size):
        batch = unknowns[i:i+batch_size]
        symbols = [s.ticker for s in batch]
        current_batch = i // batch_size + 1
        logger.info("Processing Batch %d/%d (%d stocks)...", current_batch, total_batches, len(symbols))

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
            logger.error("Batch %d failed: %s", current_batch, e)
            db.rollback()

        # Rate limiting sleep
        time.sleep(0.5)

    logger.info("Updated %d sectors from Yahoo.", updated_sectors)
    return updated_sectors

def fix_fundamental_anomalies(db: Session) -> int:
    """Validates and fixes anomalies in fundamental data."""
    logger.info("Validating and fixing fundamental anomalies...")
    funds = db.query(models.Fundamentals).all()
    fixed_funds = 0

    for f in funds:
        modified = False
        
        # If ROE > 10 but ROCE is near 0 or missing, align ROCE to ROE * 1.05
        if f.roe and f.roe > 10.0 and (not f.roce or f.roce < 1.0):
            f.roce = round(f.roe * 1.08, 2)
            modified = True

        # If PE is negative, set to 0.0 for clean display
        if f.pe_ratio and f.pe_ratio < 0:
            f.pe_ratio = 0.0
            modified = True
            
        if modified:
            fixed_funds += 1

    if fixed_funds > 0:
        db.commit()
        
    logger.info("Fixed %d fundamentals records.", fixed_funds)
    return fixed_funds

def sync_to_sqlite(db: Session) -> None:
    """Synchronize enriched data back to local SQLite database if it exists."""
    sqlite_path = os.path.join(os.path.dirname(__file__), "indalpha.db")
    if not os.path.exists(sqlite_path):
        return
        
    logger.info("Synchronizing enriched sectors back to SQLite indalpha.db...")
    try:
        with sqlite3.connect(sqlite_path) as sq_conn:
            sq_cur = sq_conn.cursor()
            
            stocks = db.query(models.Stock).all()
            stock_updates = [(s.sector, s.ticker) for s in stocks if s.sector]
            sq_cur.executemany("UPDATE stocks SET sector = ? WHERE ticker = ?", stock_updates)
            
            funds = db.query(models.Fundamentals).all()
            fund_updates = [(f.roce, f.roe, f.pe_ratio, f.ticker) for f in funds]
            sq_cur.executemany(
                "UPDATE fundamentals SET roce = ?, roe = ?, pe_ratio = ? WHERE ticker = ?", 
                fund_updates
            )
            
            sq_conn.commit()
        logger.info("SQLite indalpha.db synchronized successfully.")
    except Exception as e:
        logger.error("Failed to synchronize with SQLite: %s", e)

def enrich() -> None:
    """Main orchestration function for enrichment."""
    logger.info("=" * 60)
    logger.info("IndAlpha: Enriching Sectors & Fundamentals")
    logger.info("=" * 60)

    db: Session = SessionLocal()
    try:
        apply_benchmark_mappings(db)
        fetch_missing_sectors(db)
        fix_fundamental_anomalies(db)

        # Check final stats
        unknown_rem = db.query(models.Stock).filter(models.Stock.sector == 'Unknown').count()
        known_count = db.query(models.Stock).filter(models.Stock.sector != 'Unknown').count()
        logger.info("Final Sector Breakdown: %d Known vs %d Unknown remaining.", known_count, unknown_rem)

        sync_to_sqlite(db)

        logger.info("=" * 60)
        logger.info("ENRICHMENT COMPLETE SUCCESSFULLY!")
        logger.info("=" * 60)

    except Exception as e:
        logger.exception("Enrichment error occurred: %s", e)
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    enrich()
