from dataclasses import dataclass
from enum import Enum
from typing import Union

# Integer micro-units for all energy and money fields
# 1 unit = 1e-6 kWh
# 1 unit = 1e-6 INR

class Side(Enum):
    BID = "BID"
    ASK = "ASK"

class OrderType(Enum):
    LIMIT = "LIMIT"
    IOC = "IOC" # Immediate Or Cancel

@dataclass(frozen=True, slots=True)
class Order:
    order_id: str
    trader_id: str
    side: Side
    type: OrderType
    price: int   # micro-INR
    volume: int  # micro-kWh
    timestamp: int # ms since epoch

@dataclass(frozen=True, slots=True)
class Fill:
    fill_id: str
    maker_order_id: str
    taker_order_id: str
    price: int   # micro-INR
    volume: int  # micro-kWh
    timestamp: int # ms since epoch

@dataclass(frozen=True, slots=True)
class Quote:
    bid_price: int # micro-INR
    ask_price: int # micro-INR
    bid_volume: int # micro-kWh
    ask_volume: int # micro-kWh
    timestamp: int # ms since epoch

@dataclass(frozen=True, slots=True)
class BatteryState:
    soc: int # micro-kWh
    capacity: int # micro-kWh
    timestamp: int # ms since epoch

@dataclass(frozen=True, slots=True)
class GridTopology:
    # Minimal representation, to be expanded
    name: str
    num_buses: int

# Events

@dataclass(frozen=True, slots=True)
class OrderPlaced:
    sequence_number: int
    order: Order

@dataclass(frozen=True, slots=True)
class OrderCancelled:
    sequence_number: int
    order_id: str

@dataclass(frozen=True, slots=True)
class TradeExecuted:
    sequence_number: int
    fill: Fill

@dataclass(frozen=True, slots=True)
class QuoteUpdated:
    sequence_number: int
    quote: Quote

@dataclass(frozen=True, slots=True)
class SoCChanged:
    sequence_number: int
    new_soc: int # micro-kWh

@dataclass(frozen=True, slots=True)
class TradeRejected:
    sequence_number: int
    maker_order_id: str
    taker_order_id: str
    reason: str
@dataclass(frozen=True, slots=True)
class EmergencyOverrideEngaged:
    sequence_number: int
    operator_id: str
    reason: str
    timestamp: int

@dataclass(frozen=True, slots=True)
class EmergencyOverrideReleased:
    sequence_number: int
    operator_id: str
    timestamp: int

@dataclass(frozen=True, slots=True)
class ManualInjectionEvent:
    sequence_number: int
    bus_id: str
    mw: float
    ts: int
    actor: str

@dataclass(frozen=True, slots=True)
class GridResetEvent:
    sequence_number: int
    ts: int
    actor: str
    
Event = Union[
    OrderPlaced, OrderCancelled, TradeExecuted, QuoteUpdated, 
    SoCChanged, TradeRejected, EmergencyOverrideEngaged, 
    EmergencyOverrideReleased, ManualInjectionEvent, GridResetEvent
]
