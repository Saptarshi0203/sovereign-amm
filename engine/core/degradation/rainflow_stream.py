import math
from dataclasses import dataclass
from typing import List, Tuple

@dataclass
class RainflowParams:
    c_battery_capex: float
    n0: float
    beta: float
    e_nominal: float
    eta_roundtrip: float

class RainflowStream:
    """
    Streaming 3-point rainflow cycle counter.
    Extracts full and half cycles from a continuous stream of State-of-Charge (SoC) points.
    Computes marginal wear cost per kWh via the Woehler power-law fatigue curve.
    """
    def __init__(self, params: RainflowParams, q_max: float):
        self.params = params
        self.q_max = q_max
        self.Z: List[float] = []
        # Store extracted cycles as (depth, weight)
        self.cycles: List[Tuple[float, float]] = []

    def append(self, soc: float):
        """Append a new SoC point, apply peak/valley filtering, and extract closed cycles."""
        if len(self.Z) < 2:
            if len(self.Z) == 1 and self.Z[0] == soc:
                return
            self.Z.append(soc)
        else:
            prev_dir = self.Z[-1] - self.Z[-2]
            curr_dir = soc - self.Z[-1]
            
            if prev_dir == 0:
                self.Z[-1] = soc
            elif (prev_dir > 0 and curr_dir >= 0) or (prev_dir < 0 and curr_dir <= 0):
                # Continuing in the same direction, update the last point
                self.Z[-1] = soc
            else:
                # Reversal
                self.Z.append(soc)
                
        self._process_stack()

    def _process_stack(self):
        """Standard 3-point extraction: pop when middle range <= outer range."""
        while len(self.Z) >= 3:
            r_outer = abs(self.Z[-1] - self.Z[-2])
            r_middle = abs(self.Z[-2] - self.Z[-3])
            
            if r_middle <= r_outer:
                if len(self.Z) > 3:
                    # Full cycle
                    self.cycles.append((r_middle, 1.0))
                    # Pop Z[-2] and Z[-3]
                    self.Z.pop(-2)
                    self.Z.pop(-2)
                else:
                    # Half cycle
                    self.cycles.append((r_middle, 0.5))
                    self.Z.pop(-3)
            else:
                break

    def marginal_cost(self) -> float:
        """
        Compute marginal cost per kWh for the next discharge.
        Uses the current unclosed depth from the last reversal.
        """
        if len(self.Z) >= 2:
            current_depth = abs(self.Z[-1] - self.Z[-2]) / self.q_max
        elif len(self.Z) == 1:
            current_depth = abs(self.q_max - self.Z[0]) / self.q_max
        else:
            current_depth = 0.0
            
        # Avoid zero-division for tiny depths
        current_depth = max(current_depth, 1e-6)
        
        n_cycles = self.params.n0 * math.pow(current_depth, -self.params.beta)
        c_deg = self.params.c_battery_capex / (2.0 * n_cycles * self.params.e_nominal * self.params.eta_roundtrip)
        return c_deg
