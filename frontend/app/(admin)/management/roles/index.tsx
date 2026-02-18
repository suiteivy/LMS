import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { Shield, ChevronLeft, Check, Lock } from 'lucide-react-native';

const RoleCard = ({ title, description, permissions, isDefault }: any) => (
    <View className="bg-white p-5 rounded-2xl border border-gray-100 mb-4 shadow-sm">
        <View className="flex-row justify-between items-start mb-3">
            <View className="flex-row items-center">
                <View className="bg-pink-50 p-2 rounded-lg mr-3">
                    <Shield size={20} color="#db2777" />
                </View>
                <View>
                    <Text className="text-lg font-bold text-gray-900">{title}</Text>
                    <Text className="text-xs text-gray-500">{description}</Text>
                </View>
            </View>
            {isDefault && (
                <View className="bg-gray-100 px-2 py-1 rounded-md">
                    <Text className="text-[10px] uppercase font-bold text-gray-500">System</Text>
                </View>
            )}
        </View>

        <View className="bg-gray-50 p-3 rounded-xl">
            <Text className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">Capabilities</Text>
            <View className="flex-row flex-wrap gap-2">
                {permissions.map((perm: string, index: number) => (
                    <View key={index} className="flex-row items-center bg-white border border-gray-200 px-2 py-1 rounded-md">
                        <Check size={12} color="#10b981" />
                        <Text className="text-[10px] text-gray-600 ml-1 font-medium">{perm}</Text>
                    </View>
                ))}
            </View>
        </View>

        <TouchableOpacity className="mt-4 flex-row justify-center items-center py-2 border border-gray-200 rounded-xl" disabled={isDefault}>
            {isDefault ? (
                <>
                    <Lock size={14} color="#9ca3af" className="mr-2" />
                    <Text className="text-gray-400 font-medium text-sm">System Locked</Text>
                </>
            ) : (
                <Text className="text-gray-900 font-medium text-sm">Edit Permissions</Text>
            )}
        </TouchableOpacity>
    </View>
);

export default function RolesAndPermissions() {
    const router = useRouter();

    const roles = [
        {
            title: "Super Admin",
            description: "Full system access and configuration",
            isDefault: true,
            permissions: ["Manage Users", "Manage Finance", "System Settings", "View Logs", "Manage Roles"]
        },
        {
            title: "School Admin",
            description: "Administrative access for day-to-day operations",
            isDefault: false,
            permissions: ["Manage Students", "Manage Teachers", "View Attendance", "Library Management"]
        },
        {
            title: "Teacher",
            description: "Access for teaching staff",
            isDefault: false,
            permissions: ["Mark Attendance", "View Assigned Subjects", "Enter Grades", "View Timetable"]
        },
        {
            title: "Student",
            description: "Standard student access",
            isDefault: false,
            permissions: ["View Grades", "View Timetable", "Borrow Books", "Update Profile"]
        },
        {
            title: "Bursar",
            description: "Financial management access",
            isDefault: false,
            permissions: ["Manage Payments", "View Financial Reports", "Manage Bursaries"]
        },
        {
            title: "Librarian",
            description: "Library resource management",
            isDefault: false,
            permissions: ["Add Books", "Manage Loans", "View Library Reports"]
        }
    ];

    return (
        <View className="flex-1 bg-gray-50">
            <StatusBar barStyle="dark-content" />

            {/* Header */}
            <View className="bg-white px-4 pt-12 pb-4 border-b border-gray-200 flex-row items-center justify-between">
                <View className="flex-row items-center">
                    <TouchableOpacity onPress={() => router.back()} className="mr-3 bg-gray-50 p-2 rounded-full">
                        <ChevronLeft size={24} color="#374151" />
                    </TouchableOpacity>
                    <View>
                        <Text className="text-xl font-bold text-gray-900">Roles & Permissions</Text>
                        <Text className="text-xs text-gray-500">Manage user access levels</Text>
                    </View>
                </View>
                <TouchableOpacity className="bg-pink-500 px-4 py-2 rounded-full">
                    <Text className="text-white font-bold text-sm">+ Add Role</Text>
                </TouchableOpacity>
            </View>

            <ScrollView className="flex-1 p-4" showsVerticalScrollIndicator={false}>
                <Text className="text-gray-500 mb-4 text-sm">
                    Define what different users can see and do within the system. System roles cannot be deleted but their permissions can be viewed.
                </Text>

                {roles.map((role, index) => (
                    <RoleCard key={index} {...role} />
                ))}

                <View className="h-20" />
            </ScrollView>
        </View>
    );
}
