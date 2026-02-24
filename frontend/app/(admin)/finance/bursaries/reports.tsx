import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, StatusBar } from "react-native";
import { ArrowLeft, FileText, Download, Users, TrendingUp, DollarSign, Calendar } from "lucide-react-native";
import { router } from "expo-router";
import { supabase } from "@/libs/supabase";
import { useAuth } from "@/contexts/AuthContext";

export default function ReportsPage() {
    const { user, isInitializing } = useAuth();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalBursaries: 0,
        totalApplications: 0,
        totalAllocated: 0,
        totalDisbursed: 0,
        approvalRate: 0
    });
    const [bursaryStats, setBursaryStats] = useState<any[]>([]);

    const isDark = false; // Using standard light theme for admin portal for now

    useEffect(() => {
        fetchReports();
    }, []);

    const fetchReports = async () => {
        setLoading(true);
        try {
            const { data: bursaries } = await supabase.from('bursaries').select('*');
            const { data: applications } = await supabase.from('bursary_applications').select('*, bursary:bursaries(amount)');

            const totalBursaries = bursaries?.length || 0;
            const totalApplications = applications?.length || 0;
            const approvedApps = applications?.filter(a => a.status === 'approved') || [];
            const totalDisbursed = approvedApps.reduce((sum, a) => sum + (Number(a.bursary?.amount) || 0), 0);
            const approvalRate = totalApplications > 0 ? (approvedApps.length / totalApplications) * 100 : 0;

            setStats({ totalBursaries, totalApplications, totalAllocated: 0, totalDisbursed, approvalRate });

            const statsMap = new Map();
            bursaries?.forEach(b => statsMap.set(b.id, { ...b, stats: { appCount: 0, approvedCount: 0, disbursed: 0 } }));
            applications?.forEach(a => {
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
        { label: 'Total Disbursed', value: `$${stats.totalDisbursed.toLocaleString()}`, icon: DollarSign, color: '#FF6B00', bg: '#fff7ed', cardBorder: '#fed7aa' },
        { label: 'Applications', value: stats.totalApplications.toString(), icon: Users, color: '#3b82f6', bg: '#eff6ff', cardBorder: '#bfdbfe' },
        { label: 'Approval Rate', value: `${stats.approvalRate.toFixed(1)}%`, icon: TrendingUp, color: '#10b981', bg: '#f0fdf4', cardBorder: '#bbf7d0' },
        { label: 'Active Schemes', value: stats.totalBursaries.toString(), icon: FileText, color: '#8b5cf6', bg: '#f5f3ff', cardBorder: '#ddd6fe' },
    ];

    if (loading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f9fafb' }}>
                <ActivityIndicator size="large" color="#FF6B00" />
            </View>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
            <StatusBar barStyle="dark-content" />
            <ScrollView className="flex-1 px-4" contentContainerStyle={{ paddingBottom: 100 }}>
                {/* Header */}
                <View className="flex-row items-center justify-between py-6">
                    <View className="flex-row items-center">
                        <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 items-center justify-center rounded-full bg-white border border-gray-100 mr-4">
                            <ArrowLeft size={20} color="#1F2937" />
                        </TouchableOpacity>
                        <Text className="text-xl font-black text-gray-900">Financial Reports</Text>
                    </View>
                    <TouchableOpacity onPress={handleExport} className="w-10 h-10 items-center justify-center rounded-full bg-teacherBlack">
                        <Download size={20} color="white" />
                    </TouchableOpacity>
                </View>

                {/* Stats Grid */}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
                    {statCards.map((card, i) => (
                        <View key={i} style={{ flexBasis: '48%', flexGrow: 1, backgroundColor: 'white', padding: 16, borderRadius: 24, borderWeight: 1, borderColor: card.cardBorder }}>
                            <View style={{ backgroundColor: card.bg, width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 12 }}>
                                <card.icon size={20} color={card.color} />
                            </View>
                            <Text style={{ color: '#9CA3AF', fontSize: 10, fontWeight: '700', textTransform: 'uppercase', marginBottom: 4 }}>{card.label}</Text>
                            <Text style={{ color: '#111827', fontSize: 18, fontWeight: '800' }}>{card.value}</Text>
                        </View>
                    ))}
                </View>

                {/* Schemes Breakdown */}
                <Text className="text-lg font-bold text-gray-900 mb-4">Allocation Breakdown</Text>
                {bursaryStats.map((item, i) => (
                    <View key={i} className="bg-white p-5 rounded-3xl border border-gray-100 mb-4">
                        <View className="flex-row justify-between items-start mb-4">
                            <View>
                                <Text className="text-gray-900 font-bold">{item.title}</Text>
                                <Text className="text-gray-400 text-xs">Target: {item.target_group}</Text>
                            </View>
                            <Text className="text-teacherOrange font-black">${item.amount.toLocaleString()}</Text>
                        </View>

                        <View className="h-2 bg-gray-50 rounded-full overflow-hidden mb-4">
                            <View
                                style={{ width: `${Math.min(100, (item.stats.disbursed / item.amount) * 100)}%` }}
                                className="h-full bg-teacherOrange rounded-full"
                            />
                        </View>

                        <View className="flex-row justify-between items-center">
                            <View>
                                <Text className="text-gray-400 text-[10px] font-bold uppercase">Apps</Text>
                                <Text className="text-gray-900 font-bold text-xs">{item.stats.appCount}</Text>
                            </View>
                            <View className="items-center">
                                <Text className="text-gray-400 text-[10px] font-bold uppercase">Approved</Text>
                                <Text className="text-gray-900 font-bold text-xs">{item.stats.approvedCount}</Text>
                            </View>
                            <View className="items-end">
                                <Text className="text-gray-400 text-[10px] font-bold uppercase">Disbursed</Text>
                                <Text className="text-teacherBlack font-bold text-xs">${item.stats.disbursed.toLocaleString()}</Text>
                            </View>
                        </View>
                    </View>
                ))}
            </ScrollView>
        </View>
    );
}