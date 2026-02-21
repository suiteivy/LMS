import { UnifiedHeader } from "@/components/common/UnifiedHeader";
import { router } from "expo-router";
import { CheckCircle2, ChevronRight, Mail, MessageCircle, Plus, Search, Send, UserCircle } from "lucide-react-native";
import React, { useState } from "react";
import { ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";

// ── Dummy Data ───────────────────────────────────────────────────────────────
const DUMMY_CONTACTS = [
  { id: "t1", full_name: "Mr. James Otieno", role: "teacher" },
  { id: "t2", full_name: "Mrs. Amina Wangari", role: "teacher" },
  { id: "t3", full_name: "Mr. Peter Kamau", role: "teacher" },
  { id: "a1", full_name: "Admin Office", role: "admin" },
  { id: "a2", full_name: "Mrs. Josephine Waweru", role: "principal" },
];

const DUMMY_INBOX = [
  {
    id: "m1", is_read: false,
    subject: "Ethan's Progress — Mathematics",
    content: "Dear Parent, I wanted to reach out regarding Ethan's excellent performance in last week's algebra test. He scored 88/100 and is among the top students in class. Keep encouraging him!",
    sender: { full_name: "Mr. James Otieno", role: "teacher" },
    created_at: "2026-02-18T10:30:00Z",
  },
  {
    id: "m2", is_read: true,
    subject: "Parent-Teacher Day Reminder",
    content: "This is a reminder that the Parent-Teacher Conference is scheduled for February 28th, 2026. Please confirm your attendance via the school portal or contact the admin office.",
    sender: { full_name: "Admin Office", role: "admin" },
    created_at: "2026-02-15T08:00:00Z",
  },
  {
    id: "m3", is_read: true,
    subject: "Aisha's Attendance Note",
    content: "We noted that Aisha was absent on February 13th without prior notification. Kindly send a written excuse note or contact the class teacher at your earliest convenience.",
    sender: { full_name: "Mrs. Amina Wangari", role: "teacher" },
    created_at: "2026-02-14T09:15:00Z",
  },
];

const DUMMY_SENT = [
  {
    id: "s1", is_read: true,
    subject: "Question about Ethan's homework",
    content: "Good morning Mr. Otieno, I wanted to ask about the mathematics homework assigned last Friday. Ethan seems to be struggling with the second set of problems. Could you provide some guidance?",
    receiver: { full_name: "Mr. James Otieno", role: "teacher" },
    created_at: "2026-02-16T07:45:00Z",
  },
  {
    id: "s2", is_read: true,
    subject: "Confirming PT Conference",
    content: "Hello, I'm writing to confirm my attendance at the Parent-Teacher Conference on February 28th. I'll be available from 9 AM to 11 AM. Thank you.",
    receiver: { full_name: "Admin Office", role: "admin" },
    created_at: "2026-02-15T12:00:00Z",
  },
];

const formatTime = (dateStr: string) => {
  const d = new Date(dateStr);
  const diff = Date.now() - d.getTime();
  if (diff < 86400000) return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

type Screen = "list" | "view" | "compose";

export default function ParentMessagingPage() {
  const [activeTab, setActiveTab] = useState<"inbox" | "sent">("inbox");
  const [screen, setScreen] = useState<Screen>("list");
  const [viewItem, setViewItem] = useState<any>(null);
  const [sentSuccess, setSentSuccess] = useState(false);

  const [inbox, setInbox] = useState(DUMMY_INBOX);
  const [sent, setSent] = useState(DUMMY_SENT);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedReceiver, setSelectedReceiver] = useState<any>(null);
  const [messageContent, setMessageContent] = useState("");

  const filteredContacts = DUMMY_CONTACTS.filter((c) =>
    c.full_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSendMessage = () => {
    if (!selectedReceiver || !messageContent.trim()) return;
    setSent((prev) => [
      {
        id: `s${Date.now()}`, is_read: true,
        subject: `Message to ${selectedReceiver.full_name}`,
        content: messageContent.trim(),
        receiver: selectedReceiver,
        created_at: new Date().toISOString(),
      },
      ...prev,
    ]);
    setScreen("list");
    setMessageContent("");
    setSelectedReceiver(null);
    setSearchQuery("");
    setSentSuccess(true);
    setTimeout(() => setSentSuccess(false), 3000);
  };

  const markRead = (id: string) =>
    setInbox((prev) => prev.map((m) => (m.id === id ? { ...m, is_read: true } : m)));

  const messages = activeTab === "inbox" ? inbox : sent;
  const unreadCount = inbox.filter((m) => !m.is_read).length;

  return (
    <View className="flex-1 bg-gray-50 dark:bg-black">
      <UnifiedHeader
        title="Intelligence"
        subtitle="Secure Inbox"
        role="Parent"
        showNotification={false}
        onBack={screen !== "list" ? () => { setScreen("list"); setViewItem(null); } : () => router.back()}
      />

      {screen === "view" && viewItem ? (
        <View className="flex-1">
          <View className="p-8 bg-white dark:bg-[#1a1a1a] border-b border-gray-50 dark:border-gray-800 flex-row items-center mb-4">
            <View className="w-14 h-14 rounded-2xl bg-orange-50 dark:bg-orange-950/20 items-center justify-center mr-4">
              <Mail size={24} color="#FF6900" />
            </View>
            <View className="flex-1">
              <Text className="text-gray-900 dark:text-white font-bold text-lg tracking-tight">{viewItem.subject}</Text>
              <Text className="text-gray-400 dark:text-gray-500 text-[10px] font-bold uppercase tracking-widest mt-1">
                {activeTab === "inbox" ? `Sender: ${viewItem.sender.full_name}` : `Recipient: ${viewItem.receiver.full_name}`}
              </Text>
            </View>
          </View>
          <ScrollView className="flex-1 p-8">
            <Text className="text-gray-600 dark:text-gray-400 font-medium text-base leading-7">{viewItem.content}</Text>
          </ScrollView>
        </View>
      ) : screen === "compose" ? (
        <View className="flex-1">
          <ScrollView className="flex-1 p-8" keyboardShouldPersistTaps="handled">
            <Text className="text-gray-900 dark:text-white font-bold text-3xl tracking-tighter mb-8">Drafting...</Text>

            {!selectedReceiver ? (
              <View className="bg-white dark:bg-[#1a1a1a] p-6 rounded-[32px] border border-gray-50 dark:border-gray-800 shadow-sm mb-8">
                <View className="flex-row items-center bg-gray-50 dark:bg-gray-800 px-4 py-3 rounded-2xl mb-4 border border-gray-100 dark:border-gray-700">
                  <Search size={18} color="#9CA3AF" />
                  <TextInput
                    className="flex-1 ml-3 text-gray-900 dark:text-white font-bold text-xs uppercase tracking-widest"
                    placeholder="Search stakeholders..."
                    placeholderTextColor="#9CA3AF"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                  />
                </View>
                {filteredContacts.map((item) => (
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
                ))}
              </View>
            ) : (
              <View className="bg-gray-900 dark:bg-[#1a1a1a] p-8 rounded-[40px] mb-8 shadow-xl">
                <View className="flex-row items-center justify-between mb-8">
                  <View className="flex-row items-center">
                    <View className="bg-white/10 dark:bg-black/20 p-4 rounded-3xl">
                      <UserCircle size={24} color="white" />
                    </View>
                    <View className="ml-4">
                      <Text className="text-white font-bold text-lg tracking-tight">{selectedReceiver.full_name}</Text>
                      <Text className="text-[#FF6900] text-[10px] font-bold uppercase tracking-widest mt-0.5">{selectedReceiver.role}</Text>
                    </View>
                  </View>
                  <TouchableOpacity onPress={() => setSelectedReceiver(null)} className="bg-white/10 dark:bg-black/20 px-4 py-2 rounded-xl">
                    <Text className="text-white text-[10px] font-bold uppercase">Change</Text>
                  </TouchableOpacity>
                </View>

                <View className="bg-white dark:bg-gray-900 rounded-[32px] p-6 shadow-inner" style={{ minHeight: 250 }}>
                  <TextInput
                    className="text-gray-900 dark:text-white text-base font-medium"
                    placeholder="Compose secure transmission..."
                    placeholderTextColor="#9CA3AF"
                    multiline
                    textAlignVertical="top"
                    value={messageContent}
                    onChangeText={setMessageContent}
                    style={{ flex: 1 }}
                  />
                </View>

                <TouchableOpacity
                  className="mt-8 py-5 rounded-[32px] flex-row justify-center items-center shadow-2xl active:bg-orange-600"
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
                className="bg-gray-900 dark:bg-[#FF6900] w-12 h-12 rounded-2xl items-center justify-center shadow-lg active:bg-gray-800"
              >
                <Plus size={24} color="white" />
              </TouchableOpacity>
            </View>

            <View className="flex-row bg-white dark:bg-[#1a1a1a] p-1.5 rounded-[24px] border border-gray-100 dark:border-gray-800 shadow-sm mb-10">
              {(["inbox", "sent"] as const).map((tab) => (
                <TouchableOpacity
                  key={tab}
                  className={`flex-1 py-3.5 rounded-2xl items-center ${activeTab === tab ? 'bg-[#FF6900]' : ''}`}
                  onPress={() => setActiveTab(tab)}
                >
                  <Text className={`text-xs font-bold uppercase tracking-widest ${activeTab === tab ? 'text-white' : 'text-gray-400 dark:text-gray-500'}`}>
                    {tab === "inbox" && unreadCount > 0 ? `Inbox (${unreadCount})` : tab}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {sentSuccess && (
            <View className="mx-8 mb-6 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900 p-4 rounded-2xl flex-row items-center">
              <CheckCircle2 size={18} color="#10B981" />
              <Text className="text-emerald-700 dark:text-emerald-400 font-bold text-xs uppercase tracking-widest ml-3">Transmission Successful</Text>
            </View>
          )}

          <ScrollView className="flex-1 px-8" showsVerticalScrollIndicator={false}>
            {messages.length === 0 ? (
              <View className="items-center py-20 bg-white dark:bg-[#1a1a1a] rounded-[48px] border border-dashed border-gray-100 dark:border-gray-800">
                <MessageCircle size={64} color="#E5E7EB" style={{ opacity: 0.2 }} />
                <Text className="text-gray-400 dark:text-gray-500 font-bold mt-4 uppercase tracking-widest text-xs">No Secure Threads</Text>
              </View>
            ) : (
              messages.map((item: any) => {
                const other = activeTab === "inbox" ? item.sender : item.receiver;
                const unread = !item.is_read && activeTab === "inbox";
                return (
                  <TouchableOpacity
                    key={item.id}
                    activeOpacity={0.7}
                    className={`flex-row items-center p-6 mb-4 rounded-[32px] border shadow-sm ${unread ? 'border-orange-100 bg-orange-50/20 dark:border-orange-900/30 dark:bg-orange-950/10' : 'bg-white dark:bg-[#1a1a1a] border-gray-50 dark:border-gray-800'}`}
                    onPress={() => {
                      if (unread) markRead(item.id);
                      setViewItem(item);
                      setScreen("view");
                    }}
                  >
                    <View className={`w-14 h-14 rounded-2xl items-center justify-center mr-4 ${unread ? 'bg-orange-100 dark:bg-orange-900/40' : 'bg-gray-50 dark:bg-gray-800'}`}>
                      <UserCircle size={24} color={unread ? "#FF6900" : "#9CA3AF"} />
                    </View>
                    <View className="flex-1">
                      <View className="flex-row justify-between items-center mb-1">
                        <Text className="text-gray-900 dark:text-white font-bold text-base tracking-tight" numberOfLines={1}>{other?.full_name}</Text>
                        <Text className="text-gray-400 dark:text-gray-500 text-[10px] font-bold uppercase tracking-widest">{formatTime(item.created_at)}</Text>
                      </View>
                      <Text className="text-gray-700 dark:text-gray-400 text-xs font-bold tracking-tight mb-0.5" numberOfLines={1}>{item.subject}</Text>
                      <Text className="text-gray-400 dark:text-gray-500 text-[10px] font-medium" numberOfLines={1}>{item.content}</Text>
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
