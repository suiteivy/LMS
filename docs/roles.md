# Role-Based Features and Access Control

This document outlines the different roles in the Learning Management System (LMS) and their associated permissions and features.

## Role Overview

The LMS supports three primary roles:

1. **Admin** - System administrators with full access to all features
2. **Teacher** - Educators who create and manage courses, assignments, and grades
3. **Student** - Learners who enroll in courses, submit assignments, and view grades

## Role Permissions Matrix

| Feature/Action                | Admin | Teacher | Student |
|------------------------------|:-----:|:-------:|:-------:|
| **User Management**          |       |         |         |
| View all users               |   ✅   |    ✅    |    ❌    |
| Create users                 |   ✅   |    ❌    |    ❌    |
| Update user roles            |   ✅   |    ❌    |    ❌    |
| Delete users                 |   ✅   |    ❌    |    ❌    |
| **Course Management**        |       |         |         |
| View all courses             |   ✅   |    ✅    |    ❌    |
| View enrolled courses        |   ✅   |    ✅    |    ✅    |
| Create courses               |   ✅   |    ✅    |    ❌    |
| Update any course            |   ✅   |    ❌    |    ❌    |
| Update own courses           |   ✅   |    ✅    |    ❌    |
| Delete courses               |   ✅   |    ✅*   |    ❌    |
| **Assignment Management**     |       |         |         |
| View assignments             |   ✅   |    ✅    |    ✅**  |
| Create assignments           |   ✅   |    ✅    |    ❌    |
| Update assignments           |   ✅   |    ✅    |    ❌    |
| Delete assignments           |   ✅   |    ✅    |    ❌    |
| **Submission Management**     |       |         |         |
| View all submissions         |   ✅   |    ❌    |    ❌    |
| View course submissions      |   ✅   |    ✅    |    ❌    |
| View own submissions         |   ✅   |    ✅    |    ✅    |
| Create submissions           |   ✅   |    ✅    |    ✅    |
| Grade submissions            |   ✅   |    ✅    |    ❌    |
| **Attendance Management**     |       |         |         |
| View all attendance records  |   ✅   |    ❌    |    ❌    |
| View course attendance       |   ✅   |    ✅    |    ❌    |
| View own attendance          |   ✅   |    ✅    |    ✅    |
| Mark attendance (manual)     |   ✅   |    ✅    |    ❌    |
| Log own attendance           |   ✅   |    ✅    |    ✅    |
| **Institution Management**    |       |         |         |
| View institutions            |   ✅   |    ✅    |    ✅    |
| Create/Update institutions   |   ✅   |    ❌    |    ❌    |

\* Teachers can only delete their own courses  
\** Students can only view assignments for courses they're enrolled in

## Implementation Details

### Database Level

Role-based access control is implemented at the database level using Supabase Row Level Security (RLS) policies.

The system uses a consolidated schema where:
- `users`: Core authentication and system status (stores UUID).
- `students`: Stores student-specific profiles (ID format: STU-YYYY-XXXX).
- `teachers`: Stores teacher-specific profiles (ID format: TEA-YYYY-XXXX).
- `admins`: Stores admin-specific profiles (ID format: ADM-YYYY-XXXX).

Policies ensure that users can only access data appropriate for their role and ID.

### Application Level

In addition to database-level security, the application implements role-based UI rendering and feature access:

```typescript
// Example of role-based UI rendering
const { role, studentId, teacherId } = useAuth();

return (
  <View>
    {/* Role-specific Dashboard */}
    {role === 'admin' && <AdminDashboard />}
    {role === 'teacher' && <TeacherDashboard teacherId={teacherId} />}
    {role === 'student' && <StudentDashboard studentId={studentId} />}
  </View>
);
```

### Authentication Flow

1. **Sign Up**:
   - New users sign up through the application.
   - By default, new users are assigned the 'student' role.
   - A trigger automatically creates a corresponding record in the `students` table.

2. **Sign In**:
   - Users sign in with email/password.
   - The application fetches the user's role from the `users` table.
   - It also fetches the specific role ID (e.g., `studentId`) from the respective table.
   - UI and permissions are adjusted based on the role and ID.

## Adding New Roles or Permissions

To add new roles or modify permissions:

1. Update the `users` table schema check constraint.
2. Create a new profile table for the role if necessary.
3. Modify the RLS policies in `backend/supabase/schema.sql`.
4. Update the `AuthContext.tsx` to fetch the new role's specific ID.
5. Adjust UI components.

## Best Practices

1. **Defense in Depth**: Implement access controls at both database and application levels
2. **Principle of Least Privilege**: Grant only the permissions necessary for each role
3. **Regular Audits**: Periodically review role assignments and permissions
4. **Clear Error Messages**: Provide appropriate feedback when users attempt unauthorized actions