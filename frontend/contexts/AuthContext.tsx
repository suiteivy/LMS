import React, { createContext, useContext, useEffect, useState, useRef } from 'react'
import { Session, User } from '@supabase/supabase-js'
import { Database } from '@/types/database'
import { authService, supabase } from '@/libs/supabase'

type UserProfile = Database['public']['Tables']['users']['Row']

interface AuthContextType {
  session: Session | null
  user: User | null
  profile: UserProfile | null
  studentId: string | null
  teacherId: string | null
  adminId: string | null
  displayId: string | null
  loading: boolean
  signUp: (email: string, password: string, userData: {
    full_name: string
    role: 'admin' | 'student' | 'teacher' 
    institution_id?: string
  }) => Promise<{ data: any; error: any }>
  signIn: (email: string, password: string) => Promise<{ data: any; error: any }>
  signOut: () => Promise<{ error: any }>
  resetPassword: (email: string) => Promise<{ error: any }>
  refreshProfile: () => Promise<UserProfile | null>
  resetSessionTimer: () => void
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
  const [studentId, setStudentId] = useState<string | null>(null)
  const [teacherId, setTeacherId] = useState<string | null>(null)
  const [adminId, setAdminId] = useState<string | null>(null)
  const [displayId, setDisplayId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const timerRef = useRef<any>(null)

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

  const loadUserProfile = async (userId: string): Promise<UserProfile | null> => {
    try {
      // 1. Get Base Profile
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single<UserProfile>()

      if (error || !data) {
        console.error('Error loading profile:', error)
        return null
      }
      setProfile(data as UserProfile)

      // 2. Get Role-Specific ID
      if (data.role === 'student') {
        const { data: stuData } = await supabase.from('students').select('id').eq('user_id', userId).single() as { data: { id: string } | null };
        if (stuData) {
          setStudentId(stuData.id);
          setDisplayId(stuData.id);
        }
      } else if (data.role === 'teacher') {
        const { data: teaData } = await supabase.from('teachers').select('id').eq('user_id', userId).single() as { data: { id: string } | null };
        if (teaData) {
          setTeacherId(teaData.id);
          setDisplayId(teaData.id);
        }
      } else if (data.role === 'admin') {
        const { data: admData } = await supabase.from('admins').select('id').eq('user_id', userId).single() as { data: { id: string } | null };
        if (admData) {
          setAdminId(admData.id);
          setDisplayId(admData.id);
        }
      }

      return data as UserProfile
    } catch (error) {
      console.error('Error loading profile:', error)
      return null
    }
  }

  const refreshProfile = async (): Promise<UserProfile | null> => {
    if (user) {
      return await loadUserProfile(user.id)
    }
    return null
  }

  useEffect(() => {
    // 1. Initial session check for faster startup
    supabase.auth.getSession()
      .then(async ({ data: { session } }) => {
        if (session) {
          setSession(session)
          setUser(session.user)
          await loadUserProfile(session.user.id)
          startTimeoutTimer()
        }
        setLoading(false)
      })
      .catch(error => {
        console.error('Error in getSession:', error)
        setLoading(false)
      })

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

    return () => {
      subscription.unsubscribe()
      clearTimer()
      clearTimeout(watchdog)
    }
  }, [])

  const value: AuthContextType = {
    session,
    user,
    profile,
    studentId,
    teacherId,
    adminId,
    displayId,
    loading,
    signUp: authService.signUp,
    signIn: authService.signIn,
    signOut: authService.signOut,
    resetPassword: authService.resetPassword,
    refreshProfile,
    resetSessionTimer,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
