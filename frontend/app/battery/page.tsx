"use client";

import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

export default function BatteryPage() {
  const [history, setHistory] = useState<any[]>([]);
  const [latestState, setLatestState] = useState<any>(null);

  useEffect(() => {
    const ws = new WebSocket("ws://127.0.0.1:8000/ws/stream");

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "state") {
          const socKw = data.battery_soc / 1_000_000;
          const qMaxKw = 100; // GLFT parameter Q_max in kW (100_000_000 micro-units = 100 kW)
          const newPoint = {
            tick: data.tick,
            soc: socKw,
            c_deg: data.breakdown?.c_deg || 0,
            qMax: qMaxKw,
          };
          
          setLatestState(newPoint);
          setHistory(prev => [...prev.slice(-99), newPoint]); // Keep last 100
        }
      } catch (e) {}
    };

    return () => ws.close();
  }, []);

  if (!latestState) return <div className="p-8 text-textMuted">Waiting for battery data...</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-outfit font-bold text-textMain">Battery & Degradation</h1>
          <p className="text-textMuted mt-2">Live SoC tracking against bounds and Rainflow fatigue cost.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-surface border border-border rounded-lg p-6 shadow-sm">
          <h3 className="text-sm text-textMuted uppercase tracking-wider mb-2">Current SoC</h3>
          <div className="text-3xl font-bold font-jetbrains">{latestState.soc.toFixed(2)} <span className="text-lg text-textMuted font-sans">kWh</span></div>
        </div>
        <div className="bg-surface border border-border rounded-lg p-6 shadow-sm">
          <h3 className="text-sm text-textMuted uppercase tracking-wider mb-2">Marginal Wear Cost (C_deg)</h3>
          <div className="text-3xl font-bold font-jetbrains text-orange-400">₹{latestState.c_deg.toFixed(4)}</div>
        </div>
        <div className="bg-surface border border-border rounded-lg p-6 shadow-sm">
          <h3 className="text-sm text-textMuted uppercase tracking-wider mb-2">Equivalent Full Cycles</h3>
          <div className="text-3xl font-bold font-jetbrains">
            {/* Mock cycles until Rainflow exposes it in WS */}
            {(latestState.c_deg * 10).toFixed(2)}
          </div>
        </div>
      </div>

      <div className="bg-surface border border-border rounded-lg p-6 shadow-sm">
        <h2 className="text-lg font-bold mb-4 font-outfit">State of Charge (SoC) vs Limits</h2>
        <div className="h-96 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={history} margin={{ top: 20, right: 30, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2D2D2D" />
              <XAxis dataKey="tick" stroke="#888" tick={{fontSize: 12}} />
              <YAxis domain={[0, latestState.qMax]} stroke="#888" tick={{fontSize: 12}} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1A1A1A', borderColor: '#333' }}
                itemStyle={{ fontSize: '14px' }}
              />
              <ReferenceLine y={latestState.qMax} label={{ position: 'top', value: 'Ceiling Wall', fill: '#ef4444', fontSize: 12 }} stroke="#ef4444" strokeDasharray="3 3" />
              <ReferenceLine y={0} label={{ position: 'bottom', value: 'Floor Wall', fill: '#ef4444', fontSize: 12 }} stroke="#ef4444" strokeDasharray="3 3" />
              <Line type="monotone" dataKey="soc" stroke="#3b82f6" strokeWidth={3} name="SoC (kWh)" dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
