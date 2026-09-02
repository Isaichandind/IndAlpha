import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from routers import screener, watchlists, analysis
from database import engine, SessionLocal
import models
from seed import seed_db
import threading

from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

# Global rate limiter
limiter = Limiter(key_func=get_remote_address)

import threading

def run_fast_seed():
    db = SessionLocal()
    try:
        count = db.query(models.Stock).count()
        if count == 0:
            print("Database is empty. Running fast seed...")
            # Fast seed with Nifty 50 + a few others
            nifty_50 = [
                "RELIANCE.NS", "TCS.NS", "HDFCBANK.NS", "INFY.NS", "ICICIBANK.NS", 
                "HINDUNILVR.NS", "ITC.NS", "SBIN.NS", "BHARTIARTL.NS", "BAJFINANCE.NS",
                "LICHSGFIN.NS", "ZOMATO.NS", "SUZLON.NS", "IREDA.NS", "IRFC.NS"
            ]
            seed_db(symbols_list=nifty_50)
    except Exception as e:
        print(f"Fast seed failed: {e}")
    finally:
        db.close()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables
    models.Base.metadata.create_all(bind=engine)
    # Run seed in background to avoid blocking boot
    threading.Thread(target=run_fast_seed, daemon=True).start()
    yield
    # Shutdown logic if needed

app = FastAPI(title="IndAlpha PRO API", lifespan=lifespan)

# Attach Rate Limiter
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

# Allow specific origins in production, or all origins in local development
frontend_url = os.getenv("FRONTEND_URL", "*")
origins = [frontend_url] if frontend_url != "*" else ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(screener.router, prefix="/api")
app.include_router(watchlists.router, prefix="/api")
app.include_router(analysis.router, prefix="/api")

@app.get("/")
def read_root():
    return {"message": "Welcome to IndAlpha PRO API"}
