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

def calculate_alpha_score(stock, fundamentals, technicals, fundamental_weight: int = 65, country: str = "India"):
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

    # Base Scores (0-100)
    roce_score = min(roce / 25.0 * 100, 100) if roce > 0 else 0
    roe_score = min(roe / 20.0 * 100, 100) if roe > 0 else 0
    pe_score = max(100 - (pe / 60.0 * 100), 0) if pe > 0 else 100
    debt_score = max(100 - (de * 100), 0)
    promoter_score = min(promoter * 1.5, 100)
    pledge_score = max(100 - (pledged * 10), 0)

    # Adjust weights based on region
    if country == "USA":
        # US Market: De-emphasize promoter holding (institutions rule). Focus on profitability & technicals.
        fundamental_score = (roce_score * 0.35 + roe_score * 0.3 + pe_score * 0.2 + 
                             debt_score * 0.15)
        # Momentum (RSI) is more important in US tech
        rsi_score = max(100 - abs(rsi - 60) * 2, 0)
        tech_weight_modifier = 1.1 # US respects momentum more
    elif country == "China":
        # China Market: Higher state-debt tolerance, pure valuation focus.
        fundamental_score = (roce_score * 0.3 + roe_score * 0.25 + pe_score * 0.3 + 
                             debt_score * 0.05 + promoter_score * 0.1)
        rsi_score = max(100 - abs(rsi - 50) * 2.5, 0) # Mean reversion
        tech_weight_modifier = 1.0
    else:
        # India Market (Default): Strict on promoter holding, debt, and pledges
        fundamental_score = (roce_score * 0.25 + roe_score * 0.2 + pe_score * 0.2 + 
                             debt_score * 0.15 + promoter_score * 0.1 + pledge_score * 0.1)
        rsi_score = max(100 - abs(rsi - 60) * 2, 0)
        tech_weight_modifier = 1.0

    # --- Technical Score (Max 100) ---
    ema_50_score = 15 if ltp > ema_50 and ema_50 > 0 else 0
    ema_200_score = 15 if ltp > ema_200 and ema_200 > 0 else 0
    delivery_score = min(delivery / 70.0 * 100, 100) * 0.5
    supertrend_score = 20 if technicals.supertrend_bullish else 0
    
    technical_score = (rsi_score * 0.3 + ema_50_score + ema_200_score + 
                       delivery_score + supertrend_score)
    technical_score = min(technical_score * tech_weight_modifier, 100)

    # Composite Alpha Score
    tech_weight = 100 - fundamental_weight
    composite_score = (fundamental_score * (fundamental_weight / 100.0)) + (technical_score * (tech_weight / 100.0))
    
    # Professional Data Quality Penalty
    # If Market Cap is 0, penalize heavily.
    if mcap <= 0:
        composite_score = composite_score * 0.25
    
    return round(composite_score)

