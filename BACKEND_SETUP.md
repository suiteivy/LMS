# Backend Setup & Run Guide

This project uses a hybrid architecture:
- **Frontend**: Expo / React Native (uses Supabase directly for Auth, Notifications, and some data).
- **Backend**: Node.js / Express (handles complex transactions like Finance and Library stock management).

To fully utilize the app (especially Finance and Library features), you **MUST** run the backend server locally.

## Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- A Supabase project (URL and Service Role Key)

## 1. Environment Setup

Navigate to the `backend` directory:
```bash
cd backend
```

Create a `.env` file in the `backend` directory if it doesn't exist. Add the following credentials:
```env
PORT=4001
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```
> **Note**: The `SUPABASE_SERVICE_ROLE_KEY` is required because the backend needs admin privileges to manage users and bypass Row Level Security (RLS) for certain operations. You can find this in your Supabase Dashboard under Project Settings > API.

## 2. Installation

Install the backend dependencies:
```bash
npm install
```

## 3. Running the Server

Start the server in development mode (with hot-reload):
```bash
npm run dev
```
OR start it normally:
```bash
npm start
```

You should see:
```
Server running on port 4001
```

## 4. Frontend Configuration

Ensure your frontend knows where the backend is running.
Check `frontend/services/api.ts`:
- Android Emulator: `http://10.0.2.2:4001/api`
- iOS Simulator / Web: `http://localhost:4001/api`
- Physical Device: Replace `localhost` with your computer's local IP address (e.g., `http://192.168.1.50:4001/api`).

## Troubleshooting

- **"Unauthorized" errors**: Ensure your frontend is sending the Auth header (handled automatically by `api.ts`).
- **"Network request failed"**:
    - On Android, ensure you are using `10.0.2.2` instead of `localhost`.
    - Verification: Open the browser on your emulator and try visiting `http://10.0.2.2:4001/api/health` (if a health route exists) or just the root.
