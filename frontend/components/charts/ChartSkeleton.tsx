import React from 'react';

export function ChartSkeleton({ height = 300 }: { height?: number | string }) {
  return (
    <div 
      className="w-full flex items-center justify-center bg-slate-900/20 border border-slate-800/30 rounded-lg animate-pulse"
      style={{ height }}
    >
      <div className="flex flex-col items-center gap-3">
        <div className="w-12 h-12 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin"></div>
        <p className="text-xs font-mono text-slate-500 uppercase tracking-widest">Loading Telemetry...</p>
      </div>
    </div>
  );
}
