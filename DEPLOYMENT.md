# Deploying IndAlpha Live

IndAlpha is a full-stack application consisting of a React (Vite) frontend and a Python (FastAPI) backend with an SQLite database. Because it requires a backend and database, it **cannot** be hosted entirely on GitHub Pages. 

To host IndAlpha completely live and for free, we recommend splitting the deployment: 
1. **Frontend**: Vercel (or Netlify / GitHub Pages)
2. **Backend**: Render.com

---

## 1. Backend Deployment (Render.com)

Render provides free hosting for Python web services. 
*Note: Render's free tier uses an ephemeral filesystem. This means the SQLite database will reset to its initial state every time the server sleeps or restarts. The application includes a "Fast Boot Seeder" that will automatically populate the top 50 stocks when it detects an empty database on startup.*

**For Professional/Persistent Usage:**
To prevent your watchlists and custom data from wiping on sleep, you must connect a persistent database:
1. Create a free PostgreSQL database on Render (or use Supabase/Neon).
2. Add the `DATABASE_URL` environment variable to your Web Service pointing to your new PostgreSQL instance.
3. The app will automatically create the tables and use the persistent database instead of SQLite.

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

## 2. Frontend Deployment (GitHub Pages or Vercel)

### Option A: Vercel (Recommended, Easiest)
1. Go to [Vercel.com](https://vercel.com/) and sign in with GitHub.
2. Click **Add New** -> **Project**, import your repository.
3. **Framework Preset**: Vercel should auto-detect `Vite`.
4. **Root Directory**: Select `frontend` (Click Edit to change the root).
5. Open the **Environment Variables** section and add:
   - Name: `VITE_API_URL`
   - Value: `https://your-backend-url.onrender.com/api` *(Replace with your URL)*
6. Click **Deploy**.

### Option B: GitHub Pages (Requires GitHub Actions)
GitHub Pages only hosts static files, so we must inject the API URL during the build process using GitHub Actions.

1. In your GitHub repository, go to **Settings** > **Secrets and variables** > **Actions**.
2. Under the **Variables** tab, add a new Repository Variable:
   - Name: `VITE_API_URL`
   - Value: `https://your-backend-url.onrender.com/api`
3. Create a GitHub Actions workflow file in your repo: `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages
on:
  push:
    branches: [ main ]
jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - name: Install and Build
        working-directory: ./frontend
        env:
          VITE_API_URL: ${{ vars.VITE_API_URL }}
        run: |
          npm install
          npm run build
      - name: Deploy
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./frontend/dist
```
4. Push this file to `main`. GitHub Actions will automatically build and deploy your Vite app with the correct backend URL injected!

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
