from fastapi import APIRouter, Depends, HTTPException, status
import asyncpg
from app.db import get_db
from app.auth import hash_password, verify_password, create_access_token
from app.models.schemas import UserRegister, DoctorRegister, UserLogin, TokenResponse

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/register/patient", response_model=dict, status_code=status.HTTP_201_CREATED)
async def register_patient(patient_data: UserRegister, conn: asyncpg.Connection = Depends(get_db)):
    # Check if email exists in either patients or doctors table
    patient_exists = await conn.fetchrow("SELECT id FROM patients WHERE email = $1", patient_data.email)
    doctor_exists = await conn.fetchrow("SELECT id FROM doctors WHERE email = $1", patient_data.email)
    if patient_exists or doctor_exists:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    hashed_pwd = hash_password(patient_data.password)
    try:
        await conn.execute(
            "INSERT INTO patients (email, password_hash, full_name) VALUES ($1, $2, $3)",
            patient_data.email, hashed_pwd, patient_data.full_name
        )
        return {"message": "Patient registered successfully"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )

@router.post("/register/doctor", response_model=dict, status_code=status.HTTP_201_CREATED)
async def register_doctor(doctor_data: DoctorRegister, conn: asyncpg.Connection = Depends(get_db)):
    # Check if email exists in either patients or doctors table
    patient_exists = await conn.fetchrow("SELECT id FROM patients WHERE email = $1", doctor_data.email)
    doctor_exists = await conn.fetchrow("SELECT id FROM doctors WHERE email = $1", doctor_data.email)
    if patient_exists or doctor_exists:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    hashed_pwd = hash_password(doctor_data.password)
    try:
        await conn.execute(
            "INSERT INTO doctors (email, password_hash, full_name, specialty) VALUES ($1, $2, $3, $4)",
            doctor_data.email, hashed_pwd, doctor_data.full_name, doctor_data.specialty
        )
        return {"message": "Doctor registered successfully"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )

@router.post("/login", response_model=TokenResponse)
async def login(credentials: UserLogin, conn: asyncpg.Connection = Depends(get_db)):
    # 1. Search patients table
    user = await conn.fetchrow("SELECT id, email, password_hash, full_name FROM patients WHERE email = $1", credentials.email)
    role = "patient"
    specialty = None
    
    # 2. Search doctors table if not patient
    if not user:
        user = await conn.fetchrow("SELECT id, email, password_hash, full_name, specialty FROM doctors WHERE email = $1", credentials.email)
        role = "doctor"
        if user:
            specialty = user["specialty"]
            
    if not user or not verify_password(credentials.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Create token
    access_token = create_access_token(
        data={"sub": user["email"], "id": user["id"], "role": role}
    )
    
    return TokenResponse(
        access_token=access_token,
        role=role,
        user_id=user["id"],
        full_name=user["full_name"],
        specialty=specialty
    )
