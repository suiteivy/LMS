# Password Lifecycle Management

This document outlines the end-to-end password lifecycle management logic for all user roles within the Cloudora LMS platform. It details the provisioning, reset, and security workflows to ensure a consistent and secure credential management system.

## 1. Initial Password Assignment Logic

### Master Admin & Institution Admin
*   **Master Admin Provisioning:** Master Admin accounts are created manually via secure payload. The password is explicitly set during the creation process (`req.body.password`) and is not auto-generated.
*   **Institution Admin Provisioning:** 
    *   **First Admin:** The primary Institution Admin is provisioned by the Master Admin during institution creation. The Master Admin explicitly sets the initial `admin_password` for this user.
    *   **Subsequent Admins:** Additional admins enrolled via the standard `enrollUser` workflow receive an auto-generated 8-character temporary password composed of unambiguous alphanumeric characters.

### Teachers, Students, and Parents
*   **Onboarding Flow:** These roles are provisioned by an Institution Admin (or Master Admin) via the centralized `enrollUser` endpoint.
*   **Credential Generation:** Passwords are automatically generated using a secure randomizer (`generateTempPassword()`), creating an 8-character temporary token.
*   **Credential Distribution:**
    *   **Parents:** If a parent email is provided during student enrollment, the system automatically sends a secure invitation email containing their temporary password and a prompt to log in and change their password.
    *   **Students & Teachers:** The temporary password is returned in the API response to the provisioning administrator, who is responsible for securely communicating these credentials to the user.
*   **First-Time Login:** All users receiving auto-generated credentials are strongly advised via onboarding materials and email templates to change their password immediately upon their first login.

---

## 2. Password Reset Workflows

### Self-Service (Forgot Password)
The "Forgot Password" flow handles credential recovery with a tiered approach based on the institution's subscription plan:

*   **Paid Tiers (Standard Flow):** 
    1.  User enters their email in the Forgot Password screen.
    2.  The backend triggers `supabase.auth.resetPasswordForEmail`, which generates a secure, one-time use token and emails a reset link to the user.
    3.  The user clicks the link, which redirects them to the "New Password" input screen.
    4.  The system uses the provided access token to authenticate the request and updates the password via the administrative API.
*   **Beta Tier (Hierarchical Override):** To prevent email delivery costs and maintain tight administrative control on free/beta tiers, the self-service flow is disabled.
    1.  When a user requests a reset, the system generates an in-app notification to their immediate superior.
    2.  **Students/Teachers/Parents:** Triggers a "warning" notification to all Institution Admins within their institution requesting they manually reset the user's password.
    3.  **Institution Admins:** Triggers a "critical" notification to the Master Admins.
    4.  The user receives a message instructing them to contact their administrator.

### In-App Management (Settings/Profile)
Authenticated users can proactively update their password via their account settings using the `changePassword` workflow:
1.  User submits their `current_password` and `new_password`.
2.  The backend performs an active identity verification by attempting a silent Supabase `signInWithPassword` using the `current_password`.
3.  If successful, the backend validates the complexity of the `new_password`.
4.  The password is then updated securely using `supabase.auth.admin.updateUserById`.

### Administrative Override
Superiors can forcefully reset passwords for subordinate users via the `adminResetPassword` endpoint:
*   **Permissions Matrix:**
    *   **Master Admins:** Can reset the password for *any* user on the platform.
    *   **Institution Admins:** Can only reset passwords for Students, Teachers, Parents, and Bursars strictly within their own `institution_id`.
    *   **Peer Restriction:** Institution Admins *cannot* reset the password of another Institution Admin. They must escalate this request to a Master Admin.

---

## 3. Security & Validation Requirements

### Universal Password Complexity Rules
The platform enforces strict password complexity to ensure high entropy.
*   **Minimum Length:** 8 characters.
*   **Character Types Required:**
    *   At least one lowercase letter (`[a-z]`).
    *   At least one uppercase letter (`[A-Z]`).
    *   At least one numeric digit (`\d`).
*   **Backend Fallback:** The backend enforces a hard minimum of 6 characters for API resilience, but the frontend enforces the stricter 8-character complex policy.

### Lockout Policies & Rate Limiting
*   **Forgot Password Rate Limiting:** Highly restricted to prevent abuse and spam. A maximum of **3 reset requests per hour** per email address is enforced. Violations result in a `429 Too Many Requests` block.
*   **Brute Force Protection:** Handled at the infrastructure layer by Supabase Auth, which tracks failed login attempts and temporarily suspends the account after consecutive failures.

### Token Security
*   **One-Time Use:** Password reset tokens generated via Supabase are strictly one-time use.
*   **Time-To-Live (TTL):** Tokens expire automatically based on the underlying Supabase project configuration (typically 1 hour).
*   **Obfuscation:** Reset URLs use secure hashes in the fragment identifier, ensuring tokens are not leaked to the server in standard HTTP request logs.
