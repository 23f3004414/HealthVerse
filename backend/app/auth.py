import os
from datetime import datetime, timedelta
import jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import asyncpg
from app.db import get_db

SECRET_KEY = os.getenv("JWT_SECRET", "supersecretkeyhealthverse123!")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 120

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict, expires_delta: timedelta = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def decode_access_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security), conn: asyncpg.Connection = Depends(get_db)) -> dict:
    token = credentials.credentials
    payload = decode_access_token(token)
    email: str = payload.get("sub")
    user_id: int = payload.get("id")
    role: str = payload.get("role")
    
    if email is None or user_id is None or role is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token claims",
        )
    
    # Query database to check if user still exists
    if role == "patient":
        user = await conn.fetchrow("SELECT id, email, full_name FROM patients WHERE id = $1 AND email = $2", user_id, email)
    elif role == "doctor":
        user = await conn.fetchrow("SELECT id, email, full_name, specialty FROM doctors WHERE id = $1 AND email = $2", user_id, email)
    else:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user role in token",
        )
        
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )
        
    user_dict = dict(user)
    user_dict["role"] = role
    return user_dict

async def get_current_patient(current_user: dict = Depends(get_current_user)) -> dict:
    if current_user.get("role") != "patient":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: Patients only",
        )
    return current_user

async def get_current_doctor(current_user: dict = Depends(get_current_user)) -> dict:
    if current_user.get("role") != "doctor":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: Doctors only",
        )
    return current_user
