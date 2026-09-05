import os
import sys
from datetime import datetime
import pandas as pd

# Adjust Python path to allow imports if run from outside the backend directory
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.orm import Session
from database import SessionLocal
import models
import yfinance as yf

def backfill_history():
    print(f"[{datetime.now()}] Starting historical backfill...")
    db: Session = SessionLocal()
    
    try:
        stocks = db.query(models.Stock).all()
        if not stocks:
            print("No stocks found in database. Exiting.")
            return

        total_stocks = len(stocks)
        print(f"Found {total_stocks} stocks to backfill.")

        batch_size = 100
        for i in range(0, total_stocks, batch_size):
            batch = stocks[i:i + batch_size]
            tickers_list = [stock.ticker for stock in batch]
            tickers_str = " ".join(tickers_list)
            print(f"Backfilling batch {i//batch_size + 1}: {len(batch)} tickers")
            
            try:
                # Fetch 1 month of history for the batch
                data = yf.download(tickers_str, period="1mo", group_by="ticker", auto_adjust=False, threads=True)
                
                new_records = 0
                for stock in batch:
                    ticker = stock.ticker
                    if ticker not in data:
                        continue
                        
                    stock_data = data[ticker] if len(batch) > 1 else data
                    if stock_data.empty:
                        continue
                        
                    # Drop NaN rows initially
                    stock_data = stock_data.dropna(subset=['Close'])
                    
                    # Ensure the index is a DatetimeIndex
                    stock_data.index = pd.to_datetime(stock_data.index)
                    
                    # Resample to calendar days to include weekends/holidays, then forward fill
                    # This ensures missing dates like Sept 1 to 3 (if they were weekends/holidays) are populated with the last known price.
                    stock_data = stock_data.resample('D').asfreq()
                    stock_data['Close'] = stock_data['Close'].ffill()
                    if 'Volume' in stock_data.columns:
                        stock_data['Volume'] = stock_data['Volume'].fillna(0)
                        
                    stock_data['PrevClose'] = stock_data['Close'].shift(1)
                    
                    for date_idx, row in stock_data.iterrows():
                        date_str = date_idx.strftime("%Y-%m-%d")
                        close_price = float(row['Close'])
                        prev_close = float(row['PrevClose']) if pd.notna(row['PrevClose']) else None
                        volume = int(row.get('Volume', 0)) if pd.notna(row.get('Volume', 0)) else 0
                        
                        change_pct = 0.0
                        if prev_close and prev_close > 0:
                            change_pct = float(round(((close_price - prev_close) / prev_close) * 100, 2))
                        
                        # Check if record already exists
                        dp = db.query(models.DailyPerformance).filter(
                            models.DailyPerformance.ticker == ticker,
                            models.DailyPerformance.date == date_str
                        ).first()
                        
                        if not dp:
                            dp = models.DailyPerformance(
                                ticker=ticker,
                                date=date_str,
                                close_price=close_price,
                                change_pct=change_pct,
                                volume=volume
                            )
                            db.add(dp)
                            new_records += 1

                db.commit()
                print(f"  Inserted {new_records} missing historical records for this batch.")
            except Exception as e:
                print(f"  Error processing batch: {e}")
                db.rollback()
                
    finally:
        db.close()
        print("Backfill complete.")

if __name__ == "__main__":
    backfill_history()
