# Getting Started

## Prerequisites
- Node.js (v18+)
- Expo CLI
- Supabase Account

## Installation

1.  **Clone the repository**
    ```bash
    git clone <repository-url>
    cd LMS
    ```

2.  **Install dependencies**
    ```bash
    cd frontend
    npm install
    ```

3.  **Environment Setup**
    Create a `.env` file in `frontend/` with your Supabase credentials:
    ```env
    EXPO_PUBLIC_SUPABASE_URL=your_project_url
    EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
    ```

4.  **Database Setup**
    - Run the migrations in `backend/supabase/migrations/` via Supabase Dashboard SQL Editor or CLI.
    - Seed initial data if available.

5.  **Run the App**
    ```bash
    npx expo start
    ```

## Troubleshooting
- **Missing dependencies**: Run `npm install` again.
- **Supabase connection error**: Verify your `.env` variables.
