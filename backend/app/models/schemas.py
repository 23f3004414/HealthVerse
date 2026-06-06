from pydantic import BaseModel, EmailStr, Field
from datetime import date, time
from typing import Optional, List

# --- Auth Schemas ---

class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6, description="Password must be at least 6 characters")
    full_name: str = Field(..., min_length=2, description="Name must be at least 2 characters")

class DoctorRegister(UserRegister):
    specialty: str = Field(..., min_length=2, description="Specialty description required")

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    user_id: int
    full_name: str
    specialty: Optional[str] = None


# --- Availability Slots Schemas ---

class SlotCreate(BaseModel):
    slot_date: date
    start_time: time
    end_time: time

class SlotResponse(BaseModel):
    id: int
    doctor_id: int
    slot_date: date
    start_time: time
    end_time: time
    is_booked: bool

    class Config:
        from_attributes = True


# --- Appointment Schemas ---

class AppointmentBookRequest(BaseModel):
    slot_id: int

class AppointmentStatusUpdate(BaseModel):
    status: str = Field(..., pattern="^(confirmed|cancelled)$")

class AppointmentResponse(BaseModel):
    id: int
    patient_id: int
    patient_name: str
    doctor_id: int
    doctor_name: str
    specialty: str
    slot_id: int
    appointment_date: date
    start_time: time
    end_time: time
    status: str

    class Config:
        from_attributes = True
