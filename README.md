# IndAlpha PRO

IndAlpha PRO is a quantitative and fundamental equity research platform. It leverages AI (via Google Gemini) to evaluate companies using a comprehensive "Level 1 (Financial Health & Ratios) + Level 2 (Operational Moats, Capacity, Governance & Technicals)" framework.

## Features
- **Global Search**: Instantly find stocks and add them to watchlists.
- **Screener & Filters**: Filter stocks by market cap, sector, P/E, ROCE, RSI, and more.
- **Live Market Data**: Watchlists automatically sync and update.
- **AI Engine (Level 2 Analysis)**: Deep dive into operational moats, technical timing, and governance using the Google Gemini model.
- **Financials & Holdings**: Comprehensive data visualization for quarterly results, P&L, and institutional/promoter holdings.

## Architecture
- **Frontend**: React, TypeScript, Vite, TailwindCSS
- **Backend**: Python, FastAPI
- **Database**: SQLite (can be easily swapped to PostgreSQL for production)

## Quick Start (Local Development)

### 1. Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

### 3. API Key
IndAlpha uses Google Gemini for the AI Engine. 
Open the application in your browser (`http://localhost:5173`), click the **Settings ⚙️** icon in the top right, and paste your Gemini API key. It is stored securely in your browser's local storage.

## Live Deployment
For instructions on how to host this application live (e.g., on Vercel and Render), please see [DEPLOYMENT.md](./DEPLOYMENT.md).

## License
Open Source.
