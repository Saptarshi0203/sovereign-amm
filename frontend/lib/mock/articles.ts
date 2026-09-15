/**
 * @file articles.ts
 * @description Static mock knowledge-base articles for the Sovereign-AMM research portal.
 *
 * Exports a frozen array of exactly 5 Article objects covering:
 *  1. GLFT vs Avellaneda-Stoikov  (QUANT RESEARCH  → emerald)
 *  2. Rainflow cycle counting      (HARDWARE PHYSICS → amber)
 *  3. PTDF congestion screening    (GRID PHYSICS     → sky)
 *  4. Deterministic microstructure (WHITE PAPER      → slate)
 *  5. ZK solvency proofs           (APPLIED CRYPTO   → violet)
 *
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9
 */

import type { Article } from '@/lib/types';

// ---------------------------------------------------------------------------
// Article 1 — GLFT vs Avellaneda-Stoikov
// ---------------------------------------------------------------------------

const GLFT_ARTICLE: Article = {
  slug: 'glft-vs-avellaneda-stoikov',
  title: 'Why GLFT Outperforms Avellaneda-Stoikov in Battery Storage Systems',
  category: 'QUANT RESEARCH',
  badgeColor: 'emerald',
  publishedAt: '2024-03-15',
  readTime: 4,
  summary:
    'A breakdown of bounded-inventory stochastic control (q ∈ [-1, +1]) versus classic unconstrained models, showing how boundary suppression prevents microgrid battery exhaustion.',
  pullQuote:
    'Boundary suppression at the inventory limits is not a constraint — it is the market maker\'s most powerful risk management tool.',
  body: [
    {
      heading: 'From Unconstrained to Bounded Inventory',
      content:
        'The classic Avellaneda-Stoikov (AS) model treats a market maker\'s inventory as an unconstrained real variable, applying a reservation-price skew of the form `r(s,q,t) = s − q · γ · σ² · (T − t)` to symmetrically shrink the spread around the adjusted mid. While this is analytically elegant for equity desks with unlimited short-selling, it is physically inadmissible for a battery storage system: the battery cannot discharge below 0 % SoC or charge above 100 % SoC. Operating the AS model without modification will eventually drive the system into hard physical limits, causing forced curtailments and potential cell damage. The Guéant-Lehalle-Fernandez-Tapia (GLFT) extension addresses this by explicitly bounding the normalized inventory `q ∈ [−1, +1]` and deriving asymptotic closed-form quotes that respect those walls.',
    },
    {
      heading: 'GLFT Asymptotic Quote Formulas',
      content:
        'The GLFT asymptotic solution introduces two key scalars computed once per parameter update. The base half-spread is `base = (1/k) · ln(1 + k/γ)`, where `k` is the order-flow decay rate and `γ` is the risk-aversion coefficient. The full spread factor is `spread = √( (σ²·γ) / (2·k·A) · (1 + γ/k)^{(1+k/γ)} )`. From these, the per-side skew functions are `δ_bid(q) = base + ((2q+1)/2) · spread` and `δ_ask(q) = base − ((2q−1)/2) · spread`. When the inventory is long (q > 0, battery nearly full), the ask skew shrinks and the bid skew widens, naturally discouraging further charging. When q < 0 (battery nearly empty), the pattern inverts, protecting the discharge floor.',
    },
    {
      heading: 'Hard Boundary Suppression',
      content:
        'Beyond the smooth skew, GLFT imposes hard boundary suppression: when `soc ≤ soc_floor` the bid quote is withdrawn entirely, and when `soc ≥ soc_ceiling` the ask quote is withdrawn. This is not a numerical patch — it is the economic statement that no rational market maker quotes a price at which it literally cannot trade. In the microgrid context, soc_floor is typically set at 10 % to preserve battery longevity, and soc_ceiling at 95 % for the same reason. The boundaries act as absorbing barriers in the inventory process, ensuring the Markov chain of SoC never exits the safe operating region regardless of order-flow intensity.',
    },
    {
      heading: 'Micro-Price as the GLFT Reference',
      content:
        'Rather than using the naive arithmetic mid `(P_bid + P_ask) / 2` as the reference price `s` in the GLFT formula, Sovereign-AMM substitutes the micro-price: `micro = (P_bid · V_ask + P_ask · V_bid) / (V_bid + V_ask)`. This volume-weighted mid is a better short-term price predictor than the arithmetic mid when order book imbalance (OBI) is non-zero, which is nearly always the case in an active microgrid exchange. Using micro-price as the GLFT anchor reduces adverse selection against the market maker by roughly 15–25 % in backtest, since the quoted prices already incorporate the directional information embedded in the book depth.',
    },
    {
      heading: 'Empirical Comparison and Degradation Cost',
      content:
        'Backtests on synthetic microgrid load profiles show that the GLFT model, combined with the Rainflow-derived degradation surcharge `C_deg` added to the ask side (`ask = mid + δ_ask(q) + C_deg`), achieves 40–60 % lower inventory drawdowns compared to the unconstrained AS model under identical arrival rate assumptions. The reason is structural: AS\'s reservation price is linear in inventory and time-to-horizon, making it increasingly aggressive as the deadline approaches; GLFT\'s asymptotic solution removes the time dimension entirely, producing a stationary policy that remains stable during 24-hour continuous operation. For microgrid deployments where the market maker runs indefinitely, this stationarity is not merely convenient — it is a correctness requirement.',
    },
  ],
};

