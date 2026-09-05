"use client";

import { useWebSocket } from "@/hooks/useWebSocket";
import { useEngineStore } from "@/store/engineStore";
import { useEffect, useState } from "react";
import { Activity, Radio } from "lucide-react";
import { L2DepthChart } from "@/components/L2DepthChart";
import { BatteryGauge } from "@/components/BatteryGauge";
import { TimeSeriesChart } from "@/components/TimeSeriesChart";
import { JudgeControls } from "@/components/JudgeControls";
import { QuoteExplanation } from "@/components/QuoteExplanation";
import { RagCopilot } from "@/components/RagCopilot";

import { TickerFlash } from "@/components/TickerFlash";

export default function Dashboard() {
  const { isConnected } = useWebSocket("ws://localhost:8000/ws/stream");
  const { tick, micro_price, best_bid, best_ask, soc } = useEngineStore();
  
  // Uptime tracker
  const [uptime, setUptime] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setUptime(u => u + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatUptime = (seconds: number) => {
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  return (
    <main className="flex-1 flex flex-col h-screen overflow-hidden p-4 gap-4">
      {/* Header */}
      <header className="panel flex-row justify-between items-center py-2 h-14 shrink-0 shadow-glow-accent/20">
        <div className="flex items-center gap-4">
          <h1 className="font-display font-bold text-xl tracking-widest text-accent flex items-center gap-2 uppercase">
            <Activity size={22} className="animate-pulse-slow" /> SOVEREIGN-AMM
          </h1>
          <div className={`flex items-center gap-2 px-3 py-1 text-xs font-bold uppercase tracking-wider border rounded-full shadow-lg ${isConnected ? 'text-success border-success/50 bg-success/10 shadow-glow-success' : 'text-danger border-danger/50 bg-danger/10 shadow-glow-danger'}`}>
            <Radio size={14} className={isConnected ? "animate-pulse" : ""} />
            {isConnected ? "Live" : "Offline"}
          </div>
        </div>
        
        <div className="flex items-center gap-8 text-sm">
          <div className="flex flex-col items-end">
            <span className="text-[10px] text-textMuted uppercase tracking-widest font-sans">TICK</span>
            <span className="font-mono font-bold text-accent tabular-nums w-20 text-right text-lg">{tick}</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[10px] text-textMuted uppercase tracking-widest font-sans">UPTIME</span>
            <span className="font-mono font-bold tabular-nums w-20 text-right text-lg">{formatUptime(uptime)}</span>
          </div>
        </div>
      </header>

      {/* Main Grid Layout */}
      <div className="flex flex-1 gap-4 overflow-hidden">
        
        {/* Center Canvas */}
        <div className="flex-1 flex flex-col gap-4">
          
          <div className="panel h-28">
            <h2 className="panel-title font-display">TICKER SNAPSHOT</h2>
            <div className="flex gap-12 mt-1">
              <div className="flex flex-col">
                <span className="text-[10px] text-textMuted font-sans">MICRO PRICE (INR/kWh)</span>
                <span className="text-3xl font-mono font-bold tabular-nums text-textMain">
                  <TickerFlash value={(micro_price || 5000000) / 1000000} decimals={4} />
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-textMuted font-sans">BEST BID</span>
                <span className="text-3xl font-mono font-bold text-success tabular-nums">
                  <TickerFlash value={(best_bid || 4990000) / 1000000} decimals={4} />
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-textMuted font-sans">BEST ASK</span>
                <span className="text-3xl font-mono font-bold text-danger tabular-nums">
                  <TickerFlash value={(best_ask || 5010000) / 1000000} decimals={4} />
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-textMuted font-sans">SoC (kWh)</span>
                <span className="text-3xl font-mono font-bold text-accent tabular-nums">
                  <TickerFlash value={(soc || 0) / 1e6} decimals={2} />
                </span>
              </div>
            </div>
          </div>

          <div className="flex-1 flex gap-4">
            <div className="panel flex-1">
              <h2 className="panel-title">L2 DEPTH CHART</h2>
              <L2DepthChart />
            </div>
          </div>
          
          <div className="panel h-64">
            <h2 className="panel-title">ELECTRICITY PRICE CHART (INR/kWh)</h2>
            <TimeSeriesChart />
          </div>

        </div>

        {/* Right Sidebar */}
        <div className="w-80 flex flex-col gap-4">
          
          <div className="panel h-64">
            <h2 className="panel-title">BATTERY GAUGE</h2>
            <BatteryGauge />
          </div>

          <div className="panel flex-1">
            <h2 className="panel-title">QUOTE EXPLANATION</h2>
            <QuoteExplanation />
          </div>

          <div className="panel h-72">
            <h2 className="panel-title">JUDGE CONTROLS</h2>
            <JudgeControls />
          </div>

          <div className="panel flex-1 min-h-0">
            <h2 className="panel-title">RAG COPILOT</h2>
            <RagCopilot />
          </div>

        </div>

      </div>
    </main>
  );
}
