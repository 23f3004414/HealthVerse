import asyncio
import pytest
from httpx import AsyncClient, ASGIAccessToken
from app.main import app
from app import db

# Use pytest-asyncio to run tests asynchronously
pytestmark = pytest.mark.asyncio

async def clean_database():
    async with db.pool.acquire() as conn:
        await conn.execute("TRUNCATE patients, doctors, availability_slots, appointments CASCADE;")

async def create_test_doctor(email, name, specialty):
    from app.auth import hash_password
    pwd = hash_password("password123")
    async with db.pool.acquire() as conn:
        return await conn.fetchval(
            "INSERT INTO doctors (email, password_hash, full_name, specialty) VALUES ($1, $2, $3, $4) RETURNING id",
            email, pwd, name, specialty
        )

async def create_test_patient(email, name):
    from app.auth import hash_password
    pwd = hash_password("password123")
    async with db.pool.acquire() as conn:
        return await conn.fetchval(
            "INSERT INTO patients (email, password_hash, full_name) VALUES ($1, $2, $3) RETURNING id",
            email, pwd, name
        )

async def create_test_slot(doctor_id, slot_date, start_time, end_time):
    async with db.pool.acquire() as conn:
        return await conn.fetchval(
            "INSERT INTO availability_slots (doctor_id, slot_date, start_time, end_time, is_booked) VALUES ($1, $2, $3, $4, FALSE) RETURNING id",
            doctor_id, slot_date, start_time, end_time
        )

async def test_auth_endpoints():
    await clean_database()
    
    async with AsyncClient(app=app, base_url="http://test") as ac:
        # Register Patient
        res = await ac.post("/auth/register/patient", json={
            "email": "test.patient@gmail.com",
            "password": "password123",
            "full_name": "Test Patient"
        })
        assert res.status_code == 201
        assert res.json()["message"] == "Patient registered successfully"

        # Register Doctor
        res = await ac.post("/auth/register/doctor", json={
            "email": "test.doctor@healthverse.com",
            "password": "password123",
            "full_name": "Test Doctor",
            "specialty": "Cardiology"
        })
        assert res.status_code == 201

        # Login Patient
        res = await ac.post("/auth/login", json={
            "email": "test.patient@gmail.com",
            "password": "password123"
        })
        assert res.status_code == 200
        assert "access_token" in res.json()
        assert res.json()["role"] == "patient"

async def test_successful_booking():
    await clean_database()
    
    # Setup database state
    doc_id = await create_test_doctor("test.doctor2@healthverse.com", "Dr. House", "Diagnostics")
    pat_id = await create_test_patient("test.patient2@gmail.com", "Jane Doe")
    slot_id = await create_test_slot(doc_id, "2026-07-10", "10:00:00", "11:00:00")
    
    async with AsyncClient(app=app, base_url="http://test") as ac:
        # Login Patient to get token
        login_res = await ac.post("/auth/login", json={
            "email": "test.patient2@gmail.com",
            "password": "password123"
        })
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # Book the slot
        book_res = await ac.post("/appointments", json={"slot_id": slot_id}, headers=headers)
        assert book_res.status_code == 201
        assert book_res.json()["message"] == "Appointment booked successfully"
        
        # Verify slot is marked booked
        async with db.pool.acquire() as conn:
            is_booked = await conn.fetchval("SELECT is_booked FROM availability_slots WHERE id = $1", slot_id)
            assert is_booked is True

async def test_concurrency_race_condition():
    """
    Simulate race condition: multiple patients trying to book the SAME slot concurrently.
    Only one should succeed, others must fail with 400 Bad Request.
    """
    await clean_database()
    
    doc_id = await create_test_doctor("doctor.concurrency@healthverse.com", "Dr. Locked", "Concurrency")
    slot_id = await create_test_slot(doc_id, "2026-07-11", "09:00:00", "10:00:00")
    
    # Create 5 distinct patients and get their access tokens
    patient_tokens = []
    async with AsyncClient(app=app, base_url="http://test") as ac:
        for i in range(5):
            email = f"patient.race{i}@gmail.com"
            await create_test_patient(email, f"Patient Race {i}")
            login_res = await ac.post("/auth/login", json={
                "email": email,
                "password": "password123"
            })
            patient_tokens.append(login_res.json()["access_token"])

    # Launch concurrent booking requests using asyncio.gather
    async def book_slot(token):
        async with AsyncClient(app=app, base_url="http://test") as ac:
            headers = {"Authorization": f"Bearer {token}"}
            # Add a slight artificial async yield to make sure requests hit server concurrently
            await asyncio.sleep(0.01)
            return await ac.post("/appointments", json={"slot_id": slot_id}, headers=headers)

    tasks = [book_slot(token) for token in patient_tokens]
    responses = await asyncio.gather(*tasks)
    
    # Assertions: Exactly one 201 Created and exactly four 400 Bad Requests
    success_count = 0
    failure_count = 0
    
    for r in responses:
        if r.status_code == 201:
            success_count += 1
        elif r.status_code == 400:
            failure_count += 1
            assert "already been booked" in r.json()["detail"]
        else:
            pytest.fail(f"Unexpected status code: {r.status_code} - {r.text}")
            
    assert success_count == 1
    assert failure_count == 4
    
    # Confirm in DB that slot is indeed booked
    async with db.pool.acquire() as conn:
        is_booked = await conn.fetchval("SELECT is_booked FROM availability_slots WHERE id = $1", slot_id)
        assert is_booked is True
        
        # Enforce that only 1 appointment row exists for this slot
        count = await conn.fetchval("SELECT COUNT(*) FROM appointments WHERE slot_id = $1", slot_id)
        assert count == 1
