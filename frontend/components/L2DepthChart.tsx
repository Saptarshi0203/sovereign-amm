"use client";

import { useEngineStore } from "@/store/engineStore";

export function L2DepthChart() {
  const { bids, asks, amm_bid, amm_ask } = useEngineStore();

  let cumAsk = 0;
  const asksWithCum = asks.map(([p, v]) => { cumAsk += v; return { p, v, cum: cumAsk } });
  let cumBid = 0;
  const bidsWithCum = bids.map(([p, v]) => { cumBid += v; return { p, v, cum: cumBid } });
  
  const maxCum = Math.max(cumAsk, cumBid, 1);

  return (
    <div className="flex-1 flex flex-col font-mono text-xs overflow-hidden tabular-nums w-full">
      {/* Header */}
      <div className="flex justify-between text-textMuted border-b border-white/10 pb-1 mb-1 px-2 font-sans tracking-widest text-[9px]">
        <span className="w-1/3 text-right">BID VOL</span>
        <span className="w-1/3 text-center">PRICE</span>
        <span className="w-1/3 text-left">ASK VOL</span>
      </div>
      
      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Asks (Red, descending) */}
        <div className="flex flex-col-reverse justify-end gap-[1px]">
          {asksWithCum.slice().reverse().map(({p, v, cum}, i) => {
            const isAmm = Math.abs(p - (amm_ask || 0)) < 1e-6;
            const pct = (cum / maxCum) * 100;
            return (
              <div key={`ask-${i}`} className={`flex justify-between px-2 py-[2px] relative transition-colors ${isAmm ? 'bg-danger/20 font-bold border-l-2 border-danger shadow-[inset_2px_0_10px_rgba(255,0,85,0.3)]' : ''}`}>
                <div className="absolute right-0 top-0 bottom-0 bg-gradient-to-l from-danger/20 to-transparent" style={{ width: `${pct}%` }} />
                <span className="w-1/3 text-right z-10 text-textMuted/50">-</span>
                <span className="w-1/3 text-center text-danger z-10 drop-shadow-[0_0_2px_rgba(255,0,85,0.8)]">{p.toFixed(4)}</span>
                <span className="w-1/3 text-left z-10">{v.toFixed(2)}</span>
              </div>
            )
          })}
        </div>
        
        <div className="h-4 flex items-center justify-center text-accent/50 text-[10px] tracking-widest my-1 drop-shadow-[0_0_5px_rgba(0,229,255,0.5)]">--- SPREAD ---</div>
        
        {/* Bids (Green, descending) */}
        <div className="flex flex-col gap-[1px]">
          {bidsWithCum.map(({p, v, cum}, i) => {
            const isAmm = Math.abs(p - (amm_bid || 0)) < 1e-6;
            const pct = (cum / maxCum) * 100;
            return (
              <div key={`bid-${i}`} className={`flex justify-between px-2 py-[2px] relative transition-colors ${isAmm ? 'bg-success/20 font-bold border-l-2 border-success shadow-[inset_2px_0_10px_rgba(0,255,102,0.3)]' : ''}`}>
                <div className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-success/20 to-transparent" style={{ width: `${pct}%` }} />
                <span className="w-1/3 text-right z-10">{v.toFixed(2)}</span>
                <span className="w-1/3 text-center text-success z-10 drop-shadow-[0_0_2px_rgba(0,255,102,0.8)]">{p.toFixed(4)}</span>
                <span className="w-1/3 text-left z-10 text-textMuted/50">-</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  );
}
