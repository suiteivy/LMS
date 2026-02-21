import { UnifiedHeader } from "@/components/common/UnifiedHeader";
import { useTheme } from "@/contexts/ThemeContext";
import { supabase } from "@/libs/supabase";
import { Bursary } from "@/types/types";
import { useRouter } from "expo-router";
import { DollarSign, Download, FileText, TrendingUp, Users } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, Text, TouchableOpacity, View } from "react-native";

export default function BursaryReports() {
    const router = useRouter();
    const { isDark } = useTheme();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ totalBursaries: 0, totalApplications: 0, totalAllocated: 0, totalDisbursed: 0, approvalRate: 0 });
    const [bursaryStats, setBursaryStats] = useState<any[]>([]);

    const surface = isDark ? '#1e1e1e' : '#ffffff';
    const border = isDark ? '#2c2c2c' : '#f3f4f6';
    const textPrimary = isDark ? '#f1f1f1' : '#111827';
    const textSecondary = isDark ? '#9ca3af' : '#6b7280';
    const statsBg = isDark ? '#242424' : '#f9fafb';

    useEffect(() => { fetchReports(); }, []);

    const fetchReports = async () => {
        try {
            setLoading(true);
            const { data: bursaries, error: bursaryError } = await supabase.from('bursaries').select('*').returns<Bursary[]>();
            if (bursaryError) throw bursaryError;

            type BursaryApplicationWithDetails = { id: string; bursary_id: string; student_id: string; status: "pending" | "approved" | "rejected"; justification: string | null; created_at: string; bursary: { amount: number } | null; };
            const { data, error: appError } = await supabase.from('bursary_applications').select('*, bursary:bursaries(amount)');
            if (appError) throw appError;

            const applications = data as unknown as BursaryApplicationWithDetails[];
            const totalBursaries = bursaries?.length || 0;
            const totalApplications = applications?.length || 0;
            const approvedApps = applications?.filter(a => a.status === 'approved') || [];
            const totalDisbursed = approvedApps.reduce((sum, app) => sum + (Number(app.bursary?.amount) || 0), 0);
            const approvalRate = totalApplications > 0 ? (approvedApps.length / totalApplications) * 100 : 0;

            setStats({ totalBursaries, totalApplications, totalAllocated: 0, totalDisbursed, approvalRate });

            const statsMap = new Map();
            bursaries?.forEach(b => statsMap.set(b.id, { ...b, stats: { appCount: 0, approvedCount: 0, disbursed: 0 } }));
            applications?.forEach(a => {
                const bData = statsMap.get(a.bursary_id);
                if (bData) {
                    bData.stats.appCount += 1;
                    if (a.status === 'approved') { bData.stats.approvedCount += 1; bData.stats.disbursed += (Number(a.bursary?.amount) || 0); }
                }
            });
            setBursaryStats(Array.from(statsMap.values()));
        } catch (error) {
            console.error(error);
            Alert.alert("Error", "Failed to load reports");
        } finally {
            setLoading(false);
        }
    };

    const statCards = [
        { label: 'Total Disbursed', value: `$${stats.totalDisbursed.toLocaleString()}`, icon: DollarSign, color: '#FF6B00', bg: isDark ? 'rgba(255,107,0,0.12)' : '#fff7ed', cardBorder: isDark ? 'rgba(255,107,0,0.2)' : '#fed7aa' },
        { label: 'Applications', value: stats.totalApplications.toString(), icon: Users, color: '#3b82f6', bg: isDark ? '#1e3a5f' : '#eff6ff', cardBorder: isDark ? '#1e3a5f' : '#bfdbfe' },
        { label: 'Approval Rate', value: `${stats.approvalRate.toFixed(1)}%`, icon: TrendingUp, color: '#10b981', bg: isDark ? '#052e16' : '#f0fdf4', cardBorder: isDark ? '#052e16' : '#bbf7d0' },
        { label: 'Active Schemes', value: stats.totalBursaries.toString(), icon: FileText, color: '#8b5cf6', bg: isDark ? '#2e1065' : '#f5f3ff', cardBorder: isDark ? '#2e1065' : '#ddd6fe' },
    ];

    if (loading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: isDark ? '#121212' : '#f9fafb' }}>
                <ActivityIndicator size="large" color="#FF6B00" />
            </View>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: isDark ? '#121212' : '#f9fafb' }}>
            <UnifiedHeader
                title="Finance"
                subtitle="Bursary Reports"
                role="Admin"
                onBack={() => router.back()}

            />

            <ScrollView style={{ flex: 1, padding: 16 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 16 }}>
                    <TouchableOpacity
                        onPress={() => Alert.alert("Export", "Report downloaded as CSV (Mock)")}
                        style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: isDark ? '#242424' : '#f3f4f6', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: border }}
                    >
                        <Download size={16} color={isDark ? '#9ca3af' : '#374151'} />
                        <Text style={{ marginLeft: 6, fontWeight: '600', color: isDark ? '#9ca3af' : '#374151', fontSize: 13 }}>Export</Text>
                    </TouchableOpacity>
                </View>
                {/* Stats Grid */}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -8, marginBottom: 24 }}>
                    {statCards.map((card, i) => (
                        <View key={i} style={{ width: '50%', paddingHorizontal: 8, marginBottom: 16 }}>
                            <View style={{ backgroundColor: surface, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: card.cardBorder }}>
                                <View style={{ width: 40, height: 40, backgroundColor: card.bg, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                                    <card.icon size={20} color={card.color} />
                                </View>
                                <Text style={{ color: textSecondary, fontSize: 10, textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: 0.5 }}>{card.label}</Text>
                                <Text style={{ fontSize: 22, fontWeight: 'bold', color: textPrimary, marginTop: 2 }}>{card.value}</Text>
                            </View>
                        </View>
                    ))}
                </View>

                {/* Scheme Performance */}
                <Text style={{ fontSize: 17, fontWeight: 'bold', color: textPrimary, marginBottom: 16 }}>Scheme Performance</Text>

                {bursaryStats.map((b) => (
                    <View key={b.id} style={{ backgroundColor: surface, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: border }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                            <View style={{ flex: 1, marginRight: 8 }}>
                                <Text style={{ fontWeight: 'bold', color: textPrimary, fontSize: 16 }}>{b.title}</Text>
                                <Text style={{ color: textSecondary, fontSize: 11, marginTop: 2 }}>Value: ${Number(b.amount).toLocaleString()}</Text>
                            </View>
                            <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: b.status === 'open' ? (isDark ? '#052e16' : '#dcfce7') : (isDark ? '#1f2937' : '#f3f4f6') }}>
                                <Text style={{ fontSize: 11, fontWeight: 'bold', textTransform: 'uppercase', color: b.status === 'open' ? '#10b981' : textSecondary }}>{b.status}</Text>
                            </View>
                        </View>

                        <View style={{ flexDirection: 'row', backgroundColor: statsBg, borderRadius: 12, padding: 12, marginTop: 8, justifyContent: 'space-between', borderWidth: 1, borderColor: border }}>
                            {[
                                { label: 'Total Apps', value: b.stats.appCount.toString(), color: textPrimary },
                                { label: 'Approved', value: b.stats.approvedCount.toString(), color: textPrimary },
                                { label: 'Disbursed', value: `$${b.stats.disbursed.toLocaleString()}`, color: '#10b981' },
                            ].map((item, i) => (
                                <View key={i} style={{ alignItems: 'center' }}>
                                    <Text style={{ color: textSecondary, fontSize: 10, textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: 0.5 }}>{item.label}</Text>
                                    <Text style={{ color: item.color, fontWeight: 'bold', fontSize: 16, marginTop: 2 }}>{item.value}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                ))}
                <View style={{ height: 80 }} />
            </ScrollView>
        </View>
    );
}