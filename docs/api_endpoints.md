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
