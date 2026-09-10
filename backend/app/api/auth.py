from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel
from typing import Optional, Dict, Any
import uuid
import os
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

from backend.app.core.auth import (
    get_password_hash,
    verify_password,
    create_access_token,
    get_current_user
)
from backend.app.db.store import store

router = APIRouter(prefix="/api/auth", tags=["auth"])

class SignupRequest(BaseModel):
    email: str
    password: str
    consumer_no: str
    connection_type: str
    sanctioned_load_kw: float
    solar_kwp: float
    inverter_rating_kw: float

class LoginRequest(BaseModel):
    email: str
    password: str

class GoogleLoginRequest(BaseModel):
    token: str

@router.post("/signup", status_code=status.HTTP_201_CREATED)
def signup(req: SignupRequest):
    if store.get_user(req.email):
        raise HTTPException(status_code=400, detail="Email already registered")
        
    user_id = f"user-{uuid.uuid4().hex[:8]}"
    
    new_user = {
        "id": user_id,
        "email": req.email,
        "password_hash": get_password_hash(req.password),
        "role": "market_participant",
        "status": "pending",
        "consumer_no": req.consumer_no,
        "connection_type": req.connection_type,
        "sanctioned_load_kw": req.sanctioned_load_kw,
        "solar_kwp": req.solar_kwp,
        "inverter_rating_kw": req.inverter_rating_kw,
        "assigned_bus_id": None,
        "bank_account_masked": "XXXXXX4821" # Mocked for settlement feature
    }
    
    store.add_user(new_user)
    return {"message": "Signup successful. Waiting for admin approval."}

@router.post("/login")
def login(req: LoginRequest, response: Response):
    user = store.get_user(req.email)
    if not user or not verify_password(req.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
        
    if user["status"] != "approved":
        raise HTTPException(status_code=403, detail=f"Account is {user['status']}")
        
    access_token = create_access_token(data={"sub": user["email"]})
    
    import os
    is_prod = os.getenv("ENVIRONMENT", "development").lower() == "production"
    
    # Set httpOnly cookie with strict security controls
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        samesite="strict" if is_prod else "lax",
        secure=is_prod,
        max_age=60 * 24 * 7 * 60 # 1 week in seconds
    )
    
    return {"message": "Login successful"}

@router.post("/logout")
def logout(response: Response):
    response.delete_cookie("access_token")
    return {"message": "Logged out"}

@router.post("/google")
def google_login(req: GoogleLoginRequest, response: Response):
    try:
        # Verify the token
        client_id = os.getenv("GOOGLE_CLIENT_ID")
        idinfo = id_token.verify_oauth2_token(req.token, google_requests.Request(), client_id)
        email = idinfo.get("email")
        if not email:
            raise HTTPException(status_code=400, detail="Token has no email")
            
        user = store.get_user(email)
        if not user:
            user_id = f"user-{uuid.uuid4().hex[:8]}"
            user = {
                "id": user_id,
                "email": email,
                "password_hash": get_password_hash(uuid.uuid4().hex),
                "role": "market_participant",
                "status": "approved",
                "consumer_no": "GOOGLE-AUTH",
                "connection_type": "residential",
                "sanctioned_load_kw": 5.0,
                "solar_kwp": 0.0,
                "inverter_rating_kw": 0.0,
                "assigned_bus_id": None,
                "bank_account_masked": "XXXXXX0000",
                "grid_id": "default_grid"
            }
            store.add_user(user)
            
        # Create token with grid_id
        access_token = create_access_token(data={
            "sub": user["email"],
            "grid_id": user.get("grid_id", "default_grid")
        })
        
        is_prod = os.getenv("ENVIRONMENT", "development").lower() == "production"
        
        response.set_cookie(
            key="access_token",
            value=access_token,
            httponly=True,
            samesite="strict" if is_prod else "lax",
            secure=is_prod,
            max_age=60 * 24 * 7 * 60
        )
        
        return {"message": "Login successful", "access_token": access_token}
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid Google token")

@router.get("/me")
def get_me(current_user: Dict[str, Any] = Depends(get_current_user)):
    user_copy = current_user.copy()
    user_copy.pop("password_hash", None)
    return user_copy
