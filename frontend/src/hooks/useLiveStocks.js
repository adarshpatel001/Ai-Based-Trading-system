import { useEffect, useMemo, useRef, useState } from "react";

export function useLiveStocks(symbols) {
  const [stocks, setStocks] = useState({});
  const [statusMap, setStatusMap] = useState({});
  const socketsRef = useRef({});

  const wsBaseUrl = useMemo(() => {
    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    const host = window.location.hostname || "127.0.0.1";
    return `${protocol}://${host}:8000/ws`;
  }, []);

  useEffect(() => {
    symbols.forEach((symbol) => {
      if (socketsRef.current[symbol]) return;

      const ws = new WebSocket(`${wsBaseUrl}/${symbol}`);
      socketsRef.current[symbol] = ws;
      setStatusMap((prev) => ({ ...prev, [symbol]: "connecting" }));

      ws.onopen = () => {
        setStatusMap((prev) => ({ ...prev, [symbol]: "connected" }));
      };

      ws.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          setStocks((prev) => {
            const current = prev[symbol] || {};
            let nextCandles = Array.isArray(current.candles) ? current.candles : [];

            if (Array.isArray(parsed.candles) && parsed.candles.length > 0) {
              nextCandles = parsed.candles;
            }

            if (parsed.candle) {
              const idx = nextCandles.findIndex((c) => c.time === parsed.candle.time);
              if (idx >= 0) {
                nextCandles = [...nextCandles];
                nextCandles[idx] = parsed.candle;
              } else {
                nextCandles = [...nextCandles, parsed.candle];
              }
            }

            if (nextCandles.length > 60) {
              nextCandles = nextCandles.slice(-60);
            }

            return {
              ...prev,
              [symbol]: {
                ...current,
                ...parsed,
                candles: nextCandles,
              },
            };
          });
        } catch (error) {
          console.log(`WS parse error (${symbol})`, error);
        }
      };

      ws.onerror = () => {
        setStatusMap((prev) => ({ ...prev, [symbol]: "error" }));
      };

      ws.onclose = () => {
        setStatusMap((prev) => ({ ...prev, [symbol]: "disconnected" }));
        delete socketsRef.current[symbol];
      };
    });

    return () => {
      Object.values(socketsRef.current).forEach((socket) => {
        try {
          socket.close();
        } catch {
          // no-op
        }
      });
      socketsRef.current = {};
    };
  }, [symbols, wsBaseUrl]);

  return { stocks, statusMap };
}
