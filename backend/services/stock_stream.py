import queue
import os
import shutil
import tempfile
import threading
import time

import certifi
import yfinance as yf
from curl_cffi import requests as curl_requests

CANDLE_LIMIT = 60
streams = {}
market_state = {}


def _prepare_ca_bundle():
    path = os.path.join(tempfile.gettempdir(), "trading-sim-cacert.pem")
    if not os.path.exists(path):
        shutil.copyfile(certifi.where(), path)
    return path


CA_BUNDLE = _prepare_ca_bundle()


def _ticker(symbol):
    session = curl_requests.Session(impersonate="chrome", verify=CA_BUNDLE)
    return yf.Ticker(symbol, session=session)


def _first_not_none(*values):
    for value in values:
        if value is not None:
            return value
    return None


def _to_float(value, default=0.0):
    try:
        if value is None:
            return default
        return float(value)
    except (TypeError, ValueError):
        return default


def _to_int(value, default=0):
    try:
        if value is None:
            return default
        return int(value)
    except (TypeError, ValueError):
        return default


def _to_unix_seconds(value):
    if value is None:
        return int(time.time())
    if isinstance(value, (int, float)):
        value_i = int(value)
        if value_i > 1_000_000_000_000:
            return value_i // 1000
        return value_i
    if hasattr(value, "timestamp"):
        try:
            return int(value.timestamp())
        except Exception:
            return int(time.time())
    return int(time.time())


def _build_or_update_candle(symbol, price, event_ts):
    state = market_state.setdefault(symbol, {})
    candles = state.setdefault("candles", [])
    bucket = int(event_ts) - (int(event_ts) % 60)
    current = candles[-1] if candles else None

    if current and current["time"] == bucket:
        current["high"] = max(current["high"], price)
        current["low"] = min(current["low"], price)
        current["close"] = price
        return current

    new_candle = {
        "time": bucket,
        "open": price,
        "high": price,
        "low": price,
        "close": price,
    }
    candles.append(new_candle)
    if len(candles) > CANDLE_LIMIT:
        del candles[:-CANDLE_LIMIT]
    return new_candle


def get_previous_close(ticker):
    try:
        daily = ticker.history(period="5d", interval="1d")
        closes = daily.get("Close")
        if closes is not None and len(closes) >= 2:
            return _to_float(closes.iloc[-2], None)
        if closes is not None and len(closes) == 1:
            return _to_float(closes.iloc[-1], None)
    except Exception:
        pass
    return None


def normalize_tick(tick, fallback_symbol):
    if hasattr(tick, "to_dict"):
        tick = tick.to_dict()
    elif hasattr(tick, "__dict__") and not isinstance(tick, dict):
        tick = vars(tick)

    if not isinstance(tick, dict):
        return None

    symbol = tick.get("id") or tick.get("symbol") or fallback_symbol
    state_key = fallback_symbol.upper()

    price = _first_not_none(
        tick.get("price"),
        tick.get("lastPrice"),
        tick.get("last_price"),
        tick.get("regularMarketPrice"),
        tick.get("close"),
    )

    if price is None:
        return None

    change = _first_not_none(
        tick.get("change"),
        tick.get("priceChange"),
        tick.get("price_change"),
        tick.get("regularMarketChange"),
    )

    change_percent = _first_not_none(
        tick.get("change_percent"),
        tick.get("changePercent"),
        tick.get("priceChangePercent"),
        tick.get("regularMarketChangePercent"),
    )

    volume = _first_not_none(
        tick.get("volume"),
        tick.get("dayVolume"),
        tick.get("day_volume"),
        tick.get("regularMarketVolume"),
    )

    previous_close = _first_not_none(
        tick.get("previousClose"),
        tick.get("previous_close"),
        tick.get("regularMarketPreviousClose"),
    )

    price_f = _to_float(price)
    change_f = _to_float(change, None)
    change_percent_f = _to_float(change_percent, None)
    previous_close_f = _to_float(previous_close, None)
    state = market_state.setdefault(state_key, {})
    last_price_f = _to_float(state.get("last_price"), None)
    stored_prev_close = _to_float(state.get("previous_close"), None)
    ref_price_f = _to_float(state.get("ref_price"), None)

    if previous_close_f not in (None, 0):
        state["previous_close"] = previous_close_f
        state["ref_price"] = previous_close_f
        ref_price_f = previous_close_f
    else:
        previous_close_f = stored_prev_close

    if ref_price_f in (None, 0):
        state["ref_price"] = price_f
        ref_price_f = price_f

    if ref_price_f not in (None, 0):
        change_f = price_f - ref_price_f
        change_percent_f = (change_f / ref_price_f) * 100
    else:
        if change_f is None and last_price_f is not None:
            change_f = price_f - last_price_f
        if change_percent_f is None:
            if change_f is not None and last_price_f not in (None, 0):
                change_percent_f = (change_f / last_price_f) * 100
            else:
                change_percent_f = 0.0

    event_ts = _to_unix_seconds(tick.get("time"))
    candle = _build_or_update_candle(state_key, price_f, event_ts)
    state["last_price"] = price_f

    payload = {
        "symbol": symbol,
        "price": price_f,
        "volume": _to_int(volume),
        "change": _to_float(change_f),
        "change_percent": _to_float(change_percent_f),
        "previous_close": _to_float(state.get("ref_price"), None),
        "time": event_ts,
        "candle": candle,
        "source": "live",
    }
    state["last_payload"] = payload
    state["last_tick_seen_at"] = int(time.time())
    return payload


