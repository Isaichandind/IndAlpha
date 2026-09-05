import sys
import os

# Append the backend directory to sys.path so Vercel can find the backend modules
backend_dir = os.path.join(os.path.dirname(__file__), '..', 'backend')
sys.path.insert(0, os.path.abspath(backend_dir))

# Import the FastAPI app instance from backend/main.py
from main import app
