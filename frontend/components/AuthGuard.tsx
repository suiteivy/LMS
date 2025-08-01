import React from 'react'
import { View, Text, ActivityIndicator } from 'react-native'
import { useAuth } from '../contexts/AuthContext'

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

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: 10 }}>Loading...</Text>
      </View>
    )
  }

  if (requireAuth && !user) {
    return (
      <>
        {fallback || (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Text>Please sign in to continue</Text>
          </View>
        )}
      </>
    )
  }

  if (!requireAuth && user) {
    return (
      <>
        {fallback || (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Text>You are already signed in</Text>
          </View>
        )}
      </>
    )
  }

  return <>{children}</>
}
