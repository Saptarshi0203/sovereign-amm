"use client";

import { useEngineStore } from "@/store/engineStore";

export function BatteryGauge() {
  const { soc, q } = useEngineStore();
  const max_soc_kwh = 100.0;
  const current_soc = (soc || 0) / 1e6;
  const pct = Math.max(0, Math.min(100, (current_soc / max_soc_kwh) * 100));

  // Dynamic color based on q: q>0 -> green/cyan, q<0 -> red/orange
  let fillClass = "bg-gradient-to-t from-accent to-accent/50 shadow-glow-accent";
  if (q > 0.5) fillClass = "bg-gradient-to-t from-success to-success/50 shadow-glow-success";
  if (q < -0.5) fillClass = "bg-gradient-to-t from-danger to-danger/50 shadow-glow-danger";

  return (
    <div className="flex-1 flex flex-col gap-4 font-mono tabular-nums h-full">
      
      <div className="flex justify-between items-end">
        <div className="flex flex-col">
          <span className="text-[10px] text-textMuted tracking-widest font-sans">CHARGE</span>
          <span className="text-2xl font-bold text-accent drop-shadow-[0_0_8px_rgba(0,229,255,0.8)]">{current_soc.toFixed(2)} <span className="text-sm">kWh</span></span>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-[10px] text-textMuted tracking-widest font-sans">INV SKEW (q)</span>
          <span className={`text-2xl font-bold ${(q || 0) < 0 ? 'text-danger drop-shadow-[0_0_8px_rgba(255,0,85,0.8)]' : 'text-success drop-shadow-[0_0_8px_rgba(0,255,102,0.8)]'}`}>{(q || 0).toFixed(4)}</span>
        </div>
      </div>

      {/* Vertical Bar Gauge */}
      <div className="flex-1 relative w-20 mx-auto bg-background/50 border border-white/10 mt-2 rounded-[2rem] p-1 shadow-[inset_0_0_20px_rgba(0,0,0,0.8)] overflow-hidden">
        {/* Ceiling marker */}
        <div className="absolute top-2 w-full h-[1px] bg-danger/50 z-20 left-0" />
        
        {/* Fill container to allow rounded caps */}
        <div className="absolute bottom-1 left-1 right-1 top-1 flex flex-col justify-end rounded-[1.5rem] overflow-hidden">
          <div 
            className={`w-full transition-all duration-100 ease-linear ${fillClass}`} 
            style={{ height: `${pct}%` }} 
          />
        </div>
        
        {/* Floor marker */}
        <div className="absolute bottom-2 w-full h-[1px] bg-danger/50 z-20 left-0" />
        
        {/* q = 0 center line */}
        <div className="absolute top-1/2 w-full h-[1px] bg-white/20 z-10 left-0 border-b border-black/50" />
      </div>

      <div className="flex justify-between text-[9px] text-textMuted/70 font-sans mt-1 px-4">
        <span>0 kWh</span>
        <span>q=0</span>
        <span>100 kWh</span>
      </div>

    </div>
  );
}
