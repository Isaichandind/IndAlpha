import os
import json
from fastapi.testclient import TestClient
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__))))

from main import app, run_fast_seed

print("Running fast seed to ensure data exists...")
run_fast_seed()

client = TestClient(app)

print("Creating mock_data directory...")
out_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend", "public", "mock_data"))
os.makedirs(out_dir, exist_ok=True)

print("Fetching indices...")
res = client.get("/api/market/indices")
with open(os.path.join(out_dir, "indices.json"), "w") as f:
    json.dump(res.json(), f)

print("Fetching stocks...")
res = client.post("/api/screener/filter", json={})
with open(os.path.join(out_dir, "stocks.json"), "w") as f:
    json.dump(res.json(), f)

print("Fetching movers...")
res = client.get("/api/market/movers")
with open(os.path.join(out_dir, "movers.json"), "w") as f:
    json.dump(res.json(), f)
    
print("Mock data generated successfully in", out_dir)