def get_snapshot(symbol):
    ticker = _ticker(symbol)
    try:
        info = getattr(ticker, "fast_info", {}) or {}
        history = ticker.history(period="1d", interval="1m")
    except Exception as error:
        print(f"snapshot error for {symbol}: {error}")
        return None
    state = market_state.setdefault(symbol, {})
    candles = []

    live_price = _to_float(info.get("last_price"), None)
    live_volume = _to_int(info.get("last_volume"), None)

    if not history.empty:
        recent = history.tail(CANDLE_LIMIT)
        for idx, row in recent.iterrows():
            open_p = _to_float(row.get("Open"), None)
            high_p = _to_float(row.get("High"), None)
            low_p = _to_float(row.get("Low"), None)
            close_p = _to_float(row.get("Close"), None)
            if None in (open_p, high_p, low_p, close_p):
                continue
            candles.append(
                {
                    "time": _to_unix_seconds(idx),
                    "open": open_p,
                    "high": high_p,
                    "low": low_p,
                    "close": close_p,
                }
            )
        if candles:
            state["candles"] = candles

        last_row = history.iloc[-1]
        # Prefer fast_info live values first; fallback to latest 1m candle.
        price = _to_float(live_price, _to_float(last_row.get("Close")))
        volume = _to_int(live_volume, _to_int(last_row.get("Volume")))
        if volume == 0:
            try:
                volume = _to_int(history["Volume"].fillna(0).sum(), 0)
            except Exception:
                pass
    else:
        price = _to_float(live_price)
        volume = _to_int(live_volume)

    if not price:
        return None

    state["last_price"] = price
    prev_close = _first_not_none(
        _to_float(info.get("previous_close"), None),
        _to_float(info.get("regular_market_previous_close"), None),
        get_previous_close(ticker),
        _to_float(state.get("previous_close"), None),
    )
    if prev_close not in (None, 0):
        state["previous_close"] = prev_close
        state["ref_price"] = prev_close
    elif _to_float(state.get("ref_price"), None) in (None, 0):
        state["ref_price"] = price

    ref_price = _to_float(state.get("ref_price"), None)
    if ref_price not in (None, 0):
        change = price - ref_price
        change_percent = (change / ref_price) * 100
    else:
        change = _to_float(info.get("regular_market_change"))
        change_percent = _to_float(info.get("regular_market_change_percent"))

    event_ts = int(time.time())
    candle = _build_or_update_candle(symbol, price, event_ts)

    return {
        "symbol": symbol,
        "price": price,
        "volume": volume if volume > 0 else None,
        "change": _to_float(change),
        "change_percent": _to_float(change_percent),
        "previous_close": _to_float(ref_price, None),
        "time": event_ts,
        "candle": candle,
        "candles": state.get("candles", []),
        "source": "snapshot",
    }


def start_stream(symbol):
    symbol = symbol.upper()

    if symbol in streams:
        return streams[symbol]["queue"]
    
    ticker = _ticker(symbol)
    q = queue.Queue()
    stop_event = threading.Event()

    def worker():
        try:
            for tick in ticker.live():
                if stop_event.is_set():
                    break
                q.put(tick)
        except Exception as e:
            print("stream error:", e)

    threading.Thread(target=worker, daemon=True).start()

    streams[symbol] = {
        "queue": q,
        "stop": stop_event,
    }

    return q


def consume_live_ticks(symbol, max_items=200):
    upper = symbol.upper()
    q = start_stream(upper)
    last_payload = None

    for _ in range(max_items):
        try:
            tick = q.get_nowait()
        except queue.Empty:
            break

        payload = normalize_tick(tick, upper)
        if payload is None:
            continue

        payload = enrich_volume_from_snapshot(payload, upper)
        last_payload = payload

    return last_payload


def get_last_payload(symbol, max_age_seconds=30):
    upper = symbol.upper()
    state = market_state.get(upper, {})
    payload = state.get("last_payload")
    seen_at = state.get("last_tick_seen_at")

    if not payload or not seen_at:
        return None
    if int(time.time()) - int(seen_at) > max_age_seconds:
        return None
    return payload


def get_state_candles(symbol, limit=60):
    upper = symbol.upper()
    state = market_state.get(upper, {})
    candles = state.get("candles", []) or []
    if limit and limit > 0:
        return candles[-limit:]
    return candles


def enrich_volume_from_snapshot(payload, symbol):
    if _to_int(payload.get("volume"), 0) != 0:
        return payload

    try:
        snapshot = get_snapshot(symbol)
    except Exception as error:
        print(f"volume enrichment error for {symbol}: {error}")
        return payload

    if snapshot and snapshot.get("volume") is not None:
        payload["volume"] = snapshot["volume"]
    return payload
