import { UnifiedHeader } from "@/components/common/UnifiedHeader";
import { useTheme } from "@/contexts/ThemeContext";
import { ResourceAPI, Resource } from "@/services/ResourceService";
import { router } from "expo-router";
import { CheckCircle2, Download, ExternalLink, File, FileText, Image, Link as LinkIcon, Trash2, Video, Globe, Lock } from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Linking, Platform, RefreshControl, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';

const TYPE_CONFIG: Record<string, { color: string; bg: string; darkBg: string; icon: any; label: string }> = {
    pdf:   { color: "#ef4444", bg: "#fee2e2", darkBg: "#3b0000", icon: FileText, label: "PDF Document" },
    video: { color: "#8b5cf6", bg: "#ede9fe", darkBg: "#1e1040", icon: Video, label: "Video" },
    image: { color: "#22c55e", bg: "#dcfce7", darkBg: "#052e16", icon: Image, label: "Image" },
    link:  { color: "#3b82f6", bg: "#dbeafe", darkBg: "#172554", icon: LinkIcon, label: "Web Link" },
};

export default function AdminResourceManager() {
    const { isDark } = useTheme();
    const [resources, setResources] = useState<Resource[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedType, setSelectedType] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const fetchResources = useCallback(async () => {
        try {
            const data = await ResourceAPI.getResources();
            setResources(data as Resource[]);
        } catch {
            Alert.alert("Error", "Failed to load resources.");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => { fetchResources(); }, [fetchResources]);

    const handleOpenResource = async (url?: string | null) => {
        if (!url) {
            Alert.alert("Notice", "No URL available for this resource.");
            return;
        }
        try {
            if (Platform.OS === 'web') {
                window.open(url, '_blank');
            } else {
                const supported = await Linking.canOpenURL(url);
                if (supported) {
                    await Linking.openURL(url);
                } else {
                    Alert.alert("Open Link", `Opening ${url}`);
                }
            }
        } catch (err) {
            console.error("Error opening resource:", err);
            Alert.alert("Error", "Could not open resource link.");
        }
    };

    const handleDelete = async (id: string, title: string) => {
        Alert.alert(
            "Delete Resource",
            `Are you sure you want to remove "${title}"? This action cannot be undone.`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        setDeletingId(id);
                        try {
                            await ResourceAPI.deleteResource(id);
                            setResources(prev => prev.filter(r => r.id !== id));
                        } catch {
                            Alert.alert("Error", "Failed to delete resource.");
                        } finally {
                            setDeletingId(null);
                        }
                    }
                }
            ]
        );
    };

    const filteredResources = resources.filter(r => {
        const matchesType = selectedType === 'all' || r.type === selectedType;
        const matchesQuery = searchQuery.trim() === '' ||
            r.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (r.Subject_title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (r.Class_name || '').toLowerCase().includes(searchQuery.toLowerCase());
        return matchesType && matchesQuery;
    });

    const surface = isDark ? '#161B22' : '#FFFFFF';
    const border = isDark ? '#21262D' : '#D0D7DE';
    const cardBg = isDark ? '#161B22' : '#F6F8FA';

    return (
        <View className="flex-1 bg-[#FFFFFF] dark:bg-[#161B22]">
            <UnifiedHeader
                title="Learning"
                subtitle="Resources"
                role="Admin"
                onBack={() => router.back()}
            />
            <ScrollView
                className="flex-1"
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={() => { setRefreshing(true); fetchResources(); }}
                        tintColor="#FF6B00"
                    />
                }
            >
                <View className="p-4 md:p-8 pb-24">
                    {/* Header stats */}
                    <View className="flex-row gap-3 mb-6">
                        <View className="flex-1 bg-[#0ea5e9] rounded-3xl p-4">
                            <Text className="text-white/80 text-[10px] font-bold uppercase tracking-widest">Total Published</Text>
                            <Text className="text-white text-2xl font-black mt-1">{resources.length}</Text>
                        </View>
                        <View className="flex-1 bg-[#10b981] rounded-3xl p-4">
                            <Text className="text-white/80 text-[10px] font-bold uppercase tracking-widest">General Access</Text>
                            <Text className="text-white text-2xl font-black mt-1">
                                {resources.filter(r => r.target_audience !== 'staff_only').length}
                            </Text>
                        </View>
                        <View className="flex-1 bg-[#8b5cf6] rounded-3xl p-4">
                            <Text className="text-white/80 text-[10px] font-bold uppercase tracking-widest">Staff Only</Text>
                            <Text className="text-white text-2xl font-black mt-1">
                                {resources.filter(r => r.target_audience === 'staff_only').length}
                            </Text>
                        </View>
                    </View>

                    {/* Search Bar */}
                    <View style={{ backgroundColor: cardBg, borderColor: border }} className="flex-row items-center border rounded-2xl px-4 py-3 mb-4">
                        <TextInput
                            className="flex-1 text-gray-900 dark:text-white font-medium text-[14px]"
                            placeholder="Search by title, subject, or class..."
                            placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                    </View>

                    {/* Type Filter Pills */}
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-6">
                        <View className="flex-row gap-2">
                            {['all', 'pdf', 'video', 'image', 'link'].map((type) => {
                                const isSelected = selectedType === type;
                                const label = type === 'all' ? 'All Types' : (TYPE_CONFIG[type]?.label || type.toUpperCase());
                                return (
                                    <TouchableOpacity
                                        key={type}
                                        onPress={() => setSelectedType(type)}
                                        className={`px-4 py-2 rounded-xl border ${
                                            isSelected
                                                ? 'bg-[#FF6B00] border-[#FF6B00]'
                                                : isDark
                                                    ? 'bg-[#21262D] border-[#30363D]'
                                                    : 'bg-[#F6F8FA] border-[#D0D7DE]'
                                        }`}
                                    >
                                        <Text className={`text-[12px] font-bold ${isSelected ? 'text-white' : isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                            {label}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </ScrollView>

                    {loading ? (
                        <ActivityIndicator size="large" color="#FF6B00" style={{ marginTop: 40 }} />
                    ) : filteredResources.length === 0 ? (
                        <View className="items-center p-12">
                            <File size={48} color={isDark ? "#374151" : "#d1d5db"} />
                            <Text className="text-gray-500 dark:text-gray-400 font-bold mt-4 text-center">
                                {searchQuery ? "No matching resources found." : "No published resources in the repository."}
                            </Text>
                        </View>
                    ) : (
                        <View>
                            <Text className="text-gray-500 dark:text-gray-400 text-[11px] font-bold uppercase tracking-widest mb-3">
                                Available Resources ({filteredResources.length})
                            </Text>
                            {filteredResources.map((resource) => {
                                const typeKey = resource.type || 'file';
                                const cfg = TYPE_CONFIG[typeKey] ?? { color: "#9ca3af", bg: "#f3f4f6", darkBg: "#1f2937", icon: File, label: "File" };
                                const IconComponent = cfg.icon;
                                const isStaffOnly = resource.target_audience === 'staff_only';
                                const isDeleting = deletingId === resource.id;

                                return (
                                    <View
                                        key={resource.id}
                                        style={{ backgroundColor: cardBg, borderColor: border }}
                                        className="p-4 mb-3 rounded-2xl border"
                                    >
                                        <View className="flex-row items-center mb-2">
                                            <View
                                                style={{
                                                    backgroundColor: isDark ? cfg.darkBg : cfg.bg,
                                                    width: 44,
                                                    height: 44,
                                                    borderRadius: 14,
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    marginRight: 14,
                                                }}
                                            >
                                                <IconComponent size={20} color={cfg.color} />
                                            </View>
                                            <View className="flex-1 pr-2">
                                                <Text className="text-gray-900 dark:text-white font-bold text-[15px]" numberOfLines={1}>
                                                    {resource.title}
                                                </Text>
                                                <Text className="text-gray-500 dark:text-gray-400 text-[11px] font-bold uppercase tracking-widest mt-0.5">
                                                    {resource.Subject_title ?? resource.subject?.title ?? "General"} {resource.Class_name ? `• ${resource.Class_name}` : ''}
                                                </Text>
                                            </View>

                                            {/* Audience Badge */}
                                            <View
                                                style={{ backgroundColor: isStaffOnly ? (isDark ? '#451a03' : '#fef3c7') : (isDark ? '#064e3b' : '#d1fae5') }}
                                                className="flex-row items-center px-2.5 py-1 rounded-full"
                                            >
                                                {isStaffOnly ? (
                                                    <Lock size={11} color={isDark ? '#f59e0b' : '#b45309'} />
                                                ) : (
                                                    <Globe size={11} color={isDark ? '#34d399' : '#059669'} />
                                                )}
                                                <Text
                                                    style={{ color: isStaffOnly ? (isDark ? '#f59e0b' : '#b45309') : (isDark ? '#34d399' : '#059669') }}
                                                    className="text-[10px] font-bold ml-1 uppercase"
                                                >
                                                    {isStaffOnly ? 'Staff' : 'Everyone'}
                                                </Text>
                                            </View>
                                        </View>

                                        {/* Action buttons */}
                                        <View className="flex-row items-center justify-end gap-2 mt-2 pt-2 border-t border-gray-200/50 dark:border-white/5">
                                            {resource.url ? (
                                                <TouchableOpacity
                                                    onPress={() => handleOpenResource(resource.url)}
                                                    className="flex-row items-center px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/40"
                                                >
                                                    <ExternalLink size={13} color="#2563eb" />
                                                    <Text className="text-[#2563eb] text-[12px] font-bold ml-1.5">Open Link</Text>
                                                </TouchableOpacity>
                                            ) : null}

                                            <TouchableOpacity
                                                onPress={() => handleDelete(resource.id, resource.title)}
                                                disabled={isDeleting}
                                                className="flex-row items-center px-3 py-1.5 rounded-xl bg-red-50 dark:bg-red-950/40"
                                            >
                                                {isDeleting ? (
                                                    <ActivityIndicator size="small" color="#ef4444" />
                                                ) : (
                                                    <>
                                                        <Trash2 size={13} color="#ef4444" />
                                                        <Text className="text-[#ef4444] text-[12px] font-bold ml-1.5">Delete</Text>
                                                    </>
                                                )}
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                );
                            })}
                        </View>
                    )}
                </View>
            </ScrollView>
        </View>
    );
}
