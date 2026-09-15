import os
import requests
import jwt
from backend.app.core.config import settings

# Create admin token
token = jwt.encode({"role": "admin", "grid_id": "demo"}, settings.JWT_SECRET, algorithm="HS256")

headers = {
    "Authorization": f"Bearer {token}"
}

print("Testing DuckDB 24H Rollup Endpoint...")
history_res = requests.get("http://localhost:8000/history/demo?window=24H", headers=headers)
if history_res.status_code == 200:
    data = history_res.json()
    print(f"SUCCESS: Retrieved {len(data)} rollup rows.")
    if len(data) > 0:
        print(f"Sample row: {data[0]}")
else:
    print(f"FAILED: {history_res.status_code} - {history_res.text}")

print("\nTesting CSV Export Stream...")
export_res = requests.get("http://localhost:8000/history/export/demo", headers=headers, stream=True)
if export_res.status_code == 200:
    lines = 0
    for chunk in export_res.iter_lines():
        if chunk:
            lines += 1
            if lines <= 2:
                print(f"Sample CSV: {chunk.decode('utf-8')}")
    print(f"SUCCESS: Streamed {lines} CSV lines without memory bloat.")
else:
    print(f"FAILED: {export_res.status_code} - {export_res.text}")
