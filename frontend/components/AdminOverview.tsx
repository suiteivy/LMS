import React from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { useAuth } from "@/contexts/AuthContext";
import { ShieldCheck, Activity, Users, Server, Clock, CheckCircle, AlertCircle } from "lucide-react-native";

export default function AdminOverview() {
    const { profile, user } = useAuth();

    const StatCard = ({ icon: Icon, label, value, color, status }: any) => (
        <View className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex-1 min-w-[45%] mb-4 mx-1">
            <View className="flex-row justify-between items-start mb-2">
                <View className={`p-2 rounded-xl ${color.bg}`}>
                    <Icon size={20} color={color.text} />
                </View>
                {status && (
                    <View className="flex-row items-center">
                        <View className={`w-2 h-2 rounded-full ${status === 'good' ? 'bg-green-500' : 'bg-orange-500'} mr-1`} />
                    </View>
                )}
            </View>
            <Text className="text-gray-500 text-xs font-bold uppercase mb-1">{label}</Text>
            <Text className="text-gray-900 text-lg font-bold">{value}</Text>
        </View>
    );

    return (
        <ScrollView className="flex-1 bg-gray-50">
            <View className="p-6">
                {/* Header Card */}
                <View className="bg-gray-900 rounded-3xl p-6 mb-8 relative overflow-hidden">
                    {/* Decorative circles */}
                    <View className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-gray-800 opacity-50" />
                    <View className="absolute bottom-0 left-10 w-20 h-20 rounded-full bg-gray-800 opacity-50" />

                    <View className="flex-row items-center mb-4">
                        <View className="w-16 h-16 bg-white/20 rounded-2xl items-center justify-center border border-white/10 mr-4">
                            <Text className="text-white text-2xl font-bold">
                                {profile?.full_name?.charAt(0) || "A"}
                            </Text>
                        </View>
                        <View>
                            <Text className="text-white text-xl font-bold">{profile?.full_name || "Administrator"}</Text>
                            <Text className="text-gray-400 text-sm font-medium">{user?.email}</Text>
                        </View>
                    </View>

                    <View className="flex-row items-center bg-white/10 self-start px-3 py-1.5 rounded-lg border border-white/5">
                        <ShieldCheck size={14} color="#4ade80" />
                        <Text className="text-green-400 text-xs font-bold ml-2 uppercase">System Admin Access</Text>
                    </View>
                </View>

                {/* System Status Section */}
                <Text className="text-lg font-bold text-gray-900 mb-4 px-1">System Health</Text>
                <View className="flex-row flex-wrap -mx-1 mb-8">
                    <StatCard
                        icon={Activity}
                        label="System Status"
                        value="Operational"
                        color={{ bg: "bg-green-50", text: "#16a34a" }}
                        status="good"
                    />
                    <StatCard
                        icon={Server}
                        label="Server Load"
                        value="Optimal"
                        color={{ bg: "bg-blue-50", text: "#2563eb" }}
                        status="good"
                    />
                    <StatCard
                        icon={Clock}
                        label="Uptime"
                        value="99.9%"
                        color={{ bg: "bg-purple-50", text: "#9333ea" }}
                    />
                    <StatCard
                        icon={Users}
                        label="Active Sessions"
                        value="1"
                        color={{ bg: "bg-orange-50", text: "#ea580c" }}
                    />
                </View>

                {/* Recent Alerts / Logs Placeholder */}
                <Text className="text-lg font-bold text-gray-900 mb-4 px-1">System Alerts</Text>
                <View className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
                    <View className="flex-row items-center mb-3 pb-3 border-b border-gray-50">
                        <CheckCircle size={18} color="#16a34a" />
                        <Text className="text-gray-700 font-medium ml-3 flex-1">System update completed successfully</Text>
                        <Text className="text-gray-400 text-xs">2h ago</Text>
                    </View>
                    <View className="flex-row items-center">
                        <AlertCircle size={18} color="#f59e0b" />
                        <Text className="text-gray-700 font-medium ml-3 flex-1">New login detected from current device</Text>
                        <Text className="text-gray-400 text-xs">Just now</Text>
                    </View>
                </View>

                <View className="mt-8 items-center">
                    <Text className="text-gray-300 text-xs text-center">
                        LMS Admin Control Panel v1.2.0{'\n'}
                        Designed for efficiency
                    </Text>
                </View>
            </View>
        </ScrollView>
    );
}
