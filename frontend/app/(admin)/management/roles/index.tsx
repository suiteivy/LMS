import { useRouter } from 'expo-router';
import { Check, ChevronLeft, Lock, Shield, X } from 'lucide-react-native';
import React from 'react';
import { Modal, ScrollView, StatusBar, Text, TouchableOpacity, View } from 'react-native';

const RoleCard = ({ title, description, permissions, isDefault, onEdit }: any) => (
    <View className="bg-white p-6 rounded-3xl border border-slate-100 mb-5 shadow-sm">
        <View className="flex-row justify-between items-start mb-4">
            <View className="flex-row items-center">
                <View className="bg-orange-50 p-2.5 rounded-xl mr-3.5">
                    <Shield size={22} color="#f97316" />
                </View>
                <View className="flex-1">
                    <Text className="text-xl font-bold text-slate-900">{title}</Text>
                    <Text className="text-xs text-slate-500 mt-0.5">{description}</Text>
                </View>
            </View>
            {isDefault && (
                <View className="bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
                    <Text className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">System Default</Text>
                </View>
            )}
        </View>

        <View className="flex-row flex-wrap mt-2">
            {permissions.slice(0, 3).map((perm: string) => (
                <View key={perm} className="bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-xl mr-2 mb-2 flex-row items-center">
                    <Check size={12} color="#10b981" className="mr-1.5" />
                    <Text className="text-[11px] font-semibold text-slate-600">{perm}</Text>
                </View>
            ))}
            {permissions.length > 3 && (
                <View className="bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-xl mr-2 mb-2">
                    <Text className="text-[11px] font-semibold text-slate-500">+{permissions.length - 3} More</Text>
                </View>
            )}
        </View>

        <TouchableOpacity 
            className={`mt-5 flex-row justify-center items-center py-3 rounded-2xl shadow-sm ${isDefault ? 'bg-slate-50 border border-slate-100' : 'bg-white border border-orange-200'}`} 
            disabled={isDefault}
            onPress={() => onEdit(title, permissions)}
        >
            {isDefault ? (
                <>
                    <Lock size={16} color="#9ca3af" className="mr-2" />
                    <Text className="text-slate-400 font-semibold text-sm">System Restricted</Text>
                </>
            ) : (
                <Text className="text-[#f97316] font-bold text-sm">Edit Role & Permissions</Text>
            )}
        </TouchableOpacity>
    </View>
);

const PermissionModal = ({ visible, onClose, roleName, permissions }: any) => (
    <Modal visible={visible} transparent animationType="slide">
        <View className="flex-1 bg-black/50 justify-end">
            <View className="bg-white rounded-t-[40px] p-8 pb-12">
                <View className="flex-row justify-between items-center mb-6">
                    <View>
                        <Text className="text-2xl font-black text-slate-900">Manage Permissions</Text>
                        <Text className="text-slate-500 font-medium">{roleName}</Text>
                    </View>
                    <TouchableOpacity onPress={onClose} className="bg-slate-100 p-2 rounded-full">
                        <X size={20} color="#111827" />
                    </TouchableOpacity>
                </View>
                
                <ScrollView className="max-h-96 mb-6">
                    {['Manage Users', 'Manage Finance', 'System Settings', 'View Logs', 'Manage Roles', 'Access Library', 'Grade Assignments', 'View Analytics'].map((perm) => (
                        <TouchableOpacity key={perm} className="flex-row items-center justify-between py-4 border-b border-slate-50">
                            <Text className={`text-base font-semibold ${permissions.includes(perm) ? 'text-slate-900' : 'text-slate-400'}`}>{perm}</Text>
                            <View className={`w-6 h-6 rounded-full items-center justify-center ${permissions.includes(perm) ? 'bg-green-500' : 'border-2 border-slate-200'}`}>
                                {permissions.includes(perm) && <Check size={14} color="white" />}
                            </View>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                <TouchableOpacity className="bg-[#f97316] py-5 rounded-2xl items-center shadow-lg" onPress={onClose}>
                    <Text className="text-white font-bold text-lg">Save Configuration</Text>
                </TouchableOpacity>
            </View>
        </View>
    </Modal>
);

export default function RolesAndPermissions() {
    const router = useRouter();
    const [selectedRole, setSelectedRole] = React.useState<any>(null);

    const roles = [
        {
            title: "Super Admin",
            description: "Full system access & configuration",
            isDefault: true,
            permissions: ["Manage Users", "Manage Finance", "System Settings", "View Logs", "Manage Roles"]
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
            <View className="bg-white px-6 pt-14 pb-6 border-b border-slate-100 flex-row items-center justify-between shadow-sm">
                <View className="flex-row items-center">
                    <TouchableOpacity onPress={() => router.back()} className="mr-4 bg-slate-50 p-2.5 rounded-2xl border border-slate-100">
                        <ChevronLeft size={24} color="#f97316" />
                    </TouchableOpacity>
                    <View>
                        <Text className="text-2xl font-bold text-slate-900">Permissions</Text>
                        <Text className="text-xs text-slate-500 font-medium">Configure access levels</Text>
                    </View>
                </View>
                <TouchableOpacity className="bg-[#f97316] p-3 rounded-2xl shadow-sm">
                    <Shield size={20} color="white" />
                </TouchableOpacity>
            </View>

            <ScrollView className="flex-1 p-5" showsVerticalScrollIndicator={false}>
                <View className="bg-orange-50 p-4 rounded-2xl mb-6 border border-orange-100">
                    <Text className="text-orange-800 text-sm font-medium leading-5">
                        Define what different users can see and do within the system. System roles are restricted for security.
                    </Text>
                </View>

                {roles.map((role, index) => (
                    <RoleCard 
                        key={index} 
                        {...role} 
                        onEdit={(name: string, perms: string[]) => setSelectedRole({ name, perms })}
                    />
                ))}

                <View className="h-20" />
            </ScrollView>

            <PermissionModal 
                visible={!!selectedRole} 
                roleName={selectedRole?.name} 
                permissions={selectedRole?.perms || []}
                onClose={() => setSelectedRole(null)} 
            />
        </View>
    );
}
