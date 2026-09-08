# 🎓 Cloudora LMS — Institutional Training & Master Implementation Guide
*A Complete Step-by-Step Operator Manual, Module-by-Module Handbook, and Competitive Analysis*

---

## 📑 Table of Contents
1. [Executive Overview & System Architecture](#1-executive-overview--system-architecture)
2. [End-to-End Master Implementation Roadmap (Beginning to End)](#2-end-to-end-master-implementation-roadmap-beginning-to-end)
   - [Phase 1: Admin Activation & Institutional Identity](#phase-1-admin-activation--institutional-identity)
   - [Phase 2: Academic Foundations & Grading Infrastructure](#phase-2-academic-foundations--grading-infrastructure)
   - [Phase 3: Institutional Hierarchy (Categories, Levels & Streams)](#phase-3-institutional-hierarchy-categories-levels--streams)
   - [Phase 4: Curriculum, Departments & Subject Architecture](#phase-4-curriculum-departments--subject-architecture)
   - [Phase 5: Faculty Onboarding & Teaching Assignments](#phase-5-faculty-onboarding--teaching-assignments)
   - [Phase 6: Campus Operating Hours & Conflict-Free Timetable Generation](#phase-6-campus-operating-hours--conflict-free-timetable-generation)
   - [Phase 7: Student & Parent Dual Enrollment with Credential Delivery](#phase-7-student--parent-dual-enrollment-with-credential-delivery)
   - [Phase 8: Financial Structure, Tuition Billing & Bursary Allocation](#phase-8-financial-structure-tuition-billing--bursary-allocation)
   - [Phase 9: Library & Digital E-Resource Cataloging](#phase-9-library--digital-e-resource-cataloging)
   - [Phase 10: Institutional Communication & Campus Launch](#phase-10-institutional-communication--campus-launch)
3. [Deep-Dive Guides for Every Individual Module](#3-deep-dive-guides-for-every-individual-module)
   - [Module 1: Academic Setup (Years, Terms, Scales, Assessment Types)](#module-1-academic-setup-years-terms-scales-assessment-types)
   - [Module 2: Class & Stream Management](#module-2-class--stream-management)
   - [Module 3: Subjects & Curriculum Assignment](#module-3-subjects--curriculum-assignment)
   - [Module 4: User Management, Enrollment & Credential Cards](#module-4-user-management-enrollment--credential-cards)
   - [Module 5: Smart Timetable Builder & Conflict Engine](#module-5-smart-timetable-builder--conflict-engine)
   - [Module 6: Daily Attendance Tracking (Staff & Students)](#module-6-daily-attendance-tracking-staff--students)
   - [Module 7: The Virtual Diary (Classroom Logs & Parent Sign-Off)](#module-7-the-virtual-diary-classroom-logs--parent-sign-off)
   - [Module 8: Continuous Assessment, Grading & Exams](#module-8-continuous-assessment-grading--exams)
   - [Module 9: Results Verification & Terminal Report Cards](#module-9-results-verification--terminal-report-cards)
   - [Module 10: Automated Student Promotion & Retention Engine](#module-10-automated-student-promotion--retention-engine)
   - [Module 11: Finance, Bursary Applications & Teacher Payouts](#module-11-finance-bursary-applications--teacher-payouts)
   - [Module 12: Physical Library & Digital Resource Catalog](#module-12-physical-library--digital-resource-catalog)
   - [Module 13: Real-Time Communication & Emergency Broadcasts](#module-13-real-time-communication--emergency-broadcasts)
   - [Module 14: System Analytics & Executive Decision Support](#module-14-system-analytics--executive-decision-support)
   - [Module 15: Accessibility & Personalized Learning Engine](#module-15-accessibility--personalized-learning-engine)
   - [Module 16: In-App Support Desk & Feature Requests](#module-16-in-app-support-desk--feature-requests)
4. [Competitive Comparison: Cloudora LMS vs. Industry Alternatives](#4-competitive-comparison-cloudora-lms-vs-industry-alternatives)
   - [Comprehensive Feature Matrix](#comprehensive-feature-matrix)
   - [Why Cloudora LMS is Superior](#why-cloudora-lms-is-superior)
5. [Institutional Training & Change Management Playbook](#5-institutional-training--change-management-playbook)
   - [7-Day Pre-Launch Implementation Checklist](#7-day-pre-launch-implementation-checklist)
   - [2-Hour Fast-Track Faculty Training Agenda](#2-hour-fast-track-faculty-training-agenda)
   - [Parent & Student Launch Communication Template](#parent--student-launch-communication-template)
   - [Troubleshooting Common Operational Hurdles](#troubleshooting-common-operational-hurdles)

---

## 1. Executive Overview & System Architecture

**Cloudora LMS** is a unified, mobile-first, and enterprise-grade School Operations and Learning Management System designed to harmonize school administration, classroom instruction, parental engagement, and financial management in a single real-time ecosystem.

Unlike traditional fragmented software stacks that force an institution to juggle distinct platforms for grading, fees, library management, and communication, Cloudora unites all stakeholders into a coordinated digital campus:

```
                          ┌───────────────────────────┐
                          │    PLATFORM MASTER ADMIN  │
                          │ (Licensing, Tiers, Add-ons│
                          └─────────────┬─────────────┘
                                        │ Provisions
                                        ▼
                          ┌───────────────────────────┐
                          │     INSTITUTION ADMIN     │
                          │ (Campus Orchestration Hub)│
                          └──────┬───────────┬────────┘
             ┌───────────────────┼───────────┴───────────────────┐
             ▼                   ▼                               ▼
   ┌───────────────────┐ ┌───────────────┐             ┌───────────────────┐
   │     TEACHERS      │ │    BURSAR     │             │      PARENTS      │
   │  - Diary Logs     │ │  - Tuition    │             │  - Diary Sign-off │
   │  - Assessments    │ │  - Bursaries  │             │  - Fee Payments   │
   │  - Attendance     │ │  - Payouts    │             │  - Report Cards   │
   └─────────┬─────────┘ └───────────────┘             └─────────┬─────────┘
             │ Links To                                          │ Monitors
             └───────────────────► ┌───────────┐ ◄───────────────┘
                                   │  STUDENTS │
                                   └───────────┘
```

### Architectural Principles
* **Multi-Tenant Row-Level Security (RLS)**: Every user, record, transaction, and grade is strictly bound to the school's unique `institution_id`. No cross-institutional data leakage is physically possible.
* **Instant Reactive Sync**: Backed by PostgreSQL and Supabase Realtime, updates made by teachers (such as taking attendance or publishing a diary entry) reflect on parent and student devices within milliseconds without manual reloading.
* **Cross-Platform Parity**: Built using React Native and Expo Router, delivering smooth performance on iOS, Android, tablets, and Desktop web browsers with full theme adaptation (Light Mode, Midnight Dark Mode, and Liquid Glass UI).

---

## 2. End-to-End Master Implementation Roadmap (Beginning to End)

This roadmap describes the **exact, mandatory chronological sequence** that an institution must follow once the Master Admin has created the institution account and provisioned the primary Institution Administrator.

> [!IMPORTANT]
> **Strict Dependency Rule**: Do NOT attempt to enroll students before creating classes and academic terms, and do NOT create timetable schedules before enrolling teachers and defining subjects. Follow the 10 sequential phases below to guarantee seamless onboarding.

```
[Phase 1: Admin Activation & Branding]
                 │
                 ▼
[Phase 2: Academic Setup (Years, Terms, Scales, Weights)]
                 │
                 ▼
[Phase 3: Class Hierarchy (Levels & Streams)]
                 │
                 ▼
[Phase 4: Subject Curriculum & Department Setup]
                 │
                 ▼
[Phase 5: Faculty Onboarding & Class Teacher Assignments]
                 │
                 ▼
[Phase 6: School Hours & Conflict-Free Timetable Builder]
                 │
                 ▼
[Phase 7: Student & Parent Dual-Enrollment + Credential Cards]
                 │
                 ▼
[Phase 8: Tuition Fee Schedules & Bursary Policies]
                 │
                 ▼
[Phase 9: Library Cataloging & Digital Learning Resources]
                 │
                 ▼
[Phase 10: Campus Communication & Go-Live]
```

---

### Phase 1: Admin Activation & Institutional Identity
**Goal**: Secure administrator credentials, configure the school’s legal/display profile, and establish regional localization.

1. **First-Time Login**:
   * Navigate to the login screen and enter the initial administrative email and the temporary password provided by the Platform Master Admin.
   * **Route**: `/(auth)/sign-in`
2. **Immediate Password Hardening**:
   * The system prompts the administrator to change the temporary password upon initial access.
   * Enter a high-entropy password complying with security policy: minimum 8 characters, at least one uppercase letter (`A-Z`), one lowercase letter (`a-z`), and one numeric digit (`0-9`).
3. **Institutional Identity & Localization**:
   * Navigate to **Settings** (`/(admin)/settings`).
   * **Institution Name & Official Code**: Verify official registration details.
   * **Logo & Crest Upload**: Upload high-resolution crest (PNG/SVG) which will automatically brand student report cards, invoices, and login screens.
   * **Currency & Timezone**: Select the school's operating currency (e.g., USD `$`, ZAR `R`, NGN `₦`, KES `KSh`, GBP `£`, EUR `€`) and local timezone.
   * **Class Structure Vocabulary**: Configure whether the institution uses **"Grade"**, **"Form"**, **"Year"**, or **"Class"** as its institutional level prefix.

---

### Phase 2: Academic Foundations & Grading Infrastructure
**Goal**: Establish the calendar and assessment rules that govern gradebooks, attendance periods, and student transcripts.

1. **Create the Current Academic Year**:
   * Navigate to **Manage** -> **Academic Setup** -> **Academic Years** (`/(admin)/academic-setup`).
   * Click **+ Add Academic Year**.
   * Enter the name (e.g., `2026-2027 Academic Session`), set Start Date (e.g., `2026-09-01`), End Date (e.g., `2027-07-15`), and toggle **Current Academic Year** to `ACTIVE`.
2. **Define Academic Terms / Semesters**:
   * Under the active year, click **+ Add Term**.
   * Create the school terms (e.g., `Term 1 / Autumn`, `Term 2 / Spring`, `Term 3 / Summer`).
   * Specify accurate start and end dates for each term. The system uses these dates to automatically activate the current term for attendance registers and diary entries.
3. **Set Up the Institutional Grading Scale**:
   * Switch to the **Grading Scales** tab.
   * Select a standard preset (e.g., **Standard 7-Point GPA Scale**, **WAEC West African Scale**, or **Cambridge International IGCSE Scale**) or define custom brackets:
     * *A (90–100%, 4.0 GPA, "Excellent")*
     * *B+ (80–89%, 3.5 GPA, "Very Good")*
     * *B (70–79%, 3.0 GPA, "Good")*
     * *C+ (60–69%, 2.5 GPA, "Above Average")*
     * *C (50–59%, 2.0 GPA, "Average")*
     * *D (40–49%, 1.0 GPA, "Pass")*
     * *F (0–39%, 0.0 GPA, "Fail")*
4. **Establish Assessment Types & Score Weighting**:
   * Switch to the **Assessment Types** tab.
   * Define grading components and their default percentages contributing to the terminal score:
     * `Homework / Continuous Assessment (CA 1)`: **15%**
     * `Mid-Term Test (CA 2)`: **25%**
     * `Class Projects / Practical Work`: **10%**
     * `Final End-of-Term Examination`: **50%**
   * *Total combined weight must equal 100%.*

---

### Phase 3: Institutional Hierarchy (Categories, Levels & Streams)
**Goal**: Map physical classrooms and student cohorts into structured levels.

1. **Establish School Categories**:
   * If the institution spans multiple divisions (e.g., *Nursery*, *Primary School*, *Junior Secondary*, *Senior Secondary*), navigate to **Manage** -> **Classes** (`/(admin)/classes`).
   * Confirm the distinct category tiers.
2. **Generate Levels (Grades/Forms)**:
   * Define the specific class stages (e.g., *Grade 1* through *Grade 12* or *Form 1* through *Form 6*).
3. **Configure Streams / Divisions**:
   * For each level, add designated streams (e.g., *Form 1 Blue*, *Form 1 Gold*, *Grade 10 Science*, *Grade 10 Arts*).
   * Set maximum student capacity per stream (e.g., 35 students) to enable automated class fullness warnings.

---

### Phase 4: Curriculum, Departments & Subject Architecture
**Goal**: Build the course catalog and define graduation subject requirements.

1. **Create Academic Departments**:
   * Navigate to **Manage** -> **Subjects & Curricula** (`/(admin)/management/subjects`).
   * Group disciplines into departments (e.g., *Department of Sciences & Mathematics*, *Department of Humanities*, *Department of Languages*).
2. **Add Courses & Subjects**:
   * Click **+ Add Subject** (`/(admin)/management/subjects/create`).
   * Enter:
     * **Subject Title**: (e.g., `Core Mathematics`, `Physics`, `English Literature`).
     * **Subject Code**: (e.g., `MTH-101`, `PHY-201`).
     * **Credit Units / Weekly Periods**: (e.g., 4 periods/week).
     * **Applicable Level / Class**: Bind the subject to its target grade level.
     * **Compulsory vs. Elective**: Designate core mandatory subjects vs. optional tracks.

---

### Phase 5: Faculty Onboarding & Teaching Assignments
**Goal**: Provision instructor accounts, assign class teachers, and allocate subject teaching loads.

1. **Enroll Teaching Staff**:
   * Navigate to **Users** -> **Enroll User** (`/(admin)/users/create`).
   * Select **Role: Teacher**.
   * Fill in faculty details: First Name, Last Name, Official Email, Phone, Department, Qualification (e.g., `B.Ed, M.Sc`), and Specialization.
   * Click **Generate & Save**.
   * The system provisions the account and issues a **Credential Delivery Slip** containing an auto-generated temporary 8-character password.
2. **Assign Class Teachers (Form Tutors / Homeroom Advisors)**:
   * Open **Manage** -> **Classes** (`/(admin)/classes`).
   * Select a class stream (e.g., *Grade 10 Blue*) and assign the designated Lead Class Teacher.
   * *Role responsibility*: Class teachers have primary authority over morning attendance registers, virtual diary daily submissions, and terminal report card remarks.
3. **Allocate Subject Teaching Loads**:
   * Open **Manage** -> **Subjects & Curricula** (`/(admin)/management/subjects`).
   * For each subject stream, assign the specialized Subject Teacher.
   * *Role responsibility*: Subject teachers enter assessment marks, homework assignments, and subject-specific teacher commentary.

---

### Phase 6: Campus Operating Hours & Conflict-Free Timetable Generation
**Goal**: Configure daily period slots and generate weekly classroom schedules with automated collision detection.

1. **Configure Campus Hours & Bell Schedule**:
   * Navigate to **Manage** -> **Timetable Builder** (`/(admin)/timetable`).
   * Define school operating days (e.g., *Monday through Friday*).
   * Set daily bell times: Period start times, period durations (e.g., *45 minutes*), break intervals, and lunch periods.
2. **Build the Master Schedule**:
   * Select a class stream (e.g., *Grade 9 Red*).
   * For each day and period slot, assign:
     * **Subject** (from the approved curriculum).
     * **Instructor** (automatically pre-selected based on Phase 5 assignment).
     * **Room / Laboratory Number** (e.g., *Chemistry Lab 2*, *Room 104*).
3. **Execute Real-Time Conflict Analysis**:
   * The Cloudora Conflict Engine automatically checks every insertion against two critical constraints:
     * ❌ **Teacher Double-Booking**: Ensures an instructor cannot be scheduled in two different classrooms at the same minute.
     * ❌ **Room Collision**: Prevents two different classes from being booked in the same physical space simultaneously.
   * Resolve any highlighted warnings before clicking **Publish Timetable**.

---

### Phase 7: Student & Parent Dual Enrollment with Credential Delivery
**Goal**: Onboard learners, automatically link parents/guardians, and safely distribute credentials.

```
       ┌─────────────────────────────────────────────────────────┐
       │               ADMIN: ENROLL USER WIZARD                 │
       │                   (/(admin)/users/create)               │
       └────────────────────────────┬────────────────────────────┘
                                    │
                                    ▼
       ┌─────────────────────────────────────────────────────────┐
       │                   ENTER STUDENT PROFILE                 │
       │  Name, DOB, Gender, Address, Target Class & Stream      │
       └────────────────────────────┬────────────────────────────┘
                                    │
              ┌─────────────────────┴─────────────────────┐
              ▼                                           ▼
┌───────────────────────────┐               ┌───────────────────────────┐
│ LINK EXISTING GUARDIAN    │               │ CREATE NEW PARENT ACCOUNT │
│ Select parent from lookup │               │ Enter parent name, email, │
│ for multi-child families  │               │ phone, and relationship   │
└─────────────┬─────────────┘               └─────────────┬─────────────┘
              │                                           │
              └─────────────────────┬─────────────────────┘
                                    ▼
       ┌─────────────────────────────────────────────────────────┐
       │             SUBMIT ENROLLMENT TRANSACTION               │
       │  1. Student record created & enrolled in target class   │
       │  2. Parent record created/linked via parent_students    │
       │  3. Auto-generates high-entropy 8-char passwords        │
       │  4. Emits formatted CREDENTIAL DELIVERY SLIP            │
       └─────────────────────────────────────────────────────────┘
```

1. **Launch the Enrollment Wizard**:
   * Open **Users** -> **Enroll User** (`/(admin)/users/create`).
   * Select **Role: Student**.
2. **Student Demographic & Academic Placement**:
   * Enter First Name, Last Name, Date of Birth, Gender, Residential Address.
   * Select Academic Year, Category, Level, and target Class Stream.
3. **Parent Linkage (The Dual-Enrollment Advantage)**:
   * **Existing Parent**: If the student has siblings already in the institution, select **Link Existing Parent** and choose their profile. The new student is automatically appended to that parent’s portal.
   * **New Parent Account**: Toggle **Create Parent Account**. Enter the parent's full name, valid email address, phone number, and relationship (Mother, Father, Guardian).
4. **Credential Distribution**:
   * Upon pressing **Save & Enroll**, the system displays the **Credential Delivery Card**:
     * Student Registration ID (e.g., `STU-2026-0042`) & Temporary Password.
     * Parent ID (e.g., `PR-2026-0038`), login email, and Temporary Password.
   * Click **Print Credential Slip** or **Share Securely** to deliver login instructions to the family.

---

### Phase 8: Financial Structure, Tuition Billing & Bursary Allocation
**Goal**: Define billing rates, generate student fee statements, and establish scholarship relief.

1. **Define the Fee Structure by Grade Level**:
   * Navigate to **Finance** -> **Fee Structure** (`/(admin)/finance`).
   * Click **+ Create Fee Schedule**.
   * Define items:
     * **Base Tuition Fee**: (e.g., `$1,200` per term).
     * **Development & Facilities Levy**: (e.g., `$150`).
     * **Learning Materials / Lab Fee**: (e.g., `$75`).
     * **Teacher Payout Allocation Rate**: Portion earmarked for teaching payroll.
   * Set the effective term and target class levels.
2. **Establish Institutional Bursary / Scholarship Funds**:
   * Open the **Bursaries** tab (`/(admin)/finance/bursaries/create`).
   * Create dedicated relief programs (e.g., *Academic Excellence Scholarship*, *Need-Based Financial Aid*, *Staff Child Discount*).
   * Set fund ceilings, percentage coverage (e.g., *25%*, *50%*, or *100%* fee waiver), and application windows.
3. **Invoice Generation & Payment Recording**:
   * The system automatically generates opening balances for enrolled students based on their class fee structure.
   * School Bursars record payments under **Payments** -> **Record Payment**:
     * Select Student.
     * Enter Amount, Date, and Payment Method (Bank Wire, Mobile Money, Cash, Card).
     * Print or email the official digital receipt.

---

### Phase 9: Library & Digital E-Resource Cataloging
**Goal**: Digitize the institution's physical library books and publish digital learning materials.

1. **Catalog Physical Library Inventory**:
   * Navigate to **Manage** -> **Library Management** (`/(admin)/management/library`).
   * Click **+ Add Book**.
   * Enter Title, Author, ISBN, Category/Genre (e.g., *Pure Sciences*, *Literature in English*), Shelf Location, and Total Stock Quantity.
2. **Set Lending & Return Rules**:
   * Configure standard loan durations (e.g., *14 days*) and overdue notification triggers.
3. **Upload E-Learning Resources & Materials**:
   * Navigate to **Manage** -> **Materials & E-Resources** (`/(admin)/management/materials`).
   * Upload digital textbooks, past exam papers, and revision notes (PDF, EPUB, DOCX).
   * Tag resources with specific grade levels and subjects so they instantly appear in student and teacher library views.

---

### Phase 10: Institutional Communication & Campus Launch
**Goal**: Test end-to-end connectivity, issue campus-wide welcome alerts, and officially launch live operations.

1. **Publish Campus Welcome Announcement**:
   * Navigate to **Communication** (`/(admin)/communication`).
   * Create an announcement:
     * **Title**: `Welcome to the New Academic Session on Cloudora LMS!`
     * **Audience**: Broadcast to *All Staff, Students, and Parents*.
     * **Delivery**: In-app noticeboard + instant push notification.
2. **Conduct First-Day Teacher Roll-Call Check**:
   * Instruct all class teachers to log into the mobile/web app on Day 1.
   * Teachers record morning attendance at `/(teacher)/classes` and log their first Virtual Diary entry at `/(teacher)/classes`.
3. **Monitor Live System Health**:
   * Institution Admin monitors **Today's Presence** and **Enrollment Capacity** on the Admin Home Dashboard (`/(admin)`).

---

## 3. Deep-Dive Guides for Every Individual Module

---

### Module 1: Academic Setup (Years, Terms, Scales, Assessment Types)
* **Location in App**: `/(admin)/academic-setup`
* **Target Audience**: Institution Admins, Academic Directors, Principals.

#### Purpose & Capabilities
The core engine of the academic module. It enforces institutional academic calendar dates, prevents retroactive grade modifications via **Term Locking**, standardizes letter grade conversions, and defines the mathematical weights of continuous assessments.

#### Step-by-Step Operator Instructions
1. **Academic Year Configuration**:
   * Click **+ Add Academic Year**. Input the calendar label (e.g., `2026-2027`). Set boundary dates.
   * Mark the active year with the **Set Current** star icon. Only one academic year can be active at a time.
2. **Term Division & Locking**:
   * Click the expand chevron next to the active academic year.
   * Click **+ Add Term** to create *Term 1*, *Term 2*, and *Term 3*.
   * **Term Locking**: Once a term ends and all report cards have been released, click **Lock Term**.
   > [!CAUTION]
   > Locking a term makes all gradebooks, attendance registers, and diary logs for that term strictly read-only. Teachers cannot alter historical marks after a term is locked.
3. **Grading Scale Customization**:
   * Switch to the **Grading Scales** tab.
   * Review the default 7-point scale. To modify, click **Edit Bracket** or click **+ Add Grade Range**.
   * Ensure minimum and maximum score ranges do not overlap and collectively span 0 to 100%.
4. **Assessment Types & Weighting**:
   * Switch to the **Assessment Types** tab.
   * Ensure all active assessment codes (e.g., `HW`, `MID`, `PRJ`, `EXAM`) have weights totaling exactly 100%.

---

### Module 2: Class & Stream Management
* **Location in App**: `/(admin)/classes`
* **Target Audience**: Institution Admins, Vice Principals.

#### Purpose & Capabilities
Organizes students into cohorts, sets maximum class capacities, assigns homeroom class teachers, and tracks real-time enrollment numbers against capacity limits.

#### Step-by-Step Operator Instructions
1. **Creating a Class Stream**:
   * Click **+ Add Class** (`/(admin)/classes/create`).
   * Select Category (e.g., *Secondary School*).
   * Select Level (e.g., *Form 3* or *Grade 11*).
   * Select or type Stream identifier (e.g., *East*, *Science A*, *Ruby*).
   * Enter **Class Capacity** (e.g., `35`).
   * Select the **Class Teacher** from the faculty directory.
   * Click **Create Class**.
2. **Monitoring & Reassigning**:
   * From the class list, click any class card to view enrolled students, class attendance averages, and subject breakdown.
   * Click **Edit Class** to change the assigned class teacher or increase student capacity.

---

### Module 3: Subjects & Curriculum Assignment
* **Location in App**: `/(admin)/management/subjects`
* **Target Audience**: Academic Heads, Department Chairs.

#### Purpose & Capabilities
Maintains the school curriculum, defines course credit weights, links subjects to grade levels, and pairs subjects with qualified instructors.

#### Step-by-Step Operator Instructions
1. **Adding a New Subject**:
   * Click **+ Create Subject** (`/(admin)/management/subjects/create`).
   * Enter **Title** (e.g., `General Biology`), **Short Code** (e.g., `BIO-101`), and **Department**.
   * Bind the subject to target classes.
   * Assign primary subject instructors.
2. **Teacher-Subject Pairing**:
   * Open the subject details view (`/(admin)/management/subjects/details`).
   * If multiple teachers instruct different streams of the same subject (e.g., Teacher A teaches *Grade 10 Blue Biology*, Teacher B teaches *Grade 10 Red Biology*), click **Manage Teachers** to assign specific sections.

---

### Module 4: User Management, Enrollment & Credential Cards
* **Location in App**: `/(admin)/users`
* **Target Audience**: Admins, Registrars, IT Support Officers.

#### Purpose & Capabilities
Unified multi-role user directory providing credential generation, printable credential slips, bulk user filtering, account status toggling, and administrative password resets.

```
┌─────────────────────────────────────────────────────────────┐
│                 CLOUDORA LMS CREDENTIAL SLIP                │
│                 ============================                │
│  Institution : Springfield International Academy            │
│  User Full Name: Samantha Vance                             │
│  Assigned Role : Student (Grade 10 Blue)                    │
│  Student ID   : STU-2026-0042                              │
│  Access Email : samantha.vance@springfield.edu              │
│  Temporary PW : Wx8#mK92                                    │
│                                                             │
│  Linked Parent : Eleanor Vance (PR-2026-0038)               │
│  Parent Email  : eleanor.vance@gmail.com                    │
│  Parent Temp PW: Pq4$vL71                                   │
│                                                             │
│  * Please change your password upon your very first login.  │
└─────────────────────────────────────────────────────────────┘
```

#### Step-by-Step Operator Instructions
1. **Enrolling an Individual**:
   * Click **+ Enroll User** (`/(admin)/users/create`).
   * Follow the 5-step wizard: Role Selection -> Personal Bio -> Academic / Staff Details -> Parent Linkage -> Credential Output.
2. **Credential Delivery**:
   * Once saved, present or print the **Credential Delivery Slip**.
   * Instruct users to sign in with their temporary credentials and immediately complete the mandatory password update prompt.
3. **Handling Forgotten Passwords**:
   * **Beta Tier**: The system routes reset requests to the Institution Admin. Locate the user in `/(admin)/users/[id]` and click **Reset Password** to generate a fresh temporary password.
   * **Paid Tiers (Basic, Pro, Premium, Custom)**: Users click **Forgot Password?** on the login screen and receive a secure, 1-hour time-to-live reset token via email.

---

### Module 5: Smart Timetable Builder & Conflict Engine
* **Location in App**: `/(admin)/timetable`
* **Target Audience**: Vice Principals, Timetable Coordinators.

#### Purpose & Capabilities
A scheduling grid with real-time collision detection that prevents double-booking teachers, overlapping class periods, or reserving the same laboratory/room twice.

#### Conflict Severity Guide
* 🔴 **Error (Hard Block)**: Teacher or Room double-booked at the exact same hour. System prevents publishing.
* 🟡 **Warning**: Class scheduled with excessive consecutive periods of the same intensive subject (e.g., 3 consecutive Double Physics sessions).
* 🔵 **Info**: Teacher scheduling load exceeds recommended daily periods.

#### Step-by-Step Operator Instructions
1. Select the target class stream from the dropdown.
2. Click any empty period card on the weekly matrix.
3. Choose the **Subject**, **Assigned Teacher**, and **Room Location**.
4. The system validates the entry against the entire institution schedule in real time.
5. If a collision is detected, an alert banner explains the exact conflict (e.g., *"Mr. Henderson is already booked in Grade 11 Chemistry Lab at 10:00 AM on Wednesday"*).
6. Adjust the schedule until all errors are resolved, then click **Publish Schedule**.

---

### Module 6: Daily Attendance Tracking (Staff & Students)
* **Location in App**: 
  * Admin Overview: `/(admin)/attendance`
  * Teacher Register: `/(teacher)/classes`
  * Parent Child View: `/(parent)/attendance`
  * Student View: `/(student)/attendance`
* **Target Audience**: Teachers, School Admins, Attendance Officers, Parents.

#### Purpose & Capabilities
Enables fast, one-tap morning roll-calls. Provides attendance metrics (Present, Absent, Late, Excused) and triggers automated alerts to parents when a child is marked absent without prior leave.

#### Step-by-Step Operator Instructions
1. **Teacher Roll Call**:
   * Teacher logs into mobile or web app and selects their class.
   * Taps **Take Attendance**.
   * The roster opens with all students default-marked as **Present** (Green).
   * Tap any student to toggle status to **Absent** (Red), **Late** (Amber), or **Excused** (Blue).
   * Optional: Add a note (e.g., *"Arrived at 8:45 AM with medical slip"*).
   * Tap **Submit Register**.
2. **Admin Real-Time Oversight**:
   * Admin checks `/(admin)/attendance` to see real-time campus presence percentages and identify missing class registers.

---

### Module 7: The Virtual Diary (Classroom Logs & Parent Sign-Off)
* **Location in App**:
  * Teacher Log Entry: `/(teacher)/classes` -> Virtual Diary
  * Parent Review & Sign: `/(parent)/diary`
  * Student Homework View: `/(student)/diary`
* **Target Audience**: Teachers, Parents, Students.

#### Purpose & Capabilities
Replaces physical paper homework diaries. Teachers log daily lesson summaries, homework tasks, due dates, and behavioral notes. Parents inspect the diary and digitally sign it with a timestamped acknowledgment.

```
┌─────────────────────────────────────────────────────────────┐
│                 VIRTUAL DIARY ENTRY CARD                    │
├─────────────────────────────────────────────────────────────┤
│ Class    : Grade 5 Amber             Date: Oct 14, 2026     │
│ Teacher  : Mrs. Sarah Jenkins        Subject: English Lang  │
├─────────────────────────────────────────────────────────────┤
│ 📖 Lesson Summary:                                          │
│ Introduced figurative language (similes, metaphors, and    │
│ personification). Read Chapter 4 of Charlotte's Web.        │
│                                                             │
│ 📝 Homework Assignment:                                     │
│ Complete worksheet page 38, exercises 1 through 10.         │
│ Due Date: Oct 16, 2026 at 08:30 AM                          │
│ Attachment: Similes_Worksheet.pdf [Download]                │
├─────────────────────────────────────────────────────────────┤
│ Parent Signature Status:                                    │
│ [x] Digitally Signed by Robert Vance on Oct 14, 07:14 PM    │
└─────────────────────────────────────────────────────────────┘
```

#### Step-by-Step Operator Instructions
1. **Teacher Daily Entry**:
   * Select class stream and click **New Diary Entry**.
   * Enter Lesson Title, Topic Summary, and Homework Description.
   * Attach files (worksheets, reading PDFs) if applicable.
   * Click **Publish to Class**.
   * *The system instantly notifies all linked parents.*
2. **Parent Digital Sign-Off**:
   * Parent receives push notification on mobile app and opens **Virtual Diary** (`/(parent)/diary`).
   * Reviews the daily lesson and homework due dates.
   * Clicks **Sign Diary**.
   * The entry receives a verified green badge: *"Signed by [Parent Name] at [Timestamp]"*.

---

### Module 8: Continuous Assessment, Grading & Exams
* **Location in App**:
  * Teacher Gradebook: `/(teacher)/classes` -> Gradebook
  * Admin Exam Records: `/(admin)/results`
* **Target Audience**: Teachers, Subject Heads, Exam Officers.

#### Purpose & Capabilities
Digital gradebook enforcing assessment weighting rules. Calculates continuous assessment totals, handles late assignment deductions, and prepares data for report card compilation.

#### Step-by-Step Operator Instructions
1. **Score Entry by Subject Teacher**:
   * Teacher selects class and subject.
   * Selects Assessment Component (e.g., `Mid-Term Exam (25%)`).
   * Enters marks out of maximum score (e.g., `85 / 100`).
   * The system automatically computes weighted marks and assigns letter grades based on the institutional grading scale.
2. **Verification & Audit**:
   * The system highlights missing entries in red so teachers can identify any absent students who need makeup tests before submission.

---

### Module 9: Results Verification & Terminal Report Cards
* **Location in App**: `/(admin)/results`
* **Target Audience**: Institution Admins, Principals, Class Teachers, Parents.

#### Purpose & Capabilities
Audits grade completeness across all subjects, allows teachers and principals to submit narrative behavioral remarks, compiles cumulative terminal GPA, and generates PDF report cards.

#### Step-by-Step Operator Instructions
1. **Grade Completeness Audit**:
   * Admin navigates to **Results & Report Cards** (`/(admin)/results`).
   * Selects target Class and Term.
   * The **Completeness Scanner** displays a breakdown:
     * Green: Classes with 100% submitted grades.
     * Amber: Classes with pending teacher submissions.
2. **Class Teacher & Principal Remarks**:
   * Class teachers add homeroom narrative remarks (e.g., *"Displays strong aptitude in sciences; encouraged to participate more in class discussions"*).
   * Principal adds institutional sign-off endorsement.
3. **Publishing & PDF Release**:
   * Click **Release Report Cards**.
   * Parents and students receive instant notifications.
   * Parents open `/(parent)/report-cards` to view the branded report card and click **Download / Print PDF**.

---

### Module 10: Automated Student Promotion & Retention Engine
* **Location in App**: `/(admin)/results/promotions`
* **Target Audience**: Institution Admins, Academic Committees.

#### Purpose & Capabilities
Automates the end-of-academic-year progression cycle. Evaluates student cumulative performance against minimum passing criteria, recommends promotion or retention, and moves entire cohorts into their next grade level in one click.

#### Step-by-Step Operator Instructions
1. **Initiate Promotion Cycle**:
   * Navigate to **Results** -> **Promotions** (`/(admin)/results/promotions`).
   * Click **+ New Promotion Cycle**.
   * Set:
     * **Source Class**: (e.g., `Grade 9 Blue`).
     * **Target Destination Class**: (e.g., `Grade 10 Blue`).
     * **Minimum Passing Average**: (e.g., `50%` or `2.0 GPA`).
2. **Review System Decisions**:
   * The system scans all student final grades and categorizes them:
     * 🟢 **Promote**: Meets or exceeds the passing threshold.
     * 🔴 **Retain / Repeat**: Below passing threshold.
     * 🟡 **Review Required**: Marginal scores or missing final exams.
3. **Manual Overrides & Application**:
   * Admins can manually toggle individual decisions (e.g., grant conditional promotion with probation).
   * Click **Apply Promotion Decisions**.
   * The system updates class enrollments, transitions records to the next academic year, and archives prior year academic history.

---

### Module 11: Finance, Bursary Applications & Teacher Payouts
* **Location in App**:
  * Admin Finance: `/(admin)/finance`
  * Bursar Dashboard: `/(bursary)`
  * Parent Payments: `/(parent)/finance`
  * Student Ledger: `/(student)/finance`
* **Target Audience**: School Bursars, Financial Controllers, Admins, Parents.

#### Purpose & Capabilities
Multi-currency fee management engine handling student fee billing, partial payments, bursary applications and approvals, and teacher payroll calculation based on contracted teaching hours.

#### Step-by-Step Operator Instructions
1. **Recording Student Payments**:
   * Open **Finance** -> **Payments** (`/(admin)/finance`).
   * Search student by name or registration ID.
   * Enter payment amount received and select payment mode.
   * Click **Process Payment**. The student's balance updates in real time and a receipt is generated.
2. **Bursary Application & Vetting**:
   * Parents submit bursary applications via `/(parent)/finance` detailing household need.
   * Admin/Bursar opens `/(admin)/finance/bursaries` to review pending applications.
   * Click **Approve Bursary** and set award percentage (e.g., `40%`).
   * The system credits the student's ledger and recalculates net tuition due.
3. **Teacher Payout Generation**:
   * The system tracks completed teaching periods and calculates payroll based on the hourly/period rate configured in Phase 8.
   * Bursars review and export payout schedules for bank disbursement.

---

### Module 12: Physical Library & Digital Resource Catalog
* **Location in App**:
  * Admin Library Hub: `/(admin)/management/library`
  * Student Catalog: `/(student)/library`
  * Teacher Library: `/(teacher)/library`
* **Target Audience**: School Librarians, Teachers, Students.

#### Purpose & Capabilities
Combines physical book circulation with a cloud digital library. Manages physical inventory, tracks checkouts and returns, and hosts digital e-books and study resources.

#### Step-by-Step Operator Instructions
1. **Issuing a Book Loan**:
   * Locate the book in the inventory.
   * Click **Issue Book**.
   * Scan or select the borrowing student or teacher.
   * The system sets a 14-day return date and decrements available stock.
2. **Processing a Return**:
   * Search active loans. Click **Return Book**.
   * Stock is restored. If overdue, the system flags the student record.
3. **Publishing E-Resources**:
   * Upload digital material (PDF/EPUB) in `/(admin)/management/materials`.
   * Set visibility permissions (e.g., *Grade 12 Only*). Students can download and read resources directly on their mobile devices.

---

### Module 13: Real-Time Communication & Emergency Broadcasts
* **Location in App**: `/(admin)/communication`
* **Target Audience**: All institutional stakeholders.

#### Purpose & Capabilities
Direct and group messaging system eliminating third-party chat groups. Delivers auditable announcements, class notices, and emergency campus push notifications.

#### Step-by-Step Operator Instructions
1. **Campus Announcement**:
   * Navigate to **Communication** -> **New Announcement**.
   * Select audience: *All Institution*, *Specific Class*, *Teachers Only*, or *Parents Only*.
   * Type message body, attach documents, and click **Broadcast**.
2. **Teacher-Parent Messaging**:
   * Parents and teachers can exchange direct messages regarding student welfare.
   * All message threads are logged under institutional compliance policies.

---

### Module 14: System Analytics & Executive Decision Support
* **Location in App**: `/(admin)/management/analytics`
* **Target Audience**: Principals, Board of Directors, Institution Admins.

#### Purpose & Capabilities
Visual business intelligence dashboards displaying student population metrics, fee recovery rates, daily attendance trends, and academic performance heatmaps.

#### Key Metrics Tracked
* **Revenue Collection Efficiency**: Percentage of invoiced tuition collected vs. outstanding arrears.
* **Attendance Trends**: Daily and longitudinal student/staff attendance rates.
* **Academic Subject Health**: Identification of high-performing subjects vs. courses requiring instructional intervention.
* **Capacity Utilization**: Current enrollment vs. maximum institutional license limits.

---

### Module 15: Accessibility & Personalized Learning Engine
* **Location in App**: `/(admin)/accessibility/settings` (and accessible in every user role settings)
* **Target Audience**: All users, especially learners with diverse learning needs.

#### Purpose & Capabilities
Built-in accessibility controls that adapt the UI for individual users without requiring external screen-reading plugins.

#### Features Available
* 🔤 **OpenDyslexic Font Engine**: Switches all app typography to specialized high-readability fonts designed to mitigate dyslexia symptoms.
* 🌓 **High-Contrast Theme**: High-contrast dark and light modes compliant with WCAG 2.2 Level AA.
* 🔍 **Font Size Scaling**: Dynamic text enlargement up to 150% with fluid text reflow.
* 🎙️ **Screen Reader Optimization**: Semantic ARIA tags and native mobile accessibility traits across all interactive elements.

---

### Module 16: In-App Support Desk & Feature Requests
* **Location in App**: `/(admin)/request-feature`
* **Target Audience**: Institution Admins.

#### Purpose & Capabilities
Direct communication channel between the Institution Administrator and the Cloudora Platform Master Engineering Team for submitting tickets, requesting custom modules, and reporting issues.

#### Step-by-Step Operator Instructions
1. Click **Support & Feedback** in the admin sidebar.
2. Select Category: *Bug Report*, *Feature Request*, or *Billing Support*.
3. Set Priority: *Low*, *Medium*, *High*, or *Critical*.
4. Submit the ticket. Updates and resolutions are tracked directly in the admin portal.

---

## 4. Competitive Comparison: Cloudora LMS vs. Industry Alternatives

Educational institutions frequently struggle with mismatched software tools: legacy School Information Systems (SIS) that cannot handle daily learning, or modern Learning Management Systems (LMS) that lack school administrative tools.

Here is how **Cloudora LMS** compares to the four most prevalent alternatives:
1. **Google Classroom** (Free learning tool with no SIS/ERP features)
2. **Canvas / Blackboard** (Higher-education enterprise LMS)
3. **PowerSchool** (Legacy enterprise K-12 ERP)
4. **Fedena / Open-School** (Traditional open-source/PHP school management software)

---

### Comprehensive Feature Matrix

| Feature / Capability | Cloudora LMS | Google Classroom | Canvas / Blackboard | PowerSchool | Fedena / Open-School |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Platform Scope** | **Unified SIS + LMS + ERP** | LMS Only | Tertiary LMS Only | SIS / ERP Heavy | SIS Heavy |
| **Mobile-First Experience** | ✅ Native iOS & Android + Web | ⚠️ Basic Mobile App | ⚠️ Mobile Companion | ❌ Clunky Web Portals | ❌ Outdated Responsive Web |
| **Parent Virtual Diary with Sign-Off** | ✅ **Built-in with Timestamps** | ❌ No Diary / No Sign-off | ❌ Not Supported | ❌ Manual Paperwork | ❌ Not Supported |
| **Timetable Builder with Conflict Engine** | ✅ **Built-in Real-Time Checks** | ❌ No Timetables | ❌ No Timetables | ⚠️ Expensive Separate Add-on | ⚠️ Basic (No live collision check) |
| **Multi-Currency Tuition & Bursary Management** | ✅ **Full Ledger & Payouts** | ❌ No Finance Features | ❌ No Finance Features | ⚠️ Expensive Add-on | ⚠️ Basic Flat Invoicing |
| **Teacher Hourly / Period Payout Tracking** | ✅ **Built-in Payout Engine** | ❌ None | ❌ None | ❌ Requires Payroll ERP | ❌ None |
| **Automated End-of-Year Student Promotion** | ✅ **1-Click Rule-Based** | ❌ None | ❌ None | ⚠️ Complex Database Script | ⚠️ Manual Class Moves |
| **Terminal Report Card & PDF Generation** | ✅ **Branded, 1-Click PDF** | ❌ None | ⚠️ Requires Custom Plugins | ⚠️ Complex Setup | ⚠️ Basic Templates |
| **Built-in Accessibility (Dyslexia Fonts, High-Contrast)** | ✅ **WCAG 2.2 AA + OpenDyslexic** | ⚠️ Basic Browser Defaults | ⚠️ Standard Web Only | ❌ Legacy Non-Compliant | ❌ Poor Accessibility |
| **Multi-Role User Enrollment & Credential Cards** | ✅ **Auto-Generates Slips** | ❌ Requires Google Workspace | ❌ Complex IT Provisioning | ⚠️ Manual IT Setup | ⚠️ Plain Text Setup |
| **Physical Library Stock + E-Books** | ✅ **Unified Catalog** | ❌ None | ❌ None | ❌ Requires 3rd Party Software | ⚠️ Physical Books Only |
| **Real-Time Data Sync** | ✅ **Instant (Supabase WebSocket)**| ⚠️ Polling / Refresh | ⚠️ Polling / Refresh | ❌ Page Reload Required | ❌ Slow Database Queries |
| **Total Cost of Ownership (TCO)** | 💰 **Transparent Tiered Pricing** | 💰 Free (Requires Google Suite)| 💸 Prohibitively Expensive | 💸 Huge Implementation Fees | 💵 High Hosting & Dev Costs |

---

### Why Cloudora LMS is Superior

#### 1. Truly Unified: LMS and School ERP in One App
* *The Competitor Flaw*: Schools typically purchase Google Classroom for homework, an old ERP for fees, and paper diaries for parent notes. Data ends up scattered across three disconnected systems.
* *The Cloudora Advantage*: Cloudora combines classroom teaching, grades, fees, timetables, and report cards in a single application. When a teacher marks a student absent, the bursar, principal, and parent see it instantly in the same system.

#### 2. Designed for Mobile First with Modern Architecture
* *The Competitor Flaw*: Systems like PowerSchool and Fedena were built in the 2000s as desktop web applications. Their mobile apps are slow web views that frustrate teachers and parents.
* *The Cloudora Advantage*: Built with React Native and Expo, Cloudora delivers a native 60fps mobile experience. It supports dark mode, liquid glass UI aesthetics, offline caching, and instant biometric logins.

#### 3. The Virtual Diary: Connecting School and Home
* *The Competitor Flaw*: Google Classroom sends disconnected email summaries that parents often ignore, while traditional schools rely on paper homework notebooks that get lost or forged.
* *The Cloudora Advantage*: The **Cloudora Virtual Diary** provides daily visibility into homework, lessons, and behavior. Parents digitally sign entries with their phone, creating an auditable communication record for parent-teacher conferences.

#### 4. Automated Academic Transitions & Report Card Production
* *The Competitor Flaw*: At the end of each term, school administrators spend weeks calculating grades, typing report cards, and manually moving students to the next grade.
* *The Cloudora Advantage*: Cloudora generates branded PDF report cards with automated GPA calculations in minutes. At the end of the academic year, the **Promotion Engine** moves hundreds of students to their next classes in a single click based on school passing rules.

#### 5. Native Multi-Currency Finance & Bursary Allocation
* *The Competitor Flaw*: Western systems assume single-currency credit card processing and cannot handle local cash, bank transfers, or mobile money payments.
* *The Cloudora Advantage*: Cloudora supports global and regional currencies (USD, ZAR, NGN, KES, GBP, EUR) with flexible payment recording (Mobile Money, Wire, Cash) and built-in bursary management to support scholarship students.

#### 6. Accessibility Built In, Not Added On
* *The Competitor Flaw*: Competitors rely on external browser extensions for accessibility, leaving mobile users without accommodations.
* *The Cloudora Advantage*: Cloudora includes native **OpenDyslexic font toggles**, high-contrast color palettes, and scalable typography directly in the application settings, making it accessible to every learner out of the box.

---

## 5. Institutional Training & Change Management Playbook

---

### 7-Day Pre-Launch Implementation Checklist

```
[Day 1] Admin Account Setup, Password Hardening & School Branding
   │
[Day 2] Academic Years, Terms, 7-Point Grading Scales & Assessment Weights
   │
[Day 3] Classes, Streams, Departments & Subject Curriculum
   │
[Day 4] Faculty Enrollment, Role Assignment & Timetable Conflict-Free Publishing
   │
[Day 5] Student & Parent Enrollment, Credential Delivery Slip Printing
   │
[Day 6] Tuition Fee Schedules, Bursary Funds & Library Catalog Loading
   │
[Day 7] Faculty Fast-Track Training & Welcome Announcement Broadcast
```

* **Day 1: Identity & Security**
  * [ ] Admin logs in with master credentials and updates password.
  * [ ] School logo, legal name, currency, and timezone configured in Settings.
* **Day 2: Academic Setup**
  * [ ] Current Academic Year and active Terms created and dates verified.
  * [ ] Grading Scale (e.g., Standard 7-Point) and Assessment Types (weights totaling 100%) confirmed.
* **Day 3: Structure & Curriculum**
  * [ ] School categories, grade levels, and classroom streams created with student capacities.
  * [ ] Academic departments and subjects created with correct codes.
* **Day 4: Staff & Scheduling**
  * [ ] All teachers enrolled; Credential Delivery Slips printed.
  * [ ] Class teachers assigned to streams; subject teachers paired with courses.
  * [ ] Master Timetable built and verified with zero conflict errors.
* **Day 5: Student & Parent Onboarding**
  * [ ] All student profiles created with linked parent accounts.
  * [ ] Credential Delivery Slips printed or distributed via secure email.
* **Day 6: Finance & Resources**
  * [ ] Fee structures assigned to grade levels; bursary aid programs defined.
  * [ ] Library inventory and digital study resources uploaded.
* **Day 7: Launch & Training**
  * [ ] Faculty attend the 2-Hour Fast-Track Training session.
  * [ ] Campus-wide welcome announcement published; live operations begin.

---

### 2-Hour Fast-Track Faculty Training Agenda

* **00:00 – 00:20: Getting Started & Security**
  * Downloading the mobile app / opening the web portal.
  * Logging in with the temporary password and setting a secure personal password.
  * Setting up personal profile and accessibility options (e.g., dark mode, dyslexia font).
* **00:20 – 00:45: Morning Routine (Attendance & Virtual Diary)**
  * Opening the assigned class register and submitting morning attendance.
  * Creating a Daily Virtual Diary entry: Adding homework, due dates, and PDF attachments.
  * Demonstrating what parents see and how digital signatures appear.
* **00:45 – 01:15: Assessment, Gradebook & Exams**
  * Navigating to subject gradebooks.
  * Entering continuous assessment scores and homework grades.
  * Reviewing missing submissions and automated GPA calculation.
* **01:15 – 01:40: Timetable, Library & Resources**
  * Viewing daily teacher schedules.
  * Browsing the digital resource library and attaching reference materials.
* **01:40 – 02:00: Q&A and Verification Exercises**
  * Practice exercise: Every teacher logs one test diary entry and marks a sample attendance register.
  * Wrap-up and support desk contact info.

---

### Parent & Student Launch Communication Template

```text
Subject: Welcome to Springfield International Academy's New Digital Campus!

Dear Parents, Guardians, and Students,

We are excited to announce the official launch of Cloudora LMS, our unified school
operations and learning platform for the upcoming academic session.

With Cloudora LMS, parents and students enjoy:
1. Daily Virtual Diary: View daily classroom lessons and homework assignments directly
   from your smartphone. Parents can digitally sign homework logs with one tap.
2. Real-Time Attendance: Receive immediate notifications regarding daily attendance.
3. Digital Report Cards: Access end-of-term academic results and download official
   PDF transcripts securely.
4. Tuition & Billing: View fee balances, review payment receipts, and apply for
   institutional bursaries.
5. School Notices: Receive instant announcements and emergency updates without
   cluttered chat groups.

YOUR LOGIN CREDENTIALS:
Please review the attached Credential Delivery Slip containing your unique access
credentials and initial temporary password.

HOW TO LOG IN:
1. Web Portal: Visit https://lms.springfield.edu
2. Mobile App : Download "Cloudora LMS" from the Apple App Store or Google Play Store.
3. Enter your assigned Email / User ID and Temporary Password.
4. You will be prompted to create your own secure password upon your first login.

For technical assistance or questions, please contact our administrative desk at
support@springfield.edu or visit the campus administration office.

Warm regards,
Office of the Principal
Springfield International Academy
```

---

### Troubleshooting Common Operational Hurdles

#### 1. "A teacher cannot see their assigned class in the mobile app."
* **Root Cause**: The teacher is enrolled as a user but has not been assigned as the Class Teacher or linked in Subject-Teacher pairing.
* **Resolution**: Navigate to **Manage** -> **Classes** (`/(admin)/classes`), open the class, and verify the teacher is selected in the **Class Teacher** field. For subject teachers, ensure they are assigned in **Manage** -> **Subjects** (`/(admin)/management/subjects`).

#### 2. "The Timetable Builder displays a red collision error and won't publish."
* **Root Cause**: The selected instructor or classroom is already scheduled in another stream during that exact period.
* **Resolution**: Read the conflict banner description. Identify the conflicting class, click the conflicting period card, reassign the room or teacher, and re-run the schedule check.

#### 3. "Parent reports they cannot see their child's records after logging in."
* **Root Cause**: The student profile was created without completing the parent linkage in the enrollment wizard.
* **Resolution**: Navigate to **Users** (`/(admin)/users`), open the student's profile, click **Edit**, navigate to **Guardian / Parent Details**, search for the parent's account, and establish the link. The student will appear in the parent portal immediately.

#### 4. "Report Cards are missing letter grades or GPA averages."
* **Root Cause**: The institutional grading scale or assessment type weights are missing or incomplete.
* **Resolution**: Navigate to **Academic Setup** (`/(admin)/academic-setup`). Verify that an active Grading Scale is selected and that Assessment Type weights total exactly 100%. Click **Recalculate Results** in `/(admin)/results`.

#### 5. "User cannot reset their password on the Beta Plan."
* **Root Cause**: On the Beta tier, automated email password reset is disabled to eliminate email delivery overhead.
* **Resolution**: The institution admin handles resets manually. Open `/(admin)/users`, select the user, click **Reset Password**, and provide the new temporary password directly to the user.

---

*End of Training Guide. For additional documentation, system updates, or API references, consult the [Cloudora Architecture Guide](architecture.md) and [Password Lifecycle Specification](Password_Lifecycle.md).*
