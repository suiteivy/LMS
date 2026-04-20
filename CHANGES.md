# System Changes - April 15, 2026

This document summarizes recent critical updates to the Cloudora LMS platform to resolve institution enrollment issues and improve system robustness.

## 1. Database Schema Updates (Supabase)

> [!IMPORTANT]
> These changes must be applied to the live Supabase database for the enrollment feature to function correctly.

### `users` Table
- **Added `status` column**: This column was missing from the live database. It supports user moderation and security.
- **Constraint**: Added a `CHECK` constraint to allow only `'pending'`, `'approved'`, or `'rejected'`.
- **Default**: New users default to `'approved'` to prevent system lockout.
```sql
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'approved' 
CHECK (status IN ('pending', 'approved', 'rejected'));
```

### `institutions` Table
- **Expanded Plans**: Updated the `subscription_plan` constraint to include plans used by the frontend.
- **Added**: `'free'` and `'beta_free'` to the allowed values.
```sql
ALTER TABLE institutions DROP CONSTRAINT IF EXISTS institutions_subscription_plan_check;
ALTER TABLE institutions ADD CONSTRAINT institutions_subscription_plan_check 
CHECK (subscription_plan IN ('trial', 'beta', 'beta_free', 'free', 'basic', 'pro', 'premium', 'custom'));
```

---

## 2. Backend Controller Modifications

### `master_admin.controller.js`
- **Reliable Profile Sync**: Switched from `.update()` to `.upsert()` when creating the main admin profile during enrollment. This ensures the user record is created in `public.users` even if the Supabase Auth trigger is missing or delayed.
- **Enhanced Debugging**: Added detailed error logging and human-readable hints to the `enrollInstitution` endpoint to simplify troubleshooting of database or auth failures.

---

## 3. UI and Stability Fixes

### Navigation & Layout
- **Expo Router Fix**: Resolved a "Screen names must be unique" crash in the Master Admin dashboard by cleaning up duplicate tab registrations in `frontend/app/(master-admin)/_layout.tsx`.
- **React Web Optimization**: Patched various components (e.g., `Sidebar.tsx`) to handle the `collapsable` prop correctly on web, eliminating non-boolean attribute warnings.

---

## Verification Status
- [x] Schema mismatches identified via backend logs.
- [x] Controller logic hardened for profile mapping.
- [x] Navigation crash resolved.
- [ ] Final verification of institution creation (Pending SQL execution on live DB).
