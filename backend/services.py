import math

def calculate_alpha_score(stock, fundamentals, technicals):
    if not fundamentals or not technicals:
        return 0.0

    # --- Fundamental Score (Max 100) ---
    # ROCE: > 20% is excellent
    roce_score = min(fundamentals.roce / 25.0 * 100, 100) if fundamentals.roce > 0 else 0
    # ROE: > 15% is excellent
    roe_score = min(fundamentals.roe / 20.0 * 100, 100) if fundamentals.roe > 0 else 0
    # PE Ratio: Lower is better (ideal < 30, penalty if > 50)
    pe_score = max(100 - (fundamentals.pe_ratio / 60.0 * 100), 0) if fundamentals.pe_ratio > 0 else 100
    # Debt to Equity: Lower is better (ideal < 0.5)
    debt_score = max(100 - (fundamentals.debt_to_equity * 100), 0)
    # Promoter Holding: Higher is better (ideal > 50%)
    promoter_score = min(fundamentals.promoter_holding * 1.5, 100)
    # Pledged Promoter: Lower is better (0 is ideal)
    pledge_score = max(100 - (fundamentals.pledged_promoter * 10), 0)

    fundamental_score = (roce_score * 0.25 + roe_score * 0.2 + pe_score * 0.2 + 
                         debt_score * 0.15 + promoter_score * 0.1 + pledge_score * 0.1)

    # --- Technical Score (Max 100) ---
    # Momentum (RSI) - Sweet spot around 60
    rsi = technicals.rsi_14
    rsi_score = max(100 - abs(rsi - 60) * 2, 0)
    
    # Moving Averages
    ema_50_score = 15 if stock.ltp > technicals.ema_50 else 0
    ema_200_score = 15 if stock.ltp > technicals.ema_200 else 0
    
    # Delivery Volume - Higher is better
    delivery_score = min(technicals.delivery_volume / 70.0 * 100, 100) * 0.5
    
    # Supertrend
    supertrend_score = 20 if technicals.supertrend_bullish else 0
    
    technical_score = rsi_score * 0.3 + ema_50_score + ema_200_score + delivery_score + supertrend_score
    technical_score = min(technical_score, 100)

    # Composite Alpha Score
    composite_score = (fundamental_score * 0.65) + (technical_score * 0.35)
    
    # Professional Data Quality Penalty
    # If Market Cap is 0 (missing data from API/Exchange), heavily penalize the stock 
    # to drop it from the top screener results since its fundamentals are unreliable.
    if stock.market_cap <= 0:
        composite_score = composite_score * 0.25 # 75% penalty
    
    return round(composite_score)
