# LMS Database Setup

Run these scripts **in order** in the Supabase SQL Editor:

| Step | File | Description |
|------|------|-------------|
| 1 | `01_tables.sql` | Creates all database tables |
| 2 | `02_rls_policies.sql` | Sets up Row Level Security policies |
| 3 | `03_create_admin.sql` | Creates the initial admin user |

## Quick Start

1. Go to your **Supabase Dashboard** → **SQL Editor**
2. Copy and paste each file's contents in order
3. Click **Run** after each one

## Default Admin Credentials

- **Email:** `admin@lms.com`
- **Password:** `Admin@123456`

> ⚠️ Change these in `03_create_admin.sql` before running!
