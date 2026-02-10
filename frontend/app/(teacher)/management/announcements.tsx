import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, StatusBar, TextInput, Modal, ActivityIndicator } from 'react-native';
import { ArrowLeft, Plus, Megaphone, Send, Edit2, Trash2, X, Users, Clock, ChevronDown } from 'lucide-react-native';
import { router } from "expo-router";
import { supabase } from "@/libs/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { showSuccess, showError } from "@/utils/toast";

interface Announcement {
    id: string;
    title: string;
    message: string;
    Subject_title: string;
    created_at: string;
    readCount: number; // Placeholder
    totalStudents: number; // Placeholder
    Subject_id: string;
}

const AnnouncementCard = ({ announcement, onDelete }: { announcement: Announcement; onDelete: (id: string) => void }) => {
    return (
        <View className="bg-white p-4 rounded-2xl border border-gray-100 mb-3 shadow-sm">
            <View className="flex-row items-start mb-3">
                <View className="bg-orange-100 p-2 rounded-xl mr-3">
                    <Megaphone size={20} color="#FF6B00" />
                </View>
                <View className="flex-1">
                    <Text className="text-gray-900 font-bold text-base">{announcement.title}</Text>
                    <Text className="text-gray-400 text-xs">{announcement.Subject_title}</Text>
                </View>
            </View>

            <Text className="text-gray-600 text-sm mb-3" numberOfLines={2}>
                {announcement.message}
            </Text>

            <View className="flex-row justify-between items-center">
                <View className="flex-row items-center">
                    <Clock size={12} color="#9CA3AF" />
                    <Text className="text-gray-400 text-xs ml-1">{new Date(announcement.created_at).toLocaleDateString()}</Text>
                </View>
                {/* 
                <View className="flex-row items-center">
                    <Users size={12} color="#9CA3AF" />
                    <Text className="text-gray-400 text-xs ml-1">
                        {announcement.readCount}/{announcement.totalStudents} read
                    </Text>
                </View>
                */}
            </View>

            <View className="flex-row justify-end gap-3 mt-3 pt-3 border-t border-gray-100">
                {/* Edit functionality to be implemented */}
                <TouchableOpacity className="flex-row items-center p-2">
                    <Edit2 size={16} color="#6B7280" />
                    <Text className="text-gray-500 text-xs ml-1 font-medium">Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity className="flex-row items-center p-2" onPress={() => onDelete(announcement.id)}>
                    <Trash2 size={16} color="#ef4444" />
                    <Text className="text-red-500 text-xs ml-1 font-medium">Delete</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

export default function AnnouncementsPage() {
    const { user, teacherId } = useAuth();
    const [showModal, setShowModal] = useState(false);
    const [loading, setLoading] = useState(true);
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [Subjects, setSubjects] = useState<{ id: string; title: string }[]>([]);

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

    const fetchAnnouncements = async () => {
        if (!teacherId) return;
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('announcements')
                .select(`
                    *,
                    Subject:subjects(title)
                `)
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
            const { error } = await supabase.from('announcements').insert({
                teacher_id: teacherId,
                subject_id: selectedSubjectId,
                title,
                message
            });

            if (error) throw error;

            setShowModal(false);
            showSuccess("Success", "Announcement posted!");
            // Reset
            setTitle("");
            setMessage("");
            setSelectedSubjectId("");
        } catch (error) {
            showError("Error", "Failed to create announcement");
            console.error(error);
        }
    };

    const deleteAnnouncement = async (id: string) => {
        try {
            const { error } = await supabase.from('announcements').delete().eq('id', id);
            if (error) throw error;
            setAnnouncements(prev => prev.filter(a => a.id !== id));
            showSuccess("Success", "Announcement deleted");
        } catch (error) {
            showError("Error", "Failed to delete announcement");
        }
    };

    return (
        <>
            <StatusBar barStyle="dark-content" />
            <View className="flex-1 bg-gray-50">
                <ScrollView
                    className="flex-1"
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 100 }}
                >
                    <View className="p-4">
                        {/* Header */}
                        <View className="flex-row items-center justify-between mb-6">
                            <View className="flex-row items-center">
                                <TouchableOpacity className="p-2 mr-2" onPress={() => router.back()}>
                                    <ArrowLeft size={24} color="#374151" />
                                </TouchableOpacity>
                                <View>
                                    <Text className="text-2xl font-bold text-gray-900">Announcements</Text>
                                    <Text className="text-gray-500 text-sm">{announcements.length} posted</Text>
                                </View>
                            </View>
                            <TouchableOpacity
                                className="flex-row items-center bg-teacherOrange px-4 py-2 rounded-xl"
                                onPress={() => setShowModal(true)}
                            >
                                <Plus size={18} color="white" />
                                <Text className="text-white font-semibold ml-1">New</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Announcements List */}
                        {loading ? (
                            <ActivityIndicator size="large" color="#FF6B00" className="mt-8" />
                        ) : announcements.length === 0 ? (
                            <Text className="text-gray-500 text-center mt-8">No announcements found.</Text>
                        ) : (
                            announcements.map((announcement) => (
                                <AnnouncementCard key={announcement.id} announcement={announcement} onDelete={deleteAnnouncement} />
                            ))
                        )}
                    </View>
                </ScrollView>
            </View>

            {/* Create Announcement Modal */}
            <Modal visible={showModal} animationType="slide" transparent>
                <View className="flex-1 bg-black/50 justify-end">
                    <View className="bg-white rounded-t-3xl p-6">
                        <View className="flex-row justify-between items-center mb-6">
                            <Text className="text-xl font-bold text-gray-900">New Announcement</Text>
                            <TouchableOpacity onPress={() => setShowModal(false)}>
                                <X size={24} color="#6B7280" />
                            </TouchableOpacity>
                        </View>

                        {/* Subject Selector */}
                        <Text className="text-gray-500 text-xs uppercase mb-2 font-semibold">Select Subject</Text>
                        <ScrollView horizontal className="flex-row mb-4" showsHorizontalScrollIndicator={false}>
                            {Subjects.map(c => (
                                <TouchableOpacity
                                    key={c.id}
                                    onPress={() => setSelectedSubjectId(c.id)}
                                    className={`mr-2 px-4 py-2 rounded-lg border ${selectedSubjectId === c.id ? 'bg-teacherOrange border-teacherOrange' : 'bg-gray-50 border-gray-200'}`}
                                >
                                    <Text className={selectedSubjectId === c.id ? 'text-white' : 'text-gray-700'}>{c.title}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        <TextInput
                            className="bg-gray-50 rounded-xl px-4 py-3 mb-4 text-gray-900"
                            placeholder="Title"
                            placeholderTextColor="#9CA3AF"
                            value={title}
                            onChangeText={setTitle}
                        />
                        <TextInput
                            className="bg-gray-50 rounded-xl px-4 py-3 mb-4 text-gray-900 h-32"
                            placeholder="Message"
                            placeholderTextColor="#9CA3AF"
                            multiline
                            textAlignVertical="top"
                            value={message}
                            onChangeText={setMessage}
                        />

                        <TouchableOpacity
                            className="bg-teacherOrange py-4 rounded-xl items-center flex-row justify-center"
                            onPress={handleCreateAnnouncement}
                        >
                            <Send size={18} color="white" />
                            <Text className="text-white font-bold text-base ml-2">Post Announcement</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </>
    );
}