// ---------------------------------------------------------------------------
// Article 2 — Rainflow Cycle Counting
// ---------------------------------------------------------------------------

const RAINFLOW_ARTICLE: Article = {
  slug: 'rainflow-cycle-counting',
  title:
    'Quantifying Chemical Degradation: Streaming Rainflow Cycles in Live Order Books',
  category: 'HARDWARE PHYSICS',
  badgeColor: 'amber',
  publishedAt: '2024-02-28',
  readTime: 6,
  summary:
    'How online 3-point cycle counting converts lithium-ion Depth of Discharge (DoD) fatigue curves into dynamic Ask-price surcharges (C_deg) in real time.',
  pullQuote:
    'Every kilowatt-hour that flows through the battery costs a fraction of its chemical life. Rainflow counting makes that cost explicit and immediate.',
  body: [
    {
      heading: 'Lithium-Ion Fatigue: The Wöhler Curve',
      content:
        'Lithium-ion cells degrade via two coupled mechanisms: calendar aging (electrolyte decomposition and SEI layer growth) and cycle aging (mechanical stress from intercalation/de-intercalation). For market-making purposes, cycle aging dominates and is well-modelled by the empirical Wöhler (S-N) fatigue relation `N_cycles(d) = N₀ · d^{−β}`, where `d ∈ (0,1]` is the Depth of Discharge (DoD), `N₀` is the full-cycle count at 100 % DoD (typically 1 000–3 000 for lithium-iron-phosphate), and `β ≈ 0.5` is the fatigue exponent. A deeper discharge consumes a disproportionately larger share of the battery\'s lifetime, which motivates dynamic pricing: the market maker should charge more for energy traded at high DoD.',
    },
    {
      heading: 'Marginal Wear Cost Formula',
      content:
        'The marginal degradation cost per kWh of throughput at a given DoD is derived by amortising the capital cost of the battery over its expected cycle life: `C_deg(d) = C_cap / (2 · N_cycles(d) · E_nom · η)`, where `C_cap` is the battery replacement cost in ₹, `E_nom` is the nominal energy capacity in kWh, `η` is the roundtrip efficiency (typically 0.90–0.96 for modern LFP), and the factor of 2 accounts for the fact that a full charge-discharge cycle traverses the energy twice. Substituting `N_cycles(d) = N₀ · d^{−β}` yields `C_deg(d) = C_cap · d^β / (2 · N₀ · E_nom · η)`, which is an increasing function of DoD — exactly the incentive alignment we need.',
    },
    {
      heading: 'Streaming 3-Point Rainflow Algorithm',
      content:
        'Standard rainflow counting (ASTM E1049) requires the full SoC time series to be known in advance. Sovereign-AMM uses the online streaming variant: maintain a LIFO stack of SoC reversal points. At each new reversal, check whether the middle range `|stack[-2] − stack[-1]|` is less than or equal to the outer range `|stack[-3] − stack[-1]|`. If so, pop the middle two points, record a closed half-cycle of amplitude `|stack[-2] − stack[-1]| / 2`, and charge `C_deg` accordingly; repeat until the stack condition fails or fewer than 3 points remain. This algorithm processes each new SoC sample in `O(1)` amortised time, making it compatible with the 10 Hz tick rate.',
    },
    {
      heading: 'Integration with the Ask Quote',
      content:
        'The accumulated cycle cost is maintained as a running exponential moving average to smooth out burst-cycle events. The current `C_deg` value is folded directly into the GLFT ask price: `ask = mid + δ_ask(q) + C_deg`. The bid side is unaffected — the market maker charges buyers for the wear cost of delivering energy but does not discount sellers, since the battery suffers wear equally on charge and discharge. In steady-state operation at moderate SoC, `C_deg` contributes roughly 0.005–0.015 ₹/kWh, widening the effective spread by 10–30 % compared to a model that ignores degradation.',
    },
    {
      heading: 'Calibration and Sensitivity',
      content:
        'The two key parameters `N₀` and `β` should be calibrated per cell chemistry using manufacturer cycle-life data or in-situ capacity-fade measurements. For a typical LFP cell, `N₀ ≈ 2 000` cycles at 80 % DoD translates to `N₀ = 2 000 / 0.8^{−0.5} ≈ 2 236` at 100 % DoD using the Wöhler relation. Sensitivity analysis shows that a 20 % error in `N₀` propagates linearly to `C_deg`, while a 0.1 shift in `β` changes `C_deg` by approximately `d^{0.1} ≈ 6 %` at 50 % DoD — modest enough that the model is reasonably robust to calibration uncertainty. The degradation weight slider in JudgeControls allows operators to scale `C_deg` in real time without recalibrating the underlying Wöhler curve.',
    },
  ],
};

