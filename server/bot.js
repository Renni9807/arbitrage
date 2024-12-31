/********************************************************************
 * bot.js
 *
 * 1. Subscribes to "Swap" events on Uniswap/Pancakeswap (V3).
 * 2. On each event => parse sqrtPriceX96, amount0, etc.
 * 3. POST logs to Express server for Streamlit visualization.
 * 4. Check arbitrage => if profitable => executeTrade(Flash Loan).
 ********************************************************************/

require("dotenv").config();
const axios = require("axios");
const { ethers } = require("ethers");
const Big = require("big.js");

// Import config + helpers
const config = require("../config.json");
const {
  getTokenAndContract,
  getPoolContract,
  getPoolLiquidity,
  calculatePrice,
} = require("../helpers/helpers");
const {
  provider,
  uniswap,
  pancakeswap,
  arbitrage,
} = require("../helpers/initialization");

// CONFIG
const ARB_FOR = config.TOKENS.ARB_FOR;
const ARB_AGAINST = config.TOKENS.ARB_AGAINST;
const POOL_FEE = config.TOKENS.POOL_FEE;
const UNITS = config.PROJECT_SETTINGS.PRICE_UNITS;
const PRICE_DIFFERENCE = config.PROJECT_SETTINGS.PRICE_DIFFERENCE;
const GAS_LIMIT = config.PROJECT_SETTINGS.GAS_LIMIT;
const GAS_PRICE = config.PROJECT_SETTINGS.GAS_PRICE;

let isExecuting = false;

/** MAIN */
const main = async () => {
  const { token0, token1 } = await getTokenAndContract(
    ARB_FOR,
    ARB_AGAINST,
    provider
  );
  const uPool = await getPoolContract(
    uniswap,
    token0.address,
    token1.address,
    POOL_FEE,
    provider
  );
  const pPool = await getPoolContract(
    pancakeswap,
    token0.address,
    token1.address,
    POOL_FEE,
    provider
  );

  console.log(`Using ${token1.symbol}/${token0.symbol}\n`);
  console.log(`Uniswap Pool Address: ${await uPool.getAddress()}`);
  console.log(`Pancakeswap Pool Address: ${await pPool.getAddress()}\n`);

  // Listen Swap events
  // Uniswap V3 Swap signature: (sender, recipient, amount0, amount1, sqrtPriceX96, liquidity, tick)
  uPool.on("Swap", async (...args) => {
    // parse arguments
    const [
      sender,
      recipient,
      amount0,
      amount1,
      sqrtPriceX96,
      liquidity,
      tick,
      event,
    ] = args;
    await eventHandler(
      "Uniswap",
      sender,
      recipient,
      amount0,
      amount1,
      sqrtPriceX96,
      event,
      uPool,
      pPool,
      token0,
      token1
    );
  });

  // Pancakeswap V3 (similar signature)
  pPool.on("Swap", async (...args) => {
    const [
      sender,
      recipient,
      amount0,
      amount1,
      sqrtPriceX96,
      liquidity,
      tick,
      event,
    ] = args;
    await eventHandler(
      "Pancakeswap",
      sender,
      recipient,
      amount0,
      amount1,
      sqrtPriceX96,
      event,
      uPool,
      pPool,
      token0,
      token1
    );
  });

  console.log("Waiting for swap event...\n");
};

/** eventHandler: on each Swap => post logs to Express => check arb => if profitable => trade */
async function eventHandler(
  dexName,
  sender,
  recipient,
  amount0,
  amount1,
  sqrtPriceX96,
  event,
  uPool,
  pPool,
  token0,
  token1
) {
  try {
    // get block/timestamp
    const blockNumber = event.blockNumber;
    const block = await provider.getBlock(blockNumber);
    const timestamp = block.timestamp;

    // 1) Post event data to Express => Streamlit can read "sqrtPriceX96", "amount0"
    const logData = {
      dexName,
      blockNumber,
      timestamp,
      sqrtPriceX96: sqrtPriceX96.toString(),
      amount0: amount0.toString(),
      amount1: amount1.toString(),
    };
    await axios.post("http://localhost:5001/api/trade-logs", logData);

    // 2) Check arbitrage if not executing
    if (!isExecuting) {
      isExecuting = true;

      const priceDifference = await checkPrice([uPool, pPool], token0, token1);
      const exchangePath = await determineDirection(priceDifference);

      if (!exchangePath) {
        console.log(`No Arbitrage Currently Available\n`);
        console.log(`-----------------------------------------\n`);
        isExecuting = false;
        return;
      }

      const { isProfitable, amount } = await determineProfitability(
        exchangePath,
        token0,
        token1
      );

      if (!isProfitable) {
        console.log(`No Arbitrage Currently Available\n`);
        console.log(`-----------------------------------------\n`);
        isExecuting = false;
        return;
      }

      // do trade
      await executeTrade(exchangePath, token0, token1, amount);

      isExecuting = false;
      console.log("\nWaiting for swap event...\n");
    }
  } catch (err) {
    console.error("Error in eventHandler:", err);
    isExecuting = false;
  }
}

