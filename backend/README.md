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

To set up the database, run the following SQL scripts in the Supabase SQL Editor in order:

1. **Schema**: `backend/supabase/schema.sql` (Creates tables and RLS policies)
2. **Triggers**: `backend/supabase/triggers.sql` (Adds essential database logic)

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
