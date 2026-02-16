import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, StatusBar, Modal, TextInput, Alert, ActivityIndicator } from 'react-native';
import { ArrowLeft, Video, File, Image, Download, Trash2, X, Upload, FolderOpen, Link as LinkIcon, FileText, Copy } from 'lucide-react-native';
import { router } from "expo-router";
import { supabase } from "@/libs/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Database } from "@/types/database";

type Resource = Database['public']['Tables']['resources']['Row'] & {
    Subject_title?: string;
};

const ResourceCard = ({ resource, onDelete }: { resource: Resource; onDelete: (id: string) => void }) => {
    const getTypeIcon = (type: string) => {
        if (type === "pdf") return { icon: FileText, color: "#ef4444", bg: "#fee2e2" };
        if (type === "video") return { icon: Video, color: "#8b5cf6", bg: "#ede9fe" };
        if (type === "image") return { icon: Image, color: "#22c55e", bg: "#dcfce7" };
        if (type === "link") return { icon: LinkIcon, color: "#3b82f6", bg: "#dbeafe" };
        return { icon: File, color: "#9ca3af", bg: "#f3f4f6" };
    };

    const typeInfo = getTypeIcon(resource.type);
    const IconComponent = typeInfo.icon;

    return (
        <View className="bg-white p-4 rounded-xl border border-gray-100 mb-2 flex-row items-center shadow-sm">
            <View style={{ backgroundColor: typeInfo.bg }} className="w-10 h-10 rounded-xl items-center justify-center mr-3">
                <IconComponent size={20} color={typeInfo.color} />
            </View>
            <View className="flex-1">
                <Text className="text-gray-900 font-semibold" numberOfLines={1}>{resource.title}</Text>
                <Text className="text-gray-400 text-xs">
                    {resource.Subject_title || "Unknown Subject"} • {resource.type.toUpperCase()} {resource.size ? `• ${resource.size}` : ''}
                </Text>
                {resource.type === 'link' && (
                    <Text className="text-blue-400 text-[10px]" numberOfLines={1}>{resource.url}</Text>
                )}
            </View>
            <View className="flex-row gap-2">
                <TouchableOpacity className="p-2" onPress={() => Alert.alert("Download", `Opening ${resource.url}`)}>
                    <Download size={18} color="#6B7280" />
                </TouchableOpacity>
                <TouchableOpacity className="p-2" onPress={() => onDelete(resource.id)}>
                    <Trash2 size={18} color="#ef4444" />
                </TouchableOpacity>
            </View>
        </View>
    );
};

