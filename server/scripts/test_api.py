"""Test the Chronos prediction API"""
import requests
import json

# Test prediction endpoint
url = "http://localhost:8000/api/oracle/predict"
data = {
    "user_id": "test123",
    "time_range": "2025-02-01_to_2025-02-07"
}

print("Testing Chronos prediction API...")
print(f"Request: {json.dumps(data, indent=2)}\n")

response = requests.post(url, json=data)

print(f"Status Code: {response.status_code}")
print(f"\nResponse:")
print(json.dumps(response.json(), indent=2))
