import math
from dataclasses import dataclass
from typing import Optional
from engine.types import BatteryState, Quote

@dataclass
class GLFTParams:
    sigma: float   # Volatility (INR/kWh / sqrt(s))
    gamma: float   # Risk aversion (dimensionless)
    k: float       # Order-flow decay (1 / (INR/kWh))
    A: float       # Arrival intensity (orders/s)
    q_max_units: int # Maximum battery capacity in micro-kWh (Q_max)
    soc_floor_units: int # Minimum SoC in micro-kWh
    soc_ceiling_units: int # Maximum SoC in micro-kWh
    order_size_units: int = 1_000_000 # Default quote size in micro-kWh (1 kWh)

def quote(state: BatteryState, mid: float, params: GLFTParams, c_deg: float = 0.0) -> Quote:
    """
    Computes a GLFT two-sided quote.
    
    Symbol Table:
    - sigma: Volatility (INR/kWh / sqrt(s))
    - gamma: Risk aversion (dimensionless)
    - k: Order-flow decay (1 / (INR/kWh))
    - A: Arrival intensity (orders/s)
    - q: Normalized inventory in [-1, 1]
    - Q_max: Maximum battery capacity (micro-kWh)
    
    Returns a Quote object with prices in micro-INR and volumes in micro-kWh.
    """
    # 1. Inventory normalization
    soc = state.soc
    q_max = params.q_max_units
    
    # Map soc in [0, Q_max] linearly to q in [-1, +1]
    # q = 2*(soc - Q_max/2) / Q_max
    if q_max > 0:
        q = 2.0 * (soc - q_max / 2.0) / q_max
    else:
        q = 0.0

    # 2. GLFT Base and Spread Calculation
    k = params.k
    gamma = params.gamma
    sigma = params.sigma
    A = params.A
    
    base = (1.0 / k) * math.log(1.0 + k / gamma)
    
    # Overflow guard for spread term: (1 + gamma/k)^(1 + k/gamma)
    exponent = 1.0 + k / gamma
    base_term = 1.0 + gamma / k
    try:
        power_term = math.pow(base_term, exponent)
    except OverflowError:
        # For large exponent, base_term is close to 1, limit is 'e'
        power_term = math.exp(1.0)
        
    spread = math.sqrt((sigma**2 * gamma) / (2.0 * k * A) * power_term)
    
    # 3. Delta Bid and Ask
    delta_bid = base + ((2.0 * q + 1.0) / 2.0) * spread
    # delta_ask(q) = base - ((2q - 1)/2) * spread
    delta_ask = base - ((2.0 * q - 1.0) / 2.0) * spread
    
    bid_price = mid - delta_bid
    ask_price = mid + delta_ask + c_deg
    
    # 4. Volume Clamping
    bid_volume = params.order_size_units
    ask_volume = params.order_size_units
    
    # Bid implies battery buys (charges). Cannot exceed soc_ceiling.
    if soc + bid_volume > params.soc_ceiling_units:
        bid_volume = max(0, params.soc_ceiling_units - soc)
        
    # Ask implies battery sells (discharges). Cannot go below soc_floor.
    if soc - ask_volume < params.soc_floor_units:
        ask_volume = max(0, soc - params.soc_floor_units)
    
    # 5. Hard suppression at walls
    # Battery is full -> Cannot charge -> Suppress BID
    if soc >= params.soc_ceiling_units:
        bid_volume = 0
    # Battery is empty -> Cannot discharge -> Suppress ASK
    if soc <= params.soc_floor_units:
        ask_volume = 0
        
    if math.isinf(bid_price) or math.isinf(ask_price):
        print(f"DEBUG glft_pricing: mid={mid}, base={base}, spread={spread}, delta_bid={delta_bid}, delta_ask={delta_ask}, q={q}, power_term={power_term}, exponent={exponent}, base_term={base_term}", flush=True)
        
    # Convert to micro-INR
    try:
        bid_micro = int(bid_price * 1_000_000)
    except OverflowError:
        bid_micro = 0
        bid_volume = 0
        
    try:
        ask_micro = int(ask_price * 1_000_000)
    except OverflowError:
        ask_micro = 999999999
        ask_volume = 0
    
    if bid_micro < 1:
        bid_micro = 1
    if ask_micro <= bid_micro:
        ask_micro = bid_micro + 1
    
    return Quote(
        bid_price=bid_micro if bid_volume > 0 else 0,
        ask_price=ask_micro if ask_volume > 0 else 0,
        bid_volume=bid_volume,
        ask_volume=ask_volume,
        timestamp=int(math.floor(time.time() * 1000)) if 'time' in globals() else 0
    )
