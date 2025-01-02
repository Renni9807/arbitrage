import streamlit as st
import pandas as pd
import plotly.express as px
from datetime import datetime
import time
from decimal import Decimal
from fetch_data import fetch_swaps

def calculate_price_from_sqrtPriceX96(
    sqrtPriceX96_str: str,
    token0_symbol="WETH",
    token1_symbol="ARB",
):
    sqrtPriceX96 = Decimal(sqrtPriceX96_str)
    Q96 = Decimal(2) ** Decimal(96)

    # raw ratio (token1 per token0)
    ratio = (sqrtPriceX96 / Q96) ** 2

    if token0_symbol == "WETH" and token1_symbol == "ARB":
        if ratio < 1:
            ratio = 1 / ratio
    else:
        ratio = 1 / ratio

    price = ratio
    return float(price)

def process_swap_logs(logs):
    if not logs:  # Check if logs is empty
        return pd.DataFrame()
        
    data_rows = []
    for s in logs:
        try:
            sqrtPrice = str(s.get("sqrtPriceX96", ""))
            ts = int(s.get("timestamp", 0))
            dex = str(s.get("dexName", "Unknown"))
            
            if not sqrtPrice:
                continue

            dt = datetime.utcfromtimestamp(ts)
            price = calculate_price_from_sqrtPriceX96(sqrtPrice)
            
            data_rows.append({
                "dexName": dex,
                "timestamp": ts,
                "datetime": dt,
                "price": price
            })
        except Exception as e:
            print(f"Error processing log entry: {e}")
            continue

    if not data_rows:  # Check if data_rows is empty
        return pd.DataFrame()

    return pd.DataFrame(data_rows)

def run_app():
    st.title("Real-time Swap Price Monitor")

    # Add auto-refresh settings in sidebar
    with st.sidebar:
        auto_refresh = st.checkbox('Enable auto-refresh', value=True)
        refresh_rate = st.slider('Refresh rate (seconds)', 
                               min_value=1, 
                               max_value=10, 
                               value=3)

    # Create containers for chart and status
    chart_container = st.empty()
    status_container = st.empty()

    try:
        # Fetch latest data from server
        logs = fetch_swaps()
        df = process_swap_logs(logs)
        
        if not df.empty:
            # Sort data before creating chart
            df = df.sort_values(['dexName', 'datetime'])
            
            # Create and configure chart
            fig = px.line(df, 
                         x="datetime", 
                         y="price", 
                         color="dexName",
                         title="Swap Price Trend")
            
            # Update chart layout
            fig.update_layout(
                xaxis_title="Time",
                yaxis_title="Price (ARB/WETH)",
                height=600,
                showlegend=True,
                colorway=['#1f77b4', '#ff7f0e']  # Blue for Uniswap, Orange for Pancakeswap
            )
            
            # Configure line and marker style
            fig.update_traces(
                mode='lines+markers',  # Show both lines and markers
                marker=dict(size=8),
                line=dict(width=2)
            )
            
            # Display chart
            chart_container.plotly_chart(fig, use_container_width=True)
            
            # Update status timestamp
            status_container.text(f"Last updated: {datetime.now().strftime('%H:%M:%S')}")

        # Handle auto-refresh
        if auto_refresh:
            time.sleep(refresh_rate)
            st.rerun()

    except Exception as e:
        st.error(f"Error updating data: {str(e)}")

if __name__ == "__main__":
    run_app()