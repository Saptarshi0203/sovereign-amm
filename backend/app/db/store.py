import json
import os
import pathlib
from typing import Dict, Any, Optional

DB_FILE = pathlib.Path(__file__).parent / "store.json"

class JSONStore:
    def __init__(self, file_path: pathlib.Path):
        self.file_path = file_path
        self._data = {"users": {}}
        self._load()

    def _load(self):
        if self.file_path.exists():
            with open(self.file_path, "r") as f:
                self._data = json.load(f)
        else:
            self._save()

    def _save(self):
        with open(self.file_path, "w") as f:
            json.dump(self._data, f, indent=4)

    # User operations
    def get_user(self, email: str) -> Optional[Dict[str, Any]]:
        return self._data["users"].get(email)

    def get_user_by_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        for user in self._data["users"].values():
            if user["id"] == user_id:
                return user
        return None

    def add_user(self, user: Dict[str, Any]):
        self._data["users"][user["email"]] = user
        self._save()

    def update_user(self, email: str, updates: Dict[str, Any]):
        if email in self._data["users"]:
            self._data["users"][email].update(updates)
            self._save()

    def list_users(self) -> list[Dict[str, Any]]:
        return list(self._data["users"].values())


store = JSONStore(DB_FILE)

# Initialize admin seed
if not store.get_user("admin@sovereign.amm"):
    from passlib.hash import argon2
    store.add_user({
        "id": "admin-000",
        "email": "admin@sovereign.amm",
        "password_hash": argon2.hash("admin123"),
        "role": "admin",
        "status": "approved",
        "consumer_no": "",
        "connection_type": "",
        "sanctioned_load_kw": 0,
        "solar_kwp": 0,
        "inverter_rating_kw": 0,
        "assigned_bus_id": None,
        "bank_account_masked": "XXXXXX0000"
    })
