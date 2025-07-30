import React from 'react';
import { Text, TextInput, View, TouchableOpacity } from 'react-native';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import { FontAwesome, Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';

// Define your route params (adjust according to your actual routes)
type RootStackParamList = {
  'index': undefined;
  'auth/sign': undefined;

};

type NavigationProps = NavigationProp<RootStackParamList>;

export default function App() {
  const navigation = useNavigation<NavigationProps>();
  
  return (
      // Entire app wrapped inside SafeAreaProvider and SafeAreaView to prevent UI overlap with device notches.
    <SafeAreaProvider>
      <SafeAreaView className="flex-1 bg-[#F1FFF8] font-sans">
        <View className="flex-1 p-10">
          <View className="flex-row justify-between mb-5 mt-3">
            <TouchableOpacity onPress={() => navigation.navigate("index")}>
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
              <TextInput
                keyboardType="email-address"
                className="border border-[#1ABC9C] rounded-lg h-12 px-2.5 w-full focus:border-[#2B876E] focus:ring-2 focus:ring-[#2B876E]"
                placeholder="Enter your email"
                placeholderTextColor="#7E7B7B"
              />
            </View>

            {/* Password */}
            <View>
              <Text className="text-lg text-[#2C3E50] mb-2">Password</Text>
              <View className="flex-row items-center border border-[#1ABC9C] h-12 rounded-lg px-2.5 relative">
                <TextInput
                  secureTextEntry={true}
                  className="flex-1 text-[#2C3E50]"
                  placeholder="Enter your password"
                  placeholderTextColor="#7E7B7B"
                />
                <TouchableOpacity className="absolute right-3 p-1">
                  <FontAwesome name="eye-slash" size={24} color="#7E7B7B" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Confirm Password */}
            <View>
              <Text className="text-lg text-[#2C3E50] mb-2">Confirm Password</Text>
              <View className="flex-row items-center border border-[#1ABC9C] h-12 rounded-lg px-2.5 relative">
                <TextInput
                  secureTextEntry={true}
                  className="flex-1 text-[#2C3E50]"
                  placeholder="Confirm your password"
                  placeholderTextColor="#7E7B7B"
                />
                <TouchableOpacity className="absolute right-3 p-1">
                  <FontAwesome name="eye-slash" size={24} color="#7E7B7B" />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Create Account Button */}
          <TouchableOpacity className="bg-[#2B876E] p-5 h-[53px] rounded-lg mt-6 flex justify-center items-center w-full shadow-md">
            <Text className="text-lg text-white font-medium">Create Account</Text>
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
          <TouchableOpacity onPress={() => navigation.navigate('auth/sign')}>
            <Text className="text-lg text-[#2B876E] font-semibold ml-1">Sign In</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}