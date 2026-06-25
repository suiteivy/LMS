# 📖 LMS Backend API Documentation

## Base URL

```
http://localhost:4001/api
```

---

## Authentication

### ✅ Register User (`POST /auth/register`)

**Headers:** none  
**Body (JSON):**

```json
{
  "email": "user@example.com",
  "password": "Password123",
  "full_name": "Jane Doe",
  "role": "admin|teacher|student|parent",
  "institution_id": "UUID_OF_EXISTING_INSTITUTION"
}
```

**Responses:**
- **201** – User created successfully
- **400** – Missing required fields or invalid role
- **403** – Invalid institution_id
- **500** – Server error

---

### 🔍 Login (`POST /auth/login`)

**Headers:** none  
**Body (JSON):**

```json
{
  "email": "user@example.com",
  "password": "Password123"
}
```

**Responses:**
- **200** – Success, returns JWT and user profile metadata
- **401** – Invalid credentials

---

## Database Setup

The backend now uses a fully consolidated schema file:

1. **Schema**: `backend/supabase/schema.sql` (tables, indexes, triggers, and RLS)

If you are using the Supabase CLI workflow, use the repository-level migrations in `supabase/migrations`.

Legacy backend migration helpers are kept only for emergency/manual replay and are not part of the primary workflow.

---

## Core Modules

### 🏫 Institutions (`/api/institutions`)
- `GET /`: List all institutions.
- `POST /`: Create new institution (Admin only).

### 📚 Subjects (`/api/subjects`)
- `GET /`: List subjects based on user role.
- `GET /:id`: Get subject details.
- `POST /`: Create subject (Teacher/Admin).

### 📖 Library (`/api/library`)
- `GET /books`: List books in institution.
- `POST /books`: Add book (Admin only).
- `POST /borrow/:bookId`: Borrow a book.
- `POST /return/:borrowId`: Return a book.

### 🎓 Academic (`/api/academic`)
- `GET /grades`: Fetch grades for students.
- `POST /grades`: Submit or update grades (Teacher only).

### 📅 Timetable (`/api/timetable`)
- `GET /`: Get current timetable for student/teacher.
- `POST /`: Create or update timetable slots.

### 📝 Exams (`/api/exams`)
- `GET /`: List upcoming exams.
- `POST /`: Schedule new exam.

### 🙋 Attendance (`/api/attendance`)
- `GET /`: View attendance history.
- `POST /`: Mark attendance for a class.

### 💰 Finance & Bursary
- `/api/finance`: Payments, payouts, and earnings tracking.
- `/api/bursary`: Bursary applications and status tracking.
- `/api/funds`: Management of specific institution funds.

### 🚀 Promotions (`/api/promotions`)
- `GET /cycles`: List promotion cycles.
- `POST /cycles`: Create a promotion cycle.
- `GET /cycles/:id/decisions`: List per-student decisions.
- `POST /cycles/:id/preview`: Build eligibility preview and persist decisions.
- `POST /cycles/:id/execute`: Execute promotion for eligible students.

### 🔔 Notifications (`/api/notifications`)
- `GET /delivery-attempts`: Delivery history and retry state for notifications.
- `POST /retry-now`: Manually run retry worker for scheduled failures.

Automatic retry worker:
- The backend runs a cron worker every 5 minutes to retry scheduled notification deliveries.
- Manual trigger script: `npm run notification:retry`

Testing:
- `npm test` runs backend node:test suites.
- Current suite includes promotion eligibility service coverage and notification retry worker contract check.
- DM RLS integration harness: `tests/messaging-rls.integration.test.js`
  - Uses JWT-scoped Supabase clients (anon key + user bearer token) to assert real RLS behavior.
  - Required env vars:
    - `SUPABASE_URL`
    - `SUPABASE_ANON_KEY`
    - `DM_TEST_USER_A_JWT`
    - `DM_TEST_USER_B_JWT`
    - `DM_TEST_CONV_A_ONLY`
    - `DM_TEST_CONV_B_ONLY`
    - `DM_TEST_CONV_SHARED`
  - If these env vars are missing, the test auto-skips.
  - Fixture generator script: `npm run seed:dm-fixture`
    - Creates/ensures 4 users and 3 conversations for the matrix:
      - `DM_TEST_CONV_A_ONLY` => A with C (A can see, B cannot)
      - `DM_TEST_CONV_B_ONLY` => B with D (B can see, A cannot)
      - `DM_TEST_CONV_SHARED` => A with B (both can see)
    - Emits env-style output (`KEY=value`) by default for easy copy/paste.

---

## 🛡️ Middleware & Security

- **Auth Middleware**: Verifies JWT and extracts user context.
- **Role Enforcement**: Ensures restricted access to Admin and Teacher-only endpoints.
- **Institution Scoping**: All queries are automatically scoped to the user's `institution_id`.

---

## ✅ Summary Table

| Endpoint | Protection | Purpose |
| :--- | :--- | :--- |
| `POST /auth/register` | Public | Register new user |
| `POST /auth/login` | Public | Authenticate user |
| `GET /subjects` | Authenticated | List role-based subjects |
| `GET /academic/grades` | Authenticated | Manage student grades |
| `GET /library/books` | Authenticated | Library inventory |
| `GET /attendance` | Authenticated | Attendance tracking |
| `GET /timetable` | Authenticated | Schedule management |
| `GET /finance` | Authenticated | Finance & Payments |
| `GET /bursary` | Authenticated | Bursary management |
| `GET /parent` | Authenticated | Parent-specific data |
| `GET /teacher` | Authenticated | Teacher-specific data |
