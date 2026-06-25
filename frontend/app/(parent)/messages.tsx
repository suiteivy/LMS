import { UnifiedHeader } from "@/components/common/UnifiedHeader";
import { DirectChatView } from "@/components/chat/DirectChatView";
import { router } from "expo-router";
import { Plus } from "lucide-react-native";
import React from "react";
import { TouchableOpacity, View } from "react-native";

export default function ParentMessagingPage() {
  const [directChatComposeToken, setDirectChatComposeToken] = React.useState(0);

  return (
    <View className="flex-1 bg-gray-50 dark:bg-[#0D1117]">
      <UnifiedHeader
        title="Messaging"
        subtitle="Secure Inbox"
        role="Parent/Guardian"
        showNotification={false}
        onBack={() => router.back()}
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

      <DirectChatView
        allowedContactRoles={["teacher", "admin", "master_admin", "school_admin", "platform_admin"]}
        searchPlaceholder="Search school contacts..."
        emptyListTitle="No conversations yet"
        compact
        externalComposeToken={directChatComposeToken}
      />
    </View>
  );
}