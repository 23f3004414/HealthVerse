-- Database Initialization Script for HealthVerse

-- 1. Patients Table
CREATE TABLE IF NOT EXISTS patients (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Doctors Table
CREATE TABLE IF NOT EXISTS doctors (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    specialty VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Availability Slots Table
CREATE TABLE IF NOT EXISTS availability_slots (
    id SERIAL PRIMARY KEY,
    doctor_id INTEGER REFERENCES doctors(id) ON DELETE CASCADE,
    slot_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_booked BOOLEAN DEFAULT FALSE,
    UNIQUE (doctor_id, slot_date, start_time, end_time)
);

-- 4. Appointments Table
CREATE TABLE IF NOT EXISTS appointments (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER REFERENCES patients(id) ON DELETE CASCADE,
    doctor_id INTEGER REFERENCES doctors(id) ON DELETE CASCADE,
    slot_id INTEGER REFERENCES availability_slots(id) ON DELETE CASCADE,
    appointment_date DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'pending', -- pending, confirmed, cancelled
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (slot_id)
);

-- Indexes for performance (will be benchmarked)
CREATE INDEX IF NOT EXISTS idx_availability_slots_doctor_date ON availability_slots (doctor_id, slot_date);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor_date ON appointments (doctor_id, appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments (patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_slot ON appointments (slot_id);

-- Insert Seed Data (Password hashes are for password 'password123', generated using bcrypt)
-- Hashed password for $2b$12$R.S26P.M80jEGBm7X77aVubpQc9Y2a/iH4N1dC0rW5q4W91.m3t7G
INSERT INTO doctors (email, password_hash, full_name, specialty)
VALUES 
('doctor.house@healthverse.com', '$2b$12$R.S26P.M80jEGBm7X77aVubpQc9Y2a/iH4N1dC0rW5q4W91.m3t7G', 'Dr. Gregory House', 'Diagnostic Medicine'),
('doctor.strange@healthverse.com', '$2b$12$R.S26P.M80jEGBm7X77aVubpQc9Y2a/iH4N1dC0rW5q4W91.m3t7G', 'Dr. Stephen Strange', 'Neurosurgery'),
('doctor.grey@healthverse.com', '$2b$12$R.S26P.M80jEGBm7X77aVubpQc9Y2a/iH4N1dC0rW5q4W91.m3t7G', 'Dr. Meredith Grey', 'General Surgery')
ON CONFLICT (email) DO NOTHING;

INSERT INTO patients (email, password_hash, full_name)
VALUES 
('john.doe@gmail.com', '$2b$12$R.S26P.M80jEGBm7X77aVubpQc9Y2a/iH4N1dC0rW5q4W91.m3t7G', 'John Doe'),
('jane.smith@gmail.com', '$2b$12$R.S26P.M80jEGBm7X77aVubpQc9Y2a/iH4N1dC0rW5q4W91.m3t7G', 'Jane Smith')
ON CONFLICT (email) DO NOTHING;
