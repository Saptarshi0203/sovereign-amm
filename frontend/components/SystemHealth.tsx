"use client";

import { useEffect, useState } from "react";

export default function SystemHealth() {
  const [tick, setTick] = useState(0);
  const [wsStatus, setWsStatus] = useState<"connecting" | "connected" | "disconnected">("connecting");

  useEffect(() => {
    let ws: WebSocket;
    
    const connect = () => {
      ws = new WebSocket("ws://127.0.0.1:8000/ws/stream");
      
      ws.onopen = () => setWsStatus("connected");
      ws.onclose = () => setWsStatus("disconnected");
      ws.onerror = () => setWsStatus("disconnected");
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "state" && data.tick) {
            setTick(data.tick);
          }
        } catch (e) {}
      };
    };

    connect();

    // Reconnect logic
    const interval = setInterval(() => {
      if (wsStatus === "disconnected") {
        setWsStatus("connecting");
        connect();
      }
    }, 5000);

    return () => {
      clearInterval(interval);
      if (ws) ws.close();
    };
  }, [wsStatus]);

  return (
    <div className="fixed bottom-0 left-0 w-full h-8 bg-surface border-t border-border flex items-center justify-between px-4 text-xs font-jetbrains text-textMuted z-30">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${wsStatus === 'connected' ? 'bg-green-500 shadow-[0_0_5px_#22c55e]' : wsStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' : 'bg-red-500'}`}></div>
          <span className="uppercase">{wsStatus} (10 Hz Feed)</span>
        </div>
        <div>
          Engine Tick: <span className="text-textMain">{tick}</span>
        </div>
      </div>
      <div className="flex gap-4">
        <span>Sovereign AMM v1.0.0</span>
        <span>Deterministic Deterministic Mode: ON</span>
      </div>
    </div>
  );
}
