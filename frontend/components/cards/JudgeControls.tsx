'use client';

/**
 * JudgeControls — AMM parameter tuning panel for the Sovereign-AMM dashboard.
 *
 * Renders four range sliders that allow authorised operators ("judges") to
 * tune the live market-making parameters in real time:
 *  - Gamma (Risk Aversion)
 *  - Kappa (Market Impact)
 *  - Q_max (Max Inventory / Wh)
 *  - A_deg (Degradation Factor)
 *
 * Design decisions:
 * - Parameter values are fetched from GET /api/parameters on mount and
 *   stored in local state (one source of truth per slider).
 * - Slider changes are debounced 500 ms before issuing PUT /api/parameters
 *   so the backend is not flooded on rapid drags.
 * - Each slider carries an independent loading ("Updating…") and error
 *   indicator; errors auto-clear after 3 seconds.
 * - All sliders are disabled while the WebSocket connection is down.
 *
 * Requirements addressed: 13.1–13.9, 21.3, 23.4
 */

import { useCallback, useEffect, useState } from 'react';

import { getParameters, updateParameter } from '@/lib/api';
import { useMarketStore } from '@/store/marketStore';
import { useDebounce } from '@/hooks/useDebounce';

// ── Parameter configuration ──────────────────────────────────────────────────

interface SliderConfig {
  /** Internal key used when calling updateParameter */
  key: string;
  /** Human-readable label shown in the UI */
  label: string;
  /** Slider minimum value */
  min: number;
  /** Slider maximum value */
  max: number;
  /** Slider step increment */
  step: number;
  /** Number of decimal places to show in the value readout */
  decimals: number;
  /** Optional unit suffix appended after the value (e.g. " Wh") */
  unit?: string;
}

const SLIDERS: SliderConfig[] = [
  {
    key: 'gamma',
    label: 'Gamma (Risk Aversion)',
    min: 0.01,
    max: 10.0,
    step: 0.01,
    decimals: 2,
  },
  {
    key: 'kappa',
    label: 'Kappa (Market Impact)',
    min: 0.001,
    max: 1.0,
    step: 0.001,
    decimals: 3,
  },
  {
    key: 'q_max',
    label: 'Q_max (Max Inventory)',
    min: 1_000_000,
    max: 100_000_000,
    step: 1_000_000,
    decimals: 0,
    unit: ' Wh',
  },
  {
    key: 'a_deg',
    label: 'A_deg (Degradation Factor)',
    min: 0.0,
    max: 1000.0,
    step: 1.0,
    decimals: 2,
  },
];

// ── Formatting helpers ────────────────────────────────────────────────────────

/**
 * Format a number with thousands separators for readability.
 *
 * @param value - Numeric value to format
 * @returns Locale-formatted integer string (e.g. 1,000,000)
 */
function formatWithSeparators(value: number): string {
  return Math.round(value).toLocaleString('en-IN');
}

/**
 * Render a slider value as a string with the correct number of decimal places.
 * Q_max (decimals=0) uses formatWithSeparators for readability.
 *
 * @param value    - Numeric value
 * @param decimals - Decimal places
 * @param unit     - Optional unit suffix
 * @returns Formatted string
 */
function formatValue(value: number, decimals: number, unit?: string): string {
  const formatted =
    decimals === 0
      ? formatWithSeparators(value)
      : value.toFixed(decimals);
  return unit ? `${formatted}${unit}` : formatted;
}

// ── Default values (used while the API response is in flight) ─────────────────

const DEFAULTS: Record<string, number> = {
  gamma: 1.0,
  kappa: 0.1,
  q_max: 10_000_000,
  a_deg: 0.0,
};

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * JudgeControls panel.
 *
 * Renders four AMM parameter sliders with live API synchronisation and
 * per-slider error/loading feedback.
 *
 * Requirements: 13.1–13.9, 21.3, 23.4
 */
