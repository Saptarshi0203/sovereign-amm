from typing import List

from engine.types import (
    Event, OrderPlaced, OrderCancelled, TradeExecuted, QuoteUpdated, 
    SoCChanged, TradeRejected, BatteryState, EmergencyOverrideEngaged, EmergencyOverrideReleased,
    ManualInjectionEvent, GridResetEvent
)
from engine.core.order_book.limit_order_book import LimitOrderBook
from engine.core.degradation.rainflow_stream import RainflowStream, RainflowParams


class EngineState:
    """
    The deterministic projection of all events in the log.
    Holds the order book and battery state.
    """
    def __init__(self, trade_screener=None, capacity_units: int = 100_000_000,
                 rainflow_params: RainflowParams | None = None):
        self.lob = LimitOrderBook(trade_screener=trade_screener)
        initial_soc = capacity_units // 2
        self.battery = BatteryState(soc=initial_soc, capacity=capacity_units, timestamp=0)
        
        # Initialize rainflow cycle counter.
        # Default: LFP-class pack — 8,000 INR/kWh capex, N0 = 6,000 cycles at 100 % DoD,
        # Woehler exponent beta = 1.5; E_nominal in kWh.
        rf_params = rainflow_params or RainflowParams(
            c_battery_capex=8_000.0 * (capacity_units / 1_000_000.0),
            n0=6000.0, beta=1.5,
            e_nominal=capacity_units / 1_000_000.0,
            eta_roundtrip=0.9,
        )
        self.rainflow = RainflowStream(rf_params, q_max=capacity_units)
        self.rainflow.append(initial_soc) # Initial point
        
        # Emergency Override State
        self.emergency_active = False
        self.emergency_reason = ""
        self.emergency_operator = ""
        
        # Manual injections tracking: bus_id -> mw
        self.manual_injections: dict[str, float] = {}

    def apply(self, event: Event):
        """Dispatch event to the appropriate component."""
        if isinstance(event, (OrderPlaced, OrderCancelled, TradeExecuted)):
            if not self.emergency_active or isinstance(event, OrderCancelled):
                self.lob.apply(event)
        elif isinstance(event, SoCChanged):
            if not self.emergency_active:
                self.battery = BatteryState(soc=event.new_soc, capacity=self.battery.capacity, timestamp=0)
                self.rainflow.append(event.new_soc)
        elif isinstance(event, EmergencyOverrideEngaged):
            self.emergency_active = True
            self.emergency_reason = event.reason
            self.emergency_operator = event.operator_id
        elif isinstance(event, EmergencyOverrideReleased):
            self.emergency_active = False
            self.emergency_reason = ""
            self.emergency_operator = ""
        elif isinstance(event, ManualInjectionEvent):
            self.manual_injections[event.bus_id] = event.mw
        elif isinstance(event, GridResetEvent):
            self.manual_injections.clear()
            self.emergency_active = False
            self.emergency_reason = ""
            self.emergency_operator = ""


def replay(events: List[Event]) -> EngineState:
    """
    Rebuilds the engine state entirely from an event log.
    Proves determinism: replay(log) == live state.
    """
    state = EngineState()
    for e in events:
        state.apply(e)
    return state


class EventLog:
    """
    Append-only list of frozen Event dataclasses with monotonic sequence numbers.
    """
    def __init__(self):
        self.events: List[Event] = []
        self._seq = 0

    def next_seq(self) -> int:
        self._seq += 1
        return self._seq

    def append(self, event: Event):
        self.events.append(event)
        
    def get_events(self) -> List[Event]:
        return self.events.copy()
