from fastapi import FastAPI
from pydantic import BaseModel
from typing import Any, Dict, List, Optional

app = FastAPI(title="Trading AI Service")


class AnalyzePayload(BaseModel):
    symbol: str
    quote: Dict[str, Any]
    candles: List[Dict[str, Any]] = []
    userProfile: Optional[Dict[str, Any]] = None


def _sma(values: List[float], period: int) -> Optional[float]:
    if len(values) < period:
        return None
    subset = values[-period:]
    return sum(subset) / period


def _rsi(values: List[float], period: int = 14) -> Optional[float]:
    if len(values) <= period:
        return None

    gains = []
    losses = []
    for i in range(1, len(values)):
        diff = values[i] - values[i - 1]
        gains.append(max(diff, 0))
        losses.append(abs(min(diff, 0)))

    avg_gain = sum(gains[-period:]) / period
    avg_loss = sum(losses[-period:]) / period

    if avg_loss == 0:
        return 100.0

    rs = avg_gain / avg_loss
    return 100 - (100 / (1 + rs))


def _score_signal(price: float, sma20: Optional[float], sma50: Optional[float], rsi14: Optional[float]) -> Dict[str, Any]:
    score = 0
    reasons = []

    if sma20 is not None and sma50 is not None:
        if sma20 > sma50:
            score += 1
            reasons.append("Short-term trend is above medium trend (SMA20 > SMA50).")
        else:
            score -= 1
            reasons.append("Short-term trend is below medium trend (SMA20 < SMA50).")

    if sma20 is not None:
        if price >= sma20:
            score += 1
            reasons.append("Current price is above SMA20.")
        else:
            score -= 1
            reasons.append("Current price is below SMA20.")

    if rsi14 is not None:
        if rsi14 < 30:
            score += 1
            reasons.append("RSI indicates potential oversold condition.")
        elif rsi14 > 70:
            score -= 1
            reasons.append("RSI indicates potential overbought condition.")

    if score >= 2:
        action = "BUY"
        confidence = 0.72
    elif score <= -1:
        action = "AVOID"
        confidence = 0.68
    else:
        action = "HOLD"
        confidence = 0.58

    if not reasons:
        reasons.append("Limited market structure available; keeping neutral stance.")

    return {
        "action": action,
        "confidence": confidence,
        "reason": " ".join(reasons),
        "score": score,
    }


@app.get("/health")
def health():
    return {"status": "ok", "service": "ai-service"}


@app.post("/analyze")
def analyze(payload: AnalyzePayload):
    closes = [float(c.get("close", 0)) for c in payload.candles if c.get("close") is not None]
    price = float(payload.quote.get("price", closes[-1] if closes else 0))

    sma20 = _sma(closes, 20)
    sma50 = _sma(closes, 50)
    rsi14 = _rsi(closes, 14)

    signal = _score_signal(price, sma20, sma50, rsi14)

    return {
        "action": signal["action"],
        "confidence": signal["confidence"],
        "reason": signal["reason"],
        "indicators": {
            "price": price,
            "sma20": sma20,
            "sma50": sma50,
            "rsi14": rsi14,
            "score": signal["score"],
        },
        "disclaimer": "Simulation only. Not financial advice.",
    }
