import { authService, supabase } from '@/libs/supabase'
import { Database } from '@/types/database'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Session, User } from '@supabase/supabase-js'
import { router } from 'expo-router'
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { AppState, AppStateStatus, Platform } from 'react-native'
import Toast from 'react-native-toast-message'
import { api } from '@/services/api'
import { safeSignOut } from '@/utils/safeSignOut'
import { LogoutReason, LOGOUT_MESSAGES } from '@/types/logout'

type UserProfile = Database['public']['Tables']['users']['Row']

interface AuthContextType {
  session: Session | null
  user: User | null
  profile: UserProfile | null
  studentId: string | null
  teacherId: string | null
  adminId: string | null
  parentId: string | null
  displayId: string | null
  subscriptionStatus: string | null
  subscriptionPlan: string | null
  trialEndDate: string | null
  institutionName: string | null
  isMain: boolean
  isPlatformAdmin: boolean
  canonicalRole: string | null
  loading: boolean
  setLoading: (loading: boolean) => void
  isInitializing: boolean
  isNavReady: boolean
  isProfileLoading: boolean
  isSessionExpiring: boolean
  dismissSessionWarning: () => void
  signIn: (email: string, password: string) => Promise<{ data: any; error: any }>
  signOut: () => Promise<{ error: any }>
  logout: () => Promise<{ error: any }>
  resetPassword: (email: string) => Promise<{ error: any }>
  refreshProfile: () => Promise<UserProfile | null>
  resetSessionTimer: () => void
  startDemo: (role: string) => Promise<{ data: any; error: any }>
  isDemo: boolean
  wasDemo: boolean
  clearWasDemo: () => void
  isTrial: boolean
  addonMessaging: boolean
  addonLibrary: boolean
  addonFinance: boolean
  addonAnalytics: boolean
  addonBursary: boolean
  addonAttendance: boolean
  addonDiary: boolean
  customStudentLimit: number | null
  getRoleRedirect: (profile: UserProfile | null, isPlatformAdmin: boolean) => string | null
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: React.ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)

  const [roleInfo, setRoleInfo] = useState({
    studentId: null as string | null,
    teacherId: null as string | null,
    adminId: null as string | null,
    parentId: null as string | null,
    displayId: null as string | null
  })

  // Deep comparison helper for flat objects
  const isDataEqual = (a: any, b: any) => {
    if (a === b) return true;
    if (!a || !b) return false;
    return JSON.stringify(a) === JSON.stringify(b);
  };

  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null)
  const [subscriptionPlan, setSubscriptionPlan] = useState<string | null>(null)
  const [trialEndDate, setTrialEndDate] = useState<string | null>(null)
  const [institutionName, setInstitutionName] = useState<string | null>(null)
  const [isMain, setIsMain] = useState(false)
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false)
  const canonicalRole = (profile as any)?.role_alias || profile?.role || null;
  const [addonFlags, setAddonFlags] = useState({
    messaging: false,
    library: false,
    finance: false,
    analytics: false,
    bursary: false,
    attendance: false,
    diary: false
  })
  const [customStudentLimit, setCustomStudentLimit] = useState<number | null>(null)
  const [isInitializing, setIsInitializing] = useState(true)
  const [isNavReady, setIsNavReady] = useState(false)
  const [isProfileLoading, setIsProfileLoading] = useState(false)
  const [loading, setLoading] = useState(false)

  // Keep refs in sync so closures (e.g. onAuthStateChange) always read live values
  useEffect(() => { isInitializingRef.current = isInitializing; }, [isInitializing]);
  useEffect(() => { isNavReadyRef.current = isNavReady; }, [isNavReady]);
  const [isDemo, setIsDemo] = useState(false)
  const [wasDemo, setWasDemo] = useState(false)

  const clearWasDemo = React.useCallback(() => {
    setWasDemo(false);
  }, []);

  const [isSessionExpiring, setIsSessionExpiring] = useState(false);
  const [sessionWarningDismissed, setSessionWarningDismissed] = useState(false);

  const timerRef = useRef<any>(null)
  const timerWarningRef = useRef<any>(null)
  const idleTimeoutRef = useRef<any>(null)
  const heartbeatRef = useRef<any>(null)
  const realtimeChannelRef = useRef<any>(null)
  const lastPingTime = useRef<number>(0)

  const appState = useRef(AppState.currentState);
  const lastActive = useRef(Date.now());
  const isManualLogout = useRef(false);
  const currentSessionRef = useRef<Session | null>(null);
  const isDemoRef = useRef(false);
  const profileRef = useRef<UserProfile | null>(null);
  const userRef = useRef<User | null>(null);
  const isInitializingRef = useRef(true);
  const isNavReadyRef = useRef(false);
  useEffect(() => { isDemoRef.current = isDemo; }, [isDemo]);
  useEffect(() => { profileRef.current = profile; }, [profile]);
  useEffect(() => { userRef.current = user; }, [user]);

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    if (timerWarningRef.current) {
      clearTimeout(timerWarningRef.current)
      timerWarningRef.current = null
    }
    if (idleTimeoutRef.current) {
      clearTimeout(idleTimeoutRef.current)
      idleTimeoutRef.current = null
    }
  }

  const clearHeartbeat = useCallback(() => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
  }, []);

  /** Start the 10-second heartbeat that resets idle timer + pings backend. */
  const startHeartbeat = useCallback(() => {
    clearHeartbeat();
    heartbeatRef.current = setInterval(() => {
      // Reset idle timeout on any user activity
      if (idleTimeoutRef.current) {
        clearTimeout(idleTimeoutRef.current);
      }
      idleTimeoutRef.current = setTimeout(async () => {
        console.warn("[AuthContext] Local idle timeout triggered (30 minutes inactivity)");
        await handleLogout(false, LogoutReason.INACTIVITY_TIMEOUT);
      }, 30 * 60 * 1000);

      // Throttled keep-alive ping to backend (at most once every 1 minute)
      const now = Date.now();
      if (now - lastPingTime.current > 60000) {
        lastPingTime.current = now;
        api.post('/auth/ping', {}, { skipErrorToast: true }).catch(() => {});
      }
    }, 10 * 1000); // every 10 seconds
  }, [clearHeartbeat]);

  const handleLogout = async (silent: boolean = false, reason: LogoutReason = LogoutReason.USER_INITIATED) => {
    // Prevent recursion if already logging out or already logged out
    if (isManualLogout.current) return { error: null };

    // If silent and no session/user exists, we don't need to do anything
    // This prevents the "SIGNED_OUT" event from triggering a logout on app start
    if (silent && !currentSessionRef.current && !user && !profile) {
      setIsInitializing(false);
      setLoading(false);
      return { error: null };
    }

    isManualLogout.current = true;

    try {
      // Clear all local state first (before signOut call, in case Supabase throws)
      setSession(null);
      setUser(null);
      setProfile(null);
      setIsSessionExpiring(false);
      setSessionWarningDismissed(false);
      currentSessionRef.current = null;
      userRef.current = null;
      profileRef.current = null;
      setRoleInfo({ studentId: null, teacherId: null, adminId: null, parentId: null, displayId: null });
      setIsDemo(false);
      setSubscriptionStatus(null);
      setSubscriptionPlan(null);
      setTrialEndDate(null);
      setInstitutionName(null);
      setIsMain(false);
      setIsPlatformAdmin(false);
      setAddonFlags({ messaging: false, library: false, finance: false, analytics: false, bursary: false, attendance: false, diary: false });
      setCustomStudentLimit(null);
      setLoading(false);
      setIsInitializing(false);
      clearTimer();
      clearHeartbeat();

      // Unsubscribe from Realtime session revocation channel
      if (realtimeChannelRef.current) {
        supabase.removeChannel(realtimeChannelRef.current);
        realtimeChannelRef.current = null;
      }

      // Use centralized safeSignOut – never fails, persists reason, shows toast
      await safeSignOut('local', reason, silent || isDemoRef.current);

      // Final AsyncStorage wipe (safeSignOut already clears demo keys)
      try { await AsyncStorage.clear(); } catch { /* non-critical */ }

      if (!silent && isDemoRef.current) {
        Toast.show({ type: 'info', text1: 'Session ended', text2: 'Demo session ended.', position: 'top' });
      }
    } finally {
      // Delay resetting the flag to allow events to settle
      setTimeout(() => { isManualLogout.current = false; }, 1000);
    }

    return { error: null };
  }

  const handleSignIn = async (email: string, password: string) => {
    setLoading(true);
    try {
      const result = await authService.signIn(email, password);
      if (result.data?.session) {
        await AsyncStorage.setItem('session_start_time', Date.now().toString());
        await startTimeoutTimer(false);
      }
      if (result.error) setLoading(false);
      return result;
    } catch (error) {
      setLoading(false);
      return { data: null, error };
    }
  }

  const handleStartDemo = async (role: string) => {
    const expiry = Date.now() + 15 * 60 * 1000;
    await AsyncStorage.setItem('demo_expiry', expiry.toString());
    const result = await authService.startDemoSession(role);
    if (result.error) {
      await AsyncStorage.removeItem('demo_expiry').catch(() => { });
    }
    return result;
  }

  const dismissSessionWarning = () => {
    setSessionWarningDismissed(true);
    setIsSessionExpiring(false);
  };

  const resetSessionTimer = async () => {
    if (!session) return;
    // Start the heartbeat interval which handles idle timeout + backend ping
    startHeartbeat();
  };

  const startTimeoutTimer = async (isDemoSession?: boolean) => {
    clearTimer();
    const isActuallyDemo = isDemoSession !== undefined ? isDemoSession : isDemoRef.current;

    // Absolute timeout: 15 mins for demo, 15 mins for master admin, 10 hours for regular users
    const isMasterAdmin = profileRef.current?.role === 'master_admin' || !!(profileRef.current as any)?.platform_admins?.[0];
    const totalDurationMs = (isActuallyDemo || isMasterAdmin) ? 15 * 60 * 1000 : 10 * 60 * 60 * 1000;

    // Check for persisted start time
    let startTime = Date.now();
    try {
      const persistedStart = await AsyncStorage.getItem('session_start_time');
      if (persistedStart) {
        startTime = parseInt(persistedStart, 10);
      } else {
        await AsyncStorage.setItem('session_start_time', startTime.toString());
      }
    } catch (e) {
      console.warn('[AuthContext] Error accessing session_start_time:', e);
    }

    const elapsed = Date.now() - startTime;
    const remaining = totalDurationMs - elapsed;

    if (remaining <= 0) {
      await handleLogout(false, LogoutReason.SESSION_TIMEOUT);
    } else {
      // Set absolute expiry timeout
      timerRef.current = setTimeout(async () => {
        console.warn("[AuthContext] Absolute session timeout triggered");
        await handleLogout(false, LogoutReason.SESSION_TIMEOUT);
      }, remaining);

      // Warning timeout: 15 minutes before 10-hour limit, or 2 minutes before 15-minute limit
      const warningThresholdMs = (isActuallyDemo || isMasterAdmin) ? 2 * 60 * 1000 : 15 * 60 * 1000;

      if (remaining > warningThresholdMs) {
        timerWarningRef.current = setTimeout(() => {
          setIsSessionExpiring(true);
        }, remaining - warningThresholdMs);
      } else {
        setIsSessionExpiring(true);
      }
    }

    // Also reset/start the local idle timeout on start
    await resetSessionTimer();
  };

  const lastLoadedUserId = useRef<string | null>(null);
  const loadingUserId = useRef<string | null>(null);

  const loadUserProfile = async (userId: string, force: boolean = false): Promise<UserProfile | null> => {
    if (!force && ((lastLoadedUserId.current === userId && profile && !loading) || loadingUserId.current === userId)) {
      if (loading) setLoading(false);
      return profile;
    }

    loadingUserId.current = userId;

    // Add a safety timeout for the profile load itself
    const safetyTimeout = setTimeout(() => {
      if (loadingUserId.current === userId) {
        console.warn(`[AuthContext] Profile load for ${userId} timed out after 6s`);
        setIsProfileLoading(false);
        setLoading(false);
        loadingUserId.current = null;
      }
    }, 6000);

    try {
      setIsProfileLoading(true);
      const { data, error } = await supabase
        .from('users')
        .select('*, students(id), teachers(id), admins(id), parents(id), institutions(name, category_id, subscription_status, subscription_plan, trial_end_date, addon_messaging, addon_library, addon_diary, addon_finance, addon_analytics, addon_bursary, addon_attendance, custom_student_limit, school_categories!institutions_category_id_fkey(name, level_label)), platform_admins(id)')
        .eq('id', userId)
        .single()
      const result = data as any
      if (error) {
        console.error('[AuthContext] Profile load error:', error);
        // If profile doesn't exist but user does, it might be a newly created user without a record yet
        // or a legacy data issue. We'll set a minimal profile to allow partial access if possible.
        setIsProfileLoading(false);
        setLoading(false);
        loadingUserId.current = null;
        return null;
      }

      const userData = data as any;

      // 1. Calculate all derived states FIRST
      const isPlatformAdminFlag = !!userData.platform_admins?.[0] || userData.role === 'master_admin';
      const isMainFlag = userData.admins?.[0]?.is_main || false;

      let newSubscriptionStatus = null;
      let newSubscriptionPlan = null;
      let newTrialEndDate = null;
      let newInstitutionName = null;

      if (userData.institutions) {
        newSubscriptionStatus = userData.institutions.subscription_status || null;
        newSubscriptionPlan = userData.institutions.subscription_plan || null;
        newTrialEndDate = userData.institutions.trial_end_date || null;
        newInstitutionName = userData.institutions.name || null;
        setAddonFlags({
          messaging: !!userData.institutions.addon_messaging,
          library: !!userData.institutions.addon_library,
          finance: !!userData.institutions.addon_finance,
          analytics: !!userData.institutions.addon_analytics,
          bursary: !!userData.institutions.addon_bursary,
          attendance: !!userData.institutions.addon_attendance,
          diary: !!userData.institutions.addon_diary,
        });
        setCustomStudentLimit(userData.institutions.custom_student_limit || null);
      }

      const getRoleId = (roleData: any) => {
        if (!roleData) return null;
        if (Array.isArray(roleData)) return roleData[0]?.id || null;
        return roleData.id || null;
      };

      let newRoleInfo = { studentId: null, teacherId: null, adminId: null, parentId: null, displayId: null };
      if (userData.role === 'student') {
        const id = getRoleId(userData.students);
        newRoleInfo = { ...newRoleInfo, studentId: id, displayId: id };
      } else if (userData.role === 'teacher') {
        const id = getRoleId(userData.teachers);
        newRoleInfo = { ...newRoleInfo, teacherId: id, displayId: id };
      } else if (userData.role === 'admin' || userData.role === 'master_admin') {
        const id = getRoleId(userData.admins);
        newRoleInfo = { ...newRoleInfo, adminId: id, displayId: id };
      } else if (userData.role === 'parent') {
        const id = getRoleId(userData.parents);
        newRoleInfo = { ...newRoleInfo, parentId: id, displayId: id };
      }

      // 2. Batch State Updates only if changed
      if (subscriptionStatus !== newSubscriptionStatus) setSubscriptionStatus(newSubscriptionStatus);
      if (subscriptionPlan !== newSubscriptionPlan) setSubscriptionPlan(newSubscriptionPlan);
      if (trialEndDate !== newTrialEndDate) setTrialEndDate(newTrialEndDate);
      if (institutionName !== newInstitutionName) setInstitutionName(newInstitutionName);
      if (isPlatformAdmin !== isPlatformAdminFlag) setIsPlatformAdmin(isPlatformAdminFlag);
      if (isMain !== isMainFlag) setIsMain(isMainFlag);

      if (!isDataEqual(roleInfo, newRoleInfo)) {
        setRoleInfo(newRoleInfo);
      }

      // Setting profile LAST ensures that any effects watching 'profile' 
      // see the most current version of all other auth states.
      // We only update if the underlying data has changed to prevent render loops.
      if (!isDataEqual(profile, userData)) {
        setProfile(userData as UserProfile);
      } else {
      }

      lastLoadedUserId.current = userId;
      return userData as UserProfile;
    } catch (err) {
      console.error('Error loading profile:', err)
      setProfile(null)
      lastLoadedUserId.current = null;
      return null
    } finally {
      clearTimeout(safetyTimeout);
      setIsProfileLoading(false);
      setLoading(false);
      loadingUserId.current = null;
    }
  }

  const refreshProfile = async (): Promise<UserProfile | null> => {
    if (user) return await loadUserProfile(user.id, true)
    return null
  }

  const getRoleRedirect = React.useCallback((userProfile: UserProfile | null, platformAdmin: boolean): string | null => {
    if (!userProfile) return null;
    if (platformAdmin) return "/(master-admin)";

    switch (userProfile.role) {
      case "admin": return "/(admin)";
      case "teacher": return "/(teacher)";
      case "student": return "/(student)";
      case "parent": return "/(parent)";
      default: return "/(auth)/signIn";
    }
  }, []);

  useEffect(() => {
    const initializeAuth = async () => {
      setIsInitializing(true);
      try {
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('getSession timeout')), 15000));

        const { data: { session: initialSession } } = await Promise.race([sessionPromise, timeoutPromise]) as any;

        if (initialSession) {
          // Race protection: timeout for getUser
          const userPromise = supabase.auth.getUser();
          const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('getUser timeout')), 15000));

          try {
            const { data: { user: validatedUser } } = await Promise.race([userPromise, timeoutPromise]) as any;
            if (validatedUser) {
              setSession(initialSession);
              currentSessionRef.current = initialSession;
              setUser(validatedUser);
              const isDemoUser = validatedUser.email?.startsWith('demo.') || false;
              setIsDemo(isDemoUser);
              if (isDemoUser) {
                setWasDemo(true);
              }
              await loadUserProfile(validatedUser.id);
              await startTimeoutTimer(isDemoUser);
            } else {
              console.warn('[AuthContext] getUser returned no data during init');
              setIsInitializing(false);
              setLoading(false);
            }
          } catch (e) {
            console.error('[AuthContext] Error or timeout in getUser during init:', e);
            setIsInitializing(false);
            setLoading(false);
          }
        } else {
          setSession(null);
          currentSessionRef.current = null;
          setUser(null);
        }
      } catch (error) {
        console.error('[AuthContext] Error in initializeAuth:', error);
      } finally {
        setIsInitializing(false);
        setLoading(false);
      }
    };

    const watchdog = setTimeout(() => {
      if (isInitializing || loading) {
        console.warn(`[AuthContext] Watchdog triggered (20s limit): clearing stuck loading states. Initializing: ${isInitializing}, Loading: ${loading}`);
        setIsInitializing(false);
        setLoading(false);
      }
    }, 20000);

    initializeAuth();

    const navTimer = setTimeout(() => setIsNavReady(true), 1);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setSession(session);
        setUser(session.user);
        currentSessionRef.current = session;
        const isDemoUser = session.user.email?.startsWith('demo.') || false;
        setIsDemo(isDemoUser);
        if (isDemoUser) {
          setWasDemo(true);
        }
        await AsyncStorage.setItem('session_start_time', Date.now().toString());
        loadUserProfile(session.user.id);
        await startTimeoutTimer(isDemoUser);

        // Subscribe to Realtime for live session revocation from other devices
        if (realtimeChannelRef.current) {
          supabase.removeChannel(realtimeChannelRef.current);
        }
        const channel = supabase
          .channel(`session-revocation:${session.user.id}`)
          .on('postgres_changes', {
            event: 'UPDATE',
            schema: 'public',
            table: 'user_sessions',
            filter: `user_id=eq.${session.user.id}`,
          }, (payload) => {
            const updated = payload.new as any;
            if (updated?.is_revoked === true && !isManualLogout.current) {
              console.warn('[AuthContext] Session revoked by another device/admin');
              // Persist reason then clear state — safeSignOut will be a no-op since
              // Supabase already invalidated the session on the server side.
              AsyncStorage.setItem('logout_reason', LogoutReason.REVOKED_BY_OTHER_DEVICE).then(() => {
                handleLogout(true, LogoutReason.REVOKED_BY_OTHER_DEVICE);
              });
            }
          })
          .subscribe();
        realtimeChannelRef.current = channel;
      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
        setSession(session);
        setUser(session.user);
        currentSessionRef.current = session;
      } else if (event === 'SIGNED_OUT') {
        // IMPORTANT: Do NOT call handleLogout() here — it calls authService.signOut(),
        // which emits another SIGNED_OUT event, causing an infinite loop.
        // The sign-out has already happened; just clear local state.
        if (isManualLogout.current) return; // already handled by handleLogout
        const silent = isInitializingRef.current || !isNavReadyRef.current;
        setSession(null);
        setUser(null);
        setProfile(null);
        setIsSessionExpiring(false);
        setSessionWarningDismissed(false);
        setRoleInfo({ studentId: null, teacherId: null, adminId: null, parentId: null, displayId: null });
        setIsDemo(false);
        setSubscriptionStatus(null);
        setSubscriptionPlan(null);
        setTrialEndDate(null);
        setInstitutionName(null);
        setIsMain(false);
        setIsPlatformAdmin(false);
        setAddonFlags({ messaging: false, library: false, finance: false, analytics: false, bursary: false, attendance: false, diary: false });
        setCustomStudentLimit(null);
        setLoading(false);
        setIsInitializing(false);
        clearTimer();
        clearHeartbeat();
        if (realtimeChannelRef.current) {
          supabase.removeChannel(realtimeChannelRef.current);
          realtimeChannelRef.current = null;
        }
        currentSessionRef.current = null;
        lastLoadedUserId.current = null;
        
        // Read persisted logout reason and show the appropriate toast
        AsyncStorage.getItem('logout_reason').then((rawReason) => {
          const reason = (rawReason as LogoutReason) || LogoutReason.UNKNOWN;
          const msg = LOGOUT_MESSAGES[reason] ?? LOGOUT_MESSAGES[LogoutReason.UNKNOWN];
          if (!silent) {
              Toast.show({
                type: reason === LogoutReason.INSTITUTION_SUSPENDED ? 'error' : 'info',
                text1: msg.title,
                text2: msg.body,
                position: 'top',
              });
            }
          AsyncStorage.removeItem('logout_reason').catch(() => {});
        }).catch(() => {
          if (!silent) {
            Toast.show({ type: 'info', text1: 'Logged Out', text2: 'You have been logged out.', position: 'top' });
          }
        });
      }
    });

    const appStateSubscription = AppState.addEventListener('change', async (nextAppState: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        await resetSessionTimer();
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.unsubscribe()
      if (realtimeChannelRef.current) {
        supabase.removeChannel(realtimeChannelRef.current);
        realtimeChannelRef.current = null;
      }
      appStateSubscription.remove()
      clearTimer()
      clearHeartbeat()
      clearTimeout(watchdog)
      clearTimeout(navTimer)
    }
  }, [])

  const value = React.useMemo(() => ({
    session, user, profile,
    studentId: roleInfo.studentId,
    teacherId: roleInfo.teacherId,
    adminId: roleInfo.adminId,
    parentId: roleInfo.parentId,
    displayId: roleInfo.displayId,
    subscriptionStatus, subscriptionPlan, trialEndDate, institutionName,
    loading, isInitializing, isNavReady, isProfileLoading,
    isSessionExpiring,
    dismissSessionWarning,
    signIn: handleSignIn,
    setLoading,
    signOut: handleLogout,
    logout: handleLogout,
    resetPassword: authService.resetPassword,
    refreshProfile,
    resetSessionTimer,
    startDemo: handleStartDemo,
    isDemo,
    wasDemo,
    clearWasDemo,
    isTrial: subscriptionStatus === 'trial' || subscriptionPlan === 'trial',
    isMain,
    isPlatformAdmin,
    canonicalRole,
    addonMessaging: addonFlags.messaging,
    addonLibrary: addonFlags.library,
    addonFinance: addonFlags.finance,
    addonAnalytics: addonFlags.analytics,
    addonBursary: addonFlags.bursary,
    addonAttendance: addonFlags.attendance,
    addonDiary: addonFlags.diary,
    customStudentLimit,
    getRoleRedirect,
  }), [session, user, profile, roleInfo, subscriptionStatus, subscriptionPlan, trialEndDate, institutionName, loading, isInitializing, isNavReady, isProfileLoading, isSessionExpiring, sessionWarningDismissed, isDemo, wasDemo, clearWasDemo, isMain, isPlatformAdmin, canonicalRole, addonFlags, customStudentLimit]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
