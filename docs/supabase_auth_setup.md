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

Execute the consolidated schema script:

```bash
# Connect to your Supabase project SQL editor and run:
source backend/supabase/schema.sql
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

1. Sign up a new user through the app.
2. In Supabase SQL Editor:
    a. Update the user's role in the `users` table.
    b. Insert a corresponding record into the `admins` table.

```sql
-- 1. Update user role
UPDATE users
SET role = 'admin'
WHERE email = 'admin@example.com';

-- 2. Create admin profile (Replace UUID with actual user ID from users table)
INSERT INTO admins (user_id, id)
VALUES ('replace-with-uuid', 'ADM-2024-001');
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