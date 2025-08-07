import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import RootNavigation from "../navigation/RootNavigation";
import { AuthProvider } from "./AuthContext";
import SplashScreen from "../Screens/SplashScreen";





export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <RootNavigation />
      </NavigationContainer>
    </AuthProvider>
        



  );
}
