import { UnifiedHeader } from "@/components/common/UnifiedHeader";
import { useTheme } from "@/contexts/ThemeContext";
import { useRouter } from 'expo-router';
import { Check, Lock, Shield, X } from 'lucide-react-native';
import React from 'react';
import { Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native';

const RoleCard = ({ title, description, permissions, isDefault, onEdit, isDark }: any) => {
    const surface = isDark ? '#1e1e1e' : '#ffffff';
    const border = isDark ? '#2c2c2c' : '#f1f5f9';
    const textPrimary = isDark ? '#f1f1f1' : '#0f172a';
    const textSecondary = isDark ? '#9ca3af' : '#64748b';
    const chipBg = isDark ? '#242424' : '#f8fafc';
    const chipBorder = isDark ? '#2c2c2c' : '#f1f5f9';

    return (
        <View style={{ backgroundColor: surface, padding: 24, borderRadius: 24, borderWidth: 1, borderColor: border, marginBottom: 20 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                    <View style={{ backgroundColor: isDark ? 'rgba(255,107,0,0.12)' : '#fff7ed', padding: 10, borderRadius: 14, marginRight: 14 }}>
                        <Shield size={22} color="#FF6B00" />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 18, fontWeight: 'bold', color: textPrimary }}>{title}</Text>
                        <Text style={{ fontSize: 11, color: textSecondary, marginTop: 2 }}>{description}</Text>
                    </View>
                </View>
                {isDefault && (
                    <View style={{ backgroundColor: chipBg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, borderWidth: 1, borderColor: chipBorder }}>
                        <Text style={{ fontSize: 9, fontWeight: '900', color: textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 }}>System Default</Text>
                    </View>
                )}
            </View>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 }}>
                {permissions.slice(0, 3).map((perm: string) => (
                    <View key={perm} style={{ backgroundColor: chipBg, borderWidth: 1, borderColor: chipBorder, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, marginRight: 8, marginBottom: 8, flexDirection: 'row', alignItems: 'center' }}>
                        <Check size={12} color="#10b981" style={{ marginRight: 4 }} />
                        <Text style={{ fontSize: 11, fontWeight: '600', color: textSecondary }}>{perm}</Text>
                    </View>
                ))}
                {permissions.length > 3 && (
                    <View style={{ backgroundColor: chipBg, borderWidth: 1, borderColor: chipBorder, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, marginRight: 8, marginBottom: 8 }}>
                        <Text style={{ fontSize: 11, fontWeight: '600', color: textSecondary }}>+{permissions.length - 3} More</Text>
                    </View>
                )}
            </View>

            <TouchableOpacity
                style={{
                    marginTop: 20,
                    flexDirection: 'row',
                    justifyContent: 'center',
                    alignItems: 'center',
                    paddingVertical: 12,
                    borderRadius: 16,
                    backgroundColor: isDefault ? chipBg : 'transparent',
                    borderWidth: 1,
                    borderColor: isDefault ? chipBorder : isDark ? 'rgba(255,107,0,0.3)' : '#fed7aa',
                }}
                disabled={isDefault}
                onPress={() => onEdit(title, permissions)}
            >
                {isDefault ? (
                    <>
                        <Lock size={16} color={textSecondary} style={{ marginRight: 8 }} />
                        <Text style={{ color: textSecondary, fontWeight: '600', fontSize: 13 }}>System Restricted</Text>
                    </>
                ) : (
                    <Text style={{ color: '#FF6B00', fontWeight: 'bold', fontSize: 13 }}>Edit Role & Permissions</Text>
                )}
            </TouchableOpacity>
        </View>
    );
};

