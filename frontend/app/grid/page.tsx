"use client";

import { useEffect, useState } from "react";

export default function GridPage() {
  const [gridData, setGridData] = useState<any>(null);

  useEffect(() => {
    const ws = new WebSocket("ws://127.0.0.1:8000/ws/stream");

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "state" && data.grid) {
          setGridData(data.grid);
        }
      } catch (e) {}
    };

    return () => ws.close();
  }, []);

  if (!gridData) return <div className="p-8 text-textMuted">Waiting for grid data...</div>;

  const { line_flows, line_limits, rejections } = gridData;
  
  // Calculate percentage loads
  const load0 = Math.min(100, (Math.abs(line_flows[0]) / line_limits[0]) * 100);
  const load1 = Math.min(100, (Math.abs(line_flows[1]) / line_limits[1]) * 100);
  const load2 = Math.min(100, (Math.abs(line_flows[2]) / line_limits[2]) * 100);

  const getLineColor = (load: number) => {
    if (load > 90) return "stroke-red-500 animate-pulse drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]";
    if (load > 70) return "stroke-yellow-400";
    return "stroke-green-500";
  };

  const getStrokeWidth = (load: number) => 2 + (load / 100) * 4;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-outfit font-bold text-textMain">PTDF Grid Congestion</h1>
          <p className="text-textMuted mt-2">Live microgrid topology with real-time thermal line limits and flow vectors.</p>
        </div>
        <div className="bg-surface border border-border px-4 py-2 rounded-lg text-center">
          <span className="block text-xs text-textMuted uppercase">Trades Rejected (PTDF)</span>
          <span className="block text-xl font-bold font-jetbrains text-red-400">{rejections}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Visual Map */}
        <div className="bg-surface border border-border rounded-lg p-6 lg:col-span-2 shadow-sm min-h-[500px] flex items-center justify-center relative overflow-hidden">
          
          {/* Abstract 3-Bus SVG Representation */}
          <svg width="100%" height="100%" viewBox="0 0 400 400" className="max-w-[400px]">
            {/* Lines */}
            <line x1="200" y1="50" x2="350" y2="300" className={`transition-all duration-300 ${getLineColor(load0)}`} strokeWidth={getStrokeWidth(load0)} />
            <line x1="350" y1="300" x2="50" y2="300" className={`transition-all duration-300 ${getLineColor(load1)}`} strokeWidth={getStrokeWidth(load1)} />
            <line x1="50" y1="300" x2="200" y2="50" className={`transition-all duration-300 ${getLineColor(load2)}`} strokeWidth={getStrokeWidth(load2)} />

            {/* Line Labels (Load %) */}
            <g transform="translate(290, 160)">
              <rect x="-25" y="-12" width="50" height="24" rx="4" fill="#1A1A1A" stroke="#333" />
              <text x="0" y="4" textAnchor="middle" fill="white" fontSize="12" className="font-jetbrains">{load0.toFixed(0)}%</text>
            </g>
            <g transform="translate(200, 310)">
              <rect x="-25" y="-12" width="50" height="24" rx="4" fill="#1A1A1A" stroke="#333" />
              <text x="0" y="4" textAnchor="middle" fill="white" fontSize="12" className="font-jetbrains">{load1.toFixed(0)}%</text>
            </g>
            <g transform="translate(110, 160)">
              <rect x="-25" y="-12" width="50" height="24" rx="4" fill="#1A1A1A" stroke="#333" />
              <text x="0" y="4" textAnchor="middle" fill="white" fontSize="12" className="font-jetbrains">{load2.toFixed(0)}%</text>
            </g>

            {/* Buses */}
            {/* Bus 0: AMM */}
            <circle cx="200" cy="50" r="24" fill="#8b5cf6" stroke="#2D2D2D" strokeWidth="4" />
            <text x="200" y="95" textAnchor="middle" fill="#EAEAEA" fontSize="14" fontWeight="bold">Bus 0: AMM (Slack)</text>

            {/* Bus 1: Solar */}
            <circle cx="350" cy="300" r="24" fill="#eab308" stroke="#2D2D2D" strokeWidth="4" />
            <text x="350" y="345" textAnchor="middle" fill="#EAEAEA" fontSize="14" fontWeight="bold">Bus 1: Solar Farm</text>

            {/* Bus 2: Household */}
            <circle cx="50" cy="300" r="24" fill="#3b82f6" stroke="#2D2D2D" strokeWidth="4" />
            <text x="50" y="345" textAnchor="middle" fill="#EAEAEA" fontSize="14" fontWeight="bold">Bus 2: Households</text>
          </svg>
        </div>

        {/* Line Details Panel */}
        <div className="bg-surface border border-border rounded-lg p-6 lg:col-span-1 shadow-sm">
          <h2 className="text-lg font-bold mb-6 font-outfit">Line Capacity (Thermal Limits)</h2>
          
          <div className="space-y-6 font-jetbrains text-sm">
            {[
              { id: 0, name: "Line 0 (AMM ↔ Solar)", flow: line_flows[0], limit: line_limits[0], load: load0 },
              { id: 1, name: "Line 1 (Solar ↔ House)", flow: line_flows[1], limit: line_limits[1], load: load1 },
              { id: 2, name: "Line 2 (AMM ↔ House)", flow: line_flows[2], limit: line_limits[2], load: load2 },
            ].map((line) => (
              <div key={line.id}>
                <div className="flex justify-between mb-2">
                  <span className="text-textMuted">{line.name}</span>
                  <span className={line.load > 90 ? "text-red-400 font-bold" : ""}>
                    {Math.abs(line.flow).toFixed(2)} / {line.limit.toFixed(2)} kW
                  </span>
                </div>
                <div className="w-full bg-surfaceHighlight rounded-full h-2.5">
                  <div 
                    className={`h-2.5 rounded-full ${line.load > 90 ? 'bg-red-500' : line.load > 70 ? 'bg-yellow-400' : 'bg-green-500'}`} 
                    style={{ width: `${line.load}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 p-4 bg-red-500/10 border border-red-500/20 rounded-md">
            <h3 className="font-bold text-red-400 mb-2 flex items-center gap-2">
              <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5zm.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/></svg>
              Safety Mechanism
            </h3>
            <p className="text-xs text-textMuted leading-relaxed">
              Any trade in the L2 Order Book that implies a power transfer causing a line to breach its safety margin (≈ 90% of f_max) is automatically pre-screened and rejected by the engine before clearing.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
