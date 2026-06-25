import { UnifiedHeader } from "@/components/common/UnifiedHeader";
import { DirectChatView } from "@/components/chat/DirectChatView";
import { router } from "expo-router";
import { Plus, Zap } from "lucide-react-native";
import React from "react";
import { TouchableOpacity, View, Text } from "react-native";
import { SubscriptionGate, AddonRequestButton } from "@/components/shared/SubscriptionComponents";

export default function MessagingPage() {
  const [directChatComposeToken, setDirectChatComposeToken] = React.useState(0);

  return (
    <View className="flex-1 bg-[#FFFFFF] dark:bg-[#0D1117]">
      <UnifiedHeader
        title="Management"
        subtitle="Messaging"
        role="Teacher"
        onBack={() => router.push("/(teacher)/management")}
        rightActions={
          <TouchableOpacity
            className="bg-[#FF6900] w-10 h-10 rounded-xl items-center justify-center"
            onPress={() => setDirectChatComposeToken((prev) => prev + 1)}
            accessibilityLabel="Start new chat"
          >
            <Plus size={20} color="white" />
          </TouchableOpacity>
        }
      />

      <SubscriptionGate
        feature="messaging"
        fallback={
          <View className="flex-1 items-center justify-center p-8">
            <View className="bg-[#F6F8FA] dark:bg-[#161B22] p-8 rounded-2xl items-center border border-[#D0D7DE] dark:border-[#21262D] border-dashed max-w-sm">
              <Zap size={40} color="#FF6900" style={{ marginBottom: 20 }} />
              <Text className="text-lg font-bold text-gray-900 dark:text-white text-center mb-2">Messaging Locked</Text>
              <Text className="text-gray-500 dark:text-gray-400 text-center text-xs mb-6 leading-5">
                Advanced messaging features are not included in your current subscription plan.
              </Text>
              <AddonRequestButton onPress={() => { /* Handle request */ }} />
            </View>
          </View>
        }
      >
        <DirectChatView
          allowedContactRoles={["teacher", "parent", "admin", "master_admin", "school_admin", "platform_admin"]}
          searchPlaceholder="Search stakeholders..."
          emptyListTitle="No secure threads"
          externalComposeToken={directChatComposeToken}
        />
      </SubscriptionGate>
    </View>
  );
}
