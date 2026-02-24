import { UnifiedHeader } from "@/components/common/UnifiedHeader";
import { useAuth } from '@/contexts/AuthContext';
import { ThemeMode, useTheme } from '@/contexts/ThemeContext';
import { ChevronRight, HelpCircle, LogOut, Moon, Settings, ShieldCheck, Sun, UserCircle } from 'lucide-react-native';
import React, { useState } from 'react';
import { Alert, Platform, ScrollView, Text, TouchableOpacity, View } from 'react-native';

// Screens
import AdminOverview from '@/components/AdminOverview';
import AdminProfile from '@/components/AdminProfile';
import AdminSettings from '@/components/AdminSettings';
import StudentHelp from '@/components/StudentHelp';
import StudentProfile from '@/components/StudentProfile';
import StudentSettings from '@/components/StudentSettings';
import TeacherHelp from '@/components/TeacherHelp';
import TeacherProfile from '@/components/TeacherProfile';
import TeacherSettings from '@/components/TeacherSettings';
import { router } from 'expo-router';

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
      borderBottomColor: isDark ? '#2c2c2c' : '#f3f4f6',
      backgroundColor: danger
        ? (isDark ? 'rgba(127,29,29,0.2)' : '#fef2f2')
        : (isDark ? '#121212' : '#ffffff'),
    }}
  >
    <View style={{ width: 32 }}>{icon}</View>
    <Text style={{ flex: 1, fontSize: 16, color: danger ? '#ef4444' : (isDark ? '#e5e7eb' : '#374151') }}>
      {label}
    </Text>
    {!danger && <ChevronRight size={20} color="#9ca3af" />}
  </TouchableOpacity>
);

