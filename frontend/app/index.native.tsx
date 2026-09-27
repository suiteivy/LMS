/**
 * Root Index — Native Platform Route
 * 
 * On mobile, this completely replaces the web landing page:
 * - Routes unauthenticated users straight to /(auth)/signIn
 * - Routes authenticated users straight to their role dashboard via _layout.tsx
 * - Displays LaunchScreenSkeleton while resolving auth state
 * 
 * The web version (app/index.tsx) remains completely unaffected.
 */

import React, { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { LaunchScreenSkeleton } from '@/mobile/components/skeletons/MobileSkeleton';

export default function NativeRootIndex() {
  const { session, isInitializing } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isInitializing) return;

    if (!session) {
      router.replace('/(auth)/signIn' as any);
    }
  }, [isInitializing, session, router]);

  return <LaunchScreenSkeleton />;
}
