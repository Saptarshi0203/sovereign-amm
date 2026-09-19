/**
 * @file rag.ts
 * @description Local keyword-matching RAG (Retrieval-Augmented Generation) mock.
 * Simulates 600 ms backend latency and returns typed `RagResult` objects based
 * on keyword groups. No HTTP calls are made — all logic runs client-side.
 *
 * Matching strategy: `keywords.some(kw => query.toLowerCase().includes(kw.toLowerCase()))`
 * First matching group wins; if no group matches, the fallback result is returned.
 *
 * Requirements: 6.1 – 6.10
 */

import type { RagResult } from '@/lib/types';

// ---------------------------------------------------------------------------
// Internal structure: each entry maps keywords → answer content
// ---------------------------------------------------------------------------

interface RagEntry {
  keywords: string[];
  result: Omit<RagResult, 'isFallback'>;
}

// ---------------------------------------------------------------------------
// Keyword map — 6 groups, evaluated in order
// ---------------------------------------------------------------------------

const KEYWORD_MAP: RagEntry[] = [
  // Group 1: GLFT market making
  {
    keywords: ['glft', 'market maker', 'spread', 'quoting', 'avellaneda'],
    result: {
      answer:
        "The GLFT (Guéant–Lehalle–Fernandez-Tapia) bounded-inventory market maker quotes asymmetric bid and ask prices based on current inventory `q ∈ [−1, +1]`. The bid delta is `δ_bid(q) = base + ((2q + 1)/2) × spread` and the ask delta is `δ_ask(q) = base − ((2q − 1)/2) × spread`, where `base = (1/k) × ln(1 + k/γ)` and `spread = √(σ²γ / (2kA) × (1 + γ/k)^(1+k/γ))`. Unlike Avellaneda-Stoikov, GLFT suppresses the bid entirely when SoC is at the floor and suppresses the ask when SoC is at the ceiling — preventing battery exhaustion.",
      sources: [
        'GLFT vs Avellaneda-Stoikov',
        '/articles/glft-vs-avellaneda-stoikov',
      ],
      suggestedQuestions: [
        'How does degradation affect the ask price?',
        'What is boundary suppression?',
        'How is spread calculated?',
      ],
    },
  },

  // Group 2: Rainflow degradation
  {
    keywords: [
      'rainflow',
      'degradation',
      'battery health',
      'cdeg',
      'wear',
      'dod',
      'cycle',
    ],
    result: {
      answer:
        'Rainflow cycle counting is a streaming 3-point algorithm that tracks SoC reversals to quantify lithium-ion fatigue in real time. Each closed cycle at depth-of-discharge `d` incurs a marginal cost `C_deg(d) = C_cap / (2 × N₀ × d^{−β} × E_nom × η)` where `N₀` and `β` are Wöhler curve constants. This cost is added directly to the GLFT ask price as a surcharge, so the market maker never sells energy cheaper than its chemical wear cost.',
      sources: [
        'Rainflow Cycle Counting',
        '/articles/rainflow-cycle-counting',
      ],
      suggestedQuestions: [
        'What is the GLFT spread formula?',
        'How is SoC mapped to inventory q?',
        'What happens at the SoC ceiling?',
      ],
    },
  },

  // Group 3: PTDF / power flow
  {
    keywords: [
      'ptdf',
      'congestion',
      'transmission',
      'grid',
      'power flow',
      'dc-opf',
      'thermal',
    ],
    result: {
      answer:
        'Power Transfer Distribution Factors (PTDF) are pre-computed sensitivity coefficients — `PTDF[l][b]` is the fraction of a 1 MW injection at bus `b` that flows on line `l`. Before executing a trade of `dP` MW between buses `i` and `j`, Sovereign-AMM performs an O(L) dot product: `Δf = (PTDF[:,i] − PTDF[:,j]) × dP`. If any `|f_l + Δf_l| > f_max_l × safety_margin`, the trade is rejected. This replaces iterative DC-OPF solvers and runs in sub-millisecond time.',
      sources: [
        'PTDF Congestion Screening',
        '/articles/ptdf-congestion-screening',
      ],
      suggestedQuestions: [
        'How is the PTDF matrix computed?',
        'What is LMP?',
        'What happens when a line is congested?',
      ],
    },
  },

  // Group 4: ZK / solvency proofs
  {
    keywords: [
      'zk',
      'zero knowledge',
      'privacy',
      'solvency',
      'pedersen',
      'bulletproof',
      'commitment',
    ],
    result: {
      answer:
        'Sovereign-AMM uses Pedersen commitments to allow participants to commit to energy balances without revealing raw values. A Bulletproof range proof then proves the committed value lies within a valid range (e.g., solvency ≥ 0) without revealing the balance. This means a household can prove it has sufficient energy credit to trade without exposing its consumption patterns to the market.',
      sources: [
        'ZK Solvency Proofs',
        '/articles/zk-solvency-proofs',
      ],
      suggestedQuestions: [
        'What is a Pedersen commitment?',
        'How does settlement work?',
        'Is the ZK proof on-chain?',
      ],
    },
  },

  // Group 5: Micro-price / OBI
  {
    keywords: [
      'micro price',
      'microprice',
      'obi',
      'imbalance',
      'order book imbalance',
      'weighted mid',
    ],
    result: {
      answer:
        'The micro-price is a size-weighted mid that corrects for order book asymmetry: `micro = (P_bid × V_ask + P_ask × V_bid) / (V_bid + V_ask)`. When the best ask has more volume, the micro-price tilts toward the bid (more sellers present), and vice versa. Order Book Imbalance (OBI) = `(Σbid.sz[0..4] − Σask.sz[0..4]) / (Σbid.sz[0..4] + Σask.sz[0..4])` quantifies this skew over the top 5 levels, ranging from −1 (all supply) to +1 (all demand).',
      sources: [
        'GLFT vs Avellaneda-Stoikov',
        '/articles/glft-vs-avellaneda-stoikov',
      ],
      suggestedQuestions: [
        'What is the GLFT spread?',
        'How does OBI affect pricing?',
        'What is best bid/ask?',
      ],
    },
  },

  // Group 6: SoC / inventory mapping
  {
    keywords: [
      'soc',
      'state of charge',
      'inventory',
      'battery',
      'charge',
      'discharge',
      'q value',
    ],
    result: {
      answer:
        'Battery State of Charge maps linearly to the GLFT inventory parameter `q ∈ [−1, +1]` via `q = 2 × (SoC − Q_max/2) / Q_max`. When `q > 0` (battery charged above midpoint), the market maker skews its ask downward to encourage selling. When `q < 0` (below midpoint), it skews its bid downward to discourage buying. Hard walls at `soc_floor` and `soc_ceiling` suppress the respective quote entirely, preventing the battery from over-discharging or overcharging.',
      sources: [
        'GLFT vs Avellaneda-Stoikov',
        '/articles/glft-vs-avellaneda-stoikov',
      ],
      suggestedQuestions: [
        'What is boundary suppression?',
        'How does SoC affect the bid?',
        'What is the GLFT spread?',
      ],
    },
  },
];

