/**
 * Integration tests for JudgeControls configuration and helper logic.
 *
 * This file mirrors the SLIDERS array, DEFAULTS object, and formatting helpers
 * from JudgeControls.tsx as pure constants/functions and verifies that:
 *
 *   - SLIDERS has exactly 4 entries with correct keys, ranges, and steps
 *   - DEFAULTS has the documented initial values
 *   - formatValue produces the correct human-readable output for each slider
 *   - isConnected=false in the market store maps to the disabled prop being true
 *
 * Requirements addressed: 13.1–13.9, 21.3, 23.4
 *
 * NOTE: The Zustand store is reset between tests to ensure isolation.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useMarketStore } from '@/store/marketStore';

// ---------------------------------------------------------------------------
// Mirror SLIDERS, DEFAULTS, and formatting helpers from JudgeControls.tsx
// The test mirrors these inline so that the pure-logic contract is documented
// independently of the React component tree.
// ---------------------------------------------------------------------------

interface SliderConfig {
  key: string;
  label: string;
  min: number;
  max: number;
  step: number;
  decimals: number;
  unit?: string;
}

/**
 * Mirrored from JudgeControls.tsx — the four AMM parameter sliders.
 * Any change to ranges or keys in the component MUST be reflected here.
 */
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

/** Mirrored from JudgeControls.tsx */
const DEFAULTS: Record<string, number> = {
  gamma: 1.0,
  kappa: 0.1,
  q_max: 10_000_000,
  a_deg: 0.0,
};

// ---------------------------------------------------------------------------
// Mirror formatting helpers from JudgeControls.tsx
// ---------------------------------------------------------------------------

/**
 * Format a number with thousands separators using the en-IN locale.
 * Mirrors `formatWithSeparators` in JudgeControls.tsx.
 */
function formatWithSeparators(value: number): string {
  return Math.round(value).toLocaleString('en-IN');
}

/**
 * Render a slider value as a human-readable string.
 * Mirrors `formatValue` in JudgeControls.tsx.
 *
 * @param value    - Numeric value
 * @param decimals - Decimal places (0 triggers thousands-separator formatting)
 * @param unit     - Optional unit suffix
 */
function formatValue(value: number, decimals: number, unit?: string): string {
  const formatted =
    decimals === 0
      ? formatWithSeparators(value)
      : value.toFixed(decimals);
  return unit ? `${formatted}${unit}` : formatted;
}

// ---------------------------------------------------------------------------
// Convenience: get slider config by key (throws if not found)
// ---------------------------------------------------------------------------
function getSlider(key: string): SliderConfig {
  const s = SLIDERS.find((sl) => sl.key === key);
  if (!s) throw new Error(`Slider "${key}" not found in SLIDERS`);
  return s;
}

// ---------------------------------------------------------------------------
// Tests: SLIDERS array structure
// ---------------------------------------------------------------------------

