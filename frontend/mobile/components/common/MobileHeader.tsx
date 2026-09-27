/**
 * MobileHeader — Shared Mobile App-Bar & Header Component
 *
 * Implements a unified, premium mobile header following Apple HIG / Material 3 standards:
 * - Proper top safe area insets via useSafeAreaInsets
 * - Clean visual hierarchy separating System Chrome (nav, notifications, profile) from Screen Content
 * - Persistent Notification Bell with real-time unread badge at Top-Right
 * - Built-in NotificationBellDropdown anchored to top-right
 * - Left slot: Context-aware Back button OR Institution branding & Role badge
 * - Large Title mode with structured "Welcome back" card panel
 * - Replaces floating bare refresh/logout buttons with standard pull-to-refresh & profile actions
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { ChevronLeft, Bell, User, Shield, GraduationCap, Briefcase, Users, Globe } from 'lucide-react-native';
import { mobileColors, MIN_TOUCH_TARGET } from '@/mobile/utils/platform';
import { NotificationBellDropdown } from '@/components/common/NotificationBellDropdown';

const IconChevronLeft = ChevronLeft as any;
const IconBell = Bell as any;
const IconUser = User as any;

export interface MobileHeaderProps {
  /** Main title text */
  title: string;
  /** Optional subtitle below the title */
  subtitle?: string;
  /** Show back button (default: false) */
  showBack?: boolean;
  /** Back button handler */
  onBack?: () => void;
  /** Role label override (e.g. 'Admin', 'Teacher') */
  role?: string;
  /** Show notification bell in top right (default: true) */
  showNotification?: boolean;
  /** Notification press handler override */
  onNotificationPress?: () => void;
  /** Show user avatar/profile menu in top right (default: true on dashboards) */
  showUserAvatar?: boolean;
  /** User avatar press handler (default: navigates to settings/profile) */
  onUserAvatarPress?: () => void;
  /** Right-side action element slot */
  rightAction?: React.ReactNode;
  /** Additional right-side action element slot */
  rightActionSecondary?: React.ReactNode;
  /** Use large title / welcome hero layout (default: false) */
  largeTitle?: boolean;
  /** Additional style for the header container */
  style?: ViewStyle;
  /** Whether to add top safe area inset (default: true) */
  withSafeArea?: boolean;
}

