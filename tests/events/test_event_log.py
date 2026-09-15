import pytest
import uuid
import random

from engine.types import Order, Side, OrderType, Event
from engine.core.order_book.limit_order_book import LimitOrderBook
from engine.events.event_log import EventLog, EngineState, replay

def test_replay_determinism():
    log = EventLog()
    live_lob = LimitOrderBook()
    
    # Generate random scenario
    for _ in range(100):
        side = random.choice([Side.BID, Side.ASK])
        price = random.randint(10, 20)
        vol = random.randint(1, 5)
        
        o = Order(
            order_id=str(uuid.uuid4()),
            trader_id="trader",
            side=side,
            type=OrderType.LIMIT,
            price=price,
            volume=vol,
            timestamp=1000
        )
        
        events = live_lob.process_order(o, log.next_seq)
        for e in events:
            log.append(e)
            
    # Now replay the log from scratch
    replayed_state = replay(log.get_events())
    
    # Check exact match
    assert live_lob.best_bid() == replayed_state.lob.best_bid()
    assert live_lob.best_ask() == replayed_state.lob.best_ask()
    
    assert dict(live_lob.bid_levels) == dict(replayed_state.lob.bid_levels)
    assert dict(live_lob.ask_levels) == dict(replayed_state.lob.ask_levels)
    assert live_lob.remaining_volume == replayed_state.lob.remaining_volume
    assert live_lob.cancelled_ids == replayed_state.lob.cancelled_ids
