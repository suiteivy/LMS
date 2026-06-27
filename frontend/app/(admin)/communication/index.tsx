import { UnifiedHeader } from "@/components/common/UnifiedHeader";
import { DirectChatView } from "@/components/chat/DirectChatView";
import { Spinner } from "@/components/ui/Spinner";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { supabase } from "@/libs/supabase";
import { showSuccess, showError } from "@/utils/toast";
import { router } from "expo-router";
import { api } from "@/services/api";
import {
    Edit2,
    Plus,
    RefreshCw,
    X,
    Megaphone,
    Trash2
} from "lucide-react-native";
import React, { useEffect, useState, useCallback, useRef } from "react";
import {
    Alert,
    Animated,
    Easing,
    Modal,
    RefreshControl,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";

type MainTab = "messages" | "announcements";

export default function CommunicationPage() {
    const { isDark } = useTheme();
    const { profile } = useAuth();

    // Tabs
    const [mainTab, setMainTab] = useState<MainTab>("messages");

    // Loading states
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [directChatRefreshToken, setDirectChatRefreshToken] = useState(0);
    const [directChatComposeToken, setDirectChatComposeToken] = useState(0);
    const [lastChatRefreshAt, setLastChatRefreshAt] = useState<Date | null>(null);

    const [announcements, setAnnouncements] = useState<any[]>([]);

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
    const bgContainer = isDark ? "#161B22" : "#FFFFFF";

    // ─── Data Fetching ──────────────────────────────────────────────────────────

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

    const loadAnnouncementData = useCallback(async (isRefresh = false) => {
        if (!isRefresh) setLoading(true);
        await fetchAnnouncements();
        setLoading(false);
        setRefreshing(false);
    }, [fetchAnnouncements]);

    useEffect(() => {
        if (profile?.institution_id) {
            loadAnnouncementData();
        }
    }, [profile?.institution_id, loadAnnouncementData]);

    const onRefresh = () => {
        setRefreshing(true);
        loadAnnouncementData(true);
    };

    const onHeaderRefresh = useCallback(() => {
        setRefreshing(true);

        if (mainTab === "messages") {
            setDirectChatRefreshToken((prev) => prev + 1);
            setTimeout(() => {
                setDirectChatRefreshToken((prev) => prev + 1);
                setLastChatRefreshAt(new Date());
                setRefreshing(false);
            }, 600);
            return;
        }

        loadAnnouncementData(true);
    }, [mainTab, loadAnnouncementData]);

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
        return (
            <View className="flex-1 px-4 md:px-8 mt-4">
                <DirectChatView
                    allowedContactRoles={["teacher", "parent", "admin", "master_admin", "school_admin", "platform_admin"]}
                    searchPlaceholder="Search school contacts..."
                    emptyListTitle="No direct conversations"
                    externalRefreshToken={directChatRefreshToken}
                    externalComposeToken={directChatComposeToken}
                />
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
                        <View className="items-center py-16 bg-white dark:bg-[#161B22] rounded-3xl border border-dashed border-gray-100 dark:border-gray-800">
                            <Megaphone size={48} color="#E5E7EB" style={{ opacity: 0.3 }} />
                            <Text className="text-gray-400 dark:text-gray-500 font-bold mt-4 uppercase tracking-widest text-[10px]">No announcements posted</Text>
                        </View>
                    ) : (
                        announcements.map((item: any) => (
                            <View
                                key={item.id}
                                className="bg-white dark:bg-[#161B22] p-5 rounded-2xl border border-gray-50 dark:border-gray-800 mb-4 shadow-sm"
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
                fallbackPath="/(admin)"
                showNotification={false}
            />

            {/* Main Tabs Selection */}
            <View className="px-4 md:px-8 mt-4 flex-row justify-between items-center">
                <View className="flex-row bg-[#F6F8FA] dark:bg-[#161B22] p-1 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex-1 mr-4">
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
                        className={`bg-white dark:bg-[#161B22] w-10 h-10 rounded-xl items-center justify-center shadow active:bg-gray-100 dark:active:bg-gray-700 ${refreshing ? "opacity-50" : ""}`}
                        onPress={onHeaderRefresh}
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
                                setDirectChatComposeToken((prev) => prev + 1);
                            } else {
                                openAnnouncementModal();
                            }
                        }}
                    >
                        <Plus size={20} color="white" />
                    </TouchableOpacity>
                </View>
            </View>

            {mainTab === "messages" && lastChatRefreshAt ? (
                <View className="px-4 md:px-8 mt-1">
                    <Text className="text-[9px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">
                        Updated {lastChatRefreshAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                    </Text>
                </View>
            ) : null}

            {loading && !refreshing ? (
                <View className="flex-1 justify-center items-center">
                    <Spinner size="large" color="#FF6B00" label="Loading communication" />
                </View>
            ) : mainTab === "messages" ? (
                renderDirectMessagesTab()
            ) : (
                renderAnnouncementsTab()
            )}

            {/* Broadcast / Edit Announcement Modal */}
            <Modal visible={announcementModalVisible} animationType="slide" transparent>
                <View className="flex-1 bg-black/60 justify-end">
                    <View className="bg-white dark:bg-[#161B22] rounded-t-[36px] p-6 pb-10 border-t border-gray-100 dark:border-gray-800">
                        <View className="flex-row justify-between items-center mb-6">
                            <Text className="text-lg font-black text-gray-950 dark:text-white tracking-tight">
                                {editingAnnouncement ? "Edit Announcement" : "Post Updates"}
                            </Text>
                            <TouchableOpacity
                                className="w-8 h-8 bg-gray-100 dark:bg-[#161B22] rounded-full items-center justify-center"
                                onPress={closeAnnouncementModal}
                            >
                                <X size={18} color="#6B7280" />
                            </TouchableOpacity>
                        </View>

                        <Text className="text-gray-500 dark:text-gray-400 text-[9px] font-bold uppercase tracking-widest ml-1 mb-1.5">Announcement Title</Text>
                        <TextInput
                            className="bg-gray-50 dark:bg-[#161B22] rounded-xl px-4 py-3 text-slate-900 dark:text-white font-bold text-xs border border-gray-100 dark:border-gray-800 mb-4"
                            placeholder="e.g. End of Term Closure"
                            placeholderTextColor="#9CA3AF"
                            value={announcementTitle}
                            onChangeText={setAnnouncementTitle}
                        />

                        <Text className="text-gray-500 dark:text-gray-400 text-[9px] font-bold uppercase tracking-widest ml-1 mb-1.5">Announcement Message</Text>
                        <TextInput
                            className="bg-gray-50 dark:bg-[#161B22] rounded-2xl px-4 py-3 text-slate-900 dark:text-white font-medium text-xs border border-gray-100 dark:border-gray-800 h-28 mb-6"
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
                            accessibilityState={{ disabled: postingAnnouncement || !announcementTitle.trim() || !announcementMessage.trim(), busy: postingAnnouncement }}
                        >
                            {postingAnnouncement ? (
                                <Spinner color="white" label="Saving announcement" />
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
                    <View className="bg-white dark:bg-[#161B22] rounded-[32px] p-6 w-full max-w-sm border border-gray-100 dark:border-gray-800 shadow-2xl animate-fade-in">
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
                                className="flex-1 py-3.5 bg-[#F6F8FA] dark:bg-[#161B22] rounded-xl items-center border border-gray-100 dark:border-gray-700 active:opacity-90"
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
