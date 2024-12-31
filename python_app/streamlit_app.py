import sys
import os
import time
import requests
import streamlit as st
import pandas as pd
from decimal import Decimal
from datetime import datetime
import plotly.express as px

# For simplicity, assume fetch_data.py is same folder or parent
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from fetch_data import fetch_swaps

def calculate_price_from_sqrtPriceX96(
    sqrtPriceX96_str: str,
    token0_symbol="WETH",   # or "ARB"
    token1_symbol="ARB",    # or "WETH"
):
    from decimal import Decimal
    sqrtPriceX96 = Decimal(sqrtPriceX96_str)
    Q96 = Decimal(2) ** Decimal(96)

    # raw ratio (token1 per token0)
    ratio = (sqrtPriceX96 / Q96) ** 2

    # If the pool's token0=ARB, token1=WETH => ratio = WETH per ARB
    # But if we want ARB per WETH, we do 1/ratio
    # => check if token0_symbol actually is WETH or ARB
    if token0_symbol == "WETH" and token1_symbol == "ARB":
        # ratio is ARB per WETH
        # possibly ratio < 1 => invert? only if it is truly reversed
        if ratio < 1:
            ratio = 1 / ratio
    else:
        # e.g. token0=ARB, token1=WETH => ratio = WETH per ARB
        # but we want ARB per WETH => ratio = 1/ ratio
        ratio = 1 / ratio

    # optional: multiply or divide by 1eXX if decimals differ
    # if both ARB/WETH have 18 decimals, no extra factor needed
    price = ratio
    return float(price)


def run_app():
    st.title("Swap Price Trend (simple line chart)")

    if st.button("Fetch & Visualize"):
        with st.spinner("Fetching logs..."):
            logs = fetch_swaps()  # GET from /api/trade-logs

        st.success(f"Fetched {len(logs)} logs.")
        if not logs:
            st.warning("No logs found.")
            return

        # Build a simple DataFrame with [timestamp, price]
        data_rows = []
        for s in logs:
            sqrtPrice = s.get("sqrtPriceX96", "")
            ts = s.get("timestamp", 0)
            dex = s.get("dexName", "")
            if not sqrtPrice:
                continue

            # convert timestamp -> datetime
            dt = datetime.utcfromtimestamp(ts)
            # calculate price
            price = calculate_price_from_sqrtPriceX96(sqrtPrice)
            
            data_rows.append({
                "dexName": dex,
                "timestamp": ts,
                "datetime": dt,
                "price": price
            })

        df = pd.DataFrame(data_rows)
        if df.empty:
            st.warning("No valid sqrtPriceX96 found in logs.")
            return

        df.sort_values("datetime", inplace=True)

        st.write("Preview of processed data:")
        st.dataframe(df)

        # plot a simple line chart with x=datetime, y=price
        fig = px.line(df, x="datetime", y="price", color="dexName", title="Swap Price Trend")
        fig.update_layout(
            xaxis_title="Time",
            yaxis_title="Price (ARB/WETH or WETH/ARB)",
            height=600
        )
        st.plotly_chart(fig, use_container_width=True)

def main():
    run_app()

if __name__ == "__main__":
    main()
