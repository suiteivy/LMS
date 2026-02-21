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

  // Consolidate role-specific IDs to reduce state-cascade re-renders
  const [roleInfo, setRoleInfo] = useState({
    studentId: null as string | null,
    teacherId: null as string | null,
    adminId: null as string | null,
    parentId: null as string | null,
    displayId: null as string | null
  })

  const [isInitializing, setIsInitializing] = useState(true)
  const [isProfileLoading, setIsProfileLoading] = useState(false)
  const [loading, setLoading] = useState(true) // Legacy support for profile loading
  const [isDemo, setIsDemo] = useState(false)

  const timerRef = useRef<any>(null)
  const appState = useRef(AppState.currentState);
  const lastActive = useRef(Date.now());

  const isManualLogout = useRef(false);
  const currentSessionRef = useRef<Session | null>(null);

  // NEW: Track trial status in a ref to access it during logout events
  const isDemoRef = useRef(false);
  useEffect(() => { isDemoRef.current = isDemo; }, [isDemo]);

  const handleLogout = async () => {
    isManualLogout.current = true
    try {
      // Clear trial expiry mechanism
      AsyncStorage.removeItem('demo_expiry').catch(e => console.warn('Failed to clear expiry', e));

      const { error } = await authService.signOut();
      if (!error) {
        // Custom Toast for Trial vs Normal
        if (isDemoRef.current) {
          Toast.show({
            type: 'info',
            text1: 'Session ended',
            text2: 'Demo session ended.',
            position: 'bottom',
          });
          // EXPLICIT REDIRECT for Demo users
          router.replace('/(auth)/demo');
        } else {
          Toast.show({
            type: 'success',
            text1: 'Logged Out',
            text2: 'You have been logged out successfully.',
            position: 'bottom',
          });
        }
      }
      return { error };
    } finally {
      // Reset after a short delay to allow the event listener to fire
      setTimeout(() => {
        isManualLogout.current = false
      }, 1000)
    }
  }

  const handleStartDemo = async (role: string) => {
    const result = await authService.startDemoSession(role);
    if (!result.error && result.data) {
      // Set 15 minute expiry for the banner
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
    if (session) {
      startTimeoutTimer()
    }
  }

  const startTimeoutTimer = () => {
    clearTimer()
    // Increased to 24 hours for development (24 * 60 * 60 * 1000 ms)
    timerRef.current = setTimeout(async () => {
      console.log('Session timeout reached (24 hours), logging out...')
      await handleLogout()
    }, 24 * 60 * 60 * 1000)
  }

  const lastLoadedUserId = useRef<string | null>(null);
  const loadingUserId = useRef<string | null>(null);

  const loadUserProfile = async (userId: string): Promise<UserProfile | null> => {
    // Prevent redundant loads for the same user if we already have a profile
    // OR if we are already loading this specific user
    if ((lastLoadedUserId.current === userId && profile && !loading) || loadingUserId.current === userId) {
      return profile;
    }

    loadingUserId.current = userId;
    try {
      setIsProfileLoading(true);
      // Do NOT reset loading here — it causes flash-of-spinner on auth events.
      // Get Base Profile and Role-Specific IDs in a single query
      const { data, error } = await supabase
        .from('users')
        .select('*, students(id), teachers(id), admins(id), parents(id)')
        .eq('id', userId)
        .single()

      if (error) {
        console.error('Error loading profile:', error)
        setProfile(null)
        lastLoadedUserId.current = null;
        return null
      }

      const userData = data as any;
      setProfile(userData as UserProfile)
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
      // console.error('Unexpected error loading profile:', err)
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
    if (user) {
      return await loadUserProfile(user.id)
    }
    return null
  }

  useEffect(() => {
    // Consolidate initialization into a single start method
    const initializeAuth = async () => {
      // console.log('SUPABASE URL:', process.env.EXPO_PUBLIC_URL?.slice(0, 30))
      try {
        // 1. First get the session. This is the fastest way to get a local token.
        const { data: { session: initialSession }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          // console.log("AuthContext: Error getting initial session", sessionError.message);
        }

        if (initialSession) {
          // 2. Validate the session with getUser() to ensure it hasn't been revoked/invalidated on server
          const { data: { user: validatedUser }, error: userError } = await supabase.auth.getUser();

          if (userError || !validatedUser) {
            // If getUser fails, the local session is likely stale or invalid
            // console.log("AuthContext: Session invalid or expired after validation", userError?.message);
            setSession(null);
            currentSessionRef.current = null;
            setUser(null);

            // Re-check demo mode status from storage if no user
            const persistedTrial = await AsyncStorage.getItem('is_demo_mode');
            setIsDemo(persistedTrial === 'true');
          } else {
            // Session is valid
            setSession(initialSession);
            currentSessionRef.current = initialSession;
            setUser(validatedUser);

            const isDemoUser = validatedUser.email?.startsWith('demo.') || false;
            setIsDemo(isDemoUser);
            if (isDemoUser) {
              await AsyncStorage.setItem('is_demo_mode', 'true');
            }

            await loadUserProfile(validatedUser.id);
            startTimeoutTimer();
          }
        } else {
          // No session found
          setSession(null);
          currentSessionRef.current = null;
          setUser(null);

          // Check if we have a persisted trial state for the redirect logic
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

    // 2. Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      try {
        // console.log("AuthStateChange:", event);
        setSession(session)
        // Note: we don't strictly update currentSessionRef here for every event immediately
        // because we want 'SIGNED_OUT' to check if we HAD a session.
        // But for 'SIGNED_IN', we must update it.

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
          setRoleInfo({
            studentId: null,
            teacherId: null,
            adminId: null,
            parentId: null,
            displayId: null
          })

          // CRITICAL: Do NOT clear isDemo state here. 
          // We keep it true if it was true, so AuthHandler knows to redirect to /demo.
          // setIsTrial(false) <= REMOVED
          // We also don't clear AsyncStorage 'is_demo_mode' here, 
          // we only clear it when a NEW non-demo user signs in.

          // Only show "Unexpected Logout" if we actually THOUGHT we had a session
          // and it wasn't a manual logout.
          if (!isManualLogout.current && currentSessionRef.current) {
            const wasDemo = isDemoRef.current;

            // For trial users, we might get here if the token expires naturally.
            // We want to be sure we show the correct "Demo Ended" message.
            if (wasDemo) {
              Toast.show({
                type: 'info',
                text1: 'Session ended',
                text2: 'Demo session time limit reached.',
                position: 'bottom',
                visibilityTime: 4000,
              });
            } else {
              Toast.show({
                type: 'info',
                text1: 'Session Expired',
                text2: 'Please sign in again.',
                position: 'bottom',
                visibilityTime: 4000,
              });
            }
          }
          currentSessionRef.current = null;

          // Reset just in case
          setTimeout(() => { isManualLogout.current = false; }, 500);
        }

        // Handle edge case: auth event without session
        if (!session && (event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED')) {
          // Suppress console error for this specific expected flow
          await authService.signOut();
        }
      } catch (error) {
        console.error('Error in auth listener:', error)
      }
    })

    // 3. Watchdog: ensure loading resolves even if events stall
    const watchdog = setTimeout(() => {
      if (isInitializing) {
        setIsInitializing(false)
      }
      if (loading) {
        setLoading(false)
      }
    }, 3000)


    const appStateSubscription = AppState.addEventListener('change', async (nextAppState: AppStateStatus) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        // App has come to the foreground
        const now = Date.now();
        const diff = now - lastActive.current;
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        // If backgrounded for more than 24 hours
        if (diff > 24 * 60 * 60 * 1000 && currentSession) {
          // This is a "system" logout due to inactivity, but we might want a specific message.
          // The code originally had a specific toast here.
          // If we call handleLogout(), it suppresses the generic "Session Expired" toast 
          // (because isManualLogout=true) and we can show a specific one if we want.
          // OR we can just let the generic one happen.
          // The original code had:
          // await authService.signOut();
          // Toast.show(...)

          // Let's keep the explicit inactivity toast by using handleLogout (suppress generic) + explicit toast.
          isManualLogout.current = true; // suppress generic
          await authService.signOut();
          Toast.show({
            type: 'info',
            text1: 'Session Expired',
            text2: 'Logged out due to inactivity.'
          });
          router.push('/(auth)/signIn')
          setTimeout(() => { isManualLogout.current = false; }, 1000);

        } else {
          // Reset timer if we came back within 10 mins
          resetSessionTimer();
        }
      }

      if (nextAppState.match(/inactive|background/)) {
        lastActive.current = Date.now();
      }

      appState.current = nextAppState;
    });

    return () => {
      subscription.unsubscribe()
      appStateSubscription.remove()
      clearTimer()
      clearTimeout(watchdog)
    }
  }, []) // Fix syntax error extra bracket

  const value = React.useMemo(() => ({
    session,
    user,
    profile,
    studentId: roleInfo.studentId,
    teacherId: roleInfo.teacherId,
    adminId: roleInfo.adminId,
    parentId: roleInfo.parentId,
    displayId: roleInfo.displayId,
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
  }), [session, user, profile, roleInfo, loading, isInitializing, isProfileLoading, isDemo]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
