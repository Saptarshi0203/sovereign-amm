import math
from typing import Dict, Any
from engine.core.order_book.limit_order_book import LimitOrderBook

from engine.types import Quote, BatteryState

def _s(val: float | None) -> float | None:
    if val is None:
        return None
    if math.isnan(val) or math.isinf(val):
        return None
    return val

def engine_to_dto(lob: LimitOrderBook, battery: BatteryState, q_quote: Quote, breakdown: Dict[str, float]) -> Dict[str, Any]:
    """
    Converts pure engine state to human-readable standard units for the API.
    1 micro-unit = 1e-6 of base unit (INR/kWh).
    """
    micro_p = lob.micro_price()
    human_price = _s(micro_p / 1_000_000.0) if micro_p is not None else None
    
    bid = lob.best_bid()
    ask = lob.best_ask()
    
    bids = sorted([[_s(p / 1e6), _s(v / 1e6)] for p, v in lob.bid_levels.items()], key=lambda x: x[0], reverse=True)[:10]
    asks = sorted([[_s(p / 1e6), _s(v / 1e6)] for p, v in lob.ask_levels.items()], key=lambda x: x[0])[:10]
    
    sanitized_breakdown = {k: _s(v) for k, v in breakdown.items()}
    
    return {
        "best_bid": _s(bid / 1_000_000.0) if bid is not None else None,
        "best_ask": _s(ask / 1_000_000.0) if ask is not None else None,
        "micro_price": human_price,
        "total_bid_volume": _s(sum(lob.bid_levels.values()) / 1_000_000.0),
        "total_ask_volume": _s(sum(lob.ask_levels.values()) / 1_000_000.0),
        "bids": bids,
        "asks": asks,
        "battery_soc": _s(battery.soc / 1_000_000.0),
        "amm_bid": _s(q_quote.bid_price / 1_000_000.0) if q_quote.bid_volume > 0 else None,
        "amm_ask": _s(q_quote.ask_price / 1_000_000.0) if q_quote.ask_volume > 0 else None,
        "quote_breakdown": sanitized_breakdown,
    }
