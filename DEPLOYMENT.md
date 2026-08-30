# Deploying IndAlpha Live

IndAlpha is a full-stack application consisting of a React (Vite) frontend and a Python (FastAPI) backend with an SQLite database. Because it requires a backend and database, it **cannot** be hosted entirely on GitHub Pages. 

To host IndAlpha completely live and for free, we recommend splitting the deployment: 
1. **Frontend**: Vercel (or Netlify / GitHub Pages)
2. **Backend**: Render.com

---

## 1. Backend Deployment (Render.com)

Render provides free hosting for Python web services. 
*Note: Render's free tier uses an ephemeral filesystem. This means the SQLite database will reset to its initial state every time the server sleeps or restarts. For a public demo, this is usually fine, but watchlists will not persist permanently unless you upgrade to a persistent disk or PostgreSQL.*

1. Go to [Render.com](https://render.com/) and sign in with GitHub.
2. Click **New +** and select **Web Service**.
3. Connect your GitHub repository.
4. Fill in the following settings:
   - **Name**: `indalpha-backend` (or similar)
   - **Root Directory**: `backend`
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
5. Click **Create Web Service**.
6. Once deployed, copy your new backend URL (e.g., `https://indalpha-backend.onrender.com`).

---

## 2. Frontend Deployment (Vercel)

Vercel is the easiest and most performant way to host React/Vite frontends for free.

1. Go to [Vercel.com](https://vercel.com/) and sign in with GitHub.
2. Click **Add New** -> **Project**.
3. Import your GitHub repository.
4. In the configuration:
   - **Framework Preset**: Vercel should auto-detect `Vite`.
   - **Root Directory**: Select `frontend` (Click Edit to change the root).
5. Open the **Environment Variables** section and add:
   - Name: `VITE_API_URL`
   - Value: `https://your-backend-url.onrender.com/api` *(Replace with the URL you copied from Render in Step 1!)*
6. Click **Deploy**.

---

## 3. Using the Live App

Once your frontend is live, you can share the link with anyone! 

**What about API Keys?**
To keep your own API keys secure and reduce costs, the live application will not use your personal Gemini API key. Instead, any user visiting your app can click the **Settings** icon (⚙️) in the top right corner and provide their own Google Gemini API key. This key is stored locally in their browser.

## Alternative: Local Deployment

If someone forks the repo and wants to run it locally:
1. They start the backend (`cd backend && uvicorn main:app --reload`)
2. They start the frontend (`cd frontend && npm run dev`)
3. They can add their API Key in the UI just like the live version, or put it in their local environment variables.
