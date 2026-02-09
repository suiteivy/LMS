# LMS Frontend - Expo React Native App 📱

This is the frontend application for the Learning Management System, built with [Expo](https://expo.dev) and React Native.

## Prerequisites

- Node.js (v14 or later)
- npm or yarn
- Expo CLI (installed automatically with npx)

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Create a `.env` file in this directory with your Supabase credentials:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

Get these values from your Supabase project: **Project Settings → API**

### 3. Start the Development Server

```bash
npm start
```

This opens Expo DevTools. You can then:
- Press `w` to open in web browser
- Press `a` to open in Android emulator
- Press `i` to open in iOS simulator
- Scan QR code with Expo Go app on your phone

## Project Structure

```
frontend/
├── app/                    # App screens (file-based routing)
│   ├── (admin)/           # Admin dashboard and features
│   ├── (auth)/            # Authentication screens (signIn, signUp)
│   ├── (student)/         # Student features
│   ├── (teacher)/         # Teacher features
│   └── index.tsx          # Entry point
├── components/            # Reusable UI components
├── contexts/              # React contexts (Auth, etc.)
├── hooks/                 # Custom React hooks
├── libs/                  # External service configurations (Supabase)
├── services/              # API service functions
├── types/                 # TypeScript type definitions
└── utils/                 # Utility functions
```

## User Roles

The app supports three roles:
- **Admin**: Full system access, user management, analytics
- **Teacher**: Course management, grading, attendance
- **Student**: Course enrollment, assignments, grades

## Troubleshooting

### "Database error querying schema"
This error occurs when the `public.users` table is not accessible:
1. Ensure the user exists in BOTH `auth.users` AND `public.users`
2. Check that RLS policies allow read access, or RLS is disabled
3. Run: `GRANT SELECT ON public.users TO anon, authenticated;`

### Module not found errors
Clear the Metro bundler cache:
```bash
npx expo start --clear
```

### Environment variables not loading
- Ensure `.env` file is in the `frontend` directory
- Restart the development server after changing `.env`
- Variables must be prefixed with `EXPO_PUBLIC_`

## Learn More

- [Expo Documentation](https://docs.expo.dev/)
- [React Native Documentation](https://reactnative.dev/)
- [Supabase Documentation](https://supabase.com/docs)
