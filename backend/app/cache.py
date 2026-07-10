from __future__ import annotations

import time
from collections import OrderedDict
from threading import RLock
from typing import Generic, TypeVar

K = TypeVar("K")
V = TypeVar("V")


class TTLCache(Generic[K, V]):
    def __init__(self, ttl_seconds: int, max_size: int = 256) -> None:
        self.ttl_seconds = ttl_seconds
        self.max_size = max_size
        self._items: OrderedDict[K, tuple[float, V]] = OrderedDict()
        self._lock = RLock()

    def get(self, key: K) -> V | None:
        now = time.monotonic()
        with self._lock:
            item = self._items.get(key)
            if not item:
                return None

            expires_at, value = item
            if expires_at <= now:
                self._items.pop(key, None)
                return None

            self._items.move_to_end(key)
            return value

    def set(self, key: K, value: V) -> None:
        expires_at = time.monotonic() + self.ttl_seconds
        with self._lock:
            self._items[key] = (expires_at, value)
            self._items.move_to_end(key)
            while len(self._items) > self.max_size:
                self._items.popitem(last=False)

    def delete_prefix(self, prefix: tuple[object, ...]) -> None:
        with self._lock:
            for key in list(self._items):
                if isinstance(key, tuple) and key[: len(prefix)] == prefix:
                    self._items.pop(key, None)

    def clear(self) -> None:
        with self._lock:
            self._items.clear()


response_cache: TTLCache[tuple[object, ...], object] = TTLCache(
    ttl_seconds=60, max_size=512
)
ai_cache: TTLCache[tuple[object, ...], str] = TTLCache(ttl_seconds=300, max_size=128)


def invalidate_user_cache(user_id: object) -> None:
    response_cache.delete_prefix(("dashboard", str(user_id)))
    response_cache.delete_prefix(("report", str(user_id)))
