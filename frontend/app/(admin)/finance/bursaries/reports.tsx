import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/libs/supabase";
import { FileText, Download, TrendingUp, Users, DollarSign } from "lucide-react-native";
import { Bursary } from "@/types/types";

export default function BursaryReports() {
    const router = useRouter();
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
        try {
            setLoading(true);

            // Fetch Bursaries
            const { data: bursaries, error: bursaryError } = await supabase
                .from('bursaries')
                .select('*')
                .returns<Bursary[]>();

            if (bursaryError) throw bursaryError;

            // Define type for joined data
            type BursaryApplicationWithDetails = {
                id: string;
                bursary_id: string;
                student_id: string;
                status: "pending" | "approved" | "rejected";
                justification: string | null;
                created_at: string;
                bursary: { amount: number } | null;
            };

            // Fetch Applications
            const { data, error: appError } = await supabase
                .from('bursary_applications')
                .select('*, bursary:bursaries(amount)');

            if (appError) throw appError;

            const applications = data as unknown as BursaryApplicationWithDetails[];

            // Calculate Overall Stats
            const totalBursaries = bursaries?.length || 0;
            const totalApplications = applications?.length || 0;
            const approvedApps = applications?.filter(a => a.status === 'approved') || [];

            // Calculate Amounts
            let totalAllocated = 0;
            const totalDisbursed = approvedApps.reduce((sum, app) => {
                return sum + (Number(app.bursary?.amount) || 0);
            }, 0);

            const approvalRate = totalApplications > 0 ? (approvedApps.length / totalApplications) * 100 : 0;

            setStats({
                totalBursaries,
                totalApplications,
                totalAllocated: 0,
                totalDisbursed,
                approvalRate
            });

            // Per Bursary Stats
            const statsMap = new Map();
            bursaries?.forEach(b => {
                statsMap.set(b.id, {
                    ...b,
                    stats: {
                        appCount: 0,
                        approvedCount: 0,
                        disbursed: 0
                    }
                });
            });

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

    if (loading) {
        return (
            <View className="flex-1 justify-center items-center bg-gray-50">
                <ActivityIndicator size="large" color="#FF6B00" />
            </View>
        );
    }

    return (
        <View className="flex-1 bg-gray-50">
            {/* Header */}
            <View className="bg-white p-4 border-b border-gray-200 flex-row justify-between items-center pt-12">
                <View className="flex-row items-center">
                    <TouchableOpacity onPress={() => router.back()} className="mr-3">
                        <Ionicons name="arrow-back" size={24} color="#374151" />
                    </TouchableOpacity>
                    <Text className="text-xl font-bold text-gray-900">Bursary Reports</Text>
                </View>
                <TouchableOpacity
                    onPress={handleExport}
                    className="flex-row items-center bg-gray-100 px-3 py-2 rounded-lg"
                >
                    <Download size={18} color="#374151" />
                    <Text className="ml-2 font-medium text-gray-700">Export</Text>
                </TouchableOpacity>
            </View>

            <ScrollView className="flex-1 p-4">
                {/* Stats Grid */}
                <View className="flex-row flex-wrap -mx-2 mb-6">
                    <View className="w-1/2 px-2 mb-4">
                        <View className="bg-white p-4 rounded-xl shadow-sm border border-orange-100">
                            <View className="bg-orange-50 w-10 h-10 rounded-full items-center justify-center mb-3">
                                <DollarSign size={20} color="#FF6B00" />
                            </View>
                            <Text className="text-gray-500 text-xs uppercase font-bold">Total Disbursed</Text>
                            <Text className="text-2xl font-bold text-gray-900">${stats.totalDisbursed.toLocaleString()}</Text>
                        </View>
                    </View>
                    <View className="w-1/2 px-2 mb-4">
                        <View className="bg-white p-4 rounded-xl shadow-sm border border-blue-100">
                            <View className="bg-blue-50 w-10 h-10 rounded-full items-center justify-center mb-3">
                                <Users size={20} color="#3B82F6" />
                            </View>
                            <Text className="text-gray-500 text-xs uppercase font-bold">Applications</Text>
                            <Text className="text-2xl font-bold text-gray-900">{stats.totalApplications}</Text>
                        </View>
                    </View>
                    <View className="w-1/2 px-2 mb-4">
                        <View className="bg-white p-4 rounded-xl shadow-sm border border-green-100">
                            <View className="bg-green-50 w-10 h-10 rounded-full items-center justify-center mb-3">
                                <TrendingUp size={20} color="#10B981" />
                            </View>
                            <Text className="text-gray-500 text-xs uppercase font-bold">Approval Rate</Text>
                            <Text className="text-2xl font-bold text-gray-900">{stats.approvalRate.toFixed(1)}%</Text>
                        </View>
                    </View>
                    <View className="w-1/2 px-2 mb-4">
                        <View className="bg-white p-4 rounded-xl shadow-sm border border-purple-100">
                            <View className="bg-purple-50 w-10 h-10 rounded-full items-center justify-center mb-3">
                                <FileText size={20} color="#8B5CF6" />
                            </View>
                            <Text className="text-gray-500 text-xs uppercase font-bold">Active Schemes</Text>
                            <Text className="text-2xl font-bold text-gray-900">{stats.totalBursaries}</Text>
                        </View>
                    </View>
                </View>

                {/* Detailed List */}
                <Text className="text-lg font-bold text-gray-900 mb-4">Scheme Performance</Text>

                {bursaryStats.map((b) => (
                    <View key={b.id} className="bg-white rounded-xl p-4 mb-3 border border-gray-100 shadow-sm">
                        <View className="flex-row justify-between items-start mb-2">
                            <View className="flex-1 mr-2">
                                <Text className="font-bold text-gray-900 text-lg">{b.title}</Text>
                                <Text className="text-gray-500 text-xs">Value: ${Number(b.amount).toLocaleString()}</Text>
                            </View>
                            <View className={`px-2 py-1 rounded-full ${b.status === 'open' ? 'bg-green-100' : 'bg-gray-100'}`}>
                                <Text className={`text-xs font-bold ${b.status === 'open' ? 'text-green-700' : 'text-gray-600'}`}>
                                    {b.status.toUpperCase()}
                                </Text>
                            </View>
                        </View>

                        <View className="flex-row bg-gray-50 rounded-lg p-3 mt-2 justify-between">
                            <View className="items-center">
                                <Text className="text-gray-400 text-[10px] uppercase font-bold">Total Apps</Text>
                                <Text className="text-gray-900 font-bold text-base">{b.stats.appCount}</Text>
                            </View>
                            <View className="items-center">
                                <Text className="text-gray-400 text-[10px] uppercase font-bold">Approved</Text>
                                <Text className="text-gray-900 font-bold text-base">{b.stats.approvedCount}</Text>
                            </View>
                            <View className="items-center">
                                <Text className="text-gray-400 text-[10px] uppercase font-bold">Disbursed</Text>
                                <Text className="text-gray-900 font-bold text-base text-green-600">${b.stats.disbursed.toLocaleString()}</Text>
                            </View>
                        </View>
                    </View>
                ))}

                <View className="h-20" />
            </ScrollView>
        </View>
    );
}
