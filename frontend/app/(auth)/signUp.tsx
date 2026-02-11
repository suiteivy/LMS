import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  Text,
  TextInput,
  View,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  ScrollView,
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

  const [formData, setFormData] = useState<FormData>({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "student",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const roles: Array<{
    label: string;
    value: "admin" | "student" | "teacher";
  }> = [
    { label: "Admin", value: "admin" },
    { label: "Teacher", value: "teacher" },
    { label: "Student", value: "student" },
  ];

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

  const { signUp } = useAuth();

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const onSubmit = async () => {
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
      const { error } = await signUp(formData.email, formData.password, {
        full_name: formData.name,
        role: formData.role,
      });

      if (error) {
        showMessage(
          `Registration failed: ${getAuthErrorMessage(error)}`,
          false,
        );
        return;
      }

      showMessage("Account created successfully! Please sign in.", true);
    } catch (error) {
      showMessage(
        `An unexpected error occurred: ${error instanceof Error ? error.message : "Unknown error"}`,
        false,
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaProvider>
      {/* Background container for responsive/PC views */}
      <View className="flex-1 bg-gray-50 lg:bg-gray-100 justify-center">
        <SafeAreaView className="flex-1 w-full max-w-[500px] self-center">
          <ScrollView
            contentContainerStyle={{ flexGrow: 1 }}
            className="bg-white lg:rounded-[40px] lg:mt-6 lg:shadow-xl"
            showsVerticalScrollIndicator={false}
          >
            <View className="p-8 pt-2">
              {/* CENTERED HEADER WITH ABSOLUTE ARROW */}
              <View className="flex-row items-center justify-center relative h-10 mb-8">
                <TouchableOpacity
                  onPress={() => router.replace("/(auth)/signIn")}
                  className="absolute left-0 w-10 h-10 items-center justify-center rounded-2xl bg-gray-50 border border-gray-100"
                  activeOpacity={0.7}
                >
                  <Ionicons name="arrow-back" size={20} color="black" />
                </TouchableOpacity>

                <Text className="text-gray-400 font-bold uppercase tracking-[3px] text-[10px]">
                  Registration
                </Text>
              </View>

              {/* CENTERED HERO TEXT */}
              <View className="items-center mb-8">
                <Text className="text-3xl text-gray-900 font-black tracking-tighter text-center">
                  Create Account
                </Text>
                <View className="flex-row items-center">
                  <Text className="text-3xl text-gray-400 font-light tracking-tighter">
                    to join us
                  </Text>
                  <Text className="text-3xl text-orange-500 font-black">.</Text>
                </View>
              </View>

              {/* FORM FIELDS */}
              <View className="space-y-4">
                {/* Full Name */}
                <View>
                  <Text className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">
                    Full Name
                  </Text>
                  <View
                    className={`h-14 bg-gray-50 border ${errors.fullName ? "border-red-500" : "border-gray-100"} rounded-2xl px-4 flex-row items-center`}
                  >
                    <Ionicons name="person-outline" size={20} color="#9ca3af" />
                    <TextInput
                      className="flex-1 ml-3 text-gray-900 font-semibold h-full"
                      placeholder="Enter your full name"
                      placeholderTextColor="#9ca3af"
                      value={formData.name}
                      onChangeText={(value) => handleInputChange("name", value)}
                    />
                  </View>
                  {errors.fullName && (
                    <Text className="text-red-500 text-[10px] mt-1 ml-1">
                      {errors.fullName}
                    </Text>
                  )}
                </View>

                {/* Email */}
                <View>
                  <Text className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">
                    Email
                  </Text>
                  <View
                    className={`h-14 bg-gray-50 border ${errors.email ? "border-red-500" : "border-gray-100"} rounded-2xl px-4 flex-row items-center`}
                  >
                    <Ionicons name="mail-outline" size={20} color="#9ca3af" />
                    <TextInput
                      keyboardType="email-address"
                      className="flex-1 ml-3 text-gray-900 font-semibold h-full"
                      placeholder="Enter your email"
                      placeholderTextColor="#9ca3af"
                      value={formData.email}
                      onChangeText={(value) =>
                        handleInputChange("email", value)
                      }
                      autoCapitalize="none"
                      textContentType="emailAddress" 
                      autoComplete="email"          
                    />
                  </View>
                  {errors.email && (
                    <Text className="text-red-500 text-[10px] mt-1 ml-1">
                      {errors.email}
                    </Text>
                  )}
                </View>

                {/* Password */}
                <View>
                  <Text className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">
                    Password
                  </Text>
                  <View
                    className={`h-14 bg-gray-50 border ${errors.password ? "border-red-500" : "border-gray-100"} rounded-2xl px-4 flex-row items-center`}
                  >
                    <Ionicons
                      name="lock-closed-outline"
                      size={20}
                      color="#9ca3af"
                    />
                    <TextInput
                      className="flex-1 ml-3 text-gray-900 font-semibold h-full"
                      placeholder="••••••••"
                      secureTextEntry={!showPassword}
                      placeholderTextColor="#9ca3af"
                      value={formData.password}
                      onChangeText={(value) =>
                        handleInputChange("password", value)
                      }
                      textContentType="password" 
                      autoComplete="password"
                    />
                    <TouchableOpacity
                      onPress={() => setShowPassword(!showPassword)}
                    >
                      <Ionicons
                        name={showPassword ? "eye-outline" : "eye-off-outline"}
                        size={20}
                        color="#9ca3af"
                      />
                    </TouchableOpacity>
                  </View>
                  {errors.password && (
                    <Text className="text-red-500 text-[10px] mt-1 ml-1">
                      {errors.password}
                    </Text>
                  )}
                </View>

                {/* Confirm Password */}
                <View>
                  <Text className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">
                    Confirm Password
                  </Text>
                  <View
                    className={`h-14 bg-gray-50 border ${errors.confirmPassword ? "border-red-500" : "border-gray-100"} rounded-2xl px-4 flex-row items-center`}
                  >
                    <Ionicons
                      name="checkmark-circle-outline"
                      size={20}
                      color="#9ca3af"
                    />
                    <TextInput
                      className="flex-1 ml-3 text-gray-900 font-semibold h-full"
                      placeholder="••••••••"
                      secureTextEntry={!showConfirmPassword}
                      placeholderTextColor="#9ca3af"
                      value={formData.confirmPassword}
                      onChangeText={(value) =>
                        handleInputChange("confirmPassword", value)
                      }
                    />
                    <TouchableOpacity
                      onPress={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                    >
                      <Ionicons
                        name={
                          showConfirmPassword
                            ? "eye-outline"
                            : "eye-off-outline"
                        }
                        size={20}
                        color="#9ca3af"
                      />
                    </TouchableOpacity>
                  </View>
                  {errors.confirmPassword && (
                    <Text className="text-red-500 text-[10px] mt-1 ml-1">
                      {errors.confirmPassword}
                    </Text>
                  )}
                </View>
              </View>

              {/* ROLE SELECTION */}
              <View>
                <Text className="text-lg mt-4 text-gray-900 mb-2">
                  Select Role
                </Text>

                <View className="flex-row justify-around">
                  {roles.map((role) => (
                    <TouchableOpacity
                      key={role.value}
                      className={`py-2 px-4 rounded-full ${
                        formData.role === role.value
                          ? "bg-orange-500"
                          : "border border-orange-500"
                      }`}
                      onPress={() => handleInputChange("role", role.value)}
                    >
                      <Text
                        className={`${
                          formData.role === role.value
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
                  <Text className="text-red-500 text-sm mt-1">
                    {errors.role}
                  </Text>
                )}
              </View>

              {/* Create Account Button */}
              <TouchableOpacity
                className="bg-orange-500 h-14 p-2 rounded-2xl mt-8 flex justify-center items-center shadow-lg shadow-orange-200"
                onPress={onSubmit}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="white" className="p-2" />
                ) : (
                  <Text className="text-white font-bold text-lg">
                    Create Account
                  </Text>
                )}
              </TouchableOpacity>

              {/* FOOTER */}
              <View className="flex-row justify-center mt-8 mb-6">
                <Text className="text-gray-500">Have an account? </Text>
                <TouchableOpacity onPress={() => router.push("/(auth)/signIn")}>
                  <Text className="text-orange-500 font-bold">Sign In</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </View>

      {/* Modal remains unchanged logically */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={isModalVisible}
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View className="flex-1 items-center bg-black/50 justify-center px-5">
          <View
            className={`p-5 rounded-2xl shadow-lg w-full max-w-sm ${isSuccess ? "bg-green-500" : "bg-red-500"}`}
          >
            <Text className="text-white text-lg font-semibold text-center">
              {message}
            </Text>
          </View>
        </View>
      </Modal>
    </SafeAreaProvider>
  );
}
