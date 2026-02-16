# API Endpoints Documentation

## Subject Endpoints

### Get All Subjects for Institution

```
GET /api/Subjects
```

Returns all Subjects for the user's institution. This endpoint does not apply role-based filtering.

**Authentication Required**: Yes

**Response**:
```json
[
  {
    "id": "uuid",
    "title": "Subject Title",
    "description": "Subject Description",
    "teacher_id": "TEA-YYYY-XXXX",
    "institution_id": "uuid",
    "created_at": "timestamp"
  },
  ...
]
```

### Get Filtered Subjects Based on User Role

```
GET /api/Subjects/filtered
```

Returns Subjects filtered based on the user's role:
- **Admin**: All Subjects in the institution
- **Teacher**: Subjects where the user is the teacher
- **Student**: Subjects where the student has attendance records or submissions

**Authentication Required**: Yes

**Response**:
```json
[
  {
    "id": "uuid",
    "title": "Subject Title",
    "description": "Subject Description",
    "teacher_id": "TEA-YYYY-XXXX",
    "institution_id": "uuid",
    "created_at": "timestamp"
  },
  ...
]
```

### Get Subject by ID

```
GET /api/Subjects/:id
```

Returns a specific Subject by ID with role-based access control:
- **Admin**: Can access any Subject in their institution
- **Teacher**: Can only access Subjects they teach
- **Student**: Can only access Subjects they're enrolled in (via attendance or submissions)

**Authentication Required**: Yes

**URL Parameters**:
- `id`: Subject ID (UUID)

**Response**:
```json
{
  "id": "uuid",
  "title": "Subject Title",
  "description": "Subject Description",
  "teacher_id": "uuid",
  "institution_id": "uuid",
  "created_at": "timestamp"
}
```

**Error Responses**:
- `404 Not Found`: Subject doesn't exist
- `403 Forbidden`: User doesn't have access to this Subject

### Create Subject

```
POST /api/Subjects
```

Creates a new Subject. Only available to teachers and admins.

**Authentication Required**: Yes

**Request Body**:
```json
{
  "title": "Subject Title",
  "description": "Subject Description"
}
```

**Response**:
```json
{
  "id": "uuid",
  "title": "Subject Title",
  "description": "Subject Description",
  "teacher_id": "uuid",
  "institution_id": "uuid",
  "created_at": "timestamp"
}
```

## Auth / User Management Endpoints

### Login

```
POST /api/auth/login
```

Authenticates a user with email and password.

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

### Enroll User (Admin Only)

```
POST /api/auth/enroll-user
```

Creates a new user with a specific role. Generates a temporary password and custom ID. Only accessible by admins.

**Request Body**:
```json
{
  "full_name": "John Doe",
  "email": "john@example.com",
  "role": "student",
  "institution_id": "uuid",
  "phone": "+254 7XX XXX XXX",
  "gender": "male",
  "date_of_birth": "2000-01-15",
  "address": "123 Main St",
  "grade_level": "Form 3",
  "academic_year": "2026"
}
```

**Response**:
```json
{
  "message": "User enrolled successfully",
  "uid": "uuid",
  "email": "john@example.com",
  "tempPassword": "Lms@Ab1234",
  "customId": "STU-2026-000001",
  "role": "student"
}
```

### Admin Update User

```
PUT /api/auth/admin-update-user/:id
```

Updates any user's profile and role-specific details. Admin-only endpoint.

**URL Parameters**:
- `id`: User UUID

**Request Body** (all fields optional):
```json
{
  "full_name": "Jane Doe",
  "email": "jane@example.com",
  "phone": "+254 7XX XXX XXX",
  "gender": "female",
  "date_of_birth": "1995-06-20",
  "address": "456 Oak Ave",
  "grade_level": "Form 4",
  "department": "Mathematics",
  "qualification": "M.Ed"
}
```

**Response**:
```json
{
  "message": "User updated successfully"
}
```

## Supabase Configuration

The API endpoints rely on the following Supabase configurations:

1. **Row Level Security (RLS) Policies**:
   - Subjects table has policies for students, teachers, and admins
   - Students can only view Subjects they're enrolled in (via attendance or submissions)
   - Teachers can only view Subjects they teach
   - Admins can view all Subjects in their institution

2. **Database Indexes**:
   - `idx_attendance_user_Subject` on `attendance(user_id, Subject_id)`
   - `idx_submissions_student` on `submissions(student_id)`
   - `idx_assignments_Subject` on `assignments(Subject_id)`
   - `idx_Subjects_teacher` on `Subjects(teacher_id)`
   - `idx_Subjects_institution` on `Subjects(institution_id)`

These indexes improve the performance of the filtering queries.

## Authentication

All endpoints require authentication via a JWT token in the Authorization header:

```
Authorization: Bearer <token>
```

The token is validated by the `authMiddleware` which extracts:
- User ID
- User Role (admin, teacher, student)
- Institution ID

These values are used for role-based access control in the API endpoints.
