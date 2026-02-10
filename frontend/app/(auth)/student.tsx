import { Text, View,  TouchableOpacity, TextInput, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState } from "react";
import { router } from "expo-router";

export default function StudentSignUpScreen () {
    const [isCreating, setIsCreating] = useState(false);

    const handleCreateAccount = async () => {
        setIsCreating(true);
       setTimeout(() => {
           setIsCreating(false);
           Alert.alert("Redirecting", "Your account has been created successfully.");
           router.replace("/(student)");
       }, 3000);
    }
    

    return (
        <SafeAreaView className="flex-1">
            <View className="bg-bgLight flex-grow p-8">
                <View className="flex items-center justify-center py-6">
                    <Text className="text-3xl font-bold">Create Your Account</Text>
                </View>
                <View className="py-4">
                    <TouchableOpacity className="flex items-center">
                        <TextInput
                            className="border border-border rounded-lg h-12 px-2.5 w-full focus:border-primaryColor focus:ring-2 focus:ring-primaryColor"
                            placeholder="Full Name"
                            placeholderTextColor="#2C3E50"
                            placeholderClassName="pl-2 focus:pl-2"
                        />
                    </TouchableOpacity>
                </View>
                <View className="py-4">
                    <TouchableOpacity className="flex items-center">
                        <TextInput
                            className="border border-border rounded-lg h-12 px-2.5 w-full focus:border-primaryColor focus:ring-2 focus:ring-primaryColor"
                            placeholder="Email"
                            placeholderTextColor="#2C3E50"
                            placeholderClassName="pl-2 focus:pl-2"
                        />
                    </TouchableOpacity>
                </View>
                <View className="py-4">
                    <TouchableOpacity className="flex items-center">
                        <TextInput
                            className="border border-border rounded-lg h-12 px-2.5 w-full focus:border-primaryColor focus:ring-2 focus:ring-primaryColor"
                            placeholder="Password"
                            placeholderTextColor="#2C3E50"
                            placeholderClassName="pl-2 focus:pl-2"
                        />
                    </TouchableOpacity>
                </View>
                <View className="py-4">
                    <TouchableOpacity className="flex items-center">
                        <TextInput
                            className="border border-border rounded-lg h-12 px-2.5 w-full focus:border-primaryColor focus:ring-2 focus:ring-primaryColor"
                            placeholder="Confirm Password"
                            placeholderTextColor="#2C3E50"
                            placeholderClassName="pl-2 focus:pl-2"
                        />
                    </TouchableOpacity>
                </View>
                <View className="py-4">
                    <TouchableOpacity 
                        className="flex items-center bg-primaryColor py-4 px-2.5 rounded-lg"
                        disabled={isCreating}
                        onPress={handleCreateAccount}
                    >
                        <Text className="text-white font-semibold">
                            {isCreating ? "Creating..." : "Create Account"}
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>    
        </SafeAreaView>
    )
};
