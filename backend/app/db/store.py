"""
Lightweight JSON-backed user store (no external database required).
"""
import json
import pathlib
import threading
from typing import Any, Dict, List, Optional

DB_FILE = pathlib.Path(__file__).parent / "store.json"


class JsonUserStore:
    def __init__(self, path: pathlib.Path = DB_FILE):
        self.file_path = path
        self._lock = threading.Lock()
        self._data: Dict[str, Any] = {"users": {}}
        self._load()

    def _load(self) -> None:
        if self.file_path.exists():
            try:
                with open(self.file_path, "r") as f:
                    self._data = json.load(f)
            except (json.JSONDecodeError, OSError):
                self._data = {"users": {}}
        self._data.setdefault("users", {})

    def _save(self) -> None:
        try:
            with open(self.file_path, "w") as f:
                json.dump(self._data, f, indent=2)
        except OSError as e:
            print(f"[STORE] could not persist users: {e}")

    def get_user(self, email: str) -> Optional[Dict[str, Any]]:
        with self._lock:
            u = self._data["users"].get(email)
            return dict(u) if u else None

    def get_user_by_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        with self._lock:
            for u in self._data["users"].values():
                if u.get("id") == user_id:
                    return dict(u)
        return None

    def add_user(self, user: Dict[str, Any]) -> None:
        with self._lock:
            self._data["users"][user["email"]] = dict(user)
            self._save()

    def update_user(self, email: str, patch: Dict[str, Any]) -> None:
        with self._lock:
            if email in self._data["users"]:
                self._data["users"][email].update(patch)
                self._save()

    def list_users(self) -> List[Dict[str, Any]]:
        with self._lock:
            return [dict(u) for u in self._data["users"].values()]


store = JsonUserStore()