function SettingsMenu({ userRole, onNavigate }: { userRole: string; onNavigate: (screen: 'profile' | 'settings' | 'help' | 'overview') => void }) {
  const { signOut, profile, loading, displayId, isTrial } = useAuth();
  const { theme, setTheme, isDark } = useTheme();
  const roleLabel = userRole.charAt(0).toUpperCase() + userRole.slice(1);

  const surface = isDark ? '#1e1e1e' : '#ffffff';
  const border = isDark ? '#2c2c2c' : '#f3f4f6';
  const textPrimary = isDark ? '#f1f1f1' : '#111827';
  const textSecondary = isDark ? '#6b7280' : '#9ca3af';
  const pillBg = isDark ? '#121212' : '#f9fafb';
  const pillBorder = isDark ? '#2c2c2c' : '#f3f4f6';

  const handleLogout = async () => {
    try {
      const { error } = await signOut();
      if (error) Alert.alert('Logout Error', error.message || 'Failed to sign out');
      router.push('/(auth)/signIn');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'An unexpected error occurred');
    }
  };

  const themeModes = [
    'light',
    'dark',
    ...(Platform.OS !== 'web' ? ['system'] : []),
  ] as ThemeMode[];

  const modeIcon = (mode: ThemeMode, active: boolean) => {
    const color = active ? '#FF6B00' : '#9ca3af';
    if (mode === 'light') return <Sun size={14} color={color} strokeWidth={2.5} />;
    if (mode === 'dark') return <Moon size={14} color={color} strokeWidth={2.5} />;
    return <Settings size={14} color={color} strokeWidth={2.5} />;
  };

  return (
    <View style={{ flex: 1 }}>
      <UnifiedHeader
        title="Account"
        subtitle="Settings"
        role={roleLabel as "Student" | "Teacher" | "Admin" | "Parent"}
        showNotification={false}
      />

      {/* Profile summary */}
      <View style={{ paddingHorizontal: 24, paddingVertical: 24, borderBottomWidth: 1, borderBottomColor: border, backgroundColor: surface }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginRight: 16, backgroundColor: isDark ? '#1f2937' : '#f3f4f6', borderWidth: 1, borderColor: border }}>
            <Text style={{ color: textPrimary, fontWeight: '700', fontSize: 18 }}>
              {profile?.full_name?.charAt(0) || 'U'}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: '700', color: textPrimary, fontSize: 18, textTransform: 'uppercase', letterSpacing: -0.5 }}>
              {profile?.full_name || 'User'}
            </Text>
            <Text style={{ color: textSecondary, fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 2 }}>
              ID: {displayId || '...'}
            </Text>
          </View>
        </View>
      </View>

      {/* Menu Items */}
      <ScrollView style={{ flex: 1, backgroundColor: isDark ? '#121212' : '#ffffff' }} contentContainerStyle={{ paddingBottom: 20 }}>
        {userRole === 'admin' && (
          <MenuItem isDark={isDark} icon={<ShieldCheck size={22} color="#8b5cf6" />} label="Admin Overview" onPress={() => onNavigate('overview')} />
        )}
        <MenuItem
          isDark={isDark}
          icon={<UserCircle size={22} color={isTrial ? "#9ca3af" : "#FF6B00"} />}
          label={isTrial ? "My Profile (Restricted)" : "My Profile"}
          onPress={() => isTrial ? Alert.alert("Demo Mode", "Profile editing is disabled in demo mode.") : onNavigate('profile')}
        />
        {userRole !== 'admin' && (
          <>
            {!isTrial && (
              <MenuItem isDark={isDark} icon={<Settings size={22} color="#6b7280" />} label="Settings" onPress={() => onNavigate('settings')} />
            )}
            <MenuItem isDark={isDark} icon={<HelpCircle size={22} color="#3b82f6" />} label="Help & Support" onPress={() => onNavigate('help')} />
          </>
        )}

        {/* Theme toggle — all style={{}} to avoid dark: className crash on toggle */}
        <View style={{ marginTop: 24, paddingHorizontal: 24 }}>
          <Text style={{ fontSize: 10, fontWeight: 'bold', color: textSecondary, textTransform: 'uppercase', letterSpacing: 3, marginBottom: 16 }}>
            Appearance
          </Text>
          <View style={{ flexDirection: 'row', backgroundColor: pillBg, borderRadius: 24, padding: 6, borderWidth: 1, borderColor: pillBorder }}>
            {themeModes.map((mode) => {
              const isActive = theme === mode;
              return (
                <TouchableOpacity
                  key={mode}
                  onPress={() => setTheme(mode)}
                  activeOpacity={0.8}
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 18,
                    flexDirection: 'row',
                    backgroundColor: isActive ? (isDark ? '#1f2937' : '#ffffff') : 'transparent',
                    borderWidth: isActive ? 1 : 0,
                    borderColor: isActive ? (isDark ? '#374151' : '#e5e7eb') : 'transparent',
                  }}
                >
                  {modeIcon(mode, isActive)}
                  <Text style={{
                    marginLeft: 6,
                    fontSize: 10,
                    fontWeight: 'bold',
                    textTransform: 'uppercase',
                    letterSpacing: 1,
                    color: isActive ? (isDark ? '#ffffff' : '#111827') : '#9ca3af',
                  }}>
                    {mode}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </ScrollView>

      {/* Logout */}
      <View style={{ padding: 24, paddingBottom: 40, borderTopWidth: 1, borderTopColor: border, backgroundColor: isDark ? '#121212' : '#ffffff' }}>
        <TouchableOpacity
          onPress={handleLogout}
          disabled={loading}
          style={{ flexDirection: 'row', alignItems: 'center', padding: 20, borderRadius: 24, backgroundColor: isDark ? 'rgba(239,68,68,0.08)' : '#fef2f2', borderWidth: 1, borderColor: isDark ? 'rgba(239,68,68,0.2)' : '#fecaca' }}
        >
          <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: isDark ? 'rgba(239,68,68,0.15)' : '#ffffff', alignItems: 'center', justifyContent: 'center' }}>
            <LogOut size={20} color="#ef4444" />
          </View>
          <View style={{ marginLeft: 16 }}>
            <Text style={{ fontWeight: 'bold', color: '#ef4444', letterSpacing: -0.5 }}>Logout</Text>
            <Text style={{ color: isDark ? 'rgba(239,68,68,0.5)' : '#f87171', fontSize: 8, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1.5, marginTop: 2 }}>End active session</Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export function GlobalSettingsContent({ userRole = 'student' }: { userRole?: 'student' | 'teacher' | 'admin' | 'parent' }) {
  const [activeScreen, setActiveScreen] = useState<'menu' | 'profile' | 'settings' | 'help' | 'overview'>('menu');
  const { isDark } = useTheme();

  const renderContent = () => {
    switch (activeScreen) {
      case 'overview': return <AdminOverview />;
      case 'profile':
        if (userRole === 'admin') return <AdminProfile />;
        if (userRole === 'teacher') return <TeacherProfile />;
        return <StudentProfile />;
      case 'settings':
        if (userRole === 'admin') return <AdminSettings />;
        if (userRole === 'teacher') return <TeacherSettings />;
        return <StudentSettings />;
      case 'help':
        if (userRole === 'teacher') return <TeacherHelp />;
        return <StudentHelp />;
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
      default: return '';
    }
  };

  const roleLabel = (userRole.charAt(0).toUpperCase() + userRole.slice(1)) as "Student" | "Teacher" | "Admin" | "Parent";

  return (
    <View style={{ flex: 1, backgroundColor: isDark ? '#121212' : '#ffffff' }}>
      {activeScreen !== 'menu' && (
        <UnifiedHeader
          title={roleLabel}
          subtitle={getTitle()}
          role={roleLabel}
          showNotification={false}
          onBack={() => setActiveScreen('menu')}
        />
      )}
      {renderContent()}
    </View>
  );
}

export default function GlobalSettingsDrawer({ userRole = 'student' }: { userRole?: 'student' | 'teacher' | 'admin' | 'parent' }) {
  return <GlobalSettingsContent userRole={userRole} />;
}