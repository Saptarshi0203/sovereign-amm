'use client';

/**
 * @file SegmentedPill.tsx
 * @description Segmented control with animated layoutId indicator (framer-motion).
 * Used for tab switching (1H/4H/24H, Market/Limit/Auto).
 *
 * Usage:
 *   <SegmentedPill
 *     options={['1H', '4H', '24H', 'ALL']}
 *     value="24H"
 *     onChange={(v) => setRange(v)}
 *   />
 */

import { motion, useReducedMotion } from 'framer-motion';

export interface SegmentedPillProps {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function SegmentedPill({ options, value, onChange, className = '' }: SegmentedPillProps) {
  const reduce = useReducedMotion();

  return (
    <div
      role="radiogroup"
      className={`inline-flex items-center gap-0.5 rounded-full border border-edge/50 bg-slate-900/50 p-1 ${className}`}
    >
      {options.map((opt) => {
        const isActive = value === opt;
        return (
          <button
            key={opt}
            type="button"
            role="radio"
            aria-checked={isActive}
            onClick={() => onChange(opt)}
            className="relative z-10 px-3 py-1.5 text-xs font-semibold transition-colors duration-200"
            style={{
              color: isActive ? 'rgb(var(--c-white))' : 'rgb(var(--t-muted))',
            }}
          >
            {isActive && (
              <motion.div
                layoutId="segmented-pill-indicator"
                className="absolute inset-0 z-0 rounded-full bg-brand-gradient"
                transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 380, damping: 30 }}
              />
            )}
            <span className="relative z-10">{opt}</span>
          </button>
        );
      })}
    </div>
  );
}

export default SegmentedPill;
