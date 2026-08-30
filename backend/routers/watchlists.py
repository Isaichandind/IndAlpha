from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import yfinance as yf

from database import get_db
import models
import schemas

router = APIRouter()

@router.get("/watchlists", response_model=List[schemas.WatchlistResponse])
def get_watchlists(db: Session = Depends(get_db)):
    watchlists = db.query(models.Watchlist).all()
    # If no watchlists exist, create a default one
    if not watchlists:
        default_wl = models.Watchlist(name="Default Watchlist")
        db.add(default_wl)
        db.commit()
        db.refresh(default_wl)
        watchlists = [default_wl]
        
    return watchlists

@router.post("/watchlists", response_model=schemas.WatchlistResponse)
def create_watchlist(wl: schemas.WatchlistCreate, db: Session = Depends(get_db)):
    db_wl = db.query(models.Watchlist).filter(models.Watchlist.name == wl.name).first()
    if db_wl:
        raise HTTPException(status_code=400, detail="Watchlist with this name already exists")
    
    new_wl = models.Watchlist(name=wl.name)
    db.add(new_wl)
    db.commit()
    db.refresh(new_wl)
    return new_wl

@router.delete("/watchlists/{wl_id}")
def delete_watchlist(wl_id: int, db: Session = Depends(get_db)):
    db_wl = db.query(models.Watchlist).filter(models.Watchlist.id == wl_id).first()
    if not db_wl:
        raise HTTPException(status_code=404, detail="Watchlist not found")
    
    db.delete(db_wl)
    db.commit()
    return {"status": "success", "message": "Watchlist deleted"}

@router.post("/watchlists/{wl_id}/items", response_model=schemas.WatchlistItemResponse)
def add_watchlist_item(wl_id: int, item: schemas.WatchlistItemCreate, db: Session = Depends(get_db)):
    db_wl = db.query(models.Watchlist).filter(models.Watchlist.id == wl_id).first()
    if not db_wl:
        raise HTTPException(status_code=404, detail="Watchlist not found")
        
    # Check if already exists in this watchlist
    existing = db.query(models.WatchlistItem).filter(
        models.WatchlistItem.watchlist_id == wl_id,
        models.WatchlistItem.symbol == item.symbol
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Stock already in watchlist")
        
    new_item = models.WatchlistItem(
        watchlist_id=wl_id,
        symbol=item.symbol,
        name=item.name,
        exchange=item.exchange
    )
    db.add(new_item)
    db.commit()
    db.refresh(new_item)
    return new_item

@router.delete("/watchlists/{wl_id}/items/{symbol}")
def remove_watchlist_item(wl_id: int, symbol: str, db: Session = Depends(get_db)):
    db_item = db.query(models.WatchlistItem).filter(
        models.WatchlistItem.watchlist_id == wl_id,
        models.WatchlistItem.symbol == symbol
    ).first()
    
    if not db_item:
        raise HTTPException(status_code=404, detail="Item not found in watchlist")
        
    db.delete(db_item)
    db.commit()
    return {"status": "success"}

@router.get("/watchlists/{wl_id}/live")
def get_watchlist_live_prices(wl_id: int, db: Session = Depends(get_db)):
    db_wl = db.query(models.Watchlist).filter(models.Watchlist.id == wl_id).first()
    if not db_wl:
        raise HTTPException(status_code=404, detail="Watchlist not found")
        
    items = db_wl.items
    if not items:
        return []
        
    symbols = " ".join([item.symbol for item in items])
    results = []
    
    try:
        tickers = yf.Tickers(symbols)
        for item in items:
            ltp = 0.0
            change_pct = 0.0
            try:
                # yfinance replaces dots if using dictionary access in some versions, but standard is fine
                info = tickers.tickers[item.symbol].fast_info
                ltp = info.last_price
                prev_close = info.previous_close
                if prev_close and prev_close > 0:
                    change_pct = ((ltp - prev_close) / prev_close) * 100
            except Exception:
                pass # gracefully handle missing data for a specific ticker
                
            results.append({
                "id": item.id,
                "watchlist_id": item.watchlist_id,
                "symbol": item.symbol,
                "name": item.name,
                "exchange": item.exchange,
                "ltp": round(ltp, 2),
                "change_pct": round(change_pct, 2)
            })
    except Exception as e:
        print(f"Error fetching live prices: {e}")
        # Return fallback without live prices
        for item in items:
            results.append({
                "id": item.id,
                "watchlist_id": item.watchlist_id,
                "symbol": item.symbol,
                "name": item.name,
                "exchange": item.exchange,
                "ltp": 0.0,
                "change_pct": 0.0
            })
            
    return results
