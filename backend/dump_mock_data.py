import os
import json
from fastapi.testclient import TestClient
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__))))

from main import app

client = TestClient(app)

print("Preparing mock_data directories...")
public_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend", "public", "mock_data"))
dist_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend", "dist", "mock_data"))
os.makedirs(public_dir, exist_ok=True)

print("Fetching indices...")
indices_data = client.get("/api/market/indices").json()

print("Fetching 2,557 enriched stocks...")
stocks_data = client.post("/api/screener/filter", json={}).json()
print(f"Fetched {len(stocks_data)} stocks.")

print("Fetching movers...")
movers_data = client.get("/api/market/movers").json()

for out_dir in [public_dir, dist_dir]:
    if os.path.exists(os.path.dirname(out_dir)):
        os.makedirs(out_dir, exist_ok=True)
        with open(os.path.join(out_dir, "indices.json"), "w") as f:
            json.dump(indices_data, f)
        with open(os.path.join(out_dir, "stocks.json"), "w") as f:
            json.dump(stocks_data, f)
        with open(os.path.join(out_dir, "movers.json"), "w") as f:
            json.dump(movers_data, f)
        print("Mock data written to", out_dir)

print("Mock data sync complete!")
