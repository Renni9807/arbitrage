# Trading Bot & Streamlit Visualization

### Overview

This project demonstrates a **flash-loan arbitrage bot** across multiple DEXes (Uniswap V3 & Pancakeswap V3) with the following features:

1. **Smart Contract**: `Arbitrage.sol` for orchestrating a Balancer flash loan and performing 2 swaps.
2. **Hardhat**: for local development, testing, and forking mainnet.
3. **Express Server**: storing swap event logs (`/api/trade-logs`) so that Streamlit can visualize them.
4. **NodeJS Bot**: (`bot.js`) that subscribes to “Swap” events on Uniswap/Pancakeswap, checks for arbitrage, and logs `sqrtPriceX96` to Express.
5. **Streamlit App**: (`python_app/streamlit_app.py`) which fetches logs (including `sqrtPriceX96`) from the Express server, calculates real-world token prices, and plots a real-time chart.

Below is a step-by-step guide to set up the entire system, plus deeper explanations of each script/file.

---

### Technology Stack & Tools

- **Solidity** (Smart Contract)
- **Javascript** (Node.js for Bot & Express)
- **Hardhat** (Development Framework for Solidity)
- **Ethers.js** (Blockchain interaction)
- **[Alchemy](https://www.alchemy.com/)** (Blockchain connection)
- **Balancer** (Flash Loan Provider)
- **Uniswap V3** (DEX for token swaps)
- **Pancakeswap V3** (Another DEX for token swaps)
- **Express.js** (Server to store swap logs)
- **Streamlit** (Python-based UI for data visualization)

---

### Why Visualization Matters

In traditional finance, arbitrage is often done via HFT (High-Frequency Trading). However, blockchain introduces additional overhead, meaning pure speed (HFT) might not be as critical as in TradFi. Instead, algorithmic trading becomes more important, including deeper strategy and analytics rather than simple ultra-fast executions.

That's why visualizing these data points — for instance, sqrtPriceX96 over time and real-time swap logs — can help you see trends, do further algorithmic or Monte Carlo simulations, and incorporate advanced logic.

Even for a “simple” arbitrage, preventing losses is paramount, and good visualization helps confirm whether certain trades are truly profitable, or if the net outcome over time remains positive. If you expand to perpetual DEXes or delta-one products, algorithmic approaches and chart-based analytics can become even more crucial

### Setting Up

1. **Install Dependencies**

   ```bash
   npm install
   ```

   (Also ensure you have Python 3 + pip install streamlit for the Streamlit part.)

2. Create & Setup .env In your root folder, create a .env file:

ALCHEMY_API_KEY="YourAlchemyKey"
PRIVATE_KEY="0xyourPrivateKey"

If using Hardhat fork mode or connecting to Arbitrum/Ethereum mainnet, ensure these values are correct.

3. Hardhat Node (Optional) If you want local/fork testing:

- npx hardhat node

Then in another terminal:

- npx hardhat run scripts/deploy.js --network localhost
  (Or if you’re connecting to arbitrum instead of localhost, see hardhat.config.js.)

4. Start Express Server Open a new terminal:

- cd server
- nodemon server.js

The server listens on port 5001.
Swap logs are stored in an in-memory array inside server.js by default.

5. Start the Bot In another terminal:

cd server
nodemon bot.js

This bot does the following:

- Subscribes to Uniswap/Pancakeswap Swap events.
- For each Swap, POST a JSON log to http://localhost:5001/api/trade-logs, including sqrtPriceX96, amount0, timestamp.
- Checks whether the price difference between two DEXes is above a threshold. If so, runs executeTrade() on the deployed Arbitrage.sol.

6. (Optional) Manipulate Price For local or forked testing:

- npx hardhat run scripts/manipulate.js --network localhost
  This uses an unlocked account to do swaps that shift the pool price artificially.

7. Streamlit Visualization In a third terminal:

- cd python_app
- python main.py streamlit

By default, Streamlit starts on port 8501.
Open http://localhost:8501 in your browser, press “Fetch & Visualize”.
Streamlit calls fetch_swaps() → /api/trade-logs → displays price data from sqrtPriceX96.

## If you want auto-refresh every X seconds, you can incorporate st.autorefresh logic in Streamlit.

# Trading Bot & Streamlit Visualization

### Overview

This project demonstrates a **flash-loan arbitrage bot** across multiple DEXes (Uniswap V3 & Pancakeswap V3) with the following features:

1. **Smart Contract**: `Arbitrage.sol` for orchestrating a Balancer flash loan and performing 2 swaps.
2. **Hardhat**: for local development, testing, and forking mainnet.
3. **Express Server**: storing swap event logs (`/api/trade-logs`) so that Streamlit can visualize them.
4. **NodeJS Bot**: (`bot.js`) that subscribes to “Swap” events on Uniswap/Pancakeswap, checks for arbitrage, and logs `sqrtPriceX96` to Express.
5. **Streamlit App**: (`python_app/streamlit_app.py`) which fetches logs (including `sqrtPriceX96`) from the Express server, calculates real-world token prices, and plots a real-time chart.

Below is a step-by-step guide to set up the entire system, plus deeper explanations of each script/file.

---

### Technology Stack & Tools

- **Solidity** (Smart Contract)
- **Javascript** (Node.js for Bot & Express)
- **Hardhat** (Development Framework for Solidity)
- **Ethers.js** (Blockchain interaction)
- **[Alchemy](https://www.alchemy.com/)** (Blockchain connection)
- **Balancer** (Flash Loan Provider)
- **Uniswap V3** (DEX for token swaps)
- **Pancakeswap V3** (Another DEX for token swaps)
- **Express.js** (Server to store swap logs)
- **Streamlit** (Python-based UI for data visualization)

### Setting Up

1. **Install Dependencies**
   ```bash
   npm install
   (Also ensure you have Python 3 + pip install streamlit for the Streamlit part.)
   ```

Create & Setup .env In your root folder, create a .env file:

ALCHEMY_API_KEY="YourAlchemyKey"
PRIVATE_KEY="0xyourPrivateKey"
If using Hardhat fork mode or connecting to Arbitrum/Ethereum mainnet, ensure these values are correct.

Hardhat Node (Optional) If you want local/fork testing:

npx hardhat node
Then in another terminal:

npx hardhat run scripts/deploy.js --network localhost
(Or if you’re connecting to arbitrum instead of localhost, see hardhat.config.js.)

Start Express Server Open a new terminal:

cd server
nodemon server.js
The server listens on port 5001.
Swap logs are stored in an in-memory array inside server.js by default.
Start the Bot In another terminal:

cd server
nodemon bot.js
This bot does the following:
Subscribes to Uniswap/Pancakeswap Swap events.
For each Swap, POST a JSON log to http://localhost:5001/api/trade-logs, including sqrtPriceX96, amount0, timestamp.
Checks whether the price difference between two DEXes is above a threshold. If so, runs executeTrade() on the deployed Arbitrage.sol.
(Optional) Manipulate Price For local or forked testing:

npx hardhat run scripts/manipulate.js --network localhost
This uses an unlocked account to do swaps that shift the pool price artificially.

Streamlit Visualization In a third terminal:

cd python_app
python main.py streamlit
By default, Streamlit starts on port 8501.
Open http://localhost:8501 in your browser, press “Fetch & Visualize”.
Streamlit calls fetch_swaps() → /api/trade-logs → displays price data from sqrtPriceX96.
If you want auto-refresh every X seconds, you can incorporate st.autorefresh logic in Streamlit.

About config.json
PROJECT_SETTINGS:

isLocal: true or false. If false, connects to mainnet.
isDeployed: If true, the bot actually calls the executeTrade() on Arbitrage.sol. If false, it only simulates or logs.
ARBITRAGE_ADDRESS: Address of deployed Arbitrage.sol.
PRICE_UNITS: Decimals to display for price logs.
PRICE_DIFFERENCE: Minimum difference (%) to proceed with trade.
GAS_LIMIT, GAS_PRICE: Hard-coded gas estimates for logs.
TOKENS:

ARB_FOR: The token you’re trying to get (e.g. WETH).
ARB_AGAINST: The token you’re giving up (e.g. ARB).
POOL_FEE: e.g. 500 for Uniswap V3 pool fee.
UNISWAP / PANCAKESWAP:

QUOTER_V3, FACTORY_V3, ROUTER_V3: the official addresses on your chain (Mainnet, Arbitrum, etc.).

### Anatomy of bot.js

main()
Finds the Uniswap/Pancake pools for your tokens, sets up event listeners for “Swap”.
eventHandler()
On each swap, logs the event to Express (/api/trade-logs) so Streamlit can see it.
Calls checkPrice() → if difference is big → determineProfitability() → if profitable → executeTrade().
checkPrice()
Uses calculatePrice() from helpers/helpers.js to get each pool’s price.
Calculates difference in %.
determineDirection()
Decides which DEX to buy from and which to sell to.
determineProfitability()
Uses the quoter contracts to simulate input/output.
Subtracts gas cost from net gain.
Returns isProfitable + amount.
executeTrade()
Calls the Arbitrage contract’s executeTrade(), which does a Balancer flash loan & 2 swaps if deployed on chain.

### Anatomy of streamlit_app.py

fetch_data.py:
GET http://localhost:5001/api/trade-logs → returns an array of logs.
streamlit_app.py:
For each log, uses calculate_price_from_sqrtPriceX96() to turn sqrtPriceX96 into an actual ARB/WETH price.
Builds a line chart or OHLCV with Plotly.
If you see extremely large or small values, adjust the decimal factors or check whether token0=ARB vs. token1=WETH means you should invert the ratio.

### Local vs. Mainnet Testing

Local:
config.json: "isLocal": true.
npx hardhat node → npx hardhat run scripts/deploy.js --network localhost → nodemon server.js → nodemon bot.js → python main.py streamlit.
Mainnet:
config.json: "isLocal": false.
.env with a valid mainnet/Arbitrum ALCHEMY_API_KEY.
If you have a real ARBITRAGE_ADDRESS, set "isDeployed": true.
Otherwise "isDeployed": false to just log events & skip trades.

Additional Notes
If your price in Streamlit is still “too big or small,” check the token decimals & whether you should invert (sqrtPriceX96 / 2^96)^2.
If you want persistent logs beyond server restarts, modify server.js to write to swap_logs.json or a DB.
For repeated testing, you might need to restart your Hardhat node, redeploy the contract, and rerun bot.js.
