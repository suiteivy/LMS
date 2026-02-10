# Copilot Instructions for LMS Codebase

## Overview
This project is a cross-platform Learning Management System (LMS) with:
- **Frontend:** React Native (Expo) in `frontend/` (role-based, file-routed, uses Supabase)
- **Backend:** Node.js/Express API in `backend/` (RESTful, connects to Supabase, role-based auth)
- **Database:** Supabase (Postgres) with RLS, SQL migrations, and triggers in `backend/supabase/`

## Key Architectural Patterns
- **Role-based Access:** Admin, Teacher, Student roles are enforced in both frontend and backend. See `frontend/app/(admin|teacher|student)/` and backend controllers/routes.
- **API Communication:** Frontend uses service modules in `frontend/services/` to call backend endpoints and Supabase directly (see `frontend/libs/supabase.ts`).
- **Context & State:** React Contexts in `frontend/contexts/` manage auth, user, and school state. Use hooks in `frontend/hooks/` for logic reuse.
- **Database Schema:** All schema and RLS policies are in `backend/supabase/schemas/`. Migrations and triggers are in `backend/supabase/migrations/` and `backend/supabase/triggers.sql`.

## Developer Workflows
- **Frontend:**
  - Install: `cd frontend && npm install`
  - Start: `npm start` (Expo DevTools)
  - Env: `.env` in `frontend/` (must use `EXPO_PUBLIC_` prefix)
  - Clear cache: `npx expo start --clear`
- **Backend:**
  - Install: `cd backend && npm install`
  - Start: `npm start` (runs `backend/server.js`)
  - SQL: Run schema files in order (see main `README.md`)
- **Supabase:**
  - Create users via Supabase Dashboard, not direct SQL
  - See `backend/supabase/schemas/create_admin_user.sql` for admin setup

## Project Conventions
- **File-based Routing:** Frontend uses folders like `(admin)`, `(teacher)`, `(student)` in `frontend/app/` for role-specific screens.
- **API Services:** All backend API calls from frontend go through `frontend/services/`.
- **Type Definitions:** Shared types in `frontend/types/`.
- **Custom Hooks:** Place reusable logic in `frontend/hooks/`.
- **Testing:** (If present) tests live in `tests/` (unit, integration, QA scripts).

## Integration Points
- **Supabase:** Used for auth, storage, and database. Config in `frontend/libs/supabase.ts` and `backend/utils/supabaseClient.js`.
- **Backend API:** REST endpoints documented in `backend/README.md`.
- **Notifications:** (If present) triggers in `backend/supabase/functions/`.

## Examples
- To add a new teacher feature: create a screen in `frontend/app/(teacher)/`, add API logic in `frontend/services/TeacherService.tsx`, and update backend in `backend/controllers/teacher.controller.js` and `backend/routes/teacher.route.js`.
- To update schema: add SQL to `backend/supabase/schemas/`, run migration, and update types in `frontend/types/database.ts`.

## References
- Main project structure: see `README.md` in root and `frontend/`, `backend/`
- Supabase setup: see `backend/supabase/schemas/` and `README.md`
- API docs: see `backend/README.md`

---
For unclear or missing conventions, consult the relevant `README.md` or ask a maintainer.
