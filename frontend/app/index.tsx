import { Text, View, Image, TouchableOpacity } from "react-native";
import { SafeAreaView, SafeAreaProvider } from "react-native-safe-area-context";
import React from "react";
import { NavigationProp, useNavigation } from "@react-navigation/native";

type RootStackParamList = {
  "auth/sign": undefined;
 "auth/signUp": undefined;
};

type NavigationProps = NavigationProp<RootStackParamList>;
export default function Index() {
  const navigation = useNavigation<NavigationProps>();

  return (
    // Entire app wrapped inside SafeAreaProvider and SafeAreaView to prevent UI overlap with device notches.
    <SafeAreaProvider>
      <SafeAreaView className="flex-1">
        <View className="flex-1 bg-[#F1FFF8]">
          {/* Company Logo */}
          <View className="w-full items-center p-5 mb-12">
            <Image source={require("@/assets/images/react-logo.png")} />
          </View>

          {/* Hero Section */}
          <View className="items-center">
            <Text className="text-[#2C3E50] font-extrabold text-4xl text-center mb-3">
              Welcome to Our Learning Hub
            </Text>
            <Text className="text-[#2C3E50] text-lg font-extralight text-center">
              Unlock your full potential with our comprehensive courses.
            </Text>
          </View>

          {/* Button section */}
          <View className="absolute bottom-0 w-full mb-6">
            <View className="flex-row gap-5 px-5">
              <TouchableOpacity
                className="rounded-full py-4 px-1 items-center bg-[#128C7E] flex-1"
                onPress={() => navigation.navigate("auth/signUp")}
              >
                <Text className="text-white text-lg font-medium">
                  Join here
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="border-2  border-[#128C7E] rounded-full py-4 px-1 items-center flex-1"
                onPress={() => navigation.navigate("auth/sign")}
              >
                <Text className="text-[#2C3E50] text-lg font-medium">
                  Sign In
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