// ---------------------------------------------------------------------------
// Article 3 — PTDF Congestion Screening
// ---------------------------------------------------------------------------

const PTDF_ARTICLE: Article = {
  slug: 'ptdf-congestion-screening',
  title: 'Sub-Millisecond Transmission Safety via PTDF Matrix Screening',
  category: 'GRID PHYSICS',
  badgeColor: 'sky',
  publishedAt: '2024-01-20',
  readTime: 3,
  summary:
    'Replaces slow 10 Hz DC-OPF iterative linear programming with fast O(L) Power Transfer Distribution Factor dot products to intercept thermal overload risks instantly.',
  pullQuote:
    'A single dot product per trade decides whether the grid survives. The PTDF matrix is physics compressed to a lookup table.',
  body: [
    {
      heading: 'The DC-OPF Bottleneck',
      content:
        'Full DC Optimal Power Flow (DC-OPF) formulates transmission security as a linear program with `B_bus · θ = p_net` as the nodal balance constraint, subject to thermal limits `|f_l| ≤ f_l^{max}` on every line. Solving this LP at 10 Hz for each candidate trade requires roughly 1–10 ms per call depending on the network size — too slow for a market maker that must quote in under 1 ms. The iterative interior-point solver also introduces non-determinism in its convergence path, making it unsuitable for a deterministic event-sourced ledger. PTDF pre-computation eliminates these problems by compressing the full AC physics into a static matrix.',
    },
    {
      heading: 'PTDF Matrix Derivation',
      content:
        'The Power Transfer Distribution Factor matrix `Φ ∈ ℝ^{L×N}` maps a vector of bus injections `p ∈ ℝ^N` to line flows `f = Φ · p`. It is derived analytically from the DC power-flow Jacobian: `Φ = B_d · A_inc · B_bus^{+}`, where `B_d = diag(1/x_l)` is the diagonal susceptance matrix, `A_inc ∈ ℝ^{L×N}` is the signed incidence matrix of the graph, and `B_bus^{+}` is the Moore-Penrose pseudoinverse of the nodal susceptance matrix with the slack bus column zeroed. Once computed, `Φ` is a dense floating-point matrix that can be stored in a few kilobytes for typical microgrid topologies.',
    },
    {
      heading: 'O(L) Trade Screening',
      content:
        'Given a proposed trade of `dP` MW from bus `i` to bus `j`, the incremental line flow vector is `Δf = (Φ[:,i] − Φ[:,j]) · dP`. The trade is accepted if and only if `max_l |f_l + Δf_l| ≤ f_l^{max} · safety_margin` for all `L` lines, where `safety_margin ≈ 0.95` provides a 5 % thermal headroom. This is a single matrix-vector multiply plus a max-comparison, executing in `O(L)` time — approximately 9 microseconds for our 7-bus, 9-line microgrid on commodity hardware. The deterministic nature of the check means every rejection can be reconstructed from the event log given the PTDF matrix and the injection vector.',
    },
    {
      heading: 'Congestion Flags and LMP Shadow Costs',
      content:
        'When a line\'s current utilization `|f_l| / f_l^{max}` exceeds 85 %, the grid store sets `congestionFlags[lineId] = true`, triggering the amber visual indicator on the topology map. Exceeding 95 % promotes the flag to critical and applies a CSS pulse animation to draw operator attention. Locational Marginal Prices (LMPs) under congestion can be decomposed as `LMP_i = λ + Σ_l μ_l · Φ_{l,i}`, where `λ` is the system energy price and `μ_l` is the shadow price (dual variable) of the thermal constraint on line `l`. In Sovereign-AMM\'s stub implementation, shadow prices are approximated from the utilization excess, giving operators directional LMP signals without solving the full LP.',
    },
  ],
};

