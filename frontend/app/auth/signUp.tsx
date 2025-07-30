import React, { useState } from "react";
import { Text, TextInput, View, TouchableOpacity } from "react-native";
import { SafeAreaView, SafeAreaProvider } from "react-native-safe-area-context";
import { FontAwesome, Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NavigationProp } from "@react-navigation/native";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { SignUpFormInputs, signUpSchema } from "@/schema/authSchema";

// Defined navigation route params
type RootStackParamList = {
  "auth/sign": undefined;
  "auth/signUp": undefined
};

type NavigationProps = NavigationProp<RootStackParamList>;

export default function App() {
  const navigation = useNavigation<NavigationProps>();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Initialized React Hook Form with Zod resolver
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<SignUpFormInputs>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  // Function to handle form submission
  const onSubmit = (data: SignUpFormInputs) => {
    console.log("Form Data:", data);
    alert("Account created successfully! Please log in.");
    navigation.navigate("auth/sign");
  };

  return (
    // Entire app wrapped inside SafeAreaProvider and SafeAreaView to prevent UI overlap with device notches.
    <SafeAreaProvider>
      <SafeAreaView className="flex-1 bg-[#F1FFF8] font-sans">
        <View className="flex-1 p-10">
          <View className="flex-row justify-between mb-5 mt-3">
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={25} color="black" />
            </TouchableOpacity>
          </View>

          {/* Title */}
          <Text className="text-4xl text-[#2C3E50] font-bold">Create Your</Text>
          <Text className="text-4xl text-[#2C3E50] font-bold">Account</Text>
          <Text className="text-xs text-[#2C3E50] mt-1">
            Enter new details to create a new account.
          </Text>

          {/* Form */}
          <View className="mt-11 space-y-5">
            {/* Email */}
            <View>
              <Text className="text-lg text-[#2C3E50] mb-2">Email</Text>
              <Controller
                control={control}
                name="email"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    keyboardType="email-address"
                    className="border border-[#1ABC9C] rounded-lg h-12 px-2.5 w-full focus:border-[#2B876E] focus:ring-2 focus:ring-[#2B876E]"
                    placeholder="Enter your email"
                    placeholderTextColor="text-[#2C3E50]"
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                    autoCapitalize="none"
                  />
                )}
              />
              {errors.email && (
                <Text className="text-red-500 text-sm mt-1">
                  {errors.email.message}
                </Text>
              )}
            </View>

            {/* Password */}
            <View>
              <Text className="text-lg text-[#2C3E50] mb-2">Password</Text>
              <View className="flex-row items-center border border-[#1ABC9C] h-12 rounded-lg px-2.5 relative">
                <Controller
                  control={control}
                  name="password"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      secureTextEntry={!showPassword}
                      className="flex-1 text-[#2C3E50]"
                      placeholder="Enter your password"
                      placeholderTextColor="text-[#2C3E50]"
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                    />
                  )}
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
                  {errors.password.message}
                </Text>
              )}
            </View>

            {/* Confirm Password */}
            <View>
              <Text className="text-lg text-[#2C3E50] mb-2">
                Confirm Password
              </Text>
              <View className="flex-row items-center border border-[#1ABC9C] h-12 rounded-lg px-2.5 relative">
                <Controller
                  control={control}
                  name="confirmPassword"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      secureTextEntry={!showConfirmPassword}
                      className="flex-1 text-[#2C3E50]"
                      placeholder="Confirm your password"
                      placeholderTextColor="text-[#2C3E50]"
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                    />
                  )}
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
                  {errors.confirmPassword.message}
                </Text>
              )}
            </View>
          </View>

          {/* Create Account Button */}
          <TouchableOpacity
            className="bg-[#2B876E] p-5 h-[53px] rounded-lg mt-6 flex justify-center items-center w-full shadow-md"
            onPress={handleSubmit(onSubmit)}
          >
            <Text className="text-lg text-white font-semibold">
              Create Account
            </Text>
          </TouchableOpacity>

          {/* OR Separator */}
          <View className="flex-row items-center gap-2.5 mt-7">
            <View className="border-t border-[#2C3E50] flex-1"></View>
            <Text className="text-lg font-medium text-[#2C3E50]">OR</Text>
            <View className="border-t border-[#2C3E50] flex-1"></View>
          </View>
        </View>

        {/* Bottom Sign In link */}
        <View className="flex-row justify-center mb-8">
          <Text className="text-lg text-[#2C3E50]">Have an account?</Text>
          <TouchableOpacity onPress={() => navigation.navigate("auth/sign")}>
            <Text className="text-lg text-[#2B876E] font-semibold ml-1">
              Sign In
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
