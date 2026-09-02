import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from dotenv import load_dotenv

# Try to load .env.local from parent dir for local dev
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env.local'))

# Default to local SQLite, but allow Render/Neon to inject PostgreSQL
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./indalpha.db")

# Fix Heroku/Render Postgres URL scheme if necessary
if SQLALCHEMY_DATABASE_URL.startswith("postgres://"):
    SQLALCHEMY_DATABASE_URL = SQLALCHEMY_DATABASE_URL.replace("postgres://", "postgresql://", 1)

# Only use check_same_thread for SQLite
connect_args = {"check_same_thread": False} if "sqlite" in SQLALCHEMY_DATABASE_URL else {}

# Connection pooling for PostgreSQL (production)
pool_args = {}
if "postgresql" in SQLALCHEMY_DATABASE_URL:
    pool_args = {
        "pool_size": 5,
        "max_overflow": 10,
        "pool_pre_ping": True,
    }

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args=connect_args, **pool_args
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
