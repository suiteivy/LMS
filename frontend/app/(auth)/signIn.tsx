import {
  Text,
  TextInput,
  View,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Alert,
  ScrollView,
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

      console.log("User signed in with UUID:", data.user.id);

      interface UserRow {
        role: string;
        full_name: string;
        id: string;
        institution_id: string;
      }
      const { data: userData, error: roleError } = await supabase
        .from("users")
        .select("role, full_name, id, institution_id")
        .eq("id", data.user.id)
        .single() as { data: UserRow | null; error: any };

      if (roleError || !userData) {
        console.error("Role fetch error:", roleError?.message || "No user data");
        setErrorMessage("Could not fetch user role");
        setIsLoading(false);
        return;
      }

      // Fetch custom ID
      let customId = "";
      if (userData.role === 'admin') {
        const { data: adm } = await supabase.from('admins').select('id').eq('user_id', userData.id).single() as { data: { id: string } | null };
        customId = adm?.id || "";
      } else if (userData.role === 'teacher') {
        const { data: tea } = await supabase.from('teachers').select('id').eq('user_id', userData.id).single() as { data: { id: string } | null };
        customId = tea?.id || "";
      } else if (userData.role === 'student') {
        const { data: stu } = await supabase.from('students').select('id').eq('user_id', userData.id).single() as { data: { id: string } | null };
        customId = stu?.id || "";
      }

      console.log(`User profile loaded: ${userData.full_name} (${userData.role}) - Custom ID: ${customId}`);

      if (!userData?.role) {
        console.log("No role found for user");
        setErrorMessage("No role assigned to user.");
        setIsLoading(false);
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
            router.replace("/(parent)" as any);
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
      {/* The outer View handles the gray background for PCs */}
      <View className="flex-1 bg-gray-50 lg:bg-gray-100 justify-center">
        <SafeAreaView className="flex-1 w-full max-w-[500px] self-center">
          <ScrollView
            contentContainerStyle={{ flexGrow: 1, justifyContent: "flex-start" }}
            className="bg-white lg:rounded-[40px] lg:border lg:border-gray-200 lg:my-10 lg:shadow-xl"
            showsVerticalScrollIndicator={false}
          >
            <View className="p-8">
              {/* CENTERED HEADER WITH ABSOLUTE ARROW */}
              <View className="flex-row items-center justify-center relative h-10 mb-10">
                <TouchableOpacity
                  onPress={() => router.replace("/")}
                  className="absolute left-0 w-10 h-10 items-center justify-center rounded-2xl bg-gray-50 border border-gray-100"
                  activeOpacity={0.7}
                >
                  <Ionicons name="arrow-back" size={20} color="black" />
                </TouchableOpacity>

                <Text className="text-gray-400 font-bold uppercase tracking-[3px] text-[10px]">
                  Auth Portal
                </Text>
              </View>

              {/* CENTERED HERO TEXT */}
              <View className="items-center mb-10">
                <Text className="text-4xl text-gray-900 font-black tracking-tighter text-center">
                  Welcome Back
                </Text>
                <View className="flex-row items-center">
                  <Text className="text-4xl text-gray-400 font-light tracking-tighter">
                    to your account
                  </Text>
                  <Text className="text-4xl text-orange-500 font-black">.</Text>
                </View>
                <Text className="text-sm text-gray-500 mt-3 text-center leading-5 px-4 font-medium">
                  Enter your credentials to securely access your student
                  dashboard.
                </Text>
              </View>

              {/* FORM FIELDS */}
              <View className="space-y-6">
                <View>
                  <Text className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">
                    Email Address
                  </Text>
                  <View
                    className={`h-14 bg-gray-50 border ${errors.email ? "border-red-500" : "border-gray-100"} rounded-2xl px-4 flex-row items-center`}
                  >
                    <Ionicons name="mail-outline" size={20} color="#9ca3af" />
                    <TextInput
                      keyboardType="email-address"
                      className="flex-1 ml-3 text-gray-900 font-semibold h-full"
                      placeholder="name@example.com"
                      placeholderTextColor="#9ca3af"
                      value={formData.email}
                      onChangeText={(value) =>
                        handleInputChange("email", value)
                      }
                      autoCapitalize="none"
                    />
                  </View>
                </View>

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
                </View>
              </View>

              <TouchableOpacity
                onPress={handleForgotPassword}
                className="mt-4 self-end"
              >
                <Text className="text-orange-500 font-bold text-sm">
                  Forgot password?
                </Text>
              </TouchableOpacity>

              {/* SIGN IN BUTTON */}
              <TouchableOpacity
                className="bg-orange-500 h-14 rounded-2xl mt-10 flex justify-center items-center shadow-lg shadow-orange-200"
                onPress={onSubmit}
                disabled={isLoading}
                activeOpacity={0.8}
              >
                {isLoading ? (
                  <ActivityIndicator color="white" className="p-2" />
                ) : (
                  <Text className="text-white font-bold text-lg p-2 ">Sign In</Text>
                )}
              </TouchableOpacity>

            </View>
          </ScrollView>
        </SafeAreaView>
      </View>
    </SafeAreaProvider>
  );
}
