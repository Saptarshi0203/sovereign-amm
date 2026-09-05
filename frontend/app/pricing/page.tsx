"use client";

import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useEngineStore } from "@/store/engineStore";
import { useWebSocket } from "@/hooks/useWebSocket";

export default function PricingPage() {
  const { isConnected } = useWebSocket("ws://127.0.0.1:8000/ws/stream");
  const { tick, micro_price, amm_bid, amm_ask, quote_breakdown } = useEngineStore();

  const [history, setHistory] = useState<any[]>([]);
  const [latestState, setLatestState] = useState<any>(null);

  useEffect(() => {
    if (tick && micro_price && amm_bid && amm_ask && quote_breakdown) {
      const mid = micro_price / 1_000_000;
      const bid = amm_bid / 1_000_000;
      const ask = amm_ask / 1_000_000;
      
      const newPoint = {
        tick,
        mid,
        bid,
        ask,
        c_deg: quote_breakdown.c_deg || 0,
        delta_bid: quote_breakdown.delta_bid || 0,
        delta_ask: quote_breakdown.delta_ask || 0,
      };
      
      setLatestState(newPoint);
      setHistory(prev => {
         const last = prev[prev.length - 1];
         if (last && last.tick === tick) return prev;
         return [...prev.slice(-49), newPoint];
      });
    }
  }, [tick, micro_price, amm_bid, amm_ask, quote_breakdown]);

  if (!latestState) return <div className="p-8 text-textMuted">Waiting for market data... {isConnected ? "" : "(Offline)"}</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-outfit font-bold text-textMain">GLFT Pricing Engine</h1>
          <p className="text-textMuted mt-2">Real-time asymptotic quote calculation with Rainflow degradation costs.</p>
        </div>
        <button 
          className="bg-accent/20 text-accent px-4 py-2 rounded-md font-medium text-sm hover:bg-accent/30 transition-colors flex items-center gap-2"
        >
          <span className="text-lg">✨</span> Explain this price change
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Waterfall Breakdown Panel */}
        <div className="bg-surface border border-border rounded-lg p-6 lg:col-span-1 shadow-sm">
          <h2 className="text-lg font-bold mb-6 font-outfit">Price Construction Waterfall</h2>
          
          <div className="space-y-4 font-jetbrains text-sm">
            <div className="flex justify-between items-center pb-2 border-b border-border">
              <span className="text-textMuted">Reference Mid Price</span>
              <span className="font-bold">₹{latestState.mid.toFixed(4)}</span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-border">
              <span className="text-red-400">- Bid Spread ($\delta^b$)</span>
              <span>-₹{latestState.delta_bid.toFixed(4)}</span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-border bg-green-500/10 p-2 rounded">
              <span className="font-bold text-green-400">Final Bid Price</span>
              <span className="font-bold text-green-400">₹{latestState.bid.toFixed(4)}</span>
            </div>
            
            <div className="pt-4 flex justify-between items-center pb-2 border-b border-border">
              <span className="text-textMuted">Reference Mid Price</span>
              <span className="font-bold">₹{latestState.mid.toFixed(4)}</span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-border">
              <span className="text-blue-400">+ Ask Spread ($\delta^a$)</span>
              <span>+₹{latestState.delta_ask.toFixed(4)}</span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-border">
              <span className="text-orange-400">+ Degradation Cost (C_deg)</span>
              <span>+₹{latestState.c_deg.toFixed(4)}</span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-border bg-red-500/10 p-2 rounded">
              <span className="font-bold text-red-400">Final Ask Price</span>
              <span className="font-bold text-red-400">₹{latestState.ask.toFixed(4)}</span>
            </div>
          </div>
        </div>

        {/* Time-series Chart */}
        <div className="bg-surface border border-border rounded-lg p-6 lg:col-span-2 shadow-sm">
          <h2 className="text-lg font-bold mb-4 font-outfit">Real-time Quote Spreads</h2>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={history} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2D2D2D" />
                <XAxis dataKey="tick" stroke="#888" tick={{fontSize: 12}} />
                <YAxis domain={['auto', 'auto']} stroke="#888" tick={{fontSize: 12}} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1A1A1A', borderColor: '#333' }}
                  itemStyle={{ fontSize: '14px' }}
                />
                <Legend />
                <Line type="monotone" dataKey="ask" stroke="#ef4444" strokeWidth={2} name="Ask Price" dot={false} isAnimationActive={false} />
                <Line type="monotone" dataKey="mid" stroke="#8b5cf6" strokeWidth={2} strokeDasharray="5 5" name="Mid Price" dot={false} isAnimationActive={false} />
                <Line type="monotone" dataKey="bid" stroke="#22c55e" strokeWidth={2} name="Bid Price" dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