export function JudgeControls(): React.ReactElement {
  // WebSocket connection guard — disable all sliders when disconnected (13.9)
  const isConnected = useMarketStore((s) => s.isConnected);

  // Current parameter values (keyed by slider `key`)
  const [values, setValues] = useState<Record<string, number>>(DEFAULTS);

  // Per-slider loading state
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  // Per-slider error messages (auto-clear after 3 s)
  const [errors, setErrors] = useState<Record<string, string>>({});

  // ── Fetch initial parameter values on mount (13.7) ────────────────────────
  useEffect(() => {
    let cancelled = false;

    getParameters()
      .then((params) => {
        if (cancelled) return;
        setValues((prev) => ({ ...prev, ...params }));
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        console.error('[JudgeControls] Failed to fetch initial parameters', err);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // ── Error auto-clear after 3 s (13.8) ────────────────────────────────────
  const setSliderError = useCallback((key: string, message: string) => {
    setErrors((prev) => ({ ...prev, [key]: message }));
    setTimeout(() => {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }, 3_000);
  }, []);

  // ── Debounced API update (13.6, 13.7) ────────────────────────────────────
  /**
   * Inner update function that actually fires the API call.
   * Wrapped in useCallback so useDebounce's callbackRef stays current.
   */
  const handleUpdate = useCallback(
    async (key: string, value: number) => {
      setLoading((prev) => ({ ...prev, [key]: true }));
      try {
        await updateParameter(key, value);
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Update failed';
        setSliderError(key, message);
      } finally {
        setLoading((prev) => ({ ...prev, [key]: false }));
      }
    },
    [setSliderError],
  );

  const debouncedUpdate = useDebounce(
    handleUpdate as (...args: unknown[]) => unknown,
    500,
  ) as (key: string, value: number) => void;

  // ── Slider change handler ─────────────────────────────────────────────────
  const handleChange = useCallback(
    (key: string, rawValue: string) => {
      const numeric = parseFloat(rawValue);
      if (Number.isNaN(numeric)) return;

      // Update local state immediately for responsive feel (13.5)
      setValues((prev) => ({ ...prev, [key]: numeric }));

      // Clear any pre-existing error on intentional change
      setErrors((prev) => {
        if (!prev[key]) return prev;
        const next = { ...prev };
        delete next[key];
        return next;
      });

      // Fire the debounced API call (13.6)
      debouncedUpdate(key, numeric);
    },
    [debouncedUpdate],
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <section
      className="card p-4 flex flex-col gap-6"
      aria-label="Judge Controls — AMM parameter tuning"
    >
      {/* Panel header */}
      <h2 className="panel-title">Judge Controls</h2>

      {/* Disconnected banner */}
      {!isConnected && (
        <p
          role="alert"
          className="text-xs text-amber-600 dark:text-amber-400 font-mono bg-amber-900/20 border border-amber-800 rounded px-3 py-2"
        >
          WebSocket disconnected — sliders are disabled
        </p>
      )}

      {/* Sliders */}
      {SLIDERS.map(({ key, label, min, max, step, decimals, unit }) => {
        const currentValue = values[key] ?? DEFAULTS[key];
        const isLoading = loading[key] === true;
        const errorMsg = errors[key];
        const disabled = !isConnected;

        return (
          <div key={key} className="flex flex-col gap-1">
            {/* Label row with current value */}
            <div className="flex items-center justify-between">
              <label
                htmlFor={`slider-${key}`}
                className="text-xs font-semibold text-slate-300 uppercase tracking-wide"
              >
                {label}
              </label>

              <div className="flex items-center gap-2">
                {/* Loading indicator */}
                {isLoading && (
                  <span
                    role="status"
                    aria-live="polite"
                    className="text-xs text-emerald-600 dark:text-emerald-400 font-mono"
                  >
                    Updating…
                  </span>
                )}

                {/* Current value readout */}
                <span
                  className="font-mono text-sm tabular-nums text-slate-100"
                  aria-live="polite"
                  aria-label={`${label} current value`}
                >
                  {formatValue(currentValue, decimals, unit)}
                </span>
              </div>
            </div>

            {/* Range input */}
            <input
              id={`slider-${key}`}
              type="range"
              min={min}
              max={max}
              step={step}
              value={currentValue}
              disabled={disabled}
              aria-label={`${label} slider`}
              aria-valuemin={min}
              aria-valuemax={max}
              aria-valuenow={currentValue}
              aria-valuetext={formatValue(currentValue, decimals, unit)}
              aria-disabled={disabled}
              onChange={(e) => handleChange(key, e.target.value)}
              className={[
                'w-full h-2 rounded-full appearance-none cursor-pointer',
                'bg-slate-700',
                'accent-emerald-500',
                disabled
                  ? 'opacity-40 cursor-not-allowed'
                  : 'hover:accent-emerald-400',
              ].join(' ')}
            />

            {/* Min / max labels */}
            <div className="flex justify-between">
              <span className="text-slate-500 font-mono text-xs">
                {formatValue(min, decimals, unit)}
              </span>
              <span className="text-slate-500 font-mono text-xs">
                {formatValue(max, decimals, unit)}
              </span>
            </div>

            {/* Per-slider error message */}
            {errorMsg && (
              <p
                role="alert"
                aria-live="assertive"
                className="text-xs text-rose-600 dark:text-rose-400 font-mono mt-1"
              >
                {errorMsg}
              </p>
            )}
          </div>
        );
      })}
    </section>
  );
}

export default JudgeControls;
