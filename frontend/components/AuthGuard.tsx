import { router } from 'expo-router'
import React, { useEffect } from 'react'
import { ActivityIndicator, Text, View } from 'react-native'
import { useAuth } from '../contexts/AuthContext'

interface AuthGuardProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  requireAuth?: boolean
  allowedRoles?: string[] // New prop
}

export const AuthGuard: React.FC<AuthGuardProps> = ({
  children,
  fallback = null,
  requireAuth = true,
  allowedRoles
}) => {
  const { user, profile, isInitializing } = useAuth()
  const hasBeenInitialized = React.useRef(false)
  const [shouldShowOverlay, setShouldShowOverlay] = React.useState(false)

  useEffect(() => {
    if (!isInitializing) {
      hasBeenInitialized.current = true
    }
  }, [isInitializing])

  useEffect(() => {
    if (!isInitializing && requireAuth) {
      if (!user) {
        console.log('AuthGuard: No user found. Global AuthHandler will redirect.')
      } else if (allowedRoles && profile && !allowedRoles.includes(profile.role)) {
        console.log(`AuthGuard: User role ${profile.role} not allowed, redirecting...`)
        if (profile.role === 'admin') router.replace('/(admin)')
        else if (profile.role === 'teacher') router.replace('/(teacher)')
        else router.replace('/(student)')
      }
    }
  }, [isInitializing, user, profile, requireAuth, allowedRoles])

  // If we require auth and have no user, we naturally want to block the view 
  // until the redirect happens. We use an overlay to keep the component mounted.
  // This prevents the "flash" of empty specific-role content (like "0.00 GPA" or "Student")
  // while the navigation system is processing the redirect.
  // We check !isInitializing because if we ARE initializing, the spinner above handles it.
  const isLoggedOut = requireAuth && !user && !isInitializing;

  // CRITICAL: If we are initializing and haven't rendered children yet, we MUST block.
  // But once we HAVE rendered children (hasBeenInitialized=true), we must NEVER return a 
  // different top-level component (like a View with ActivityIndicator) because that 
  // destroys the navigation context for anything inside 'children'.
  if (isInitializing && !hasBeenInitialized.current) {
    return (
      <View 
        style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F1FFF8' }}
      >
        <ActivityIndicator size="large" color="#1ABC9C" />
        <Text className="mt-2 text-[#2C3E50]">Verifying access...</Text>
      </View>
    )
  }

  // If we require auth and have no user, we might be about to redirect.
  // We keep children mounted but can show an overlay if needed.
  return (
    <View style={{ flex: 1 }}>
      {children}
      {isInitializing && hasBeenInitialized.current && (
        <View 
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255, 255, 255, 0.3)' }}
        >
           <ActivityIndicator size="small" color="#1ABC9C" />
        </View>
      )}

      {/* Logout Blocker: instantly hide content when session is gone */}
      {isLoggedOut && (
        <View 
          style={{ 
            position: 'absolute', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            backgroundColor: 'white', 
            zIndex: 9999,
          }}
        />
      )}
    </View>
  )
}
