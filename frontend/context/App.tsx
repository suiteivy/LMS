import React from 'react';
import { NavigationContainer } from '@react-navigation/native';

import RootNavigation from '../navigation/RootNavigation';
import { AuthProvider } from './AuthContext';


export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <RootNavigation />
    </NavigationContainer>
    </AuthProvider>
  );
}