// ---------------------------------------------------------------------------
// Article 4 — Deterministic Microstructure
// ---------------------------------------------------------------------------

const DETERMINISTIC_ARTICLE: Article = {
  slug: 'deterministic-microstructure',
  title:
    'The Fallacy of Predictive AI: Why Microgrids Need Deterministic Microstructure',
  category: 'WHITE PAPER',
  badgeColor: 'slate',
  publishedAt: '2024-04-01',
  readTime: 5,
  summary:
    'Why black-box Machine Learning models fail during unexpected load shocks—and how deterministic financial order books guarantee grid equilibrium without blackouts.',
  pullQuote:
    'When the grid is in crisis, a model that learned from yesterday\'s data is worse than useless. Deterministic microstructure cannot be surprised.',
  body: [
    {
      heading: 'Distribution Shift Under Load Shocks',
      content:
        'Machine learning models for energy forecasting and dispatch are trained on historical consumption data. They perform well inside the training distribution but are fundamentally brittle at its boundaries. A sudden industrial load spike — a cement factory starting a kiln, or an EV charging depot activating simultaneously — creates an input pattern that the model has never seen. The model\'s gradient descent optimization process has no mechanism for extrapolating safely: it will produce a confidence interval that does not contain the true value, and the grid dispatch decision based on that prediction may trigger cascading failures. Deterministic microstructure sidesteps this entirely: prices are set by instantaneous physics and inventory, not by prediction.',
    },
    {
      heading: 'The Order Book as an Automatic Stabiliser',
      content:
        'An L2 order book with GLFT pricing functions as a continuous, memoryless Automatic Stabiliser for grid voltage and frequency. When excess supply hits (solar irradiance spike), the large ask-side volume drives the micro-price `micro = (P_bid · V_ask + P_ask · V_bid) / (V_bid + V_ask)` downward, creating a market signal that storage operators should charge. When load surges, the price rises and storage operators discharge into the market. This negative-feedback loop is instantaneous — it does not require a forecast, a trained model, or a round-trip to a central optimizer. The convergence time of the stabilization is `O(1/k)` ticks, where `k` is the order-flow decay parameter.',
    },
    {
      heading: 'Seeded Determinism as an Auditability Guarantee',
      content:
        'Every event in Sovereign-AMM is reproducible from a single 32-bit seed. The Mulberry32 PRNG `mulberry32(seed)(` produces the same sequence given the same seed, meaning the entire market simulation — order arrivals, fills, price path, SoC trajectory — can be replayed byte-identically from the event log. This is not merely a testing convenience; it is a regulatory requirement for energy markets where every curtailment decision must be explainable to a grid operator or regulator. No ML model with stochastic inference can provide this guarantee. Deterministic microstructure can.',
    },
    {
      heading: 'Comparison with Model Predictive Control',
      content:
        'Model Predictive Control (MPC) is often proposed as a principled alternative to both ML and pure market mechanisms. MPC solves a rolling finite-horizon optimal control problem, explicitly incorporating physical constraints. However, MPC requires an accurate system model, a convex objective, and an interior-point solver in the dispatch loop. The solver runtime scales as `O(N³)` in the prediction horizon `N`, making real-time 10 Hz dispatch infeasible beyond small networks. GLFT market making scales as `O(1)` per tick regardless of network size, since it operates on aggregate order-book statistics rather than nodal power-flow equations. For microgrid deployments where the control horizon is seconds rather than hours, the asymptotic optimality of GLFT — proven under Poisson arrivals and geometric Brownian motion price dynamics — is more than sufficient.',
    },
    {
      heading: 'Scope and Limitations',
      content:
        'Deterministic microstructure does not eliminate all grid risk. It requires sufficient liquidity depth (enough prosumers and storage units quoting) to function as intended; a thinly traded microgrid may face wide spreads and poor price discovery. It also does not replace long-horizon planning tools such as unit commitment or transmission expansion studies. The claim made here is narrower: for the 0–60 second real-time dispatch problem in a prosumer microgrid, GLFT market-making with PTDF screening provides stronger safety guarantees, higher auditability, and lower computational cost than any ML-based alternative currently available.',
    },
  ],
};

// ---------------------------------------------------------------------------
// Article 5 — ZK Solvency Proofs
// ---------------------------------------------------------------------------

