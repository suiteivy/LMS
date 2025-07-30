import { Text, TextInput, View, TouchableOpacity, Image } from "react-native";
import { SafeAreaView, SafeAreaProvider } from "react-native-safe-area-context";
import { FontAwesome, Ionicons } from "@expo/vector-icons";
import React from "react";
import { useNavigation } from "@react-navigation/native";
import type { NavigationProp } from "@react-navigation/native";

type RootStackParamList = {
  "/": undefined;
  sign: undefined;
  "auth/signUp": undefined;
};

type NavigationProps = NavigationProp<RootStackParamList>;

export default function Index() {
  const navigation = useNavigation<NavigationProps>();

  return (
    <SafeAreaProvider className="">
      <SafeAreaView className="flex-1 p-5 bg-[#F1FFF8] relative">
        {/* arrow-back and Logo */}
        <View className="flex-row p-5 justify-between mb-5 mt-3">
          {/* Use navigation.goBack() for the back arrow */}
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
            <TextInput
              keyboardType="email-address"
              className="border border-[#1ABC9C] rounded-lg h-12 px-2.5"
              placeholder="Enter your Email"
              placeholderTextColor="#7E7B7B"
            />
          </View>
          {/* Password */}
          <View className="mt-5">
            <Text className="text-lg text-[#2C3E50] mb-2">Password</Text>
            <View className="flex-row border border-[#1ABC9C] items-center h-12 rounded-lg px-2.5">
              <TextInput
                className="flex-1"
                placeholder="Enter your password"
                secureTextEntry={true}
                placeholderTextColor="#7E7B7B"
              />
              <TouchableOpacity>
                <FontAwesome name="eye-slash" size={24} color="#7E7B7B" />
              </TouchableOpacity>
            </View>
          </View>
          {/* Forgot Password */}
          <TouchableOpacity>
            <Text className="text-lg mt-2 text-right text-[#34967C]">
              Forgot password?
            </Text>
          </TouchableOpacity>
        </View>

        <View className="px-5">
          <TouchableOpacity className="bg-[#2B876E] h-[53px] rounded-lg mt-6 flex justify-center items-center shadow-md">
            <Text className="text-lg text-white font-semibold">Sign In</Text>
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
