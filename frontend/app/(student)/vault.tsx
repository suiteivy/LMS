import { UnifiedHeader } from "@/components/common/UnifiedHeader";
import { ListItemSkeleton } from "@/components/ui/skeletons";
import { useAuth } from "@/contexts/AuthContext";
import { ResourceAPI, Resource } from "@/services/ResourceService";
import { 
    BookOpen, Download, File as FileIcon, FileText, Image, Link as LinkIcon, 
    Video, Search, Layers, Globe
} from 'lucide-react-native';
import React, { useEffect, useState, useMemo } from "react";
import { Alert, Linking, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";

export default function StudentAcademicVault() {
    const { studentId } = useAuth();
    const [loading, setLoading] = useState(true);
    const [resources, setResources] = useState<Resource[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedType, setSelectedType] = useState<string>("all");

    useEffect(() => {
        loadVault();
    }, [studentId]);

    const loadVault = async () => {
        setLoading(true);
        try {
            const data = await ResourceAPI.getResources();
            setResources(data || []);
        } catch (error) {
            console.error("Failed to load academic vault:", error);
        } finally {
            setLoading(false);
        }
    };

    const getTypeIcon = (type: string) => {
        if (type === "pdf") return { icon: FileText, color: "#ef4444", bg: "#fee2e2" };
        if (type === "video") return { icon: Video, color: "#8b5cf6", bg: "#ede9fe" };
        if (type === "image") return { icon: Image, color: "#22c55e", bg: "#dcfce7" };
        if (type === "link") return { icon: LinkIcon, color: "#3b82f6", bg: "#dbeafe" };
        return { icon: FileIcon, color: "#9ca3af", bg: "#f3f4f6" };
    };

    const handleOpen = async (resource: Resource) => {
        if (!resource.url) return;
        try {
            if (Platform.OS === 'web') {
                window.open(resource.url, '_blank');
            } else {
                const supported = await Linking.canOpenURL(resource.url);
                if (supported) {
                    await Linking.openURL(resource.url);
                } else {
                    Alert.alert("Resource Link", resource.url);
                }
            }
        } catch (err) {
            Alert.alert("Error", "Could not open resource link");
        }
    };

    const filteredResources = useMemo(() => {
        return resources.filter(r => {
            const matchesType = selectedType === "all" || r.type === selectedType;
            const matchesQuery = !searchQuery.trim() || 
                r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (r.Subject_title && r.Subject_title.toLowerCase().includes(searchQuery.toLowerCase()));
            return matchesType && matchesQuery;
        });
    }, [resources, selectedType, searchQuery]);

    return (
        <View className="flex-1 bg-[#F6F8FA] dark:bg-[#161B22]">
            <UnifiedHeader
                title="Academic"
                subtitle="Academic Vault"
                role="Student"
                fallbackPath="/(student)"
            />
            <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>
                <View className="p-4 md:p-6">
                    {/* Header & Search */}
                    <View className="mb-5">
                        <Text className="text-gray-900 dark:text-white font-bold text-lg">Academic Resources & Materials</Text>
                        <Text className="text-xs text-gray-500 mt-0.5">Access revision guides, lecture notes, and classroom materials.</Text>

                        <View className="flex-row items-center bg-white dark:bg-[#0D1117] rounded-xl px-3.5 py-2.5 mt-3 border border-gray-200 dark:border-gray-800 shadow-sm">
                            <Search size={16} color="#9CA3AF" />
                            <TextInput
                                className="flex-1 ml-2 text-xs text-gray-900 dark:text-white font-medium"
                                placeholder="Search by title or subject..."
                                placeholderTextColor="#9CA3AF"
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                            />
                        </View>
                    </View>

                    {/* Filter Type Tabs */}
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row mb-5">
                        {[
                            { id: "all", label: "All Formats" },
                            { id: "pdf", label: "PDFs" },
                            { id: "doc", label: "Documents" },
                            { id: "video", label: "Videos" },
                            { id: "link", label: "Web Links" },
                        ].map(tab => (
                            <TouchableOpacity
                                key={tab.id}
                                onPress={() => setSelectedType(tab.id)}
                                activeOpacity={0.7}
                                className={`mr-2.5 px-3.5 py-2 rounded-xl border ${selectedType === tab.id ? 'bg-[#FF6900] border-[#FF6900]' : 'bg-white dark:bg-[#0D1117] border-gray-200 dark:border-gray-800'}`}
                            >
                                <Text className={`text-xs font-bold ${selectedType === tab.id ? 'text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                                    {tab.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                    {/* Resource List */}
                    {loading ? (
                        <ListItemSkeleton loading={loading} count={4} label="Loading learning materials..." />
                    ) : filteredResources.length === 0 ? (
                        <View className="bg-white dark:bg-[#0D1117] p-10 rounded-2xl items-center border border-gray-200 dark:border-gray-800 border-dashed">
                            <BookOpen size={40} color="#9CA3AF" />
                            <Text className="text-gray-500 font-bold text-xs mt-3">No learning materials found</Text>
                        </View>
                    ) : (
                        filteredResources.map(resource => {
                            const typeInfo = getTypeIcon(resource.type);
                            const IconComp = typeInfo.icon;
                            return (
                                <View 
                                    key={resource.id} 
                                    className="bg-white dark:bg-[#0D1117] p-4 rounded-2xl border border-gray-200 dark:border-gray-800 mb-3 flex-row items-center justify-between shadow-sm"
                                >
                                    <View className="flex-row items-center flex-1 mr-3">
                                        <View style={{ backgroundColor: typeInfo.bg }} className="w-11 h-11 rounded-xl items-center justify-center mr-3.5">
                                            <IconComp size={20} color={typeInfo.color} />
                                        </View>
                                        <View className="flex-1">
                                            <Text className="text-gray-900 dark:text-white font-bold text-sm leading-snug" numberOfLines={1}>
                                                {resource.title}
                                            </Text>
                                            <View className="flex-row items-center gap-1.5 mt-1 flex-wrap">
                                                <Text className="text-[#FF6900] text-[10px] font-bold uppercase tracking-wider">
                                                    {resource.Subject_title || "General"}
                                                </Text>
                                                {resource.Class_name ? (
                                                    <Text className="text-gray-400 text-[10px] uppercase">
                                                        • {resource.Class_name}
                                                    </Text>
                                                ) : null}
                                            </View>
                                        </View>
                                    </View>

                                    <TouchableOpacity
                                        onPress={() => handleOpen(resource)}
                                        activeOpacity={0.7}
                                        className="w-10 h-10 bg-orange-50 dark:bg-orange-950/20 rounded-xl items-center justify-center border border-orange-200 dark:border-orange-900/40"
                                    >
                                        <Download size={18} color="#FF6900" />
                                    </TouchableOpacity>
                                </View>
                            );
                        })
                    )}
                </View>
            </ScrollView>
        </View>
    );
}
