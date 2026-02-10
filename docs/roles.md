# Role-Based Features and Access Control

This document outlines the different roles in the Learning Management System (LMS) and their associated permissions and features.

## Role Overview

The LMS supports three primary roles:

1. **Admin** - System administrators with full access to all features
2. **Teacher** - Educators who create and manage Subjects, assignments, and grades
3. **Student** - Learners who enroll in Subjects, submit assignments, and view grades

## Role Permissions Matrix

| Feature/Action                | Admin | Teacher | Student |
|------------------------------|:-----:|:-------:|:-------:|
| **User Management**          |       |         |         |
| View all users               |   âœ…   |    âœ…    |    âŒ    |
| Create users                 |   âœ…   |    âŒ    |    âŒ    |
| Update user roles            |   âœ…   |    âŒ    |    âŒ    |
| Delete users                 |   âœ…   |    âŒ    |    âŒ    |
| **Subject Management**        |       |         |         |
| View all Subjects             |   âœ…   |    âœ…    |    âŒ    |
| View enrolled Subjects        |   âœ…   |    âœ…    |    âœ…    |
| Create Subjects               |   âœ…   |    âœ…    |    âŒ    |
| Update any Subject            |   âœ…   |    âŒ    |    âŒ    |
| Update own Subjects           |   âœ…   |    âœ…    |    âŒ    |
| Delete Subjects               |   âœ…   |    âœ…*   |    âŒ    |
| **Assignment Management**     |       |         |         |
| View assignments             |   âœ…   |    âœ…    |    âœ…**  |
| Create assignments           |   âœ…   |    âœ…    |    âŒ    |
| Update assignments           |   âœ…   |    âœ…    |    âŒ    |
| Delete assignments           |   âœ…   |    âœ…    |    âŒ    |
| **Submission Management**     |       |         |         |
| View all submissions         |   âœ…   |    âŒ    |    âŒ    |
| View Subject submissions      |   âœ…   |    âœ…    |    âŒ    |
| View own submissions         |   âœ…   |    âœ…    |    âœ…    |
| Create submissions           |   âœ…   |    âœ…    |    âœ…    |
| Grade submissions            |   âœ…   |    âœ…    |    âŒ    |
| **Attendance Management**     |       |         |         |
| View all attendance records  |   âœ…   |    âŒ    |    âŒ    |
| View Subject attendance       |   âœ…   |    âœ…    |    âŒ    |
| View own attendance          |   âœ…   |    âœ…    |    âœ…    |
| Mark attendance (manual)     |   âœ…   |    âœ…    |    âŒ    |
| Log own attendance           |   âœ…   |    âœ…    |    âœ…    |
| **Institution Management**    |       |         |         |
| View institutions            |   âœ…   |    âœ…    |    âœ…    |
| Create/Update institutions   |   âœ…   |    âŒ    |    âŒ    |

\* Teachers can only delete their own Subjects  
\** Students can only view assignments for Subjects they're enrolled in

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
