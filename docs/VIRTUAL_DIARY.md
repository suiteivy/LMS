# Virtual Diary Module Overview

The Virtual Diary module in the LMS is a specialized feature designed to allow teachers to log daily activities, behaviors, and notes for a specific class. These logs are then made accessible to students belonging to that class and their respective parents.

This document breaks down how the Virtual Diary operates across the platform.

## 1. Feature Access & Gating (Subscription Level)

The Virtual Diary is a premium feature. It is governed holistically by the `subscriptionCheck` middleware in the backend and the [useSubscriptionTier](file:///c:/Projects/LMS/frontend/hooks/useSubscriptionTier.ts#55-108) hook in the frontend.

*   **Included by Default:** The Virtual Diary is included out-of-the-box for institutions on the **Basic Pro** (`basic_pro` or [pro](file:///c:/Projects/LMS/frontend/app/index.tsx#1148-1153)), **Basic Premium** (`basic_premium`), and all **Enterprise** and **Custom** plans.
*   **Disabled by Default:** Lower tier plans (e.g., `free`, `trial`, `basic_basic`) cannot access the Virtual Diary endpoint natively.
*   **Add-on Override (`addon_diary`):** A Master Platform Admin can explicitly grant the `addon_diary` feature to *any* institution, regardless of their base tier. If this bitroom flag is enabled, the institution gains full access to the Diary.

If an institution attempts to access the diary without the proper plan or add-on, the API securely returns a `403 Forbidden` response, and the frontend falls back to a "Locked Feature" UI prompt encouraging the school to request the add-on.

## 2. Role-Based Capabilities

The API enforces strict Row-Level Security (via application code in [diary.controller.js](file:///c:/Projects/LMS/backend/controllers/diary.controller.js)) based on the authenticated user's role:

### Teachers
*   **Creation (`POST /api/diary/`)**: Teachers can only create diary entries for classes where they are explicitly assigned as the class teacher, or if they teach a subject within that class.
*   **Editing & Deletion (`PUT / DELETE /api/diary/:id`)**: A teacher can only edit or delete diary entries that *they* authored. They cannot modify entries logged by a different teacher in the same class.

### Students
*   **Viewing (`GET /api/diary/`)**: Students have read-only access. When a student requests diary entries, the backend automatically infers their enrolled class constraint. They can only see entries published to their specific enrolled class.

### Parents
*   **Viewing (`GET /api/diary/?student_id=XYZ`)**: Parents also have read-only access. However, because a parent can have multiple children across different classes, they must provide the `student_id` they are querying for. The backend strictly verifies that:
    1. The parent is genuinely linked to the submitted `student_id` (via `parent_students` mapping).
    2. The entries returned are filtered strictly to the class that the specific student is enrolled in.

### Administrators
*   **Full Access**: School Administrators hold overarching access, allowing them to create, read, update, or delete entries across *any* class within their specific `institution_id`. They act as moderators.

## 3. Data Structure & Flow

When an entry is created, it is stored in the `diary_entries` table in Supabase. The table stores the following primary data points:

*   [id](file:///c:/Projects/LMS/frontend/contexts/AuthContext.tsx#62-404): UUID
*   `institution_id`: Secures the data from leaking to other schools.
*   `class_id`: The target audience for the entry.
*   `teacher_id`: The author.
*   `title` & `content`: The meat of the entry log.
*   `entry_date`: The specific calendar date the log corresponds to (defaults to the date of request if not provided).

When entries are fetched, the [diary.controller.js](file:///c:/Projects/LMS/backend/controllers/diary.controller.js) joins the `teachers` and `users` tables to append the publishing teacher's `full_name` to the payload, ensuring the frontend app can display who wrote the log without making subsequent API calls.
