import React, { useState } from "react";
import { Text, View, TouchableOpacity, TextInput, Alert, ScrollView, Platform, KeyboardAvoidingView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { CloudoraLogo } from "@/components/common/CloudoraLogo";
import { LivingBackground } from "@/components/landing/LivingBackground";
import { GlassCard } from "@/components/ui/GlassCard";
import { FullScreenLoader } from "@/components/common/FullScreenLoader";

export default function StudentSignUpScreen() {
  const [isCreating, setIsCreating] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleCreateAccount = async () => {
    if (!fullName || !email || !password) {
      Alert.alert("Required Fields", "Please complete all required fields.");
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert("Password Mismatch", "Passwords do not match.");
      return;
    }
    setIsCreating(true);
    setTimeout(() => {
      setIsCreating(false);
      Alert.alert("Account Created", "Your student profile is active.");
      router.replace("/(student)");
    }, 2000);
  };

  return (
    <>
      <LivingBackground />
      <SafeAreaView style={{ flex: 1, backgroundColor: "transparent" }}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <ScrollView
            contentContainerStyle={{ flexGrow: 1, justifyContent: "center", alignItems: "center", padding: 20 }}
            showsVerticalScrollIndicator={false}
          >
            <GlassCard
              variant="modal"
              accentColor="#FF6B00"
              glowColor="rgba(255, 107, 0, 0.25)"
              borderRadius={28}
              style={{ width: "100%", maxWidth: 480 }}
              contentStyle={{ padding: 36 }}
            >
              {/* Back to sign in button */}
              <TouchableOpacity
                onPress={() => router.replace("/(auth)/signIn" as any)}
                activeOpacity={0.7}
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 12,
                  backgroundColor: "rgba(255, 255, 255, 0.06)",
                  borderWidth: 1,
                  borderColor: "rgba(255, 255, 255, 0.1)",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 20,
                }}
              >
                <ArrowLeft size={18} color="rgba(255, 255, 255, 0.7)" />
              </TouchableOpacity>

              <View style={{ alignItems: "center", marginBottom: 28 }}>
                <View style={{ marginBottom: 16 }}>
                  <CloudoraLogo size={42} glow glowIntensity={0.7} />
                </View>
                <Text style={{ color: "#FFFFFF", fontSize: 24, fontWeight: "900", letterSpacing: -0.4, textAlign: "center", marginBottom: 6 }}>
                  Student Registration
                </Text>
                <Text style={{ color: "rgba(255, 255, 255, 0.5)", fontSize: 13.5, textAlign: "center" }}>
                  Create your unified learning portal account
                </Text>
              </View>

              {/* Form Fields */}
              <View style={{ gap: 14, marginBottom: 24 }}>
                <View>
                  <Text style={{ color: "rgba(255, 255, 255, 0.5)", fontSize: 12, fontWeight: "700", marginBottom: 6, marginLeft: 4 }}>
                    FULL NAME
                  </Text>
                  <TextInput
                    value={fullName}
                    onChangeText={setFullName}
                    placeholder="Jane Doe"
                    placeholderTextColor="rgba(255, 255, 255, 0.25)"
                    style={{
                      height: 50,
                      borderRadius: 16,
                      backgroundColor: "rgba(255, 255, 255, 0.04)",
                      borderWidth: 1,
                      borderColor: "rgba(255, 255, 255, 0.1)",
                      paddingHorizontal: 16,
                      color: "#FFFFFF",
                      fontSize: 14.5,
                    }}
                  />
                </View>

                <View>
                  <Text style={{ color: "rgba(255, 255, 255, 0.5)", fontSize: 12, fontWeight: "700", marginBottom: 6, marginLeft: 4 }}>
                    EMAIL ADDRESS
                  </Text>
                  <TextInput
                    value={email}
                    onChangeText={setEmail}
                    placeholder="jane@academy.edu"
                    placeholderTextColor="rgba(255, 255, 255, 0.25)"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    style={{
                      height: 50,
                      borderRadius: 16,
                      backgroundColor: "rgba(255, 255, 255, 0.04)",
                      borderWidth: 1,
                      borderColor: "rgba(255, 255, 255, 0.1)",
                      paddingHorizontal: 16,
                      color: "#FFFFFF",
                      fontSize: 14.5,
                    }}
                  />
                </View>

                <View>
                  <Text style={{ color: "rgba(255, 255, 255, 0.5)", fontSize: 12, fontWeight: "700", marginBottom: 6, marginLeft: 4 }}>
                    PASSWORD
                  </Text>
                  <TextInput
                    value={password}
                    onChangeText={setPassword}
                    placeholder="••••••••"
                    placeholderTextColor="rgba(255, 255, 255, 0.25)"
                    secureTextEntry
                    style={{
                      height: 50,
                      borderRadius: 16,
                      backgroundColor: "rgba(255, 255, 255, 0.04)",
                      borderWidth: 1,
                      borderColor: "rgba(255, 255, 255, 0.1)",
                      paddingHorizontal: 16,
                      color: "#FFFFFF",
                      fontSize: 14.5,
                    }}
                  />
                </View>

                <View>
                  <Text style={{ color: "rgba(255, 255, 255, 0.5)", fontSize: 12, fontWeight: "700", marginBottom: 6, marginLeft: 4 }}>
                    CONFIRM PASSWORD
                  </Text>
                  <TextInput
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder="••••••••"
                    placeholderTextColor="rgba(255, 255, 255, 0.25)"
                    secureTextEntry
                    style={{
                      height: 50,
                      borderRadius: 16,
                      backgroundColor: "rgba(255, 255, 255, 0.04)",
                      borderWidth: 1,
                      borderColor: "rgba(255, 255, 255, 0.1)",
                      paddingHorizontal: 16,
                      color: "#FFFFFF",
                      fontSize: 14.5,
                    }}
                  />
                </View>
              </View>

              {/* Submit CTA */}
              <TouchableOpacity
                onPress={handleCreateAccount}
                disabled={isCreating}
                activeOpacity={0.85}
                style={{
                  height: 52,
                  borderRadius: 16,
                  backgroundColor: "#FF6B00",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 16,
                }}
              >
                <Text style={{ color: "#FFFFFF", fontWeight: "800", fontSize: 15, letterSpacing: 0.3 }}>
                  {isCreating ? "Initializing Account..." : "Create Student Account"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => router.replace("/(auth)/signIn" as any)}
                activeOpacity={0.7}
                style={{ alignItems: "center" }}
              >
                <Text style={{ color: "rgba(255, 255, 255, 0.45)", fontSize: 13, fontWeight: "600" }}>
                  Already have credentials? <Text style={{ color: "#FF6B00", fontWeight: "800" }}>Sign In</Text>
                </Text>
              </TouchableOpacity>
            </GlassCard>
          </ScrollView>
        </KeyboardAvoidingView>
        <FullScreenLoader visible={isCreating} message="Creating Account..." />
      </SafeAreaView>
    </>
  );
}
