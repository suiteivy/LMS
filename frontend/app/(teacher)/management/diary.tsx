import { UnifiedHeader } from "@/components/common/UnifiedHeader";
import { useAuth } from "@/contexts/AuthContext";
import { DiaryAPI, DiaryEntry } from "@/services/DiaryService";
import { ClassAPI, ClassItem } from "@/services/ClassService";
import { showError, showSuccess } from "@/utils/toast";
import { router } from "expo-router";
import { BookOpen, Calendar, ChevronDown, Edit2, Plus, Send, Trash2, X, Zap } from 'lucide-react-native';
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Modal, ScrollView, Text, TextInput, TouchableOpacity, View, Platform } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Printer } from 'lucide-react-native';
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

    const [saving, setSaving] = useState(false);
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
        setLoading(true);
        try {
            const data = await ClassAPI.getClasses();
            setClasses(data);
            if (data.length > 0) {
                setSelectedClassId(data[0].id);
            }
        } catch (error: any) {
            console.error("Error fetching classes:", error);
            showError("Load Error", error.response?.data?.error || "Failed to load assigned classes.");
        } finally {
            setLoading(false);
        }
    };

    const fetchEntries = async () => {
        if (!selectedClassId) return;
        setLoading(true);
        try {
            const data = await DiaryAPI.getEntries(selectedClassId);
            setEntries(data);
        } catch (error: any) {
            console.error("Error fetching diary entries:", error);
            showError("Load Error", error.response?.data?.error || "Failed to load diary entries.");
        } finally {
            setLoading(false);
        }
    };

    const handleSaveEntry = async () => {
        if (!title.trim() || !content.trim() || !selectedClassId) {
            showError("Missing Fields", "Please fill both subject and notes.");
            return;
        }

        setSaving(true);
        try {
            if (editingEntryId) {
                await DiaryAPI.updateEntry(editingEntryId, { title: title.trim(), content: content.trim() });
                showSuccess("Success", "Diary entry updated!");
            } else {
                await DiaryAPI.createEntry({
                    class_id: selectedClassId,
                    title: title.trim(),
                    content: content.trim()
                });
                showSuccess("Success", "Diary entry created!");
            }

            setShowModal(false);
            setTitle("");
            setContent("");
            setEditingEntryId(null);
            fetchEntries();
        } catch (error: any) {
            console.error("Error saving diary entry:", error);
            showError("Save Error", error.response?.data?.error || "Failed to save diary entry. You might not have permission for this class.");
        } finally {
            setSaving(false);
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

    const handlePrint = async () => {
        if (!selectedClassId || entries.length === 0) {
            showError("No Data", "There are no entries to print for this class.");
            return;
        }

        try {
            const html = `
                <html>
                    <head>
                        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
                        <style>
                            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap');
                            body { font-family: 'Inter', sans-serif; padding: 40px; color: #1e293b; background: #fff; }
                            .header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 40px; border-bottom: 4px solid #FF6900; padding-bottom: 20px; }
                            .header-title h1 { margin: 0; color: #FF6900; font-size: 32px; font-weight: 800; text-transform: uppercase; letter-spacing: -0.5px; }
                            .header-title p { margin: 5px 0 0; color: #64748b; font-size: 14px; font-weight: 500; }
                            .header-meta { text-align: right; color: #64748b; font-size: 12px; font-weight: 600; }
                            .section-header { font-size: 18px; font-weight: 700; color: #0f172a; margin-bottom: 20px; background: #f8fafc; padding: 10px 20px; border-radius: 8px; }
                            .entry { margin-bottom: 25px; padding: 25px; border: 1px solid #e2e8f0; border-radius: 16px; page-break-inside: avoid; position: relative; }
                            .entry-date { position: absolute; top: -10px; right: 20px; background: #FF6900; color: white; padding: 4px 12px; border-radius: 20px; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; }
                            .entry-title { font-size: 18px; font-weight: 700; color: #0f172a; margin-bottom: 12px; }
                            .entry-content { font-size: 14px; line-height: 1.6; color: #475569; white-space: pre-wrap; }
                            .entry-footer { margin-top: 15px; padding-top: 10px; border-top: 1px dashed #e2e8f0; display: flex; justify-content: space-between; font-size: 11px; color: #94a3b8; font-weight: 600; }
                            .footer { margin-top: 60px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 20px; }
                            @media print {
                                body { padding: 20px; }
                                .entry { border-color: #eee; }
                            }
                        </style>
                    </head>
                    <body>
                        <div class="header">
                            <div class="header-title">
                                <h1>Class Diary</h1>
                                <p>${selectedClassName}</p>
                            </div>
                            <div class="header-meta">
                                <div>REPORT DATE: ${new Date().toLocaleDateString()}</div>
                                <div>ENTRIES: ${entries.length}</div>
                            </div>
                        </div>
                        
                        <div class="section-header">Academic Activities & Observations</div>

                        ${entries.map(e => `
                            <div class="entry">
                                <div class="entry-date">${new Date(e.entry_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                                <div class="entry-title">${e.title}</div>
                                <div class="entry-content">${e.content}</div>
                                <div class="entry-footer">
                                    <span>Teacher: ${e.teacher?.users?.full_name || "Assigned Teacher"}</span>
                                    <span>${new Date(e.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                            </div>
                        `).join('')}

                        <div class="footer">
                            <p>© ${new Date().getFullYear()} LMS Educational Platform • Virtual Diary System • Confidential Document</p>
                        </div>
                    </body>
                </html>
            `;

            if (Platform.OS === 'web') {
                const printWindow = window.open('', '_blank');
                printWindow?.document.write(html);
                printWindow?.document.close();
                printWindow?.print();
            } else {
                const { uri } = await Print.printToFileAsync({ html });
                await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
            }
        } catch (error) {
            console.error('Print error:', error);
            showError("Print Error", "Failed to generate diary report.");
        }
    };

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
                    {classes.length === 0 && !loading ? (
                        <View className="bg-white dark:bg-[#1a1a1a] p-12 rounded-[40px] items-center border border-gray-100 dark:border-gray-800 border-dashed mt-8">
                            <View className="bg-orange-100 dark:bg-orange-950/20 p-6 rounded-full mb-6">
                                <BookOpen size={48} color="#FF6900" />
                            </View>
                            <Text className="text-xl font-bold text-gray-900 dark:text-white text-center mb-3">No Classes Assigned</Text>
                            <Text className="text-gray-500 dark:text-gray-400 text-center mb-8 leading-6">
                                You haven&apos;t been assigned to any classes yet. Please contact your administrator to assign you a class before you can create diary entries.
                            </Text>
                            <TouchableOpacity
                                className="bg-gray-100 dark:bg-gray-800 px-8 py-4 rounded-2xl active:bg-gray-200"
                                onPress={() => router.push("/(teacher)")}
                            >
                                <Text className="text-gray-600 dark:text-gray-300 font-bold uppercase tracking-widest text-xs">Return to Dashboard</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <>
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

                            <View className="flex-row justify-between items-center mb-6 px-2">
                                <Text className="text-gray-400 dark:text-gray-500 font-bold text-[10px] uppercase tracking-wider">
                                    {entries.length} Entries found
                                </Text>
                                <View className="flex-row gap-2">
                                    <TouchableOpacity
                                        className="flex-row items-center bg-white dark:bg-[#1a1a1a] px-4 py-2.5 rounded-2xl border border-gray-100 dark:border-gray-800 active:bg-gray-50"
                                        onPress={handlePrint}
                                    >
                                        <Printer size={18} color={Platform.OS === 'web' ? '#6B7280' : '#FF6900'} />
                                        <Text className="text-gray-600 dark:text-gray-400 font-bold text-xs ml-2 uppercase tracking-widest">Print</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        className="flex-row items-center bg-[#FF6900] px-5 py-2.5 rounded-2xl shadow-lg active:bg-orange-600"
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
                            </View>

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
                        </>
                    )}
                </View>

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
                                    disabled={saving}
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
                                    editable={!saving}
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
                                    editable={!saving}
                                />
                            </View>

                            <TouchableOpacity
                                className={`py-5 rounded-2xl items-center shadow-lg flex-row justify-center ${saving ? 'bg-orange-300' : 'bg-[#FF6900] active:bg-orange-600'}`}
                                onPress={handleSaveEntry}
                                disabled={saving}
                            >
                                {saving ? (
                                    <ActivityIndicator size="small" color="white" />
                                ) : (
                                    <Send size={18} color="white" />
                                )}
                                <Text className="text-white font-bold text-lg ml-3">
                                    {saving ? "Saving..." : (editingEntryId ? "Update" : "Save Entry")}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>
            </SubscriptionGate>
        </View>
    );
}
