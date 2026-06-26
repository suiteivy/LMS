import { LogoutReason, LOGOUT_MESSAGES } from '@/types/logout';
import { supabase } from '@/libs/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import { Platform } from 'react-native';

function getApiBaseUrl(): string {
  // App backend API base URL (not Supabase REST URL)
  if (process.env.EXPO_PUBLIC_URL) {
    return process.env.EXPO_PUBLIC_URL;
  }

  if (__DEV__) {
    if (Platform.OS === 'android') {
      return 'http://10.0.2.2:4001/api';
    }
    return 'http://localhost:4001/api';
  }

  return 'http://192.168.56.1:4001/api';
}

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
): Promise<void> {
  // 1. Persist reason before clearing anything
  try {
    await AsyncStorage.setItem('logout_reason', reason);
  } catch {
    // storage failure is non-critical
  }

  // 2. Notify backend to clean up server-side session row (best-effort)
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      await fetch(`${getApiBaseUrl()}/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
      }).catch(() => {}); // swallow network errors
    }
  } catch {
    // non-critical – continue with local sign-out
  }

  // 3. Call Supabase signOut – guard against 403 / network errors
  try {
    await supabase.auth.signOut({ scope } as any);
  } catch (e: any) {
    // Supabase may throw if the refresh token is already invalid (403).
    // This is expected during token-expired or revocation flows – swallow it.
    console.warn('[safeSignOut] supabase.auth.signOut error (non-fatal):', e?.message ?? e);
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
