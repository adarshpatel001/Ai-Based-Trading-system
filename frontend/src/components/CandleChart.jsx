import { useMemo, useState } from "react";

export default function CandleChart({ candles }) {
  const width = 1000;
  const height = 300;
  const p = 18;
  const labelPad = 24;
  const [hovered, setHovered] = useState(null);
  const safeCandles = Array.isArray(candles) ? candles : [];

  const tooltip = useMemo(() => {
    if (!hovered) return null;
    const time = new Date(hovered.candle.time).toLocaleString();
    return {
      time,
      open: Number(hovered.candle.open || 0).toFixed(2),
      high: Number(hovered.candle.high || 0).toFixed(2),
      low: Number(hovered.candle.low || 0).toFixed(2),
      close: Number(hovered.candle.close || 0).toFixed(2),
      leftPct: Math.min(88, Math.max(12, (hovered.x / width) * 100)),
    };
  }, [hovered]);

  if (!safeCandles.length) {
    return <div className="card chart-empty">No candle data loaded</div>;
  }

  const min = Math.min(...safeCandles.map((c) => c.low));
  const max = Math.max(...safeCandles.map((c) => c.high));
  const range = max - min || 1;
  const drawW = width - p * 2;
  const xAxisY = height - p - labelPad;
  const drawH = xAxisY - p;
  const slot = drawW / safeCandles.length;
  const bodyW = Math.max(2, slot * 0.5);
  const tickCount = Math.min(6, safeCandles.length);

  const y = (price) => p + ((max - price) / range) * drawH;
  const formatLabelTime = (value) => {
    const date = new Date(value);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
  };

  return (
    <div className="card chart-shell" onMouseLeave={() => setHovered(null)}>
      <svg viewBox={`0 0 ${width} ${height}`} className="chart-svg" preserveAspectRatio="none">
        <line x1={p} y1={p} x2={p} y2={xAxisY} className="axis" />
        <line x1={p} y1={xAxisY} x2={width - p} y2={xAxisY} className="axis" />
        {hovered ? <line x1={hovered.x} y1={p} x2={hovered.x} y2={xAxisY} className="crosshair-line" /> : null}
        {safeCandles.map((c, i) => {
          const x = p + slot * i + slot / 2;
          const oy = y(c.open);
          const cy = y(c.close);
          const hy = y(c.high);
          const ly = y(c.low);
          const top = Math.min(oy, cy);
          const h = Math.max(1, Math.abs(cy - oy));
          const klass = c.close >= c.open ? "up" : "down";
          const isActive = hovered?.candle?.time === c.time;
          return (
            <g key={`${c.time}-${i}`}>
              <rect
                x={x - slot / 2}
                y={p}
                width={slot}
                height={drawH}
                className="hover-hit"
                onMouseEnter={() => setHovered({ candle: c, x })}
                onMouseMove={() => setHovered({ candle: c, x })}
              />
              <line x1={x} y1={hy} x2={x} y2={ly} className={`wick ${klass}`} />
              <rect
                x={x - bodyW / 2}
                y={top}
                width={bodyW}
                height={h}
                className={`body ${klass} ${isActive ? "active-candle" : ""}`}
                rx="1"
              />
            </g>
          );
        })}

        {Array.from({ length: tickCount }).map((_, idx) => {
          const candleIdx = Math.round((idx * (safeCandles.length - 1)) / Math.max(1, tickCount - 1));
          const candle = safeCandles[candleIdx];
          const x = p + slot * candleIdx + slot / 2;
          return (
            <g key={`tick-${candle.time}-${idx}`}>
              <line x1={x} y1={xAxisY} x2={x} y2={xAxisY + 4} className="axis" />
              <text x={x} y={xAxisY + 16} className="axis-label" textAnchor="middle">
                {formatLabelTime(candle.time)}
              </text>
            </g>
          );
        })}
      </svg>

      {tooltip ? (
        <div className="candle-tooltip" style={{ left: `${tooltip.leftPct}%` }}>
          <p className="tooltip-time">{tooltip.time}</p>
          <div className="tooltip-row"><span>Open</span><strong>{tooltip.open}</strong></div>
          <div className="tooltip-row"><span>High</span><strong>{tooltip.high}</strong></div>
          <div className="tooltip-row"><span>Low</span><strong>{tooltip.low}</strong></div>
          <div className="tooltip-row"><span>Close</span><strong>{tooltip.close}</strong></div>
        </div>
      ) : null}
    </div>
  );
}