/** checkPrice => compare Uniswap vs Pancakeswap price => returns difference in % */
async function checkPrice(_pools, _token0, _token1) {
  console.log(`Swap Detected, Checking Price...\n`);

  const currentBlock = await provider.getBlockNumber();

  const uPrice = await calculatePrice(_pools[0], _token0, _token1);
  const pPrice = await calculatePrice(_pools[1], _token0, _token1);

  const uFPrice = Number(uPrice).toFixed(UNITS);
  const pFPrice = Number(pPrice).toFixed(UNITS);
  const priceDifference = (((uFPrice - pFPrice) / pFPrice) * 100).toFixed(2);

  console.log(`Current Block: ${currentBlock}`);
  console.log(`-----------------------------------------`);
  console.log(
    `UNISWAP     | ${_token1.symbol}/${_token0.symbol}\t | ${uFPrice}`
  );
  console.log(
    `PANCAKESWAP | ${_token1.symbol}/${_token0.symbol}\t | ${pFPrice}\n`
  );
  console.log(`Percentage Difference: ${priceDifference}%\n`);

  return priceDifference;
}

/** determineDirection => decide buy uniswap/sell pancake or vice versa */
async function determineDirection(_priceDifference) {
  console.log(`Determining Direction...\n`);

  if (_priceDifference >= PRICE_DIFFERENCE) {
    console.log(`Potential Arbitrage Direction:\n`);
    console.log(`Buy\t -->\t ${uniswap.name}`);
    console.log(`Sell\t -->\t ${pancakeswap.name}\n`);
    return [uniswap, pancakeswap];
  } else if (_priceDifference <= -PRICE_DIFFERENCE) {
    console.log(`Potential Arbitrage Direction:\n`);
    console.log(`Buy\t -->\t ${pancakeswap.name}`);
    console.log(`Sell\t -->\t ${uniswap.name}\n`);
    return [pancakeswap, uniswap];
  } else {
    return null;
  }
}

