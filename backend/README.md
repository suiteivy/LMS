# 📘 LMS Backend API Documentation

## Base URL

```
https://lms-api-wine.vercel.app/api
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
  "role": "admin|teacher|student",
  "institution_id": "UUID_OF_EXISTING_INSTITUTION"
}
```

**Responses:**

- **201** – User created successfully, returns UID
- **400** – Missing required fields or invalid role
- **403** – Invalid institution_id
- **500** – Server error

---

### 🔐 Login (`POST /auth/login`)

**Headers:** none  
**Body (JSON):**

```json
{
  "email": "user@example.com",
  "password": "Password123"
}
```

**Responses:**

- **200** – Success, returns:
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
- **401** – Invalid credentials
- **500** – Server error

---

## Institution Management

### 🔐 Create Institution (`POST /institutions`)

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

- **201** – Institution created
- **403** – Only `admin` role allowed
- **400** – Missing name
- **500** – Error

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

## Courses

### 🔐 Create Course (`POST /courses`)

**Headers:**

```
Authorization: Bearer <JWT>
```

**Body:**

```json
{
  "title": "React 101",
  "description": "Learn React basics",
  "teacher_id": "<UID of teacher>"
}
```

**Responses:**

- **201** – Course created under user's `institution_id`
- **400** – Missing fields
- **401** – Invalid token
- **500** – Error

### 🔐 List Courses (`GET /courses`) — Get courses based on user role

**Behavior:**

- **Admin**: Returns all institution courses.
- **Teacher**: Returns only courses where they are the instructor.
- **Student**: Returns only enrolled courses (linked via grades).

**Example Response:**

```json
[
  {
    "id": "course-123",
    "name": "Biology 101",
    "teacher_id": "user-456"
  }
]
```

<!-- get course by id -->

#### 🔐 List Courses (`GET /courses/:id`) — Get courses by id based on user role

**Example Response:**

```json
[
  {
    "id": "course-123",
    "name": "Biology 101",
    "teacher_id": "user-456"
  }
]
```

---

---

## 📚 LMS Backend API

### 🔐 Add Book (`POST /library/books`)

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

- **201** – Success, Ok
- **400** – Missing fields
- **401** – Invalid token
- **403** - Admin only
- **500** – Error

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

### 🔐 Borrow Book (`POST /library/borrow/:bookId`)

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

- **201** – Borrow record created (stock decremented by trigger)

- **400** – Book unavailable / borrow limit reached / overdue books exist / unpaid fees < 50%

- **401** – Unauthorized

### 🔐 Return Book (`POST /library/return/:borrowId`)

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

- **201** – Book returned successfully (stock incremented by trigger)

- **400** – Invalid borrow record

- **401** – Unauthorized

### 🔐 Borrowing History (`GET /library/history:studentId`)

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

- **200** – Success

- **400** – Bad request

- **401** – Unauthorized

---

## 🛡️ Middleware & Security

- **Auth Middleware (`authMiddleware`)** verifies JWT and sets `req.user`, `req.userRole`, and `req.institution_id`.
- **Role Enforcement**:
  - Only `admin` can call `/institutions` (POST).
  - Course creation can optionally enforce teacher-only access:
    ```js
    if (req.userRole !== "teacher") {
      return res
        .status(403)
        .json({ error: "Only teachers can create courses" });
    }
    ```

---

## 🚀 Sample Flow (using tokens and IDs)

1. Admin registers (role = `admin`) → logs in → receives `admin_token`.
2. Admin calls `POST /institutions` with `admin_token` → receives `institution_id`.
3. Register teacher (role = `teacher`) under that `institution_id`.
4. Teacher logs in → gets `teacher_token`.
5. Teacher calls `POST /courses` with `teacher_token`.

---

## 💡 Additional Notes & Best Practices

- All secured endpoints expect `Authorization: Bearer <token>` header.
- Requests must respect `institution_id` scoping; no cross-institution operations allowed.
- Form validations (title, teacher_id, etc.) enforced server-side and optionally via Supabase Edge Functions.
- Error responses are in JSON with `{ error: "message" }`.

---

## ✅ Summary Table

| Endpoint              | Protection    | Purpose                 |
| --------------------- | ------------- | ----------------------- |
| `POST /auth/register` | Public        | Register new user       |
| `POST /auth/login`    | Public        | Authenticate user       |
| `GET /institutions`   | Public        | List institutions       |
| `POST /institutions`  | Admin only    | Create institution      |
| `GET /courses`        | Authenticated | List courses per school |
| `POST /courses`       | Authenticated | Teacher creates course  |

---
