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
  skipDemoCleanup?: boolean,
): Promise<void> {
  // Notify API layer to drop tokens and block in-flight requests
  try {
    const { setSigningOutState } = await import('@/services/api');
    setSigningOutState(true);
  } catch {}

  // 1. Persist reason and deliberate logout marker
  if (!isDemoSession) {
    try {
      await AsyncStorage.setItem('logout_reason', reason);
      await AsyncStorage.setItem('deliberate_logout', 'true');
    } catch {
      // storage failure is non-critical
    }
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

  // 3. Call Supabase signOut FIRST (wrapped so failure doesn't abort storage clearance)
  try {
    const { error: signOutError } = await supabase.auth.signOut({ scope } as any);
    if (signOutError) {
      console.warn('[safeSignOut] supabase.auth.signOut error (non-fatal):', signOutError?.message || signOutError);
    }
  } catch (e: any) {
    console.warn('[safeSignOut] supabase.auth.signOut error (non-fatal):', e?.message ?? e);
  }

  // 4. Force-purge all Supabase session keys from client storage to prevent accidental re-login
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        if (key && (key.startsWith('sb-') || key.includes('auth-token') || key.includes('supabase'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(k => window.localStorage.removeItem(k));
    } catch (storageErr) {
      console.warn('[safeSignOut] Error purging localStorage tokens:', storageErr);
    }
  }

  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const authKeys = allKeys.filter(k => k.startsWith('sb-') || k.includes('auth-token') || k.includes('supabase'));
    if (authKeys.length > 0) {
      await AsyncStorage.multiRemove(authKeys);
    }
  } catch (asyncErr) {
    console.warn('[safeSignOut] Error purging AsyncStorage tokens:', asyncErr);
  }

  // 5. If demo user, trigger demo cleanup AFTER signout
  if (isDemoUser && targetDemoUserId && !skipDemoCleanup) {
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

  // 6. Clear demo-related keys
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

  // 7. Show toast unless silent or demo session
  if (!silent && !isDemoSession) {
    const msg = LOGOUT_MESSAGES[reason] ?? LOGOUT_MESSAGES[LogoutReason.UNKNOWN];
    const isError = reason === LogoutReason.INSTITUTION_SUSPENDED || reason === LogoutReason.AUTH_ERROR_403;
    const isSuccess = reason === LogoutReason.USER_INITIATED;
    Toast.show({
      type: isError ? 'error' : (isSuccess ? 'success' : 'info'),
      text1: msg.title,
      text2: msg.body,
      position: 'top',
    });
  }

  // Release signing out flag after settle
  setTimeout(async () => {
    try {
      const { setSigningOutState } = await import('@/services/api');
      setSigningOutState(false);
    } catch {}
  }, 1200);
}
