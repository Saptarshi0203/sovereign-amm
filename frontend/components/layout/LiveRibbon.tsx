'use client';

/**
 * @file LiveRibbon.tsx
 * @description Live telemetry bar sticky under the navbar on terminal pages.
 * Shows: μ-price, bid, ask, spread, OBI, SoC, C_deg, Hz, feed status, IST clock, tick.
 * Values flash (CSS animate-flash-telemetry) when they change.
 */

import { useEffect, useRef, useState } from 'react';
import { Activity, Zap } from 'lucide-react';
import { useStore } from '@/lib/store';
import { formatPrice, formatOBI } from '@/lib/utils';

function TelemetryCell({
  label,
  value,
  flash = false,
}: {
  label: string;
  value: string | number;
  flash?: boolean;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const prev = useRef(value);

  useEffect(() => {
    // Respect prefers-reduced-motion: skip visual flash entirely
    if (!flash || value === prev.current) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      prev.current = value;
      return;
    }
    const el = ref.current;
    if (!el) return;
    el.classList.remove('animate-flash-telemetry');
    void el.offsetWidth; // force reflow to restart animation
    el.classList.add('animate-flash-telemetry');
    prev.current = value;
    // Match the 150ms keyframe duration in tailwind.config.ts
    const t = setTimeout(() => el.classList.remove('animate-flash-telemetry'), 200);
    return () => clearTimeout(t);
  }, [value, flash]);

  return (
    <div className="flex items-baseline gap-1.5 font-mono text-xs whitespace-nowrap shrink-0">
      <span className="text-slate-500 uppercase tracking-wider text-[10px]">{label}</span>
      <span ref={ref} className="text-white tabular-nums font-semibold">{value}</span>
    </div>
  );
}

export function LiveRibbon() {
  const microPrice   = useStore((s) => s.microPrice);
  const bestBid      = useStore((s) => s.bestBid);
  const bestAsk      = useStore((s) => s.bestAsk);
  const obi          = useStore((s) => s.obi);
  const soc          = useStore((s) => s.soc);
  const cDeg         = useStore((s) => s.cDeg);
  const gridHz       = useStore((s) => s.gridFrequencyHz);
  const dataSource   = useStore((s) => s.dataSource);
  const obConnected  = useStore((s) => s.orderbookConnected);
  const gridConn     = useStore((s) => s.gridConnected);
  const tick         = useStore((s) => s.tickNumber);

  const spread = Math.max(0, bestAsk.px - bestBid.px);
  const live = dataSource === 'live';
  const connected = obConnected && gridConn;

  const [time, setTime] = useState(() =>
    new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour12: false })
  );
  useEffect(() => {
    const id = setInterval(
      () => setTime(new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour12: false })),
      1000
    );
    return () => clearInterval(id);
  }, []);

  return (
    <div
      className="sticky top-navbar z-40 border-b border-edge/40 bg-canvas/95 backdrop-blur-sm"
      role="region"
      aria-label="Live telemetry ribbon"
    >
      <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-10">
        <div className="flex items-center gap-4 overflow-x-auto py-2 scrollbar-hide">
          {/* Feed status badge */}
          <div className="shrink-0">
            {connected ? (
              <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                <span className="live-dot" aria-hidden="true" />
                {live ? 'Live' : 'Demo'}
              </span>
            ) : (
              <span className="flex items-center gap-1.5 rounded-full border border-rose-500/40 bg-rose-500/10 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                <Zap className="h-3 w-3" aria-hidden="true" />
                Reconnecting
              </span>
            )}
          </div>

          <div className="h-3.5 w-px bg-edge/60 shrink-0" aria-hidden="true" />

          <TelemetryCell label="μ" value={formatPrice(microPrice, 4)} flash />
          <TelemetryCell label="bid" value={formatPrice(bestBid.px, 4)} flash />
          <TelemetryCell label="ask" value={formatPrice(bestAsk.px, 4)} flash />
          <TelemetryCell label="sprd" value={formatPrice(spread, 4)} flash />
          <TelemetryCell label="obi" value={formatOBI(obi)} flash />

          <div className="h-3.5 w-px bg-edge/60 shrink-0" aria-hidden="true" />

          <TelemetryCell label="soc" value={`${soc.toFixed(1)}%`} flash />
          <TelemetryCell label="c_deg" value={formatPrice(cDeg, 4)} flash />
          <TelemetryCell label="hz" value={gridHz.toFixed(2)} flash />

          <div className="h-3.5 w-px bg-edge/60 shrink-0" aria-hidden="true" />

          <TelemetryCell label="tick" value={tick.toLocaleString()} />
          <TelemetryCell label="ist" value={time} />

          <div className="ml-auto shrink-0 pl-2">
            <Activity
              className="h-3 w-3 text-telemetry animate-pulse-slow"
              aria-label="Engine active"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default LiveRibbon;
