import time
from datetime import datetime
import pandas as pd
import requests
import io
import time
from database import engine, SessionLocal, Base
from seed import seed_db, get_all_equities, fetch_fundamentals, calculate_rsi
import models

def get_usa_equities():
    print("Fetching USA Universe (S&P 500 & NASDAQ 100)...")
    symbols = set()
    headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'}
    
    # 1. S&P 500
    try:
        res = requests.get('https://en.wikipedia.org/wiki/List_of_S%26P_500_companies', headers=headers)
        df = pd.read_html(io.StringIO(res.text))[0]
        for sym in df['Symbol']:
            clean_sym = str(sym).replace('.', '-')
            symbols.add(clean_sym)
    except Exception as e:
        print(f"Failed SP500: {e}")
        
    # 2. NASDAQ 100
    try:
        res = requests.get('https://en.wikipedia.org/wiki/Nasdaq-100', headers=headers)
        df = pd.read_html(io.StringIO(res.text), match='Ticker')[0]
        col = 'Ticker' if 'Ticker' in df.columns else df.columns[1]
        for sym in df[col]:
            symbols.add(str(sym))
    except Exception as e:
        print(f"Failed NASDAQ: {e}")
        
    # Add some ETFs
    etfs = ["SPY", "QQQ", "VTI", "VOO", "IVV"]
    for e in etfs:
        symbols.add(e)
        
    print(f"Found {len(symbols)} USA equities/ETFs")
    return list(symbols)

def get_china_equities():
    print("Fetching China Universe (CSI 300 & Hang Seng)...")
    symbols = set()
    headers = {'User-Agent': 'Mozilla/5.0'}
    
    # Hang Seng (Hong Kong) -> requires .HK for Yahoo Finance
    try:
        res = requests.get('https://en.wikipedia.org/wiki/Hang_Seng_Index', headers=headers)
        df = pd.read_html(io.StringIO(res.text), match='Ticker')[0]
        for sym in df['Ticker']:
            code = str(sym).zfill(4)
            symbols.add(f"{code}.HK")
    except Exception as e:
        print(f"Failed Hang Seng: {e}")
        
    # CSI 300 (Mainland China) -> requires .SS or .SZ
    try:
        res = requests.get('https://en.wikipedia.org/wiki/CSI_300_Index', headers=headers)
        df = pd.read_html(io.StringIO(res.text), match='Ticker')[0]
        for _, row in df.iterrows():
            ticker = str(row['Ticker']).zfill(6)
            exchange = str(row.get('Exchange', ''))
            if 'Shanghai' in exchange:
                symbols.add(f"{ticker}.SS")
            elif 'Shenzhen' in exchange:
                symbols.add(f"{ticker}.SZ")
            else:
                if ticker.startswith('6'):
                    symbols.add(f"{ticker}.SS")
                else:
                    symbols.add(f"{ticker}.SZ")
    except Exception as e:
        print(f"Failed CSI 300: {e}")

    # Add some key China ETFs
    etfs = ["FXI", "MCHI", "KWEB", "ASHR"]
    for e in etfs:
        symbols.add(e)
        
    print(f"Found {len(symbols)} China equities/ETFs")
    return list(symbols)

def seed_global():
    Base.metadata.create_all(bind=engine)
    
    # 1. Fetch USA Universe
    usa_symbols = get_usa_equities()
    if usa_symbols:
        # Repurpose the seed_db function from seed.py, but pass the USA list
        seed_db(usa_symbols)
        
        # After seeding, update their country/asset_type in the DB
        db = SessionLocal()
        db.query(models.Stock).filter(models.Stock.ticker.in_(usa_symbols)).update(
            {"country": "USA", "currency": "USD"}, synchronize_session=False
        )
        db.commit()
        db.close()
        
    # 2. Fetch China Universe
    china_symbols = get_china_equities()
    if china_symbols:
        seed_db(china_symbols)
        
        db = SessionLocal()
        db.query(models.Stock).filter(models.Stock.ticker.in_(china_symbols)).update(
            {"country": "China"}, synchronize_session=False
        )
        # HK is HKD, SS/SZ is CNY
        db.query(models.Stock).filter(models.Stock.ticker.in_(china_symbols)).filter(models.Stock.ticker.endswith('.HK')).update(
            {"currency": "HKD"}, synchronize_session=False
        )
        db.query(models.Stock).filter(models.Stock.ticker.in_(china_symbols)).filter(models.Stock.ticker.endswith('.SS')).update(
            {"currency": "CNY"}, synchronize_session=False
        )
        db.query(models.Stock).filter(models.Stock.ticker.in_(china_symbols)).filter(models.Stock.ticker.endswith('.SZ')).update(
            {"currency": "CNY"}, synchronize_session=False
        )
        db.query(models.Stock).filter(models.Stock.ticker.in_(["FXI", "MCHI", "KWEB", "ASHR"])).update(
            {"currency": "USD"}, synchronize_session=False
        )
        db.commit()
        db.close()
        
    # Categorize ETFs
    db = SessionLocal()
            
    print("Seeding complete.")

if __name__ == "__main__":
    seed_global()
