const asyncHandler = require("../utils/asyncHandler");
const { getQuote, getQuotes, getUsdPerUnit } = require("../services/marketDataService");
const Wallet = require("../models/Wallet");
const Position = require("../models/Position");
const Order = require("../models/Order");

const getWallet = asyncHandler(async (req, res) => {
  const wallet = await Wallet.findOne({ userId: req.user._id });
  res.json({ balance: wallet?.balance ?? 0, baseCurrency: "USD" });
});

const topUpWallet = asyncHandler(async (req, res) => {
  const amount = Number(req.body.amount || 1000000);
  const wallet = await Wallet.findOneAndUpdate(
    { userId: req.user._id },
    { $inc: { balance: amount } },
    { upsert: true, new: true }
  );

  res.json({ balance: wallet.balance, baseCurrency: "USD" });
});

const placeOrder = asyncHandler(async (req, res) => {
  const symbol = String(req.body.symbol || "").toUpperCase();
  const side = String(req.body.side || "").toUpperCase();
  const quantity = Number(req.body.quantity);

  if (!symbol || !["BUY", "SELL"].includes(side) || !Number.isFinite(quantity) || quantity <= 0) {
    const error = new Error("Invalid order payload");
    error.statusCode = 400;
    throw error;
  }

  const quote = await getQuote(symbol);
  const localCurrency = String(quote.currency || "USD").toUpperCase();
  const priceLocal = Number(quote.price || 0);
  const fxRateToUsd = await getUsdPerUnit(localCurrency);
  const priceUsd = priceLocal * fxRateToUsd;

  if (priceUsd <= 0) {
    const error = new Error("Unable to price symbol");
    error.statusCode = 400;
    throw error;
  }

  const wallet = await Wallet.findOneAndUpdate(
    { userId: req.user._id },
    {},
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const position = await Position.findOne({ userId: req.user._id, symbol });
  const notionalUsd = priceUsd * quantity;
  const notionalLocal = priceLocal * quantity;

  if (side === "BUY") {
    if (wallet.balance < notionalUsd) {
      const rejected = await Order.create({
        userId: req.user._id,
        symbol,
        side,
        quantity,
        price: priceUsd,
        priceLocal,
        priceUsd,
        notionalLocal,
        notionalUsd,
        localCurrency,
        fxRateToUsd,
        status: "REJECTED",
        rejectionReason: "Insufficient virtual USD balance",
      });
      return res.status(400).json({ message: "Insufficient USD balance", order: rejected });
    }

    wallet.balance -= notionalUsd;
    await wallet.save();

    if (!position) {
      await Position.create({
        userId: req.user._id,
        symbol,
        quantity,
        avgPrice: priceUsd,
        avgPriceUsd: priceUsd,
        avgPriceLocal: priceLocal,
        localCurrency,
        fxRateToUsd,
      });
    } else {
      const totalQty = position.quantity + quantity;
      const currAvgUsd = Number(position.avgPriceUsd ?? position.avgPrice ?? 0);
      const currAvgLocal = Number(position.avgPriceLocal ?? position.avgPrice ?? 0);

      position.avgPriceUsd = (position.quantity * currAvgUsd + quantity * priceUsd) / totalQty;
      position.avgPriceLocal = (position.quantity * currAvgLocal + quantity * priceLocal) / totalQty;
      position.avgPrice = position.avgPriceUsd;
      position.localCurrency = localCurrency;
      position.fxRateToUsd = fxRateToUsd;
      position.quantity = totalQty;
      await position.save();
    }
  }

  if (side === "SELL") {
    if (!position || position.quantity < quantity) {
      const rejected = await Order.create({
        userId: req.user._id,
        symbol,
        side,
        quantity,
        price: priceUsd,
        priceLocal,
        priceUsd,
        notionalLocal,
        notionalUsd,
        localCurrency,
        fxRateToUsd,
        status: "REJECTED",
        rejectionReason: "Insufficient position quantity",
      });
      return res.status(400).json({ message: "Insufficient holdings", order: rejected });
    }

    wallet.balance += notionalUsd;
    await wallet.save();

    position.quantity -= quantity;
    if (position.quantity <= 0) {
      await Position.deleteOne({ _id: position._id });
    } else {
      position.localCurrency = localCurrency;
      position.fxRateToUsd = fxRateToUsd;
      await position.save();
    }
  }

  const order = await Order.create({
    userId: req.user._id,
    symbol,
    side,
    quantity,
    price: priceUsd,
    priceLocal,
    priceUsd,
    notionalLocal,
    notionalUsd,
    localCurrency,
    fxRateToUsd,
    status: "FILLED",
  });

  res.status(201).json({
    order,
    wallet: { balance: wallet.balance, baseCurrency: "USD" },
  });
});

const portfolio = asyncHandler(async (req, res) => {
  const positions = await Position.find({ userId: req.user._id }).lean();
  const quoteMap = await getQuotes(positions.map((p) => p.symbol));

  const currencies = [...new Set(positions.map((p) => String(p.localCurrency || "USD").toUpperCase()))];
  const fxPairs = await Promise.all(
    currencies.map(async (currency) => [currency, await getUsdPerUnit(currency)])
  );
  const fxMap = Object.fromEntries(fxPairs);

  const enriched = positions.map((position) => {
    const quote = quoteMap[position.symbol] || { price: 0, currency: position.localCurrency || "USD" };
    const currency = String(quote.currency || position.localCurrency || "USD").toUpperCase();
    const usdPerUnit = Number(fxMap[currency] || 1);

    const marketPriceLocal = Number(quote.price || 0);
    const marketPriceUsd = marketPriceLocal * usdPerUnit;
    const marketValueLocal = marketPriceLocal * position.quantity;
    const marketValueUsd = marketPriceUsd * position.quantity;

    const avgPriceUsd = Number(position.avgPriceUsd ?? position.avgPrice ?? 0);
    const avgPriceLocal = Number(position.avgPriceLocal ?? position.avgPrice ?? 0);
    const costBasisUsd = avgPriceUsd * position.quantity;
    const costBasisLocal = avgPriceLocal * position.quantity;
    const pnlUsd = marketValueUsd - costBasisUsd;
    const pnlLocal = marketValueLocal - costBasisLocal;

    return {
      ...position,
      localCurrency: currency,
      fxRateToUsd: usdPerUnit,
      avgPriceUsd,
      avgPriceLocal,
      marketPriceLocal,
      marketPriceUsd,
      marketValueLocal,
      marketValueUsd,
      costBasisUsd,
      costBasisLocal,
      pnl: pnlUsd,
      pnlUsd,
      pnlLocal,
    };
  });

  const totals = enriched.reduce(
    (acc, p) => {
      acc.marketValue += p.marketValueUsd;
      acc.costBasis += p.costBasisUsd;
      acc.pnl += p.pnlUsd;
      return acc;
    },
    { marketValue: 0, costBasis: 0, pnl: 0, baseCurrency: "USD" }
  );

  res.json({ positions: enriched, totals });
});

const orderHistory = asyncHandler(async (req, res) => {
  const rows = await Order.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(100).lean();
  res.json(rows);
});

module.exports = { getWallet, topUpWallet, placeOrder, portfolio, orderHistory };
