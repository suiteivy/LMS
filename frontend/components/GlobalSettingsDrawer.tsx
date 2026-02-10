import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import {
  createDrawerNavigator,
  DrawerContentScrollView,
  DrawerItemList,
} from '@react-navigation/drawer';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { UserCircle, Settings, ShieldCheck, LogOut, HelpCircle } from 'lucide-react-native';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';

// Screens
import StudentProfile from './StudentProfile';
import StudentSettings from './StudentSettings';
import StudentHelp from './StudentHelp';

const Drawer = createDrawerNavigator();

function CustomDrawerContent(props: any) {
  const { signOut, user, loading } = useAuth();

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
      <DrawerContentScrollView {...props}>
        {/* Profile header */}
        <View className="px-4 py-8 border-b border-gray-100 mb-2">
          <View className="w-12 h-12 bg-teal-600 rounded-full items-center justify-center mb-3">
            <Text className="text-white font-bold text-lg">
              {user?.user_metadata?.full_name?.charAt(0) || 'U'}
            </Text>
          </View>
          <Text className="font-bold text-gray-800 text-lg">
            {user?.user_metadata?.full_name || 'User'}
          </Text>
          <Text className="text-gray-500 text-xs">{user?.email}</Text>
        </View>

        {/* Navigation items */}
        <DrawerItemList {...props} />
      </DrawerContentScrollView>

      {/* Logout footer */}
      <View className="p-5 border-t border-gray-100 pb-10 bg-white">
        <TouchableOpacity
          onPress={handleLogout}
          disabled={loading}
          className="flex-row items-center p-3 rounded-xl active:bg-red-50"
        >
          {loading ? (
            <ActivityIndicator size="small" color="#ef4444" />
          ) : (
            <LogOut size={22} color="#ef4444" />
          )}
          <Text className="ml-3 font-semibold text-red-500">Logout</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function GlobalSettingsDrawer({ userRole = 'student' }) {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Drawer.Navigator
        drawerContent={(props) => <CustomDrawerContent {...props} />}
        screenOptions={{
          headerShown: false,
          drawerActiveTintColor: '#128C7E',
          drawerStyle: { width: 280 },
        }}
      >
        <Drawer.Screen
          name="Profile"
          component={StudentProfile}
          options={{
            drawerIcon: ({ color, size }) => <UserCircle size={size} color={color} />,
          }}
        />

        {userRole === 'admin' && (
          <Drawer.Screen
            name="AdminPanel"
            options={{
              drawerIcon: ({ color, size }) => <ShieldCheck size={size} color={color} />,
            }}
            component={() => (
              <View className="flex-1 items-center justify-center">
                <Text>Admin Panel</Text>
              </View>
            )}
          />
        )}

        <Drawer.Screen
          name="Settings"
          component={StudentSettings}
          options={{
            drawerIcon: ({ color, size }) => <Settings size={size} color={color} />,
          }}
        />

        <Drawer.Screen
          name="Help"
          component={StudentHelp}
          options={{
            drawerIcon: ({ color, size }) => <HelpCircle size={size} color={color} />,
          }}
        />
      </Drawer.Navigator>
    </GestureHandlerRootView>
  );
}

