# API Endpoints Documentation

## Course Endpoints

### Get All Courses for Institution

```
GET /api/courses
```

Returns all courses for the user's institution. This endpoint does not apply role-based filtering.

**Authentication Required**: Yes

**Response**:
```json
[
  {
    "id": "uuid",
    "title": "Course Title",
    "description": "Course Description",
    "teacher_id": "uuid",
    "institution_id": "uuid",
    "created_at": "timestamp"
  },
  ...
]
```

### Get Filtered Courses Based on User Role

```
GET /api/courses/filtered
```

Returns courses filtered based on the user's role:
- **Admin**: All courses in the institution
- **Teacher**: Courses where the user is the teacher
- **Student**: Courses where the student has attendance records or submissions

**Authentication Required**: Yes

**Response**:
```json
[
  {
    "id": "uuid",
    "title": "Course Title",
    "description": "Course Description",
    "teacher_id": "uuid",
    "institution_id": "uuid",
    "created_at": "timestamp"
  },
  ...
]
```

### Get Course by ID

```
GET /api/courses/:id
```

Returns a specific course by ID with role-based access control:
- **Admin**: Can access any course in their institution
- **Teacher**: Can only access courses they teach
- **Student**: Can only access courses they're enrolled in (via attendance or submissions)

**Authentication Required**: Yes

**URL Parameters**:
- `id`: Course ID (UUID)

**Response**:
```json
{
  "id": "uuid",
  "title": "Course Title",
  "description": "Course Description",
  "teacher_id": "uuid",
  "institution_id": "uuid",
  "created_at": "timestamp"
}
```

**Error Responses**:
- `404 Not Found`: Course doesn't exist
- `403 Forbidden`: User doesn't have access to this course

### Create Course

```
POST /api/courses
```

Creates a new course. Only available to teachers and admins.

**Authentication Required**: Yes

**Request Body**:
```json
{
  "title": "Course Title",
  "description": "Course Description"
}
```

**Response**:
```json
{
  "id": "uuid",
  "title": "Course Title",
  "description": "Course Description",
  "teacher_id": "uuid",
  "institution_id": "uuid",
  "created_at": "timestamp"
}
```

## Supabase Configuration

The API endpoints rely on the following Supabase configurations:

1. **Row Level Security (RLS) Policies**:
   - Courses table has policies for students, teachers, and admins
   - Students can only view courses they're enrolled in (via attendance or submissions)
   - Teachers can only view courses they teach
   - Admins can view all courses in their institution

2. **Database Indexes**:
   - `idx_attendance_user_course` on `attendance(user_id, course_id)`
   - `idx_submissions_student` on `submissions(student_id)`
   - `idx_assignments_course` on `assignments(course_id)`
   - `idx_courses_teacher` on `courses(teacher_id)`
   - `idx_courses_institution` on `courses(institution_id)`

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