import pytest
import math
import uuid
from hypothesis import given, settings
import hypothesis.strategies as st

from engine.types import Order, Side, OrderType, TradeExecuted
from engine.core.order_book.limit_order_book import LimitOrderBook


@st.composite
def order_strategy(draw):
    side = draw(st.sampled_from(Side))
    price = draw(st.integers(min_value=1, max_value=1000))
    volume = draw(st.integers(min_value=1, max_value=100))
    return Order(
        order_id=str(uuid.uuid4()),
        trader_id="trader",
        side=side,
        type=OrderType.LIMIT,
        price=price,
        volume=volume,
        timestamp=1000
    )


@given(st.lists(order_strategy(), min_size=1, max_size=500))
@settings(max_examples=50)
def test_property_lob(orders):
    lob = LimitOrderBook()
    seq = 1
    def get_seq():
        nonlocal seq
        seq += 1
        return seq

    total_in_volume = sum(o.volume for o in orders)
    total_traded_volume = 0

    for order in orders:
        events = lob.process_order(order, get_seq)
        for e in events:
            if isinstance(e, TradeExecuted):
                total_traded_volume += e.fill.volume
        
    bid = lob.best_bid()
    ask = lob.best_ask()
    
    if bid is not None and ask is not None:
        assert bid < ask, f"Crossed book: bid {bid} >= ask {ask}"
        
    resting_bids = sum(lob.bid_levels.values())
    resting_asks = sum(lob.ask_levels.values())
    
    # Volume conservation:
    # Total incoming volume goes either into resting volume or gets matched (which consumes 2 units of volume per 1 unit traded: 1 incoming, 1 resting)
    # Wait, 1 incoming + 1 resting = 2 total volume. So 1 traded volume consumes 2 total volume.
    # Therefore: total_in_volume = resting_bids + resting_asks + 2 * total_traded_volume
    assert total_in_volume == resting_bids + resting_asks + 2 * total_traded_volume, "Volume is not conserved"


def test_partial_fill():
    lob = LimitOrderBook()
    seq = 1
    def get_seq():
        nonlocal seq
        seq += 1
        return seq

    # Place asks at 100, 110, 120
    o1 = Order("1", "T1", Side.ASK, OrderType.LIMIT, 100, 10, 1)
    o2 = Order("2", "T1", Side.ASK, OrderType.LIMIT, 110, 10, 2)
    o3 = Order("3", "T1", Side.ASK, OrderType.LIMIT, 120, 10, 3)
    
    lob.process_order(o1, get_seq)
    lob.process_order(o2, get_seq)
    lob.process_order(o3, get_seq)
    
    assert lob.best_ask() == 100
    
    # Sweeping bid: takes all 100, all 110, and 5 of 120
    b1 = Order("4", "T2", Side.BID, OrderType.LIMIT, 130, 25, 4)
    lob.process_order(b1, get_seq)
    
    assert lob.best_ask() == 120
    assert lob.ask_levels[120] == 5
    assert lob.best_bid() is None


def test_empty_book_and_single_side():
    lob = LimitOrderBook()
    seq = 1
    def get_seq(): return 1
    
    assert lob.best_bid() is None
    assert lob.best_ask() is None
    assert math.isnan(lob.micro_price())
    
    o1 = Order("1", "T1", Side.BID, OrderType.LIMIT, 100, 10, 1)
    lob.process_order(o1, get_seq)
    
    assert lob.best_bid() == 100
    assert lob.best_ask() is None
    assert math.isnan(lob.micro_price())
