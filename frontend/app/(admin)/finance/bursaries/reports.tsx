import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, StatusBar } from "react-native";
import { ArrowLeft, FileText, Download, Users, TrendingUp, DollarSign, Calendar } from "lucide-react-native";
import { router } from "expo-router";
import { supabase } from "@/libs/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext"; // ← add this

export default function ReportsPage() {
    const { user, isInitializing } = useAuth();
    const { isDark } = useTheme(); // ← replace hardcoded false
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalBursaries: 0,
        totalApplications: 0,
        totalAllocated: 0,
        totalDisbursed: 0,
        approvalRate: 0
    });
    const [bursaryStats, setBursaryStats] = useState<any[]>([]);

    useEffect(() => {
        fetchReports();
    }, []);

    const fetchReports = async () => {
        setLoading(true);
        try {
            const { data: bursariesData } = await supabase.from('bursaries').select('*');
            const { data: applicationsData } = await supabase.from('bursary_applications').select('*, bursary:bursaries(amount)');

            const bursaries = bursariesData as any[] | null;
            const applications = applicationsData as any[] | null;

            const totalBursaries = bursaries?.length || 0;
            const totalApplications = applications?.length || 0;
            const approvedApps = applications?.filter((a: any) => a.status === 'approved') || [];
            const totalDisbursed = approvedApps.reduce((sum: any, a: any) => sum + (Number(a.bursary?.amount) || 0), 0);
            const approvalRate = totalApplications > 0 ? (approvedApps.length / totalApplications) * 100 : 0;

            setStats({ totalBursaries, totalApplications, totalAllocated: 0, totalDisbursed, approvalRate });

            const statsMap = new Map();
            bursaries?.forEach((b: any) => statsMap.set(b.id, { ...b, stats: { appCount: 0, approvedCount: 0, disbursed: 0 } }));
            applications?.forEach((a: any) => {
                const bData = statsMap.get(a.bursary_id);
                if (bData) {
                    bData.stats.appCount += 1;
                    if (a.status === 'approved') {
                        bData.stats.approvedCount += 1;
                        bData.stats.disbursed += (Number(a.bursary?.amount) || 0);
                    }
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

    const handleExport = () => {
        Alert.alert("Export", "Report dataset ready for CSV export.");
    };

    const statCards = [
        { label: 'Total Disbursed', value: `$${stats.totalDisbursed.toLocaleString()}`, icon: DollarSign, color: '#FF6B00', bg: isDark ? '#2d1a0a' : '#fff7ed', cardBorder: isDark ? '#7c3412' : '#fed7aa' },
        { label: 'Applications', value: stats.totalApplications.toString(), icon: Users, color: '#3b82f6', bg: isDark ? '#0c1a2e' : '#eff6ff', cardBorder: isDark ? '#1e3a5f' : '#bfdbfe' },
        { label: 'Approval Rate', value: `${stats.approvalRate.toFixed(1)}%`, icon: TrendingUp, color: '#10b981', bg: isDark ? '#052e16' : '#f0fdf4', cardBorder: isDark ? '#14532d' : '#bbf7d0' },
        { label: 'Active Schemes', value: stats.totalBursaries.toString(), icon: FileText, color: '#8b5cf6', bg: isDark ? '#1e1040' : '#f5f3ff', cardBorder: isDark ? '#4c1d95' : '#ddd6fe' },
    ];

    // Theme helpers — avoids repeating ternaries in JSX
    const bg = isDark ? '#0F0B2E' : '#f9fafb';
    const cardBg = isDark ? '#1a1744' : '#ffffff';
    const cardBorder = isDark ? '#2d2a5e' : '#f3f4f6';
    const textPrimary = isDark ? '#f9fafb' : '#111827';
    const textSecondary = isDark ? '#94a3b8' : '#6b7280';
    const textMuted = isDark ? '#64748b' : '#9CA3AF';
    const backBtnBg = isDark ? '#1a1744' : '#ffffff';
    const backBtnBorder = isDark ? '#2d2a5e' : '#f3f4f6';
    const progressTrack = isDark ? '#1f2937' : '#f9fafb';

    if (loading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: bg }}>
                <ActivityIndicator size="large" color="#FF6B00" />
            </View>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: bg }}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
            <ScrollView style={{ flex: 1, paddingHorizontal: 16 }} contentContainerStyle={{ paddingBottom: 100 }}>

                {/* Header */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 24 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <TouchableOpacity
                            onPress={() => router.navigate('/(admin)/finance')}
                            style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20, backgroundColor: backBtnBg, borderWidth: 1, borderColor: backBtnBorder, marginRight: 16 }}
                        >
                            <ArrowLeft size={20} color={textPrimary} />
                        </TouchableOpacity>
                        <Text style={{ fontSize: 20, fontWeight: '900', color: textPrimary }}>Financial Reports</Text>
                    </View>
                    <TouchableOpacity
                        onPress={handleExport}
                        style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20, backgroundColor: '#FF6B00' }}
                    >
                        <Download size={20} color="white" />
                    </TouchableOpacity>
                </View>

                {/* Stats Grid */}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
                    {statCards.map((card, i) => (
                        <View key={i} style={{ flexBasis: '48%', flexGrow: 1, backgroundColor: card.bg, padding: 16, borderRadius: 24, borderWidth: 1, borderColor: card.cardBorder }}>
                            <View style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : card.bg, width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 12 }}>
                                <card.icon size={20} color={card.color} />
                            </View>
                            <Text style={{ color: textMuted, fontSize: 10, fontWeight: '700', textTransform: 'uppercase', marginBottom: 4 }}>{card.label}</Text>
                            <Text style={{ color: textPrimary, fontSize: 18, fontWeight: '800' }}>{card.value}</Text>
                        </View>
                    ))}
                </View>

                {/* Schemes Breakdown */}
                <Text style={{ fontSize: 18, fontWeight: '700', color: textPrimary, marginBottom: 16 }}>Allocation Breakdown</Text>
                {bursaryStats.map((item, i) => (
                    <View key={i} style={{ backgroundColor: cardBg, padding: 20, borderRadius: 24, borderWidth: 1, borderColor: cardBorder, marginBottom: 16 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                            <View>
                                <Text style={{ color: textPrimary, fontWeight: '700' }}>{item.title}</Text>
                                <Text style={{ color: textMuted, fontSize: 12 }}>Target: {item.target_group}</Text>
                            </View>
                            <Text style={{ color: '#FF6B00', fontWeight: '900' }}>${item.amount.toLocaleString()}</Text>
                        </View>

                        {/* Progress bar */}
                        <View style={{ height: 8, backgroundColor: progressTrack, borderRadius: 999, overflow: 'hidden', marginBottom: 16 }}>
                            <View
                                style={{ width: `${Math.min(100, (item.stats.disbursed / item.amount) * 100)}%`, height: '100%', backgroundColor: '#FF6B00', borderRadius: 999 }}
                            />
                        </View>

                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <View>
                                <Text style={{ color: textMuted, fontSize: 10, fontWeight: '700', textTransform: 'uppercase' }}>Apps</Text>
                                <Text style={{ color: textPrimary, fontWeight: '700', fontSize: 12 }}>{item.stats.appCount}</Text>
                            </View>
                            <View style={{ alignItems: 'center' }}>
                                <Text style={{ color: textMuted, fontSize: 10, fontWeight: '700', textTransform: 'uppercase' }}>Approved</Text>
                                <Text style={{ color: textPrimary, fontWeight: '700', fontSize: 12 }}>{item.stats.approvedCount}</Text>
                            </View>
                            <View style={{ alignItems: 'flex-end' }}>
                                <Text style={{ color: textMuted, fontSize: 10, fontWeight: '700', textTransform: 'uppercase' }}>Disbursed</Text>
                                <Text style={{ color: '#FF6B00', fontWeight: '700', fontSize: 12 }}>${item.stats.disbursed.toLocaleString()}</Text>
                            </View>
                        </View>
                    </View>
                ))}
            </ScrollView>
        </View>
    );
}