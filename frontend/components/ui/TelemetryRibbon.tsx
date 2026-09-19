'use client';

import { useStore } from '@/lib/store';
import { useTickFlash } from '@/lib/hooks/useTickFlash';
import { formatOBI, formatPrice } from '@/lib/utils';

interface CellProps {
  label: string;
  value: string;
  sub?: string;
  tone?: 'telemetry' | 'bid' | 'ask' | 'neutral';
  flash?: boolean;
  flashKey?: number;
}

function Cell({ label, value, sub, tone = 'neutral', flash = false, flashKey = 0 }: CellProps) {
  const toneClass =
    tone === 'bid' ? 'text-emerald-600 dark:text-emerald-400' : tone === 'ask' ? 'text-rose-600 dark:text-rose-400' : tone === 'telemetry' ? 'text-telemetry' : 'text-white';
  return (
    <div className="flex flex-col justify-center px-5 py-3 min-w-[150px] shrink-0 border-r border-edge/30 last:border-r-0">
      <span className="text-[10px] uppercase tracking-[0.18em] text-slate-500 font-mono">{label}</span>
      <span key={flash ? flashKey : undefined} className={`text-lg font-mono font-semibold tabular-nums tracking-data ${toneClass} ${flash ? 'animate-flash-telemetry' : ''}`}>
        {value}
      </span>
      {sub && <span className="text-[10px] font-mono text-slate-500">{sub}</span>}
    </div>
  );
}

/**
 * §3.2 Telemetry ribbon — one horizontal mono strip with dividers:
 * Micro-Price | Best Bid | Best Ask | LMP spread | OBI | Engine tick.
 * Scrolls horizontally on mobile, never wraps on desktop. Value changes flash
 * the telemetry colour for 150 ms (cyan in dark, azure in light).
 */
export function TelemetryRibbon() {
  const microPrice = useStore((s) => s.microPrice);
  const bestBid = useStore((s) => s.bestBid);
  const bestAsk = useStore((s) => s.bestAsk);
  const obi = useStore((s) => s.obi);
  const tick = useStore((s) => s.tickNumber);
  const buses = useStore((s) => s.buses);
  const ammBid = useStore((s) => s.ammBid);
  const ammAsk = useStore((s) => s.ammAsk);

  const lmps = buses.map((b) => b.lmp);
  const lmpSpread = lmps.length ? Math.max(...lmps) - Math.min(...lmps) : 0;
  const microFlash = useTickFlash(microPrice);
  const spread = Math.max(0, bestAsk.px - bestBid.px);

  return (
    <div className="glass rounded-2xl overflow-x-auto [scrollbar-width:thin]" role="region" aria-label="Telemetry ribbon">
      <div className="flex min-w-max">
        <Cell label="Micro-price" value={formatPrice(microPrice, 4)} sub="₹ / kWh" tone="telemetry" flash flashKey={microFlash === 'text-slate-50' ? 0 : tick} />
        <Cell label="Best bid" value={formatPrice(bestBid.px, 3)} sub={`${bestBid.sz.toFixed(2)} kWh`} tone="bid" />
        <Cell label="Best ask" value={formatPrice(bestAsk.px, 3)} sub={`${bestAsk.sz.toFixed(2)} kWh`} tone="ask" />
        <Cell label="Spread" value={formatPrice(spread, 4)} sub="touch" />
        <Cell label="LMP spread" value={`₹${lmpSpread.toFixed(3)}`} sub="max − min bus" tone="telemetry" />
        <Cell label="OBI" value={formatOBI(obi)} sub={obi >= 0 ? 'buy pressure' : 'sell pressure'} tone={obi >= 0 ? 'bid' : 'ask'} />
        <Cell label="AMM quote" value={`${ammBid !== null ? ammBid.toFixed(3) : '—'} / ${ammAsk !== null ? ammAsk.toFixed(3) : '—'}`} sub="bid / ask" />
        <Cell label="Engine tick" value={tick.toLocaleString()} sub="10 Hz" tone="telemetry" />
      </div>
    </div>
  );
}

export default TelemetryRibbon;
