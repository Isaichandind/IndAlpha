"""
IndAlpha — High Performance Database Migration Script
Migrates all 2,557 stocks, fundamentals, technicals, institutional records,
and recent daily performance from local SQLite (indalpha.db) to Neon PostgreSQL.
"""
import sys
import os
import sqlite3
import time

sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))
from database import SessionLocal, engine, SQLALCHEMY_DATABASE_URL
import models

def migrate():
    sqlite_path = os.path.join(os.path.dirname(__file__), "indalpha.db")
    if not os.path.exists(sqlite_path):
        print(f"[ERROR] SQLite database not found at {sqlite_path}")
        return

    print("=" * 60)
    print("  IndAlpha: Migrating SQLite -> Neon PostgreSQL")
    print(f"  Target: {SQLALCHEMY_DATABASE_URL[:45]}...")
    print("=" * 60)

    # Ensure tables exist on target
    models.Base.metadata.create_all(bind=engine)
    
    sq_conn = sqlite3.connect(sqlite_path)
    sq_conn.row_factory = sqlite3.Row
    sq_cur = sq_conn.cursor()

    db = SessionLocal()

    try:
        # 1. Migrate Stocks
        print("\n1. Migrating Stocks...")
        sq_cur.execute("SELECT * FROM stocks")
        stocks_rows = sq_cur.fetchall()
        print(f"   Found {len(stocks_rows)} stocks in SQLite.")

        existing_tickers = set(r[0] for r in db.query(models.Stock.ticker).all())
        new_stocks = []
        update_count = 0

        for row in stocks_rows:
            ticker = row['ticker']
            if ticker in existing_tickers:
                # Update existing
                stock = db.query(models.Stock).filter(models.Stock.ticker == ticker).first()
                if stock:
                    stock.company_name = row['company_name']
                    stock.sector = row['sector'] or 'Unknown'
                    stock.ltp = float(row['ltp'] or 0.0)
                    stock.change_pct = float(row['change_pct'] or 0.0)
                    stock.market_cap = float(row['market_cap'] or 0.0)
                    stock.last_updated_date = row['last_updated_date']
                    update_count += 1
            else:
                new_stocks.append(models.Stock(
                    ticker=ticker,
                    company_name=row['company_name'],
                    sector=row['sector'] or 'Unknown',
                    ltp=float(row['ltp'] or 0.0),
                    change_pct=float(row['change_pct'] or 0.0),
                    market_cap=float(row['market_cap'] or 0.0),
                    last_updated_date=row['last_updated_date']
                ))

        if new_stocks:
            db.bulk_save_objects(new_stocks)
        db.commit()
        print(f"   [DONE] Stocks: Inserted {len(new_stocks)}, Updated {update_count}. Total in Neon: {db.query(models.Stock).count()}")

        # 2. Migrate Fundamentals
        print("\n2. Migrating Fundamentals...")
        sq_cur.execute("SELECT * FROM fundamentals")
        fund_rows = sq_cur.fetchall()
        print(f"   Found {len(fund_rows)} fundamentals in SQLite.")

        existing_funds = set(r[0] for r in db.query(models.Fundamentals.ticker).all())
        new_funds = []
        fund_update_count = 0

        for row in fund_rows:
            ticker = row['ticker']
            if ticker in existing_funds:
                fund = db.query(models.Fundamentals).filter(models.Fundamentals.ticker == ticker).first()
                if fund:
                    fund.roce = float(row['roce'] or 0.0)
                    fund.roe = float(row['roe'] or 0.0)
                    fund.pe_ratio = float(row['pe_ratio'] or 0.0)
                    fund.debt_to_equity = float(row['debt_to_equity'] or 0.0)
                    fund.promoter_holding = float(row['promoter_holding'] or 0.0)
                    fund.pledged_promoter = float(row['pledged_promoter'] or 0.0)
                    fund.eps = float(row['eps'] or 0.0)
                    fund.dividend_yield = float(row['dividend_yield'] or 0.0)
                    fund.pb_ratio = float(row['pb_ratio'] or 0.0)
                    fund.book_value = float(row['book_value'] or 0.0)
                    fund.last_updated_date = row['last_updated_date']
                    fund_update_count += 1
            else:
                new_funds.append(models.Fundamentals(
                    ticker=ticker,
                    roce=float(row['roce'] or 0.0),
                    roe=float(row['roe'] or 0.0),
                    pe_ratio=float(row['pe_ratio'] or 0.0),
                    debt_to_equity=float(row['debt_to_equity'] or 0.0),
                    promoter_holding=float(row['promoter_holding'] or 0.0),
                    pledged_promoter=float(row['pledged_promoter'] or 0.0),
                    eps=float(row['eps'] or 0.0),
                    dividend_yield=float(row['dividend_yield'] or 0.0),
                    pb_ratio=float(row['pb_ratio'] or 0.0),
                    book_value=float(row['book_value'] or 0.0),
                    last_updated_date=row['last_updated_date']
                ))

        if new_funds:
            db.bulk_save_objects(new_funds)
        db.commit()
        print(f"   [DONE] Fundamentals: Inserted {len(new_funds)}, Updated {fund_update_count}. Total: {db.query(models.Fundamentals).count()}")

        # 3. Migrate Technicals
        print("\n3. Migrating Technicals...")
        sq_cur.execute("SELECT * FROM technicals")
        tech_rows = sq_cur.fetchall()
        print(f"   Found {len(tech_rows)} technicals in SQLite.")

        existing_techs = set(r[0] for r in db.query(models.Technicals.ticker).all())
        new_techs = []
        tech_update_count = 0

        for row in tech_rows:
            ticker = row['ticker']
            if ticker in existing_techs:
                tech = db.query(models.Technicals).filter(models.Technicals.ticker == ticker).first()
                if tech:
                    tech.rsi_14 = float(row['rsi_14'] or 50.0)
                    tech.ema_50 = float(row['ema_50'] or 0.0)
                    tech.ema_200 = float(row['ema_200'] or 0.0)
                    tech.delivery_volume = float(row['delivery_volume'] or 0.0)
                    tech.supertrend_bullish = bool(row['supertrend_bullish'])
                    tech_update_count += 1
            else:
                new_techs.append(models.Technicals(
                    ticker=ticker,
                    rsi_14=float(row['rsi_14'] or 50.0),
                    ema_50=float(row['ema_50'] or 0.0),
                    ema_200=float(row['ema_200'] or 0.0),
                    delivery_volume=float(row['delivery_volume'] or 0.0),
                    supertrend_bullish=bool(row['supertrend_bullish'])
                ))

        if new_techs:
            db.bulk_save_objects(new_techs)
        db.commit()
        print(f"   [DONE] Technicals: Inserted {len(new_techs)}, Updated {tech_update_count}. Total: {db.query(models.Technicals).count()}")

        # 4. Migrate Institutional
        print("\n4. Migrating Institutional...")
        sq_cur.execute("SELECT * FROM institutional")
        inst_rows = sq_cur.fetchall()
        print(f"   Found {len(inst_rows)} institutional in SQLite.")

        existing_insts = set(r[0] for r in db.query(models.Institutional.ticker).all())
        new_insts = []
        inst_update_count = 0

        for row in inst_rows:
            ticker = row['ticker']
            if ticker in existing_insts:
                inst = db.query(models.Institutional).filter(models.Institutional.ticker == ticker).first()
                if inst:
                    inst.q1_fii = float(row['q1_fii'] or 0.0)
                    inst.q2_fii = float(row['q2_fii'] or 0.0)
                    inst.q3_fii = float(row['q3_fii'] or 0.0)
                    inst.q4_fii = float(row['q4_fii'] or 0.0)
                    inst.q3_dii = float(row['q3_dii'] or 0.0)
                    inst.q3_mf = float(row['q3_mf'] or 0.0)
                    inst_update_count += 1
            else:
                new_insts.append(models.Institutional(
                    ticker=ticker,
                    q1_fii=float(row['q1_fii'] or 0.0),
                    q2_fii=float(row['q2_fii'] or 0.0),
                    q3_fii=float(row['q3_fii'] or 0.0),
                    q4_fii=float(row['q4_fii'] or 0.0),
                    q3_dii=float(row['q3_dii'] or 0.0),
                    q3_mf=float(row['q3_mf'] or 0.0)
                ))

        if new_insts:
            db.bulk_save_objects(new_insts)
        db.commit()
        print(f"   [DONE] Institutional: Inserted {len(new_insts)}, Updated {inst_update_count}. Total: {db.query(models.Institutional).count()}")

        # 5. Migrate Daily Performance (Recent 30 trading days)
        print("\n5. Migrating Recent Daily Performance...")
        # Clean existing daily performance to prevent duplicates
        db.query(models.DailyPerformance).delete()
        db.commit()

        # Get the distinct dates from SQLite (take last 30 dates)
        sq_cur.execute("SELECT DISTINCT date FROM daily_performance ORDER BY date DESC LIMIT 30")
        dates = [r[0] for r in sq_cur.fetchall()]
        if dates:
            min_date = dates[-1]
            print(f"   Transferring daily performance from {min_date} to {dates[0]}...")
            sq_cur.execute("SELECT ticker, date, close_price, change_pct, volume FROM daily_performance WHERE date >= ?", (min_date,))
            dp_rows = sq_cur.fetchall()
            print(f"   Found {len(dp_rows)} records to migrate.")

            chunk_size = 5000
            for i in range(0, len(dp_rows), chunk_size):
                chunk = dp_rows[i:i+chunk_size]
                dp_objs = [
                    models.DailyPerformance(
                        ticker=r['ticker'],
                        date=r['date'],
                        close_price=float(r['close_price'] or 0.0),
                        change_pct=float(r['change_pct'] or 0.0),
                        volume=int(r['volume'] or 0)
                    )
                    for r in chunk
                ]
                db.bulk_save_objects(dp_objs)
                db.commit()
                print(f"   Saved {min(i+chunk_size, len(dp_rows))}/{len(dp_rows)} daily performance records...")

        print(f"   [DONE] Daily Performance Total in Neon: {db.query(models.DailyPerformance).count()}")

        print("\n" + "=" * 60)
        print("  MIGRATION COMPLETE SUCCESSFULLY!")
        print("=" * 60)

    except Exception as e:
        print(f"[ERROR] Migration failed: {e}")
        db.rollback()
        raise
    finally:
        db.close()
        sq_conn.close()

if __name__ == "__main__":
    migrate()
