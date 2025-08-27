# Supabase Authentication Setup with Custom Roles

This document outlines the steps to configure Supabase authentication with custom roles (admin, teacher, student) for the Learning Management System (LMS).

## Prerequisites

- Supabase project created
- Access to Supabase dashboard
- Basic understanding of SQL and Supabase Row Level Security (RLS)

## Configuration Steps

### 1. Environment Variables

Ensure your `.env` file contains the following variables:

```
EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 2. Database Schema Setup

Execute the SQL scripts in the following order:

1. Create tables (users, courses, assignments, etc.)
2. Apply Row Level Security (RLS) policies
3. Apply authentication policies

```bash
# Connect to your Supabase project SQL editor and run:
# 1. Table creation scripts
source backend/supabase/schemas/users.sql
source backend/supabase/schemas/institutions.sql
source backend/supabase/schemas/courses.sql
source backend/supabase/schemas/lessons.sql
source backend/supabase/schemas/assignments.sql
source backend/supabase/schemas/submissions.sql
source backend/supabase/schemas/grades.sql
source backend/supabase/schemas/attendance.sql

# 2. RLS policies
source backend/supabase/schemas/roles_policy.sql

# 3. Auth policies
source backend/supabase/schemas/auth_policy.sql
```

### 3. Authentication Settings in Supabase Dashboard

1. **Enable Email Authentication**:
   - Go to Authentication > Providers
   - Enable Email provider
   - Configure if email confirmation is required

2. **Configure User Management**:
   - Go to Authentication > Users
   - You can manually create admin users here

### 4. Creating the First Admin User

The first admin user needs to be created manually since regular sign-up creates students by default:

1. Sign up a new user through the app (will be created as a student)
2. In Supabase SQL Editor, run:

```sql
UPDATE users
SET role = 'admin'
WHERE email = 'admin@example.com'; -- Replace with the admin email
```

### 5. Testing Role-Based Access

Test the authentication flow with different roles:

1. **Admin**: Should have access to all features
2. **Teacher**: Should be able to create courses, assignments, and grade submissions
3. **Student**: Should be able to view courses, submit assignments, and view grades

## Troubleshooting

### Common Issues

1. **RLS Policy Conflicts**:
   - If you encounter permission issues, check the RLS policies in `roles_policy.sql`
   - Ensure policies don't contradict each other

2. **User Registration Issues**:
   - Verify the trigger function in `auth_policy.sql` is working correctly
   - Check Supabase logs for any errors during registration

3. **Role Not Being Applied**:
   - Ensure the `fetchUserRole` function in `AuthContext.tsx` is being called
   - Check the database query for retrieving the user role

## Next Steps

1. Implement role-specific UI components and screens
2. Add more granular permissions as needed
3. Consider implementing institution-based access control for multi-tenant scenarios