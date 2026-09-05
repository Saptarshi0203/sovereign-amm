"use client";

import { useState, useCallback } from "react";

export function JudgeControls() {
  const [sunlight, setSunlight] = useState(1.0);
  const [load, setLoad] = useState(1.0);
  const [sigma, setSigma] = useState(0.5);
  const [gamma, setGamma] = useState(0.1);

  const updateBackend = useCallback((payload: any) => {
    fetch("http://localhost:8000/api/control", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }).catch(e => console.error("Control API failed", e));
  }, []);

  const handleSunlight = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    setSunlight(v);
    updateBackend({ sunlight_multiplier: v });
  };

  const handleLoad = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    setLoad(v);
    updateBackend({ load_multiplier: v });
  };

  const handleSigma = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    setSigma(v);
    updateBackend({ sigma: v });
  };

  const handleGamma = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    setGamma(v);
    updateBackend({ gamma: v });
  };

  return (
    <div className="flex-1 flex flex-col gap-5 font-mono text-xs tabular-nums p-2">
      <div className="flex flex-col gap-2">
        <div className="flex justify-between font-sans tracking-widest text-[10px] text-accent drop-shadow-[0_0_5px_rgba(0,229,255,0.5)]"><span>SUNLIGHT INTENSITY</span><span className="text-textMain font-mono text-sm">{sunlight.toFixed(1)}x</span></div>
        <input type="range" min="0.0" max="3.0" step="0.1" value={sunlight} onChange={handleSunlight} className="w-full accent-accent h-1 bg-white/10 rounded-full appearance-none cursor-pointer outline-none" />
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex justify-between font-sans tracking-widest text-[10px] text-danger drop-shadow-[0_0_5px_rgba(255,0,85,0.5)]"><span>GRID LOAD MULTIPLIER</span><span className="text-textMain font-mono text-sm">{load.toFixed(1)}x</span></div>
        <input type="range" min="0.5" max="3.0" step="0.1" value={load} onChange={handleLoad} className="w-full accent-danger h-1 bg-white/10 rounded-full appearance-none cursor-pointer outline-none" />
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex justify-between font-sans tracking-widest text-[10px] text-success drop-shadow-[0_0_5px_rgba(0,255,102,0.5)]"><span>VOLATILITY (σ)</span><span className="text-textMain font-mono text-sm">{sigma.toFixed(2)}</span></div>
        <input type="range" min="0.1" max="2.0" step="0.1" value={sigma} onChange={handleSigma} className="w-full accent-success h-1 bg-white/10 rounded-full appearance-none cursor-pointer outline-none" />
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex justify-between font-sans tracking-widest text-[10px] text-accent drop-shadow-[0_0_5px_rgba(0,229,255,0.5)]"><span>RISK AVERSION (γ)</span><span className="text-textMain font-mono font-bold text-sm">{gamma.toFixed(2)}</span></div>
        <input type="range" min="0.01" max="1.0" step="0.01" value={gamma} onChange={handleGamma} className="w-full accent-accent h-1 bg-white/10 rounded-full appearance-none cursor-pointer outline-none" />
      </div>
    </div>
  );
}
