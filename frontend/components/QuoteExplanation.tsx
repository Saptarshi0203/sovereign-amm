"use client";

import { useEngineStore } from "@/store/engineStore";

export function QuoteExplanation() {
  const { quote_breakdown, micro_price } = useEngineStore();
  
  if (!quote_breakdown) return <div className="text-textMuted text-xs p-2 text-center mt-4">Waiting for quote...</div>;
  
  const { base, spread, delta_bid, delta_ask, c_deg } = quote_breakdown;
  const bid_price = micro_price - delta_bid;
  const ask_price = micro_price + delta_ask + c_deg;
  
  return (
    <div className="flex-1 flex flex-col gap-3 font-mono text-xs tabular-nums p-2 overflow-y-auto">
       <div className="flex justify-between border-b border-border pb-1 text-textMuted">
         <span>Base Spread</span>
         <span>{base.toFixed(4)}</span>
       </div>
       <div className="flex justify-between border-b border-border pb-1 text-textMuted">
         <span>Spread Scaler</span>
         <span>{spread.toFixed(4)}</span>
       </div>
       <div className="flex justify-between border-b border-border pb-1 text-textMuted">
         <span>Inv Skew (Bid)</span>
         <span>{(delta_bid - base).toFixed(4)}</span>
       </div>
       <div className="flex justify-between border-b border-border pb-1 text-textMuted">
         <span>Inv Skew (Ask)</span>
         <span>{(delta_ask - base).toFixed(4)}</span>
       </div>
       <div className="flex justify-between border-b border-border pb-1 text-textMuted">
         <span>Wear Cost (C_deg)</span>
         <span className="text-danger">+{c_deg.toFixed(4)}</span>
       </div>
       
       <div className="flex flex-col gap-1 mt-2 p-2 bg-background border border-border">
         <div className="flex justify-between text-success font-bold">
           <span>FINAL BID</span>
           <span>{bid_price.toFixed(6)}</span>
         </div>
         <div className="text-[9px] text-textMuted">Mid - Base - Skew</div>
       </div>

       <div className="flex flex-col gap-1 p-2 bg-background border border-border">
         <div className="flex justify-between text-danger font-bold">
           <span>FINAL ASK</span>
           <span>{ask_price.toFixed(6)}</span>
         </div>
         <div className="text-[9px] text-textMuted">Mid + Base + Skew + C_deg</div>
       </div>
    </div>
  )
}
