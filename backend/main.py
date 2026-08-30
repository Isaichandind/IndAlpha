from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import screener, watchlists, analysis

app = FastAPI(title="IndAlpha PRO API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins for local development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(screener.router, prefix="/api")
app.include_router(watchlists.router, prefix="/api")
app.include_router(analysis.router, prefix="/api")

@app.get("/")
def read_root():
    return {"message": "Welcome to IndAlpha PRO API"}