// ---------------------------------------------------------------------------
// Fallback result (no keyword matched)
// ---------------------------------------------------------------------------

const FALLBACK_RESULT: RagResult = {
  answer:
    "That's outside the indexed corpus. Try asking about GLFT quoting, rainflow degradation, PTDF screening, ZK solvency, micro-price, or SoC inventory mapping.",
  sources: [],
  suggestedQuestions: [
    'What is GLFT?',
    'How is degradation priced?',
    'Explain PTDF screening',
    'What is a micro-price?',
  ],
  isFallback: true,
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Perform local keyword-matching RAG query with simulated 600 ms latency.
 *
 * Matching is case-insensitive substring search:
 *   `keywords.some(kw => query.toLowerCase().includes(kw.toLowerCase()))`
 *
 * The first group whose keywords match wins. If no group matches,
 * `FALLBACK_RESULT` (with `isFallback: true`) is returned.
 *
 * @param query - The user's natural-language query string
 * @returns Promise that resolves to a `RagResult` after exactly 600 ms
 *
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 6.9, 6.10
 */
export function matchQuery(query: string): Promise<RagResult> {
  const lowerQuery = query.toLowerCase();

  const matched = KEYWORD_MAP.find((entry) =>
    entry.keywords.some((kw) => lowerQuery.includes(kw.toLowerCase()))
  );

  const result: RagResult =
    matched !== undefined
      ? { ...matched.result, isFallback: false }
      : FALLBACK_RESULT;

  return new Promise<RagResult>((resolve) => {
    setTimeout(() => resolve(result), 600);
  });
}
