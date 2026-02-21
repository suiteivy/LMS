import { UnifiedHeader } from "@/components/common/UnifiedHeader";
import { useAuth } from "@/contexts/AuthContext";
import { ResourceAPI } from "@/services/ResourceService";
import { SubjectAPI } from "@/services/SubjectService";
import { Database } from "@/types/database";
import { router } from "expo-router";
import { Download, File, FileText, Image, Link as LinkIcon, Trash2, Upload, Video, X } from 'lucide-react-native';
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';

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

    const typeInfo = getTypeIcon(resource.type || 'file');
    const IconComponent = typeInfo.icon;

    return (
        <View className="bg-white p-5 rounded-3xl border border-gray-100 mb-4 flex-row items-center shadow-sm">
            <View style={{ backgroundColor: typeInfo.bg }} className="w-12 h-12 rounded-2xl items-center justify-center mr-4">
                <IconComponent size={20} color={typeInfo.color} />
            </View>
            <View className="flex-1">
                <Text className="text-gray-900 font-bold text-base leading-tight" numberOfLines={1}>{resource.title}</Text>
                <Text className="text-gray-400 text-[10px] font-bold uppercase tracking-wider mt-1">
                    {resource.Subject_title || "Unknown"} • {resource.type}
                </Text>
            </View>
            <View className="flex-row gap-2">
                <TouchableOpacity className="w-10 h-10 bg-gray-50 rounded-xl items-center justify-center" onPress={() => Alert.alert("Download", `Opening ${resource.url}`)}>
                    <Download size={18} color="#6B7280" />
                </TouchableOpacity>
                <TouchableOpacity className="w-10 h-10 bg-red-50 rounded-xl items-center justify-center" onPress={() => onDelete(resource.id)}>
                    <Trash2 size={18} color="#ef4444" />
                </TouchableOpacity>
            </View>
        </View>
    );
};

