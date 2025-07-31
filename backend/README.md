# 📘 LMS Backend API Documentation

## Base URL

```
http://localhost:4000/api
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
  "domain": "myschool.edu"
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
    "domain": "myschool.edu",
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

### 🔐 List Courses (`GET /courses`)

**Headers:**

```
Authorization: Bearer <JWT>
```

**Response (200):** Array of courses for the authenticated user's institution

---

## 🛡️ Middleware & Security

- **Auth Middleware (`authMiddleware`)** verifies JWT and sets `req.user`, `req.role`, and `req.institution_id`.
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
