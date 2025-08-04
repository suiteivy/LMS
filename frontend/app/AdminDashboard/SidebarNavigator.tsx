import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { NavigationContainer } from '@react-navigation/native';
import { Text, View, Pressable, Alert } from 'react-native';

import { supabase } from '@/libs/supabase';
import AdminDashboard from './AdminDashboard';

const Drawer = createDrawerNavigator();

const CustomDrawerContent = ({ navigation }: any) => {
  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      Alert.alert('Logout Failed', error.message);
    } else {
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    }
  };

  return (
    <View className="flex-1 bg-white p-4">
      <Text className="text-lg font-bold mb-6">Admin Panel</Text>

      <Pressable onPress={() => navigation.navigate('Dashboard')} className="mb-4">
        <Text className="text-base text-gray-800">Dashboard</Text>
      </Pressable>

      <Pressable onPress={() => navigation.navigate('Users')} className="mb-4">
        <Text className="text-base text-gray-800">Users</Text>
      </Pressable>

      <Pressable onPress={() => navigation.navigate('Settings')} className="mb-4">
        <Text className="text-base text-gray-800">Settings</Text>
      </Pressable>

      <View className="mt-auto">
        <Pressable onPress={handleLogout}>
          <Text className="text-red-600 font-medium">Logout</Text>
        </Pressable>
      </View>
    </View>
  );
};

export const SidebarNavigator = () => {
  return (
    <NavigationContainer>
      <Drawer.Navigator
        initialRouteName="Dashboard"
        drawerContent={(props) => <CustomDrawerContent {...props} />}
        screenOptions={{
          headerShown: false,
        }}
      >
        <Drawer.Screen name="Dashboard" component={AdminDashboard} />
        <Drawer.Screen name="Users" component={() => <Text>Users Page</Text>} />
        <Drawer.Screen name="Settings" component={() => <Text>Settings Page</Text>} />
      </Drawer.Navigator>
    </NavigationContainer>
  );
};
