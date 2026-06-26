import { UnifiedHeader } from "@/components/common/UnifiedHeader";
import { useTheme } from "@/contexts/ThemeContext";
import { useRouter } from 'expo-router';
import { Check, Lock, Shield, X, Trash2, Plus } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Modal, ScrollView, Text, TouchableOpacity, View, ActivityIndicator, TextInput, Alert } from 'react-native';
import { RoleAPI, CustomRole, Permission } from "@/services/RoleService";

const RoleCard = ({ role, onEdit, onDelete, isDark }: { role: CustomRole; onEdit: (role: CustomRole) => void; onDelete: (id: string) => void; isDark: boolean }) => {
    const surface = isDark ? '#161B22' : '#F6F8FA';
    const border = isDark ? '#21262D' : '#D0D7DE';
    const textPrimary = isDark ? '#FFFFFF' : '#111827';
    const textSecondary = isDark ? '#9ca3af' : '#6b7280';
    const chipBg = isDark ? '#0F0B2E' : '#F6F8FA';
    const chipBorder = isDark ? '#21262D' : '#D0D7DE';

    return (
        <View style={{ backgroundColor: surface, padding: 24, borderRadius: 24, borderWidth: 1, borderColor: border, marginBottom: 20 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                    <View style={{ backgroundColor: isDark ? 'rgba(255,107,0,0.12)' : '#fff7ed', padding: 10, borderRadius: 14, marginRight: 14 }}>
                        <Shield size={22} color="#FF6B00" />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 18, fontWeight: 'bold', color: textPrimary }}>{role.name}</Text>
                        <Text style={{ fontSize: 11, color: textSecondary, marginTop: 2 }}>{role.description || "No description provided"}</Text>
                    </View>
                </View>
                {role.isDefault ? (
                    <View style={{ backgroundColor: chipBg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, borderWidth: 1, borderColor: chipBorder }}>
                        <Text style={{ fontSize: 9, fontWeight: '900', color: textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 }}>System Default</Text>
                    </View>
                ) : (
                    <TouchableOpacity onPress={() => onDelete(role.id)} style={{ padding: 4 }}>
                        <Trash2 size={18} color="#ef4444" />
                    </TouchableOpacity>
                )}
            </View>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 }}>
                {role.permissions.slice(0, 4).map((perm: string) => (
                    <View key={perm} style={{ backgroundColor: chipBg, borderWidth: 1, borderColor: chipBorder, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, marginRight: 8, marginBottom: 8, flexDirection: 'row', alignItems: 'center' }}>
                        <Check size={12} color="#10b981" style={{ marginRight: 4 }} />
                        <Text style={{ fontSize: 11, fontWeight: '600', color: textSecondary }}>{perm}</Text>
                    </View>
                ))}
                {role.permissions.length > 4 && (
                    <View style={{ backgroundColor: chipBg, borderWidth: 1, borderColor: chipBorder, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, marginRight: 8, marginBottom: 8 }}>
                        <Text style={{ fontSize: 11, fontWeight: '600', color: textSecondary }}>+{role.permissions.length - 4} More</Text>
                    </View>
                )}
                {role.permissions.length === 0 && (
                    <Text style={{ fontSize: 11, fontStyle: 'italic', color: textSecondary }}>No permissions configured</Text>
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
                    backgroundColor: role.isDefault ? chipBg : 'transparent',
                    borderWidth: 1,
                    borderColor: role.isDefault ? chipBorder : isDark ? 'rgba(255,107,0,0.3)' : '#fed7aa',
                }}
                disabled={role.isDefault}
                onPress={() => onEdit(role)}
            >
                {role.isDefault ? (
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

const PermissionModal = ({ visible, onClose, role, availablePermissions, onSave, isDark }: any) => {
    const surface = isDark ? '#161B22' : '#F6F8FA';
    const border = isDark ? '#21262D' : '#D0D7DE';
    const textPrimary = isDark ? '#FFFFFF' : '#111827';
    const textSecondary = isDark ? '#9ca3af' : '#6b7280';
    const inputBg = isDark ? '#161B22' : '#FFFFFF';

    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (role) {
            setName(role.name || '');
            setDescription(role.description || '');
            setSelectedPermissions(role.permissions || []);
        } else {
            setName('');
            setDescription('');
            setSelectedPermissions([]);
        }
    }, [role, visible]);

    const togglePermission = (permName: string) => {
        setSelectedPermissions(prev =>
            prev.includes(permName) ? prev.filter(p => p !== permName) : [...prev, permName]
        );
    };

    const handleSave = async () => {
        if (!name.trim()) {
            Alert.alert("Error", "Role name is required");
            return;
        }
        setSaving(true);
        try {
            await onSave(role?.id, name, description, selectedPermissions);
            onClose();
        } catch {
            Alert.alert("Error", "Failed to save configuration");
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal visible={visible} transparent animationType="slide">
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}>
                <View style={{ backgroundColor: surface, borderTopLeftRadius: 36, borderTopRightRadius: 36, padding: 32, paddingBottom: 48 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                        <View>
                            <Text style={{ fontSize: 22, fontWeight: '900', color: textPrimary }}>
                                {role ? "Edit Role & Permissions" : "New Custom Role"}
                            </Text>
                            {role && <Text style={{ color: textSecondary, fontWeight: '500', marginTop: 2 }}>{role.name}</Text>}
                        </View>
                        <TouchableOpacity onPress={onClose} style={{ backgroundColor: isDark ? '#161B22' : '#f1f5f9', padding: 8, borderRadius: 999, borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0' }}>
                            <X size={20} color={textPrimary} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={{ maxHeight: 400, marginBottom: 24 }}>
                        {/* Name input (only for new custom roles, default roles cannot change name) */}
                        {!role?.isDefault && (
                            <View style={{ marginBottom: 16 }}>
                                <Text style={{ fontSize: 13, fontWeight: '600', color: textSecondary, marginBottom: 6 }}>Role Name</Text>
                                <TextInput
                                    style={{ backgroundColor: inputBg, color: textPrimary, borderRadius: 12, borderWidth: 1, borderColor: border, padding: 12 }}
                                    placeholder="e.g. Assistant Bursar"
                                    placeholderTextColor={textSecondary}
                                    value={name}
                                    onChangeText={setName}
                                />
                            </View>
                        )}

                        <View style={{ marginBottom: 16 }}>
                            <Text style={{ fontSize: 13, fontWeight: '600', color: textSecondary, marginBottom: 6 }}>Description</Text>
                            <TextInput
                                style={{ backgroundColor: inputBg, color: textPrimary, borderRadius: 12, borderWidth: 1, borderColor: border, padding: 12, minHeight: 60 }}
                                placeholder="Description of the role's scope"
                                placeholderTextColor={textSecondary}
                                value={description}
                                onChangeText={setDescription}
                                multiline
                            />
                        </View>

                        <Text style={{ fontSize: 13, fontWeight: '700', color: textSecondary, marginTop: 8, marginBottom: 12 }}>Permissions</Text>
                        
                        {availablePermissions.map((perm: Permission) => (
                            <TouchableOpacity key={perm.id} onPress={() => togglePermission(perm.name)} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : '#f8fafc' }}>
                                <View style={{ flex: 1, marginRight: 16 }}>
                                    <Text style={{ fontSize: 14, fontWeight: '600', color: selectedPermissions.includes(perm.name) ? textPrimary : textSecondary }}>{perm.name}</Text>
                                    <Text style={{ fontSize: 11, color: textSecondary, marginTop: 2 }}>{perm.description}</Text>
                                </View>
                                <View style={{ width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: selectedPermissions.includes(perm.name) ? '#10b981' : 'transparent', borderWidth: selectedPermissions.includes(perm.name) ? 0 : 2, borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0' }}>
                                    {selectedPermissions.includes(perm.name) && <Check size={14} color="white" />}
                                </View>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                    <TouchableOpacity 
                        style={{ backgroundColor: '#FF6B00', paddingVertical: 18, borderRadius: 20, alignItems: 'center', opacity: saving ? 0.7 : 1 }} 
                        onPress={handleSave}
                        disabled={saving}
                    >
                        {saving ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>Save Configuration</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

export default function RolesAndPermissions() {
    const router = useRouter();
    const { isDark } = useTheme();
    const [roles, setRoles] = useState<CustomRole[]>([]);
    const [availablePermissions, setAvailablePermissions] = useState<Permission[]>([]);
    const [selectedRole, setSelectedRole] = useState<CustomRole | null>(null);
    const [modalVisible, setModalVisible] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [rolesData, permsData] = await Promise.all([
                RoleAPI.getRoles(),
                RoleAPI.getPermissions()
            ]);
            setRoles(rolesData);
            setAvailablePermissions(permsData);
        } catch (error) {
            console.error("Failed to load roles/permissions data:", error);
            Alert.alert("Error", "Failed to load roles and permissions configurations");
        } finally {
            setLoading(false);
        }
    };

    const handleSaveRole = async (id: string | undefined, name: string, description: string, permissionNames: string[]) => {
        if (id) {
            // Update
            await RoleAPI.updateRole(id, name, description, permissionNames);
        } else {
            // Create
            await RoleAPI.createRole(name, description, permissionNames);
        }
        await loadData();
    };

    const handleDeleteRole = (id: string) => {
        Alert.alert(
            "Delete Role",
            "Are you sure you want to delete this custom role? This action cannot be undone.",
            [
                { text: "Cancel", style: "cancel" },
                { 
                    text: "Delete", 
                    style: "destructive", 
                    onPress: async () => {
                        try {
                            await RoleAPI.deleteRole(id);
                            await loadData();
                        } catch {
                            Alert.alert("Error", "Failed to delete role");
                        }
                    }
                }
            ]
        );
    };

    return (
        <View className="flex-1 bg-[#FFFFFF] dark:bg-[#161B22]">
            <UnifiedHeader
                title="Management"
                subtitle="Permissions"
                role="Admin"
                onBack={() => router.back()}
                rightActions={
                    <TouchableOpacity 
                        style={{ backgroundColor: '#FF6B00', width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}
                        onPress={() => {
                            setSelectedRole(null);
                            setModalVisible(true);
                        }}
                    >
                        <Plus size={20} color="white" />
                    </TouchableOpacity>
                }
            />

            {loading ? (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" color="#FF6B00" />
                </View>
            ) : (
                <ScrollView style={{ flex: 1, padding: 20 }} showsVerticalScrollIndicator={false}>
                    {/* Info banner */}
                    <View style={{ backgroundColor: isDark ? 'rgba(255,107,0,0.08)' : '#fff7ed', padding: 16, borderRadius: 16, marginBottom: 24, borderWidth: 1, borderColor: isDark ? 'rgba(255,107,0,0.2)' : '#fed7aa' }}>
                        <Text style={{ color: isDark ? '#fb923c' : '#9a3412', fontSize: 13, fontWeight: '500', lineHeight: 20 }}>
                            Define what different users can see and do within the system. System roles are restricted for security.
                        </Text>
                    </View>

                    {roles.map((role) => (
                        <RoleCard
                            key={role.id}
                            role={role}
                            isDark={isDark}
                            onEdit={(r) => {
                                setSelectedRole(r);
                                setModalVisible(true);
                            }}
                            onDelete={handleDeleteRole}
                        />
                    ))}

                    <View style={{ height: 80 }} />
                </ScrollView>
            )}

            <PermissionModal
                visible={modalVisible}
                role={selectedRole}
                availablePermissions={availablePermissions}
                onClose={() => setModalVisible(false)}
                onSave={handleSaveRole}
                isDark={isDark}
            />
        </View>
    );
}