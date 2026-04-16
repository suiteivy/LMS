# Cloudora LMS Beta Program Documentation

## Overview
The Cloudora LMS **Beta Program** (Beta Tier) is a permanent, limited-access tier reserved for pilot institutions, early partners, and smaller schools. It provides a stable "entry-level" permanent solution for institutions to manage their core academic and communication workflows.

---

## Core Characteristics
- **Status:** Permanently `active`. Beta institutions provide a long-term platform for pilot programs and specialized small-scale learning centers.
- **Acquisition:** Exclusively granted by a **Master Platform Admin** via the Master Admin Dashboard.
- **Duration:** Lifetime access with no expiration.

---

## Plan Limits & Capacity
The Beta tier is optimized for focused institutional management with the following capacity:

| Entity | Limit | Notes |
| :--- | :--- | :--- |
| **Students** | 30 | Total enrolled students across the institution. |
| **Administrators** | 1 | One primary institutional administrator account. |
| **Teachers** | Unlimited | Supporting staff and teaching faculty. |
| **Parents** | Unlimited | Direct access for student guardians. |

---

## Included Features

### 1. Unified Academic Management
- **Student & Staff Registry**: Comprehensive records management for all users.
- **Curriculum Organization**: Management of classes, subjects, and academic years.
- **Grading & Reporting**: Entry of scores and generation of academic reports.

### 2. Communication Suite
The Beta tier includes the full school-communication suite to ensure seamless collaboration:
- **Mass Messaging**: School-wide announcements and direct messaging for staff.
- **Virtual Diary**: Digital student journals for tracking daily milestones and teacher-parent communication.

### 3. Administrative Power Tools
- **Automated Timetabling**: Basic scheduling for subjects and teachers.
- **Profile Management**: Detailed metadata control for institutional identity.

---

## Extendable Modular Features
A unique capability of the Beta tier is the ability for a **Master Admin** to selectively unlock specific professional modules on a per-institution basis:

- **Finance & Accounting**: Professional bookkeeping and fee tracking.
- **Bursary Management**: Handling of student scholarships and financial aid.
- **Digital Library**: Cataloging and distribution of digital resources.
- **Institutional Analytics**: Data-driven insights into academic performance.
- **Digital Attendance**: Real-time tracking of student and staff presence.

---

## Technical Architecture
- **Rank Identification**: The system recognizes `beta` as a foundational tier (Rank 0).
- **Middleware Logic**: Core features are automatically enabled for the `beta` plan via the `subscriptionCheck` system.
- **UI Integration**: The interface dynamically adapts to show only the enabled modules, ensuring a clean and focused experience for Beta users.

---

## Administrative Management
Master Admins manage the Beta lifecycle via the platform dashboard:
1. **Provisioning**: Assignment of the "Beta Partner" plan during institution setup.
2. **Modular Upgrades**: Selective enabling of the features mentioned in the "Extendable" section via the Institution Edit panel.
3. **Ledger Integration**: Ability to record custom pilot support fees or manual payments in the platform ledger.
