from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from typing import List, Literal, Optional
import os
from google import genai
from google.genai import types

from database import get_db
import models

router = APIRouter()

# Define the Pydantic schema for the LLM output to enforce structured JSON
class Scores(BaseModel):
    composite_score: float = Field(..., ge=0, le=100)
    profitability_score: float = Field(..., ge=0, le=20)
    solvency_score: float = Field(..., ge=0, le=15)
    growth_pipeline_score: float = Field(..., ge=0, le=20)
    business_moat_score: float = Field(..., ge=0, le=20)
    governance_score: float = Field(..., ge=0, le=15)
    technical_timing_score: float = Field(..., ge=0, le=10)

class KeyMetricsSummary(BaseModel):
    pe_vs_industry: str
    pb_ratio: float
    roe_pct: float
    roce_pct: float
    ebitda_margin_pct: float
    debt_to_equity: float
    sales_cagr_3y_pct: float
    pat_cagr_3y_pct: float
    order_book_cr: float
    promoter_holding_pct: float
    promoter_pledge_pct: float
    institutional_holding_pct: float

class OperationalMoatAnalysis(BaseModel):
    integration_structure: str
    technology_advantages: str
    raw_material_risk: Literal["LOW", "MEDIUM", "HIGH"]
    policy_dependency_risk: Literal["LOW", "MEDIUM", "HIGH"]
    esg_standing: str

class TechnicalTimingAnalysis(BaseModel):
    dma_status: Literal["GOLDEN_CROSS", "DEATH_CROSS", "CONSOLIDATION"]
    rsi_14_status: Literal["OVERSOLD_ACCUMULATION", "NEUTRAL", "OVERBOUGHT"]
    recommended_entry_strategy: str

class FundamentalAnalysisResponse(BaseModel):
    ticker: str
    company_name: str
    sector: str
    scores: Scores
    verdict: Literal["STRONG_CONVICTION_BUY", "QUALITY_ACCUMULATE_ON_DIPS", "WATCHLIST_NEUTRAL", "AVOID_OR_EXIT"]
    hard_veto_triggered: bool
    key_metrics_summary: KeyMetricsSummary
    operational_moat_analysis: OperationalMoatAnalysis
    technical_timing_analysis: TechnicalTimingAnalysis
    pros: List[str]
    cons_and_risks: List[str]
    final_rationale: str

SYSTEM_PROMPT = """You are a quantitative and fundamental equity research analyst engine. You evaluate companies using the complete "Level 1 (Financial Health & Ratios) + Level 2 (Operational Moats, Capacity, Governance & Technicals)" framework.

TASK:
Ingest raw company data (financial statements, screeners, earnings call transcripts, order books, technical price indicators), evaluate every metric against the defined scoring matrices, check for hard veto triggers, and generate the standardized JSON response below.

EVALUATION RULES:
1. Double-digit requirement: ROE, ROCE, Sales CAGR (3Y), and PAT CAGR (3Y) must be >= 10% (ideally >= 15%).
2. Solvency: Debt-to-Equity must be <= 0.5 (acceptable up to 1.0 for capital-intensive sectors with clear capex visibility).
3. Hard Veto: If promoter pledging > 10%, immediately set verdict to "AVOID_OR_EXIT" and flag "CRITICAL_PROMOTER_PLEDGE".
4. Moat Check: Verify vertical/horizontal integration, technology transfer partnerships (e.g., Topcon/JVs), order book to revenue ratio, and raw material hedging mechanisms.
5. Anti-Hype Shield: Penalize speculative stocks lacking institutional backing or transparent investor relations calls.
6. Technical Entry: Assess 50/200 DMA trend (Golden/Death cross), 14-day RSI (identify oversold accumulation zones), and volume patterns.
"""

