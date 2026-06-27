import { UnifiedHeader } from "@/components/common/UnifiedHeader";
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/types/types';
import { ThemeMode, useTheme } from '@/contexts/ThemeContext';
import { ChevronRight, HelpCircle, LogOut, Settings, ShieldCheck, UserCircle, Laptop, AlertTriangle } from 'lucide-react-native';
import React, { useState } from 'react';
import { Alert, Image, Platform, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SubscriptionStatusBadge } from '@/components/shared/SubscriptionComponents';
import { useSubscriptionTier } from '@/hooks/useSubscriptionTier';
import { HelpTooltip } from './settings/HelpTooltip';
import { ThemeSegmentedControl } from "./settings/ThemeSegmentedControl";

// Screens
import AdminHelp from '@/components/AdminHelp';
import AdminOverview from '@/components/AdminOverview';
import AdminSettings from './AdminSettings';
import StudentHelp from '@/components/StudentHelp';
import StudentSettings from '@/components/StudentSettings';
import TeacherHelp from '@/components/TeacherHelp';
import TeacherSettings from '@/components/TeacherSettings';
import InstitutionOwnership from '@/components/InstitutionOwnership';
import MasterAdminSettings from '@/components/MasterAdminSettings';
import ActiveSessions from '@/components/ActiveSessions';
import ReadOnlyProfile from '@/components/ReadOnlyProfile';
import { router } from 'expo-router';
import { resolveAvatarUri } from '@/utils/avatar';

type MenuItemProps = {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
  danger?: boolean;
  isDark: boolean;
};

const MenuItem = ({ icon, label, onPress, danger, isDark }: MenuItemProps) => (
  <TouchableOpacity
    onPress={onPress}
    style={{
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? 'rgba(255,255,255,0.1)' : '#f3f4f6',
      backgroundColor: danger
        ? (isDark ? 'rgba(127,29,29,0.2)' : '#fef2f2')
        : (isDark ? '#161B22' : '#ffffff'),
    }}
  >
    <View style={{ width: 32 }}>{icon}</View>
    <Text style={{ flex: 1, fontSize: 16, color: danger ? '#ef4444' : (isDark ? '#e5e7eb' : '#374151') }}>
      {label}
    </Text>
    {!danger && <ChevronRight size={20} color="#9ca3af" />}
  </TouchableOpacity>
);

