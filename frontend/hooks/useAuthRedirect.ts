import { useEffect } from 'react'
import { useNavigation } from '@react-navigation/native'
import { useAuth } from '../contexts/AuthContext'

export const useAuthRedirect = (redirectTo: string = 'Home') => {
  const { user, loading } = useAuth()
  const navigation = useNavigation()

  useEffect(() => {
    if (!loading) {
      if (user) {
        navigation.navigate(redirectTo as never)
      }
    }
  }, [user, loading, navigation, redirectTo])
}
