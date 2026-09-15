'use client';

/** Havu-style "system blueprint": actors | operating loop | accumulation. Pure SVG + CSS. */

import { useReducedMotion } from 'framer-motion';
import { useStore } from '@/lib/store';
import { PixelMascot, Reveal } from '@/components/ui/Editorial';

const LOOP = [
  ['ORDER', 'Households post bids and asks'],
  ['GLFT QUOTE', 'Battery re-centres its quotes'],
  ['PTDF SCREEN', 'Fill projected onto the wires'],
  ['FILL', 'Settled in micro-units'],
  ['RAINFLOW', 'Wear priced into the next ask'],
] as const;

export function SystemBlueprint() {
  const reduce = useReducedMotion();
  const tick = useStore((s) => s.tickNumber);
  const soc = useStore((s) => s.soc);
  const actors = [
    { kind: 'walker' as const, label: 'HOUSEHOLDS', title: 'Who trades', sub: 'Market · Limit · Auto-charge' },
    { kind: 'robot' as const, label: 'BATTERY AMM', title: 'Who makes the market', sub: `GLFT quotes · SoC ${soc.toFixed(0)}%` },
    { kind: 'ufo' as const, label: 'GRID', title: 'Who screens', sub: '7 buses · 9 lines · PTDF' },
  ];
  return (
    <div className="mt-12">
      <Reveal>
        <h2 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">The trading engine — operating &amp; learning loop</h2>
        <p className="mt-3 max-w-2xl text-slate-400">Order flow becomes a physically feasible price through the battery and the wires, then feeds the next quote.</p>
      </Reveal>
      <div className="hairline mt-8" />
      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_1.3fr_1fr]">
        <div>
          <p className="label-caps mb-6">01 — Actors</p>
          <ul className="divide-y divide-edge/40 border-t border-edge/60">
            {actors.map((a) => (
              <li key={a.label} className="flex items-center gap-6 py-7">
                <PixelMascot kind={a.kind} size={56} className="text-white" />
                <div>
                  <p className="label-caps mb-1">{a.label}</p>
                  <p className="font-display text-xl font-bold text-white">{a.title}</p>
                  <p className="text-sm text-slate-400">{a.sub}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="label-caps mb-6 lg:text-center">02 — Operating &amp; learning loop</p>
          {/* B3 FIX: viewBox 640×640 for label space, ring-spin CSS animation, labels at r=270 with smart textAnchor */}
          <svg viewBox="0 0 640 640" className="mx-auto w-full max-w-[520px] text-white" role="img" aria-label="Order, GLFT quote, PTDF screen, fill, Rainflow loop">
            <circle cx="320" cy="320" r="200" fill="none" stroke="currentColor" strokeOpacity=".7" strokeWidth="1" />
            {/* B3 FIX: ring-spin class drives continuous rotation via CSS, not tick-based */}
            <circle cx="320" cy="320" r="180" fill="none" stroke="currentColor" strokeOpacity=".25" strokeWidth="1" strokeDasharray="4 6" className={reduce ? '' : 'ring-spin'} />
            {LOOP.map(([name, sub], i) => {
              const a = (-90 + i * 72) * (Math.PI / 180);
              const x = 320 + 200 * Math.cos(a);
              const y = 320 + 200 * Math.sin(a);
              const tx = 320 + 270 * Math.cos(a); // B3 FIX: r=270 for labels
              const ty = 320 + 270 * Math.sin(a);
              // B3 FIX: textAnchor by quadrant to prevent clipping
              const anchor = tx < 315 ? 'end' : tx > 325 ? 'start' : 'middle';
              return (
                <g key={name}>
                  <rect x={x - 5} y={y - 5} width="10" height="10" fill="currentColor" />
                  <text x={tx} y={ty} textAnchor={anchor} className="fill-current font-mono" fontSize="11" letterSpacing="2">
                    {name}
                  </text>
                  <text x={tx} y={ty + 14} textAnchor={anchor} fill="currentColor" fillOpacity=".55" fontSize="10">
                    {sub}
                  </text>
                </g>
              );
            })}
            {/* B3 FIX: Central box 260×120 */}
            <rect x="190" y="260" width="260" height="120" fill="currentColor" />
            <text x="320" y="300" textAnchor="middle" fontSize="11" letterSpacing="3" className="fill-canvas font-mono">
              10 Hz ENGINE
            </text>
            <text x="320" y="330" textAnchor="middle" fontSize="20" fontWeight="700" className="fill-canvas font-display">
              MATCH · SCREEN · SETTLE
            </text>
            <text x="320" y="353" textAnchor="middle" fontSize="10" className="fill-canvas font-mono">
              tick {tick.toLocaleString()}
            </text>
          </svg>
        </div>
        <div>
          <p className="label-caps mb-6">03 — Accumulation</p>
          <div className="border-t border-edge/60 pt-7">
            <p className="font-display text-2xl font-bold text-white">It compounds every tick</p>
            <p className="mt-2 text-slate-400">Every event lands in the ledger. Replay it and you get the same book, the same fills, the same PnL.</p>
            <div className="mt-8 flex flex-col-reverse gap-2">
              {['Tick 1', 'Tick 2', 'Tick 3'].map((t) => (
                <div key={t} className="flex items-center gap-4">
                  <span className="flex h-12 w-12 items-center justify-center border-2 border-white font-mono text-lg font-bold text-white">S</span>
                  <span className="text-sm text-slate-500">{t}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SystemBlueprint;
