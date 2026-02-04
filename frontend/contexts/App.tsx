import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import RootNavigation from "../navigation/RootNavigation";
import { AuthProvider } from "./AuthContext";
import SplashScreen from "../Screens/SplashScreen";
import TeacherDashboard from "@/Dashboard/TeacherDashboard";
import { RootStackParamList } from "@/navigation/navigation";
import { NativeStackNavigationProp } from "@native-navigation/native-stack";




export default function App() {
  return (
    
    <AuthProvider>
      <NavigationContainer>
        <RootNavigation />
        <SplashScreen navigation={ NativeStackNavigationProp<RootStackParamList, "Splash">} /> 
        <TeacherDashboard />
      </NavigationContainer>
    </AuthProvider>

  );
}
