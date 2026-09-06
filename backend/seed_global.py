import time
from datetime import datetime
import yfinance as yf
from database import engine, SessionLocal, Base
import models

def seed_global():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    
    # Define top ETFs and stocks for USA and China
    global_assets = [
        # USA ETFs
        ("SPY", "SPDR S&P 500 ETF Trust", "USA", "ETF"),
        ("QQQ", "Invesco QQQ Trust", "USA", "ETF"),
        ("VTI", "Vanguard Total Stock Market ETF", "USA", "ETF"),
        # USA Stocks
        ("AAPL", "Apple Inc.", "USA", "EQUITY"),
        ("MSFT", "Microsoft Corporation", "USA", "EQUITY"),
        ("NVDA", "NVIDIA Corporation", "USA", "EQUITY"),
        ("TSLA", "Tesla, Inc.", "USA", "EQUITY"),
        ("AMZN", "Amazon.com, Inc.", "USA", "EQUITY"),
        
        # China ETFs
        ("MCHI", "iShares MSCI China ETF", "China", "ETF"),
        ("KWEB", "KraneShares CSI China Internet ETF", "China", "ETF"),
        ("FXI", "iShares China Large-Cap ETF", "China", "ETF"),
        # China Stocks (ADRs)
        ("BABA", "Alibaba Group Holding", "China", "EQUITY"),
        ("JD", "JD.com, Inc.", "China", "EQUITY"),
        ("PDD", "PDD Holdings Inc.", "China", "EQUITY"),
        ("TCEHY", "Tencent Holdings", "China", "EQUITY"),
        ("NIO", "NIO Inc.", "China", "EQUITY"),
        
        # India ETFs (To demonstrate the asset type filter for India)
        ("NIFTYBEES.NS", "Nippon India ETF Nifty 50 BeES", "India", "ETF"),
        ("BANKBEES.NS", "Nippon India ETF Bank BeES", "India", "ETF"),
        ("LIQUIDBEES.NS", "Nippon India ETF Liquid BeES", "India", "ETF")
    ]
    
    current_date_str = datetime.now().strftime("%Y-%m-%d")
    
    for ticker, name, country, asset_type in global_assets:
        print(f"Fetching {ticker}...")
        try:
            yt = yf.Ticker(ticker)
            info = yt.info
            
            stock = db.query(models.Stock).filter(models.Stock.ticker == ticker).first()
            if not stock:
                stock = models.Stock(ticker=ticker)
                db.add(stock)
                
            stock.company_name = name
            stock.country = country
            stock.asset_type = asset_type
            stock.sector = info.get('sector', 'ETF' if asset_type == 'ETF' else 'Unknown')
            
            ltp = info.get('currentPrice') or info.get('navPrice') or info.get('previousClose') or 0.0
            stock.ltp = ltp
            
            market_cap = info.get('marketCap') or info.get('navPrice', 0) * info.get('totalAssets', 0) or 0
            if market_cap > 0:
                market_cap = market_cap / 10000000 # Convert to Cr
            stock.market_cap = market_cap
            stock.last_updated_date = current_date_str
            stock.currency = info.get('currency', 'USD')
            
            fund = db.query(models.Fundamentals).filter(models.Fundamentals.ticker == ticker).first()
            if not fund:
                fund = models.Fundamentals(ticker=ticker)
                db.add(fund)
            
            fund.roce = info.get('returnOnEquity', 0) * 100 if info.get('returnOnEquity') else 0
            fund.roe = info.get('returnOnEquity', 0) * 100 if info.get('returnOnEquity') else 0
            fund.pe_ratio = info.get('trailingPE', 0)
            fund.debt_to_equity = info.get('debtToEquity', 0) / 100 if info.get('debtToEquity') else 0
            fund.promoter_holding = info.get('heldPercentInsiders', 0) * 100 if info.get('heldPercentInsiders') else 0
            
            tech = db.query(models.Technicals).filter(models.Technicals.ticker == ticker).first()
            if not tech:
                tech = models.Technicals(ticker=ticker)
                db.add(tech)
            
            tech.ema_50 = ltp * 0.95
            tech.ema_200 = ltp * 0.90
            tech.rsi_14 = 55.0
            tech.delivery_volume = 40.0
            
            db.commit()
            print(f"Saved {ticker}")
        except Exception as e:
            print(f"Error for {ticker}: {e}")
            db.rollback()
            
    print("Seeding complete.")

if __name__ == "__main__":
    seed_global()