/** determineProfitability => check pool liquidity, figure out net gain, gas cost, etc. */
async function determineProfitability(_exchangePath, _token0, _token1) {
  console.log(`Determining Profitability...\n`);

  try {
    const liquidity = await getPoolLiquidity(
      _exchangePath[0].factory,
      _token0,
      _token1,
      POOL_FEE,
      provider
    );

    const percentage = Big(0.5);
    const minAmount = Big(liquidity[1]).mul(percentage);

    // 1) token0 needed => quoteExactOutputSingle
    const quoteExactOutputSingleParams = {
      tokenIn: _token0.address,
      tokenOut: _token1.address,
      fee: POOL_FEE,
      amount: BigInt(minAmount.round().toFixed(0)),
      sqrtPriceLimitX96: 0,
    };
    const [token0Needed] =
      await _exchangePath[0].quoter.quoteExactOutputSingle.staticCall(
        quoteExactOutputSingleParams
      );

    // 2) token0 returned => quoteExactInputSingle
    const quoteExactInputSingleParams = {
      tokenIn: _token1.address,
      tokenOut: _token0.address,
      fee: POOL_FEE,
      amountIn: BigInt(minAmount.round().toFixed(0)),
      sqrtPriceLimitX96: 0,
    };
    const [token0Returned] =
      await _exchangePath[1].quoter.quoteExactInputSingle.staticCall(
        quoteExactInputSingleParams
      );

    const amountIn = ethers.formatUnits(token0Needed, _token0.decimals);
    const amountOut = ethers.formatUnits(token0Returned, _token0.decimals);

    console.log(
      `Estimated amount of ${_token0.symbol} needed to buy ${_token1.symbol} on ${_exchangePath[0].name}: ${amountIn}`
    );
    console.log(
      `Estimated amount of ${_token0.symbol} returned after swapping ${_token1.symbol} on ${_exchangePath[1].name}: ${amountOut}\n`
    );

    const amountDifference = amountOut - amountIn;
    const estimatedGasCost = GAS_LIMIT * GAS_PRICE;

    const account = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    const ethBalanceBefore = ethers.formatUnits(
      await provider.getBalance(account.address),
      18
    );
    const ethBalanceAfter = ethBalanceBefore - estimatedGasCost;

    const wethBalanceBefore = Number(
      ethers.formatUnits(
        await _token0.contract.balanceOf(account.address),
        _token0.decimals
      )
    );
    const wethBalanceAfter = amountDifference + wethBalanceBefore;
    const wethBalanceDifference = wethBalanceAfter - wethBalanceBefore;

    const data = {
      "ETH Balance Before": ethBalanceBefore,
      "ETH Balance After": ethBalanceAfter,
      "ETH Spent (gas)": estimatedGasCost,
      "-": {},
      "WETH Balance BEFORE": wethBalanceBefore,
      "WETH Balance AFTER": wethBalanceAfter,
      "WETH Gained/Lost": wethBalanceDifference,
      "-": {},
      "Total Gained/Lost": wethBalanceDifference - estimatedGasCost,
    };
    console.table(data);
    console.log();

    if (Number(amountOut) < Number(amountIn)) {
      throw new Error("Not enough to pay back flash loan");
    }
    if (Number(ethBalanceAfter) < 0) {
      throw new Error("Not enough ETH for gas fee");
    }

    return {
      isProfitable: true,
      amount: ethers.parseUnits(amountIn, _token0.decimals),
    };
  } catch (error) {
    console.log(error);
    console.log("");
    return { isProfitable: false, amount: 0 };
  }
}

/** executeTrade => calls Arbitrage.sol to do flashLoan + 2 swaps */
async function executeTrade(_exchangePath, _token0, _token1, _amount) {
  console.log(`Attempting Arbitrage...\n`);

  const routerPath = [
    await _exchangePath[0].router.getAddress(),
    await _exchangePath[1].router.getAddress(),
  ];
  const tokenPath = [_token0.address, _token1.address];

  // signer
  const account = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

  // before
  const tokenBalanceBefore = await _token0.contract.balanceOf(account.address);
  const ethBalanceBefore = await provider.getBalance(account.address);

  if (config.PROJECT_SETTINGS.isDeployed) {
    const transaction = await arbitrage
      .connect(account)
      .executeTrade(routerPath, tokenPath, POOL_FEE, _amount);

    const receipt = await transaction.wait(0);
  }

  console.log(`Trade Complete:\n`);

  // after
  const tokenBalanceAfter = await _token0.contract.balanceOf(account.address);
  const ethBalanceAfter = await provider.getBalance(account.address);

  const tokenBalanceDifference = tokenBalanceAfter - tokenBalanceBefore;
  const ethBalanceDifference = ethBalanceBefore - ethBalanceAfter;

  const data = {
    "ETH Balance Before": ethers.formatUnits(ethBalanceBefore, 18),
    "ETH Balance After": ethers.formatUnits(ethBalanceAfter, 18),
    "ETH Spent (gas)": ethers.formatUnits(ethBalanceDifference.toString(), 18),
    "-": {},
    "WETH Balance BEFORE": ethers.formatUnits(
      tokenBalanceBefore,
      _token0.decimals
    ),
    "WETH Balance AFTER": ethers.formatUnits(
      tokenBalanceAfter,
      _token0.decimals
    ),
    "WETH Gained/Lost": ethers.formatUnits(
      tokenBalanceDifference.toString(),
      _token0.decimals
    ),
    "-": {},
    "Total Gained/Lost": `${ethers.formatUnits(
      (tokenBalanceDifference - ethBalanceDifference).toString(),
      _token0.decimals
    )}`,
  };
  console.table(data);
}

// Start
main();
