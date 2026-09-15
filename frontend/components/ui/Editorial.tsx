'use client';

/**
 * @file Editorial.tsx
 * @description Section grammar primitives for the "Editorial Terminal" design
 * system: numbered tracked-caps labels, hairlines that draw in on view,
 * statement blocks, numbered lists, a marquee strip, a vertical timeline and
 * 1-bit pixel mascots. All colours flow through CSS variables.
 */

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

/** Fade-up wrapper driven by IntersectionObserver (static under reduced motion). */
export function Reveal({ children, className = '', delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const reduce = useReducedMotion();
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || reduce) return;

    // B3 FIX: 1200ms safety timer in case IntersectionObserver doesn't fire
    const safety = setTimeout(() => setVisible(true), 1200);

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          clearTimeout(safety);
          io.disconnect();
        }
      },
      { threshold: 0.15 } // B3 FIX: amount as threshold, not negative margin
    );
    io.observe(el);

    return () => {
      clearTimeout(safety);
      io.disconnect();
    };
  }, [reduce]);

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={reduce ? false : { opacity: 0, y: 12 }}
      animate={reduce || visible ? { opacity: 1, y: 0 } : undefined}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1], delay }}
    >
      {children}
    </motion.div>
  );
}

/** 1 px hairline that draws in from the left when it enters the viewport. */
export function Hairline({ className = '' }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [on, setOn] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // B3 FIX: 1200ms safety timer
    const safety = setTimeout(() => setOn(true), 1200);

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setOn(true);
          clearTimeout(safety);
          io.disconnect();
        }
      },
      { threshold: 0.15 } // B3 FIX: threshold instead of negative rootMargin
    );
    io.observe(el);

    return () => {
      clearTimeout(safety);
      io.disconnect();
    };
  }, []);

  return <div ref={ref} aria-hidden="true" className={`hairline ${on ? 'hairline-draw' : 'scale-x-0'} ${className}`} />;
}

/** `01 — ISSUE` style label followed by a hairline. */
export function SectionLabel({ n, children, className = '' }: { n: string; children: ReactNode; className?: string }) {
  return (
    <div className={`flex items-center gap-4 ${className}`}>
      <span className="label-caps whitespace-nowrap">
        {n} — {children}
      </span>
      <Hairline className="flex-1" />
    </div>
  );
}

/** Big claim + one paragraph. */
export function Statement({ title, children, className = '' }: { title: ReactNode; children?: ReactNode; className?: string }) {
  return (
    <Reveal className={className}>
      <h2 className="font-display text-3xl sm:text-4xl lg:text-[2.75rem] font-bold leading-[1.08] tracking-tight text-white">{title}</h2>
      {children && <div className="mt-6 max-w-xl text-base sm:text-lg leading-relaxed text-slate-400">{children}</div>}
    </Reveal>
  );
}

/** Right-column numbered list with hairline separators. */
export function NumberedList({ items }: { items: { title: string; body: string }[] }) {
  return (
    <ol className="divide-y divide-edge/40 border-y border-edge/40">
      {items.map((it, i) => (
        <li key={it.title} className="grid grid-cols-[3.5rem_1fr] gap-4 py-7 sm:grid-cols-[5rem_1fr]">
          <span className="font-mono text-3xl text-slate-600 tabular-nums sm:text-4xl">{String(i + 1).padStart(2, '0')}</span>
          <Reveal delay={i * 0.05}>
            <h3 className="font-display text-xl font-bold text-white sm:text-2xl">{it.title}</h3>
            <p className="mt-2 text-slate-400">{it.body}</p>
          </Reveal>
        </li>
      ))}
    </ol>
  );
}

/** Infinite marquee strip separated by ⁄ glyphs. */
export function Marquee({ text, className = '' }: { text: string; className?: string }) {
  // B3 FIX: Duplicate track exactly 2× for seamless -50% loop
  const item = (
    <>
      <span className="px-6">{text}</span>
      <span className="px-2 text-slate-600" aria-hidden="true">
        ⁄
      </span>
    </>
  );
  return (
    <div className={`marquee overflow-hidden border-y border-edge/40 py-4 text-lg text-slate-400 sm:text-xl ${className}`} aria-label={text}>
      {/* B3 FIX: hover:pause via CSS in globals.css */}
      <div className="marquee-track motion-reduce:animate-none">
        {Array.from({ length: 2 }).map((_, i) => (
          <span key={i} className="whitespace-nowrap inline-block" aria-hidden={i > 0}>
            {Array.from({ length: 12 }).map((_, j) => (
              <span key={j} className="inline-block">
                {item}
              </span>
            ))}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Vertical timeline with hollow nodes. */
export function Timeline({ steps }: { steps: { label: string; title: string; body: string }[] }) {
  return (
    <ol className="relative border-l border-edge/50 pl-10 sm:pl-14">
      {steps.map((s, i) => (
        <li key={s.title} className="relative pb-14 last:pb-0">
          <span aria-hidden="true" className="absolute -left-[calc(2.5rem+7px)] top-1 h-3.5 w-3.5 rounded-full border border-white/70 bg-canvas sm:-left-[calc(3.5rem+7px)]" />
          <Reveal delay={i * 0.04}>
            <p className="label-caps">{s.label}</p>
            <h3 className="mt-1 font-display text-4xl font-bold leading-none text-white sm:text-5xl">{s.title}</h3>
            <p className="mt-3 max-w-xl text-slate-400">{s.body}</p>
          </Reveal>
        </li>
      ))}
    </ol>
  );
}

const SPRITES: Record<string, string[]> = {
  walker: ['..XX..', '..XX..', '.XXXX.', 'X.XX.X', '..XX..', '.X..X.', '.X..X.', 'XX..XX'],
  robot: ['.XXXX.', 'X.XX.X', 'XXXXXX', '.X..X.', 'XXXXXX', 'X.XX.X', '.X..X.', 'XX..XX'],
  ufo: ['...XXXX...', '..X....X..', 'XXXXXXXXXX', 'X.X.XX.X.X', 'XXXXXXXXXX', '..X....X..'],
  tile: ['XXXXXXXX', 'X......X', 'X.XX.X.X', 'X.X..X.X', 'X.XX.X.X', 'X......X', 'XXXXXXXX'],
};

/** 1-bit pixel mascot rendered as crisp SVG rects; plays a 2-frame idle loop. */
export function PixelMascot({ kind, size = 40, className = '' }: { kind: keyof typeof SPRITES; size?: number; className?: string }) {
  const rows = SPRITES[kind];
  const w = rows[0].length;
  const h = rows.length;
  // B3 FIX: pixel-idle animation via CSS (already defined in globals.css)
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={size} height={(size * h) / w} shapeRendering="crispEdges" aria-hidden="true" className={`pixel-idle fill-current ${className}`}>
      {rows.flatMap((r, y) => Array.from(r).map((c, x) => (c === 'X' ? <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" /> : null)))}
    </svg>
  );
}
