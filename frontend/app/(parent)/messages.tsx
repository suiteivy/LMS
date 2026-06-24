import { UnifiedHeader } from "@/components/common/UnifiedHeader";
import { MessageService } from "@/services/MessageService";
import { useAuth } from "@/contexts/AuthContext";
import Toast from 'react-native-toast-message';
import { router } from "expo-router";
import { CheckCircle2, ChevronRight, Mail, MessageCircle, Plus, Search, Send, UserCircle } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useColorScheme } from "nativewind";

const formatTime = (dateStr: string) => {
  const d = new Date(dateStr);
  const diff = Date.now() - d.getTime();
  if (diff < 86400000) return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

type Screen = "list" | "view" | "compose";

export default function ParentMessagingPage() {
  const { isDemo } = useAuth();
  const [activeTab, setActiveTab] = useState<"inbox" | "sent">("inbox");
  const [screen, setScreen] = useState<Screen>("list");
  const [viewItem, setViewItem] = useState<any>(null);
  const [sentSuccess, setSentSuccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { colorScheme } = useColorScheme();
  const [filter, setFilter] = useState<"all" | "unread" | "read">("all");

  const [inbox, setInbox] = useState<any[]>([]);
  const [sent, setSent] = useState<any[]>([]);

  const [searchQuery, setSearchQuery] = useState("");
  const [contacts, setContacts] = useState<any[]>([]);
  const [initialContacts, setInitialContacts] = useState<any[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [selectedReceiver, setSelectedReceiver] = useState<any>(null);
  const [messageContent, setMessageContent] = useState("");

  const fetchInitialContacts = async () => {
    try {
      setLoadingContacts(true);
      const [admins, teachers] = await Promise.all([
        MessageService.searchUsers('', 'admin'),
        MessageService.searchUsers('', 'teacher')
      ]);
      const combined = [...(admins || []), ...(teachers || [])];
      setInitialContacts(combined);
      setContacts(combined);
    } catch (error) {
      console.error("Error fetching initial contacts:", error);
    } finally {
      setLoadingContacts(false);
    }
  };

  const fetchData = async () => {
    try {
      const [inboxRes, sentRes] = await Promise.all([
        MessageService.getMessages('inbox'),
        MessageService.getMessages('sent')
      ]);
      setInbox(inboxRes || []);
      setSent(sentRes || []);
    } catch (error) {
      console.error("Error fetching messages:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    fetchInitialContacts();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  useEffect(() => {
    const searchContacts = async () => {
      const query = searchQuery.trim();
      if (query === "") {
        setContacts(initialContacts);
        return;
      }
      try {
        const res = await MessageService.searchUsers(query);
        // Only show admins and teachers
        const filtered = (res || []).filter((u: any) => u.role === 'admin' || u.role === 'teacher');
        setContacts(filtered);
      } catch (error) {
        console.error("Error searching users:", error);
      }
    };
    searchContacts();
  }, [searchQuery, initialContacts]);

  const handleSendMessage = async () => {
    if (!selectedReceiver || !messageContent.trim()) return;
    if (isDemo) {
      const mockNewMsg = {
        id: Math.random().toString(),
        sender_id: 'parent-1',
        receiver_id: selectedReceiver.id,
        subject: `Message to ${selectedReceiver.full_name}`,
        content: messageContent.trim(),
        created_at: new Date().toISOString(),
        is_read: false,
        receiver: selectedReceiver,
        sender: { full_name: 'Demo Parent' }
      };
      setSent(prev => [mockNewMsg, ...prev]);
      setSentSuccess(true);
      setScreen("list");
      setMessageContent("");
      setSelectedReceiver(null);
      setSearchQuery("");
      Toast.show({
        type: 'success',
        text1: 'Done',
        text2: 'Changes saved.'
      });
      setTimeout(() => setSentSuccess(false), 3000);
      return;
    }
    try {
      setLoading(true);
      await MessageService.sendMessage(selectedReceiver.id, messageContent.trim(), `Message to ${selectedReceiver.full_name}`);
      setSentSuccess(true);
      setScreen("list");
      setMessageContent("");
      setSelectedReceiver(null);
      setSearchQuery("");
      fetchData();
      setTimeout(() => setSentSuccess(false), 3000);
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setLoading(false);
    }
  };

  const markRead = async (id: string) => {
    if (isDemo) {
      setInbox((prev) => prev.map((m) => (m.id === id ? { ...m, is_read: true } : m)));
      Toast.show({
        type: 'success',
        text1: 'Done',
        text2: 'Changes saved.'
      });
      return;
    }
    try {
      await MessageService.markAsRead(id);
      setInbox((prev) => prev.map((m) => (m.id === id ? { ...m, is_read: true } : m)));
    } catch (error) {
      console.error("Error marking as read:", error);
    }
  };

  let messages = activeTab === "inbox" ? inbox : sent;
  if (filter === "unread") messages = messages.filter((m) => !m.is_read);
  else if (filter === "read") messages = messages.filter((m) => m.is_read);

  const unreadCount = inbox.filter((m) => !m.is_read).length;

  if (loading && !refreshing && screen === "list") {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50 dark:bg-navy">
        <ActivityIndicator size="large" color="#FF6900" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50 dark:bg-navy">
      <UnifiedHeader
        title="Messaging"
        subtitle="Secure Inbox"
        role="Parent/Guardian"
        showNotification={false}
        onBack={screen !== "list" ? () => { setScreen("list"); setViewItem(null); } : () => router.back()}
      />

      {screen === "view" && viewItem ? (
        <View className="flex-1">
          <View className="p-8 bg-[#FFFFFF] dark:bg-[#0D1117] border-b border-[#D0D7DE] dark:border-[#21262D] flex-row items-center mb-4">
            <View className="w-14 h-14 rounded-xl bg-orange-50 dark:bg-orange-950/20 items-center justify-center mr-4">
              <Mail size={24} color="#FF6900" />
            </View>
            <View className="flex-1">
              <Text className="text-gray-900 dark:text-white font-bold text-lg tracking-tight">{viewItem.subject}</Text>
              <Text className="text-gray-500 dark:text-gray-400 text-[10px] font-bold uppercase tracking-widest mt-1">
                {activeTab === "inbox" ? `Sender: ${viewItem.sender.full_name}` : `Recipient: ${viewItem.receiver.full_name}`}
              </Text>
            </View>
          </View>
          <ScrollView className="flex-1 p-8">
            {viewItem.content.includes("--- Original Message ---") ? (
              <View>
                <Text className="text-gray-600 dark:text-gray-400 font-medium text-base leading-7">
                  {viewItem.content.split("--- Original Message ---")[0]}
                </Text>
                <View className="mt-6 p-4 bg-gray-50 dark:bg-gray-800/30 rounded-xl border-l-4 border-[#FF6900]/50">
                  <Text className="text-gray-500 dark:text-gray-400 font-medium text-sm leading-6">
                    {viewItem.content.split("--- Original Message ---").slice(1).join("--- Original Message ---").trim()}
                  </Text>
                </View>
              </View>
            ) : (
              <Text className="text-gray-600 dark:text-gray-400 font-medium text-base leading-7">{viewItem.content}</Text>
            )}
          </ScrollView>
          {activeTab === "inbox" && (
            <View className="p-8 pb-12 bg-[#FFFFFF] dark:bg-[#0D1117] border-t border-[#D0D7DE] dark:border-[#21262D]">
              <TouchableOpacity 
                className="py-4 bg-[#FF6900] rounded-xl flex-row justify-center items-center shadow-lg active:bg-orange-600"
                onPress={() => {
                  setSelectedReceiver(viewItem.sender);
                  setMessageContent(`\n\n--- Original Message ---\n${viewItem.content}`);
                  setScreen("compose");
                }}
              >
                <Text className="text-white font-bold text-base tracking-tight mr-2">Reply</Text>
                <Send size={18} color="white" />
              </TouchableOpacity>
            </View>
          )}
        </View>
      ) : screen === "compose" ? (
        <View className="flex-1">
          <ScrollView className="flex-1 p-8" keyboardShouldPersistTaps="handled">
            <Text className="text-gray-900 dark:text-white font-bold text-3xl tracking-tighter mb-8">Drafting...</Text>

            {!selectedReceiver ? (
              <View className="bg-[#FFFFFF] dark:bg-[#0D1117] p-6 rounded-xl border border-[#D0D7DE] dark:border-[#21262D] shadow-sm mb-8">
                <View className="flex-row items-center bg-gray-100 dark:bg-gray-800 px-4 py-3 rounded-xl mb-4 border border-[#D0D7DE] dark:border-[#21262D]">
                  <Search size={18} color="#9CA3AF" />
                  <TextInput
                    className="flex-1 ml-3 font-bold text-xs uppercase tracking-widest text-gray-900 dark:text-white"
                    placeholder="Search stakeholders..."
                    placeholderTextColor={colorScheme === 'dark' ? '#9CA3AF' : '#6B7280'}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    cursorColor="#FF6900"
                    selectionColor="#FF6900"
                  />
                </View>
                {loadingContacts ? (
                  <ActivityIndicator size="small" color="#FF6900" className="py-4" />
                ) : contacts.length === 0 ? (
                  <View className="items-center py-8">
                    <Text className="text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest text-[9px] text-center">No matches found</Text>
                  </View>
                ) : (
                  contacts.map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      className="flex-row items-center p-4 mb-2 bg-gray-50/50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-800"
                      onPress={() => { setSelectedReceiver(item); setSearchQuery(""); }}
                    >
                      <View className="bg-white dark:bg-gray-900 p-2 rounded-xl border border-gray-100 dark:border-gray-800 mr-3">
                        <UserCircle size={20} color="#FF6900" />
                      </View>
                      <View>
                        <Text className="text-gray-900 dark:text-white font-bold text-sm">{item.full_name}</Text>
                        <Text className="text-gray-400 dark:text-gray-500 text-[8px] font-bold uppercase tracking-widest">{item.role}</Text>
                      </View>
                    </TouchableOpacity>
                  ))
                )}
              </View>
            ) : (
              <View className="bg-gray-900 dark:bg-[#1a1a1a] p-8 rounded-xl mb-8 shadow-xl">
                <View className="flex-row items-center justify-between mb-8">
                  <View className="flex-row items-center">
                    <View className="bg-white/10 dark:bg-navy/20 p-4 rounded-xl">
                      <UserCircle size={24} color="white" />
                    </View>
                    <View className="ml-4">
                      <Text className="text-white font-bold text-lg tracking-tight">{selectedReceiver.full_name}</Text>
                      <Text className="text-[#FF6900] text-[10px] font-bold uppercase tracking-widest mt-0.5">{selectedReceiver.role}</Text>
                    </View>
                  </View>
                  <TouchableOpacity onPress={() => setSelectedReceiver(null)} className="bg-white/10 dark:bg-navy/20 px-4 py-2 rounded-xl">
                    <Text className="text-white text-[10px] font-bold uppercase">Change</Text>
                  </TouchableOpacity>
                </View>

                <View className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-inner" style={{ minHeight: 250 }}>
                  <TextInput
                    className="text-gray-900 dark:text-white text-base font-medium"
                    placeholder="Compose secure transmission..."
                    placeholderTextColor="#9CA3AF"
                    multiline
                    textAlignVertical="top"
                    value={messageContent}
                    onChangeText={setMessageContent}
                    style={{ flex: 1 }}
                    cursorColor="#FF6900"
                    selectionColor="#FF6900"
                  />
                </View>

                <TouchableOpacity
                  className="mt-8 py-5 rounded-xl flex-row justify-center items-center shadow-2xl active:bg-orange-600"
                  style={{ backgroundColor: !messageContent.trim() ? "#374151" : "#FF6900" }}
                  onPress={handleSendMessage}
                  disabled={!messageContent.trim()}
                >
                  <Text className="text-white font-bold text-lg tracking-tight mr-3">Send Securely</Text>
                  <Send size={20} color="white" />
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      ) : (
        <View className="flex-1">
          <View className="px-8 pt-8">
            <View className="flex-row items-center justify-between mb-8 px-2">
              <Text className="text-gray-900 dark:text-white font-bold text-3xl tracking-tighter">Communications</Text>
              <TouchableOpacity
                onPress={() => setScreen("compose")}
                className="bg-gray-900 dark:bg-[#FF6900] w-12 h-12 rounded-xl items-center justify-center shadow-lg active:bg-gray-800"
              >
                <Plus size={24} color="white" />
              </TouchableOpacity>
            </View>

            <View className={`flex-row bg-[#FFFFFF] dark:bg-[#0D1117] p-1.5 rounded-[24px] border border-[#D0D7DE] dark:border-[#21262D] shadow-sm ${activeTab === "inbox" ? "mb-6" : "mb-10"}`}>
              {(["inbox", "sent"] as const).map((tab) => (
                <TouchableOpacity
                  key={tab}
                  className={`flex-1 py-3.5 rounded-xl items-center ${activeTab === tab ? 'bg-[#FF6900]' : ''}`}
                  onPress={() => {
                    setActiveTab(tab);
                    setFilter("all");
                  }}
                >
                  <Text className={`text-xs font-bold uppercase tracking-widest ${activeTab === tab ? 'text-white' : 'text-gray-500 dark:text-gray-400'}`}>
                    {tab === "inbox" && unreadCount > 0 ? `Inbox (${unreadCount})` : tab}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {activeTab === "inbox" && (
              <View className="flex-row items-center mb-6">
                {(["all", "unread", "read"] as const).map((f) => (
                  <TouchableOpacity
                    key={f}
                    onPress={() => setFilter(f)}
                    className={`px-4 py-2 rounded-full mr-2 border ${filter === f ? 'bg-gray-900 border-gray-900 dark:bg-white dark:border-white' : 'bg-transparent border-[#D0D7DE] dark:border-[#21262D]'}`}
                  >
                    <Text className={`text-xs font-bold capitalize ${filter === f ? 'text-white dark:text-black' : 'text-gray-600 dark:text-gray-400'}`}>
                      {f}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {sentSuccess && (
            <View className="mx-8 mb-6 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900 p-4 rounded-xl flex-row items-center">
              <CheckCircle2 size={18} color="#10B981" />
              <Text className="text-emerald-700 dark:text-emerald-400 font-bold text-xs uppercase tracking-widest ml-3">Transmission Successful</Text>
            </View>
          )}

          <ScrollView
            className="flex-1 px-8"
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#FF6900"]} tintColor="#FF6900" />
            }
          >
            {messages.length === 0 ? (
              <View className="items-center py-20 bg-[#FFFFFF] dark:bg-[#0D1117] rounded-xl border border-dashed border-[#D0D7DE] dark:border-[#21262D]">
                <MessageCircle size={64} color="#E5E7EB" style={{ opacity: 0.2 }} />
                <Text className="text-gray-500 dark:text-gray-400 font-bold mt-4 uppercase tracking-widest text-xs">No Secure Threads</Text>
              </View>
            ) : (
              messages.map((item: any) => {
                const other = activeTab === "inbox" ? item.sender : item.receiver;
                const unread = !item.is_read && activeTab === "inbox";
                return (
                  <TouchableOpacity
                    key={item.id}
                    activeOpacity={0.7}
                    className={`flex-row items-center p-6 mb-4 rounded-xl border shadow-sm ${unread ? 'border-orange-100 bg-orange-50/20 dark:border-orange-900/30 dark:bg-orange-950/10' : 'bg-[#FFFFFF] dark:bg-[#0D1117] border-[#D0D7DE] dark:border-[#21262D]'}`}
                    onPress={() => {
                      if (unread) markRead(item.id);
                      setViewItem(item);
                      setScreen("view");
                    }}
                  >
                    <View className={`w-14 h-14 rounded-xl items-center justify-center mr-4 ${unread ? 'bg-orange-100 dark:bg-orange-900/40' : 'bg-gray-50 dark:bg-gray-800'}`}>
                      <UserCircle size={24} color={unread ? "#FF6900" : "#9CA3AF"} />
                    </View>
                    <View className="flex-1">
                      <View className="flex-row justify-between items-center mb-1">
                        <Text className="text-gray-900 dark:text-white font-bold text-base tracking-tight" numberOfLines={1}>{other?.full_name}</Text>
                        <Text className="text-gray-500 dark:text-gray-400 text-[10px] font-bold uppercase tracking-widest">{formatTime(item.created_at)}</Text>
                      </View>
                      <Text className="text-gray-700 dark:text-gray-400 text-xs font-bold tracking-tight mb-0.5" numberOfLines={1}>{item.subject}</Text>
                      <Text className="text-gray-500 dark:text-gray-400 text-[10px] font-medium" numberOfLines={1}>{item.content}</Text>
                    </View>
                    {unread ? <View className="w-2 h-2 rounded-full bg-[#FF6900] ml-3" /> : <ChevronRight size={14} color="#E5E7EB" className="ml-2" />}
                  </TouchableOpacity>
                );
              })
            )}
            <View className="h-24" />
          </ScrollView>
        </View>
      )}
    </View>
  );
}