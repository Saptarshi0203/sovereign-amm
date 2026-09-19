"""
Shared fixtures for the API suites: an isolated temp SQLite database and
JWTs for an admin account and a regular paper-trading account.
"""
import os
import tempfile

import pytest

if "DATABASE_PATH" not in os.environ:
    os.environ["DATABASE_PATH"] = os.path.join(tempfile.mkdtemp(prefix="sovereign-test-"), "test.db")
os.environ.setdefault("PUBLIC_DEMO", "true")
os.environ.setdefault("ADMIN_EMAILS", "admin@test.local")


def _mint(email: str, role: str) -> dict:
    from backend.app.core.auth import create_access_token, token_claims
    from backend.app.db.store import store

    user = store.get_user(email) or store.add_user({"email": email, "role": role, "status": "approved", "name": email.split("@")[0]})
    return {"Authorization": f"Bearer {create_access_token(token_claims(user))}"}


@pytest.fixture(scope="session")
def admin_headers():
    return _mint("admin@test.local", "admin")


@pytest.fixture(scope="session")
def user_headers():
    return _mint("household@test.local", "user")
