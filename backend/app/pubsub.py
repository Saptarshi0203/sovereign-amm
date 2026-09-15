import os
import json
import asyncio
import redis.asyncio as aioredis
from typing import Callable, Dict, Any, Set

REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))

class RedisPubSubManager:
    """
    Production Redis Pub/Sub manager for streaming engine snapshots across horizontally scaled API gateway nodes.
    Includes local event emitter fallback if Redis is unavailable.
    """
    def __init__(self):
        self.redis_url = f"redis://{REDIS_HOST}:{REDIS_PORT}"
        self._redis = None
        self._subscribers: Dict[str, Set[Callable[[Dict[str, Any]], None]]] = {}
        self._connected = False

    async def connect(self):
        try:
            self._redis = aioredis.from_url(self.redis_url, decode_responses=True)
            await self._redis.ping()
            self._connected = True
            print(f"[PUBSUB] Connected to Redis at {self.redis_url}")
        except Exception as e:
            print(f"[PUBSUB WARNING] Redis Pub/Sub unavailable ({e}). Using local in-memory fan-out.")
            self._connected = False

    async def publish(self, channel: str, message: Dict[str, Any]):
        if self._connected and self._redis:
            try:
                payload = json.dumps(message)
                await self._redis.publish(channel, payload)
                return
            except Exception as e:
                print(f"[PUBSUB ERROR] Redis publish failed: {e}")

        # Local fallback fan-out
        if channel in self._subscribers:
            for callback in list(self._subscribers[channel]):
                try:
                    if asyncio.iscoroutinefunction(callback):
                        await callback(message)
                    else:
                        callback(message)
                except Exception:
                    pass

    async def subscribe(self, channel: str, callback: Callable[[Dict[str, Any]], None]):
        if channel not in self._subscribers:
            self._subscribers[channel] = set()
        self._subscribers[channel].add(callback)

        if self._connected and self._redis:
            async def _listen_loop():
                pubsub = self._redis.pubsub()
                await pubsub.subscribe(channel)
                async for msg in pubsub.listen():
                    if msg and msg["type"] == "message":
                        try:
                            data = json.loads(msg["data"])
                            if asyncio.iscoroutinefunction(callback):
                                await callback(data)
                            else:
                                callback(data)
                        except Exception:
                            pass

            asyncio.create_task(_listen_loop())

    async def unsubscribe(self, channel: str, callback: Callable[[Dict[str, Any]], None]):
        if channel in self._subscribers:
            self._subscribers[channel].discard(callback)

pubsub_manager = RedisPubSubManager()
