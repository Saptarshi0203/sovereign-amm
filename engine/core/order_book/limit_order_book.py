import heapq
import uuid
import time
from collections import defaultdict
from typing import List, Dict, Set, Optional, Callable

from engine.types import (
    Order, Side, OrderType, Event, 
    OrderPlaced, OrderCancelled, TradeExecuted, TradeRejected, Fill
)


class LimitOrderBook:
    """
    Price-time priority L2 limit order book.
    Pure projection: all mutations are driven by applying Event dataclasses.

    Args:
        trade_screener: Optional callback (maker_order, taker_order, fill_volume) -> bool.
                        Returns True if the trade is physically safe, False if congested.
                        When None, all trades are accepted (no grid constraints).
    """
    def __init__(self, trade_screener: Optional[Callable] = None):
        self.bids: List[tuple] = []  # max-heap: (-price, timestamp, order_id)
        self.asks: List[tuple] = []  # min-heap: (price, timestamp, order_id)
        
        self.orders: Dict[str, Order] = {}
        self.remaining_volume: Dict[str, int] = {}
        self.cancelled_ids: Set[str] = set()
        
        self.bid_levels: Dict[int, int] = defaultdict(int)
        self.ask_levels: Dict[int, int] = defaultdict(int)
        self.trade_screener = trade_screener

    def _clean_heap(self, heap: List[tuple], is_bid: bool):
        """Lazily removes cancelled or fully filled orders from the top of the heap."""
        while heap:
            order_id = heap[0][2]
            if order_id in self.cancelled_ids or self.remaining_volume.get(order_id, 0) == 0:
                heapq.heappop(heap)
            else:
                break

    def best_bid(self) -> Optional[int]:
        self._clean_heap(self.bids, True)
        return -self.bids[0][0] if self.bids else None

    def best_ask(self) -> Optional[int]:
        self._clean_heap(self.asks, False)
        return self.asks[0][0] if self.asks else None

    def micro_price(self) -> float:
        """
        micro = (P_bid * V_ask + P_ask * V_bid) / (V_bid + V_ask)
        """
        bid = self.best_bid()
        ask = self.best_ask()
        if bid is None or ask is None:
            return float('nan')
            
        v_bid = self.bid_levels[bid]
        v_ask = self.ask_levels[ask]
        
        if v_bid + v_ask == 0:
            return float('nan')
            
        return (bid * v_ask + ask * v_bid) / (v_bid + v_ask)

    def process_order(self, order: Order, next_seq: Callable[[], int]) -> List[Event]:
        """
        Matches an incoming order against the book.
        Emits events and applies them immediately to reflect state for subsequent matches.
        """
        events: List[Event] = []
        rem_vol = order.volume
        
        is_bid = (order.side == Side.BID)
        target_heap = self.asks if is_bid else self.bids
        
        while rem_vol > 0:
            self._clean_heap(target_heap, not is_bid)
            if not target_heap:
                break
                
            best_tuple = target_heap[0]
            best_price = -best_tuple[0] if not is_bid else best_tuple[0]
            
            # Check price limit
            if is_bid and order.price < best_price:
                break
            if not is_bid and order.price > best_price:
                break
                
            maker_id = best_tuple[2]
            maker_vol = self.remaining_volume[maker_id]
            fill_vol = min(rem_vol, maker_vol)
            
            # PTDF screening: check if this fill would congest a line
            if self.trade_screener is not None:
                maker_order = self.orders[maker_id]
                is_safe = self.trade_screener(maker_order, order, fill_vol)
                if not is_safe:
                    # Emit rejection event, skip this maker, try the next level
                    reject_event = TradeRejected(
                        next_seq(), maker_id, order.order_id,
                        reason="PTDF congestion: line limit exceeded"
                    )
                    events.append(reject_event)
                    # Pop the congested maker off the heap so we don't loop forever
                    heapq.heappop(target_heap)
                    continue
            
            fill = Fill(
                fill_id=str(uuid.uuid4()),
                maker_order_id=maker_id,
                taker_order_id=order.order_id,
                price=best_price,
                volume=fill_vol,
                timestamp=int(time.time() * 1000)
            )
            
            event = TradeExecuted(next_seq(), fill)
            events.append(event)
            self.apply(event)
            rem_vol -= fill_vol
            
        if rem_vol > 0 and order.type == OrderType.LIMIT:
            rem_order = Order(
                order_id=order.order_id,
                trader_id=order.trader_id,
                side=order.side,
                type=order.type,
                price=order.price,
                volume=rem_vol,
                timestamp=order.timestamp
            )
            place_event = OrderPlaced(next_seq(), rem_order)
            events.append(place_event)
            self.apply(place_event)
            
        return events

    def cancel_order(self, order_id: str, next_seq: Callable[[], int]) -> Optional[Event]:
        if order_id in self.orders and order_id not in self.cancelled_ids and self.remaining_volume.get(order_id, 0) > 0:
            event = OrderCancelled(next_seq(), order_id)
            self.apply(event)
            return event
        return None

    def apply(self, event: Event):
        """Reducer: applies an event to mutate the projection."""
        if isinstance(event, OrderPlaced):
            self._apply_order_placed(event)
        elif isinstance(event, OrderCancelled):
            self._apply_order_cancelled(event)
        elif isinstance(event, TradeExecuted):
            self._apply_trade_executed(event)

    def _apply_order_placed(self, event: OrderPlaced):
        order = event.order
        self.orders[order.order_id] = order
        self.remaining_volume[order.order_id] = order.volume
        
        if order.side == Side.BID:
            heapq.heappush(self.bids, (-order.price, order.timestamp, order.order_id))
            self.bid_levels[order.price] += order.volume
        else:
            heapq.heappush(self.asks, (order.price, order.timestamp, order.order_id))
            self.ask_levels[order.price] += order.volume

    def _apply_order_cancelled(self, event: OrderCancelled):
        order_id = event.order_id
        if order_id in self.orders and order_id not in self.cancelled_ids:
            order = self.orders[order_id]
            rem_vol = self.remaining_volume.get(order_id, 0)
            if rem_vol > 0:
                if order.side == Side.BID:
                    self.bid_levels[order.price] -= rem_vol
                    if self.bid_levels[order.price] <= 0:
                        del self.bid_levels[order.price]
                else:
                    self.ask_levels[order.price] -= rem_vol
                    if self.ask_levels[order.price] <= 0:
                        del self.ask_levels[order.price]
            self.cancelled_ids.add(order_id)
            self.remaining_volume[order_id] = 0

    def _apply_trade_executed(self, event: TradeExecuted):
        fill = event.fill
        maker_id = fill.maker_order_id
        
        if maker_id in self.orders:
            maker_order = self.orders[maker_id]
            self.remaining_volume[maker_id] -= fill.volume
            
            if maker_order.side == Side.BID:
                self.bid_levels[maker_order.price] -= fill.volume
                if self.bid_levels[maker_order.price] <= 0:
                    del self.bid_levels[maker_order.price]
            else:
                self.ask_levels[maker_order.price] -= fill.volume
                if self.ask_levels[maker_order.price] <= 0:
                    del self.ask_levels[maker_order.price]
