import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import SplashScreen from '../Screens/SplashScreen';
import LoginScreen from '../app/auth/sign'; 
import { RootStackParamList } from '../navigation/navigation'; 
import CreateCourse from '@/Screens/CreateCourse';

const Stack = createNativeStackNavigator<RootStackParamList>();

const RootNavigation = () => {
  return (
    <Stack.Navigator initialRouteName="Splash">
      <Stack.Screen
        name="Splash"
        component={SplashScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen name="CreateCourse" component={CreateCourse} />
    </Stack.Navigator>
  );
};

export default RootNavigation;
