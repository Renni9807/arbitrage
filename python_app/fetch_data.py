#################################################################
# python_app/fetch_data.py
# 
# - Fetches the real-time swap logs from local Express server
#   (which are stored in memory).
#################################################################
import requests

def fetch_swaps():
    """
    Fetch logs from Express server at localhost:5001/api/trade-logs
    Returns a list of dict:
      [ { blockNumber, dexName, sqrtPriceX96, amount0, timestamp, ... }, ... ]
    """
    url = "http://localhost:5001/api/trade-logs"
    resp = requests.get(url)
    resp.raise_for_status()
    data = resp.json()
    return data

if __name__ == "__main__":
    logs = fetch_swaps()
    print(f"Fetched {len(logs)} swap logs.")
    if logs:
        print("First log:", logs[0])
