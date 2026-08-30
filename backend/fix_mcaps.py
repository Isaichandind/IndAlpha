import yfinance as yf
from database import SessionLocal
import models
from sqlalchemy import or_

def fix_missing_market_caps():
    db = SessionLocal()
    stocks = db.query(models.Stock).filter(or_(models.Stock.market_cap == 0, models.Stock.market_cap.is_(None))).all()
    print(f"Found {len(stocks)} stocks with missing market cap.")
    
    updated = 0
    for stock in stocks:
        try:
            ticker = yf.Ticker(stock.ticker)
            mcap = getattr(ticker.fast_info, 'market_cap', 0)
            if mcap and mcap > 0:
                stock.market_cap = mcap / 10000000
                updated += 1
                if updated % 50 == 0:
                    print(f"Updated {updated} market caps...")
        except Exception as e:
            pass
            
    db.commit()
    print(f"Successfully recovered {updated} market caps via fast_info!")
    db.close()

if __name__ == "__main__":
    fix_missing_market_caps()
