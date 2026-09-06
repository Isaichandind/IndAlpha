from sqlalchemy import Column, String, Float, Boolean, ForeignKey, Integer
from sqlalchemy.orm import relationship
from database import Base

class Stock(Base):
    __tablename__ = "stocks"

    ticker = Column(String, primary_key=True, index=True)
    company_name = Column(String, index=True)
    sector = Column(String, index=True)
    ltp = Column(Float)
    change_pct = Column(Float, default=0.0)
    market_cap = Column(Float)
    last_updated_date = Column(String, nullable=True)
    country = Column(String, default="India")
    asset_type = Column(String, default="EQUITY")
    currency = Column(String, default="INR")

    fundamentals = relationship("Fundamentals", back_populates="stock", uselist=False)
    technicals = relationship("Technicals", back_populates="stock", uselist=False)
    institutional = relationship("Institutional", back_populates="stock", uselist=False)
    daily_performance = relationship("DailyPerformance", back_populates="stock", cascade="all, delete-orphan")


class DailyPerformance(Base):
    __tablename__ = "daily_performance"

    id = Column(Integer, primary_key=True, index=True)
    ticker = Column(String, ForeignKey("stocks.ticker"), index=True)
    date = Column(String, index=True) # YYYY-MM-DD
    close_price = Column(Float)
    change_pct = Column(Float)
    volume = Column(Integer)

    stock = relationship("Stock", back_populates="daily_performance")


class Fundamentals(Base):
    __tablename__ = "fundamentals"

    ticker = Column(String, ForeignKey("stocks.ticker"), primary_key=True)
    roce = Column(Float)
    roe = Column(Float)
    pe_ratio = Column(Float)
    debt_to_equity = Column(Float)
    promoter_holding = Column(Float)
    pledged_promoter = Column(Float)
    
    eps = Column(Float)
    dividend_yield = Column(Float)
    pb_ratio = Column(Float)
    book_value = Column(Float)
    last_updated_date = Column(String, nullable=True)

    stock = relationship("Stock", back_populates="fundamentals")


class Technicals(Base):
    __tablename__ = "technicals"

    ticker = Column(String, ForeignKey("stocks.ticker"), primary_key=True)
    rsi_14 = Column(Float)
    ema_50 = Column(Float)
    ema_200 = Column(Float)
    delivery_volume = Column(Float)
    supertrend_bullish = Column(Boolean)

    stock = relationship("Stock", back_populates="technicals")


class Institutional(Base):
    __tablename__ = "institutional"

    ticker = Column(String, ForeignKey("stocks.ticker"), primary_key=True)
    q1_fii = Column(Float)
    q2_fii = Column(Float)
    q3_fii = Column(Float)
    q4_fii = Column(Float)
    q3_dii = Column(Float)
    q3_mf = Column(Float)

    stock = relationship("Stock", back_populates="institutional")

class Watchlist(Base):
    __tablename__ = "watchlists"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    
    items = relationship("WatchlistItem", back_populates="watchlist", cascade="all, delete-orphan")

class WatchlistItem(Base):
    __tablename__ = "watchlist_items"
    
    id = Column(Integer, primary_key=True, index=True)
    watchlist_id = Column(Integer, ForeignKey("watchlists.id"))
    symbol = Column(String)  # e.g., SUZLON.NS
    name = Column(String)
    exchange = Column(String)
    
    watchlist = relationship("Watchlist", back_populates="items")
