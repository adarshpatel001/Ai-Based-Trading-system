const asyncHandler = require("../utils/asyncHandler");
const { getQuote, getCandles } = require("../services/marketDataService");

const quote = asyncHandler(async (req, res) => {
  const { symbol } = req.params;
  const data = await getQuote(symbol.toUpperCase());
  res.json(data);
});

const candles = asyncHandler(async (req, res) => {
  const { symbol } = req.params;
  const interval = req.query.interval || "5m";
  const range = req.query.range || "1d";

  const data = await getCandles(symbol.toUpperCase(), interval, range);
  res.json({ symbol: symbol.toUpperCase(), interval, range, candles: data });
});

module.exports = { quote, candles };
