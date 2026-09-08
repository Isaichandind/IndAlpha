import yfinance as yf
from database import SessionLocal
import models
from seed import seed_db

def seed_mutual_funds():
    db = SessionLocal()
    
    # 1. USA Mutual Funds
    usa_mfs = ['VFIAX', 'VTSAX', 'FXAIX', 'SWPPX', 'FZROX']
    print(f"Seeding {len(usa_mfs)} USA Mutual Funds...")
    seed_db(usa_mfs)
    db.query(models.Stock).filter(models.Stock.ticker.in_(usa_mfs)).update({
        'country': 'USA',
        'currency': 'USD',
        'asset_type': 'MUTUALFUND'
    }, synchronize_session=False)
    
    # 2. Indian Mutual Funds (Index Funds)
    # Using some known Yahoo Finance tickers for Indian MFs
    india_mfs = [
        '0P0000XVUA.BO', # UTI Nifty Index Fund
        '0P0000XW8F.BO', # SBI Nifty Index Fund
        '0P0000YWL1.BO', # ICICI Prudential Nifty Index Fund
        '0P0000XVU6.BO', # HDFC Index Fund Nifty 50
        '0P0000XVYB.BO'  # Nippon India Index Fund
    ]
    print(f"Seeding {len(india_mfs)} Indian Mutual Funds...")
    seed_db(india_mfs)
    db.query(models.Stock).filter(models.Stock.ticker.in_(india_mfs)).update({
        'country': 'India',
        'currency': 'INR',
        'asset_type': 'MUTUALFUND'
    }, synchronize_session=False)
    
    # 3. China Mutual Funds
    # Chinese mutual funds are tricky on Yahoo Finance. Let's add a few Chinese ETFs that act as index funds
    # and maybe some known mutual funds if any. We will just add some ETFs and classify as ETFs since China MFs are rare on YF.
    china_index_etfs = ['ASHR', 'KWEB', 'MCHI', 'FXI']
    print(f"Seeding {len(china_index_etfs)} China Index ETFs...")
    seed_db(china_index_etfs)
    db.query(models.Stock).filter(models.Stock.ticker.in_(china_index_etfs)).update({
        'country': 'China',
        'currency': 'USD',
        'asset_type': 'ETF'
    }, synchronize_session=False)

    db.commit()
    db.close()
    print("Seeding complete.")

if __name__ == '__main__':
    seed_mutual_funds()
