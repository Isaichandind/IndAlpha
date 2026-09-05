import math

def _safe(val, default=0.0):
    """Return a safe float value, handling None, NaN, and Inf."""
    if val is None:
        return default
    try:
        f = float(val)
        if math.isnan(f) or math.isinf(f):
            return default
        return f
    except (TypeError, ValueError):
        return default

def calculate_alpha_score(stock, fundamentals, technicals):
    if not fundamentals or not technicals:
        return 0.0

    # Safe accessors for nullable DB fields
    roce = _safe(fundamentals.roce)
    roe = _safe(fundamentals.roe)
    pe = _safe(fundamentals.pe_ratio)
    de = _safe(fundamentals.debt_to_equity)
    promoter = _safe(fundamentals.promoter_holding)
    pledged = _safe(fundamentals.pledged_promoter)
    rsi = _safe(technicals.rsi_14, 50.0)  # Default to neutral RSI
    ema_50 = _safe(technicals.ema_50)
    ema_200 = _safe(technicals.ema_200)
    delivery = _safe(technicals.delivery_volume)
    ltp = _safe(stock.ltp)
    mcap = _safe(stock.market_cap)

    # --- Fundamental Score (Max 100) ---
    # ROCE: > 20% is excellent
    roce_score = min(roce / 25.0 * 100, 100) if roce > 0 else 0
    # ROE: > 15% is excellent
    roe_score = min(roe / 20.0 * 100, 100) if roe > 0 else 0
    # PE Ratio: Lower is better (ideal < 30, penalty if > 50)
    pe_score = max(100 - (pe / 60.0 * 100), 0) if pe > 0 else 100
    # Debt to Equity: Lower is better (ideal < 0.5)
    debt_score = max(100 - (de * 100), 0)
    # Promoter Holding: Higher is better (ideal > 50%)
    promoter_score = min(promoter * 1.5, 100)
    # Pledged Promoter: Lower is better (0 is ideal)
    pledge_score = max(100 - (pledged * 10), 0)

    fundamental_score = (roce_score * 0.25 + roe_score * 0.2 + pe_score * 0.2 + 
                         debt_score * 0.15 + promoter_score * 0.1 + pledge_score * 0.1)

    # --- Technical Score (Max 100) ---
    # Momentum (RSI) - Sweet spot around 60
    rsi_score = max(100 - abs(rsi - 60) * 2, 0)
    
    # Moving Averages
    ema_50_score = 15 if ltp > ema_50 and ema_50 > 0 else 0
    ema_200_score = 15 if ltp > ema_200 and ema_200 > 0 else 0
    
    # Delivery Volume - Higher is better
    delivery_score = min(delivery / 70.0 * 100, 100) * 0.5
    
    # Supertrend
    supertrend_score = 20 if technicals.supertrend_bullish else 0
    
    technical_score = rsi_score * 0.3 + ema_50_score + ema_200_score + delivery_score + supertrend_score
    technical_score = min(technical_score, 100)

    # Composite Alpha Score
    composite_score = (fundamental_score * 0.65) + (technical_score * 0.35)
    
    # Professional Data Quality Penalty
    # If Market Cap is 0 (missing data from API/Exchange), heavily penalize the stock 
    # to drop it from the top screener results since its fundamentals are unreliable.
    if mcap <= 0:
        composite_score = composite_score * 0.25 # 75% penalty
    
    return round(composite_score)

