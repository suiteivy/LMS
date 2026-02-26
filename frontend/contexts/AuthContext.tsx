import { authService, supabase } from '@/libs/supabase'
import { Database } from '@/types/database'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Session, User } from '@supabase/supabase-js'
import { router } from 'expo-router'
import React, { createContext, useContext, useEffect, useRef, useState } from 'react'
import { AppState, AppStateStatus } from 'react-native'
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
  trialEndDate: string | null
  loading: boolean
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
  const [trialEndDate, setTrialEndDate] = useState<string | null>(null)
  const [isInitializing, setIsInitializing] = useState(true)
  const [isProfileLoading, setIsProfileLoading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [isDemo, setIsDemo] = useState(false)

  const timerRef = useRef<any>(null)
  const appState = useRef(AppState.currentState);
  const lastActive = useRef(Date.now());
  const isManualLogout = useRef(false);
  const currentSessionRef = useRef<Session | null>(null);
  const isDemoRef = useRef(false);
  useEffect(() => { isDemoRef.current = isDemo; }, [isDemo]);

  const handleLogout = async () => {
    isManualLogout.current = true;

    // ── Optimistic local clear — user sees instant response ──────────────────
    setSession(null);
    setUser(null);
    setProfile(null);
    setRoleInfo({ studentId: null, teacherId: null, adminId: null, parentId: null, displayId: null });
    setSubscriptionStatus(null);
    setTrialEndDate(null);
    setLoading(false);       // ← KEY FIX: drop the overlay immediately
    setIsInitializing(false);
    clearTimer();

    // ── Navigate + toast immediately, don't wait for network ─────────────────
    if (isDemoRef.current) {
      Toast.show({ type: 'info', text1: 'Session ended', text2: 'Demo session ended.', position: 'bottom' });
      router.replace('/(auth)/demo');
    } else {
      Toast.show({ type: 'success', text1: 'Logged Out', text2: 'You have been logged out successfully.', position: 'bottom' });
      router.replace('/(auth)/signIn');
    }

    // ── Fire-and-forget the actual Supabase signOut + cleanup ─────────────────
    Promise.all([
      authService.signOut(),
      AsyncStorage.removeItem('demo_expiry').catch(() => { }),
    ]).finally(() => {
      setTimeout(() => { isManualLogout.current = false; }, 500);
    });

    return { error: null };
  }

  const handleStartDemo = async (role: string) => {
    const result = await authService.startDemoSession(role);
    if (!result.error && result.data) {
      const expiry = Date.now() + 15 * 60 * 1000;
      await AsyncStorage.setItem('demo_expiry', expiry.toString());
    }
    return result;
  }

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }

  const resetSessionTimer = () => {
    if (session) startTimeoutTimer()
  }

  const startTimeoutTimer = () => {
    clearTimer()
    timerRef.current = setTimeout(async () => {
      console.log('Session timeout reached (24 hours), logging out...')
      await handleLogout()
    }, 24 * 60 * 60 * 1000)
  }

  const lastLoadedUserId = useRef<string | null>(null);
  const loadingUserId = useRef<string | null>(null);

  const loadUserProfile = async (userId: string): Promise<UserProfile | null> => {
    if ((lastLoadedUserId.current === userId && profile && !loading) || loadingUserId.current === userId) {
      return profile;
    }

    loadingUserId.current = userId;
    try {
      setIsProfileLoading(true);
      const { data, error } = await supabase
        .from('users')
        .select('*, students(id), teachers(id), admins(id), parents(id), institutions(subscription_status, trial_end_date)')
        .eq('id', userId)
        .single()

      if (error) {
        console.error('Error loading profile:', error)
        setProfile(null)
        setSubscriptionStatus(null)
        setTrialEndDate(null)
        lastLoadedUserId.current = null;
        return null
      }

      const userData = data as any;
      setProfile(userData as UserProfile)

      // Set Subscription Data
      if (userData.institutions) {
        setSubscriptionStatus(userData.institutions.subscription_status || null)
        setTrialEndDate(userData.institutions.trial_end_date || null)
      } else {
        setSubscriptionStatus(null)
        setTrialEndDate(null)
      }

      lastLoadedUserId.current = userId;

      const getRoleId = (roleData: any) => {
        if (!roleData) return null;
        if (Array.isArray(roleData)) return roleData[0]?.id || null;
        return roleData.id || null;
      };

      if (userData.role === 'student') {
        const id = getRoleId(userData.students);
        setRoleInfo(prev => ({ ...prev, studentId: id, displayId: id }));
      } else if (userData.role === 'teacher') {
        const id = getRoleId(userData.teachers);
        setRoleInfo(prev => ({ ...prev, teacherId: id, displayId: id }));
      } else if (userData.role === 'admin') {
        const id = getRoleId(userData.admins);
        setRoleInfo(prev => ({ ...prev, adminId: id, displayId: id }));
      } else if (userData.role === 'parent') {
        const id = getRoleId(userData.parents);
        setRoleInfo(prev => ({ ...prev, parentId: id, displayId: id }));
      }

      return userData as UserProfile
    } catch (err) {
      setProfile(null)
      lastLoadedUserId.current = null;
      return null
    } finally {
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
      try {
        const { data: { session: initialSession }, error: sessionError } = await supabase.auth.getSession();

        if (initialSession) {
          const { data: { user: validatedUser }, error: userError } = await supabase.auth.getUser();

          if (userError || !validatedUser) {
            setSession(null);
            currentSessionRef.current = null;
            setUser(null);
            const persistedTrial = await AsyncStorage.getItem('is_demo_mode');
            setIsDemo(persistedTrial === 'true');
          } else {
            setSession(initialSession);
            currentSessionRef.current = initialSession;
            setUser(validatedUser);

            const isDemoUser = validatedUser.email?.startsWith('demo.') || false;
            setIsDemo(isDemoUser);
            if (isDemoUser) await AsyncStorage.setItem('is_demo_mode', 'true');

            await loadUserProfile(validatedUser.id);
            startTimeoutTimer();
          }
        } else {
          setSession(null);
          currentSessionRef.current = null;
          setUser(null);
          const persistedTrial = await AsyncStorage.getItem('is_demo_mode');
          setIsDemo(persistedTrial === 'true');
        }
      } catch (error) {
        console.error('Error in initializeAuth:', error)
      } finally {
        setIsInitializing(false)
        setLoading(false)
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      try {
        setSession(session)
        setUser(session?.user ?? null)

        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          currentSessionRef.current = session;
          startTimeoutTimer()
          if (session?.user) {
            const isDemoUser = session.user.email?.startsWith('demo.') || false;
            setIsDemo(isDemoUser);
            if (isDemoUser) {
              AsyncStorage.setItem('is_demo_mode', 'true');
            } else {
              AsyncStorage.removeItem('is_demo_mode');
            }
            loadUserProfile(session.user.id)
          }
        } else if (event === 'SIGNED_OUT') {
          clearTimer()
          setProfile(null)
          setRoleInfo({ studentId: null, teacherId: null, adminId: null, parentId: null, displayId: null })
          setSubscriptionStatus(null)
          setTrialEndDate(null)
          setLoading(false)        // ← KEY FIX: prevent 3s watchdog delay
          setIsInitializing(false) // ← belt-and-suspenders

          // Only show unexpected logout toast if it wasn't triggered manually
          if (!isManualLogout.current && currentSessionRef.current) {
            const wasDemo = isDemoRef.current;
            Toast.show({
              type: 'info',
              text1: wasDemo ? 'Session ended' : 'Session Expired',
              text2: wasDemo ? 'Demo session time limit reached.' : 'Please sign in again.',
              position: 'bottom',
              visibilityTime: 4000,
            });
          }
          currentSessionRef.current = null;
          setTimeout(() => { isManualLogout.current = false; }, 500);
        }

        // Handle edge case: auth event without session
        // NOTE: do NOT await this — it was causing a second blocking signOut call
        if (!session && (event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED')) {
          authService.signOut(); // fire-and-forget, no await
        }
      } catch (error) {
        console.error('Error in auth listener:', error)
      }
    })

    const watchdog = setTimeout(() => {
      if (isInitializing) setIsInitializing(false)
      if (loading) setLoading(false)
    }, 3000)

    const appStateSubscription = AppState.addEventListener('change', async (nextAppState: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        const now = Date.now();
        const diff = now - lastActive.current;
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        if (diff > 24 * 60 * 60 * 1000 && currentSession) {
          isManualLogout.current = true;
          await authService.signOut();
          Toast.show({ type: 'info', text1: 'Session Expired', text2: 'Logged out due to inactivity.' });
          router.push('/(auth)/signIn')
          setTimeout(() => { isManualLogout.current = false; }, 1000);
        } else {
          resetSessionTimer();
        }
      }
      if (nextAppState.match(/inactive|background/)) lastActive.current = Date.now();
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
    session,
    user,
    profile,
    studentId: roleInfo.studentId,
    teacherId: roleInfo.teacherId,
    adminId: roleInfo.adminId,
    parentId: roleInfo.parentId,
    displayId: roleInfo.displayId,
    subscriptionStatus,
    trialEndDate,
    loading,
    isInitializing,
    isProfileLoading,
    signIn: authService.signIn,
    signOut: handleLogout,
    logout: handleLogout,
    resetPassword: authService.resetPassword,
    refreshProfile,
    resetSessionTimer,
    startDemo: handleStartDemo,
    isDemo,
  }), [session, user, profile, roleInfo, subscriptionStatus, trialEndDate, loading, isInitializing, isProfileLoading, isDemo]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}