# API Endpoints Documentation

This document provides a comprehensive reference for the LMS Backend API. All endpoints are prefixed with `/api`.

## 📂 Core Modules

### 🔐 Authentication (`/api/auth`)
Handles user registration, login, and administrative user management.
- `POST /register`: Public registration for new users.
- `POST /login`: Authenticate and receive JWT.
- `POST /enroll-user`: (Admin Only) Register a new student/teacher with a generated ID and temporary password.
- `PUT /admin-update-user/:id`: (Admin Only) Update profile and role-specific data.

### 🏛️ Institutions (`/api/institutions`)
Global management of educational institutions.
- `GET /`: List all available institutions.
- `POST /`: (Admin Only) Register a new institution.

### 📚 Subjects (`/api/subjects`)
Academic course management.
- `GET /`: List subjects (Student: enrolled only; Teacher: taught only; Admin: all).
- `GET /:id`: Detailed subject information.
- `POST /`: (Teacher/Admin) Create a new subject.

### 🎓 Academic & Grading (`/api/academic`)
Management of student performance and scores.
- `GET /grades`: Retrieve grades/submissions for the current user.
- `POST /grades`: (Teacher) Post or update marks for a student's submission.

### 📖 Library (`/api/library`)
Book inventory and lending management.
- `GET /books`: List books in the institution.
- `POST /books`: (Admin) Add new book to inventory.
- `POST /borrow/:bookId`: Request to borrow a book.
- `POST /return/:borrowId`: Return a borrowed book.
- `GET /history/:studentId`: View borrowing history.

### 📅 Timetable (`/api/timetable`)
Class scheduling and period management.
- `GET /`: Fetch timetable slots for the user.
- `POST /`: (Admin/Teacher) Create/Modify schedule.

### 🙋 Attendance (`/api/attendance`)
Tracking student presence in classes.
- `GET /`: View attendance reports.
- `POST /`: Mark attendance for a specific session.

### 📝 Exams (`/api/exams`)
Scheduled assessments and results.
- `GET /`: List exams.
- `POST /`: (Teacher/Admin) Schedule an exam.

### 💰 Finance & Bursary (`/api/finance`, `/api/bursary`)
Monetary transactions and financial aid.
- `/api/finance`: 
  - `GET /payments`: List fee payments.
  - `GET /teacher/earnings`: View payout history.
- `/api/bursary`: 
  - `POST /apply`: Student bursary application.
  - `GET /status`: Track application progress.

### 📢 Messaging & Notifications (`/api/messages`, `/api/notifications`)
- `/api/messages`: Peer-to-peer or class-wide communication.
- `/api/notifications`: System alerts for grades, fees, or announcements.

---

## 🛡️ Security & Headers

### Authentication
All secured endpoints require an `Authorization` header:
```http
Authorization: Bearer <JWT_TOKEN>
```

### Institutional Scoping
The backend uses the `institution_id` from the JWT to automatically filter all queries. This ensures that users can only see data belonging to their specific school.

### Role-Based Access Control (RBAC)
Endpoints are restricted based on the `role` field in the JWT:
- **Admin**: Full institution-wide access.
- **Teacher**: Access to assigned subjects, grading, and attendance.
- **Student**: Access to personal grades, class materials, and finance.
- **Parent**: Access to linked student's performance and fee status.
