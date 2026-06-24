import { UnifiedHeader } from "@/components/common/UnifiedHeader";
import { DirectChatView } from "@/components/chat/DirectChatView";
import { router } from "expo-router";
import React from "react";
import { View } from "react-native";

export default function ParentMessagingPage() {
  return (
    <View className="flex-1 bg-gray-50 dark:bg-navy">
      <UnifiedHeader
        title="Messaging"
        subtitle="Secure Inbox"
        role="Parent/Guardian"
        showNotification={false}
        onBack={() => router.back()}
      />

      <DirectChatView
        allowedContactRoles={["teacher", "admin", "master_admin", "school_admin", "platform_admin"]}
        searchPlaceholder="Search school contacts..."
        emptyListTitle="No conversations yet"
        compact
      />
    </View>
  );
}
