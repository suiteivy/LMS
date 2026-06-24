import { UnifiedHeader } from "@/components/common/UnifiedHeader";
import { useTheme } from "@/contexts/ThemeContext";
import { ResourceAPI } from "@/services/ResourceService";
import { router } from "expo-router";
import { CheckCircle2, Clock, File, FileText, Image, Link as LinkIcon, Video, XCircle } from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native';

type Resource = {
    id: string;
    title: string;
    type?: string;
    url?: string;
    status?: string;
    Subject_title?: string;
    subject?: { title: string } | null;
    created_at?: string;
};

const TYPE_CONFIG: Record<string, { color: string; bg: string; darkBg: string; icon: any }> = {
    pdf:   { color: "#ef4444", bg: "#fee2e2", darkBg: "#3b0000", icon: FileText },
    video: { color: "#8b5cf6", bg: "#ede9fe", darkBg: "#1e1040", icon: Video },
    image: { color: "#22c55e", bg: "#dcfce7", darkBg: "#052e16", icon: Image },
    link:  { color: "#3b82f6", bg: "#dbeafe", darkBg: "#172554", icon: LinkIcon },
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
    pending:  { label: "Pending",  color: "#d97706", bg: "#fef3c7", icon: Clock },
    approved: { label: "Approved", color: "#16a34a", bg: "#dcfce7", icon: CheckCircle2 },
    rejected: { label: "Rejected", color: "#dc2626", bg: "#fee2e2", icon: XCircle },
};

export default function AdminResourceApprovals() {
    const { isDark } = useTheme();
    const [resources, setResources] = useState<Resource[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [approvingId, setApprovingId] = useState<string | null>(null);

    const fetch = useCallback(async () => {
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

    useEffect(() => { fetch(); }, [fetch]);

    const handleApprove = async (id: string) => {
        setApprovingId(id);
        try {
            await ResourceAPI.approveResource(id);
            setResources(prev =>
                prev.map(r => r.id === id ? { ...r, status: 'approved' } : r)
            );
        } catch {
            Alert.alert("Error", "Failed to approve resource.");
        } finally {
            setApprovingId(null);
        }
    };

    const pending  = resources.filter(r => !r.status || r.status === 'pending');
    const approved = resources.filter(r => r.status === 'approved');

    const ResourceCard = ({ resource }: { resource: Resource }) => {
        const typeKey = resource.type || 'file';
        const cfg = TYPE_CONFIG[typeKey] ?? { color: "#9ca3af", bg: "#f3f4f6", darkBg: "#1f2937", icon: File };
        const IconComponent = cfg.icon;
        const status = STATUS_CONFIG[resource.status ?? 'pending'] ?? STATUS_CONFIG.pending;
        const StatusIcon = status.icon;
        const isPending = !resource.status || resource.status === 'pending';

        return (
            <View className="p-4 mb-3 rounded-2xl bg-[#F6F8FA] dark:bg-[#161B22] border border-[#D0D7DE] dark:border-[#21262D]">
                <View className="flex-row items-center mb-3">
                    <View style={{
                        backgroundColor: isDark ? cfg.darkBg : cfg.bg,
                        width: 44, height: 44,
                        borderRadius: 14,
                        alignItems: 'center', justifyContent: 'center',
                        marginRight: 14,
                    }}>
                        <IconComponent size={20} color={cfg.color} />
                    </View>
                    <View className="flex-1">
                        <Text className="text-gray-900 dark:text-white font-bold text-[15px]" numberOfLines={1}>
                            {resource.title}
                        </Text>
                        <Text className="text-gray-500 dark:text-gray-400 text-[11px] font-bold uppercase tracking-widest mt-0.5">
                            {resource.Subject_title ?? resource.subject?.title ?? "—"} · {resource.type ?? "file"}
                        </Text>
                    </View>

                    {/* Status badge */}
                    <View style={{ backgroundColor: status.bg }} className="flex-row items-center px-2.5 py-1 rounded-full">
                        <StatusIcon size={12} color={status.color} />
                        <Text style={{ color: status.color }} className="text-[11px] font-bold ml-1">{status.label}</Text>
                    </View>
                </View>

                {isPending && (
                    <TouchableOpacity
                        onPress={() => handleApprove(resource.id)}
                        disabled={approvingId === resource.id}
                        style={{ opacity: approvingId === resource.id ? 0.6 : 1 }}
                        className="bg-[#0ea5e9] rounded-xl py-2.5 items-center mt-2"
                    >
                        {approvingId === resource.id
                            ? <ActivityIndicator size="small" color="#fff" />
                            : <Text className="text-white font-bold text-[13px]">✓ Approve Resource</Text>
                        }
                    </TouchableOpacity>
                )}
            </View>
        );
    };

    return (
        <View className="flex-1 bg-[#FFFFFF] dark:bg-[#0D1117]">
            <UnifiedHeader
                title="Resource"
                subtitle="Approvals"
                role="Admin"
                onBack={() => router.back()}
            />
            <ScrollView
                className="flex-1"
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetch(); }} tintColor="#FF6B00" />}
            >
                <View className="p-4 md:p-8 pb-24">
                    {/* Stats row */}
                    <View className="flex-row gap-3 mb-6">
                        <View className="flex-1 bg-[#f59e0b] rounded-3xl p-4">
                            <Text className="text-white/80 text-[10px] font-bold uppercase tracking-widest">Pending</Text>
                            <Text className="text-white text-2xl font-black mt-1">{pending.length}</Text>
                        </View>
                        <View className="flex-1 bg-[#16a34a] rounded-3xl p-4">
                            <Text className="text-white/80 text-[10px] font-bold uppercase tracking-widest">Approved</Text>
                            <Text className="text-white text-2xl font-black mt-1">{approved.length}</Text>
                        </View>
                        <View className="flex-1 bg-[#F6F8FA] dark:bg-[#161B22] border border-[#D0D7DE] dark:border-[#21262D] rounded-3xl p-4">
                            <Text className="text-gray-500 dark:text-gray-400 text-[10px] font-bold uppercase tracking-widest">Total</Text>
                            <Text className="text-gray-900 dark:text-white text-2xl font-black mt-1">{resources.length}</Text>
                        </View>
                    </View>

                    {loading ? (
                        <ActivityIndicator size="large" color="#FF6B00" style={{ marginTop: 40 }} />
                    ) : resources.length === 0 ? (
                        <View className="items-center p-12">
                            <File size={48} color={isDark ? "#374151" : "#d1d5db"} />
                            <Text className="text-gray-500 dark:text-gray-400 font-bold mt-4 text-center">
                                No resources found.
                            </Text>
                        </View>
                    ) : (
                        <>
                            {pending.length > 0 && (
                                <>
                                    <Text className="text-gray-500 dark:text-gray-400 text-[11px] font-bold uppercase tracking-widest mb-3">
                                        Awaiting Approval ({pending.length})
                                    </Text>
                                    {pending.map(r => <ResourceCard key={r.id} resource={r} />)}
                                </>
                            )}
                            {approved.length > 0 && (
                                <>
                                    <Text className="text-gray-500 dark:text-gray-400 text-[11px] font-bold uppercase tracking-widest mt-4 mb-3">
                                        Previously Approved ({approved.length})
                                    </Text>
                                    {approved.map(r => <ResourceCard key={r.id} resource={r} />)}
                                </>
                            )}
                        </>
                    )}
                </View>
            </ScrollView>
        </View>
    );
}