export default function ResourcesPage() {
    const { teacherId } = useAuth();
    const [showModal, setShowModal] = useState(false);
    const [loading, setLoading] = useState(true);
    const [resources, setResources] = useState<Resource[]>([]);
    const [Subjects, setSubjects] = useState<{ id: string; title: string }[]>([]);

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
        try {
            const data = await SubjectAPI.getFilteredSubjects();
            if (data) setSubjects(data);
        } catch (error) {
            console.error(error);
        }
    };

    const fetchResources = async () => {
        setLoading(true);
        try {
            const data = await ResourceAPI.getResources();
            setResources(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddResource = async () => {
        if (!selectedSubjectId || !title || !url) {
            Alert.alert("Missing Fields", "Please fill all fields.");
            return;
        }
        try {
            await ResourceAPI.createResource({
                subject_id: selectedSubjectId,
                title,
                url,
                type,
                size: null
            });
            setShowModal(false);
            fetchResources();
            setTitle("");
            setUrl("");
            setType("link");
            setSelectedSubjectId("");
        } catch (error) {
            Alert.alert("Error", "Failed to add resource");
        }
    };

    const deleteResource = async (id: string) => {
        try {
            await ResourceAPI.deleteResource(id);
            setResources(prev => prev.filter(r => r.id !== id));
        } catch (error) {
            Alert.alert("Error", "Failed to delete resource");
        }
    };

    return (
        <View className="flex-1 bg-gray-50">
            <UnifiedHeader
                title="Academic"
                subtitle="Resources"
                role="Teacher"
                onBack={() => router.push("/(teacher)/management")}
            />
            <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
                <View className="p-4 md:p-8">
                    {/* Header Row */}
                    <View className="flex-row justify-between items-center mb-6 px-2">
                        <View>
                            <Text className="text-gray-400 font-bold text-[10px] uppercase tracking-wider">
                                {resources.length} library items
                            </Text>
                        </View>
                        <TouchableOpacity
                            className="flex-row items-center bg-gray-900 px-5 py-2.5 rounded-2xl shadow-lg active:bg-gray-800"
                            onPress={() => setShowModal(true)}
                        >
                            <Upload size={18} color="white" />
                            <Text className="text-white font-bold text-xs ml-2 uppercase tracking-widest">Upload</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Storage Info */}
                    <View className="bg-white p-6 rounded-[40px] border border-gray-100 mb-8 shadow-sm">
                        <View className="flex-row justify-between items-center mb-4">
                            <Text className="text-gray-900 font-bold text-base tracking-tight">Cloud Storage</Text>
                            <Text className="text-[#FF6900] font-bold text-xs uppercase tracking-widest">Unlimited</Text>
                        </View>
                        <View className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                            <View className="h-full bg-[#FF6900] rounded-full" style={{ width: "8%" }} />
                        </View>
                    </View>

                    {loading ? (
                        <ActivityIndicator size="large" color="#FF6900" className="mt-8" />
                    ) : resources.length === 0 ? (
                        <View className="bg-white p-12 rounded-[40px] items-center border border-gray-100 border-dashed">
                            <File size={48} color="#E5E7EB" />
                            <Text className="text-gray-400 font-bold text-center mt-6 tracking-tight">Your library is empty.</Text>
                        </View>
                    ) : (
                        resources.map((resource) => (
                            <ResourceCard key={resource.id} resource={resource} onDelete={deleteResource} />
                        ))
                    )}
                </View>
            </ScrollView>

            {/* Add Modal */}
            <Modal visible={showModal} animationType="slide" transparent>
                <View className="flex-1 bg-black/50 justify-end">
                    <View className="bg-white rounded-t-[40px] p-8 pb-12">
                        <View className="flex-row justify-between items-center mb-8">
                            <Text className="text-2xl font-bold text-gray-900 tracking-tight">Add Resource</Text>
                            <TouchableOpacity
                                className="w-10 h-10 bg-gray-50 rounded-full items-center justify-center"
                                onPress={() => setShowModal(false)}
                            >
                                <X size={20} color="#6B7280" />
                            </TouchableOpacity>
                        </View>

                        <Text className="text-gray-500 text-[10px] font-bold uppercase tracking-wider ml-2 mb-2">Subject</Text>
                        <ScrollView horizontal className="flex-row mb-6" showsHorizontalScrollIndicator={false}>
                            {Subjects.map(c => (
                                <TouchableOpacity
                                    key={c.id}
                                    onPress={() => setSelectedSubjectId(c.id)}
                                    className={`mr-3 px-6 py-3 rounded-2xl border ${selectedSubjectId === c.id ? 'bg-[#FF6900] border-[#FF6900] shadow-sm' : 'bg-gray-50 border-gray-100'}`}
                                >
                                    <Text className={`font-bold text-xs ${selectedSubjectId === c.id ? 'text-white' : 'text-gray-500'}`}>{c.title}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        <Text className="text-gray-500 text-[10px] font-bold uppercase tracking-wider ml-2 mb-2">Resource Type</Text>
                        <View className="flex-row mb-6 gap-3">
                            {(['link', 'video', 'pdf', 'other'] as const).map(t => (
                                <TouchableOpacity
                                    key={t}
                                    onPress={() => setType(t)}
                                    className={`flex-1 py-3 rounded-xl border items-center ${type === t ? 'bg-gray-900 border-gray-900' : 'bg-gray-50 border-gray-100'}`}
                                >
                                    <Text className={`font-bold text-[10px] uppercase tracking-widest ${type === t ? 'text-white' : 'text-gray-400'}`}>{t}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <View className="mb-6">
                            <Text className="text-gray-500 text-[10px] font-bold uppercase tracking-wider ml-2 mb-2">Title</Text>
                            <TextInput
                                className="bg-gray-50 rounded-2xl px-6 py-4 text-gray-900 font-bold border border-gray-100"
                                placeholder="e.g. Mathematics Syllabus"
                                value={title}
                                onChangeText={setTitle}
                            />
                        </View>

                        <View className="mb-10">
                            <Text className="text-gray-500 text-[10px] font-bold uppercase tracking-wider ml-2 mb-2">Resource URL</Text>
                            <TextInput
                                className="bg-gray-50 rounded-2xl px-6 py-4 text-gray-900 font-bold border border-gray-100"
                                placeholder="https://..."
                                value={url}
                                onChangeText={setUrl}
                                autoCapitalize="none"
                            />
                        </View>

                        <TouchableOpacity
                            className="bg-[#FF6900] py-5 rounded-2xl items-center shadow-lg active:bg-orange-600"
                            onPress={handleAddResource}
                        >
                            <Text className="text-white font-bold text-lg">Pin to Library</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}
