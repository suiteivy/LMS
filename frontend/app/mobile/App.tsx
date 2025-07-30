import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { AuthProvider } from './src/context/AuthContext';
import RootNavigation from './src/navigation/RootNavigation';


export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <RootNavigation />
    </NavigationContainer>
    </AuthProvider>
  );
}
