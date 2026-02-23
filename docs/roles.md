# Role-Based Features and Access Control

This document outlines the different roles in the Learning Management System (LMS) and their associated permissions and features.

## Role Overview

The LMS supports four primary roles:

1. **Admin** - System administrators with full access to all features (AD-YYYY-XXXX).
2. **Teacher** - Educators who manage subjects, academic records, and student performance (TEA-YYYY-XXXX).
3. **Student** - Learners who access course materials, submit work, and track grades (STU-YYYY-XXXX).
4. **Parent** - Guardians who monitor the progress and attendance of their linked students (PR-YYYY-XXXX).

## Role Permissions Matrix

| Feature/Action | Admin | Teacher | Student | Parent |
| :--- | :---: | :---: | :---: | :---: |
| **Academic Management** | | | | |
| View Grades | ✅ | ✅ | ✅ | ✅ |
| Post/Update Grades | ✅ | ✅ | ❌ | ❌ |
| Manage Subjects | ✅ | ✅ | ❌ | ❌ |
| **Finance** | | | | |
| View Fee Balance | ✅ | ❌ | ✅ | ✅ |
| Record Payments | ✅ | ❌ | ❌ | ❌ |
| Request Bursary | ✅ | ❌ | ✅ | ✅ |
| View Teacher Earnings | ✅ | ✅ | ❌ | ❌ |
| **Attendance** | | | | |
| Mark Attendance | ✅ | ✅ | ❌ | ❌ |
| View Attendance history | ✅ | ✅ | ✅ | ✅ |
| **Library** | | | | |
| Manage Stock | ✅ | ❌ | ❌ | ❌ |
| Borrow/Return Books | ✅ | ❌ | ✅ | ❌ |
| **Admin Controls** | | | | |
| Create Institutions | ✅ | ❌ | ❌ | ❌ |
| Enroll Users | ✅ | ❌ | ❌ | ❌ |
| Manage Settings | ✅ | ❌ | ❌ | ❌ |

## Implementation Details

### Database Level
Role-based access control is implemented using Supabase Row Level Security (RLS) and verified at the API layer. The `institution_id` on every user record ensures data is strictly scoped to the user's specific organization.

### Application Level
The frontend uses role-based routing and layout grouping:
- `(admin)`: Management dashboards and institutional settings.
- `(teacher)`: Subject management, grading, and attendance tools.
- `(student)`: Personal learning dashboard, fee tracking, and library.
- `(parent)`: Linked student monitoring.

## Authentication Flow
Users are authenticated via JWT. The payload contains the user's `role` and `institution_id`, which are extracted by the backend middleware to enforce the permissions mapped above.
