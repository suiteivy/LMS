import { LogoutReason, LOGOUT_MESSAGES } from '@/types/logout';
import { supabase } from '@/libs/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import { getApiBaseUrl } from '@/utils/backendUrl';


/**
 * Centralized, never-fails sign-out wrapper.
 *
 * 1. Persists `reason` to AsyncStorage so the sign-in page can display a banner.
 * 2. Notifies backend `/auth/logout` to clean up server-side session row.
 * 3. Calls `supabase.auth.signOut()` wrapped in a try/catch – a 403 from Supabase
 *    (e.g. invalid refresh token) is silently swallowed so the user always lands
 *    back on the sign-in screen.
 * 4. Clears demo/session AsyncStorage keys.
 * 5. Shows a toast (unless `silent`).
 *
 * @param scope  'local' (default) clears this device only;
 *               'global' signs out every device (Supabase v2+).
 * @param reason One of the `LogoutReason` enum values.
 * @param silent If true, suppresses the toast.
 */
export async function safeSignOut(
  scope: 'local' | 'global' = 'local',
  reason: LogoutReason = LogoutReason.UNKNOWN,
  silent: boolean = false,
  isDemoSession?: boolean,
  demoUserId?: string | null,
): Promise<void> {
  // 1. Persist reason before clearing anything
  try {
    await AsyncStorage.setItem('logout_reason', reason);
  } catch {
    // storage failure is non-critical
  }

  // 2. Check session and notify backend
  let isDemoUser = !!isDemoSession;
  let targetDemoUserId: string | null = demoUserId || null;
  let accessToken: string | null = null;
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      if (!targetDemoUserId) targetDemoUserId = session.user.id;
      if (!isDemoUser) isDemoUser = session.user.email?.startsWith('demo.') || false;
      accessToken = session.access_token;
    }

    // Regular users: notify backend /auth/logout (best-effort)
    if (!isDemoUser && accessToken) {
      await fetch(`${getApiBaseUrl()}/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
      }).catch(() => {}); // swallow network errors
    }
  } catch {
    // non-critical – continue with local sign-out
  }

  // 3. Call Supabase signOut FIRST (before demo user deletion)
  try {
    const { error: signOutError } = await supabase.auth.signOut({ scope } as any);
    if (signOutError) {
      console.warn('[safeSignOut] supabase.auth.signOut error (non-fatal):', signOutError?.message || signOutError);
    }
  } catch (e: any) {
    // Supabase may throw if the refresh token is already invalid (403).
    // This is expected during token-expired or revocation flows – swallow it.
    console.warn('[safeSignOut] supabase.auth.signOut error (non-fatal):', e?.message ?? e);
  }

  // 4. If demo user, trigger demo cleanup AFTER signout
  if (isDemoUser && targetDemoUserId) {
    try {
      await fetch(`${getApiBaseUrl()}/demo/end`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: targetDemoUserId }),
      }).catch(() => {});
    } catch {
      // non-critical
    }
  }

  // 4. Clear demo-related keys (best-effort)
  try {
    await Promise.allSettled([
      AsyncStorage.removeItem('demo_expiry'),
      AsyncStorage.removeItem('is_demo_mode'),
      AsyncStorage.removeItem('session_start_time'),
      AsyncStorage.removeItem('logout_reason_displayed'),
    ]);
  } catch {
    // non-critical
  }

  // 5. Show toast unless silent
  if (!silent) {
    const msg = LOGOUT_MESSAGES[reason] ?? LOGOUT_MESSAGES[LogoutReason.UNKNOWN];
    Toast.show({
      type: reason === LogoutReason.INSTITUTION_SUSPENDED ? 'error' : 'info',
      text1: msg.title,
      text2: msg.body,
      position: 'top',
    });
  }
}
