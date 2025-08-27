import { useEffect } from 'react'
import { useNavigation } from '@react-navigation/native'
import { useAuth } from '../contexts/AuthContext'

export const useRequireAuth = (redirectTo: string = 'SignIn') => {
  const { user, loading } = useAuth()
  const navigation = useNavigation()

  useEffect(() => {
    if (!loading && !user) {
      navigation.navigate(redirectTo as never)
    }
  }, [user, loading, navigation, redirectTo])

  return { user, loading }
}
