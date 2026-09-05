import { create } from 'zustand';

export interface EngineState {
  tick: number;
  micro_price: number;
  best_bid: number;
  best_ask: number;
  soc: number;
  q: number;
  bids: number[][]; // [price, volume][]
  asks: number[][];
  amm_bid: number | null;
  amm_ask: number | null;
  quote_breakdown: {
    base: number;
    spread: number;
    delta_bid: number;
    delta_ask: number;
    c_deg: number;
  } | null;
  time_series: { time: number; price: number; soc: number }[];
}

interface EngineStore extends EngineState {
  setEngineState: (state: Partial<EngineState>) => void;
}

export const useEngineStore = create<EngineStore>((set) => ({
  tick: 0,
  micro_price: 0,
  best_bid: 0,
  best_ask: 0,
  soc: 50_000_000,
  q: 0,
  bids: [],
  asks: [],
  amm_bid: null,
  amm_ask: null,
  quote_breakdown: null,
  time_series: [],
  setEngineState: (state) => set((prev) => {
    // Append to time_series if we got a new tick and valid price
    let updated_ts = prev.time_series;
    if (state.tick !== undefined && state.tick !== prev.tick && state.micro_price && state.soc !== undefined) {
      updated_ts = [...prev.time_series, { time: state.tick, price: state.micro_price, soc: state.soc / 1e6 }].slice(-100);
    }
    return { ...prev, ...state, time_series: updated_ts };
  }),
}));
