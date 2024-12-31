/********************************************************************
 * server/server.js
 * - Express server on port 5001
 * - Store Swap event data in /api/trade-logs
 ********************************************************************/
require("dotenv").config();
const express = require("express");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

// In-memory logs
let tradeLogs = [];

/**
 * GET /api/trade-logs
 */
app.get("/api/trade-logs", (req, res) => {
  return res.json(tradeLogs);
});

/**
 * POST /api/trade-logs
 */
app.post("/api/trade-logs", (req, res) => {
  const item = req.body;
  console.log("New swap log:", item);
  // e.g. { sqrtPriceX96: "...", amount0: "...", timestamp: 1234567, ... }
  tradeLogs.push(item);
  return res.json({ success: true });
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`Express server running on port ${PORT}`);
});
