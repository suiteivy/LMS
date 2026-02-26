# LMS Free Trial Documentation

## Overview
The Learning Management System (LMS) incorporates a highly flexible, institution-level **30-Day Free Trial** mechanism. When a new institution is registered, it is automatically enrolled in a 30-day fully featured trial. 

This model allows administrators, teachers, parents, and students to evaluate the full potential of the platform before committing to a paid subscription, without permanently locking them out of their data once the trial expires.

## How to Access the Free Trial
Accessing the free trial is fully automated and integrated into the standard registration flow. No credit card is required upfront.

1. **Sign Up:** A new user navigates to the LMS landing page and clicks "**Get Started**" or "**Start Free Trial**".
2. **Registration Options:** They are presented with the Pricing/Plans page. They select the "**Free Trial**" tier.
3. **Institution Creation:** They fill out the standard registration form, providing their name, email, and the name of their Institution.
4. **Automatic Enrollment:** Upon successful creation of their administrator account, the backend automatically provisions their `institution` record with:
   - `subscription_status` = `trial`
   - `trial_start_date` = Current Timestamp
   - `trial_end_date` = Current Timestamp + 30 Days

## The Onboarding Experience (Day 1)
Immediately after registering, the Administrator logs in and is greeted by an onboarding flow designed to encourage platform exploration:

1. **Dashboard Overview:** They land on the Admin Dashboard where a subtle, non-intrusive "Free Trial: 30 days remaining" banner is visible at the top.
2. **Getting Started Widget:** A gamified "🚀 Getting Started" widget tracks their initial setup. It prompts them to complete core activation steps:
   - ✅ Create your first subject
   - ◯ Enroll a student
   - ◯ Process a fee payment
3. **Premium Feature Discovery:** As they navigate the dashboard, premium features (like creating classes, managing finances, or bulk enrolling users) are highlighted with a small `✨ PRO` badge. This reminds the administrator that they are experiencing the full, unrestricted premium tier for free.

## Trial Lifecycle

1. **Active Trial (Days 1–30)**
   - **Status:** `trial`
   - **Access:** Unrestricted. All premium and core features are available. Institutions can create unlimited classes, enroll users, assign grades, use library features, and process payments.
   - **UI Indicators:** A banner is displayed for Administrators outlining the days remaining until trial expiration.

2. **Trial Expired (Day 31+)**
   - **Status:** `expired`
   - **Access:** Restricted (Read-Only/Core). 
     - **Maintained:** Existing users (students, teachers, parents) can log in. Students can submit active assignments, teachers can grade submitted assignments, and administrators can view read-only analytics of existing data.
     - **Restricted:** The creation of new entities is blocked. Administrators and teachers cannot create new users, classes, subjects, fee structures, or library books. Payments cannot be requested.
   - **UI Indicators:** Creation actions (buttons, forms) are disabled or hidden. Contextual prompts encourage the Administrator to upgrade their subscription. A prominent "Trial Expired" badge is shown.

3. **Active Subscription**
   - **Status:** `active`
   - **Access:** Unrestricted access based on the purchased `subscription_plan` (e.g., 'premium', 'basic').
   - **UI Indicators:** A subtle "Pro" or "Premium" badge might be displayed based on the plan, confirming active status. No trial warnings.

## Differentiating Trial vs. Subscribed Users
To fulfill operations and support, we can differentiate users based on their institution's `subscription_status`:
- **Administrators/Teachers:** In their dashboard header or sidebar, an indicator will show "Trial" (with days remaining), "Expired", or "Premium/Active".
- **Backend Recognition:** The backend will send the `subscription_status` along with user context in the `/api/me` or auth payload, allowing the frontend to conditionally render badges or restrict routes.

## Technical Implementation Details

### Database Schema
The `institutions` table tracks the subscription lifecycle using the following fields:
- `trial_start_date` (TIMESTAMPTZ): The timestamp when the trial began.
- `trial_end_date` (TIMESTAMPTZ): Exactly 30 days after the start date.
- `subscription_status` (TEXT): Currently constrained to `trial`, `active`, `expired`, or `cancelled`.
- `subscription_plan` (TEXT): For future billing tiers (`free`, `premium`, etc.).

### Backend Enforcement
- Core functionality endpoints (e.g., `GET` requests, student submissions) remain accessible.
- Premium functionality endpoints (e.g., `POST`, `PUT`, `DELETE` on users, classes, subjects) are guarded by a custom `subscriptionCheck` middleware.
- If an institution's trial has expired and they do not have an active subscription, the middleware intercepts requests to restricted routes and returns a `403 Forbidden` response with a specific `TRIAL_EXPIRED` application code.

### Frontend Integration
- React Context (`AuthContext` or `InstitutionContext`) fetches and holds the current `subscription_status` and `trial_end_date`.
- UI components conditionally render specific warnings or disable action buttons by checking `isTrialExpired`.

## Manual Override (For Support)
If a trial needs to be manually extended or cleared for a specific institution, a database administrator with raw SQL access can update the institution record:
```sql
UPDATE institutions 
SET trial_end_date = NOW() + INTERVAL '14 days', subscription_status = 'trial' 
WHERE id = 'institution-uuid-here';
```

## Demo Academy Exception
Note that the **Demo Academy** institution (accessed via the `/demo` route or the "Demo" button on the landing page) is exempt from the free trial logic. 
It is intended to showcase the full LMS application for prospective users. Therefore, its `subscription_status` is configured as `'active'` and its `subscription_plan` is set to `'premium'`, ensuring that it never expires and retains full functionality to encourage exploration and plan upgrades.
