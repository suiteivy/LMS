import { UnifiedHeader } from "@/components/common/UnifiedHeader";
import { useAuth } from "@/contexts/AuthContext";
import { MessageService } from "@/services/MessageService";
import { format } from "date-fns";
import { router } from "expo-router";
import { CheckCircle2, ChevronRight, Mail, MessageCircle, Plus, Search, Send, User, X, Zap } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, Text, TextInput, TouchableOpacity, View, RefreshControl } from "react-native";
import { SubscriptionGate, AddonRequestButton } from "@/components/shared/SubscriptionComponents";

const formatTime = (dateStr: string) => {
  const d = new Date(dateStr);
  const diff = Date.now() - d.getTime();
  if (diff < 86400000) {
    return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

type Screen = "list" | "view" | "compose";

export default function MessagingPage() {
    const [screen, setScreen] = useState<Screen>("list");
    const [activeTab, setActiveTab] = useState<'received' | 'sent'>('received');
    const [inbox, setInbox] = useState<any[]>([]);
    const [sent, setSent] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedMessage, setSelectedMessage] = useState<any>(null);
    const [sentSuccess, setSentSuccess] = useState(false);

    // Compose state
    const [contacts, setContacts] = useState<any[]>([]);
    const [initialContacts, setInitialContacts] = useState<any[]>([]);
    const [loadingContacts, setLoadingContacts] = useState(false);
    const [contactSearchQuery, setContactSearchQuery] = useState("");
    const [selectedReceiver, setSelectedReceiver] = useState<any>(null);
    const [messageSubject, setMessageSubject] = useState("");
    const [messageContent, setMessageContent] = useState("");
    const [sending, setSending] = useState(false);

    const { profile, isDemo } = useAuth();

    const fetchInitialContacts = async () => {
        try {
            setLoadingContacts(true);
            const [admins, teachers, parents] = await Promise.all([
                MessageService.searchUsers('', 'admin'),
                MessageService.searchUsers('', 'teacher'),
                MessageService.searchUsers('', 'parent')
            ]);
            const combined = [...(admins || []), ...(teachers || []), ...(parents || [])];
            setInitialContacts(combined);
            setContacts(combined);
        } catch (error) {
            console.error("Error fetching initial contacts:", error);
        } finally {
            setLoadingContacts(false);
        }
    };

    const fetchMessages = async () => {
        try {
            if (isDemo) {
                const mockInbox = [
                    { id: '1', sender_id: 'parent-1', receiver_id: profile?.id || 'teacher-1', subject: 'Homework Query', content: 'Hello, I wanted to ask about the math homework.', created_at: new Date().toISOString(), sender: { full_name: 'John Parent/Guardian' }, receiver: { full_name: profile?.full_name || 'Sarah Teacher' }, is_read: false }
                ];
                const mockSent = [
                    { id: '2', sender_id: profile?.id || 'teacher-1', receiver_id: 'parent-2', subject: 'Progress Update', content: 'Your child is doing great in science.', created_at: new Date().toISOString(), sender: { full_name: profile?.full_name || 'Sarah Teacher' }, receiver: { full_name: 'Mary Parent/Guardian' }, is_read: true }
                ];
                setInbox(mockInbox);
                setSent(mockSent);
                return;
            }
            const [inboxRes, sentRes] = await Promise.all([
                MessageService.getMessages('inbox'),
                MessageService.getMessages('sent')
            ]);
            setInbox(inboxRes || []);
            setSent(sentRes || []);
        } catch (error) {
            console.error("Error fetching messages:", error);
            Alert.alert("Error", "Failed to fetch messages.");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchMessages();
        fetchInitialContacts();
    }, [isDemo]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchMessages();
    };

    useEffect(() => {
        const searchContacts = async () => {
            const query = contactSearchQuery.trim();
            if (query === "") {
                setContacts(initialContacts);
                return;
            }
            try {
                const res = await MessageService.searchUsers(query);
                // Filter contacts to only allow admins, teachers, and parents for teacher
                const filtered = (res || []).filter((u: any) => u.role === 'admin' || u.role === 'teacher' || u.role === 'parent');
                setContacts(filtered);
            } catch (error) {
                console.error("Error searching users:", error);
            }
        };
        searchContacts();
    }, [contactSearchQuery, initialContacts]);

    const handleSendMessage = async () => {
        if (!selectedReceiver || !messageContent.trim()) return;
        try {
            setSending(true);
            const subject = messageSubject.trim() || `Message from ${profile?.full_name || 'Teacher'}`;
            await MessageService.sendMessage(selectedReceiver.id, messageContent.trim(), subject);
            setSentSuccess(true);
            setScreen("list");
            setMessageContent("");
            setMessageSubject("");
            setSelectedReceiver(null);
            setContactSearchQuery("");
            fetchMessages();
            setTimeout(() => setSentSuccess(false), 3000);
        } catch (error) {
            console.error("Error sending message:", error);
            Alert.alert("Error", "Failed to send message.");
        } finally {
            setSending(false);
        }
    };

    const handleMarkAsRead = async (id: string) => {
        try {
            await MessageService.markAsRead(id);
            setInbox((prev) => prev.map((m) => (m.id === id ? { ...m, is_read: true } : m)));
        } catch (error) {
            console.error("Error marking as read:", error);
        }
    };

    const messagesList = activeTab === 'received' ? inbox : sent;

    const filteredMessages = messagesList.filter(msg => {
        const matchesSearch = msg.subject?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                             msg.sender?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                             msg.receiver?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                             msg.content?.toLowerCase().includes(searchQuery.toLowerCase());
        
        return matchesSearch;
    });

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
                title="Management"
                subtitle="Messaging"
                role="Teacher"
                onBack={
                    screen !== "list" 
                        ? () => { setScreen("list"); setSelectedMessage(null); setSelectedReceiver(null); } 
                        : () => router.push("/(teacher)/management")
                }
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
                            <AddonRequestButton onPress={() => { /* Handle request */ }} />
                        </View>
                    </View>
                }
            >
                {screen === "view" && selectedMessage ? (
                    <View className="flex-1">
                        <View className="p-6 md:p-8 bg-white dark:bg-[#1a1a1a] border-b border-gray-50 dark:border-gray-800 flex-row items-center mb-4">
                            <View className="w-14 h-14 rounded-2xl bg-orange-50 dark:bg-orange-950/20 items-center justify-center mr-4">
                                <Mail size={24} color="#FF6900" />
                            </View>
                            <View className="flex-1">
                                <Text className="text-gray-900 dark:text-white font-bold text-lg tracking-tight">{selectedMessage.subject}</Text>
                                <Text className="text-gray-400 dark:text-gray-500 text-[10px] font-bold uppercase tracking-widest mt-1">
                                    {activeTab === 'received' ? `Sender: ${selectedMessage.sender?.full_name}` : `Recipient: ${selectedMessage.receiver?.full_name}`}
                                </Text>
                            </View>
                        </View>
                        <ScrollView className="flex-1 p-6 md:p-8">
                            <Text className="text-gray-600 dark:text-gray-400 font-medium text-base leading-7">{selectedMessage.content}</Text>
                            <View className="mt-8 pt-8 border-t border-slate-100 dark:border-gray-800">
                                <Text className="text-gray-400 text-xs font-bold uppercase tracking-widest">
                                    Sent on {format(new Date(selectedMessage.created_at), 'MMM d, yyyy h:mm a')}
                                </Text>
                            </View>
                        </ScrollView>
                    </View>
                ) : screen === "compose" ? (
                    <View className="flex-1">
                        <ScrollView className="flex-1 p-6 md:p-8" keyboardShouldPersistTaps="handled">
                            <Text className="text-gray-900 dark:text-white font-bold text-3xl tracking-tighter mb-8">Drafting...</Text>

                            {!selectedReceiver ? (
                                <View className="bg-white dark:bg-[#1a1a1a] p-6 rounded-[32px] border border-gray-50 dark:border-gray-800 shadow-sm mb-8">
                                    <View className="flex-row items-center bg-gray-50 dark:bg-gray-800 px-4 py-3 rounded-2xl mb-4 border border-gray-100 dark:border-gray-700">
                                        <Search size={18} color="#9CA3AF" />
                                        <TextInput
                                            className="flex-1 ml-3 text-gray-900 dark:text-white font-bold text-xs uppercase tracking-widest"
                                            placeholder="Search stakeholders..."
                                            placeholderTextColor="#9CA3AF"
                                            value={contactSearchQuery}
                                            onChangeText={setContactSearchQuery}
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
                                                onPress={() => { setSelectedReceiver(item); setContactSearchQuery(""); }}
                                            >
                                                <View className="bg-white dark:bg-gray-900 p-2 rounded-xl border border-gray-100 dark:border-gray-800 mr-3">
                                                    <User size={20} color="#FF6900" />
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
                                <View className="bg-gray-900 dark:bg-[#1a1a1a] p-8 rounded-[40px] mb-8 shadow-xl">
                                    <View className="flex-row items-center justify-between mb-8">
                                        <View className="flex-row items-center">
                                            <View className="bg-white/10 dark:bg-navy/20 p-4 rounded-3xl">
                                                <User size={24} color="white" />
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

                                    <Text className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-2 ml-1">Subject</Text>
                                    <TextInput
                                        className="bg-white dark:bg-gray-900 border border-slate-700 dark:border-gray-800 rounded-xl px-4 py-3 text-slate-900 dark:text-white font-bold text-xs mb-4"
                                        placeholder="e.g. Academic Progress Update"
                                        placeholderTextColor="#9ca3af"
                                        value={messageSubject}
                                        onChangeText={setMessageSubject}
                                    />

                                    <Text className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-2 ml-1">Message Content</Text>
                                    <View className="bg-white dark:bg-gray-900 rounded-[32px] p-6 shadow-inner mb-6" style={{ minHeight: 250 }}>
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
                                        className="py-5 rounded-[32px] flex-row justify-center items-center shadow-2xl active:bg-orange-600"
                                        style={{ backgroundColor: !messageContent.trim() || sending ? "#374151" : "#FF6900" }}
                                        onPress={handleSendMessage}
                                        disabled={!messageContent.trim() || sending}
                                    >
                                        {sending ? (
                                            <ActivityIndicator color="white" />
                                        ) : (
                                            <>
                                                <Text className="text-white font-bold text-lg tracking-tight mr-3">Send Securely</Text>
                                                <Send size={20} color="white" />
                                            </>
                                        )}
                                    </TouchableOpacity>
                                </View>
                            )}
                        </ScrollView>
                    </View>
                ) : (
                    <View className="flex-1">
                        <View className="px-4 md:px-8 mt-6">
                            <View className="flex-row items-center justify-between mb-6 px-2">
                                <View>
                                    <Text className="text-gray-400 dark:text-gray-500 font-bold text-[10px] uppercase tracking-[3px] mb-2">Faculty Hub</Text>
                                    <Text className="text-gray-900 dark:text-white font-bold text-3xl tracking-tight">Direct Connect</Text>
                                </View>
                                <TouchableOpacity
                                    onPress={() => setScreen("compose")}
                                    className="bg-gray-900 dark:bg-[#FF6900] w-12 h-12 rounded-2xl items-center justify-center shadow-lg active:bg-gray-800"
                                >
                                    <Plus size={24} color="white" />
                                </TouchableOpacity>
                            </View>

                            <View className="flex-row bg-white dark:bg-navy-surface p-1.5 rounded-[24px] border border-gray-100 dark:border-gray-800 shadow-sm mb-6">
                                <TouchableOpacity
                                    onPress={() => setActiveTab('received')}
                                    className={`flex-1 flex-row items-center justify-center py-3.5 rounded-2xl ${activeTab === 'received' ? 'bg-teacherOrange shadow-md' : ''}`}
                                >
                                    <MessageCircle size={18} color={activeTab === 'received' ? 'white' : '#64748b'} />
                                    <Text className={`ml-2 font-bold text-sm ${activeTab === 'received' ? 'text-white' : 'text-slate-500'}`}>
                                        {unreadCount > 0 ? `Inbox (${unreadCount})` : 'Inbox'}
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={() => setActiveTab('sent')}
                                    className={`flex-1 flex-row items-center justify-center py-3.5 rounded-2xl ${activeTab === 'sent' ? 'bg-teacherBlack shadow-md' : ''}`}
                                >
                                    <Send size={18} color={activeTab === 'sent' ? 'white' : '#64748b'} />
                                    <Text className={`ml-2 font-bold text-sm ${activeTab === 'sent' ? 'text-white' : 'text-slate-500'}`}>Sent</Text>
                                </TouchableOpacity>
                            </View>

                            {sentSuccess && (
                                <View className="mb-6 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900 p-4 rounded-2xl flex-row items-center">
                                    <CheckCircle2 size={18} color="#10B981" />
                                    <Text className="text-emerald-700 dark:text-emerald-400 font-bold text-xs uppercase tracking-widest ml-3">Transmission Successful</Text>
                                </View>
                            )}

                            <View className="flex-row items-center bg-white dark:bg-navy-surface px-5 py-4 rounded-[28px] border border-gray-100 dark:border-gray-800 shadow-sm mb-6">
                                <Search size={20} color="#94a3b8" />
                                <TextInput
                                    placeholder="Search by subject, name or content..."
                                    placeholderTextColor="#94a3b8"
                                    className="flex-1 ml-3 text-slate-900 dark:text-white font-medium"
                                    value={searchQuery}
                                    onChangeText={setSearchQuery}
                                />
                            </View>

                            {refreshing && <ActivityIndicator size="large" color="#FF6900" className="mt-8" />}

                            {filteredMessages.length === 0 ? (
                                <View className="bg-white dark:bg-navy-surface p-12 rounded-[40px] items-center border border-gray-100 dark:border-gray-800 border-dashed mt-4">
                                    <MessageCircle size={48} color="#e2e8f0" style={{ opacity: 0.5 }} />
                                    <Text className="text-slate-400 font-bold text-center mt-6">No messages found</Text>
                                </View>
                            ) : (
                                <ScrollView 
                                    showsVerticalScrollIndicator={false} 
                                    contentContainerStyle={{ paddingBottom: 150 }}
                                    refreshControl={
                                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#FF6900"]} tintColor="#FF6900" />
                                    }
                                >
                                    {filteredMessages.map((msg) => {
                                        const partner = activeTab === 'received' ? msg.sender : msg.receiver;
                                        const unread = !msg.is_read && activeTab === 'received';
                                        return (
                                            <TouchableOpacity
                                                key={msg.id}
                                                onPress={() => {
                                                    if (unread) handleMarkAsRead(msg.id);
                                                    setSelectedMessage(msg);
                                                    setScreen("view");
                                                }}
                                                className={`p-5 rounded-[32px] border mb-4 flex-row items-center shadow-sm active:bg-slate-50 dark:active:bg-slate-900 ${unread ? 'border-orange-100 bg-orange-50/10 dark:border-orange-950/20' : 'bg-white dark:bg-navy-surface border-gray-50 dark:border-gray-800'}`}
                                            >
                                                <View className={`w-12 h-12 rounded-2xl items-center justify-center mr-4 ${unread ? 'bg-orange-100 dark:bg-orange-950/30' : 'bg-slate-50 dark:bg-navy-light'}`}>
                                                    <User size={22} color={unread ? "#FF6B00" : "#64748b"} />
                                                </View>
                                                <View className="flex-1">
                                                    <View className="flex-row justify-between items-center mb-1">
                                                        <Text className="text-slate-900 dark:text-white font-bold text-base leading-tight" numberOfLines={1}>
                                                            {partner?.full_name || "Unknown Stakeholder"}
                                                        </Text>
                                                        <Text className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                                                            {formatTime(msg.created_at)}
                                                        </Text>
                                                    </View>
                                                    <Text className="text-slate-700 dark:text-slate-400 text-xs font-bold" numberOfLines={1}>{msg.subject}</Text>
                                                    <Text className="text-slate-400 text-[10px] font-medium mt-0.5" numberOfLines={1}>{msg.content}</Text>
                                                </View>
                                                {unread ? <View className="w-2 h-2 rounded-full bg-[#FF6B00] ml-3" /> : <ChevronRight size={20} color="#cbd5e1" />}
                                            </TouchableOpacity>
                                        );
                                    })}
                                </ScrollView>
                            )}
                        </View>
                    </View>
                )}
            </SubscriptionGate>
        </View>
    );
}
