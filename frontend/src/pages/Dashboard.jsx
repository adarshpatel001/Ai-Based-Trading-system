import { useEffect, useMemo, useState } from "react";

import CandleChart from "../components/CandleChart";
import { DEFAULT_SYMBOLS } from "../constants/defaults";
import { api } from "../services/apiClient";
import { money, moneyLocal, moneyUsd, num, signed, signedPct, tone } from "../utils/format";

export default function Dashboard({ token, user, onLogout }) {
  const [symbols, setSymbols] = useState(DEFAULT_SYMBOLS);
  const [selectedSymbol, setSelectedSymbol] = useState(DEFAULT_SYMBOLS[0]);
  const [quote, setQuote] = useState(null);
  const [candles, setCandles] = useState([]);
  const [wallet, setWallet] = useState(0);
  const [portfolio, setPortfolio] = useState({ positions: [], totals: { marketValue: 0, pnl: 0 } });
  const [orders, setOrders] = useState([]);
  const [analysis, setAnalysis] = useState(null);
  const [trade, setTrade] = useState({ side: "BUY", quantity: 1 });
  const [loading, setLoading] = useState({ quote: false, trade: false, ai: false });
  const [error, setError] = useState("");

  const quoteTone = tone(quote?.change);

  async function loadAccount() {
    const [walletRes, portfolioRes, ordersRes] = await Promise.all([
      api.wallet(token),
      api.portfolio(token),
      api.orders(token),
    ]);
    setWallet(walletRes.balance || 0);
    setPortfolio(portfolioRes);
    setOrders(ordersRes);
  }

  async function loadQuote(symbol) {
    setLoading((prev) => ({ ...prev, quote: true }));
    setError("");
    try {
      const quoteRes = await api.quote(symbol);
      setQuote(quoteRes);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading((prev) => ({ ...prev, quote: false }));
    }
  }

  async function loadCandles(symbol) {
    setError("");
    try {
      const candleRes = await api.candles(symbol, "5m", "1d");
      setCandles(candleRes.candles || []);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    loadAccount().catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      loadAccount().catch((err) => setError(err.message));
    }, 3000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    loadQuote(selectedSymbol).catch((err) => setError(err.message));
    loadCandles(selectedSymbol).catch((err) => setError(err.message));

    const quoteId = setInterval(() => {
      loadQuote(selectedSymbol).catch((err) => setError(err.message));
    }, 1000);

    const candlesId = setInterval(() => {
      loadCandles(selectedSymbol).catch((err) => setError(err.message));
    }, 15000);

    return () => {
      clearInterval(quoteId);
      clearInterval(candlesId);
    };
  }, [selectedSymbol]);

  async function runAiAnalysis() {
    setLoading((prev) => ({ ...prev, ai: true }));
    setError("");
    try {
      const res = await api.aiAnalyze(token, { symbol: selectedSymbol, riskTolerance: "medium", style: "swing" });
      setAnalysis(res.recommendation);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading((prev) => ({ ...prev, ai: false }));
    }
  }

  async function placeOrder(e) {
    e.preventDefault();
    setLoading((prev) => ({ ...prev, trade: true }));
    setError("");
    try {
      await api.placeOrder(token, {
        symbol: selectedSymbol,
        side: trade.side,
        quantity: Number(trade.quantity),
      });
      await loadAccount();
      await loadQuote(selectedSymbol);
      await loadCandles(selectedSymbol);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading((prev) => ({ ...prev, trade: false }));
    }
  }

  async function topUp() {
    setError("");
    try {
      const res = await api.topUp(token, 1000000);
      setWallet(res.balance);
    } catch (err) {
      setError(err.message);
    }
  }

  function addSymbol(value) {
    const upper = String(value || "").toUpperCase().trim();
    if (!upper) return;
    if (symbols.includes(upper)) {
      setSelectedSymbol(upper);
      return;
    }
    setSymbols((prev) => [...prev, upper]);
    setSelectedSymbol(upper);
  }

  function removeSymbol(symbolToRemove) {
    setSymbols((prev) => {
      if (prev.length <= 1) return prev;
      const next = prev.filter((s) => s !== symbolToRemove);

      if (selectedSymbol === symbolToRemove) {
        setSelectedSymbol(next[0]);
      }

      return next;
    });
  }

  const aiActionClass = useMemo(() => {
    const action = analysis?.action || "HOLD";
    if (action === "BUY") return "buy";
    if (action === "AVOID") return "avoid";
    return "hold";
  }, [analysis]);

  return (
    <div className="dashboard">
      <header className="topbar">
        <div>
          <p className="tiny">AI Assisted Trading Simulation</p>
          <h1>Welcome, {user.name}</h1>
        </div>
        <div className="topbar-actions">
          <div className="wallet-pill">
            <span>Virtual Balance</span>
            <strong>{moneyUsd(wallet)}</strong>
          </div>
          <button className="ghost-btn" onClick={topUp}>+ $1M</button>
          <button className="ghost-btn" onClick={onLogout}>Logout</button>
        </div>
      </header>

      {error ? <p className="error-msg">{error}</p> : null}

      <section className="layout">
        <aside className="panel sidebar">
          <h2>Stocks</h2>
          <SymbolInput onAdd={addSymbol} />
          <div className="symbol-list">
            {symbols.map((symbol) => (
              <div
                key={symbol}
                className={`symbol-chip ${symbol === selectedSymbol ? "active" : ""}`}
              >
                <button
                  className="symbol-select"
                  onClick={() => setSelectedSymbol(symbol)}
                >
                  {symbol}
                </button>
                <button
                  className="symbol-remove"
                  onClick={() => removeSymbol(symbol)}
                  disabled={symbols.length <= 1}
                  title={symbols.length <= 1 ? "At least one symbol required" : `Remove ${symbol}`}
                >
                  x
                </button>
              </div>
            ))}
          </div>

          <div className="ai-box">
            <h3>AI Decision Support</h3>
            <button className="primary-btn" onClick={runAiAnalysis} disabled={loading.ai}>
              {loading.ai ? "Analyzing..." : `Analyze ${selectedSymbol}`}
            </button>
            {analysis ? (
              <div className={`recommendation ${aiActionClass}`}>
                <p className="rec-action">{analysis.action}</p>
                <p className="rec-confidence">Confidence: {(Number(analysis.confidence || 0) * 100).toFixed(1)}%</p>
                <p>{analysis.reason}</p>
              </div>
            ) : (
              <p className="muted">Click analyze to get AI suggestion.</p>
            )}
          </div>

          <form className="trade-box" onSubmit={placeOrder}>
            <h3>Paper Trade</h3>
            <p className="muted">Orders execute from USD wallet using live FX conversion.</p>
            <div className="trade-row">
              <label>Side</label>
              <select
                value={trade.side}
                onChange={(e) => setTrade((prev) => ({ ...prev, side: e.target.value }))}
              >
                <option value="BUY">BUY</option>
                <option value="SELL">SELL</option>
              </select>
            </div>
            <div className="trade-row">
              <label>Quantity</label>
              <input
                type="number"
                min="1"
                value={trade.quantity}
                onChange={(e) => setTrade((prev) => ({ ...prev, quantity: e.target.value }))}
              />
            </div>
            <button className="primary-btn" type="submit" disabled={loading.trade}>
              {loading.trade ? "Placing..." : `Place ${trade.side}`}
            </button>
          </form>
        </aside>

        <main className="panel content">
          <section className="quote-head">
            <div>
              <p className="tiny">{quote?.exchange || "Market"} • Wallet Base: USD</p>
              <h2>{selectedSymbol}</h2>
              <p className="muted">Last tick: {quote?.time ? new Date(quote.time).toLocaleTimeString() : "N/A"}</p>
            </div>
            <div className={`quote-change ${quoteTone}`}>
              <strong>{quote ? moneyLocal(quote.price, quote.currency || "USD") : "-"}</strong>
              <span>
                {quote ? `${signed(quote.change)} (${signedPct(quote.changePercent)})` : "Loading..."}
              </span>
            </div>
          </section>

          <div className="metric-grid">
            <Metric label="Previous Close" value={quote ? moneyLocal(quote.previousClose, quote.currency || "USD") : "-"} />
            <Metric label="Volume" value={quote ? num(quote.volume) : "-"} />
            <Metric label="Currency" value={quote?.currency || "-"} />
            <Metric label="Market State" value={quote?.marketState || "-"} />
          </div>

          <CandleChart candles={candles} />

          <section className="tables">
            <div className="card">
              <h3>Portfolio</h3>
              <table>
                <thead>
                  <tr>
                    <th>Symbol</th>
                    <th>Qty</th>
                    <th>Avg Price</th>
                    <th>Market Price</th>
                    <th>P&L</th>
                  </tr>
                </thead>
                <tbody>
                  {portfolio.positions.length ? (
                    portfolio.positions.map((p) => (
                      <tr key={`${p.symbol}-${p._id}`}>
                        <td>{p.symbol}</td>
                        <td>{num(p.quantity)}</td>
                        <td>{moneyLocal(p.avgPriceLocal ?? p.avgPrice, p.localCurrency || "USD")}<br /><span className="muted">{moneyUsd(p.avgPriceUsd ?? p.avgPrice)}</span></td>
                        <td>{moneyLocal(p.marketPriceLocal ?? p.marketPrice, p.localCurrency || "USD")}<br /><span className="muted">{moneyUsd(p.marketPriceUsd ?? p.marketPrice)}</span></td>
                        <td className={tone(p.pnlUsd ?? p.pnl)}>{moneyUsd(p.pnlUsd ?? p.pnl)}<br /><span className="muted">{moneyLocal(p.pnlLocal ?? 0, p.localCurrency || "USD")}</span></td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="muted">No positions yet</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="card">
              <h3>Order History</h3>
              <table>
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Symbol</th>
                    <th>Side</th>
                    <th>Qty</th>
                    <th>Price</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.length ? (
                    orders.slice(0, 12).map((o) => (
                      <tr key={o._id}>
                        <td>{new Date(o.createdAt).toLocaleTimeString()}</td>
                        <td>{o.symbol}</td>
                        <td>{o.side}</td>
                        <td>{num(o.quantity)}</td>
                        <td>{moneyLocal(o.priceLocal ?? o.price, o.localCurrency || "USD")}<br /><span className="muted">{moneyUsd(o.priceUsd ?? o.price)}</span></td>
                        <td>{o.status}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" className="muted">No orders yet</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </main>
      </section>
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div className="card metric-card">
      <p>{label}</p>
      <strong>{value}</strong>
    </div>
  );
}

function SymbolInput({ onAdd }) {
  const [value, setValue] = useState("");
  return (
    <form
      className="symbol-input"
      onSubmit={(e) => {
        e.preventDefault();
        onAdd(value);
        setValue("");
      }}
    >
      <input
        placeholder="Add symbol"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <button type="submit">Add</button>
    </form>
  );
}