const PermissionModal = ({ visible, onClose, roleName, permissions, isDark }: any) => {
    const surface = isDark ? '#1e1e1e' : '#ffffff';
    const border = isDark ? '#2c2c2c' : '#f8fafc';
    const textPrimary = isDark ? '#f1f1f1' : '#0f172a';
    const textSecondary = isDark ? '#9ca3af' : '#94a3b8';

    const allPerms = ['Manage Users', 'Manage Finance', 'System Settings', 'View Logs', 'Manage Roles', 'Access Library', 'Grade Assignments', 'View Analytics'];

    return (
        <Modal visible={visible} transparent animationType="slide">
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}>
                <View style={{ backgroundColor: surface, borderTopLeftRadius: 36, borderTopRightRadius: 36, padding: 32, paddingBottom: 48 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                        <View>
                            <Text style={{ fontSize: 22, fontWeight: '900', color: textPrimary }}>Manage Permissions</Text>
                            <Text style={{ color: textSecondary, fontWeight: '500', marginTop: 2 }}>{roleName}</Text>
                        </View>
                        <TouchableOpacity onPress={onClose} style={{ backgroundColor: isDark ? '#242424' : '#f1f5f9', padding: 8, borderRadius: 999, borderWidth: 1, borderColor: isDark ? '#2c2c2c' : '#e2e8f0' }}>
                            <X size={20} color={textPrimary} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={{ maxHeight: 384, marginBottom: 24 }}>
                        {allPerms.map((perm) => (
                            <TouchableOpacity key={perm} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: isDark ? '#2c2c2c' : '#f8fafc' }}>
                                <Text style={{ fontSize: 15, fontWeight: '600', color: permissions.includes(perm) ? textPrimary : textSecondary }}>{perm}</Text>
                                <View style={{ width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: permissions.includes(perm) ? '#10b981' : 'transparent', borderWidth: permissions.includes(perm) ? 0 : 2, borderColor: isDark ? '#2c2c2c' : '#e2e8f0' }}>
                                    {permissions.includes(perm) && <Check size={14} color="white" />}
                                </View>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                    <TouchableOpacity style={{ backgroundColor: '#FF6B00', paddingVertical: 18, borderRadius: 20, alignItems: 'center' }} onPress={onClose}>
                        <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>Save Configuration</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

export default function RolesAndPermissions() {
    const router = useRouter();
    const { isDark } = useTheme();
    const [selectedRole, setSelectedRole] = React.useState<any>(null);

    const roles = [
        { title: "Super Admin", description: "Full system access & configuration", isDefault: true, permissions: ["Manage Users", "Manage Finance", "System Settings", "View Logs", "Manage Roles"] },
        { title: "Teacher", description: "Access for teaching staff", isDefault: false, permissions: ["Mark Attendance", "View Assigned Subjects", "Enter Grades", "View Timetable"] },
        { title: "Student", description: "Standard student access", isDefault: false, permissions: ["View Grades", "View Timetable", "Borrow Books", "Update Profile"] },
        { title: "Bursar", description: "Financial management access", isDefault: false, permissions: ["Manage Payments", "View Financial Reports", "Manage Bursaries"] },
        { title: "Librarian", description: "Library resource management", isDefault: false, permissions: ["Add Books", "Manage Loans", "View Library Reports"] },
    ];

    return (
        <View style={{ flex: 1, backgroundColor: isDark ? '#121212' : '#f9fafb' }}>
            <UnifiedHeader
                title="Management"
                subtitle="Permissions"
                role="Admin"
                onBack={() => router.back()}
                // rightActions={
                //     <TouchableOpacity style={{ backgroundColor: '#FF6B00', padding: 10, borderRadius: 14 }}>
                //         <Shield size={20} color="white" />
                //     </TouchableOpacity>
                // }
            />

            <ScrollView style={{ flex: 1, padding: 20 }} showsVerticalScrollIndicator={false}>
                {/* Info banner */}
                <View style={{ backgroundColor: isDark ? 'rgba(255,107,0,0.08)' : '#fff7ed', padding: 16, borderRadius: 16, marginBottom: 24, borderWidth: 1, borderColor: isDark ? 'rgba(255,107,0,0.2)' : '#fed7aa' }}>
                    <Text style={{ color: isDark ? '#fb923c' : '#9a3412', fontSize: 13, fontWeight: '500', lineHeight: 20 }}>
                        Define what different users can see and do within the system. System roles are restricted for security.
                    </Text>
                </View>

                {roles.map((role, index) => (
                    <RoleCard
                        key={index}
                        {...role}
                        isDark={isDark}
                        onEdit={(name: string, perms: string[]) => setSelectedRole({ name, perms })}
                    />
                ))}

                <View style={{ height: 80 }} />
            </ScrollView>

            <PermissionModal
                visible={!!selectedRole}
                roleName={selectedRole?.name}
                permissions={selectedRole?.perms || []}
                onClose={() => setSelectedRole(null)}
                isDark={isDark}
            />
        </View>
    );
}