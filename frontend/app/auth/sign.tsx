import { Text, TextInput, View, TouchableOpacity, ActivityIndicator } from "react-native";
import { SafeAreaView, SafeAreaProvider } from "react-native-safe-area-context";
import { FontAwesome, Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useNavigation } from "@react-navigation/native";
import type { NavigationProp } from "@react-navigation/native";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { LoginFormInputs, loginSchema } from "@/schema/authSchema";


type RootStackParamList = {
  '/': undefined;
  "auth/signUp": undefined;
};

type NavigationProps = NavigationProp<RootStackParamList>;

export default function Index() {
  const navigation = useNavigation<NavigationProps>();
  const [showPassword, setShowPassword] = useState(false);

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginFormInputs>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      role: undefined,
    },
  });

  const roles = ["Admin", "Teacher", "Student"];

  const { signIn } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const onSubmit = async (data: LoginFormInputs) => {
    setIsLoading(true);
    setErrorMessage(null);
    
    try {
      // Sign in with email and password
      const { error } = await signIn(data.email, data.password);
      
      if (error) {
        setErrorMessage(error.message || 'Failed to sign in');
        return;
      }
      
      // Navigate to home screen or dashboard based on role
      navigation.navigate('/');
    } catch (error) {
      setErrorMessage('An unexpected error occurred');
      console.error('Sign in error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaProvider className="">
      <SafeAreaView className="flex-1 p-5 bg-[#F1FFF8] relative">
        {/* arrow-back and Logo */}
        <View className="flex-row p-5 justify-between mb-5 mt-3">
          {/* back arrow */}
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={25} color="black" />
          </TouchableOpacity>
        </View>

        <View className="p-5">
          {/* Instruction */}
          <Text className="text-4xl text-[#2C3E50] font-bold">
            Welcome Back to
          </Text>
          <Text className="text-4xl text-[#2C3E50] font-bold">
            Your Account
          </Text>
          <Text className="text-xs text-[#2C3E50]">
            Enter your email and password to sign back.
          </Text>
        </View>

        {/* Form Group */}
        <View className="mt-11 p-5">
          {/* Email */}
          <View>
            <Text className="text-lg text-[#2C3E50] mb-2">Email</Text>
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  keyboardType="email-address"
                  className="border border-[#1ABC9C] rounded-lg h-12 px-2.5"
                  placeholder="Enter your Email"
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
          <View className="mt-5">
            <Text className="text-lg text-[#2C3E50] mb-2">Password</Text>
            <View className="flex-row border border-[#1ABC9C] items-center h-12 rounded-lg px-2.5">
              <Controller
                control={control}
                name="password"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    className="flex-1"
                    placeholder="Enter your password"
                    secureTextEntry={!showPassword}
                    placeholderTextColor="text-[#2C3E50]"
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                  />
                )}
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
                {errors.password.message}
              </Text>
            )}
          </View>

          {/* Forgot Password */}
          <TouchableOpacity>
            <Text className="text-lg mt-2 text-right text-[#34967C]">
              Forgot password?
            </Text>
          </TouchableOpacity>

          {/* Role Selection */}
          <View className="mt-5">
            <Text className="text-lg text-[#2C3E50] mb-2">Sign in as:</Text>
            <Controller
              control={control}
              name="role"
              render={({ field: { onChange, value } }) => (
                <View className="flex-row justify-around">
                  {roles.map((role) => (
                    <TouchableOpacity
                      key={role}
                      className={`py-2 px-4 rounded-full ${
                        value === role
                          ? "bg-[#1ABC9C]"
                          : "border border-[#1ABC9C]"
                      }`}
                      onPress={() => onChange(role)}
                    >
                      <Text
                        className={`${
                          value === role ? "text-white" : "text-[#1ABC9C]"
                        } font-semibold`}
                      >
                        {role}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            />
            {errors.role && (
              <Text className="text-red-500 text-sm mt-1 text-center">
                {errors.role.message}
              </Text>
            )}
          </View>
        </View>

        <View className="px-5">
          {/* Error Message */}
          {errorMessage && (
            <Text className="text-red-500 text-sm mt-2">{errorMessage}</Text>
          )}

          <TouchableOpacity
            className="bg-[#2B876E] h-[53px] rounded-lg mt-6 flex justify-center items-center shadow-md"
            onPress={handleSubmit(onSubmit)}
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

        {/* New users */}
        <View className="flex-row absolute bottom-8 left-0 right-0 justify-center">
          <Text className="text-base text-[#2C3E50]">
            Don't have an account?{" "}
          </Text>
          <TouchableOpacity onPress={() => navigation.navigate("auth/signUp")}>
            <Text className="text-base text-[#34967C] font-semibold">
              Sign Up
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}