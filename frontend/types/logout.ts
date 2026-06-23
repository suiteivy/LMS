/**
 * Centralized logout reason types used by safeSignOut and the sign-in
 * banner to display context-appropriate messages.
 */
export enum LogoutReason {
  /** User explicitly tapped "Log Out" */
  USER_INITIATED = 'user_initiated',
  /** Supabase access or refresh token expired server-side */
  TOKEN_EXPIRED = 'token_expired',
  /** Client-side inactivity timer (10 min idle) */
  INACTIVITY_TIMEOUT = 'inactivity_timeout',
  /** Admin revoked this session via /auth/sessions/revoke */
  REVOKED_BY_OTHER_DEVICE = 'revoked_by_other_device',
  /** Admin revoked all sessions via /auth/sessions/revoke-others */
  ADMIN_REVOKED_ALL = 'admin_revoked_all',
  /** Session timed out (absolute 15 min / 10 hr limit) */
  SESSION_TIMEOUT = 'session_timeout',
  /** Institution suspended or cancelled */
  INSTITUTION_SUSPENDED = 'institution_suspended',
  /** Supabase returned 403 (invalid refresh token) */
  AUTH_ERROR_403 = 'auth_error_403',
  /** Generic / unknown sign-out */
  UNKNOWN = 'unknown',
}

/** Human-readable toast title + body for each reason. */
export const LOGOUT_MESSAGES: Record<LogoutReason, { title: string; body: string }> = {
  [LogoutReason.USER_INITIATED]: {
    title: 'Logged Out',
    body: 'You have been logged out successfully.',
  },
  [LogoutReason.TOKEN_EXPIRED]: {
    title: 'Session Expired',
    body: 'Your session has expired. Please sign in again.',
  },
  [LogoutReason.INACTIVITY_TIMEOUT]: {
    title: 'Logged Out',
    body: "You've been logged out due to inactivity.",
  },
  [LogoutReason.REVOKED_BY_OTHER_DEVICE]: {
    title: 'Session Terminated',
    body: 'Your session was terminated from another device.',
  },
  [LogoutReason.ADMIN_REVOKED_ALL]: {
    title: 'Sessions Revoked',
    body: 'All your sessions have been revoked by an administrator.',
  },
  [LogoutReason.SESSION_TIMEOUT]: {
    title: 'Session Expired',
    body: 'Your session has timed out.',
  },
  [LogoutReason.INSTITUTION_SUSPENDED]: {
    title: 'Access Denied',
    body: "Your institution's account has been disabled.",
  },
  [LogoutReason.AUTH_ERROR_403]: {
    title: 'Session Error',
    body: 'Your session could not be restored. Please sign in again.',
  },
  [LogoutReason.UNKNOWN]: {
    title: 'Logged Out',
    body: 'You have been logged out.',
  },
};
