import { useEffect, useRef, useState } from 'react';
import { useEngineStore } from '../store/engineStore';

export function useWebSocket(url: string) {
  const [isConnected, setIsConnected] = useState(false);
  const setEngineState = useEngineStore((state) => state.setEngineState);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    let retryCount = 0;
    
    const connect = () => {
      wsRef.current = new WebSocket(url);

      wsRef.current.onopen = () => {
        setIsConnected(true);
        retryCount = 0;
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === "state") {
            setEngineState({
              tick: data.tick,
              micro_price: data.micro_price,
              best_bid: data.best_bid,
              best_ask: data.best_ask,
              soc: data.battery_soc,
              q: data.battery_q,
              bids: data.bids,
              asks: data.asks,
              amm_bid: data.amm_bid,
              amm_ask: data.amm_ask,
              quote_breakdown: data.quote_breakdown,
            });
          }
        } catch (e) {
          console.error("Failed to parse WS message", e);
        }
      };

      wsRef.current.onclose = () => {
        setIsConnected(false);
        const timeout = Math.min(1000 * Math.pow(2, retryCount), 10000);
        retryCount++;
        reconnectTimeoutRef.current = setTimeout(connect, timeout);
      };

      wsRef.current.onerror = (err) => {
        console.error("WS Error: ", err);
        wsRef.current?.close();
      };
    };

    connect();

    return () => {
      clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [url, setEngineState]);

  return { isConnected };
}
