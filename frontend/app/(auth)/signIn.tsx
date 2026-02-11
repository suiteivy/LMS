import {
  Text,
  TextInput,
  View,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Alert,
} from "react-native";
import { SafeAreaView, SafeAreaProvider } from "react-native-safe-area-context";
import { FontAwesome, Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { validateEmail, getAuthErrorMessage } from "@/utils/validation";
import { supabase } from "@/libs/supabase";
import { router } from "expo-router";

interface FormData {
  email: string;
  password: string;
}

export default function Index() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    email: "",
    password: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const { signIn } = useAuth();

  const showMessage = (msg: string, success: boolean) => {
    setMessage(msg);
    setIsSuccess(success);
    setIsModalVisible(true);
    setTimeout(() => {
      setIsModalVisible(false);
    }, 2000);
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
    if (errorMessage) setErrorMessage(null);
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.email) {
      newErrors.email = "Email is required";
    } else if (!validateEmail(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const onSubmit = async () => {
    console.log("Form submitted");

    if (!validateForm()) {
      console.log("Form validation failed");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      console.log("Attempting sign in with:", formData.email);
      const { error, data } = await signIn(formData.email, formData.password);

      if (error) {
        console.log("Sign in error:", error);
        setErrorMessage(getAuthErrorMessage(error));
        setIsLoading(false);
        return;
      }

      if (!data?.user) {
        console.log("No user data returned");
        setErrorMessage("No user data returned");
        setIsLoading(false);
        return;
      }

      console.log("User signed in:", data.user.id);

      // Fetching user's role and full name from Supabase
      const { data: userData, error: roleError } = await supabase
        .from("users")
        .select("role, full_name, status")
        .eq("id", data.user.id)
        .single() as { data: { role: string; full_name: string; status: string } | null; error: any };

      if (roleError) {
        console.error("Role fetch error:", roleError.message);
        setErrorMessage("Could not fetch user role: " + roleError.message);
        setIsLoading(false);
        return;
      }

      if (!userData?.role) {
        console.log("No role found for user");
        setErrorMessage("No role assigned to user.");
        setIsLoading(false);
        return;
      }

      // Check for approval status
      if (userData.status === 'pending') {
        showMessage("Your account is pending approval. Please contact an administrator.", false);
        setIsLoading(false);
        await supabase.auth.signOut(); // Ensure they remain signed out
        return;
      } else if (userData.status === 'rejected') {
        showMessage("Your account has been rejected. Please contact support.", false);
        setIsLoading(false);
        await supabase.auth.signOut();
        return;
      }

      const name = userData.full_name || "there";
      showMessage(`👋 Welcome back, ${name}!`, true);

      // timeout to Delay navigation to let modal show
      setTimeout(() => {
        switch (userData.role) {
          case "admin":
            router.replace("/(admin)");
            break;
          case "teacher":
            router.replace("/(teacher)");
            break;
          case "student":
            router.replace("/(student)");
            break;
          case "parent":
            router.replace("/(parents)");
            break;
          default:
            setErrorMessage("Unrecognized user role: " + userData.role);
            break;
        }
      }, 2000);
    } catch (error: unknown) {
      console.error("Unexpected error:", error);
      setErrorMessage("An unexpected error occurred: " + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!formData.email) {
      Alert.alert("Required", "Please enter your email address to reset your password.");
      return;
    }

    if (!validateEmail(formData.email)) {
      Alert.alert("Invalid Email", "Please enter a valid email address.");
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(formData.email, {
        redirectTo: 'https://example.com/update-password', // Update with actual deep link if needed
      });

      if (error) throw error;

      Alert.alert("Success", "Password reset instructions have been sent to your email.");
    } catch (error: any) {
      Alert.alert("Error", error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView className="flex-1 p-5 bg-[#F1FFF8] relative">
        <View className="flex-row p-5 justify-between mb-5 mt-3">
          <TouchableOpacity onPress={() => router.push("/")}>
            <Ionicons name="arrow-back" size={25} color="black" />
          </TouchableOpacity>
        </View>

        <View className="p-5">
          <Text className="text-4xl text-[#2C3E50] font-bold">
            Welcome Back to
          </Text>
          <Text className="text-4xl text-[#2C3E50] font-bold">
            Your Account
          </Text>
          <Text className="text-xs text-[#2C3E50]">
            Enter your email and password to get started.
          </Text>
        </View>

        <View className="mt-11 p-5">
          <View>
            <Text className="text-lg text-[#2C3E50] mb-2">Email</Text>
            <TextInput
              keyboardType="email-address"
              className="border border-orange-500 rounded-lg h-12 px-2.5"
              placeholder="Enter your Email"
              placeholderTextColor="black"
              value={formData.email}
              onChangeText={(value) => handleInputChange("email", value)}
              autoCapitalize="none"
            />
            {errors.email && (
              <Text className="text-red-500 text-sm mt-1">{errors.email}</Text>
            )}
          </View>

          <View className="mt-5">
            <Text className="text-lg text-[#2C3E50] mb-2">Password</Text>
            <View className="flex-row border border-orange-500 items-center h-12 rounded-lg px-2.5">
              <TextInput
                className="flex-1"
                placeholder="Enter your password"
                secureTextEntry={!showPassword}
                placeholderTextColor="#7E7B7B"
                value={formData.password}
                onChangeText={(value) => handleInputChange("password", value)}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <FontAwesome
                  name={showPassword ? "eye" : "eye-slash"}
                  size={24}
                  color="#7E7B7B"
                />
              </TouchableOpacity>
            </View>
            {errors.password && (
              <Text className="text-red-500 text-sm mt-1">
                {errors.password}
              </Text>
            )}
          </View>

          <TouchableOpacity onPress={handleForgotPassword}>
            <Text className="text-lg mt-2 text-right text-orange-600">
              Forgot password?
            </Text>
          </TouchableOpacity>
        </View>

        <View className="px-5">
          {errorMessage && (
            <View className="bg-red-50 border border-red-200 rounded-lg p-3 mt-2">
              <Text className="text-red-600 text-sm text-center">
                {errorMessage}
              </Text>
            </View>
          )}

          <TouchableOpacity
            className="bg-orange-500 h-[53px] rounded-lg mt-6 flex justify-center items-center shadow-md"
            onPress={onSubmit}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-lg text-white font-semibold">Sign In</Text>
            )}
          </TouchableOpacity>
        </View>

        <View className="flex-row items-center gap-2.5 mt-7 px-5">
          <View className="border-t border-[#2C3E50] flex-1"></View>
          <Text className="text-lg font-medium text-[#2C3E50]">OR</Text>
          <View className="border-t border-[#2C3E50] flex-1"></View>
        </View>

        <View className="flex-row absolute bottom-8 left-0 right-0 justify-center">
          <Text className="text-base text-[#2C3E50]">
            Don&apos;t have an account?{" "}
          </Text>
          <TouchableOpacity onPress={() => router.push("/(auth)/signUp")}>
            <Text className="text-base text-orange-500 font-semibold">
              Sign Up
            </Text>
          </TouchableOpacity>
        </View>

        <Modal
          animationType="fade"
          transparent={true}
          visible={isModalVisible}
          onRequestClose={() => setIsModalVisible(false)}
        >
          <View className="flex-1 items-center bg-black bg-opacity-50">
            <View
              className={`p-5 rounded-lg shadow-lg mt-20 ${isSuccess ? "bg-green-500" : "bg-red-500"
                }`}
            >
              <Text className="text-white text-lg font-semibold text-center">
                {message}
              </Text>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
