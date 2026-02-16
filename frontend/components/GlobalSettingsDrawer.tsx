import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert, Platform } from 'react-native';
import {
  createDrawerNavigator,
  DrawerContentScrollView,
  DrawerItemList,
} from '@react-navigation/drawer';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { UserCircle, Settings, ShieldCheck, LogOut, HelpCircle, Menu } from 'lucide-react-native';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';

// Screens
import StudentProfile from './StudentProfile';
import TeacherProfile from './TeacherProfile';
import AdminProfile from './AdminProfile';
import StudentSettings from './StudentSettings';
import StudentHelp from './StudentHelp';

const Drawer = createDrawerNavigator();

function CustomDrawerContent(props: any) {
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
      <DrawerContentScrollView {...props}>
        <View className="px-4 py-8 border-b border-gray-100 mb-2">
          <View className={`w-12 h-12 rounded-full items-center justify-center mb-3 ${props.userRole === 'teacher' ? 'bg-blue-500' : 'bg-orange-500'}`}>
            <Text className="text-white font-bold text-lg">
              {user?.user_metadata?.full_name?.charAt(0) || 'U'}
            </Text>
          </View>
          <Text className="font-bold text-gray-800 text-lg">
            {user?.user_metadata?.full_name || 'User'}
          </Text>
          <Text className="text-gray-500 text-xs">{user?.email}</Text>
          <Text className="text-gray-400 text-xs mt-1">ID: {displayId || 'Loading...'}</Text>
        </View>
        <DrawerItemList {...props} />
      </DrawerContentScrollView>

      <View className="p-5 border-t border-gray-100 pb-10 bg-white">
        <TouchableOpacity
          onPress={handleLogout}
          disabled={loading}
          className="flex-row items-center p-3 rounded-xl active:bg-red-50"
        >
          <Text className="ml-3 font-semibold text-red-500">Logout</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function GlobalSettingsDrawer({ userRole = 'student' }: { userRole?: 'student' | 'teacher' | 'admin' }) {
  const getProfileComponent = () => {
    if (userRole === 'admin') return AdminProfile;
    if (userRole === 'teacher') return TeacherProfile;
    return StudentProfile;
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Drawer.Navigator
        drawerContent={(props) => <CustomDrawerContent {...props} userRole={userRole} />}
        screenOptions={({ navigation }) => ({
          headerShown: true,
          headerLeft: () => (
            <TouchableOpacity 
              onPress={() => navigation.openDrawer()}
              className="ml-4 p-2"
            >
              <Menu size={24} color="#000" />
            </TouchableOpacity>
          ),
          headerStyle: {
            backgroundColor: '#ffffff',
            elevation: 0,
            shadowOpacity: 0,
            borderBottomWidth: 1,
            borderBottomColor: '#e5e7eb',
          },
          headerTitleStyle: {
            fontWeight: 'bold',
            fontSize: 18,
            color: '#000',
          },
          headerTitleAlign: 'center',
          drawerActiveTintColor: userRole === 'teacher' ? 'orange' : 'orange',
          drawerStyle: { width: 280 },
        })}
      >

        {userRole === 'admin' && (
          <Drawer.Screen
            name="AdminPanel"
            options={{
              title: 'Admin Panel',
              drawerIcon: ({ color, size }) => <ShieldCheck size={size} color={color} />,
            }}
            component={() => (
              <View className="flex-1 items-center justify-center"><Text>Admin Panel</Text></View>
            )}
          />
        )}
        
        <Drawer.Screen
          name="Profile"
          component={getProfileComponent()}
          options={{
            title: 'My Profile',
            drawerIcon: ({ color, size }) => <UserCircle size={size} color={color} />,
          }}
        />

        <Drawer.Screen
          name="Settings"
          component={StudentSettings}
          options={{
            title: 'Settings',
            drawerIcon: ({ color, size }) => <Settings size={size} color={color} />,
          }}
        />

        <Drawer.Screen
          name="Help"
          component={StudentHelp}
          options={{
            title: 'Help & Support',
            drawerIcon: ({ color, size }) => <HelpCircle size={size} color={color} />,
          }}
        />
      </Drawer.Navigator>
    </GestureHandlerRootView>
  );
}