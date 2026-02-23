# LMS Frontend - Expo React Native App 📱

This is the frontend application for the Learning Management System, built with [Expo](https://expo.dev) and React Native.

## Prerequisites

- Node.js (v18 or later)
- npm or yarn
- Expo CLI

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
Create a `.env` file in the `frontend` directory:
```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### 3. Start the Development Server
```bash
npm start
```

## Project Structure

```
frontend/
├── app/                    # App screens (file-based routing)
│   ├── (admin)/            # Admin-only features
│   ├── (auth)/             # Auth: Sign In, Sign Up, Trial
│   ├── (parent)/           # Parent monitoring
│   ├── (student)/          # Student dashboard & tools
│   ├── (teacher)/          # Teacher academic tools
│   ├── (bursary)/          # Bursary specific flows
│   └── index.tsx           # Entry point
├── components/             # Shared UI components
├── contexts/               # Global state (Auth, Theme)
├── services/               # Backend API integration
└── types/                  # TypeScript definitions
```

## User Roles

The app supports four primary roles:
- **Admin**: Institutional management and analytics.
- **Teacher**: Grading, attendance, and subject management.
- **Student**: Course materials, grades, and finance.
- **Parent**: Student performance and fee tracking.

## Troubleshooting

### "Database error querying schema"
Ensure the user exists in both `auth.users` and `public.users` tables and RLS policies allow authenticated access.

### Module not found errors
Clear the Metro bundler cache:
```bash
npx expo start --clear
```

## Learn More
- [Expo Documentation](https://docs.expo.dev/)
- [Supabase Documentation](https://supabase.com/docs)
