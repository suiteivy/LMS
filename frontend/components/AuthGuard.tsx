import React, { useEffect } from 'react'
import { View, Text, ActivityIndicator } from 'react-native'
import { useAuth } from '../contexts/AuthContext'
import { router } from 'expo-router'

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
  const { user, profile, isInitializing, loading } = useAuth() // Get profile to check role

  useEffect(() => {
    if (!isInitializing && requireAuth) {
      if (!user) {
        console.log('AuthGuard: No user found, redirecting to sign-in...')
        router.replace('/(auth)/signIn')
      } else if (allowedRoles && profile && !allowedRoles.includes(profile.role)) {
        console.log(`AuthGuard: User role ${profile.role} not allowed, redirecting...`)
        // Redirect to their appropriate dashboard based on their actual role
        if (profile.role === 'admin') router.replace('/(admin)')
        else if (profile.role === 'teacher') router.replace('/(teacher)')
        else router.replace('/(student)')
      }
    }
  }, [isInitializing, user, profile, requireAuth, allowedRoles])

  // Only block the UI if we are initializing or if we have no user when auth is required
  if (isInitializing || (requireAuth && !user)) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F1FFF8' }}>
        <ActivityIndicator size="large" color="#1ABC9C" />
        <Text style={{ marginTop: 10, color: '#2C3E50' }}>Verifying access...</Text>
      </View>
    )
  }

  // If we have a user but profile is still loading, we allow rendering.
  // This prevents full-screen reloads when profile is re-fetched in bg.
  return <View style={{ flex: 1 }}>{children}</View>
}
