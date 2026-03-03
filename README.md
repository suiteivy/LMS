# 📚 Learning Management System (LMS)

A comprehensive, role-based mobile application for managing educational institutions. Built with **React Native (Expo)** and **Supabase**.

## 🚀 Quick Links
- [**Getting Started**](docs/getting_started.md) - Setup and installation guide.
- [**Architecture**](docs/architecture.md) - High-level system design.
- [**API Reference**](docs/api_endpoints.md) - Backend API documentation.
- [**Roles & Permissions**](docs/roles.md) - Detailed role capabilities.

## ✨ Key Features
- **Master Platform Admin**: View `/(master-admin)` for global platform management, subscription controls, institution enrollment, and granting Beta Free access.
  - *Default Local Credentials:* `masteradmin@suiteivy.com` / `Master@123456`
- **Multi-Role Support**: Tailored experiences for Students, Teachers, Admins, and Parents.
- **Academic Management**: Grading, Attendance tracking, Subject management, and Timetables.
- **Finance & Bursary**: Fee payment tracking, bursary applications, and teacher payout management with dynamic currency support.
- **Library System**: Inventory tracking with automatic stock management and borrowing history.
- **Examination Module**: Exam scheduling and results management.
- **Real-time Communication**: Integrated messaging and notification system.

## 🛠️ Tech Stack
- **Frontend**: React Native, Expo Router, NativeWind (Tailwind CSS)
- **Backend**: Express.js (Node.js), Supabase (PostgreSQL, Auth, Storage)
- **Tools**: TypeScript, Lucide Icons, Axios

## 🤝 Contribution
Please read our [Architecture Guide](docs/architecture.md) before contributing. Ensure all new features include proper RLS policies and Type definitions.