const ZK_ARTICLE: Article = {
  slug: 'zk-solvency-proofs',
  title:
    'Zero-Knowledge Solvency: Protecting Household Energy Privacy with Bulletproofs',
  category: 'APPLIED CRYPTO',
  badgeColor: 'violet',
  publishedAt: '2024-05-10',
  readTime: 4,
  summary:
    'How Pedersen commitments and range proofs allow households to trade surplus solar energy and verify solvency without exposing raw consumption data.',
  pullQuote:
    'A household should be able to prove it can pay its energy bill without revealing how much power its children\'s bedrooms consume at 2 AM.',
  body: [
    {
      heading: 'The Privacy Problem in Prosumer Markets',
      content:
        'Smart-meter data collected at 10-second resolution reveals intimate details of household life: when people wake up, when appliances run, whether the home is occupied. In a prosumer energy market where households trade surplus solar generation directly with neighbours, broadcasting raw energy balances would expose consumption patterns to every market participant. This is not a theoretical concern — academic studies have shown that 15-minute smart-meter readings allow accurate inference of occupancy patterns, appliance types, and even demographic characteristics. A cryptographically sound privacy layer is therefore not optional; it is a precondition for household participation in prosumer markets.',
    },
    {
      heading: 'Pedersen Commitments',
      content:
        'A Pedersen commitment to a value `v` with blinding factor `r` is `C = v·G + r·H`, where `G` and `H` are independent generator points on an elliptic curve. The commitment is perfectly hiding (the same value committed with a different `r` is computationally indistinguishable) and computationally binding (finding two values that produce the same commitment requires solving the discrete logarithm problem). In the energy market context, each household commits to its net energy balance `b ∈ ℤ` without revealing `b`. The settlement protocol then operates on commitments: `C_1 + C_2 = (v_1 + v_2)·G + (r_1 + r_2)·H`, preserving additive homomorphism so that the grid operator can verify that total injections balance total consumption.',
    },
    {
      heading: 'Bulletproofs for Range Verification',
      content:
        'Pedersen commitments alone do not prevent a household from claiming a negative energy balance (effectively counterfeiting energy credits). Range proofs are required to verify that the committed value `v ∈ [0, 2^n)` without revealing `v`. Bulletproofs (Bünz et al., 2018) achieve this with proof size `O(log n)` and verification time `O(n)`, making them practical for 64-bit energy values. The Bulletproof inner-product argument reduces the range check `v = Σ_{i=0}^{n-1} a_i · 2^i, a_i ∈ {0,1}` to a single scalar product verification, compressing what would be `n` individual bit-range proofs into a single 675-byte proof regardless of `n`.',
    },
    {
      heading: 'Solvency Without Disclosure',
      content:
        'Solvency in the energy market means: at settlement, the household\'s committed energy balance is non-negative (it has not consumed more than it generated plus purchased). To prove solvency without revealing the balance, the household publishes a Pedersen commitment `C = b·G + r·H` together with a Bulletproof range proof attesting `b ≥ 0`. The settlement smart contract (or verifier node) checks the proof in `O(log b_max)` time. If the proof passes, the household is solvent. Crucially, the verifier learns nothing about `b` beyond the fact that it is non-negative — the same assurance a bank provides when it confirms your account is in credit without showing your statement.',
    },
    {
      heading: 'Stub Status and Roadmap',
      content:
        'The ZK solvency module in Sovereign-AMM is currently a typed stub (`engine/stubs/crypto_zk_proofs.py`) that raises `NotImplementedError` with a full docstring describing the commitment and proof interfaces. The interface is: `commit(value: int, blinding: int) → bytes`, `prove_range(commitment: bytes, value: int, blinding: int, n_bits: int) → bytes`, and `verify_range(commitment: bytes, proof: bytes, n_bits: int) → bool`. A full implementation would depend on a Rust Bulletproofs library via PyO3 bindings — outside the scope of the current Python-only constraint. The ADR at `docs/adr/002-zk-solvency-design.md` records this decision and provides the integration plan for a future production deployment.',
    },
  ],
};

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

/**
 * Frozen array of exactly 5 research articles for the Sovereign-AMM knowledge base.
 *
 * Category → badgeColor bijection:
 *  - 'QUANT RESEARCH'   → 'emerald'
 *  - 'HARDWARE PHYSICS' → 'amber'
 *  - 'GRID PHYSICS'     → 'sky'
 *  - 'WHITE PAPER'      → 'slate'
 *  - 'APPLIED CRYPTO'   → 'violet'
 *
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9
 */
export const ARTICLES: readonly Article[] = Object.freeze([
  GLFT_ARTICLE,
  RAINFLOW_ARTICLE,
  PTDF_ARTICLE,
  DETERMINISTIC_ARTICLE,
  ZK_ARTICLE,
]);
