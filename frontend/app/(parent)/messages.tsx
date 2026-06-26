import { UnifiedHeader } from "@/components/common/UnifiedHeader";
import { DirectChatView } from "@/components/chat/DirectChatView";
import { router } from "expo-router";
import { Plus, RefreshCw } from "lucide-react-native";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";

export default function ParentMessagingPage() {
  const [directChatRefreshToken, setDirectChatRefreshToken] = React.useState(0);
  const [directChatComposeToken, setDirectChatComposeToken] = React.useState(0);
  const [lastChatRefreshAt, setLastChatRefreshAt] = React.useState<Date | null>(null);

  return (
    <View className="flex-1 bg-[#F6F8FA] dark:bg-[#161B22]">
      <UnifiedHeader
        title="Messaging"
        subtitle="Inbox"
        role="Parent/Guardian"
        showNotification={false}
        onBack={() => router.back()}
        rightActions={
          <View className="flex-row items-center" style={{ gap: 8 }}>
            <TouchableOpacity
              className="bg-white dark:bg-[#161B22] w-10 h-10 rounded-xl items-center justify-center border border-gray-200 dark:border-gray-700"
              onPress={() => {
                setDirectChatRefreshToken((prev) => prev + 1);
                setLastChatRefreshAt(new Date());
              }}
              accessibilityLabel="Refresh chats"
            >
              <RefreshCw size={18} color="#6B7280" />
            </TouchableOpacity>
            <TouchableOpacity
              className="bg-[#FF6900] w-10 h-10 rounded-xl items-center justify-center"
              onPress={() => setDirectChatComposeToken((prev) => prev + 1)}
              accessibilityLabel="Start new chat"
            >
              <Plus size={20} color="white" />
            </TouchableOpacity>
          </View>
        }
      />

      {lastChatRefreshAt ? (
        <View className="px-4 mt-1">
          <View className="self-start">
            <Text className="text-[9px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">
              Updated {lastChatRefreshAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </Text>
          </View>
        </View>
      ) : null}

      <DirectChatView
        allowedContactRoles={["teacher", "admin", "master_admin", "school_admin", "platform_admin"]}
        searchPlaceholder="Search school contacts..."
        emptyListTitle="No conversations yet"
        compact
        externalRefreshToken={directChatRefreshToken}
        externalComposeToken={directChatComposeToken}
      />
    </View>
  );
}