export default function ResourcesPage() {
    const { user, teacherId } = useAuth();
    const [showModal, setShowModal] = useState(false);
    const [loading, setLoading] = useState(true);
    const [resources, setResources] = useState<Resource[]>([]);
    const [Subjects, setSubjects] = useState<{ id: string; title: string }[]>([]);
    const [selectedDocument, setSelectedDocument] = useState()

    // Form
    const [title, setTitle] = useState("");
    const [url, setUrl] = useState("");
    const [type, setType] = useState<"link" | "pdf" | "video" | "other">("link");
    const [selectedSubjectId, setSelectedSubjectId] = useState("");


    useEffect(() => {
        if (teacherId) {
            fetchResources();
            fetchSubjects();
        }
    }, [teacherId]);

    const fetchSubjects = async () => {
        if (!teacherId) return;
        const { data } = await supabase.from('subjects').select('id, title').eq('teacher_id', teacherId);
        if (data) setSubjects(data);
    };

    const fetchResources = async () => {
        if (!teacherId) return;
        setLoading(true);
        try {
            // Fetch resources for Subjects taught by this teacher
            // Since we have RLS, we can just select all resources we have access to?
            // Wait, RLS for Select says: Teacher (own Subject), Student (enrolled).
            // So fetching all from 'resources' should work if RLS is correct.
            // But we might get resources from Subjects we are enrolled in (if teacher is also student?).
            // Let's filter by Subjects we teach to be safe and clean.

            // 1. Get Subject IDs
            const { data: mySubjects } = await supabase.from('subjects').select('id, title').eq('teacher_id', teacherId);
            const SubjectIds = (mySubjects || []).map(c => c.id);
            const SubjectMap = new Map(mySubjects?.map(c => [c.id, c.title]));

            if (SubjectIds.length === 0) {
                setResources([]);
                setLoading(false);
                return;
            }

            // 2. Fetch Resources
            const { data, error } = await supabase
                .from('resources')
                .select('*')
                .in('subject_id', SubjectIds)
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Cast data to ensure TS knows it's a list of Resource rows
            const typedData = (data || []) as Database['public']['Tables']['resources']['Row'][];

            const formatted = typedData.map(r => ({
                ...r,
                Subject_title: SubjectMap.get(r.subject_id),
                type: r.type as any
            }));

            setResources(formatted);

        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddResource = async () => {
        if (!user || !selectedSubjectId || !title || !url) {
            Alert.alert("Missing Fields", "Please fill all fields.");
            return;
        }

        try {
            const { error } = await supabase.from('resources').insert({
                subject_id: selectedSubjectId,
                title,
                url,
                type,
                size: null // Not handling file upload size for links
            });

            if (error) throw error;

            setShowModal(false);
            fetchResources();
            // Reset
            setTitle("");
            setUrl("");
            setType("link");
            setSelectedSubjectId("");
        } catch (error) {
            Alert.alert("Error", "Failed to add resource");
            console.error(error);
        }
    };

    const deleteResource = async (id: string) => {
        try {
            const { error } = await supabase.from('resources').delete().eq('id', id);
            if (error) throw error;
            setResources(prev => prev.filter(r => r.id !== id));
        } catch (error) {
            Alert.alert("Error", "Failed to delete resource");
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
                                    <Text className="text-2xl font-bold text-gray-900">Resources</Text>
                                    <Text className="text-gray-500 text-sm">{resources.length} items</Text>
                                </View>
                            </View>
                            <TouchableOpacity
                                className="flex-row items-center bg-teacherOrange px-4 py-2 rounded-xl"
                                onPress={() => setShowModal(true)}
                            >
                                <Upload size={18} color="white" />
                                <Text className="text-white font-semibold ml-1">Add</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Storage Info (Visual only for now) */}
                        <View className="bg-white p-4 rounded-2xl border border-gray-100 mb-6">
                            <View className="flex-row justify-between items-center mb-3">
                                <Text className="text-gray-900 font-bold">Storage Used</Text>
                                <Text className="text-gray-500 text-sm">Unlimited (Links)</Text>
                            </View>
                            <View className="h-3 bg-gray-100 rounded-full overflow-hidden">
                                <View className="h-full bg-teacherOrange rounded-full" style={{ width: "5%" }} />
                            </View>
                        </View>

                        {/* Resources List */}
                        <Text className="text-lg font-bold text-gray-900 mb-3">All Resources</Text>

                        {loading ? (
                            <ActivityIndicator size="large" color="#FF6B00" className="mt-8" />
                        ) : resources.length === 0 ? (
                            <Text className="text-gray-500 text-center mt-8">No resources found.</Text>
                        ) : (
                            resources.map((resource) => (
                                <ResourceCard key={resource.id} resource={resource} onDelete={deleteResource} />
                            ))
                        )}
                    </View>
                </ScrollView>
            </View>

            {/* Add Resource Modal */}
            <Modal visible={showModal} animationType="slide" transparent>
                <View className="flex-1 bg-black/50 justify-end">
                    <View className="bg-white rounded-t-3xl p-6">
                        <View className="flex-row justify-between items-center mb-6">
                            <Text className="text-xl font-bold text-gray-900">Add Resource</Text>
                            <TouchableOpacity onPress={() => setShowModal(false)}>
                                <X size={24} color="#6B7280" />
                            </TouchableOpacity>
                        </View>

                        {/* Subject Selector */}
                        <Text className="text-gray-500 text-xs uppercase mb-2 font-semibold">Subject</Text>
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

                        {/* Type Selector */}
                        <Text className="text-gray-500 text-xs uppercase mb-2 font-semibold">Type</Text>
                        <View className="flex-row mb-4 gap-2">
                            {(['link', 'video', 'pdf', 'other'] as const).map(t => (
                                <TouchableOpacity
                                    key={t}
                                    onPress={() => setType(t)}
                                    className={`px-3 py-2 rounded-lg border ${type === t ? 'bg-gray-800 border-gray-800' : 'bg-gray-50 border-gray-200'}`}
                                >
                                    <Text className={`capitalize ${type === t ? 'text-white' : 'text-gray-700'}`}>{t}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <TextInput
                            className="bg-gray-50 rounded-xl px-4 py-3 mb-4 text-gray-900"
                            placeholder="Title (e.g., Syllabus)"
                            placeholderTextColor="#9CA3AF"
                            value={title}
                            onChangeText={setTitle}
                        />
                        <TextInput
                            className="bg-gray-50 rounded-xl px-4 py-3 mb-6 text-gray-900"
                            placeholder="URL / Link"
                            placeholderTextColor="#9CA3AF"
                            value={url}
                            onChangeText={setUrl}
                            autoCapitalize="none"
                        />



                        <TouchableOpacity
                            className="bg-teacherOrange py-4 rounded-xl items-center"
                            onPress={handleAddResource}
                        >
                            <Text className="text-white font-bold text-base">Add Resource</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </>
    );
}
