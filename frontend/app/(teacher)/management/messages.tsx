import { UnifiedHeader } from "@/components/common/UnifiedHeader";
import { SubscriptionGate, AddonRequestButton } from "@/components/shared/SubscriptionComponents";
import { DirectChatView } from "@/components/chat/DirectChatView";
import { router } from "expo-router";
import { Zap } from "lucide-react-native";
import React from "react";
import { Text, View } from "react-native";

export default function MessagingPage() {
  return (
    <View className="flex-1 bg-gray-50 dark:bg-navy">
      <UnifiedHeader
        title="Management"
        subtitle="Messaging"
        role="Teacher"
        onBack={() => router.push("/(teacher)/management")}
      />

      <SubscriptionGate
        feature="messaging"
        fallback={
          <View className="flex-1 items-center justify-center p-8">
            <View className="bg-orange-50 p-8 rounded-[40px] items-center border border-orange-100 border-dashed max-w-sm">
              <Zap size={48} color="#FF6900" style={{ marginBottom: 20 }} />
              <Text className="text-xl font-bold text-gray-900 text-center mb-2">Messaging Locked</Text>
              <Text className="text-gray-500 text-center mb-8 leading-5">
                Advanced messaging features are not included in your current subscription plan.
              </Text>
              <AddonRequestButton onPress={() => {}} />
            </View>
          </View>
        }
      >
        <DirectChatView
          allowedContactRoles={["teacher", "parent", "admin", "master_admin", "school_admin", "platform_admin"]}
          searchPlaceholder="Search stakeholders..."
          emptyListTitle="No secure threads"
        />
      </SubscriptionGate>
    </View>
  );
}
