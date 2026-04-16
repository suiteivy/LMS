# Beta Partner Program - Test Credentials

This document contains the access credentials and overview for the **Beta Partner Academy** test environment. Use these accounts to verify the functionality of the `beta` subscription tier and individual module add-ons.

## 🏢 Institution Details
- **Name**: Beta Partner Academy
- **Location**: Tech District, Nairobi
- **Subscription Tier**: **Beta Partner** (Rank 0)
- **Status**: Active
- **Category**: Secondary (using 'Form' levels)
- **Email Domain**: `beta-academy.test`

---

## 🔐 Login Credentials

> [!IMPORTANT]
> **Universal Password**: `CloudoraBeta2026!`

### 1. Administrators
| Role | Email Address | Purpose |
| :--- | :--- | :--- |
| **Main Admin** | `admin@beta-academy.test` | Full institution control, managing settings and add-ons. |

### 2. Teachers
| Name | Email Address | Assigned Class |
| :--- | :--- | :--- |
| **Sarah Lead** | `teacher@beta-academy.test` | Form 1 Alpha |
| **Wilson Math** | `teacher2@beta-academy.test` | Form 2 Alpha |
| **Emma Science** | `teacher3@beta-academy.test` | Form 3 Alpha |

### 3. Students
| Name | Email Address | Class |
| :--- | :--- | :--- |
| **Alpha Zulu** | `student1@beta-academy.test` | Form 1 Alpha |
| **Omega Prime** | `student2@beta-academy.test` | Form 1 Alpha |
| **James Bond** | `stu3@beta-academy.test` | Form 2 Alpha |
| **Peter Parker** | `stu4@beta-academy.test` | Form 2 Alpha |
| **Bruce Wayne** | `stu5@beta-academy.test` | Form 3 Alpha |
| **Diana Prince** | `stu6@beta-academy.test` | Form 3 Alpha |

### 4. Parents
| Role | Email Address | Linked Student |
| :--- | :--- | :--- |
| **Parent 1** | `parent1@beta-academy.test` | Alpha Zulu (Student 1) |
| **Parent 2** | `parent2@beta-academy.test` | Omega Prime (Student 2) |
| **Parent 3** | `parent3@beta-academy.test` | James Bond (Student 3) |

---

## 📊 Pre-configured Test Data

### 🎓 Academic Structure
- **Classes**: Form 1 Alpha, Form 2 Alpha, Form 3 Alpha.
- **Attendance**: 14 days of realistic attendance logs (present/absent/late) pre-seeded for all students.
- **Library**: 4 books (Math, Biology, Gatsby, Physics) with active borrowing records.

### 💰 Financial Data
- **Transaction History**: Confirmed payments (5,000+ KES) for all students.
- **Pending Evidence**: `student1@beta-academy.test` has a pending M-Pesa payment proof awaiting admin verification.

---

## 🧪 Recommended Test Cases

1. **Feature Gating Check**:
   - Log in as the **Admin**.
   - Verify that **Messaging** and **Diary** modules are accessible (Base Beta features).
   - Verify that **Finance** and **Attendance** dashboards are accessible (enabled via `true` addon flags in database).

2. **Messaging Flow**:
   - Log in as a **Teacher** (e.g., `teacher@beta-academy.test`).
   - Send a message to the "Form 1 Alpha" class.
   - Log in as `student1@beta-academy.test` and verify receipt.

3. **Master Admin Oversight**:
   - Log in with **Master Admin** credentials.
   - Navigate to **Institutions** → **Beta Partner Academy**.
   - Toggle an add-on (e.g., `addon_analytics`) OFF and verify the module locks for the school admin.

---

## 🎬 Step-by-Step System Demonstration

### Scenario 1: Administrative Control (Admin Login)
1. **Login**: `admin@beta-academy.test`.
2. **Dashboard**: Show the Beta dashboard. Note the active add-ons (Library, Finance, etc.).
3. **Module Check**: Navigate to **Messaging** and compose a welcome broadcast.

### Scenario 2: Teacher & Student Interaction
1. **Teacher Action**: Sign in as `teacher@beta-academy.test`.
2. **Class View**: Open **My Classes** → **Form 1 Alpha**. Show the student list.
3. **Attendance**: View the 14-day attendance history bar for **Alpha Zulu**.

### Scenario 3: Parent & Multiple Students
1. **Login**: `parent1@beta-academy.test`.
2. **View child**: Show the dashboard for **Alpha Zulu**.
3. **Records**: Show the **Reports** and **Attendance** summary.

---
**Note:** All data is database-driven via the `beta_seeder.js` script. Retention is subject to the beta trial policy.
