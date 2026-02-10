<details> <summary>Click to expand full content</summary>

# 📚 Learning Management System (LMS)

A cross-platform Learning Management System built using **React Native** for the frontend and **Supabase** for the backend. This app supports role-based access (Admin, Student, Teacher), course management, assignments, attendance tracking, grading, notifications, and more.

## 🚀 Getting Started

### Prerequisites

- Node.js (v14 or later)
- Expo CLI
- Supabase account

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   cd frontend
   npm install
   ```
3. Set up environment variables:
   - Copy `.env.example` to `.env`
   - Update with your Supabase credentials

### Supabase Setup

#### 1. Create a Supabase Project
- Go to [supabase.com](https://supabase.com) and create a new project
- Note your project URL and anon key from Project Settings → API

#### 2. Configure Environment Variables
Create a `.env` file in the `frontend` directory:
```env
EXPO_PUBLIC_SUPABASE_URL=your-project-url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

#### 3. Set Up Database Schema
Run the consolidated SQL file `backend/supabase/schema.sql`. This file contains all necessary table definitions (users, students, teachers, admins, courses, etc.) and RLS policies.

1. Copy the content of `backend/supabase/schema.sql`
2. Paste it into the Supabase SQL Editor and run it.

#### 4. Create Admin User
> ⚠️ **Important**: Always create users through the Supabase Dashboard, not direct SQL inserts!

1. Go to **Authentication → Users** in your Supabase Dashboard
2. Click **"Add user"** → **"Create new user"**
3. Enter email, password, and check **"Auto Confirm User"**
4. Run this SQL to add the user to your app's users table:
   ```sql
   INSERT INTO public.users (id, email, full_name, role)
   SELECT id, email, 'System Administrator', 'admin'
   FROM auth.users WHERE email = 'your-admin@email.com';
   ```

See `backend/supabase/schemas/create_admin_user.sql` for detailed instructions.

### Running the App


```bash
cd frontend
npm start
```

---

## 📁 Project Structure

LMS-App/
├── apps/
│ ├── mobile/ # React Native frontend app
│ │ ├── src/
│ │ │ ├── components/ # Reusable UI components
│ │ │ ├── screens/ # Page views for each role (Admin, Student, Teacher)
│ │ │ ├── navigation/ # React Navigation logic
│ │ │ ├── services/ # API handlers to Supabase
│ │ │ ├── context/ # Global app context (Auth, User, Theme)
│ │ │ ├── hooks/ # Custom hooks (e.g., useAuth, useAttendance)
│ │ │ ├── assets/ # Images, icons, fonts
│ │ │ └── utils/ # Formatters, validators, helpers
│ │ └── App.tsx # Main entry point
│ └── functions/ # Firebase or Supabase triggers (notifications)
│ └── sendNotification.ts
├── backend/
│ ├── supabase/
│ │ ├── migrations/ # SQL migrations (auth, courses, users, etc.)
│ │ ├── seed/ # Seed scripts
│ │ ├── schemas/
│ │ │ ├── users.sql
│ │ │ ├── courses.sql
│ │ │ ├── lessons.sql
│ │ │ ├── assignments.sql
│ │ │ ├── submissions.sql
│ │ │ ├── grades.sql
│ │ │ ├── attendance.sql
│ │ │ └── institutions.sql
│ │ └── roles_policy.sql # Role-based access control policies
│ └── storage_rules.sql # Supabase storage (files, validations)
├── docs/
│ ├── roadmap.md # Weekly breakdown
│ ├── architecture.md # System design & flow
│ ├── api_reference.md # API endpoints + Supabase function calls
│ ├── roles.md # Role-based features & access
│ ├── onboarding.md # Setup instructions for devs
│ └── demo_plan.md # Final presentation/demo checklist
├── tests/
│ ├── unit/ # Unit tests for utilities/services
│ ├── integration/ # E2E flow (login, enroll, submit)
│ └── qa/ # Scripts and scenarios for QA testers
├── .env.example # Template for environment variables
├── .gitignore
├── README.md # Overview, setup, and contribution guide
├── package.json
└── LICENSE
