import React, { createContext, useContext, useEffect, useState, useRef } from 'react'
import { Session, User } from '@supabase/supabase-js'
import { AppState, AppStateStatus } from 'react-native'
import { Database } from '@/types/database'
import { authService, supabase } from '@/libs/supabase'
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
  signIn: (email: string, password: string) => Promise<{ data: any; error: any }>
  signOut: () => Promise<{ error: any }>
  logout: () => Promise<void>
  resetPassword: (email: string) => Promise<{ error: any }>
  refreshProfile: () => Promise<UserProfile | null>
  resetSessionTimer: () => void
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const logout = async () => {
  await authService.signOut();
};

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
  const [studentId, setStudentId] = useState<string | null>(null)
  const [teacherId, setTeacherId] = useState<string | null>(null)
  const [adminId, setAdminId] = useState<string | null>(null)
  const [parentId, setParentId] = useState<string | null>(null)
  const [displayId, setDisplayId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const timerRef = useRef<any>(null)
  const appState = useRef(AppState.currentState);
  const lastActive = useRef(Date.now());

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
    // 10 minutes = 10 * 60 * 1000 ms
    timerRef.current = setTimeout(async () => {
      console.log('Session timeout reached (10 min), logging out...')
      await authService.signOut()
    }, 10 * 60 * 1000)
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
      setLoading(true);
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
        setStudentId(id);
        setDisplayId(id);
      } else if (userData.role === 'teacher') {
        const id = getRoleId(userData.teachers);
        setTeacherId(id);
        setDisplayId(id);
      } else if (userData.role === 'admin') {
        const id = getRoleId(userData.admins);
        setAdminId(id);
        setDisplayId(id);
      } else if (userData.role === 'parent') {
        const id = getRoleId(userData.parents);
        setParentId(id);
        setDisplayId(id);
      }

      return userData as UserProfile
    } catch (err) {
      console.error('Unexpected error loading profile:', err)
      setProfile(null)
      lastLoadedUserId.current = null;
      return null
    } finally {
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
      try {
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        if (initialSession) {
          setSession(initialSession)
          setUser(initialSession.user)
          await loadUserProfile(initialSession.user.id)
          startTimeoutTimer()
        }
      } catch (error) {
        console.error('Error in initializeAuth:', error)
      } finally {
        setLoading(false)
      }
    };

    initializeAuth();

    // 2. Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      try {
        setSession(session)
        setUser(session?.user ?? null)

        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          startTimeoutTimer()
          if (session?.user) {
            loadUserProfile(session.user.id)
          }
        } else if (event === 'SIGNED_OUT') {
          clearTimer()
          setProfile(null)
          setStudentId(null)
          setTeacherId(null)
          setAdminId(null)
          setParentId(null)
          setDisplayId(null)
          console.log('User signed out, state cleared')
        }

        // Handle edge case: auth event without session
        if (!session && (event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED')) {
          console.warn('Auth event without session, forcing logout')
          await authService.signOut()
        }
      } catch (error) {
        console.error('Error in auth listener:', error)
      }
    })

    // 3. Watchdog: ensure loading resolves even if events stall
    const watchdog = setTimeout(() => {
      if (loading) {
        console.warn('Watchdog: Loading still true after 10s, forcing false')
        setLoading(false)
      }
    }, 10000)


    const appStateSubscription = AppState.addEventListener('change', async (nextAppState: AppStateStatus) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        // App has come to the foreground
        const now = Date.now();
        const diff = now - lastActive.current;
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        // If backgrounded for more than 10 mins
        if (diff > 10 * 60 * 1000 && currentSession) {
          console.log('Inactive for more than 10 mins in background, logging out');
          await authService.signOut();
          Toast.show({
            type: 'info',
            text1: 'Session Expired',
            text2: 'Logged out due to inactivity.'
          });
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
    studentId,
    teacherId,
    adminId,
    parentId,
    displayId,
    loading,
    signIn: authService.signIn,
    signOut: authService.signOut,
    logout: logout,
    resetPassword: authService.resetPassword,
    refreshProfile,
    resetSessionTimer,
  }), [session, user, profile, studentId, teacherId, adminId, parentId, displayId, loading]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
