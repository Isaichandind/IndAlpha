import yfinance as yf
from database import SessionLocal
import models
from seed import seed_db

# Artificial market caps to force categorization (in Cr equivalent)
# Large Cap >= 20,000
# Mid Cap 5,000 - 19,999.99
# Small Cap 1,000 - 4,999.99
# Micro Cap < 1,000
LARGE_CAP_VAL = 50000.0
MID_CAP_VAL = 10000.0
SMALL_CAP_VAL = 2500.0
MICRO_CAP_VAL = 500.0

FUNDS = [
    # USA
    {'ticker': 'VFIAX', 'cap_val': LARGE_CAP_VAL, 'country': 'USA', 'currency': 'USD', 'type': 'MUTUALFUND'},
    {'ticker': 'VIMAX', 'cap_val': MID_CAP_VAL, 'country': 'USA', 'currency': 'USD', 'type': 'MUTUALFUND'},
    {'ticker': 'VSMAX', 'cap_val': SMALL_CAP_VAL, 'country': 'USA', 'currency': 'USD', 'type': 'MUTUALFUND'},
    {'ticker': 'BRSIX', 'cap_val': MICRO_CAP_VAL, 'country': 'USA', 'currency': 'USD', 'type': 'MUTUALFUND'},
    
    # INDIA
    {'ticker': 'NIFTYBEES.NS', 'cap_val': LARGE_CAP_VAL, 'country': 'India', 'currency': 'INR', 'type': 'ETF'},
    {'ticker': 'MID150BEES.NS', 'cap_val': MID_CAP_VAL, 'country': 'India', 'currency': 'INR', 'type': 'ETF'},
    {'ticker': 'SMALLCAP.NS', 'cap_val': SMALL_CAP_VAL, 'country': 'India', 'currency': 'INR', 'type': 'ETF'},
    {'ticker': 'BSE.NS', 'cap_val': MICRO_CAP_VAL, 'country': 'India', 'currency': 'INR', 'type': 'EQUITY'}, # Stand-in for micro index
    
    # CHINA
    {'ticker': 'FXI', 'cap_val': LARGE_CAP_VAL, 'country': 'China', 'currency': 'USD', 'type': 'ETF'},
    {'ticker': 'ASHR', 'cap_val': MID_CAP_VAL, 'country': 'China', 'currency': 'USD', 'type': 'ETF'},
    {'ticker': 'ECNS', 'cap_val': SMALL_CAP_VAL, 'country': 'China', 'currency': 'USD', 'type': 'ETF'},
    {'ticker': 'CHIQ', 'cap_val': MICRO_CAP_VAL, 'country': 'China', 'currency': 'USD', 'type': 'ETF'}
]

def seed_all_caps():
    db = SessionLocal()
    tickers = [f['ticker'] for f in FUNDS]
    
    print(f"Seeding {len(tickers)} all-cap index funds...")
    seed_db(tickers)
    
    for f in FUNDS:
        db.query(models.Stock).filter(models.Stock.ticker == f['ticker']).update({
            'country': f['country'],
            'currency': f['currency'],
            'asset_type': f['type'],
            'market_cap': f['cap_val']
        }, synchronize_session=False)
        
    db.commit()
    db.close()
    print("Market cap categorization overrides successfully applied!")

if __name__ == '__main__':
    seed_all_caps()
