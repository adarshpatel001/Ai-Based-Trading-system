const asyncHandler = require("../utils/asyncHandler");
const { getQuote, getCandles } = require("../services/marketDataService");
const { getAiRecommendation } = require("../services/aiBridgeService");
const AiRecommendation = require("../models/AiRecommendation");

const analyze = asyncHandler(async (req, res) => {
  const { symbol } = req.body;

  if (!symbol) {
    const error = new Error("symbol is required");
    error.statusCode = 400;
    throw error;
  }

  const upper = symbol.toUpperCase();
  const [quote, candles] = await Promise.all([getQuote(upper), getCandles(upper, "5m", "1d")]);

  const recommendation = await getAiRecommendation({
    symbol: upper,
    quote,
    candles: candles.slice(-120),
    userProfile: {
      riskTolerance: req.body.riskTolerance || "medium",
      style: req.body.style || "swing",
    },
  });

  await AiRecommendation.create({
    userId: req.user._id,
    symbol: upper,
    action: recommendation.action,
    confidence: recommendation.confidence,
    reason: recommendation.reason,
    indicators: recommendation.indicators || {},
  });

  res.json({
    symbol: upper,
    quote,
    recommendation,
  });
});

const latestRecommendations = asyncHandler(async (req, res) => {
  const rows = await AiRecommendation.find({ userId: req.user._id })
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();
  res.json(rows);
});

module.exports = { analyze, latestRecommendations };