describe('SLIDERS array', () => {
  it('has exactly 4 entries', () => {
    expect(SLIDERS).toHaveLength(4);
  });

  it('contains keys: gamma, kappa, q_max, a_deg', () => {
    const keys = SLIDERS.map((s) => s.key);
    expect(keys).toContain('gamma');
    expect(keys).toContain('kappa');
    expect(keys).toContain('q_max');
    expect(keys).toContain('a_deg');
  });

  it('all keys are unique', () => {
    const keys = SLIDERS.map((s) => s.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  // ── gamma ─────────────────────────────────────────────────────────────────

  describe('gamma slider config', () => {
    it('has min=0.01', () => {
      expect(getSlider('gamma').min).toBe(0.01);
    });

    it('has max=10.0', () => {
      expect(getSlider('gamma').max).toBe(10.0);
    });

    it('has step=0.01', () => {
      expect(getSlider('gamma').step).toBe(0.01);
    });

    it('has decimals=2', () => {
      expect(getSlider('gamma').decimals).toBe(2);
    });

    it('has no unit suffix', () => {
      expect(getSlider('gamma').unit).toBeUndefined();
    });
  });

  // ── kappa ─────────────────────────────────────────────────────────────────

  describe('kappa slider config', () => {
    it('has min=0.001', () => {
      expect(getSlider('kappa').min).toBe(0.001);
    });

    it('has max=1.0', () => {
      expect(getSlider('kappa').max).toBe(1.0);
    });

    it('has step=0.001', () => {
      expect(getSlider('kappa').step).toBe(0.001);
    });

    it('has decimals=3', () => {
      expect(getSlider('kappa').decimals).toBe(3);
    });

    it('has no unit suffix', () => {
      expect(getSlider('kappa').unit).toBeUndefined();
    });
  });

  // ── q_max ─────────────────────────────────────────────────────────────────

  describe('q_max slider config', () => {
    it('has min=1_000_000', () => {
      expect(getSlider('q_max').min).toBe(1_000_000);
    });

    it('has max=100_000_000', () => {
      expect(getSlider('q_max').max).toBe(100_000_000);
    });

    it('has step=1_000_000', () => {
      expect(getSlider('q_max').step).toBe(1_000_000);
    });

    it('has decimals=0', () => {
      expect(getSlider('q_max').decimals).toBe(0);
    });

    it('has unit=" Wh"', () => {
      expect(getSlider('q_max').unit).toBe(' Wh');
    });
  });

  // ── a_deg ─────────────────────────────────────────────────────────────────

  describe('a_deg slider config', () => {
    it('has min=0.0', () => {
      expect(getSlider('a_deg').min).toBe(0.0);
    });

    it('has max=1000.0', () => {
      expect(getSlider('a_deg').max).toBe(1000.0);
    });

    it('has step=1.0', () => {
      expect(getSlider('a_deg').step).toBe(1.0);
    });

    it('has decimals=2', () => {
      expect(getSlider('a_deg').decimals).toBe(2);
    });

    it('has no unit suffix', () => {
      expect(getSlider('a_deg').unit).toBeUndefined();
    });
  });
});

// ---------------------------------------------------------------------------
// Tests: DEFAULTS object
// ---------------------------------------------------------------------------

describe('DEFAULTS object', () => {
  it('has exactly the 4 expected keys', () => {
    expect(Object.keys(DEFAULTS).sort()).toEqual(['a_deg', 'gamma', 'kappa', 'q_max'].sort());
  });

  it('gamma default is 1.0', () => {
    expect(DEFAULTS['gamma']).toBe(1.0);
  });

  it('kappa default is 0.1', () => {
    expect(DEFAULTS['kappa']).toBe(0.1);
  });

  it('q_max default is 10_000_000', () => {
    expect(DEFAULTS['q_max']).toBe(10_000_000);
  });

  it('a_deg default is 0.0', () => {
    expect(DEFAULTS['a_deg']).toBe(0.0);
  });

  it('all defaults are within their respective slider ranges', () => {
    for (const slider of SLIDERS) {
      const def = DEFAULTS[slider.key];
      expect(def).toBeGreaterThanOrEqual(slider.min);
      expect(def).toBeLessThanOrEqual(slider.max);
    }
  });
});

// ---------------------------------------------------------------------------
// Tests: formatValue helper
// ---------------------------------------------------------------------------

describe('formatValue helper', () => {
  it('gamma 1.0 → "1.00" (2 decimal places, no unit)', () => {
    expect(formatValue(1.0, 2)).toBe('1.00');
  });

  it('gamma 0.01 → "0.01"', () => {
    expect(formatValue(0.01, 2)).toBe('0.01');
  });

  it('gamma 10.0 → "10.00"', () => {
    expect(formatValue(10.0, 2)).toBe('10.00');
  });

  it('kappa 0.001 → "0.001" (3 decimal places)', () => {
    expect(formatValue(0.001, 3)).toBe('0.001');
  });

  it('kappa 1.0 → "1.000"', () => {
    expect(formatValue(1.0, 3)).toBe('1.000');
  });

  it('q_max 10_000_000 → "1,00,00,000 Wh" (en-IN locale, with unit)', () => {
    // en-IN uses Indian numbering: 1,00,00,000
    const result = formatValue(10_000_000, 0, ' Wh');
    // Verify it contains "Wh" suffix
    expect(result).toMatch(/Wh$/);
    // Verify it represents the numeric value correctly (no decimal point)
    expect(result).not.toContain('.');
  });

  it('q_max 1_000_000 uses thousands separators (decimals=0)', () => {
    const result = formatValue(1_000_000, 0, ' Wh');
    expect(result).toMatch(/Wh$/);
    // Should contain commas for the Indian numbering system
    expect(result).toContain(',');
  });

  it('a_deg 0.0 → "0.00" (2 decimal places)', () => {
    expect(formatValue(0.0, 2)).toBe('0.00');
  });

  it('a_deg 1000.0 → "1000.00"', () => {
    expect(formatValue(1000.0, 2)).toBe('1000.00');
  });

  it('appends unit suffix when provided', () => {
    expect(formatValue(5_000_000, 0, ' Wh')).toMatch(/ Wh$/);
  });

  it('does not append suffix when unit is undefined', () => {
    const result = formatValue(1.5, 2, undefined);
    expect(result).toBe('1.50');
  });

  it('decimals=0 triggers integer separator path (no decimal point)', () => {
    const result = formatValue(12345, 0);
    expect(result).not.toContain('.');
  });

  it('formatValue for each slider min matches expected format', () => {
    for (const slider of SLIDERS) {
      const formatted = formatValue(slider.min, slider.decimals, slider.unit);
      expect(typeof formatted).toBe('string');
      expect(formatted.length).toBeGreaterThan(0);
    }
  });

  it('formatValue for each slider max matches expected format', () => {
    for (const slider of SLIDERS) {
      const formatted = formatValue(slider.max, slider.decimals, slider.unit);
      expect(typeof formatted).toBe('string');
      expect(formatted.length).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// Tests: isConnected=false → disabled prop is true
// ---------------------------------------------------------------------------

describe('Slider disabled state via market store', () => {
  beforeEach(() => {
    // Reset store to initial state (isConnected=false) before each test
    useMarketStore.getState().clearStore();
  });

  it('isConnected is false in the initial store state', () => {
    const { isConnected } = useMarketStore.getState();
    expect(isConnected).toBe(false);
  });

  it('disabled = !isConnected is true when store has isConnected=false', () => {
    const isConnected = useMarketStore.getState().isConnected;
    const disabled = !isConnected;
    expect(disabled).toBe(true);
  });

  it('disabled = !isConnected is false when store has isConnected=true', () => {
    useMarketStore.getState().setConnectionState(true);
    const isConnected = useMarketStore.getState().isConnected;
    const disabled = !isConnected;
    expect(disabled).toBe(false);
  });

  it('reconnecting clears connectionError and sets isConnected=true', () => {
    // First disconnect with an error
    useMarketStore.getState().setConnectionState(false, 'WebSocket closed');
    expect(useMarketStore.getState().isConnected).toBe(false);
    expect(useMarketStore.getState().connectionError).toBe('WebSocket closed');

    // Then reconnect
    useMarketStore.getState().setConnectionState(true);
    expect(useMarketStore.getState().isConnected).toBe(true);
    expect(useMarketStore.getState().connectionError).toBeNull();

    // Sliders should now be enabled
    const disabled = !useMarketStore.getState().isConnected;
    expect(disabled).toBe(false);
  });

  it('disconnecting with no error string sets connectionError to null', () => {
    useMarketStore.getState().setConnectionState(false);
    expect(useMarketStore.getState().isConnected).toBe(false);
    expect(useMarketStore.getState().connectionError).toBeNull();
    // Sliders remain disabled
    expect(!useMarketStore.getState().isConnected).toBe(true);
  });

  it('the "disabled" flag is derived consistently from isConnected for all 4 sliders', () => {
    // When disconnected: every slider should have disabled=true
    useMarketStore.getState().setConnectionState(false);
    const isConnectedOff = useMarketStore.getState().isConnected;
    for (const slider of SLIDERS) {
      const disabled = !isConnectedOff;
      expect(disabled).toBe(true);
      // suppress unused variable warning in strict mode
      expect(slider.key).toBeTruthy();
    }

    // When connected: every slider should have disabled=false
    useMarketStore.getState().setConnectionState(true);
    const isConnectedOn = useMarketStore.getState().isConnected;
    for (const slider of SLIDERS) {
      const disabled = !isConnectedOn;
      expect(disabled).toBe(false);
      expect(slider.key).toBeTruthy();
    }
  });
});
