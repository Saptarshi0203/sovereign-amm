# Sovereign-AMM Math Specification

## Symbol Table

| Symbol | Definition | Unit |
| :--- | :--- | :--- |
| $mid$ | Reference micro-price | INR/kWh |
| $q$ | Normalized inventory | dimensionless ([-1, 1]) |
| $\sigma$ | Volatility | INR/kWh / $\sqrt{s}$ |
| $\gamma$ | Risk aversion | dimensionless |
| $k$ | Order-flow decay | $1 / (\text{INR/kWh})$ |
| $A$ | Arrival intensity | orders/s |
| $Q_{max}$| Maximum battery capacity | kWh |
| $soc$ | State of Charge | kWh |
| $C_{deg}$| Marginal Rainflow wear cost | INR/kWh |

## 1. Market Making (GLFT Pricing)

Gueant-Lehalle-Fernandez-Tapia (GLFT) asymptotic quotes with inventory in $[-Q, +Q]$:

$$ \text{base} = \frac{1}{k} \ln \left( 1 + \frac{k}{\gamma} \right) $$

$$ \text{spread} = \sqrt{ \frac{\sigma^2 \gamma}{2kA} \left( 1 + \frac{\gamma}{k} \right)^{\left( 1 + \frac{k}{\gamma} \right)} } $$

$$ \delta_{bid}(q) = \text{base} + \frac{2q + 1}{2} \text{spread} $$
$$ \delta_{ask}(q) = \text{base} - \frac{2q - 1}{2} \text{spread} $$

$$ bid = mid - \delta_{bid}(q) $$
$$ ask = mid + \delta_{ask}(q) + C_{deg} $$

### Battery Mapping
State of Charge ($soc$) in $[0, Q_{max}]$ maps linearly to $q$ in $[-1, +1]$:
$$ q = \frac{2(soc - Q_{max}/2)}{Q_{max}} $$

**Hard walls**:
- If $soc \le soc_{floor}$, suppress the bid.
- If $soc \ge soc_{ceiling}$, suppress the ask.

## 2. Rainflow Degradation Cost

Marginal wear cost per kWh of throughput at depth-of-discharge $d$:

$$ C_{deg}(d) = \frac{C_{battery\_capex}}{2 \cdot N_{cycles}(d) \cdot E_{nominal} \cdot \eta_{roundtrip}} $$
$$ N_{cycles}(d) = N_0 \cdot d^{-\beta} $$

## 3. Micro-price

$$ micro = \frac{P_{bid} \cdot V_{ask} + P_{ask} \cdot V_{bid}}{V_{bid} + V_{ask}} $$

## 4. Power Flow (PTDF Screening)

$$ f = \text{PTDF} \cdot p_{injection} $$

A trade of $dP$ between bus $i$ and bus $j$ is REJECTED if:
$$ \exists \text{ line } l : | f_l + (\text{PTDF}_{l, i} - \text{PTDF}_{l, j}) \cdot dP | > f_{max, l} \cdot \text{safety\_margin} $$

$$ \text{PTDF} = (B_d \cdot A_{inc}) \cdot \text{pinv}(B_{bus}) $$
*(slack bus column zeroed)*
