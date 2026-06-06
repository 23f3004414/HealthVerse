import asyncio
import os
import time
import asyncpg

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/healthverse")

async def run_benchmark():
    print(f"Connecting to database: {DATABASE_URL}...")
    conn = await asyncpg.connect(DATABASE_URL)
    
    print("\n--- Cleaning up existing benchmark tables ---")
    await conn.execute("DROP TABLE IF EXISTS benchmark_appointments CASCADE;")
    await conn.execute("DROP TABLE IF EXISTS benchmark_slots CASCADE;")
    
    print("\n--- Creating mock tables for benchmark ---")
    # We use separate benchmark tables to avoid messing up main seed data
    await conn.execute("""
    CREATE TABLE benchmark_slots (
        id SERIAL PRIMARY KEY,
        doctor_id INTEGER NOT NULL,
        slot_date DATE NOT NULL,
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        is_booked BOOLEAN DEFAULT FALSE
    );
    CREATE TABLE benchmark_appointments (
        id SERIAL PRIMARY KEY,
        patient_id INTEGER NOT NULL,
        doctor_id INTEGER NOT NULL,
        slot_id INTEGER NOT NULL,
        appointment_date DATE NOT NULL,
        status VARCHAR(50) DEFAULT 'pending'
    );
    """)
    
    print("\n--- Generating 50,000 availability slots and 15,000 appointments ---")
    print("Please wait, executing bulk inserts...")
    
    # 50,000 slots across 500 doctors and 100 days
    # We use a nested loop generator in sql
    await conn.execute("""
    INSERT INTO benchmark_slots (doctor_id, slot_date, start_time, end_time, is_booked)
    SELECT 
        (random() * 500)::int + 1,
        CURRENT_DATE + (random() * 100)::int,
        '09:00:00'::time + (random() * 8 * interval '1 hour'),
        '10:00:00'::time + (random() * 8 * interval '1 hour'),
        (random() > 0.7)::boolean
    FROM generate_series(1, 50000);
    """)
    
    # 15,000 appointments mapping to slots
    await conn.execute("""
    INSERT INTO benchmark_appointments (patient_id, doctor_id, slot_id, appointment_date, status)
    SELECT 
        (random() * 1000)::int + 1,
        (random() * 500)::int + 1,
        (random() * 50000)::int + 1,
        CURRENT_DATE + (random() * 100)::int,
        CASE WHEN random() > 0.5 THEN 'confirmed' ELSE 'pending' END
    FROM generate_series(1, 15000);
    """)

    # Target test query details
    target_doctor_id = 278
    target_start_date = "CURRENT_DATE + 10"
    target_end_date = "CURRENT_DATE + 30"
    
    query = f"""
    SELECT * FROM benchmark_slots 
    WHERE doctor_id = {target_doctor_id} 
      AND slot_date BETWEEN {target_start_date} AND {target_end_date};
    """

    print("\n================== BENCHMARK PART 1: WITHOUT INDEXES ==================")
    
    # Run explain analyze before indexes
    explain_without = await conn.fetchval(f"EXPLAIN ANALYZE {query}")
    print("\nEXPLAIN ANALYZE OUTPUT (NO INDEX):")
    print(explain_without)
    
    # Measure query execution speed over 100 iterations
    t0 = time.time()
    for _ in range(100):
        await conn.fetch(query)
    t1 = time.time()
    latency_without = (t1 - t0) * 10  # average in ms (t1-t0/100 * 1000 = * 10)
    print(f"\nAverage query latency (No Index): {latency_without:.4f} ms")

    print("\n================== CREATING INDEXES ==================")
    print("Creating index: idx_bench_slots_doc_date ON benchmark_slots(doctor_id, slot_date)")
    await conn.execute("CREATE INDEX idx_bench_slots_doc_date ON benchmark_slots (doctor_id, slot_date);")
    
    print("\n================== BENCHMARK PART 2: WITH INDEXES ==================")
    
    # Run explain analyze after indexes
    explain_with = await conn.fetchval(f"EXPLAIN ANALYZE {query}")
    print("\nEXPLAIN ANALYZE OUTPUT (WITH INDEX):")
    print(explain_with)
    
    # Measure query execution speed over 100 iterations
    t0 = time.time()
    for _ in range(100):
        await conn.fetch(query)
    t1 = time.time()
    latency_with = (t1 - t0) * 10  # average in ms
    print(f"\nAverage query latency (With Index): {latency_with:.4f} ms")
    
    improvement = ((latency_without - latency_with) / latency_without) * 100
    print(f"\nLatency Improvement: {improvement:.2f}%")
    
    print("\n--- Cleaning up benchmark tables ---")
    await conn.execute("DROP TABLE IF EXISTS benchmark_appointments CASCADE;")
    await conn.execute("DROP TABLE IF EXISTS benchmark_slots CASCADE;")
    await conn.close()

if __name__ == "__main__":
    asyncio.run(run_benchmark())
