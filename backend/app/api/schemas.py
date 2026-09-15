from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class BookLevel(BaseModel):
    price: int
    cum_qty: int


class TimeAndSale(BaseModel):
    ts: int
    side: str
    price: int
    qty: int


class OrderBookSnapshot(BaseModel):
    grid_id: str
    ts: int
    spread: int
    micro_price: int
    book_depth: int
    obi: float = Field(..., ge=-1.0, le=1.0)
    bids: List[BookLevel]
    asks: List[BookLevel]
    tape: List[TimeAndSale]


class InjectRequest(BaseModel):
    bus_id: str
    injection_mw: float = Field(..., ge=-5.0, le=5.0)


class ParameterPatch(BaseModel):
    sigma: Optional[float] = Field(None, gt=0)
    gamma: Optional[float] = Field(None, gt=0)
    k: Optional[float] = Field(None, gt=0)
    A: Optional[float] = Field(None, gt=0)
    soc_floor_pct: Optional[float] = Field(None, ge=0, le=100)
    soc_ceiling_pct: Optional[float] = Field(None, ge=0, le=100)
    load_multiplier: Optional[float] = Field(None, ge=0, le=20)
    sunlight_multiplier: Optional[float] = Field(None, ge=0, le=20)


class TickRow(BaseModel):
    ts: int
    micro_price: float = Field(..., description="INR/kWh (float) or micro-INR (int > 1000)")
    soc_pct: float = Field(..., ge=0, le=100)
    sigma: float = 0.5
    c_deg: float = 0.0


class OrderRow(BaseModel):
    trader_id: str = "custom"
    side: str = Field(..., pattern="^(BID|ASK|bid|ask|BUY|SELL|buy|sell)$")
    price: float = Field(..., gt=0, description="INR/kWh")
    volume: float = Field(..., gt=0, description="kWh")


class InjectionRow(BaseModel):
    bus_id: str
    injection_mw: float = Field(..., ge=-5.0, le=5.0)


class DatasetInjectRequest(BaseModel):
    """
    Custom dataset injection. Any combination of:
      - ticks:      historical rows written to SQLite (drives the 24H chart)
      - orders:     limit orders queued into the live L2 book
      - injections: per-bus MW overrides for the PTDF power flow
      - soc_pct:    force the battery state of charge
      - parameters: GLFT / simulator knobs
    """
    grid_id: str = "demo"
    ticks: List[TickRow] = []
    orders: List[OrderRow] = []
    injections: List[InjectionRow] = []
    soc_pct: Optional[float] = Field(None, ge=0, le=100)
    parameters: Optional[ParameterPatch] = None
    replace_history: bool = False
