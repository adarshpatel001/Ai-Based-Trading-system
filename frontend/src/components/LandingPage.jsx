export default function LandingPage({ onOpenLogin, onOpenRegister }) {
  return (
    <div className="landing-shell">
      <header className="landing-nav">
        <div className="brand-mark">
          <span className="brand-dot" />
          <div>
            <p className="brand-eyebrow">AI Assisted Trading</p>
            <h1>TradeLab Sim</h1>
          </div>
        </div>

        <nav className="landing-actions">
          <button className="nav-link-btn" onClick={onOpenLogin}>
            Login
          </button>
          <button className="primary-btn nav-cta-btn" onClick={onOpenRegister}>
            Sign Up
          </button>
        </nav>
      </header>

      <main className="landing-hero">
        <section className="hero-copy">
          <p className="hero-kicker">Paper trading with live market context</p>
          <h2>Learn faster with an AI desk beside you, not above you.</h2>
          <p className="hero-text">
            Practice with virtual capital, inspect live charts, compare US and Indian stocks,
            and use AI recommendations as decision support while staying in full control.
          </p>

          <div className="hero-cta-row">
            <button className="primary-btn hero-main-btn" onClick={onOpenRegister}>
              Create Free Account
            </button>
            <button className="secondary-btn" onClick={onOpenLogin}>
              I already have an account
            </button>
          </div>

          <div className="hero-stats">
            <div className="hero-stat">
              <strong>Live Quotes</strong>
              <span>Track intraday price action and one-minute candles.</span>
            </div>
            <div className="hero-stat">
              <strong>AI Insight</strong>
              <span>Get buy, hold, or avoid suggestions with indicator-based reasoning.</span>
            </div>
            <div className="hero-stat">
              <strong>Zero Risk</strong>
              <span>Use a USD base wallet while simulating multi-currency trades.</span>
            </div>
          </div>
        </section>

        <section className="hero-board">
          <div className="board-panel board-market">
            <p className="panel-tag">Market Pulse</p>
            <div className="board-row">
              <span>NVDA</span>
              <strong>$179.56</strong>
            </div>
            <div className="board-row">
              <span>RELIANCE.NS</span>
              <strong>Rs. 2,845.20</strong>
            </div>
            <div className="board-row">
              <span>^NSEI</span>
              <strong>22,418.15</strong>
            </div>
          </div>

          <div className="board-panel board-ai">
            <p className="panel-tag">AI Recommendation</p>
            <h3>BUY</h3>
            <p>
              Momentum is above the short-term trend and RSI remains balanced. Consider entry
              only if your risk plan allows it.
            </p>
          </div>

          <div className="board-panel board-wallet">
            <p className="panel-tag">Simulation Wallet</p>
            <strong>$1,000,000</strong>
            <span>Practice, review, improve. No real capital at risk.</span>
          </div>
        </section>
      </main>
    </div>
  );
}
