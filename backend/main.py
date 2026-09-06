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

def run_fast_seed():
    db = SessionLocal()
    try:
        count = db.query(models.Stock).count()
        if count == 0:
            print("Database is empty. Migrating universe from master dataset...")
            sqlite_path = os.path.join(os.path.dirname(__file__), "indalpha.db")
            if os.path.exists(sqlite_path):
                from migrate_to_neon import migrate
                migrate()
            else:
                from seed import seed_db
                seed_db()
    except Exception as e:
        print(f"Auto-seed failed: {e}")
    finally:
        db.close()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables
    models.Base.metadata.create_all(bind=engine)
    
    # Auto-migrate missing columns for existing production databases (Render Postgres/SQLite)
    from sqlalchemy import text
    try:
        with engine.begin() as conn:
            # Catch exceptions per column since ADD COLUMN IF NOT EXISTS is not supported uniformly (e.g. SQLite)
            try:
                conn.execute(text("ALTER TABLE stocks ADD COLUMN country VARCHAR DEFAULT 'India'"))
            except Exception:
                pass
            try:
                conn.execute(text("ALTER TABLE stocks ADD COLUMN asset_type VARCHAR DEFAULT 'EQUITY'"))
            except Exception:
                pass
            try:
                conn.execute(text("ALTER TABLE stocks ADD COLUMN currency VARCHAR DEFAULT 'INR'"))
            except Exception:
                pass
            try:
                conn.execute(text("ALTER TABLE stocks ADD COLUMN last_updated_date VARCHAR"))
            except Exception:
                pass
            try:
                conn.execute(text("ALTER TABLE fundamentals ADD COLUMN last_updated_date VARCHAR"))
            except Exception:
                pass

        # Hotfix: Correct USA and China stocks that were mislabeled as 'India' due to seed_global string extraction bug
        db = SessionLocal()
        from seed_global import get_usa_equities, get_china_equities
        usa_symbols = get_usa_equities()
        if usa_symbols:
            db.query(models.Stock).filter(models.Stock.ticker.in_(usa_symbols)).update({"country": "USA", "currency": "USD"}, synchronize_session=False)
        china_symbols = get_china_equities()
        if china_symbols:
            db.query(models.Stock).filter(models.Stock.ticker.in_(china_symbols)).update({"country": "China"}, synchronize_session=False)
            db.query(models.Stock).filter(models.Stock.ticker.in_(china_symbols)).filter(models.Stock.ticker.endswith('.HK')).update({"currency": "HKD"}, synchronize_session=False)
            db.query(models.Stock).filter(models.Stock.ticker.in_(china_symbols)).filter(models.Stock.ticker.endswith('.SS')).update({"currency": "CNY"}, synchronize_session=False)
            db.query(models.Stock).filter(models.Stock.ticker.in_(china_symbols)).filter(models.Stock.ticker.endswith('.SZ')).update({"currency": "CNY"}, synchronize_session=False)
            db.query(models.Stock).filter(models.Stock.ticker.in_(["FXI", "MCHI", "KWEB", "ASHR"])).update({"currency": "USD"}, synchronize_session=False)
        db.commit()
        db.close()
    except Exception as e:
        print(f"Auto-migration or hotfix failed: {e}")

    # Run seed in background to avoid blocking boot
    threading.Thread(target=run_fast_seed, daemon=True).start()
    yield
    # Shutdown logic if needed

app = FastAPI(title="IndAlpha PRO API", lifespan=lifespan)

# Attach Rate Limiter
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

# CORS Configuration — secure by default
# In production, set FRONTEND_URL to your actual frontend domain (e.g. https://indalpha.vercel.app)
frontend_url = os.getenv("FRONTEND_URL", "")
is_production = os.getenv("ENVIRONMENT") == "production"

if frontend_url:
    # Specific origin(s) — safe to use with credentials
    origins = [frontend_url]
    allow_credentials = True
elif is_production:
    # Production without FRONTEND_URL is a misconfiguration — lock down to GitHub Pages
    origins = ["https://isaichandind.github.io"]
    allow_credentials = True
else:
    # Local development — allow all origins but WITHOUT credentials
    # Also explicitly add the github pages URL just in case testing against local/render
    origins = ["*", "https://isaichandind.github.io"]
    allow_credentials = False

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=allow_credentials,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(screener.router, prefix="/api")
app.include_router(watchlists.router, prefix="/api")
app.include_router(analysis.router, prefix="/api")

@app.get("/")
def read_root():
    return {"message": "Welcome to IndAlpha PRO API"}

