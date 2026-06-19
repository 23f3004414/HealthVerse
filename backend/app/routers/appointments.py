from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from typing import List, Any
import logging
import asyncpg
from app.db import get_db, transaction, pool
from app.auth import get_current_user, get_current_patient, get_current_doctor
from app.models.schemas import AppointmentBookRequest, AppointmentStatusUpdate, AppointmentResponse
from app.tasks import send_confirmation_email
from app.websocket import manager

router = APIRouter(prefix="/appointments", tags=["appointments"])
logger = logging.getLogger(__name__)

@router.post("", response_model=dict, status_code=status.HTTP_201_CREATED)
async def book_appointment(
    request: AppointmentBookRequest,
    background_tasks: BackgroundTasks,
    current_patient: dict = Depends(get_current_patient),
    conn: Any = Depends(get_db)
):
    """
    Book an appointment. Handles concurrency using PostgreSQL Row-Level Locking (SELECT FOR UPDATE) / SQLite transaction wrapper.
    """
    patient_id = current_patient["id"]
    patient_email = current_patient["email"]
    patient_name = current_patient["full_name"]
    slot_id = request.slot_id

    async with transaction() as transaction_conn:
        # 1. Acquire row-level lock on the availability slot
        slot = await transaction_conn.fetchrow(
            "SELECT id, doctor_id, slot_date, start_time, end_time, is_booked FROM availability_slots WHERE id = $1 FOR UPDATE",
            slot_id
        )
        
        if not slot:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Availability slot not found"
            )
            
        if slot["is_booked"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This slot has already been booked by another patient"
            )

        # 2. Get Doctor Info for email and responses
        doctor = await transaction_conn.fetchrow(
            "SELECT full_name, email FROM doctors WHERE id = $1",
            slot["doctor_id"]
        )
        if not doctor:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Doctor associated with this slot not found"
            )

        # 3. Mark the slot as booked
        await transaction_conn.execute(
            "UPDATE availability_slots SET is_booked = TRUE WHERE id = $1",
            slot_id
        )

        # 4. Insert the new appointment record
        appointment_id = await transaction_conn.fetchval(
            """
            INSERT INTO appointments (patient_id, doctor_id, slot_id, appointment_date, status)
            VALUES ($1, $2, $3, $4, 'pending')
            RETURNING id
            """,
            patient_id, slot["doctor_id"], slot_id, slot["slot_date"]
        )
        
        # Queue background task to send confirmation email
        background_tasks.add_task(
            send_confirmation_email,
            patient_email,
            patient_name,
            doctor["full_name"],
            str(slot["slot_date"]),
            str(slot["start_time"])
        )

        # Also notify the doctor in real-time via WebSocket if they are connected
        await manager.send_personal_message(
            {
                "type": "new_booking",
                "message": f"New appointment requested by {patient_name}",
                "appointment_id": appointment_id
            },
            role="doctor",
            user_id=slot["doctor_id"]
        )

        return {
            "message": "Appointment booked successfully",
            "appointment_id": appointment_id
        }

@router.get("", response_model=List[AppointmentResponse])
async def list_appointments(
    current_user: dict = Depends(get_current_user),
    conn: asyncpg.Connection = Depends(get_db)
):
    """
    List appointments. Patients see their own appointments, Doctors see their own appointments.
    """
    user_id = current_user["id"]
    role = current_user["role"]

    if role == "patient":
        rows = await conn.fetch(
            """
            SELECT a.id, a.patient_id, p.full_name as patient_name, a.doctor_id, d.full_name as doctor_name, d.specialty,
                   a.slot_id, a.appointment_date, s.start_time, s.end_time, a.status
            FROM appointments a
            JOIN patients p ON a.patient_id = p.id
            JOIN doctors d ON a.doctor_id = d.id
            JOIN availability_slots s ON a.slot_id = s.id
            WHERE a.patient_id = $1
            ORDER BY a.appointment_date, s.start_time
            """,
            user_id
        )
    else:  # doctor
        rows = await conn.fetch(
            """
            SELECT a.id, a.patient_id, p.full_name as patient_name, a.doctor_id, d.full_name as doctor_name, d.specialty,
                   a.slot_id, a.appointment_date, s.start_time, s.end_time, a.status
            FROM appointments a
            JOIN patients p ON a.patient_id = p.id
            JOIN doctors d ON a.doctor_id = d.id
            JOIN availability_slots s ON a.slot_id = s.id
            WHERE a.doctor_id = $1
            ORDER BY a.appointment_date, s.start_time
            """,
            user_id
        )

    return [dict(row) for row in rows]

@router.patch("/{appointment_id}/status", response_model=dict)
async def update_appointment_status(
    appointment_id: int,
    status_update: AppointmentStatusUpdate,
    current_doctor: dict = Depends(get_current_doctor),
    conn: Any = Depends(get_db)
):
    """
    Update appointment status (confirm or cancel). Access restricted to the assigned doctor.
    """
    doctor_id = current_doctor["id"]
    new_status = status_update.status

    async with transaction() as transaction_conn:
        # 1. Fetch the appointment to verify ownership
        appointment = await transaction_conn.fetchrow(
            "SELECT id, patient_id, slot_id, status FROM appointments WHERE id = $1 AND doctor_id = $2",
            appointment_id, doctor_id
        )
        
        if not appointment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Appointment not found or not assigned to this doctor"
            )

        # 2. Perform state updates
        if new_status == "cancelled":
            # Set status to cancelled
            await transaction_conn.execute(
                "UPDATE appointments SET status = 'cancelled' WHERE id = $1",
                appointment_id
            )
            # Release the slot availability
            await transaction_conn.execute(
                "UPDATE availability_slots SET is_booked = FALSE WHERE id = $1",
                appointment["slot_id"]
            )
        else:  # confirmed
            await transaction_conn.execute(
                "UPDATE appointments SET status = 'confirmed' WHERE id = $1",
                appointment_id
            )

        # 3. Broadcast real-time status update to the patient via WebSockets
        await manager.send_personal_message(
            {
                "type": "appointment_update",
                "appointment_id": appointment_id,
                "status": new_status,
                "message": f"Your appointment with Dr. {current_doctor['full_name']} has been {new_status}."
            },
            role="patient",
            user_id=appointment["patient_id"]
        )

        return {
            "message": f"Appointment status successfully updated to {new_status}",
            "appointment_id": appointment_id
        }
