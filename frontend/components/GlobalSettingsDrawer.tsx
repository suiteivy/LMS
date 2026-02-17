import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { UserCircle, Settings, ShieldCheck, LogOut, HelpCircle, ChevronRight, X } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';

// Screens
import StudentProfile from '@/components/StudentProfile';
import TeacherProfile from '@/components/TeacherProfile';
import AdminProfile from '@/components/AdminProfile';
import AdminSettings from '@/components/AdminSettings';
import StudentSettings from '@/components/StudentSettings';
import StudentHelp from '@/components/StudentHelp';

type MenuItemProps = {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
  danger?: boolean;
};

const MenuItem = ({ icon, label, onPress, danger }: MenuItemProps) => (
  <TouchableOpacity
    onPress={onPress}
    className={`flex-row items-center p-4 border-b border-gray-100 ${danger ? 'bg-red-50' : ''}`}
  >
    <View className="w-8">{icon}</View>
    <Text className={`flex-1 text-base ${danger ? 'text-red-500' : 'text-gray-700'}`}>
      {label}
    </Text>
    {!danger && <ChevronRight size={20} color="#9ca3af" />}
  </TouchableOpacity>
);

function SettingsMenu({ userRole }: { userRole: string }) {
  const { signOut, user, loading, displayId } = useAuth();

  const handleLogout = async () => {
    try {
      const { error } = await signOut();
      if (error) {
        Alert.alert('Logout Error', error.message || 'Failed to sign out');
      } else {
        router.replace('/(auth)/signIn');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'An unexpected error occurred');
    }
  };

  return (
    <View style={{ flex: 1 }}>
      {/* Header */}
      <View className="px-4 py-6 border-b border-gray-100 bg-white">
        <View className="flex-row items-center mb-4">
          <View className={`w-14 h-14 rounded-full items-center justify-center mr-4 ${userRole === 'teacher' ? 'bg-blue-500' : userRole === 'admin' ? 'bg-purple-500' : 'bg-orange-500'}`}>
            <Text className="text-white font-bold text-xl">
              {user?.user_metadata?.full_name?.charAt(0) || 'U'}
            </Text>
          </View>
          <View className="flex-1">
            <Text className="font-bold text-gray-800 text-lg">
              {user?.user_metadata?.full_name || 'User'}
            </Text>
            <Text className="text-gray-500 text-sm">{user?.email}</Text>
            <Text className="text-gray-400 text-xs mt-1">ID: {displayId || 'Loading...'}</Text>
          </View>
        </View>
      </View>

      {/* Menu Items */}
      <ScrollView className="flex-1 bg-white">
        {userRole === 'admin' && (
          <MenuItem
            icon={<ShieldCheck size={22} color="#8b5cf6" />}
            label="Admin Overview"
            onPress={() => {}}
          />
        )}
        <MenuItem
          icon={<UserCircle size={22} color="#f97316" />}
          label="My Profile"
          onPress={() => {}}
        />
        <MenuItem
          icon={<Settings size={22} color="#6b7280" />}
          label="Settings"
          onPress={() => {}}
        />
        <MenuItem
          icon={<HelpCircle size={22} color="#3b82f6" />}
          label="Help & Support"
          onPress={() => {}}
        />
      </ScrollView>

      {/* Logout */}
      <View className="p-4 border-t border-gray-100 bg-white pb-8">
        <TouchableOpacity
          onPress={handleLogout}
          disabled={loading}
          className="flex-row items-center p-4 rounded-xl bg-red-50 active:bg-red-100"
        >
          <LogOut size={22} color="#ef4444" />
          <Text className="ml-3 font-semibold text-red-500">Logout</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export function GlobalSettingsContent({ userRole = 'student' }: { userRole?: 'student' | 'teacher' | 'admin' | 'parent' }) {
  const [activeScreen, setActiveScreen] = useState<'menu' | 'profile' | 'settings' | 'help'>('menu');

  const renderContent = () => {
    switch (activeScreen) {
      case 'profile':
        if (userRole === 'admin') return <AdminProfile />;
        if (userRole === 'teacher') return <TeacherProfile />;
        return <StudentProfile />;
      case 'settings':
        if (userRole === 'admin') return <AdminSettings />;
        return <StudentSettings />;
      case 'help':
        return <StudentHelp />;
      default:
        return <SettingsMenu userRole={userRole} />;
    }
  };

  const getTitle = () => {
    switch (activeScreen) {
      case 'profile': return 'My Profile';
      case 'settings': return 'Settings';
      case 'help': return 'Help & Support';
      default: return '';
    }
  };

  return (
    <View className="flex-1 bg-white">
      {activeScreen !== 'menu' && (
        <View className="flex-row items-center p-4 border-b border-gray-100 bg-white">
          <TouchableOpacity
            onPress={() => setActiveScreen('menu')}
            className="p-2 -ml-2"
          >
            <ChevronRight size={24} color="#6b7280" style={{ transform: [{ rotate: '180deg' }] }} />
          </TouchableOpacity>
          <Text className="text-lg font-semibold ml-2">
            {getTitle()}
          </Text>
        </View>
      )}
      {renderContent()}
    </View>
  );
}

// Default export for backward compatibility (won't be used directly in new code)
export default function GlobalSettingsDrawer({ userRole = 'student' }: { userRole?: 'student' | 'teacher' | 'admin' | 'parent' }) {
  return <GlobalSettingsContent userRole={userRole} />;
}
