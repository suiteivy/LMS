import React, { useEffect } from 'react'
import { View, Text, ActivityIndicator } from 'react-native'
import { useAuth } from '../contexts/AuthContext'
import { router } from 'expo-router'

interface AuthGuardProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  requireAuth?: boolean
}

export const AuthGuard: React.FC<AuthGuardProps> = ({
  children,
  fallback = null,
  requireAuth = true
}) => {
  const { user, loading } = useAuth()

  useEffect(() => {
    if (!loading && requireAuth && !user) {
      console.log('AuthGuard: No user found, redirecting to sign-in...')
      router.replace('/(auth)/signIn')
    }
  }, [loading, user, requireAuth])

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F1FFF8' }}>
        <ActivityIndicator size="large" color="#1ABC9C" />
        <Text style={{ marginTop: 10, color: '#2C3E50' }}>Loading session...</Text>
      </View>
    )
  }

  if (requireAuth && !user) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F1FFF8' }}>
        <ActivityIndicator size="small" color="#1ABC9C" />
      </View>
    )
  }

  return <>{children}</>
}
