# HealthVerse 🏥

HealthVerse is a high-performance, full-stack healthcare appointment management system. It is designed to be highly concurrent, secure, and responsive, with real-time status updates and raw database interaction.

## Tech Stack & Architecture

- **Frontend**: React.js (built with Vite and styled with custom glassmorphism)
- **Backend**: FastAPI (Python 3.10+) with raw SQL queries using `asyncpg` connection pool
- **Database**: PostgreSQL (v15)
- **Authentication**: Custom JWT authentication and password hashing with `bcrypt` (implemented without external auth frameworks)
- **Real-time Sync**: WebSockets for live status updates from doctor to patient
- **Concurrency**: PostgreSQL Row-Level Locking (`SELECT FOR UPDATE`) to prevent race conditions during concurrent slot bookings

### System Architecture Diagram

```
                                 +--------------------+
                                 |   React Frontend   |
                                 |    (Port 5173)     |
                                 +---------+----------+
                                           |
                      HTTP Requests        |       WebSocket Connection
                     (REST API calls)      |      (Real-time Status Sync)
                                           v
                                 +---------+----------+
                                 |   FastAPI Backend  | <----+ (FastAPI BackgroundTasks)
                                 |    (Port 8000)     |      |
                                 +---------+----------+      |
                                           |                 | (Simulates email log output)
                     Raw SQL Queries       |                 v
                  (asyncpg w/ locking)     |          +------+------+
                                           v          |  Email Log  |
                                 +---------+----------+ +-----------+
                                 |  PostgreSQL Database|
                                 |    (Port 5432)     |
                                 +--------------------+
```

---

## API Endpoints

| Category | Endpoint | Method | Auth Required | Description |
|---|---|---|---|---|
| **Auth** | `/auth/register/patient` | `POST` | None | Register a new patient |
| **Auth** | `/auth/register/doctor` | `POST` | None | Register a new doctor |
| **Auth** | `/auth/login` | `POST` | None | Authenticate patient or doctor & return JWT |
| **Doctors** | `/doctors` | `GET` | Authenticated | List all registered doctors |
| **Doctors** | `/doctors/slots` | `POST` | Doctor | Create a new availability slot |
| **Doctors** | `/doctors/slots` | `GET` | Doctor | List logged-in doctor's own slots |
| **Doctors** | `/doctors/{doctor_id}/slots` | `GET` | Authenticated | Retrieve available slots for a specific doctor |
| **Appts** | `/appointments` | `POST` | Patient | Book an appointment slot (uses row-level lock) |
| **Appts** | `/appointments` | `GET` | Authenticated | List appointments (filtered by user role/ID) |
| **Appts** | `/appointments/{id}/status` | `PATCH` | Doctor | Update appointment status (confirms or cancels) |

---

## Concurrency & Race Condition Resolution

When multiple patients try to book the same slot simultaneously, a race condition occurs. To prevent double-booking, HealthVerse executes a database transaction using **PostgreSQL Row-Level Locking**:

1. Start a transaction block.
2. Query the slot with `SELECT FOR UPDATE`:
   ```sql
   SELECT id, doctor_id, slot_date, start_time, end_time, is_booked 
   FROM availability_slots 
   WHERE id = $1 FOR UPDATE;
   ```
   This locks the specific slot row, forcing other concurrent transactions attempting to select or update this row to wait until this transaction completes.
3. Verify if `is_booked` is already `TRUE`. If so, abort and raise `400 Bad Request`.
4. Update slot: `UPDATE availability_slots SET is_booked = TRUE WHERE id = $1;`
5. Insert appointment: `INSERT INTO appointments (patient_id, doctor_id, slot_id, ...) VALUES (...);`
6. Commit transaction, releasing the lock.

---

## Database Benchmark: Index Performance

To maintain rapid response times as the clinic grows, we benchmarked the primary query used by patients to discover doctor availability:
```sql
SELECT * FROM availability_slots 
WHERE doctor_id = 278 
  AND slot_date BETWEEN CURRENT_DATE + 10 AND CURRENT_DATE + 30;
```
The test database contains **50,000 availability slots** and **15,000 appointments**.

### 1. Without Indexes (Sequential Scan)

Without an index, PostgreSQL scans every row in the table sequentially to match `doctor_id` and `slot_date`.

```
Seq Scan on benchmark_slots  (cost=0.00..1025.00 rows=25 width=29) (actual time=0.155..6.820 rows=22 loops=1)
  Filter: ((doctor_id = 278) AND (slot_date >= (CURRENT_DATE + 10)) AND (slot_date <= (CURRENT_DATE + 30)))
  Rows Removed by Filter: 49978
Planning Time: 0.118 ms
Execution Time: 7.210 ms
```

- **Average Query Latency**: **6.92 ms**

### 2. With Composite Index

We applied a composite index on the query filtering columns:
```sql
CREATE INDEX idx_availability_slots_doctor_date ON availability_slots (doctor_id, slot_date);
```

PostgreSQL performs an index scan, finding the matching rows in logarithmic time ($O(\log N)$) rather than linear time ($O(N)$).

```
Index Scan using idx_bench_slots_doc_date on benchmark_slots  (cost=0.29..12.50 rows=25 width=29) (actual time=0.035..0.082 rows=22 loops=1)
  Index Cond: ((doctor_id = 278) AND (slot_date >= (CURRENT_DATE + 10)) AND (slot_date <= (CURRENT_DATE + 30)))
Planning Time: 0.145 ms
Execution Time: 0.105 ms
```

- **Average Query Latency**: **0.09 ms**
- **Performance Speedup**: **~98.7% reduction in query latency**

---

## Local Setup Instructions

### Prerequisites
- Docker & Docker Compose installed and running.

### Quick Start
1. Clone the repository and navigate to the project directory:
   ```bash
   cd healthverse
   ```
2. Build and start all services using Docker Compose:
   ```bash
   docker compose up --build
   ```
3. Access the services:
   - **Frontend**: http://localhost:5173
   - **Backend API Docs**: http://localhost:8000/docs
   - **PostgreSQL**: localhost:5432 (User: `postgres`, Password: `postgres`, Database: `healthverse`)

### Running Benchmarks
To run the database indexing benchmark:
```bash
docker compose exec backend python benchmark.py
```

### Running Unit Tests
To run the test suite (which validates auth, booking, and concurrency locking):
```bash
docker compose exec backend pytest -v
```
*Note: The concurrency test spawns 5 threads requesting the same slot simultaneously and asserts that exactly one succeed while the remaining 4 fail.*
