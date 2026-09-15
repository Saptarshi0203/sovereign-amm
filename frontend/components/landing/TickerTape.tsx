'use client';

/**
 * @file TickerTape.tsx
 * @description CSS-marquee scrolling ticker tape displaying 10 live market fields.
 *
 * The marquee uses Tailwind's `animate-marquee` animation (keyframe defined in
 * tailwind.config.ts: `marquee 30s linear infinite`). Inner content is duplicated
 * so the loop is seamless — the keyframe only translates -50%, which returns to
 * the identical visual state when the duplicate is in view.
 *
 * Pause-on-hover is implemented via React state (`paused`) applied as an inline
 * `animationPlayState` style — Tailwind cannot express arbitrary group states for
 * this particular CSS property.
 *
 * `prefers-reduced-motion`: detected once in `useEffect` (browser-only API).
 * When active, marquee is disabled and fields render as a static single row.
 *
 * Requirements: 13.1–13.7
 */

import { useState, useEffect } from 'react';
import { useStore } from '@/lib/store';
import { formatPrice, formatOBI } from '@/lib/utils';
import { useTickFlash } from '@/lib/hooks/useTickFlash';

// ---------------------------------------------------------------------------
// TickerField — single label+value pair
// ---------------------------------------------------------------------------

interface TickerFieldProps {
  label: string;
  value: string;
  colorClass: string;
}

function TickerField({ label, value, colorClass }: TickerFieldProps) {
  return (
    <>
      <span className="text-slate-500 text-xs font-sans mr-1">{label}</span>
      <span
        className={`font-mono tabular-nums text-sm ${colorClass} mr-6`}
        style={{ fontVariantNumeric: 'tabular-nums' }}
      >
        {value}
      </span>
    </>
  );
}

// ---------------------------------------------------------------------------
// TickerFields — all 10 fields composed together
// ---------------------------------------------------------------------------

/**
 * Renders the 10 ticker fields reading live values from the Zustand store.
 * Each numeric field uses `useTickFlash` to flash emerald/rose on uptick/downtick.
 *
 * Fields:
 *  1. MICRO PRICE  — formatPrice(microPrice, 4), tick flash
 *  2. BEST BID     — formatPrice(bestBid.px, 3), always emerald
 *  3. BEST ASK     — formatPrice(bestAsk.px, 3), always rose
 *  4. SPREAD       — (bestAsk.px - bestBid.px).toFixed(4), tick flash
 *  5. SoC          — soc.toFixed(1) + '%', tick flash
 *  6. OBI          — formatOBI(obi), emerald if ≥0, rose if <0
 *  7. σ            — volatility.toFixed(4), static slate
 *  8. C_deg        — cDeg.toFixed(4), amber when >0.02, else tick flash
 *  9. LMP SPREAD   — (max LMP - min LMP).toFixed(3), tick flash
 * 10. ENGINE       — '10 Hz', always emerald
 */
function TickerFields() {
  const microPrice  = useStore((s) => s.microPrice);
  const bestBid     = useStore((s) => s.bestBid);
  const bestAsk     = useStore((s) => s.bestAsk);
  const obi         = useStore((s) => s.obi);
  const soc         = useStore((s) => s.soc);
  const volatility  = useStore((s) => s.volatility);
  const cDeg        = useStore((s) => s.cDeg);
  const buses       = useStore((s) => s.buses);

  // Derived values
  const spread      = bestAsk.px - bestBid.px;
  const lmps        = buses.map((b) => b.lmp);
  const lmpSpread   = lmps.length > 0 ? Math.max(...lmps) - Math.min(...lmps) : 0;

  // Tick flash hooks for each numeric that should flash
  const microPriceFlash = useTickFlash(microPrice);
  const spreadFlash     = useTickFlash(spread);
  const socFlash        = useTickFlash(soc);
  const cDegFlash       = useTickFlash(cDeg);
  const lmpSpreadFlash  = useTickFlash(lmpSpread);

  // C_deg: amber override when > 0.02, otherwise use tick flash
  const cDegClass = cDeg > 0.02 ? 'text-amber-600 dark:text-amber-400' : cDegFlash;

  // OBI: sign-driven colour
  const obiClass = obi >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500';

  return (
    <>
      <TickerField label="MICRO PRICE" value={formatPrice(microPrice, 4)}       colorClass={microPriceFlash} />
      <TickerField label="BEST BID"    value={formatPrice(bestBid.px, 3)}        colorClass="text-emerald-600 dark:text-emerald-400" />
      <TickerField label="BEST ASK"    value={formatPrice(bestAsk.px, 3)}        colorClass="text-rose-500" />
      <TickerField label="SPREAD"      value={spread.toFixed(4)}                 colorClass={spreadFlash} />
      <TickerField label="SoC"         value={soc.toFixed(1) + '%'}              colorClass={socFlash} />
      <TickerField label="OBI"         value={formatOBI(obi)}                    colorClass={obiClass} />
      <TickerField label="σ"           value={volatility.toFixed(4)}             colorClass="text-slate-400" />
      <TickerField label="C_deg"       value={cDeg.toFixed(4)}                   colorClass={cDegClass} />
      <TickerField label="LMP SPREAD"  value={lmpSpread.toFixed(3)}              colorClass={lmpSpreadFlash} />
      <TickerField label="ENGINE"      value="10 Hz"                             colorClass="text-emerald-600 dark:text-emerald-400" />
    </>
  );
}

// ---------------------------------------------------------------------------
// TickerTape
// ---------------------------------------------------------------------------

/**
 * Full-width marquee ticker tape.
 *
 * - Height: `h-12` (48 px), `border-y border-slate-800 bg-slate-900/50`
 * - Content duplicated twice inside `.animate-marquee` for a seamless loop.
 * - Hover pauses via `animationPlayState: 'paused'` inline style.
 * - `prefers-reduced-motion`: disables animation, renders a single static row.
 *
 * @see Requirements 13.1–13.7
 */
export function TickerTape() {
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    // window.matchMedia is browser-only; runs after hydration.
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);

    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  if (reducedMotion) {
    // Static, non-scrolling row for users who prefer reduced motion.
    return (
      <div
        className="w-full h-12 border-y border-slate-800 bg-slate-900/50 flex items-center overflow-x-auto px-4"
        aria-label="Market ticker tape"
        role="marquee"
      >
        <div className="flex items-center whitespace-nowrap">
          <TickerFields />
        </div>
      </div>
    );
  }

  return (
    <div
      className="w-full h-12 border-y border-white/5 bg-slate-900/50 backdrop-blur-xl flex items-center overflow-hidden"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-label="Market ticker tape"
      role="marquee"
    >
      {/* The inner div carries animate-marquee; animationPlayState is toggled by hover/motion prefs. */}
      <div
        className="flex items-center whitespace-nowrap animate-marquee"
        style={{ animationPlayState: paused ? 'paused' : 'running' }}
      >
        {/* Content duplicated twice — keyframe only translates -50%, landing at start of second copy. */}
        <TickerFields />
        <TickerFields />
      </div>
    </div>
  );
}

export default TickerTape;
