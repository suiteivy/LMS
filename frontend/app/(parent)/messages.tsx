import { CheckCircle2, MessageCircle, Plus, Search, Send, UserCircle, X } from "lucide-react-native";
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
// ────────────────────────────────────────────────────────────────────────────

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

  // ── View Message screen ──────────────────────────────────────────────────
  if (screen === "view" && viewItem) {
    const other = activeTab === "inbox" ? viewItem.sender : viewItem.receiver;
    return (
      <View className="flex-1 bg-gray-50">
        <View className="bg-white px-6 pt-12 pb-6 border-b border-gray-100 flex-row items-center">
          <TouchableOpacity onPress={() => { setViewItem(null); setScreen("list"); }} className="bg-gray-100 p-2 rounded-full mr-4">
            <X size={20} color="#374151" />
          </TouchableOpacity>
          <View className="flex-1">
            <Text className="text-gray-900 font-bold text-base" numberOfLines={1}>{viewItem.subject}</Text>
            <Text className="text-gray-400 text-xs capitalize">{activeTab === "inbox" ? "From" : "To"}: {other?.full_name}</Text>
          </View>
        </View>
        <ScrollView className="flex-1 p-6">
          <Text className="text-gray-700 leading-7 text-base">{viewItem.content}</Text>
        </ScrollView>
      </View>
    );
  }

  // ── Compose screen ───────────────────────────────────────────────────────
  if (screen === "compose") {
    return (
      <View className="flex-1 bg-white">
        <View className="bg-white px-6 pt-12 pb-6 border-b border-gray-100 flex-row items-center justify-between">
          <Text className="text-2xl font-bold text-gray-900">New Message</Text>
          <TouchableOpacity onPress={() => { setScreen("list"); setSelectedReceiver(null); setMessageContent(""); setSearchQuery(""); }} className="bg-gray-100 p-2 rounded-full">
            <X size={20} color="#374151" />
          </TouchableOpacity>
        </View>

        <ScrollView className="flex-1 px-6 pt-6" keyboardShouldPersistTaps="handled">
          {/* Recipient picker */}
          {!selectedReceiver ? (
            <View>
              <Text className="text-gray-500 font-semibold mb-3 text-sm uppercase tracking-wide">To</Text>
              <View className="flex-row items-center bg-gray-100 px-4 py-3 rounded-2xl mb-4">
                <Search size={18} color="#9CA3AF" />
                <TextInput
                  className="flex-1 ml-3 text-gray-900"
                  placeholder="Search teacher or admin..."
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
              </View>
              {filteredContacts.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  className="flex-row items-center p-3 mb-2 bg-gray-50 rounded-2xl"
                  onPress={() => { setSelectedReceiver(item); setSearchQuery(""); }}
                >
                  <View className="bg-gray-200 p-2 rounded-xl mr-3">
                    <UserCircle size={20} color="#6B7280" />
                  </View>
                  <View>
                    <Text className="text-gray-900 font-bold">{item.full_name}</Text>
                    <Text className="text-gray-400 text-xs capitalize">{item.role}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View>
              <View className="flex-row items-center bg-orange-50 p-4 rounded-2xl mb-6 border border-orange-100">
                <View className="bg-orange-200 p-2 rounded-xl mr-3">
                  <UserCircle size={20} color="#FF6B00" />
                </View>
                <View className="flex-1">
                  <Text className="text-gray-900 font-bold">{selectedReceiver.full_name}</Text>
                  <Text className="text-orange-600 text-xs capitalize">{selectedReceiver.role}</Text>
                </View>
                <TouchableOpacity onPress={() => setSelectedReceiver(null)}>
                  <Text className="text-gray-400 font-semibold">Change</Text>
                </TouchableOpacity>
              </View>

              <Text className="text-gray-500 font-semibold mb-3 text-sm uppercase tracking-wide">Message</Text>
              <TextInput
                className="bg-gray-50 p-5 rounded-3xl text-gray-900 text-base border border-gray-100"
                placeholder="Type your message here..."
                multiline
                numberOfLines={8}
                textAlignVertical="top"
                value={messageContent}
                onChangeText={setMessageContent}
                style={{ minHeight: 180 }}
              />

              <TouchableOpacity
                className="mt-6 py-4 rounded-2xl flex-row justify-center items-center"
                style={{ backgroundColor: !messageContent.trim() ? "#e5e7eb" : "#FF6B00" }}
                onPress={handleSendMessage}
                disabled={!messageContent.trim()}
              >
                <Text className={`font-bold text-lg mr-2 ${!messageContent.trim() ? "text-gray-400" : "text-white"}`}>Send Message</Text>
                <Send size={20} color={!messageContent.trim() ? "#9CA3AF" : "white"} />
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </View>
    );
  }

  // ── Message list screen (default) ────────────────────────────────────────
  return (
    <View className="flex-1 bg-gray-50">
      <View className="bg-white px-6 pt-12 pb-6 border-b border-gray-100">
        <View className="flex-row items-center justify-between mb-6">
          <Text className="text-2xl font-bold text-gray-900">Messages</Text>
          <TouchableOpacity onPress={() => setScreen("compose")} className="bg-[#FF6B00] p-3 rounded-full">
            <Plus size={22} color="white" />
          </TouchableOpacity>
        </View>

        <View className="flex-row bg-gray-100 p-1 rounded-2xl">
          {(["inbox", "sent"] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              className="flex-1 py-3 rounded-xl items-center"
              style={activeTab === tab ? { backgroundColor: "#ffffff", shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2 } : {}}
              onPress={() => setActiveTab(tab)}
            >
              <Text 
                className="font-bold capitalize"
                style={{ color: activeTab === tab ? "#FF6B00" : "#6b7280" }}
              >
                {tab === "inbox" && unreadCount > 0 ? `Inbox (${unreadCount})` : tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {sentSuccess && (
        <View className="mx-6 mt-4 bg-emerald-50 border border-emerald-200 p-4 rounded-2xl flex-row items-center">
          <CheckCircle2 size={18} color="#10B981" />
          <Text className="text-emerald-700 font-semibold ml-2">Message sent successfully!</Text>
        </View>
      )}

      <ScrollView className="flex-1 px-6 pt-4">
        {messages.length === 0 ? (
          <View className="items-center py-20">
            <MessageCircle size={64} color="#E5E7EB" />
            <Text className="text-gray-400 mt-4 text-lg">No messages yet</Text>
          </View>
        ) : (
          messages.map((item: any) => {
            const other = activeTab === "inbox" ? item.sender : item.receiver;
            const unread = !item.is_read && activeTab === "inbox";
            return (
              <TouchableOpacity
                key={item.id}
                className="flex-row items-center p-4 mb-3 rounded-3xl border"
                style={unread ? { borderColor: "#fed7aa", backgroundColor: "#fff7ed" } : { backgroundColor: "#ffffff", borderColor: "#f3f4f6" }}
                onPress={() => {
                  if (unread) markRead(item.id);
                  setViewItem(item);
                  setScreen("view");
                }}
              >
                <View className="bg-gray-100 p-3 rounded-2xl mr-4">
                  <UserCircle size={24} color="#6B7280" />
                </View>
                <View className="flex-1">
                  <View className="flex-row justify-between items-center mb-1">
                    <Text className="text-gray-900 font-bold" numberOfLines={1}>{other?.full_name}</Text>
                    <Text className="text-gray-400 text-xs">{formatTime(item.created_at)}</Text>
                  </View>
                  <Text className="text-gray-700 text-sm font-semibold" numberOfLines={1}>{item.subject}</Text>
                  <Text className="text-gray-400 text-xs" numberOfLines={1}>{item.content}</Text>
                </View>
                {unread && <View className="w-2.5 h-2.5 rounded-full bg-orange-500 ml-2" />}
              </TouchableOpacity>
            );
          })
        )}
        <View className="h-24" />
      </ScrollView>
    </View>
  );
}
