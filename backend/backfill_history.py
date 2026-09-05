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
                        
                    # Drop NaN rows
                    stock_data = stock_data.dropna(subset=['Close'])
                    
                    for date_idx, row in stock_data.iterrows():
                        date_str = date_idx.strftime("%Y-%m-%d")
                        close_price = row['Close']
                        volume = row['Volume'] if 'Volume' in row else 0
                        
                        # Calculate change_pct based on previous day if available
                        # We can approximate change_pct or calculate it accurately if we have the previous row
                        # For simplicity, yfinance doesn't easily give previous day's close row by row unless we shift
                        # Let's shift the dataframe to get previous close
                    
                    stock_data['PrevClose'] = stock_data['Close'].shift(1)
                    
                    for date_idx, row in stock_data.iterrows():
                        date_str = date_idx.strftime("%Y-%m-%d")
                        close_price = row['Close']
                        prev_close = row['PrevClose']
                        volume = row.get('Volume', 0)
                        
                        change_pct = 0.0
                        if pd.notna(prev_close) and prev_close > 0:
                            change_pct = round(((close_price - prev_close) / prev_close) * 100, 2)
                        
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
