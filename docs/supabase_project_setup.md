# Supabase Project Setup Guide

This guide will walk you through setting up a Supabase project for the Learning Management System (LMS) application.

## Creating a Supabase Project

1. **Sign up/Login to Supabase**
   - Go to [https://supabase.com/](https://supabase.com/)
   - Click on "Start your project" or "Sign In"
   - Create an account or log in with GitHub, GitLab, etc.

2. **Create a New Project**
   - Click on "New Project"
   - Select an organization (create one if needed)
   - Enter a name for your project (e.g., "LMS-App")
   - Set a secure database password (save this somewhere safe)
   - Choose a region closest to your users
   - Click "Create new project"

3. **Wait for Project Initialization**
   - Supabase will set up your project (this may take a few minutes)

## Getting Project Credentials

1. **Access Project Settings**
   - Once your project is created, go to the project dashboard
   - Click on the gear icon (⚙️) in the left sidebar to access settings
   - Select "API" from the settings menu

2. **Copy Project URL and API Keys**
   - Under "Project URL", copy the URL (e.g., `https://abcdefghijklm.supabase.co`)
   - Under "Project API keys", copy the "anon" public key
   - These will be used in your `.env` file

3. **Update Environment Variables**
   - Open the `.env` file in your project
   - Update the following variables with your copied values:
     ```
     EXPO_PUBLIC_SUPABASE_URL=your_copied_project_url
     EXPO_PUBLIC_SUPABASE_ANON_KEY=your_copied_anon_key
     ```

## Database Setup

### Consolidated Setup

Use the consolidated schema file for specific table structure and policies:

1. **Access SQL Editor**
   - In the Supabase dashboard, click on "SQL Editor".
   - Click "New query".

2. **Run The Schema Script**
   - Copy the contents of `backend/supabase/schema.sql`.
   - Paste it into the editor and run it.
   - This script creates all tables (`users`, `students`, `teachers`, `admins`, `courses`, etc.) and sets up RLS policies.

3. **Create Admin User**
   - Use the Supabase Dashboard to create a new user.
   - Manually insert the user into the `admins` table or use a helper script if available.


## Authentication Configuration

1. **Configure Authentication Providers**
   - In the Supabase dashboard, click on "Authentication" in the left sidebar
   - Go to "Providers" tab
   - Enable "Email" provider
   - Configure settings as needed (e.g., whether to require email confirmation)

2. **Configure Email Templates (Optional)**
   - Go to "Email Templates" tab
   - Customize the email templates for confirmation, magic link, etc.

## Storage Configuration (Optional)

1. **Create Storage Buckets**
   - In the Supabase dashboard, click on "Storage" in the left sidebar
   - Create buckets for different types of files (e.g., "profile-images", "assignments", "course-materials")

2. **Configure Storage Permissions**
   - Apply the storage rules from `storage_rules.sql` to secure your buckets

## Testing Your Setup

1. **Test Authentication**
   - Run your application
   - Try signing up a new user
   - Verify the user is created in the Supabase dashboard under "Authentication" > "Users"

2. **Test Database Access**
   - Create test records in various tables
   - Verify that RLS policies are working correctly by testing access with different user roles

## Troubleshooting

- **Database Errors**: Check the SQL logs in Supabase dashboard under "Database" > "Logs"
- **Authentication Issues**: Check the auth logs in Supabase dashboard under "Authentication" > "Logs"
- **API Errors**: Verify your environment variables are correctly set

## Next Steps

After setting up your Supabase project, proceed to the [Supabase Authentication Setup with Custom Roles](./supabase_auth_setup.md) guide to configure role-based authentication.