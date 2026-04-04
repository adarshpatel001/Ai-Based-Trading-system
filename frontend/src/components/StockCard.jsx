import CandleChart from "./CandleChart";
import { changeTone, formatPrice, formatSigned, formatTime, formatVolume } from "../utils/formatters";

export default function StockCard({ symbol, status, data }) {
  const price = formatPrice(data?.price);
  const previousClose = data?.previous_close != null ? formatPrice(data.previous_close) : "N/A";
  const volume = formatVolume(data?.volume);
  const change = formatSigned(data?.change);
  const changePercent = formatSigned(data?.change_percent, 2, 4);
  const updatedAt = formatTime(data?.time);
  const tone = changeTone(data?.change);

  return (
    <article className="stock-card">
      <header className="stock-header">
        <h2>{symbol}</h2>
        <span className={`status status-${status}`}>{status}</span>
      </header>

      {data ? (
        <>
          <div className="metrics-grid">
            <div className="metric">
              <p>Price</p>
              <h3>{price}</h3>
            </div>
            <div className="metric">
              <p>Previous Close</p>
              <h3>{previousClose}</h3>
            </div>
            <div className="metric">
              <p>Volume</p>
              <h3>{volume}</h3>
            </div>
            <div className={`metric metric-${tone}`}>
              <p>Change</p>
              <h3>
                {change} ({changePercent}%)
              </h3>
            </div>
          </div>

          <CandleChart candles={data.candles || []} />

          <footer className="stock-footer">
            <span>Source: {data.source || "live"}</span>
            <span>Updated: {updatedAt}</span>
          </footer>
        </>
      ) : (
        <p className="loading-text">Waiting for data...</p>
      )}
    </article>
  );
}
