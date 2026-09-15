'use client';

/**
 * @file JudgeControls.tsx
 * @description Operator parameter control panel with four debounced range
 * sliders that update the Zustand `judge` slice.
 *
 * Local state provides immediate slider feedback; `useDebounce(local, 200)`
 * prevents rapid-fire Zustand updates while the user is dragging. The
 * "RESET DEFAULTS" button synchronises both local state and the store back to
 * their initial values.
 *
 * Requirements: 17.5, 17.6, 17.7, 17.8
 */

import { useState, useEffect } from 'react';
import { useStore } from '@/lib/store';
import { useDebounce } from '@/lib/hooks/useDebounce';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Keys of the judge slice that are controlled by sliders. */
type JudgeKey = 'volatility' | 'riskAversion' | 'degradationWeight' | 'loadShock';

interface SliderConfig {
  key: JudgeKey;
  label: string;
  min: number;
  max: number;
  step: number;
  /** Optional unit suffix shown after the numeric display value. */
  unit: string;
  /**
   * Number of decimal places for the display value.
   * Derived from `step` magnitude.
   */
  decimals: number;
}

// ---------------------------------------------------------------------------
// Slider configuration
// ---------------------------------------------------------------------------

const SLIDERS: SliderConfig[] = [
  {
    key: 'volatility',
    label: 'Volatility σ',
    min: 0.01,
    max: 0.20,
    step: 0.001,
    unit: '',
    decimals: 3,
  },
  {
    key: 'riskAversion',
    label: 'Risk Aversion γ',
    min: 0.1,
    max: 5.0,
    step: 0.1,
    unit: '',
    decimals: 1,
  },
  {
    key: 'degradationWeight',
    label: 'Degradation Weight',
    min: 0,
    max: 1,
    step: 0.01,
    unit: '',
    decimals: 2,
  },
  {
    key: 'loadShock',
    label: 'Load Shock',
    min: 0,
    max: 100,
    step: 1,
    unit: '%',
    decimals: 0,
  },
];

// ---------------------------------------------------------------------------
// Default values (mirrors store initial state)
// ---------------------------------------------------------------------------

const DEFAULTS: Record<JudgeKey, number> = {
  volatility: 0.06,
  riskAversion: 1.5,
  degradationWeight: 0.5,
  loadShock: 0,
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Four range sliders for the judge parameter slice.
 *
 * Architecture:
 * - `local` holds the immediately-responsive slider values.
 * - `debounced` lags `local` by 200 ms, preventing store churn while dragging.
 * - A single `useEffect` watches `debounced` and calls `setJudge`.
 * - "RESET DEFAULTS" writes `DEFAULTS` to both `local` and the store atomically.
 */
export function JudgeControls(): React.ReactElement {
  const volatility = useStore((s) => s.volatility);
  const riskAversion = useStore((s) => s.riskAversion);
  const degradationWeight = useStore((s) => s.degradationWeight);
  const loadShock = useStore((s) => s.loadShock);
  const setJudge = useStore((s) => s.setJudge);
  const resetJudge = useStore((s) => s.resetJudge);

  // Local state for immediate UI feedback.
  const [local, setLocal] = useState<Record<JudgeKey, number>>({
    volatility,
    riskAversion,
    degradationWeight,
    loadShock,
  });

  // Debounced copy — only this writes to the store.
  const debounced = useDebounce(local, 200);

  // Sync debounced local state → store.
  useEffect(() => {
    setJudge(debounced);
  }, [debounced, setJudge]);

  const handleReset = (): void => {
    setLocal(DEFAULTS);
    resetJudge();
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-xs uppercase tracking-widest text-slate-400 font-sans">
        Judge Controls
      </h2>

      {SLIDERS.map(({ key, label, min, max, step, unit, decimals }) => (
        <div key={key} className="flex flex-col gap-1">
          {/* Label row */}
          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-400 font-sans">{label}</span>
            <span className="text-xs font-mono text-slate-200 tabular-nums">
              {local[key].toFixed(decimals)}
              {unit}
            </span>
          </div>

          {/* Range input */}
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={local[key]}
            onChange={(e) =>
              setLocal((prev) => ({
                ...prev,
                [key]: parseFloat(e.target.value),
              }))
            }
            aria-label={label}
            aria-valuemin={min}
            aria-valuemax={max}
            aria-valuenow={local[key]}
            className={
              'w-full h-1.5 rounded-full appearance-none cursor-pointer bg-slate-700 ' +
              '[&::-webkit-slider-thumb]:appearance-none ' +
              '[&::-webkit-slider-thumb]:w-3 ' +
              '[&::-webkit-slider-thumb]:h-3 ' +
              '[&::-webkit-slider-thumb]:rounded-full ' +
              '[&::-webkit-slider-thumb]:bg-emerald-500 ' +
              '[&::-moz-range-thumb]:w-3 ' +
              '[&::-moz-range-thumb]:h-3 ' +
              '[&::-moz-range-thumb]:rounded-full ' +
              '[&::-moz-range-thumb]:bg-emerald-500 ' +
              '[&::-moz-range-thumb]:border-0'
            }
          />
        </div>
      ))}

      {/* Reset button */}
      <button
        type="button"
        onClick={handleReset}
        className="mt-1 text-xs text-slate-400 hover:text-white border border-slate-700 hover:border-slate-500 rounded-lg px-3 py-1.5 transition-colors"
      >
        RESET DEFAULTS
      </button>
    </div>
  );
}

export default JudgeControls;
