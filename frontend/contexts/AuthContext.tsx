import { authService, supabase } from '@/libs/supabase'
import { Database } from '@/types/database'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Session, User } from '@supabase/supabase-js'
import { router } from 'expo-router'
import React, { createContext, useContext, useEffect, useRef, useState } from 'react'
import { AppState, AppStateStatus, Platform } from 'react-native'
import Toast from 'react-native-toast-message'

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
  isMain: boolean
  isPlatformAdmin: boolean
  loading: boolean
  setLoading: (loading: boolean) => void
  isInitializing: boolean
  isProfileLoading: boolean
  signIn: (email: string, password: string) => Promise<{ data: any; error: any }>
  signOut: () => Promise<{ error: any }>
  logout: () => Promise<{ error: any }>
  resetPassword: (email: string) => Promise<{ error: any }>
  refreshProfile: () => Promise<UserProfile | null>
  resetSessionTimer: () => void
  startDemo: (role: string) => Promise<{ data: any; error: any }>
  isDemo: boolean
  isTrial: boolean
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

  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null)
  const [subscriptionPlan, setSubscriptionPlan] = useState<string | null>(null)
  const [trialEndDate, setTrialEndDate] = useState<string | null>(null)
  const [isMain, setIsMain] = useState(false)
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false)
  const [isInitializing, setIsInitializing] = useState(true)
  const [isProfileLoading, setIsProfileLoading] = useState(false)
  const [loading, setLoading] = useState(false)
  const [isDemo, setIsDemo] = useState(false)

  const timerRef = useRef<any>(null)
  const appState = useRef(AppState.currentState);
  const lastActive = useRef(Date.now());
  const isManualLogout = useRef(false);
  const currentSessionRef = useRef<Session | null>(null);
  const isDemoRef = useRef(false);
  useEffect(() => { isDemoRef.current = isDemo; }, [isDemo]);

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }

  const handleLogout = async () => {
    isManualLogout.current = true;
    setSession(null);
    setUser(null);
    setProfile(null);
    setRoleInfo({ studentId: null, teacherId: null, adminId: null, parentId: null, displayId: null });
    setIsDemo(false);
    setSubscriptionStatus(null);
    setSubscriptionPlan(null);
    setTrialEndDate(null);
    setIsMain(false);
    setIsPlatformAdmin(false);
    setLoading(false);
    setIsInitializing(false);
    clearTimer();

    if (isDemoRef.current) {
      Toast.show({ type: 'info', text1: 'Session ended', text2: 'Demo session ended.', position: 'bottom' });
    } else {
      Toast.show({ type: 'success', text1: 'Logged Out', text2: 'You have been logged out successfully.', position: 'bottom' });
    }

    Promise.all([
      authService.signOut(),
      AsyncStorage.removeItem('demo_expiry').catch(() => { }),
      AsyncStorage.removeItem('is_demo_mode').catch(() => { }),
    ]).finally(() => {
      setTimeout(() => { isManualLogout.current = false; }, 500);
    });

    return { error: null };
  }

  const handleSignIn = async (email: string, password: string) => {
    setLoading(true);
    try {
      const result = await authService.signIn(email, password);
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

  const resetSessionTimer = () => {
    if (session) startTimeoutTimer()
  }

  const startTimeoutTimer = (isDemoSession?: boolean) => {
    clearTimer()
    const isActuallyDemo = isDemoSession !== undefined ? isDemoSession : isDemo;
    const durationMs = isActuallyDemo ? 15 * 60 * 1000 : 24 * 60 * 60 * 1000;
    timerRef.current = setTimeout(async () => {
      await handleLogout()
    }, durationMs)
  }

  const lastLoadedUserId = useRef<string | null>(null);
  const loadingUserId = useRef<string | null>(null);

  const loadUserProfile = async (userId: string): Promise<UserProfile | null> => {
    if ((lastLoadedUserId.current === userId && profile && !loading) || loadingUserId.current === userId) {
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
        .select('*, students(id), teachers(id), admins(id), parents(id), institutions(subscription_status, subscription_plan, trial_end_date), platform_admins(id)')
        .eq('id', userId)
        .single()

      if (error) throw error;

      const userData = data as any;

      // 1. Calculate all derived states FIRST
      const isPlatformAdminFlag = !!userData.platform_admins?.[0] || userData.role === 'master_admin';
      const isMainFlag = userData.admins?.[0]?.is_main || false;

      let newSubscriptionStatus = null;
      let newSubscriptionPlan = null;
      let newTrialEndDate = null;

      if (userData.institutions) {
        newSubscriptionStatus = userData.institutions.subscription_status || null;
        newSubscriptionPlan = userData.institutions.subscription_plan || null;
        newTrialEndDate = userData.institutions.trial_end_date || null;
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

      // 2. Batch State Updates
      setSubscriptionStatus(newSubscriptionStatus);
      setSubscriptionPlan(newSubscriptionPlan);
      setTrialEndDate(newTrialEndDate);
      setIsPlatformAdmin(isPlatformAdminFlag);
      setIsMain(isMainFlag);
      setRoleInfo(newRoleInfo);

      // Setting profile LAST ensures that any effects watching 'profile' 
      // see the most current version of all other auth states.
      setProfile(userData as UserProfile);

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
    if (user) return await loadUserProfile(user.id)
    return null
  }

  useEffect(() => {
    const initializeAuth = async () => {
      setIsInitializing(true);
      try {
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        if (initialSession) {
          // Race protection: timeout for getUser
          const userPromise = supabase.auth.getUser();
          const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('getUser timeout')), 3000));

          try {
            const { data: { user: validatedUser } } = await Promise.race([userPromise, timeoutPromise]) as any;
            if (validatedUser) {
              setSession(initialSession);
              currentSessionRef.current = initialSession;
              setUser(validatedUser);
              const isDemoUser = validatedUser.email?.startsWith('demo.') || false;
              setIsDemo(isDemoUser);
              await loadUserProfile(validatedUser.id);
              startTimeoutTimer(isDemoUser);
            } else {
              setIsInitializing(false);
              setLoading(false);
            }
          } catch (e) {
            console.error('[AuthContext] Error or timeout in getUser:', e);
            setIsInitializing(false);
            setLoading(false);
          }
        } else {
          setSession(null);
          currentSessionRef.current = null;
          setUser(null);
          setIsInitializing(false);
          setLoading(false);
        }
      } catch (error) {
        console.error('Error in initializeAuth:', error)
      } finally {
        setIsInitializing(false)
        setLoading(false)
      }
    };

    const watchdog = setTimeout(() => {
      if (isInitializing || loading) {
        console.warn('[AuthContext] Watchdog triggered: clearing stuck loading states');
        setIsInitializing(false);
        setLoading(false);
      }
    }, 3500);

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (event === 'SIGNED_IN' && session?.user) {
        currentSessionRef.current = session;
        loadUserProfile(session.user.id);
      } else if (event === 'SIGNED_OUT') {
        handleLogout();
      }
    });

    const appStateSubscription = AppState.addEventListener('change', async (nextAppState: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        resetSessionTimer();
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.unsubscribe()
      appStateSubscription.remove()
      clearTimer()
      clearTimeout(watchdog)
    }
  }, [])

  const value = React.useMemo(() => ({
    session, user, profile,
    studentId: roleInfo.studentId,
    teacherId: roleInfo.teacherId,
    adminId: roleInfo.adminId,
    parentId: roleInfo.parentId,
    displayId: roleInfo.displayId,
    subscriptionStatus, subscriptionPlan, trialEndDate,
    loading, isInitializing, isProfileLoading,
    signIn: handleSignIn,
    setLoading,
    signOut: handleLogout,
    logout: handleLogout,
    resetPassword: authService.resetPassword,
    refreshProfile,
    resetSessionTimer,
    startDemo: handleStartDemo,
    isDemo,
    isTrial: subscriptionStatus === 'trial' || subscriptionPlan === 'trial',
    isMain,
    isPlatformAdmin,
  }), [session, user, profile, roleInfo, subscriptionStatus, subscriptionPlan, trialEndDate, loading, isInitializing, isProfileLoading, isDemo, isMain, isPlatformAdmin]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}