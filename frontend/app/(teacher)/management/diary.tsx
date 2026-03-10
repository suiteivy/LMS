import { UnifiedHeader } from "@/components/common/UnifiedHeader";
import { useAuth } from "@/contexts/AuthContext";
import { DiaryAPI, DiaryEntry } from "@/services/DiaryService";
import { ClassAPI, ClassItem } from "@/services/ClassService";
import { showError, showSuccess } from "@/utils/toast";
import { router } from "expo-router";
import { BookOpen, Calendar, ChevronDown, Edit2, Pencil, Plus, Send, Trash2, X, Zap } from 'lucide-react-native';
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SubscriptionGate, AddonRequestButton } from "@/components/shared/SubscriptionComponents";

const DiaryCard = ({ entry, onDelete, onEdit }: { entry: DiaryEntry; onDelete: (id: string) => void; onEdit: (entry: DiaryEntry) => void }) => {
    return (
        <View className="bg-white dark:bg-[#1a1a1a] p-5 rounded-3xl border border-gray-100 dark:border-gray-800 mb-4 shadow-sm">
            <View className="flex-row items-start mb-4">
                <View className="bg-orange-100 dark:bg-orange-950/20 p-2.5 rounded-2xl mr-4">
                    <BookOpen size={20} color="#FF6900" />
                </View>
                <View className="flex-1">
                    <Text className="text-gray-900 dark:text-white font-bold text-lg leading-tight">{entry.title}</Text>
                    <View className="flex-row items-center mt-1">
                        <Calendar size={12} color="#9CA3AF" />
                        <Text className="text-gray-400 dark:text-gray-500 text-[10px] font-bold uppercase tracking-widest ml-1">
                            {new Date(entry.entry_date).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
                        </Text>
                    </View>
                </View>
            </View>

            <Text className="text-gray-600 dark:text-gray-400 text-sm mb-4 leading-5">
                {entry.content}
            </Text>

            <View className="flex-row justify-between items-center pt-4 border-t border-gray-50 dark:border-gray-800">
                <Text className="text-gray-400 dark:text-gray-500 text-[10px] uppercase tracking-widest">
                    Teacher: {entry.teacher?.users?.full_name || "Self"}
                </Text>

                <View className="flex-row gap-2">
                    <TouchableOpacity
                        className="w-10 h-10 bg-gray-50 dark:bg-[#1A1650] rounded-xl items-center justify-center"
                        onPress={() => onEdit(entry)}
                    >
                        <Edit2 size={16} color="#6B7280" />
                    </TouchableOpacity>
                    <TouchableOpacity
                        className="w-10 h-10 bg-red-50 dark:bg-red-950/20 rounded-xl items-center justify-center"
                        onPress={() => onDelete(entry.id)}
                    >
                        <Trash2 size={16} color="#ef4444" />
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
};

export default function TeacherDiaryPage() {
    const { teacherId } = useAuth();
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [entries, setEntries] = useState<DiaryEntry[]>([]);
    const [classes, setClasses] = useState<ClassItem[]>([]);
    const [selectedClassId, setSelectedClassId] = useState("");
    const [showClassDropdown, setShowClassDropdown] = useState(false);

    // Form
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [editingEntryId, setEditingEntryId] = useState<string | null>(null);

    useEffect(() => {
        fetchClasses();
    }, []);

    useEffect(() => {
        if (selectedClassId) {
            fetchEntries();
        }
    }, [selectedClassId]);

    const fetchClasses = async () => {
        try {
            const data = await ClassAPI.getClasses();
            setClasses(data);
            if (data.length > 0) {
                setSelectedClassId(data[0].id);
            }
        } catch (error) {
            console.error("Error fetching classes:", error);
        }
    };

    const fetchEntries = async () => {
        if (!selectedClassId) return;
        setLoading(true);
        try {
            const data = await DiaryAPI.getEntries(selectedClassId);
            setEntries(data);
        } catch (error) {
            console.error("Error fetching diary entries:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveEntry = async () => {
        if (!title || !content || !selectedClassId) {
            showError("Missing Fields", "Please fill all fields.");
            return;
        }

        try {
            if (editingEntryId) {
                await DiaryAPI.updateEntry(editingEntryId, { title, content });
                showSuccess("Success", "Diary entry updated!");
            } else {
                await DiaryAPI.createEntry({
                    class_id: selectedClassId,
                    title,
                    content
                });
                showSuccess("Success", "Diary entry created!");
            }

            setShowModal(false);
            setTitle("");
            setContent("");
            setEditingEntryId(null);
            fetchEntries();
        } catch (error) {
            showError("Error", "Failed to save diary entry");
        }
    };

    const handleDeleteEntry = async (id: string) => {
        try {
            await DiaryAPI.deleteEntry(id);
            setEntries(prev => prev.filter(e => e.id !== id));
            showSuccess("Success", "Entry deleted");
        } catch (error) {
            showError("Error", "Failed to delete entry");
        }
    };

    const handleEditEntry = (entry: DiaryEntry) => {
        setTitle(entry.title);
        setContent(entry.content);
        setEditingEntryId(entry.id);
        setShowModal(true);
    };

    const selectedClassName = classes.find(c => c.id === selectedClassId)?.name || "Select Class";

    return (
        <View className="flex-1 bg-gray-50 dark:bg-navy">
            <UnifiedHeader
                title="Management"
                subtitle="Virtual Diary"
                role="Teacher"
                onBack={() => router.push("/(teacher)/management")}
            />

            <SubscriptionGate 
                feature="diary"
                fallback={
                    <View className="flex-1 items-center justify-center p-8">
                        <View className="bg-orange-50 p-8 rounded-[40px] items-center border border-orange-100 border-dashed max-w-sm">
                            <Zap size={48} color="#FF6900" style={{ marginBottom: 20 }} />
                            <Text className="text-xl font-bold text-gray-900 text-center mb-2">Feature Locked</Text>
                            <Text className="text-gray-500 text-center mb-8 leading-5">
                                The Virtual Diary module is not included in your current subscription plan.
                            </Text>
                            <AddonRequestButton onPress={() => { /* Handle request modal */ }} />
                        </View>
                    </View>
                }
            >

            <View className="p-4 md:p-8 flex-1">
                {/* Class Selection */}
                <View className="mb-6 relative z-10">
                    <TouchableOpacity
                        className="bg-white dark:bg-[#1a1a1a] rounded-3xl px-6 py-4 border border-gray-100 dark:border-gray-800 flex-row items-center justify-between shadow-sm"
                        onPress={() => setShowClassDropdown(!showClassDropdown)}
                    >
                        <View className="flex-row items-center">
                            <BookOpen size={18} color="#FF6900" className="mr-3" />
                            <Text className="text-gray-900 dark:text-gray-100 font-bold text-sm">{selectedClassName}</Text>
                        </View>
                        <ChevronDown size={18} color="#6B7280" />
                    </TouchableOpacity>

                    {showClassDropdown && (
                        <View className="absolute top-16 left-0 right-0 bg-white dark:bg-[#1a1a1a] border border-gray-100 dark:border-gray-800 rounded-[32px] shadow-2xl z-20 overflow-hidden">
                            {classes.map(cls => (
                                <TouchableOpacity
                                    key={cls.id}
                                    className="px-6 py-4 border-b border-gray-50 dark:border-gray-900 active:bg-gray-50 dark:active:bg-gray-900"
                                    onPress={() => {
                                        setSelectedClassId(cls.id);
                                        setShowClassDropdown(false);
                                    }}
                                >
                                    <Text className="text-gray-900 dark:text-gray-100 font-bold text-sm">{cls.name}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}
                </View>

                {/* Header Row */}
                <View className="flex-row justify-between items-center mb-6 px-2">
                    <Text className="text-gray-400 dark:text-gray-500 font-bold text-[10px] uppercase tracking-wider">
                        {entries.length} Entries found
                    </Text>
                    <TouchableOpacity
                        className="flex-row items-center bg-[#FF6900] px-5 py-2.5 rounded-2xl shadow-lg"
                        onPress={() => {
                            setEditingEntryId(null);
                            setTitle("");
                            setContent("");
                            setShowModal(true);
                        }}
                    >
                        <Plus size={18} color="white" />
                        <Text className="text-white font-bold text-xs ml-2 uppercase tracking-widest">Add Entry</Text>
                    </TouchableOpacity>
                </View>

                {/* List */}
                <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
                    {loading ? (
                        <ActivityIndicator size="large" color="#FF6900" className="mt-8" />
                    ) : entries.length === 0 ? (
                        <View className="bg-white dark:bg-[#1a1a1a] p-12 rounded-[40px] items-center border border-gray-100 dark:border-gray-800 border-dashed">
                            <BookOpen size={48} color="#E5E7EB" style={{ opacity: 0.3 }} />
                            <Text className="text-gray-400 dark:text-gray-500 font-bold text-center mt-6 tracking-tight">No diary entries for this class.</Text>
                        </View>
                    ) : (
                        entries.map((entry) => (
                            <DiaryCard
                                key={entry.id}
                                entry={entry}
                                onDelete={handleDeleteEntry}
                                onEdit={handleEditEntry}
                            />
                        ))
                    )}
                </ScrollView>
            </View>

            {/* Modal */}
            <Modal visible={showModal} animationType="slide" transparent>
                <View className="flex-1 bg-black/50 justify-end">
                    <View className="bg-white dark:bg-[#0F0B2E] rounded-t-[40px] p-8 pb-12 border-t border-gray-100 dark:border-gray-800">
                        <View className="flex-row justify-between items-center mb-8">
                            <Text className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
                                {editingEntryId ? "Edit Entry" : "New Diary Entry"}
                            </Text>
                            <TouchableOpacity
                                className="w-10 h-10 bg-gray-50 dark:bg-[#1a1a1a] rounded-full items-center justify-center"
                                onPress={() => setShowModal(false)}
                            >
                                <X size={20} color="#6B7280" />
                            </TouchableOpacity>
                        </View>

                        <View className="mb-6">
                            <Text className="text-gray-500 dark:text-gray-400 text-[10px] font-bold uppercase tracking-wider ml-2 mb-2">Subject/Title</Text>
                            <TextInput
                                className="bg-gray-50 dark:bg-[#1a1a1a] rounded-2xl px-6 py-4 text-gray-900 dark:text-white font-bold border border-gray-100 dark:border-gray-800"
                                placeholder="e.g. Mathematics - Introduction to Algebra"
                                placeholderTextColor="#9CA3AF"
                                value={title}
                                onChangeText={setTitle}
                            />
                        </View>

                        <View className="mb-8">
                            <Text className="text-gray-500 dark:text-gray-400 text-[10px] font-bold uppercase tracking-wider ml-2 mb-2">Activities/Notes</Text>
                            <TextInput
                                className="bg-gray-50 dark:bg-[#1a1a1a] rounded-2xl px-6 py-4 text-gray-900 dark:text-white font-medium border border-gray-100 dark:border-gray-800 h-32"
                                placeholder="What did the students do today?"
                                placeholderTextColor="#9CA3AF"
                                multiline
                                textAlignVertical="top"
                                value={content}
                                onChangeText={setContent}
                            />
                        </View>

                        <TouchableOpacity
                            className="bg-[#FF6900] py-5 rounded-2xl items-center shadow-lg active:bg-orange-600 flex-row justify-center"
                            onPress={handleSaveEntry}
                        >
                            <Send size={18} color="white" />
                            <Text className="text-white font-bold text-lg ml-3">{editingEntryId ? "Update" : "Save Entry"}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
            </SubscriptionGate>
        </View>
    );
}