function SettingsMenu({ userRole, onNavigate }: { userRole: string; onNavigate: (screen: 'profile' | 'settings' | 'help' | 'overview' | 'ownership' | 'sessions') => void }) {
  const { signOut, profile, loading, displayId, isTrial, isMain } = useAuth();
  const { isDark } = useTheme();
  const tier = useSubscriptionTier();
  const isPlatformAdminRole = userRole === 'master_admin' || userRole === 'platform_admin';
  const roleLabel = isPlatformAdminRole ? 'Master Admin' : userRole === 'parent' ? 'Parent/Guardian' : (userRole.charAt(0).toUpperCase() + userRole.slice(1));

  const surface = isDark ? '#161B22' : '#ffffff';
  const border = isDark ? 'rgba(255,255,255,0.1)' : '#f3f4f6';
  const textPrimary = isDark ? '#f1f1f1' : '#111827';
  const textSecondary = isDark ? '#D1D5DB' : '#9ca3af';
  const avatarUri = resolveAvatarUri(profile?.avatar_url);

  const handleLogout = async () => {
    try {
      const { error } = await signOut();
      if (error) Alert.alert('Logout Error', error.message || 'Failed to sign out');
      router.push('/(auth)/signIn');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'An unexpected error occurred');
    }
  };


  return (
    <View style={{ flex: 1 }}>
      <UnifiedHeader
        title="Account"
        subtitle="Settings"
        role={roleLabel as "Student" | "Teacher" | "Admin" | "Parent/Guardian" | "Master Admin"}
        showNotification={false}
      />

      {/* Profile summary */}
      <View style={{ paddingHorizontal: 24, paddingVertical: 24, borderBottomWidth: 1, borderBottomColor: border, backgroundColor: surface }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginRight: 16, backgroundColor: isDark ? '#1f2937' : '#f3f4f6', borderWidth: 1, borderColor: border, overflow: 'hidden' }}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={{ width: 48, height: 48 }} resizeMode="cover" />
            ) : (
              <Text style={{ color: textPrimary, fontWeight: '700', fontSize: 18 }}>
                {profile?.full_name?.charAt(0) || 'U'}
              </Text>
            )}
          </View>
          <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '700', color: textPrimary, fontSize: 18, textTransform: 'uppercase', letterSpacing: -0.5 }}>
                {profile?.full_name || 'User'}
              </Text>
              <Text style={{ color: textSecondary, fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 2 }}>
                ID: {displayId || '...'}
              </Text>
            </View>
            <SubscriptionStatusBadge />
          </View>
        </View>
      </View>

      {/* Menu Items */}
        <ScrollView style={{ flex: 1, backgroundColor: isDark ? '#161B22' : '#ffffff' }} contentContainerStyle={{ paddingBottom: 20 }}>
        {(['student', 'parent'] as const).includes(userRole as 'student' | 'parent') && (
          <View style={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 4, flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ fontSize: 10, fontWeight: 'bold', color: textSecondary, textTransform: 'uppercase', letterSpacing: 3 }}>Quick Guide</Text>
            <HelpTooltip
              id={userRole === 'parent' ? 'settings.language.parent' : 'settings.language.student'}
              role={userRole as 'student' | 'parent'}
              tier={tier}
              onLearnMore={(anchor) => {
                onNavigate('settings');
                router.push({ pathname: `/${userRole === 'parent' ? '(parent)' : '(student)'}/accessibility/settings` as any, params: { manual: '1', anchor: anchor || (userRole === 'parent' ? 'parent-workflow' : 'student-workflow') } } as any);
              }}
            />
          </View>
        )}
        {userRole === 'admin' && (
          <>
            <MenuItem isDark={isDark} icon={<ShieldCheck size={22} color="#8b5cf6" />} label="Admin Overview" onPress={() => onNavigate('overview')} />
            {isMain && (
              <MenuItem isDark={isDark} icon={<ShieldCheck size={22} color="#f59e0b" />} label="Institution Ownership" onPress={() => onNavigate('ownership')} />
            )}
          </>
        )}
        <MenuItem
          isDark={isDark}
          icon={<UserCircle size={22} color={isTrial ? "#9ca3af" : "#FF6B00"} />}
          label={isTrial ? "My Profile (Restricted)" : "My Profile"}
          onPress={() => isTrial ? Alert.alert("Demo Mode", "Profile editing is disabled in demo mode.") : onNavigate('profile')}
        />
        {!isTrial && (
          <MenuItem isDark={isDark} icon={<Settings size={22} color="#6b7280" />} label="Settings" onPress={() => onNavigate('settings')} />
        )}
        {!isTrial && (
          <MenuItem isDark={isDark} icon={<Laptop size={22} color="#10b981" />} label="Device Sessions" onPress={() => onNavigate('sessions')} />
        )}
        {isTrial && userRole !== 'admin' && !isPlatformAdminRole && (
          <MenuItem isDark={isDark} icon={<HelpCircle size={22} color="#3b82f6" />} label="Help & Support" onPress={() => onNavigate('help')} />
        )}
        {!isTrial && !isPlatformAdminRole && (
          <MenuItem isDark={isDark} icon={<HelpCircle size={22} color="#3b82f6" />} label="Help & Support" onPress={() => onNavigate('help')} />
        )}

        <View style={{ paddingHorizontal: 24, paddingTop: 20 }}>
          <Text style={{ fontSize: 10, fontWeight: 'bold', color: textSecondary, textTransform: 'uppercase', letterSpacing: 3, marginBottom: 12 }}>App Theme</Text>
          <View style={{ borderRadius: 16, borderOpacity: 1, borderWidth: 1, borderColor: border, overflow: 'hidden' }}>
            <ThemeSegmentedControl />
          </View>
        </View>

      </ScrollView>

      {/* Logout */}
      <View style={{ padding: 24, paddingBottom: 40, borderTopWidth: 1, borderTopColor: border, backgroundColor: isDark ? '#161B22' : '#ffffff' }}>
        <TouchableOpacity
          onPress={handleLogout}
          disabled={loading}
          style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12, backgroundColor: isDark ? 'rgba(239,68,68,0.08)' : '#fef2f2', alignSelf: 'flex-start' }}
        >
          <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: isDark ? 'rgba(239,68,68,0.15)' : '#ffffff', alignItems: 'center', justifyContent: 'center' }}>
            <LogOut size={16} color="#ef4444" />
          </View>
          <View style={{ marginLeft: 12 }}>
            <Text style={{ fontWeight: '600', color: '#ef4444', fontSize: 16, letterSpacing: -0.5 }}>Logout</Text>
            <Text style={{ color: isDark ? 'rgba(239,68,68,0.5)' : '#f87171', fontSize: 8, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1.5, marginTop: 2 }}>End active session</Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export function GlobalSettingsContent({
  userRole = 'student',
  initialScreen = 'menu',
}: {
  userRole?: UserRole;
  initialScreen?: 'menu' | 'profile' | 'settings' | 'help' | 'overview' | 'ownership' | 'sessions';
}) {
  const [activeScreen, setActiveScreen] = useState<'menu' | 'profile' | 'settings' | 'help' | 'overview' | 'ownership' | 'sessions'>(initialScreen);
  const { isDark } = useTheme();
  const { isSessionExpiring, dismissSessionWarning } = useAuth();

  React.useEffect(() => {
    setActiveScreen(initialScreen);
  }, [initialScreen]);

  const renderContent = () => {
    switch (activeScreen) {
      case 'overview': return <AdminOverview />;
      case 'profile':
        return <ReadOnlyProfile />;
      case 'settings':
        if (userRole === 'master_admin' || userRole === 'platform_admin') return <MasterAdminSettings />;
        if (userRole === 'admin') return <AdminSettings />;
        if (userRole === 'teacher') return <TeacherSettings />;
        if (userRole === 'parent') return <StudentSettings role="parent" />;
        return <StudentSettings role="student" />;
      case 'help':
        if (userRole === 'admin') return <AdminHelp />;
        if (userRole === 'teacher') return <TeacherHelp />;
        return <StudentHelp />;
      case 'ownership':
        return <InstitutionOwnership />;
      case 'sessions':
        return (
          <View style={{ flex: 1, padding: 24 }}>
            <ActiveSessions />
          </View>
        );
      default:
        return <SettingsMenu userRole={userRole} onNavigate={setActiveScreen} />;
    }
  };

  const getTitle = () => {
    switch (activeScreen) {
      case 'overview': return 'Admin Overview';
      case 'profile': return 'My Profile';
      case 'settings': return 'Settings';
      case 'help': return 'Help & Support';
      case 'ownership': return 'Institution Ownership';
      case 'sessions': return 'Device Sessions';
      default: return '';
    }
  };

  const roleLabel = (userRole === 'master_admin' || userRole === 'platform_admin') ? 'Master Admin' : userRole === 'parent' ? 'Parent/Guardian' : (userRole.charAt(0).toUpperCase() + userRole.slice(1)) as "Student" | "Teacher" | "Admin" | "Parent/Guardian" | "Master Admin";

  return (
    <View style={{ flex: 1, backgroundColor: isDark ? '#161B22' : '#ffffff' }}>
      {isSessionExpiring && (
        <View style={{ backgroundColor: '#fff7ed', borderColor: '#ffedd5', borderWidth: 1, padding: 16, margin: 16, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', elevation: 2 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 }}>
            <AlertTriangle size={20} color="#f97316" style={{ marginRight: 12 }} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: 'black', color: '#ea580c', fontSize: 13 }}>Session Expiring</Text>
              <Text style={{ color: '#c2410c', fontSize: 11, marginTop: 2 }}>Your session will expire in 15 minutes due to security policy.</Text>
            </View>
          </View>
          <TouchableOpacity onPress={dismissSessionWarning} style={{ paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#ffedd5', borderRadius: 8 }}>
            <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#c2410c' }}>Dismiss</Text>
          </TouchableOpacity>
        </View>
      )}
      {activeScreen !== 'menu' && (
        <UnifiedHeader
          title={roleLabel}
          subtitle={getTitle()}
          role={roleLabel as any}
          showNotification={false}
          onBack={() => setActiveScreen('menu')}
        />
      )}
      {renderContent()}
    </View>
  );
}

export default function GlobalSettingsDrawer({
  userRole = 'student',
  initialScreen = 'menu',
}: {
  userRole?: UserRole;
  initialScreen?: 'menu' | 'profile' | 'settings' | 'help' | 'overview' | 'ownership' | 'sessions';
}) {
  return <GlobalSettingsContent userRole={userRole} initialScreen={initialScreen} />;
}
