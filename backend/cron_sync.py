import os
import sys
from datetime import datetime

# Adjust Python path to allow imports if run from outside the backend directory
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.orm import Session
from database import SessionLocal
import models
import yfinance as yf

def sync_all_stocks():
    print(f"[{datetime.now()}] Starting automated cron sync pipeline...")
    db: Session = SessionLocal()
    
    try:
        stocks = db.query(models.Stock).all()
        if not stocks:
            print("No stocks found in database. Exiting.")
            return

        total_stocks = len(stocks)
        print(f"Found {total_stocks} stocks to sync.")

        # Batching logic to prevent timeouts / excessive memory
        batch_size = 200
        for i in range(0, total_stocks, batch_size):
            batch = stocks[i:i + batch_size]
            tickers_str = " ".join([stock.ticker for stock in batch])
            print(f"Syncing batch {i//batch_size + 1}: {len(batch)} tickers")
            
            try:
                yf_tickers = yf.Tickers(tickers_str)
                for stock in batch:
                    try:
                        info = yf_tickers.tickers[stock.ticker].fast_info
                        
                        # Update LTP and change %
                        stock.ltp = info.last_price
                        prev_close = info.previous_close or 0.0
                        if prev_close > 0:
                            stock.change_pct = round(((stock.ltp - prev_close) / prev_close) * 100, 2)
                        
                        # Safely update market cap (handling yfinance anomalies)
                        mcap = getattr(info, 'market_cap', None)
                        if not mcap or mcap == 0:
                            mcap = getattr(info, 'nonDilutedMarketCap', None)
                        
                        if mcap and mcap > 0:
                            stock.market_cap = mcap / 10000000  # Convert to Crores
                            
                        # Update DailyPerformance history
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
                        pass
                
                # Commit batch
                db.commit()
                print(f"Committed batch {i//batch_size + 1}.")
                
            except Exception as batch_error:
                print(f"Error in batch {i//batch_size + 1}: {batch_error}")
                db.rollback()

        print(f"[{datetime.now()}] Cron sync completed successfully.")
        
    except Exception as e:
        print(f"Critical sync error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    sync_all_stocks()