export const MobileHeader: React.FC<MobileHeaderProps> = ({
  title,
  subtitle,
  showBack = false,
  onBack,
  role,
  showNotification = true,
  onNotificationPress,
  showUserAvatar = false,
  onUserAvatarPress,
  rightAction,
  rightActionSecondary,
  largeTitle = false,
  style,
  withSafeArea = true,
}) => {
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { profile, institutionName } = useAuth();
  const { unreadCount } = useNotifications();
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);

  const textColor = isDark ? mobileColors.textPrimary : mobileColors.textDark;
  const subtitleColor = isDark ? mobileColors.textSecondary : mobileColors.textDarkSecondary;
  const activeRole = role || profile?.role || 'Admin';

  const userInitials = (profile?.full_name || title || 'U')
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const handleNotificationPress = () => {
    if (onNotificationPress) {
      onNotificationPress();
    } else {
      setShowNotifDropdown((prev) => !prev);
    }
  };

  const handleAvatarPress = () => {
    if (onUserAvatarPress) {
      onUserAvatarPress();
    } else {
      // Default: navigate to role settings
      const r = activeRole.toLowerCase();
      if (r.includes('admin') && !r.includes('master')) {
        router.push('/(admin)/accessibility/settings' as any);
      } else if (r.includes('teacher')) {
        router.push('/(teacher)/accessibility/settings' as any);
      } else if (r.includes('student')) {
        router.push('/(student)/accessibility/settings' as any);
      } else if (r.includes('parent')) {
        router.push('/(parent)/accessibility/settings' as any);
      } else if (r.includes('master')) {
        router.push('/(master-admin)/accessibility/settings' as any);
      }
    }
  };

  const getRoleIcon = () => {
    const r = activeRole.toLowerCase();
    if (r.includes('master')) return <Globe size={11} color="#FF6B00" />;
    if (r.includes('admin')) return <Shield size={11} color="#FF6B00" />;
    if (r.includes('teacher')) return <Briefcase size={11} color="#10B981" />;
    if (r.includes('student')) return <GraduationCap size={11} color="#3B82F6" />;
    if (r.includes('parent')) return <Users size={11} color="#8B5CF6" />;
    return <Shield size={11} color="#FF6B00" />;
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isDark ? mobileColors.bgPrimary : mobileColors.bgLightSurface,
          paddingTop: withSafeArea ? insets.top + 6 : 6,
          borderBottomColor: isDark ? mobileColors.borderSubtle : mobileColors.borderLight,
        },
        style,
      ]}
    >
      {/* ── System Chrome Navigation & Action Bar ── */}
      <View style={styles.navRow}>
        {/* Left Section: Back Button OR Branding & Role Badge */}
        <View style={styles.leftSection}>
          {showBack && onBack ? (
            <TouchableOpacity
              onPress={onBack}
              style={styles.backButton}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <IconChevronLeft size={24} color={textColor} strokeWidth={2.5} />
            </TouchableOpacity>
          ) : (
            <View style={styles.brandingWrap}>
              <View
                style={[
                  styles.roleBadge,
                  {
                    backgroundColor: isDark ? 'rgba(255, 107, 0, 0.12)' : '#FFF7ED',
                    borderColor: isDark ? 'rgba(255, 107, 0, 0.25)' : '#FED7AA',
                  },
                ]}
              >
                {getRoleIcon()}
                <Text
                  style={[
                    styles.roleBadgeText,
                    { color: isDark ? '#FFA756' : '#C2410C' },
                  ]}
                >
                  {activeRole.toUpperCase()}
                </Text>
              </View>
              {institutionName ? (
                <Text
                  style={[styles.institutionText, { color: subtitleColor }]}
                  numberOfLines={1}
                >
                  {institutionName}
                </Text>
              ) : null}
            </View>
          )}
        </View>

        {/* Center Section: Compact Title (when not largeTitle) */}
        {!largeTitle ? (
          <View style={styles.titleContainer}>
            <Text style={[styles.title, { color: textColor }]} numberOfLines={1}>
              {title}
            </Text>
            {subtitle ? (
              <Text style={[styles.subtitle, { color: subtitleColor }]} numberOfLines={1}>
                {subtitle}
              </Text>
            ) : null}
          </View>
        ) : (
          <View style={styles.centerSpacer} />
        )}

        {/* Right Section: System Actions (Secondary, Notification Bell, User Avatar) */}
        <View style={styles.rightActions}>
          {rightActionSecondary}
          {rightAction}

          {/* Top-Right Notification Bell (standard mobile placement) */}
          {showNotification && (
            <TouchableOpacity
              onPress={handleNotificationPress}
              style={[
                styles.iconButton,
                {
                  backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9',
                  borderColor: isDark ? mobileColors.borderSubtle : mobileColors.borderLight,
                },
              ]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel={`Notifications, ${unreadCount} unread`}
            >
              <IconBell
                size={18}
                color={showNotifDropdown ? mobileColors.flame : textColor}
                strokeWidth={2}
              />
              {unreadCount > 0 && (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadBadgeText}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          )}

          {/* User Avatar / Profile Menu shortcut */}
          {showUserAvatar && (
            <TouchableOpacity
              onPress={handleAvatarPress}
              style={[
                styles.avatarButton,
                {
                  backgroundColor: isDark ? 'rgba(255, 107, 0, 0.2)' : '#FFEAD5',
                  borderColor: mobileColors.flame,
                },
              ]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel="Account and settings"
            >
              <Text style={styles.avatarText}>{userInitials}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── Coherent Welcome / Context Panel (for Large Title Dashboards) ── */}
      {largeTitle && (
        <View style={styles.welcomePanel}>
          <Text style={[styles.greetingText, { color: mobileColors.flame }]}>
            {title || 'Welcome back,'}
          </Text>
          <Text style={[styles.userNameText, { color: textColor }]} numberOfLines={1}>
            {subtitle || profile?.full_name || 'Administrator'}
          </Text>
        </View>
      )}

      {/* Top-Anchored Notification Bell Dropdown */}
      <NotificationBellDropdown
        visible={showNotifDropdown}
        onClose={() => setShowNotifDropdown(false)}
        onViewAll={() => {
          setShowNotifDropdown(false);
          const r = activeRole.toLowerCase();
          if (r.includes('admin') && !r.includes('master')) {
            router.push('/(admin)/notifications' as any);
          } else if (r.includes('teacher')) {
            router.push('/(teacher)/notifications' as any);
          } else if (r.includes('student')) {
            router.push('/(student)/notifications' as any);
          } else if (r.includes('parent')) {
            router.push('/(parent)/notifications' as any);
          } else if (r.includes('master')) {
            router.push('/(master-admin)/notifications' as any);
          }
        }}
        position="top"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingBottom: 10,
    zIndex: 100,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: MIN_TOUCH_TARGET,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: MIN_TOUCH_TARGET,
    height: MIN_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -8,
  },
  brandingWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  roleBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  institutionText: {
    fontSize: 12,
    fontWeight: '600',
    maxWidth: 140,
  },
  titleContainer: {
    flex: 1,
    marginHorizontal: 8,
  },
  centerSpacer: {
    flex: 1,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 1,
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  unreadBadge: {
    position: 'absolute',
    top: -3,
    right: -4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FF6B00',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  unreadBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  avatarButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FF6B00',
    fontSize: 11,
    fontWeight: '800',
  },
  welcomePanel: {
    marginTop: 6,
    paddingTop: 4,
    paddingBottom: 2,
  },
  greetingText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  userNameText: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
});

export default MobileHeader;
