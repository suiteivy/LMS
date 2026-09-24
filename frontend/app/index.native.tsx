/**
 * Root Index — Native Platform Route
 * 
 * On mobile, this completely replaces the web landing page:
 * - First launch (onboarding not completed) → renders OnboardingScreen
 * - Once completed or subsequent launches → redirects to /(auth)/signIn or role dashboard
 * 
 * The web version (app/index.tsx) remains completely unaffected.
 */

import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { OnboardingScreen, ONBOARDING_COMPLETE_KEY } from '@/mobile/screens/auth/OnboardingScreen';
import { mobileColors } from '@/mobile/utils/platform';

export default function NativeRootIndex() {
  const { session, isInitializing } = useAuth();
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    if (isInitializing) return;

    const checkState = async () => {
      try {
        const completed = await AsyncStorage.getItem(ONBOARDING_COMPLETE_KEY);

        if (!completed) {
          setShowOnboarding(true);
          setChecking(false);
          return;
        }

        // Onboarding already done:
        // If not logged in, route to mobile sign-in
        if (!session) {
          router.replace('/(auth)/signIn' as any);
        }
        // If logged in, _layout.tsx handles redirecting to role dashboard
      } catch {
        if (!session) {
          router.replace('/(auth)/signIn' as any);
        }
      } finally {
        setChecking(false);
      }
    };

    checkState();
  }, [isInitializing, session]);

  if (checking || isInitializing) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: mobileColors.bgDeep,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ActivityIndicator size="large" color={mobileColors.flame} />
      </View>
    );
  }

  if (showOnboarding) {
    return <OnboardingScreen />;
  }

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: mobileColors.bgDeep,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <ActivityIndicator size="small" color={mobileColors.flame} />
    </View>
  );
}
