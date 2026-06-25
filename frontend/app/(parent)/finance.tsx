import React, { useEffect } from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { router } from "expo-router";

export default function ParentFinanceRedirect() {
  useEffect(() => {
    router.replace("/(parent)" as any);
  }, []);

  return (
    <View className="flex-1 items-center justify-center bg-gray-50 dark:bg-navy p-6">
      <ActivityIndicator size="large" color="#FF6900" />
      <Text className="text-gray-500 dark:text-gray-400 mt-3 text-center text-sm">
        Redirecting to Home. Finance is now consolidated on the dashboard.
      </Text>
    </View>
  );
}
