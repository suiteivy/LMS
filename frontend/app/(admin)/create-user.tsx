import React from "react";
import { View, Text, ScrollView } from "react-native";

export default function CreateUserScreen() {
    return (
        <ScrollView className="flex-1 bg-gray-50">
            <View className="p-4">
                <Text className="text-2xl font-bold text-gray-800 mb-4">
                    Create User
                </Text>
                <Text className="text-gray-600">
                    User creation form coming soon...
                </Text>
            </View>
        </ScrollView>
    );
}
