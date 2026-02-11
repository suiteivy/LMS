import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  Text,
  TextInput,
  View,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView, SafeAreaProvider } from "react-native-safe-area-context";
import { FontAwesome, Ionicons } from "@expo/vector-icons";
import { getAuthErrorMessage, validateSignUpForm } from "@/utils/validation";
import { router } from "expo-router";

interface FormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: "admin" | "student" | "teacher";
}

export default function App() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Form state
  const [formData, setFormData] = useState<FormData>({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "student",
  });

  // Form errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  const roles: Array<{
    label: string;
    value: "admin" | "student" | "teacher";
  }> = [
      { label: "Admin", value: "admin" },
      { label: "Teacher", value: "teacher" },
      { label: "Student", value: "student" },
    ];

  // Function to show a custom message modal
  const showMessage = (msg: string, success: boolean) => {
    setMessage(msg);
    setIsSuccess(success);
    setIsModalVisible(true);
    setTimeout(() => {
      setIsModalVisible(false);
      if (success) {
        router.replace("/(auth)/signIn");
      }
    }, 2000);
  };

  // Getting signUp function from auth context
  const { signUp } = useAuth();

  // Handle input changes
  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clears error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  // Function to handle form submission
  const onSubmit = async () => {
    // Validate form
    const validation = validateSignUpForm({
      email: formData.email,
      password: formData.password,
      confirmPassword: formData.confirmPassword,
      fullName: formData.name,
      role: formData.role,
    });

    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      // Registering user with Supabase
      const { error } = await signUp(formData.email, formData.password, {
        full_name: formData.name,
        role: formData.role,
      });

      if (error) {
        showMessage(
          `Registration failed: ${getAuthErrorMessage(error)}`,
          false
        );
        console.error('Error message', error)
        return;
      }

      // Show success message and redirect to sign in
      showMessage("Account created successfully! Please sign in.", true);
    } catch (error) {
      showMessage(
        `An unexpected error occurred: ${error instanceof Error ? error.message : "Unknown error"}`,
        false
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    // Entire app wrapped inside SafeAreaProvider and SafeAreaView to prevent UI overlap with device notches.
    <SafeAreaProvider>
      <SafeAreaView className="flex-1 bg-white font-sans">
        <View className="flex-1 p-10">
          <View className="flex-row justify-between mb-5 mt-3">
            <TouchableOpacity onPress={() => router.replace("/(auth)/signIn")}>
              <Ionicons name="arrow-back" size={25} color="black" />
            </TouchableOpacity>
          </View>

          {/* Title */}
          <Text className="text-4xl text-gray-900 font-bold">Create Your Account</Text>
          <Text className="text-sm text-gray-900 mt-1">
            Enter your details to create an account.
          </Text>

          {/* Form */}
          <View className="mt-11 space-y-5">
            {/* Full Name */}
            <View>
              <Text className="text-lg text-gray-900 mb-2">Full Name</Text>
              <TextInput
                className="border border-orange-500 rounded-lg h-12 px-2.5 text-orange-500"
                placeholder="Enter your full name"
                placeholderTextColor="#7E7B7B"
                value={formData.name}
                onChangeText={(value) => handleInputChange("name", value)}
              />
              {errors.fullName && (
                <Text className="text-red-500 text-sm mt-1">
                  {errors.fullName}
                </Text>
              )}
            </View>

            {/* Email */}
            <View>
              <Text className="text-lg text-gray-900 mb-2">Email</Text>
              <TextInput
                keyboardType="email-address"
                className="border border-orange-500 rounded-lg h-12 px-2.5 w-full focus:border-[#2B876E] focus:ring-2 focus:ring-[#2B876E]"
                placeholder="Enter your email"
                placeholderTextColor="#7E7B7B"
                value={formData.email}
                onChangeText={(value) => handleInputChange("email", value)}
                autoCapitalize="none"
              />
              {errors.email && (
                <Text className="text-red-500 text-sm mt-1">
                  {errors.email}
                </Text>
              )}
            </View>

            {/* Password */}
            <View>
              <Text className="text-lg text-gray-900 mb-2">Password</Text>
              <View className="flex-row items-center border border-orange-500 h-12 rounded-lg px-2.5 relative">
                <TextInput
                  secureTextEntry={!showPassword}
                  className="flex-1 text-orange-500"
                  placeholder="Enter your password"
                  placeholderTextColor="#7E7B7B"
                  value={formData.password}
                  onChangeText={(value) => handleInputChange("password", value)}
                />
                <TouchableOpacity
                  className="absolute right-3 p-1"
                  onPress={() => setShowPassword(!showPassword)}
                >
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

            {/* Confirm Password */}
            <View>
              <Text className="text-lg text-gray-900 mb-2">
                Confirm Password
              </Text>
              <View className="flex-row items-center border border-orange-500 h-12 rounded-lg px-2.5 relative">
                <TextInput
                  secureTextEntry={!showConfirmPassword}
                  className="flex-1 text-orange-500"
                  placeholder="Confirm your password"
                  placeholderTextColor="#7E7B7B"
                  value={formData.confirmPassword}
                  onChangeText={(value) =>
                    handleInputChange("confirmPassword", value)
                  }
                />
                <TouchableOpacity
                  className="absolute right-3 p-1"
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  <FontAwesome
                    name={showConfirmPassword ? "eye" : "eye-slash"}
                    size={24}
                    color="#7E7B7B"
                  />
                </TouchableOpacity>
              </View>
              {errors.confirmPassword && (
                <Text className="text-red-500 text-sm mt-1">
                  {errors.confirmPassword}
                </Text>
              )}
            </View>
          </View>

          {/* Role Selection */}
          <View>
            <Text className="text-lg mt-4 text-gray-900 mb-2">Select Role</Text>
            <View className="flex-row justify-around">
              {roles.map((role) => (
                <TouchableOpacity
                  key={role.value}
                  className={`py-2 px-4 rounded-full ${formData.role === role.value
                    ? "bg-orange-500"
                    : "border border-orange-500"
                    }`}
                  onPress={() => handleInputChange("role", role.value)}
                >
                  <Text
                    className={`${formData.role === role.value
                      ? "text-white"
                      : "text-orange-500"
                      } font-semibold text-sm`}
                  >
                    {role.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {errors.role && (
              <Text className="text-red-500 text-sm mt-1">{errors.role}</Text>
            )}
          </View>

          {/* Create Account Button */}
          <TouchableOpacity
            className="bg-orange-500 p-5 h-[53px] rounded-lg mt-6 flex justify-center items-center w-full shadow-md"
            onPress={onSubmit}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text className="text-lg text-white font-semibold">
                Create Account
              </Text>
            )}
          </TouchableOpacity>

          {/* OR Separator */}
          <View className="flex-row items-center gap-2.5 mt-7">
            <View className="border-t border-[#2C3E50] flex-1"></View>
            <Text className="text-lg font-medium text-gray-900">OR</Text>
            <View className="border-t border-[#2C3E50] flex-1"></View>
          </View>
        </View>

        {/* Bottom Sign In link */}
        <View className="flex-row justify-center mb-8">
          <Text className="text-lg text-gray-900">Have an account?</Text>
          <TouchableOpacity onPress={() => router.push("/(auth)/signIn")}>
            <Text className="text-lg text-orange-500 font-semibold ml-1">
              Sign In
            </Text>
          </TouchableOpacity>
        </View>

        {/* Custom Message Modal */}
        <Modal
          animationType="fade"
          transparent={true}
          visible={isModalVisible}
          onRequestClose={() => setIsModalVisible(false)}
        >
          <View className="flex-1 items-center bg-black bg-opacity-50">
            <View
              className={`p-5 rounded-lg shadow-lg mt-20 ${isSuccess ? "bg-green-500" : "bg-red-500"}`}
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