@router.get("/stock/{ticker}/analyze", response_model=FundamentalAnalysisResponse)
def analyze_stock(
    ticker: str, 
    x_gemini_api_key: Optional[str] = Header(None), 
    x_gemini_model: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    stock = db.query(models.Stock).filter(models.Stock.ticker == ticker).first()
    if not stock:
        raise HTTPException(status_code=404, detail="Stock not found")
        
    api_key = x_gemini_api_key
    if not api_key:
        raise HTTPException(status_code=401, detail="GEMINI API Key is required. Please provide it in the X-Gemini-Api-Key header.")
        
    # Construct base metrics string from DB
    fundamentals = stock.fundamentals
    technicals = stock.technicals
    institutional = stock.institutional
    
    # Calculate some derived metrics for the prompt if possible
    fii_dii_pct = 0
    if institutional:
        fii_dii_pct = (institutional.q3_fii or 0) + (institutional.q3_dii or 0) + (institutional.q3_mf or 0)
        
    context_data = f"""
    Target Company: {stock.company_name} ({stock.ticker})
    Sector: {stock.sector}
    LTP: {stock.ltp}
    Market Cap: {stock.market_cap}
    
    Level 1 Base Stats:
    ROCE: {fundamentals.roce if fundamentals else 'N/A'}%
    ROE: {fundamentals.roe if fundamentals else 'N/A'}%
    PE Ratio: {fundamentals.pe_ratio if fundamentals else 'N/A'}
    Debt to Equity: {fundamentals.debt_to_equity if fundamentals else 'N/A'}
    Promoter Holding: {fundamentals.promoter_holding if fundamentals else 'N/A'}%
    Pledged Promoter: {fundamentals.pledged_promoter if fundamentals else 'N/A'}%
    EPS: {fundamentals.eps if fundamentals else 'N/A'}
    PB Ratio: {fundamentals.pb_ratio if fundamentals else 'N/A'}
    Institutional Holding (FII/DII/MF): {fii_dii_pct}%
    
    Technical Indicators:
    RSI (14): {technicals.rsi_14 if technicals else 'N/A'}
    50 DMA: {technicals.ema_50 if technicals else 'N/A'}
    200 DMA: {technicals.ema_200 if technicals else 'N/A'}
    Delivery Volume: {technicals.delivery_volume if technicals else 'N/A'}%
    
    Please use your extensive training data to supplement the missing Level 2 qualitative and operational data (e.g., Order book, Integration, JVs, 3Y CAGRs, ESG).
    """

    try:
        target_model = x_gemini_model or "gemini-3.1-pro-preview"
        client = genai.Client(api_key=api_key)
        response = client.models.generate_content(
            model=target_model,
            contents=[
                types.Part.from_text(text=SYSTEM_PROMPT),
                types.Part.from_text(text=context_data)
            ],
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=FundamentalAnalysisResponse,
                temperature=0.2,
            )
        )
        
        # The response.text is already guaranteed to match the schema
        import json
        result_dict = json.loads(response.text)
        return result_dict
        
    except Exception as e:
        print(f"Gemini API Error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate analysis: {str(e)}")

class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str

class ChatRequest(BaseModel):
    messages: List[ChatMessage]

@router.post("/chat")
def chat_with_ai(
    request: ChatRequest,
    x_gemini_api_key: Optional[str] = Header(None),
    x_gemini_model: Optional[str] = Header(None)
):
    api_key = x_gemini_api_key
    if not api_key:
        raise HTTPException(status_code=401, detail="GEMINI API Key is required. Please provide it in the X-Gemini-Api-Key header.")
        
    try:
        # Use a faster, lighter model for general chat if possible, or fallback to the provided one
        target_model = x_gemini_model or "gemini-3.1-flash"
        client = genai.Client(api_key=api_key)
        
        # Format history for Gemini API
        contents = []
        for msg in request.messages:
            # Gemini roles are 'user' and 'model'
            role = "user" if msg.role == "user" else "model"
            contents.append(
                types.Content(role=role, parts=[types.Part.from_text(text=msg.content)])
            )
            
        system_instruction = "You are Alpha AI, a professional financial AI assistant for the IndAlpha stock market platform. You help users analyze the markets, understand financial metrics, and make data-driven decisions. Keep your answers concise, accurate, and professional."
            
        response = client.models.generate_content(
            model=target_model,
            contents=contents,
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                temperature=0.7,
            )
        )
        return {"reply": response.text}
    except Exception as e:
        print(f"Gemini Chat Error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate chat response: {str(e)}")
