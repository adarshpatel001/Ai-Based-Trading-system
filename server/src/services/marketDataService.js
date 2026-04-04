const { marketServiceUrl } = require("../config/env");

const QUOTE_TTL_MS = 2_500;
const CANDLES_TTL_MS = 5_000;
const FX_TTL_MS = 20_000;
const quoteCache = new Map();
const candleCache = new Map();
const fxCache = new Map();
const inFlight = new Map();

function getCached(cache, key, ttlMs) {
  const row = cache.get(key);
  if (!row) return null;
  if (Date.now() - row.ts > ttlMs) return null;
  return row.value;
}

function setCached(cache, key, value) {
  cache.set(key, { ts: Date.now(), value });
}

function withInflight(key, fn) {
  if (inFlight.has(key)) return inFlight.get(key);
  const p = fn().finally(() => inFlight.delete(key));
  inFlight.set(key, p);
  return p;
}

async function fetchJson(path) {
  const base = marketServiceUrl.replace(/\/$/, "");
  const response = await fetch(`${base}${path}`);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Market service error ${response.status}: ${text || response.statusText}`);
  }
  return response.json();
}

function normalizeQuote(quote, fallbackSymbol) {
  const symbol = String(quote.symbol || fallbackSymbol || "").toUpperCase();
  const timeRaw = quote.time;
  const time = typeof timeRaw === "number" ? new Date(timeRaw * 1000).toISOString() : timeRaw || new Date().toISOString();

  return {
    symbol,
    name: quote.name || symbol,
    price: Number(quote.price || 0),
    change: Number(quote.change || 0),
    changePercent: Number(quote.changePercent || 0),
    previousClose: Number(quote.previousClose || 0),
    volume: quote.volume ?? null,
    marketState: quote.marketState || "UNKNOWN",
    currency: quote.currency || "USD",
    exchange: quote.exchange || "",
    time,
  };
}

async function getQuote(symbol) {
  const upper = String(symbol).toUpperCase();
  const cached = getCached(quoteCache, upper, QUOTE_TTL_MS);
  if (cached) return cached;

  return withInflight(`quote:${upper}`, async () => {
    const payload = await fetchJson(`/quote/${encodeURIComponent(upper)}`);
    const normalized = normalizeQuote(payload, upper);
    setCached(quoteCache, upper, normalized);
    return normalized;
  });
}

async function getQuotes(symbols) {
  const unique = [...new Set(symbols.map((s) => String(s || "").toUpperCase()).filter(Boolean))];
  if (!unique.length) return {};

  const out = {};
  const missing = [];

  for (const symbol of unique) {
    const cached = getCached(quoteCache, symbol, QUOTE_TTL_MS);
    if (cached) out[symbol] = cached;
    else missing.push(symbol);
  }

  if (!missing.length) return out;

  const key = missing.join(",");
  const payload = await withInflight(`quotes:${key}`, () =>
    fetchJson(`/quotes?symbols=${encodeURIComponent(key)}`)
  );

  const rows = payload?.quotes || [];
  for (const row of rows) {
    const normalized = normalizeQuote(row, row.symbol);
    const symbol = normalized.symbol;
    out[symbol] = normalized;
    setCached(quoteCache, symbol, normalized);
  }

  for (const symbol of missing) {
    if (!out[symbol]) {
      out[symbol] = normalizeQuote({ symbol }, symbol);
    }
  }

  return out;
}

async function getCandles(symbol, interval = "1m", range = "1d") {
  const upper = String(symbol).toUpperCase();
  const key = `${upper}:${interval}:${range}`;
  const cached = getCached(candleCache, key, CANDLES_TTL_MS);
  if (cached) return cached;

  return withInflight(`candles:${key}`, async () => {
    const payload = await fetchJson(`/candles/${encodeURIComponent(upper)}?limit=60`);
    const candles = (payload?.candles || []).map((c) => ({
      time: typeof c.time === "number" ? new Date(c.time * 1000).toISOString() : c.time,
      open: Number(c.open || 0),
      high: Number(c.high || 0),
      low: Number(c.low || 0),
      close: Number(c.close || 0),
      volume: c.volume ?? null,
    }));

    setCached(candleCache, key, candles);
    return candles;
  });
}

async function _getUsdPerInr() {
  const cached = getCached(fxCache, "USD_PER_INR", FX_TTL_MS);
  if (cached) return cached;

  return withInflight("fx:USD_PER_INR", async () => {
    const usdInr = await getQuote("USDINR=X");
    const inrPerUsd = Number(usdInr.price || 0);
    if (!inrPerUsd) {
      throw new Error("Unable to fetch USDINR fx rate");
    }
    const usdPerInr = 1 / inrPerUsd;
    setCached(fxCache, "USD_PER_INR", usdPerInr);
    return usdPerInr;
  });
}

async function getUsdPerUnit(currency) {
  const upper = String(currency || "USD").toUpperCase();
  if (upper === "USD") return 1;
  if (upper === "INR") return _getUsdPerInr();

  const key = `USD_PER_${upper}`;
  const cached = getCached(fxCache, key, FX_TTL_MS);
  if (cached) return cached;

  return withInflight(`fx:${key}`, async () => {
    try {
      const direct = await getQuote(`${upper}USD=X`);
      const value = Number(direct.price || 0);
      if (value > 0) {
        setCached(fxCache, key, value);
        return value;
      }
    } catch (_err) {
      // try inverse
    }

    const inverse = await getQuote(`USD${upper}=X`);
    const quoteValue = Number(inverse.price || 0);
    if (!quoteValue) {
      throw new Error(`Unable to fetch fx rate for ${upper}/USD`);
    }
    const usdPerUnit = 1 / quoteValue;
    setCached(fxCache, key, usdPerUnit);
    return usdPerUnit;
  });
}

module.exports = { getQuote, getQuotes, getCandles, getUsdPerUnit };
