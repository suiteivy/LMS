# ðŸ“˜ LMS Backend API Documentation

## Base URL

```
https://lms-api-wine.vercel.app/api
```

---

## Authentication

### âœ… Register User (`POST /auth/register`)

**Headers:** none  
**Body (JSON):**

```json
{
  "email": "user@example.com",
  "password": "Password123",
  "full_name": "Jane Doe",
  "role": "admin|teacher|student",
  "institution_id": "UUID_OF_EXISTING_INSTITUTION"
}
```

**Responses:**

- **201** â€“ User created successfully, returns UID
- **400** â€“ Missing required fields or invalid role
- **403** â€“ Invalid institution_id
- **500** â€“ Server error

---

### ðŸ” Login (`POST /auth/login`)

**Headers:** none  
**Body (JSON):**

```json
{
  "email": "user@example.com",
  "password": "Password123"
}
```

**Responses:**

- **200** â€“ Success, returns:
  ```json
  {
    "message": "Login successful",
    "token": "<JWT>",
    "user": {
      "uid": "...",
      "email": "...",
      "full_name": "...",
      "role": "teacher",
      "institution_id": "..."
    }
  }
  ```
- **401** â€“ Invalid credentials
- **500** â€“ Server error

---

## Database Setup

To set up the database, run the following SQL scripts in the Supabase SQL Editor in order:

1. **Schema**: `backend/supabase/schema.sql` (Creates tables and RLS policies)
2. **Triggers**: `backend/supabase/triggers.sql` (Adds essential database logic)

---

## Institution Management

### ðŸ” Create Institution (`POST /institutions`)

**Headers:**

```
Authorization: Bearer <JWT>
```

**Body:**

```json
{
  "name": "My School",
  "location": "Kakamega town"
}
```

**Responses:**

- **201** â€“ Institution created
- **403** â€“ Only `admin` role allowed
- **400** â€“ Missing name
- **500** â€“ Error

### View Institutions (`GET /institutions`)

**Headers:** None  
**Response (200):**

```json
[
  {
    "id": "...",
    "name": "My School",
    "location": "Kakamega town",
    "created_at": "..."
  },
  ...
]
```

---

## Subjects

### ðŸ” Create Subject (`POST /Subjects`)

**Headers:**

```
Authorization: Bearer <JWT>
```

**Body:**

```json
{
  "title": "React 101",
  "description": "Learn React basics",
  "teacher_id": "<UID of teacher>",
  "fee_amount": 4000
}
```

**Responses:**

- **201** â€“ Subject created under user's `institution_id`
- **400** â€“ Missing fields
- **401** â€“ Invalid token
- **500** â€“ Error

### ðŸ” List Subjects (`GET /Subjects`) â€” Get Subjects based on user role

**Behavior:**

- **Admin**: Returns all institution Subjects.
- **Teacher**: Returns only Subjects where they are the instructor.
- **Student**: Returns only enrolled Subjects (linked via grades).

**Example Response:**

```json
[
  {
    "id": "Subject-123",
    "name": "Biology 101",
    "teacher_id": "user-456"
  }
]
```

<!-- get Subject by id -->

#### ðŸ” List Subjects (`GET /Subjects/:id`) â€” Get Subjects by id based on user role

**Example Response:**

```json
[
  {
    "id": "Subject-123",
    "name": "Biology 101",
    "teacher_id": "user-456"
  }
]
```

---

---

## ðŸ“š LMS Backend API

### ðŸ” Add Book (`POST /library/books`)

**Headers:**

```
Authorization: Bearer <JWT>
```

**Body (JSON):**

```json
{
  "title": "Clean Code",
  "author": "Robert C. Martin",
  "isbn": "9780132350884",
  "total_quantity": 5,
  "institution_id": "UUID_OF_INSTITUTION"
}
```

**Responses:**

- **201** â€“ Success, Ok
- **400** â€“ Missing fields
- **401** â€“ Invalid token
- **403** - Admin only
- **500** â€“ Error

### List Books (`GET /library/books`)

**Headers:**

```
Authorization: Bearer <JWT>
```

**Body (JSON):**

```json
[
  {
    "id": "uuid",
    "title": "Clean Code",
    "author": "Robert C. Martin",
    "isbn": "9780132350884",
    "total_quantity": 5,
    "available_quantity": 5,
    "institution_id": "uuid",
    "created_at": "timestamp"
  }
]
```

### ðŸ” Borrow Book (`POST /library/borrow/:bookId`)

**Headers:**

```
Authorization: Bearer <JWT>
```

**Body (JSON):**

```json
{
  "due_date": "2025-09-01"
}
```

**Responses:**

- **201** â€“ Borrow record created (stock decremented by trigger)

- **400** â€“ Book unavailable / borrow limit reached / overdue books exist / unpaid fees < 50%

- **401** â€“ Unauthorized

### ðŸ” Return Book (`POST /library/return/:borrowId`)

**Headers:**

```
Authorization: Bearer <JWT>
```

**Body (JSON):**

```json
{
  "returned_at": "2025-08-20"
}
```

**Responses:**

- **201** â€“ Book returned successfully (stock incremented by trigger)

- **400** â€“ Invalid borrow record

- **401** â€“ Unauthorized

### ðŸ” Borrowing History (`GET /library/history:studentId`)

**Headers:**

```
Authorization: Bearer <JWT>
```

**Body (JSON):**

```json
[
  {
    "id": "uuid",
    "book": {
      "title": "Clean Code",
      "author": "Robert C. Martin"
    },
    "borrowed_at": "2025-08-01",
    "due_date": "2025-09-01",
    "returned_at": null,
    "status": "borrowed"
  }
]
```

**Responses:**

- **200** â€“ Success

- **400** â€“ Bad request

- **401** â€“ Unauthorized

---

## ðŸ›¡ï¸ Middleware & Security

- **Auth Middleware (`authMiddleware`)** verifies JWT and sets `req.user`, `req.userRole`, and `req.institution_id`.
- **Role Enforcement**:
  - Only `admin` can call `/institutions` (POST).
  - Subject creation can optionally enforce teacher-only access:
    ```js
    if (req.userRole !== "teacher") {
      return res
        .status(403)
        .json({ error: "Only teachers can create Subjects" });
    }
    ```

---

## ðŸš€ Sample Flow (using tokens and IDs)

1. Admin registers (role = `admin`) â†’ logs in â†’ receives `admin_token`.
2. Admin calls `POST /institutions` with `admin_token` â†’ receives `institution_id`.
3. Register teacher (role = `teacher`) under that `institution_id`.
4. Teacher logs in â†’ gets `teacher_token`.
5. Teacher calls `POST /Subjects` with `teacher_token`.

---

## ðŸ’¡ Additional Notes & Best Practices

- All secured endpoints expect `Authorization: Bearer <token>` header.
- Requests must respect `institution_id` scoping; no cross-institution operations allowed.
- Form validations (title, teacher_id, etc.) enforced server-side and optionally via Supabase Edge Functions.
- Error responses are in JSON with `{ error: "message" }`.

---

## âœ… Summary Table

| Endpoint              | Protection    | Purpose                 |
| --------------------- | ------------- | ----------------------- |
| `POST /auth/register` | Public        | Register new user       |
| `POST /auth/login`    | Public        | Authenticate user       |
| `GET /institutions`   | Public        | List institutions       |
| `POST /institutions`  | Admin only    | Create institution      |
| `GET /Subjects`        | Authenticated | List Subjects per school |
| `POST /Subjects`       | Authenticated | Teacher creates Subject  |

---
