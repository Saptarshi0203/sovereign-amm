import jwt
import os
import redis
from datetime import datetime, timedelta
from typing import Optional, List
from fastapi import HTTPException, Security, Cookie
from passlib.hash import argon2
from backend.app.db.store import store

SECRET_KEY = os.getenv("JWT_SECRET_KEY", "sovereign-amm-super-secret-key-for-hackathon")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 1 week

# Initialize Redis client with local fallback
_local_cache = {}
try:
    redis_client = redis.Redis(
        host=os.getenv("REDIS_HOST", "localhost"), 
        port=int(os.getenv("REDIS_PORT", 6379)), 
        decode_responses=True,
        socket_connect_timeout=1
    )
    redis_client.ping()
    HAS_REDIS = True
except (redis.ConnectionError, redis.exceptions.TimeoutError) as e:
    print(f"[WARNING] Redis not available ({e}). Falling back to local memory cache for auth.")
    HAS_REDIS = False

def check_blacklist(token: str) -> bool:
    if HAS_REDIS:
        try:
            return bool(redis_client.get(f"blacklist:{token}"))
        except:
            return token in _local_cache
    return token in _local_cache

def get_password_hash(password: str) -> str:
    return argon2.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return argon2.verify(plain_password, hashed_password)
    except Exception:
        return False

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def get_current_user(token: Optional[str] = Cookie(None)):
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
        
    # Check if token was blacklisted/revoked
    if check_blacklist(token):
        raise HTTPException(status_code=401, detail="Token has been revoked")

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
        
    user = store.get_user(email)
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
        
    if user["status"] != "approved":
        raise HTTPException(status_code=403, detail=f"Account access is strictly {user['status']}")
        
    return user

def require_role(roles: List[str]):
    def role_checker(user: dict = Security(get_current_user)):
        if user["role"] not in roles:
            raise HTTPException(status_code=403, detail="Insufficient admin clearances")
        return user
    return role_checker
