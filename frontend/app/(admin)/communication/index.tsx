import { UnifiedHeader } from "@/components/common/UnifiedHeader";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { supabase } from "@/libs/supabase";
import { showSuccess, showError } from "@/utils/toast";
import { router } from "expo-router";
import { api } from "@/services/api";
import {
    CheckCircle2,
    ChevronRight,
    Edit2,
    Mail,
    MessageCircle,
    MessageSquare,
    Plus,
    RefreshCw,
    Search,
    Send,
    UserCircle,
    X,
    Megaphone,
    Trash2
} from "lucide-react-native";
import React, { useEffect, useState, useCallback, useRef } from "react";
import {
    ActivityIndicator,
    Alert,
    Animated,
    Easing,
    Modal,
    Platform,
    RefreshControl,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";

const formatTime = (dateStr: string) => {
    if (!dateStr) return "N/A";
    const d = new Date(dateStr);
    const diff = Date.now() - d.getTime();
    if (diff < 86400000) return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

type Screen = "list" | "view" | "compose";
type MainTab = "messages" | "announcements";
type MessageTab = "inbox" | "sent";

export default function CommunicationPage() {
    const { isDark } = useTheme();
    const { profile } = useAuth();

    // Navigation & Tabs
    const [mainTab, setMainTab] = useState<MainTab>("messages");
    const [msgTab, setMsgTab] = useState<MessageTab>("inbox");
    const [screen, setScreen] = useState<Screen>("list");

    // Loading states
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Data lists
    const [inbox, setInbox] = useState<any[]>([]);
    const [sent, setSent] = useState<any[]>([]);
    const [announcements, setAnnouncements] = useState<any[]>([]);
    const [allParents, setAllParents] = useState<any[]>([]);

    // Selection / Viewing
    const [selectedMsg, setSelectedMsg] = useState<any>(null);
    const [msgDetailVisible, setMsgDetailVisible] = useState(false);

    // Compose Message State
    const [parentSearch, setParentSearch] = useState("");
    const [selectedParent, setSelectedParent] = useState<any>(null);
    const [messageSubject, setMessageSubject] = useState("");
    const [messageContent, setMessageContent] = useState("");
    const [sendingMsg, setSendingMsg] = useState(false);
    const [sentSuccess, setSentSuccess] = useState(false);

    // Compose / Edit Announcement State
    const [announcementModalVisible, setAnnouncementModalVisible] = useState(false);
    const [announcementTitle, setAnnouncementTitle] = useState("");
    const [announcementMessage, setAnnouncementMessage] = useState("");
    const [postingAnnouncement, setPostingAnnouncement] = useState(false);
    const [editingAnnouncement, setEditingAnnouncement] = useState<any>(null);

    // Delete Confirmation State
    const [deleteModalVisible, setDeleteModalVisible] = useState(false);
    const [announcementToDelete, setAnnouncementToDelete] = useState<string | null>(null);

    // Refresh Spin Animation
    const spinValue = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (refreshing) {
            Animated.loop(
                Animated.timing(spinValue, {
                    toValue: 1,
                    duration: 1000,
                    easing: Easing.linear,
                    useNativeDriver: true,
                })
            ).start();
        } else {
            Animated.timing(spinValue, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }).start();
        }
    }, [refreshing]);

    const spin = spinValue.interpolate({
        inputRange: [0, 1],
        outputRange: ["0deg", "360deg"]
    });

    // Colors
    const surfaceBg = isDark ? "#13103A" : "#ffffff";
    const surfaceBorder = isDark ? "#1A1650" : "#f3f4f6";
    const textPrimary = isDark ? "#f9fafb" : "#111827";
    const textMuted = isDark ? "#94a3b8" : "#6b7280";
    const bgContainer = isDark ? "#0F0B2E" : "#f9fafb";

    // ─── Data Fetching ──────────────────────────────────────────────────────────

    const fetchParents = useCallback(async () => {
        if (!profile?.institution_id) return;
        try {
            const { data, error } = await (supabase.from("users") as any)
                .select("id, full_name, email, role, avatar_url")
                .eq("role", "parent")
                .eq("institution_id", profile.institution_id)
                .order("full_name", { ascending: true });

            if (error) throw error;
            setAllParents(data || []);
        } catch (error: any) {
            console.error("Error fetching parents:", error.message);
        }
    }, [profile?.institution_id]);

    const fetchMessages = useCallback(async () => {
        if (!profile?.institution_id) return;
        try {
            // Fetch Inbox: receiver is current user (admin)
            const { data: inboxData, error: inboxError } = await (supabase.from("messages") as any)
                .select(`
                    *,
                    sender:sender_id ( id, full_name, avatar_url, email )
                `)
                .eq("receiver_id", profile.id)
                .eq("institution_id", profile.institution_id)
                .order("created_at", { ascending: false });

            if (inboxError) throw inboxError;

            // Fetch Sent: sender is current user (admin)
            const { data: sentData, error: sentError } = await (supabase.from("messages") as any)
                .select(`
                    *,
                    receiver:receiver_id ( id, full_name, avatar_url, email )
                `)
                .eq("sender_id", profile.id)
                .eq("institution_id", profile.institution_id)
                .order("created_at", { ascending: false });

            if (sentError) throw sentError;

            setInbox(inboxData || []);
            setSent(sentData || []);
        } catch (error: any) {
            console.error("Error fetching messages:", error.message);
        }
    }, [profile?.id, profile?.institution_id]);

    const fetchAnnouncements = useCallback(async () => {
        if (!profile?.institution_id) return;
        try {
            const { data, error } = await (supabase.from("announcements") as any)
                .select("*")
                .eq("institution_id", profile.institution_id)
                .is("subject_id", null)
                .is("teacher_id", null)
                .order("created_at", { ascending: false });

            if (error) throw error;
            setAnnouncements(data || []);
        } catch (error: any) {
            console.error("Error fetching announcements:", error.message);
        }
    }, [profile?.institution_id]);

    const loadAllData = useCallback(async (isRefresh = false) => {
        if (!isRefresh) setLoading(true);
        await Promise.all([fetchMessages(), fetchAnnouncements(), fetchParents()]);
        setLoading(false);
        setRefreshing(false);
    }, [fetchMessages, fetchAnnouncements, fetchParents]);

    useEffect(() => {
        if (profile?.institution_id) {
            loadAllData();
        }
    }, [profile?.institution_id, loadAllData]);

    const onRefresh = () => {
        setRefreshing(true);
        loadAllData(true);
    };



    // ─── Messaging Logic ─────────────────────────────────────────────────────────

    const handleSendMessage = async () => {
        if (!profile?.id || !profile?.institution_id) return;
        if (!selectedParent || !messageContent.trim()) {
            Alert.alert("Validation", "Please select a parent and type a message.");
            return;
        }

        setSendingMsg(true);
        try {
            const subject = messageSubject.trim() || `Secure Message from Administrator`;
            const content = messageContent.trim();

            // 1. Insert message
            const { error: msgError } = await (supabase.from("messages") as any)
                .insert({
                    sender_id: profile.id,
                    receiver_id: selectedParent.id,
                    subject,
                    content,
                    institution_id: profile.institution_id,
                    is_read: false
                });

            if (msgError) throw msgError;

            showSuccess("Message Sent", "Transmission completed successfully.");
            setSentSuccess(true);
            setScreen("list");
            setMessageSubject("");
            setMessageContent("");
            setSelectedParent(null);
            setParentSearch("");
            fetchMessages();

            setTimeout(() => setSentSuccess(false), 3000);
        } catch (error: any) {
            console.error("Error sending message:", error);
            showError("Send Failed", error.message || "Failed to deliver message.");
        } finally {
            setSendingMsg(false);
        }
    };

    const handleMarkAsRead = async (msgId: string) => {
        try {
            await (supabase.from("messages") as any)
                .update({ is_read: true })
                .eq("id", msgId);

            // Local state update
            setInbox(prev => prev.map(m => m.id === msgId ? { ...m, is_read: true } : m));
        } catch (error: any) {
            console.error("Error marking as read:", error.message);
        }
    };

    // ─── Announcements Logic ───────────────────────────────────────────────────

    const openAnnouncementModal = (announcement?: any) => {
        if (announcement) {
            setEditingAnnouncement(announcement);
            setAnnouncementTitle(announcement.title || "");
            setAnnouncementMessage(announcement.message || "");
        } else {
            setEditingAnnouncement(null);
            setAnnouncementTitle("");
            setAnnouncementMessage("");
        }
        setAnnouncementModalVisible(true);
    };

    const closeAnnouncementModal = () => {
        setAnnouncementModalVisible(false);
        setEditingAnnouncement(null);
        setAnnouncementTitle("");
        setAnnouncementMessage("");
    };

    const handlePostOrUpdateAnnouncement = async () => {
        if (!profile?.institution_id) return;
        if (!announcementTitle.trim() || !announcementMessage.trim()) {
            Alert.alert("Validation", "Please fill in all announcement fields.");
            return;
        }

        setPostingAnnouncement(true);
        try {
            if (editingAnnouncement) {
                // UPDATE existing announcement
                const { error } = await (supabase.from("announcements") as any)
                    .update({
                        title: announcementTitle.trim(),
                        message: announcementMessage.trim(),
                        updated_at: new Date().toISOString()
                    })
                    .eq("id", editingAnnouncement.id)
                    .eq("institution_id", profile.institution_id);

                if (error) throw error;

                showSuccess("Success", "Announcement updated!");
                // Update local state immediately
                setAnnouncements(prev => prev.map(a =>
                    a.id === editingAnnouncement.id
                        ? { ...a, title: announcementTitle.trim(), message: announcementMessage.trim(), updated_at: new Date().toISOString() }
                        : a
                ));
            } else {
                // INSERT new announcement
                const { error } = await (supabase.from("announcements") as any)
                    .insert({
                        subject_id: null,
                        teacher_id: null,
                        title: announcementTitle.trim(),
                        message: announcementMessage.trim(),
                        institution_id: profile.institution_id
                    });

                if (error) throw error;

                showSuccess("Success", "Announcement broadcasted!");
                fetchAnnouncements();
            }

            closeAnnouncementModal();
        } catch (error: any) {
            console.error("Error saving announcement:", error);
            showError(editingAnnouncement ? "Update Failed" : "Broadcast Failed", error.message || "Could not save announcement.");
        } finally {
            setPostingAnnouncement(false);
        }
    };

    const handleDeleteAnnouncement = (annId: string) => {
        setAnnouncementToDelete(annId);
        setDeleteModalVisible(true);
    };

    const confirmDeleteAnnouncement = async () => {
        if (!announcementToDelete) return;
        try {
            await api.delete(`/academic/announcements/${announcementToDelete}`);

            showSuccess("Success", "Announcement deleted.");
            setAnnouncements(prev => prev.filter(a => a.id !== announcementToDelete));
        } catch (error: any) {
            console.error("Error deleting announcement:", error);
            showError("Error", error.message || "Failed to delete announcement.");
        } finally {
            setDeleteModalVisible(false);
            setAnnouncementToDelete(null);
        }
    };

    // ─── Render Sub-methods ─────────────────────────────────────────────────────

    const renderDirectMessagesTab = () => {
        const messagesList = msgTab === "inbox" ? inbox : sent;
        const unreadCount = inbox.filter(m => !m.is_read).length;
        const filteredParents = allParents.filter(p => 
            p.full_name?.toLowerCase().includes(parentSearch.toLowerCase()) ||
            p.email?.toLowerCase().includes(parentSearch.toLowerCase())
        );

        if (screen === "view" && selectedMsg) {
            const partner = msgTab === "inbox" ? selectedMsg.sender : selectedMsg.receiver;
            return (
                <View className="flex-1 px-4 md:px-8 mt-4">
                    <View className="bg-white dark:bg-[#1a1a1a] p-6 rounded-3xl border border-gray-100 dark:border-gray-800 flex-row items-center mb-6">
                        <View className="w-12 h-12 rounded-xl bg-orange-50 dark:bg-orange-950/20 items-center justify-center mr-4">
                            <Mail size={22} color="#FF6B00" />
                        </View>
                        <View className="flex-1">
                            <Text className="text-gray-900 dark:text-white font-extrabold text-base tracking-tight">{selectedMsg.subject}</Text>
                            <Text className="text-gray-400 dark:text-gray-500 text-[10px] font-bold uppercase tracking-widest mt-1">
                                {msgTab === "inbox" ? `From: ${partner?.full_name}` : `To: ${partner?.full_name}`}
                            </Text>
                            <Text className="text-gray-400 dark:text-gray-500 text-[9px] font-medium mt-0.5">{partner?.email}</Text>
                        </View>
                        <TouchableOpacity
                            className="bg-gray-50 dark:bg-gray-800 p-2 rounded-full"
                            onPress={() => { setScreen("list"); setSelectedMsg(null); }}
                        >
                            <X size={16} color={isDark ? "#ffffff" : "#64748b"} />
                        </TouchableOpacity>
                    </View>
                    <ScrollView className="flex-1 bg-white dark:bg-[#1a1a1a] rounded-3xl p-6 border border-gray-100 dark:border-gray-800">
                        <Text className="text-gray-700 dark:text-gray-300 text-sm font-medium leading-[22px] mb-8">
                            {selectedMsg.content}
                        </Text>
                        <Text className="text-gray-400 dark:text-gray-500 text-[10px] font-bold uppercase tracking-widest border-t border-gray-50 dark:border-gray-800 pt-4">
                            Transmitted on {new Date(selectedMsg.created_at).toLocaleString()}
                        </Text>
                    </ScrollView>
                </View>
            );
        }

        if (screen === "compose") {
            return (
                <View className="flex-1 px-4 md:px-8 mt-4">
                    <ScrollView className="flex-1" keyboardShouldPersistTaps="handled">
                        <View className="flex-row justify-between items-center mb-6">
                            <Text className="text-gray-950 dark:text-white text-xl font-black tracking-tight">Draft Transmission</Text>
                            <TouchableOpacity
                                className="w-8 h-8 bg-gray-100 dark:bg-gray-800 rounded-full items-center justify-center"
                                onPress={() => { setScreen("list"); setSelectedParent(null); }}
                            >
                                <X size={16} color={isDark ? "#ffffff" : "#64748b"} />
                            </TouchableOpacity>
                        </View>

                        {!selectedParent ? (
                            <View className="bg-white dark:bg-[#1a1a1a] p-5 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm mb-6">
                                <Text className="text-gray-500 dark:text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-2 ml-1">Search Parent/Guardian Stakeholder</Text>
                                <View className="flex-row items-center bg-gray-50 dark:bg-gray-800 px-4 py-3 rounded-2xl mb-4 border border-gray-100 dark:border-gray-700">
                                    <Search size={18} color="#9CA3AF" />
                                    <TextInput
                                        className="flex-1 ml-3 text-gray-950 dark:text-white font-semibold text-xs tracking-wide"
                                        placeholder="Type name to lookup Parent/Guardian..."
                                        placeholderTextColor="#9CA3AF"
                                        value={parentSearch}
                                        onChangeText={setParentSearch}
                                    />
                                </View>
                                {filteredParents.length === 0 ? (
                                    <View className="items-center py-8">
                                        <Text className="text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest text-[9px]">No Parent/Guardian matches found</Text>
                                    </View>
                                ) : (
                                    filteredParents.map(item => (
                                        <TouchableOpacity
                                            key={item.id}
                                            className="flex-row items-center p-3 mb-2 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-800"
                                            onPress={() => { setSelectedParent(item); setParentSearch(""); }}
                                        >
                                            <View className="w-8 h-8 bg-orange-100 rounded-lg items-center justify-center mr-3">
                                                <UserCircle size={18} color="#FF6B00" />
                                            </View>
                                            <View>
                                                <Text className="text-gray-950 dark:text-white font-bold text-xs">{item.full_name}</Text>
                                                <Text className="text-gray-400 dark:text-gray-500 text-[8px] font-bold uppercase tracking-widest">{item.email}</Text>
                                            </View>
                                        </TouchableOpacity>
                                    ))
                                )}
                            </View>
                        ) : (
                            <View className="bg-[#1E293B] dark:bg-[#100D35] p-6 rounded-3xl mb-6 shadow-md border border-slate-700 dark:border-gray-800">
                                <View className="flex-row items-center justify-between mb-6">
                                    <View className="flex-row items-center">
                                        <View className="bg-white/10 p-3 rounded-xl">
                                            <UserCircle size={22} color="white" />
                                        </View>
                                        <View className="ml-3">
                                            <Text className="text-white font-extrabold text-sm tracking-tight">{selectedParent.full_name}</Text>
                                            <Text className="text-[#FF6B00] text-[9px] font-bold uppercase tracking-widest mt-0.5">{selectedParent.email}</Text>
                                        </View>
                                    </View>
                                    <TouchableOpacity
                                        onPress={() => setSelectedParent(null)}
                                        className="bg-white/10 px-3 py-1.5 rounded-lg active:opacity-75"
                                    >
                                        <Text className="text-white text-[9px] font-bold uppercase">Change</Text>
                                    </TouchableOpacity>
                                </View>

                                <Text className="text-slate-400 text-[9px] font-bold uppercase tracking-widest mb-1.5 ml-1">Subject</Text>
                                <TextInput
                                    className="bg-white dark:bg-gray-900 border border-slate-700 dark:border-gray-800 rounded-xl px-4 py-3 text-slate-900 dark:text-white font-bold text-xs mb-4"
                                    placeholder="e.g. Performance Inquiry"
                                    placeholderTextColor="#9ca3af"
                                    value={messageSubject}
                                    onChangeText={setMessageSubject}
                                />

                                <Text className="text-slate-400 text-[9px] font-bold uppercase tracking-widest mb-1.5 ml-1">Secure Message</Text>
                                <View className="bg-white dark:bg-gray-900 border border-slate-700 dark:border-gray-800 rounded-2xl p-4" style={{ minHeight: 180 }}>
                                    <TextInput
                                        className="text-slate-900 dark:text-white text-xs font-medium"
                                        placeholder="Compose message..."
                                        placeholderTextColor="#9CA3AF"
                                        multiline
                                        textAlignVertical="top"
                                        value={messageContent}
                                        onChangeText={setMessageContent}
                                        style={{ flex: 1 }}
                                    />
                                </View>

                                <TouchableOpacity
                                    className={`mt-6 py-4 rounded-xl flex-row justify-center items-center shadow-lg active:opacity-90 ${!messageContent.trim() ? "bg-gray-600" : "bg-[#FF6B00]"}`}
                                    onPress={handleSendMessage}
                                    disabled={sendingMsg || !messageContent.trim()}
                                >
                                    {sendingMsg ? (
                                        <ActivityIndicator color="white" />
                                    ) : (
                                        <>
                                            <Text className="text-white font-extrabold text-sm mr-2 uppercase tracking-wider">Send Message</Text>
                                            <Send size={16} color="white" />
                                        </>
                                    )}
                                </TouchableOpacity>
                            </View>
                        )}
                    </ScrollView>
                </View>
            );
        }

        return (
            <View className="flex-1 px-4 md:px-8">
                {/* Inbox/Sent Navigation */}
                <View className="flex-row bg-white dark:bg-navy-surface p-1 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm mb-6 mt-4">
                    {(["inbox", "sent"] as const).map(tab => (
                        <TouchableOpacity
                            key={tab}
                            className={`flex-1 py-3 rounded-xl items-center justify-center ${msgTab === tab ? "bg-[#FF6B00]" : ""}`}
                            onPress={() => setMsgTab(tab)}
                        >
                            <Text className={`text-[10px] font-bold uppercase tracking-widest ${msgTab === tab ? "text-white" : "text-gray-400 dark:text-gray-500"}`}>
                                {tab === "inbox" && unreadCount > 0 ? `Inbox (${unreadCount})` : tab}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {sentSuccess && (
                    <View className="mb-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900 p-3 rounded-xl flex-row items-center">
                        <CheckCircle2 size={16} color="#10B981" />
                        <Text className="text-emerald-700 dark:text-emerald-400 font-bold text-[10px] uppercase tracking-widest ml-3">Message sent successfully</Text>
                    </View>
                )}

                <ScrollView
                    className="flex-1"
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#FF6B00"]} tintColor="#FF6B00" />
                    }
                >
                    {messagesList.length === 0 ? (
                        <View className="items-center py-16 bg-white dark:bg-navy-surface rounded-3xl border border-dashed border-gray-100 dark:border-gray-800">
                            <MessageCircle size={48} color="#E5E7EB" style={{ opacity: 0.3 }} />
                            <Text className="text-gray-400 dark:text-gray-500 font-bold mt-4 uppercase tracking-widest text-[10px]">No messages found</Text>
                        </View>
                    ) : (
                        messagesList.map((item: any) => {
                            const partner = msgTab === "inbox" ? item.sender : item.receiver;
                            const unread = !item.is_read && msgTab === "inbox";
                            return (
                                <TouchableOpacity
                                    key={item.id}
                                    activeOpacity={0.7}
                                    className={`flex-row items-center p-5 mb-3 rounded-2xl border shadow-sm ${unread ? "border-orange-100 bg-orange-50/10 dark:border-orange-950/20 dark:bg-orange-950/5" : "bg-white dark:bg-navy-surface border-gray-50 dark:border-gray-800"}`}
                                    onPress={() => {
                                        if (unread) handleMarkAsRead(item.id);
                                        setSelectedMsg(item);
                                        setScreen("view");
                                    }}
                                >
                                    <View className={`w-10 h-10 rounded-xl items-center justify-center mr-3 ${unread ? "bg-orange-100 dark:bg-orange-950/30" : "bg-gray-50 dark:bg-gray-800"}`}>
                                        <UserCircle size={20} color={unread ? "#FF6B00" : "#9CA3AF"} />
                                    </View>
                                    <View className="flex-1">
                                        <View className="flex-row justify-between items-center mb-1">
                                            <Text className="text-gray-950 dark:text-white font-bold text-sm" numberOfLines={1}>{partner?.full_name || "Unknown Stakeholder"}</Text>
                                            <Text className="text-gray-400 dark:text-gray-500 text-[8px] font-bold uppercase tracking-widest">{formatTime(item.created_at)}</Text>
                                        </View>
                                        <Text className="text-gray-700 dark:text-gray-400 text-xs font-bold" numberOfLines={1}>{item.subject}</Text>
                                        <Text className="text-gray-400 dark:text-gray-500 text-[10px] font-medium" numberOfLines={1}>{item.content}</Text>
                                    </View>
                                    {unread ? <View className="w-2 h-2 rounded-full bg-[#FF6B00] ml-2" /> : <ChevronRight size={14} color="#E5E7EB" className="ml-1" />}
                                </TouchableOpacity>
                            );
                        })
                    )}
                </ScrollView>
            </View>
        );
    };

    const renderAnnouncementsTab = () => {
        return (
            <View className="flex-1 px-4 md:px-8">
                <ScrollView
                    className="flex-1 mt-4"
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#FF6B00"]} tintColor="#FF6B00" />
                    }
                >
                    {announcements.length === 0 ? (
                        <View className="items-center py-16 bg-white dark:bg-navy-surface rounded-3xl border border-dashed border-gray-100 dark:border-gray-800">
                            <Megaphone size={48} color="#E5E7EB" style={{ opacity: 0.3 }} />
                            <Text className="text-gray-400 dark:text-gray-500 font-bold mt-4 uppercase tracking-widest text-[10px]">No announcements posted</Text>
                        </View>
                    ) : (
                        announcements.map((item: any) => (
                            <View
                                key={item.id}
                                className="bg-white dark:bg-navy-surface p-5 rounded-2xl border border-gray-50 dark:border-gray-800 mb-4 shadow-sm"
                            >
                                <View className="flex-row items-start mb-3">
                                    <View className="bg-orange-50 dark:bg-orange-950/20 p-2.5 rounded-xl mr-3">
                                        <Megaphone size={18} color="#FF6B00" />
                                    </View>
                                    <View className="flex-1">
                                        <Text className="text-gray-900 dark:text-white font-bold text-sm leading-tight">{item.title}</Text>
                                        <Text className="text-gray-400 dark:text-gray-500 text-[8px] font-bold uppercase tracking-widest mt-1">
                                            Posted {new Date(item.created_at).toLocaleDateString()}
                                            {item.updated_at && item.updated_at !== item.created_at ? " · Edited" : ""}
                                        </Text>
                                    </View>
                                    <View className="flex-row items-center gap-1">
                                        <TouchableOpacity
                                            className="p-1.5 bg-blue-50 dark:bg-blue-950/20 rounded-lg mr-1"
                                            onPress={() => openAnnouncementModal(item)}
                                        >
                                            <Edit2 size={14} color="#3b82f6" />
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            className="p-1.5 bg-red-50 dark:bg-red-950/20 rounded-lg"
                                            onPress={() => handleDeleteAnnouncement(item.id)}
                                        >
                                            <Trash2 size={14} color="#ef4444" />
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                <Text className="text-gray-600 dark:text-gray-400 text-xs leading-5">
                                    {item.message}
                                </Text>
                            </View>
                        ))
                    )}
                </ScrollView>
            </View>
        );
    };

    return (
        <View className="flex-1" style={{ backgroundColor: bgContainer }}>
            <UnifiedHeader
                title="Communication"
                subtitle="Communication"
                role="Admin"
                onBack={screen !== "list" ? () => { setScreen("list"); setSelectedParent(null); } : () => router.push("/(admin)")}
                showNotification={false}
            />

            {/* Main Tabs Selection */}
            {screen === "list" && (
                <View className="px-4 md:px-8 mt-4 flex-row justify-between items-center">
                    <View className="flex-row bg-white dark:bg-navy-surface p-1 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex-1 mr-4">
                        <TouchableOpacity
                            onPress={() => setMainTab("messages")}
                            className={`flex-1 py-3 rounded-xl items-center justify-center ${mainTab === "messages" ? "bg-[#FF6B00]" : ""}`}
                        >
                            <Text className={`text-[10px] font-black uppercase tracking-wider ${mainTab === "messages" ? "text-white" : "text-gray-400 dark:text-gray-500"}`}>Direct Messages</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => setMainTab("announcements")}
                            className={`flex-1 py-3 rounded-xl items-center justify-center ${mainTab === "announcements" ? "bg-[#FF6B00]" : ""}`}
                        >
                            <Text className={`text-[10px] font-black uppercase tracking-wider ${mainTab === "announcements" ? "text-white" : "text-gray-400 dark:text-gray-500"}`}>Announcements</Text>
                        </TouchableOpacity>
                    </View>

                    <View className="flex-row items-center gap-2">
                        <TouchableOpacity
                            className={`bg-white dark:bg-navy-surface w-10 h-10 rounded-xl items-center justify-center shadow active:bg-gray-100 dark:active:bg-gray-700 ${refreshing ? "opacity-50" : ""}`}
                            onPress={() => {
                                setRefreshing(true);
                                loadAllData(true);
                            }}
                            disabled={refreshing}
                        >
                            <Animated.View style={{ transform: [{ rotate: spin }] }}>
                                <RefreshCw size={20} color={isDark ? "#f9fafb" : "#111827"} />
                            </Animated.View>
                        </TouchableOpacity>
                        <TouchableOpacity
                            className="bg-[#FF6B00] w-10 h-10 rounded-xl items-center justify-center shadow active:bg-orange-600"
                            onPress={() => {
                                if (mainTab === "messages") {
                                    setScreen("compose");
                                } else {
                                    openAnnouncementModal();
                                }
                            }}
                        >
                            <Plus size={20} color="white" />
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            {loading && !refreshing ? (
                <View className="flex-1 justify-center items-center">
                    <ActivityIndicator size="large" color="#FF6B00" />
                </View>
            ) : mainTab === "messages" ? (
                renderDirectMessagesTab()
            ) : (
                renderAnnouncementsTab()
            )}

            {/* Broadcast / Edit Announcement Modal */}
            <Modal visible={announcementModalVisible} animationType="slide" transparent>
                <View className="flex-1 bg-black/60 justify-end">
                    <View className="bg-white dark:bg-[#0F0B2E] rounded-t-[36px] p-6 pb-10 border-t border-gray-100 dark:border-gray-800">
                        <View className="flex-row justify-between items-center mb-6">
                            <Text className="text-lg font-black text-gray-950 dark:text-white tracking-tight">
                                {editingAnnouncement ? "Edit Announcement" : "Post Updates"}
                            </Text>
                            <TouchableOpacity
                                className="w-8 h-8 bg-gray-100 dark:bg-gray-800 rounded-full items-center justify-center"
                                onPress={closeAnnouncementModal}
                            >
                                <X size={18} color="#6B7280" />
                            </TouchableOpacity>
                        </View>

                        <Text className="text-gray-500 dark:text-gray-400 text-[9px] font-bold uppercase tracking-widest ml-1 mb-1.5">Announcement Title</Text>
                        <TextInput
                            className="bg-gray-50 dark:bg-gray-900 rounded-xl px-4 py-3 text-slate-900 dark:text-white font-bold text-xs border border-gray-100 dark:border-gray-800 mb-4"
                            placeholder="e.g. End of Term Closure"
                            placeholderTextColor="#9CA3AF"
                            value={announcementTitle}
                            onChangeText={setAnnouncementTitle}
                        />

                        <Text className="text-gray-500 dark:text-gray-400 text-[9px] font-bold uppercase tracking-widest ml-1 mb-1.5">Announcement Message</Text>
                        <TextInput
                            className="bg-gray-50 dark:bg-gray-900 rounded-2xl px-4 py-3 text-slate-900 dark:text-white font-medium text-xs border border-gray-100 dark:border-gray-800 h-28 mb-6"
                            placeholder="Type announcement message here..."
                            placeholderTextColor="#9CA3AF"
                            multiline
                            textAlignVertical="top"
                            value={announcementMessage}
                            onChangeText={setAnnouncementMessage}
                        />

                        <TouchableOpacity
                            className={`py-4 rounded-xl items-center justify-center flex-row shadow-md active:opacity-90 ${!announcementTitle.trim() || !announcementMessage.trim() ? 'bg-gray-400' : 'bg-[#FF6B00]'}`}
                            onPress={handlePostOrUpdateAnnouncement}
                            disabled={postingAnnouncement || !announcementTitle.trim() || !announcementMessage.trim()}
                        >
                            {postingAnnouncement ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <>
                                    {editingAnnouncement ? <Edit2 size={16} color="white" /> : <Megaphone size={16} color="white" />}
                                    <Text className="text-white font-extrabold text-sm ml-2 uppercase tracking-wide">
                                        {editingAnnouncement ? "Save Changes" : "Broadcast Update"}
                                    </Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal visible={deleteModalVisible} animationType="fade" transparent>
                <View className="flex-1 bg-black/60 justify-center items-center px-4">
                    <View className="bg-white dark:bg-[#0F0B2E] rounded-[32px] p-6 w-full max-w-sm border border-gray-100 dark:border-gray-800 shadow-2xl animate-fade-in">
                        <View className="items-center mb-6">
                            <View className="w-16 h-16 bg-red-50 dark:bg-red-950/20 rounded-full items-center justify-center mb-4">
                                <Trash2 size={28} color="#ef4444" />
                            </View>
                            <Text className="text-gray-950 dark:text-white font-black text-lg tracking-tight text-center">
                                Delete Announcement
                            </Text>
                            <Text className="text-gray-500 dark:text-gray-400 text-xs font-medium text-center mt-2 leading-5">
                                Are you sure you want to permanently delete this announcement? This action cannot be undone.
                            </Text>
                        </View>

                        <View className="flex-row gap-3">
                            <TouchableOpacity
                                className="flex-1 py-3.5 bg-gray-50 dark:bg-gray-800 rounded-xl items-center border border-gray-100 dark:border-gray-700 active:opacity-90"
                                onPress={() => {
                                    setDeleteModalVisible(false);
                                    setAnnouncementToDelete(null);
                                }}
                            >
                                <Text className="text-gray-600 dark:text-gray-300 font-extrabold text-xs uppercase tracking-wider">Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                className="flex-1 py-3.5 bg-red-500 rounded-xl items-center active:bg-red-600 shadow-md shadow-red-500/20"
                                onPress={confirmDeleteAnnouncement}
                            >
                                <Text className="text-white font-extrabold text-xs uppercase tracking-wider">Delete</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}
