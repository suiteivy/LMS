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

    const bg = isDark ? "#0F0B2E" : "#f9fafb";
    const cardBg = isDark ? "#13103A" : "#ffffff";
    const border = isDark ? "rgba(255,255,255,0.08)" : "#f3f4f6";
    const textPrimary = isDark ? "#f1f1f1" : "#111827";
    const textMuted = isDark ? "#9ca3af" : "#6b7280";

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
            <View style={{
                backgroundColor: cardBg,
                borderColor: border,
                borderWidth: 1,
                borderRadius: 20,
                padding: 16,
                marginBottom: 12,
            }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                    <View style={{
                        backgroundColor: isDark ? cfg.darkBg : cfg.bg,
                        width: 44, height: 44,
                        borderRadius: 14,
                        alignItems: 'center', justifyContent: 'center',
                        marginRight: 14,
                    }}>
                        <IconComponent size={20} color={cfg.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={{ color: textPrimary, fontWeight: 'bold', fontSize: 15 }} numberOfLines={1}>
                            {resource.title}
                        </Text>
                        <Text style={{ color: textMuted, fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 2 }}>
                            {resource.Subject_title ?? resource.subject?.title ?? "—"} · {resource.type ?? "file"}
                        </Text>
                    </View>

                    {/* Status badge */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: status.bg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 }}>
                        <StatusIcon size={12} color={status.color} />
                        <Text style={{ color: status.color, fontSize: 11, fontWeight: 'bold', marginLeft: 4 }}>{status.label}</Text>
                    </View>
                </View>

                {isPending && (
                    <TouchableOpacity
                        onPress={() => handleApprove(resource.id)}
                        disabled={approvingId === resource.id}
                        style={{
                            backgroundColor: '#0ea5e9',
                            borderRadius: 12,
                            paddingVertical: 10,
                            alignItems: 'center',
                            opacity: approvingId === resource.id ? 0.6 : 1,
                        }}
                    >
                        {approvingId === resource.id
                            ? <ActivityIndicator size="small" color="#fff" />
                            : <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 13 }}>✓ Approve Resource</Text>
                        }
                    </TouchableOpacity>
                )}
            </View>
        );
    };

    return (
        <View style={{ flex: 1, backgroundColor: bg }}>
            <UnifiedHeader
                title="Resource"
                subtitle="Approvals"
                role="Admin"
                onBack={() => router.back()}
            />
            <ScrollView
                style={{ flex: 1 }}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetch(); }} tintColor="#FF6B00" />}
            >
                {/* Stats row */}
                <View style={{ flexDirection: 'row', gap: 12, marginBottom: 24 }}>
                    <View style={{ flex: 1, backgroundColor: '#f59e0b', borderRadius: 20, padding: 16 }}>
                        <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1 }}>Pending</Text>
                        <Text style={{ color: 'white', fontSize: 28, fontWeight: 'bold', marginTop: 4 }}>{pending.length}</Text>
                    </View>
                    <View style={{ flex: 1, backgroundColor: '#16a34a', borderRadius: 20, padding: 16 }}>
                        <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1 }}>Approved</Text>
                        <Text style={{ color: 'white', fontSize: 28, fontWeight: 'bold', marginTop: 4 }}>{approved.length}</Text>
                    </View>
                    <View style={{ flex: 1, backgroundColor: isDark ? '#13103A' : '#111827', borderRadius: 20, padding: 16 }}>
                        <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1 }}>Total</Text>
                        <Text style={{ color: 'white', fontSize: 28, fontWeight: 'bold', marginTop: 4 }}>{resources.length}</Text>
                    </View>
                </View>

                {loading ? (
                    <ActivityIndicator size="large" color="#FF6B00" style={{ marginTop: 40 }} />
                ) : resources.length === 0 ? (
                    <View style={{ alignItems: 'center', padding: 48 }}>
                        <File size={48} color={isDark ? "#374151" : "#d1d5db"} />
                        <Text style={{ color: textMuted, fontWeight: 'bold', marginTop: 16, textAlign: 'center' }}>
                            No resources found.
                        </Text>
                    </View>
                ) : (
                    <>
                        {pending.length > 0 && (
                            <>
                                <Text style={{ color: textMuted, fontSize: 11, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
                                    Awaiting Approval ({pending.length})
                                </Text>
                                {pending.map(r => <ResourceCard key={r.id} resource={r} />)}
                            </>
                        )}
                        {approved.length > 0 && (
                            <>
                                <Text style={{ color: textMuted, fontSize: 11, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1, marginTop: 16, marginBottom: 10 }}>
                                    Previously Approved ({approved.length})
                                </Text>
                                {approved.map(r => <ResourceCard key={r.id} resource={r} />)}
                            </>
                        )}
                    </>
                )}
            </ScrollView>
        </View>
    );
}
