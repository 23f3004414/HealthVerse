from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
import asyncpg
from datetime import date
from app.db import get_db
from app.auth import get_current_user, get_current_doctor
from app.models.schemas import SlotCreate, SlotResponse

router = APIRouter(prefix="/doctors", tags=["doctors"])

@router.get("", response_model=List[dict])
async def list_doctors(
    current_user: dict = Depends(get_current_user),
    conn: asyncpg.Connection = Depends(get_db)
):
    """List all registered doctors and their specialties."""
    rows = await conn.fetch("SELECT id, email, full_name, specialty FROM doctors ORDER BY full_name")
    return [dict(row) for row in rows]

@router.post("/slots", response_model=SlotResponse, status_code=status.HTTP_201_CREATED)
async def create_availability_slot(
    slot_data: SlotCreate,
    current_doctor: dict = Depends(get_current_doctor),
    conn: asyncpg.Connection = Depends(get_db)
):
    """Add a new availability slot for the logged-in doctor."""
    doctor_id = current_doctor["id"]
    
    # Validation: start_time must be before end_time
    if slot_data.start_time >= slot_data.end_time:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Start time must be before end time"
        )
    
    # Check if slot conflicts/overlaps
    existing_slot = await conn.fetchrow(
        "SELECT id FROM availability_slots WHERE doctor_id = $1 AND slot_date = $2 AND start_time = $3 AND end_time = $4",
        doctor_id, slot_data.slot_date, slot_data.start_time, slot_data.end_time
    )
    if existing_slot:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This slot already exists"
        )
        
    try:
        row = await conn.fetchrow(
            """
            INSERT INTO availability_slots (doctor_id, slot_date, start_time, end_time, is_booked)
            VALUES ($1, $2, $3, $4, FALSE)
            RETURNING id, doctor_id, slot_date, start_time, end_time, is_booked
            """,
            doctor_id, slot_data.slot_date, slot_data.start_time, slot_data.end_time
        )
        return dict(row)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )

@router.get("/slots", response_model=List[SlotResponse])
async def list_own_slots(
    current_doctor: dict = Depends(get_current_doctor),
    conn: asyncpg.Connection = Depends(get_db)
):
    """List all availability slots for the logged-in doctor."""
    rows = await conn.fetch(
        "SELECT id, doctor_id, slot_date, start_time, end_time, is_booked FROM availability_slots WHERE doctor_id = $1 ORDER BY slot_date, start_time",
        current_doctor["id"]
    )
    return [dict(row) for row in rows]

@router.get("/{doctor_id}/slots", response_model=List[SlotResponse])
async def list_doctor_slots(
    doctor_id: int,
    available_only: bool = True,
    current_user: dict = Depends(get_current_user),
    conn: asyncpg.Connection = Depends(get_db)
):
    """List availability slots of a specific doctor (available_only=True filters for open slots)."""
    # Verify doctor exists
    doctor = await conn.fetchrow("SELECT id FROM doctors WHERE id = $1", doctor_id)
    if not doctor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Doctor not found"
        )
        
    query = "SELECT id, doctor_id, slot_date, start_time, end_time, is_booked FROM availability_slots WHERE doctor_id = $1"
    if available_only:
        query += " AND is_booked = FALSE"
    query += " ORDER BY slot_date, start_time"
    
    rows = await conn.fetch(query, doctor_id)
    return [dict(row) for row in rows]
