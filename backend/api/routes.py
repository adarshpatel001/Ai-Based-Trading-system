import asyncio
import queue
import time

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from services.stock_stream import (
    consume_live_ticks,
    enrich_volume_from_snapshot,
    get_state_candles,
    get_snapshot,
    normalize_tick,
    start_stream,
)

router = APIRouter()


def infer_market(symbol: str):
    upper = symbol.upper()
    if upper.endswith(".NS"):
        return {"currency": "INR", "exchange": "NSE"}
    if upper.endswith(".BO"):
        return {"currency": "INR", "exchange": "BSE"}
    return {"currency": "USD", "exchange": "YAHOO"}


@router.get("/")
def health():
    return {"status": "ok"}


@router.get("/quote/{symbol}")
def quote(symbol: str):
    upper = symbol.upper()
    market = infer_market(upper)
    start_stream(upper)
    payload = consume_live_ticks(upper, max_items=300)
    if payload is None:
        payload = get_snapshot(upper)

    if not payload:
        return {
            "symbol": upper,
            "name": upper,
            "price": 0,
            "change": 0,
            "changePercent": 0,
            "previousClose": 0,
            "volume": None,
            "marketState": "UNKNOWN",
            "currency": market["currency"],
            "exchange": market["exchange"],
            "time": int(time.time()),
        }

    return {
        "symbol": upper,
        "name": upper,
        "price": payload.get("price", 0),
        "change": payload.get("change", 0),
        "changePercent": payload.get("change_percent", 0),
        "previousClose": payload.get("previous_close", 0),
        "volume": payload.get("volume"),
        "marketState": "OPEN" if payload.get("source") == "live" else "SNAPSHOT",
        "currency": market["currency"],
        "exchange": market["exchange"],
        "time": payload.get("time"),
    }


@router.get("/quotes")
def quotes(symbols: str):
    names = [s.strip().upper() for s in symbols.split(",") if s.strip()]
    rows = []
    for symbol in names:
        market = infer_market(symbol)
        start_stream(symbol)
        payload = consume_live_ticks(symbol, max_items=150)
        if payload is None:
            payload = get_snapshot(symbol)

        if not payload:
            rows.append(
                {
                    "symbol": symbol,
                    "name": symbol,
                    "price": 0,
                    "change": 0,
                    "changePercent": 0,
                    "previousClose": 0,
                    "volume": None,
                    "marketState": "UNKNOWN",
                    "currency": market["currency"],
                    "exchange": market["exchange"],
                    "time": int(time.time()),
                }
            )
            continue

        rows.append(
            {
                "symbol": symbol,
                "name": symbol,
                "price": payload.get("price", 0),
                "change": payload.get("change", 0),
                "changePercent": payload.get("change_percent", 0),
                "previousClose": payload.get("previous_close", 0),
                "volume": payload.get("volume"),
                "marketState": "OPEN" if payload.get("source") == "live" else "SNAPSHOT",
                "currency": market["currency"],
                "exchange": market["exchange"],
                "time": payload.get("time"),
            }
        )
    return {"quotes": rows}


@router.get("/candles/{symbol}")
def candles(symbol: str, limit: int = 60):
    upper = symbol.upper()
    start_stream(upper)
    consume_live_ticks(upper, max_items=400)

    candle_rows = get_state_candles(upper, limit=limit)
    if not candle_rows:
        snapshot = get_snapshot(upper)
        candle_rows = snapshot.get("candles", []) if snapshot else []

    if limit > 0:
        candle_rows = candle_rows[-limit:]

    return {
        "symbol": upper,
        "interval": "1m",
        "range": "1d",
        "candles": candle_rows,
    }


@router.websocket("/ws/{symbol}")
async def websocket_stock(websocket: WebSocket, symbol: str):
    await websocket.accept()
    symbol = symbol.upper()
    q = start_stream(symbol)
    last_sent_at = 0.0

    try:
        initial = get_snapshot(symbol)
        if initial:
            await websocket.send_json(initial)
            last_sent_at = time.time()

        while True:
            try:
                tick = q.get_nowait()
            except queue.Empty:
                if time.time() - last_sent_at > 5:
                    snapshot = get_snapshot(symbol)
                    if snapshot:
                        await websocket.send_json(snapshot)
                        last_sent_at = time.time()
                await asyncio.sleep(0.05)
                continue

            payload = normalize_tick(tick, symbol)
            if payload is None:
                continue

            payload = enrich_volume_from_snapshot(payload, symbol)

            try:
                await websocket.send_json(payload)
                last_sent_at = time.time()
            except WebSocketDisconnect:
                print("client disconnected")
                break

    except WebSocketDisconnect:
        print("client disconnected")
    except Exception as e:
        print("websocket error:", e)
