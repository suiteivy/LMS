import type { SubscriptionTierInfo } from '@/hooks/useSubscriptionTier';

export type SettingsRole = 'admin' | 'teacher' | 'student' | 'parent';

export type AccessFeatureKey =
  | 'promotion'
  | 'grading'
  | 'attendance'
  | 'reports'
  | 'billing'
  | 'analytics'
  | 'messaging'
  | 'library';

export function hasFeatureAccess(tier: SubscriptionTierInfo, feature?: AccessFeatureKey): boolean {
  if (!feature) return true;

  switch (feature) {
    case 'analytics':
      return tier.hasAnalytics;
    case 'attendance':
      return tier.hasAttendance;
    case 'billing':
      return tier.showFinancials;
    case 'messaging':
      return tier.hasMessaging;
    case 'library':
      return tier.hasLibrary;
    case 'promotion':
    case 'grading':
    case 'reports':
    default:
      return true;
  }
}
