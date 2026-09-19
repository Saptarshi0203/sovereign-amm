"""
Active-record `User` model over the SQLite `users` table.

Columns (see backend/app/db/store.py for the DDL):
    id, google_id, email, name, picture, role ('user' | 'admin' | …),
    wallet_balance (default 100,000.0 INR), created_at (ms) + the
    paper-trading account columns (energy_inventory_kwh, avg_cost_inr, …).

Usage:
    user = User.upsert_from_google(idinfo)      # login / signup in one call
    user.role, user.wallet_balance, user.to_public()
"""
from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from typing import Any, Dict, Optional

from backend.app.core.config import settings
from backend.app.db.store import DEFAULT_WALLET_INR, store

PUBLIC_FIELDS = (
    "id", "google_id", "email", "name", "picture", "role", "status", "wallet_balance",
    "energy_inventory_kwh", "avg_cost_inr", "realized_pnl_inr", "savings_inr", "grid_id", "created_at", "area_code",
)


def is_admin_email(email: str) -> bool:
    """Admin override: e-mails listed in ADMIN_EMAILS (see core/config.py) get role=admin."""
    return email.strip().lower() in settings.admin_emails


@dataclass
class User:
    id: str
    email: str
    google_id: Optional[str] = None
    name: str = ""
    picture: str = ""
    role: str = "user"
    status: str = "approved"
    wallet_balance: float = DEFAULT_WALLET_INR
    created_at: int = 0
    grid_id: str = settings.DEMO_GRID_ID
    area_code: Optional[str] = None
    raw: Dict[str, Any] = field(default_factory=dict, repr=False)

    # ── construction ───────────────────────────────────────────────────

    @classmethod
    def from_row(cls, row: Dict[str, Any]) -> "User":
        return cls(
            id=row["id"],
            email=row["email"],
            google_id=row.get("google_id"),
            name=row.get("name") or "",
            picture=row.get("picture") or "",
            role=_effective_role(row["email"], row.get("role")),
            status=row.get("status") or "approved",
            wallet_balance=float(row.get("wallet_balance") or 0.0),
            created_at=int(row.get("created_at") or 0),
            grid_id=row.get("grid_id") or settings.DEMO_GRID_ID,
            area_code=row.get("area_code"),
            raw=row,
        )

    @classmethod
    def get_by_email(cls, email: str) -> Optional["User"]:
        row = store.get_user(email)
        return cls.from_row(row) if row else None

    @classmethod
    def get_by_id(cls, user_id: str) -> Optional["User"]:
        row = store.get_user_by_id(user_id)
        return cls.from_row(row) if row else None

    @classmethod
    def upsert_from_google(cls, idinfo: Dict[str, Any]) -> "User":
        """
        Login-or-signup from a verified Google ID token payload.

        Existing e-mail → fetch (and refresh google_id / name / picture).
        New e-mail      → create with the ₹100,000 paper-trading wallet.
        Admin e-mails   → role = 'admin' (checked on every login so the
                          allow-list can change without touching the DB).
        """
        email = str(idinfo["email"]).strip().lower()
        google_id = str(idinfo.get("sub") or "")
        name = str(idinfo.get("name") or "")
        picture = str(idinfo.get("picture") or "")
        role = "admin" if is_admin_email(email) else "user"

        row = store.get_user(email)
        if row is None:
            row = store.add_user(
                {
                    "id": f"user-{uuid.uuid4().hex[:8]}",
                    "google_id": google_id,
                    "email": email,
                    "name": name,
                    "picture": picture,
                    "role": role,
                    "status": "approved",
                    "wallet_balance": DEFAULT_WALLET_INR,
                    "consumer_no": "GOOGLE-AUTH",
                    "grid_id": settings.DEMO_GRID_ID,
                }
            )
        else:
            patch: Dict[str, Any] = {}
            if google_id and row.get("google_id") != google_id:
                patch["google_id"] = google_id
            if name and row.get("name") != name:
                patch["name"] = name
            if picture and row.get("picture") != picture:
                patch["picture"] = picture
            if row.get("status") != "approved":
                patch["status"] = "approved"
            if role == "admin" and row.get("role") != "admin":
                patch["role"] = "admin"
            if patch:
                store.update_user(email, patch)
                row = store.get_user(email) or row
        return cls.from_row(row)

    # ── views ──────────────────────────────────────────────────────────

    def jwt_claims(self) -> Dict[str, Any]:
        """Standard claims embedded in the access token."""
        return {
            "sub": self.email,
            "uid": self.id,
            "role": self.role,
            "name": self.name,
            "wallet_balance": round(self.wallet_balance, 2),
            "grid_id": self.grid_id,
            "area_code": self.area_code,
        }

    def to_public(self) -> Dict[str, Any]:
        """Safe payload for the frontend (no password hash)."""
        out = {k: self.raw.get(k) for k in PUBLIC_FIELDS if k in self.raw}
        out.update(
            {
                "id": self.id,
                "email": self.email,
                "google_id": self.google_id,
                "name": self.name,
                "picture": self.picture,
                "role": self.role,
                "status": self.status,
                "wallet_balance": round(self.wallet_balance, 2),
                "wallet_balance_inr": round(self.wallet_balance, 2),
                "created_at": self.created_at,
                "grid_id": self.grid_id,
                "area_code": self.area_code,
            }
        )
        return out


def _effective_role(email: str, stored: Optional[str]) -> str:
    if is_admin_email(email):
        return "admin"
    if stored in (None, "", "market_participant"):
        return "user"
    return stored
