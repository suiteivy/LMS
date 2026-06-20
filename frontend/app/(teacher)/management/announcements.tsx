import { UnifiedHeader } from "@/components/common/UnifiedHeader";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/libs/supabase";
import { showError, showSuccess } from "@/utils/toast";
import { router } from "expo-router";
import { Edit2, Megaphone, Plus, Send, Trash2, X } from 'lucide-react-native';
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Modal, Platform, RefreshControl, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';

interface Announcement {
    id: string;
    title: string;
    message: string;
    Subject_title: string;
    created_at: string;
    readCount: number;
    totalStudents: number;
    Subject_id: string;
}

const AnnouncementCard = ({ announcement, onDelete }: { announcement: Announcement; onDelete: (id: string) => void }) => {
    return (
        <View className="bg-white dark:bg-[#1a1a1a] p-5 rounded-3xl border border-gray-100 dark:border-gray-800 mb-4 shadow-sm">
            <View className="flex-row items-start mb-4">
                <View className="bg-orange-100 dark:bg-orange-950/20 p-2.5 rounded-2xl mr-4">
                    <Megaphone size={20} color="#FF6900" />
                </View>
                <View className="flex-1">
                    <Text className="text-gray-900 dark:text-white font-bold text-lg leading-tight">{announcement.title}</Text>
                    <Text className="text-[#FF6900] text-xs font-bold mt-1 uppercase tracking-wider">{announcement.Subject_title}</Text>
                </View>
            </View>

            <Text className="text-gray-600 dark:text-gray-400 text-sm mb-4 leading-5" numberOfLines={3}>
                {announcement.message}
            </Text>

            <View className="flex-row justify-between items-center pt-4 border-t border-gray-50 dark:border-gray-800">
                <Text className="text-gray-400 dark:text-gray-500 text-[10px] font-bold uppercase tracking-widest">
                    Posted {new Date(announcement.created_at).toLocaleDateString()}
                </Text>

                <View className="flex-row gap-2">
                    <TouchableOpacity className="w-10 h-10 bg-gray-50 dark:bg-[#1A1650] rounded-xl items-center justify-center">
                        <Edit2 size={16} color="#6B7280" />
                    </TouchableOpacity>
                    <TouchableOpacity
                        className="w-10 h-10 bg-red-50 dark:bg-red-950/20 rounded-xl items-center justify-center"
                        onPress={() => onDelete(announcement.id)}
                    >
                        <Trash2 size={16} color="#ef4444" />
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
};

export default function AnnouncementsPage() {
    const { teacherId, profile } = useAuth();
    const [showModal, setShowModal] = useState(false);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [Subjects, setSubjects] = useState<{ id: string; title: string }[]>([]);

    // Delete Confirmation State
    const [deleteModalVisible, setDeleteModalVisible] = useState(false);
    const [announcementToDelete, setAnnouncementToDelete] = useState<string | null>(null);

    // Form
    const [title, setTitle] = useState("");
    const [message, setMessage] = useState("");
    const [selectedSubjectId, setSelectedSubjectId] = useState("");

    useEffect(() => {
        if (teacherId) {
            fetchAnnouncements();
            fetchSubjects();
        }
    }, [teacherId]);

    const fetchSubjects = async () => {
        if (!teacherId) return;
        const { data } = await supabase.from('subjects').select('id, title').eq('teacher_id', teacherId);
        if (data) setSubjects(data);
    };

    const fetchAnnouncements = async (showSilent = false) => {
        if (!teacherId) return;
        if (!showSilent) setLoading(true);
        try {
            const { data, error } = await (supabase.from('announcements') as any)
                .select(`*, Subject:subjects(title)`)
                .eq('teacher_id', teacherId)
                .order('created_at', { ascending: false });

            if (error) throw error;

            const formatted = (data || []).map((a: any) => ({
                id: a.id,
                title: a.title,
                message: a.message,
                Subject_title: a.Subject?.title || "Unknown Subject",
                created_at: a.created_at,
                readCount: 0,
                totalStudents: 0,
                Subject_id: a.Subject_id
            }));

            setAnnouncements(formatted);
        } catch (error) {
            console.error("Error fetching announcements:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateAnnouncement = async () => {
        if (!teacherId) return;
        if (!title || !message || !selectedSubjectId) {
            showError("Missing Fields", "Please fill all fields and select a Subject.");
            return;
        }

        try {
            const { error } = await (supabase.from('announcements') as any).insert({
                teacher_id: teacherId,
                subject_id: selectedSubjectId,
                title,
                message,
                institution_id: profile?.institution_id
            });

            if (error) throw error;

            setShowModal(false);
            showSuccess("Success", "Announcement posted!");
            setTitle("");
            setMessage("");
            setSelectedSubjectId("");
            fetchAnnouncements();
        } catch (error) {
            showError("Error", "Failed to create announcement");
        }
    };

    const handleDeleteAnnouncement = (id: string) => {
        setAnnouncementToDelete(id);
        setDeleteModalVisible(true);
    };

    const confirmDeleteAnnouncement = async () => {
        if (!announcementToDelete) return;
        try {
            const { error } = await (supabase.from('announcements') as any).delete().eq('id', announcementToDelete);
            if (error) throw error;
            setAnnouncements(prev => prev.filter(a => a.id !== announcementToDelete));
            showSuccess("Success", "Announcement deleted");
        } catch (error) {
            showError("Error", "Failed to delete announcement");
        } finally {
            setDeleteModalVisible(false);
            setAnnouncementToDelete(null);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await Promise.all([fetchAnnouncements(true), fetchSubjects()]);
        setRefreshing(false);
    };

    return (
        <View className="flex-1 bg-gray-50 dark:bg-navy">
            <UnifiedHeader
                title="Management"
                subtitle="Live Broadcast"
                role="Teacher"
                onBack={() => router.push("/(teacher)/management")}
            />
            <ScrollView
                className="flex-1"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 100 }}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#FF6900"]} tintColor="#FF6900" />
                }
            >
                <View className="p-4 md:p-8">
                    {/* Header Row */}
                    <View className="flex-row justify-between items-center mb-6 px-2">
                        <View>
                            <Text className="text-gray-400 dark:text-gray-500 font-bold text-[10px] uppercase tracking-wider">
                                {announcements.length} posted announcements
                            </Text>
                        </View>
                        <TouchableOpacity
                            className="flex-row items-center bg-[#FF6900] px-5 py-2.5 rounded-2xl shadow-lg active:bg-orange-600"
                            onPress={() => setShowModal(true)}
                        >
                            <Plus size={18} color="white" />
                            <Text className="text-white font-bold text-xs ml-2 uppercase tracking-widest">New</Text>
                        </TouchableOpacity>
                    </View>
 
                    {/* Announcements List */}
                    {loading ? (
                        <ActivityIndicator size="large" color="#FF6900" className="mt-8" />
                    ) : announcements.length === 0 ? (
                        <View className="bg-white dark:bg-[#1a1a1a] p-12 rounded-[40px] items-center border border-gray-100 dark:border-gray-800 border-dashed">
                            <Megaphone size={48} color="#E5E7EB" style={{ opacity: 0.3 }} />
                            <Text className="text-gray-400 dark:text-gray-500 font-bold text-center mt-6 tracking-tight">No announcements posted yet.</Text>
                        </View>
                    ) : (
                        announcements.map((announcement) => (
                            <AnnouncementCard key={announcement.id} announcement={announcement} onDelete={handleDeleteAnnouncement} />
                        ))
                    )}
                </View>
            </ScrollView>

            {/* Create Modal */}
            <Modal visible={showModal} animationType="slide" transparent>
                <View className="flex-1 bg-black/50 justify-end">
                    <View className="bg-white dark:bg-[#0F0B2E] rounded-t-[40px] p-8 pb-12 border-t border-gray-100 dark:border-gray-800">
                        <View className="flex-row justify-between items-center mb-8">
                            <Text className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Post Update</Text>
                            <TouchableOpacity
                                className="w-10 h-10 bg-gray-50 dark:bg-[#1a1a1a] rounded-full items-center justify-center"
                                onPress={() => setShowModal(false)}
                            >
                                <X size={20} color="#6B7280" />
                            </TouchableOpacity>
                        </View>

                        <Text className="text-gray-500 dark:text-gray-400 text-[10px] font-bold uppercase tracking-wider ml-2 mb-2">Target Subject</Text>
                        <ScrollView horizontal className="flex-row mb-6" showsHorizontalScrollIndicator={false}>
                            {Subjects.map(c => (
                                <TouchableOpacity
                                    key={c.id}
                                    onPress={() => setSelectedSubjectId(c.id)}
                                    className={`mr-3 px-6 py-3 rounded-2xl border ${selectedSubjectId === c.id ? 'bg-[#FF6900] border-[#FF6900] shadow-sm' : 'bg-gray-50 dark:bg-[#1a1a1a] border-gray-100 dark:border-gray-800'}`}
                                >
                                    <Text className={`font-bold text-xs ${selectedSubjectId === c.id ? 'text-white' : 'text-gray-500 dark:text-gray-400'}`}>{c.title}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        <View className="mb-6">
                            <Text className="text-gray-500 dark:text-gray-400 text-[10px] font-bold uppercase tracking-wider ml-2 mb-2">Announcement Title</Text>
                            <TextInput
                                className="bg-gray-50 dark:bg-[#1a1a1a] rounded-2xl px-6 py-4 text-gray-900 dark:text-white font-bold border border-gray-100 dark:border-gray-800"
                                placeholder="e.g. Exam Schedule Changed"
                                placeholderTextColor="#9CA3AF"
                                value={title}
                                onChangeText={setTitle}
                            />
                        </View>

                        <View className="mb-8">
                            <Text className="text-gray-500 dark:text-gray-400 text-[10px] font-bold uppercase tracking-wider ml-2 mb-2">Message</Text>
                            <TextInput
                                className="bg-gray-50 dark:bg-[#1a1a1a] rounded-2xl px-6 py-4 text-gray-900 dark:text-white font-medium border border-gray-100 dark:border-gray-800 h-32"
                                placeholder="Write your message here..."
                                placeholderTextColor="#9CA3AF"
                                multiline
                                textAlignVertical="top"
                                value={message}
                                onChangeText={setMessage}
                            />
                        </View>

                        <TouchableOpacity
                            className="bg-[#FF6900] py-5 rounded-2xl items-center shadow-lg active:bg-orange-600 flex-row justify-center"
                            onPress={handleCreateAnnouncement}
                        >
                            <Send size={18} color="white" />
                            <Text className="text-white font-bold text-lg ml-3">Broadcast</Text>
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
