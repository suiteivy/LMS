import { UnifiedHeader } from "@/components/common/UnifiedHeader";
import { ActionTooltip } from "@/components/common/ActionTooltip";
import { useTheme } from "@/contexts/ThemeContext";
import { useRouter } from 'expo-router';
import { 
    Check, 
    Lock, 
    Shield, 
    X, 
    Trash2, 
    Plus, 
    BookOpen, 
    GraduationCap, 
    CalendarCheck, 
    Clock, 
    Wallet, 
    Library, 
    MessageSquare, 
    Users, 
    School,
    SlidersHorizontal,
    Info,
    Sparkles
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Modal, ScrollView, Text, TouchableOpacity, View, ActivityIndicator, TextInput, Alert, Platform } from 'react-native';
import { 
    RoleAPI, 
    CustomRole, 
    RoleTemplate, 
    ROLE_TEMPLATES, 
    DataScope 
} from '@/services/RoleService';
import { LibrarianManagement } from "@/components/admin/library/LibrarianManagement";

interface ModulePermissionSpec {
    id: string;
    title: string;
    description: string;
    icon: any;
    readPerm: string;
    writePerm: string;
    actions?: {
        id: string;
        label: string;
        description: string;
    }[];
}

const MODULE_SPECS: ModulePermissionSpec[] = [
    {
        id: 'academic',
        title: 'Academic & Curriculum',
        description: 'Subjects, syllabus, exams, homework, and grade records',
        icon: GraduationCap,
        readPerm: 'academic:read',
        writePerm: 'academic:write',
        actions: [
            {
                id: 'academic:publish_reports',
                label: 'Publish Report Cards & Results',
                description: 'Release official terminal reports and report cards to parents and students'
            }
        ]
    },
    {
        id: 'attendance',
        title: 'Attendance Tracking',
        description: 'Student rolls, class registers, and daily check-ins',
        icon: CalendarCheck,
        readPerm: 'attendance:read',
        writePerm: 'attendance:write',
        actions: [
            {
                id: 'attendance:approve_teacher',
                label: 'Approve Teacher Attendance',
                description: 'Review and verify self-reported teacher attendance and leave entries'
            }
        ]
    },
    {
        id: 'timetables',
        title: 'Timetable & Scheduling',
        description: 'Class scheduling, teacher periods, and room allocations',
        icon: Clock,
        readPerm: 'timetables:read',
        writePerm: 'timetables:write',
        actions: [
            {
                id: 'timetables:publish',
                label: 'Publish & Activate Timetables',
                description: 'Promote draft timetables to active school schedule'
            }
        ]
    },
    {
        id: 'finance',
        title: 'Finance & Bursaries',
        description: 'Fee structures, invoices, payment tracking, and student balances',
        icon: Wallet,
        readPerm: 'finance:read',
        writePerm: 'finance:write',
        actions: [
            {
                id: 'bursary:write',
                label: 'Review & Disburse Bursaries',
                description: 'Approve relief allocations and apply bursary discounts to balances'
            }
        ]
    },
    {
        id: 'library',
        title: 'Library System',
        description: 'Inventory management, book borrowing, and returns',
        icon: Library,
        readPerm: 'library:read',
        writePerm: 'library:write'
    },
    {
        id: 'communication',
        title: 'Communication Hub',
        description: 'Direct messaging, class diary, and parent notices',
        icon: MessageSquare,
        readPerm: 'messages:read',
        writePerm: 'messages:write',
        actions: [
            {
                id: 'announcements:write',
                label: 'Post Institution Announcements',
                description: 'Broadcast notices to entire school community or specific cohorts'
            }
        ]
    },
    {
        id: 'users',
        title: 'User Management',
        description: 'Staff, student, and parent profile directory',
        icon: Users,
        readPerm: 'users:read',
        writePerm: 'users:manage',
        actions: [
            {
                id: 'users:approve_changes',
                label: 'Approve Profile Change Requests',
                description: 'Review and authorize student/parent name and document change submissions'
            }
        ]
    },
    {
        id: 'classes',
        title: 'Classes & Streams',
        description: 'Class rosters, stream assignments, and cohort capacity',
        icon: School,
        readPerm: 'classes:read',
        writePerm: 'classes:manage'
    }
];

const RoleCard = ({ 
    role, 
    onEdit, 
    onDelete, 
    isDark 
}: { 
    role: CustomRole; 
    onEdit: (role: CustomRole) => void; 
    onDelete: (id: string) => void; 
    isDark: boolean 
}) => {
    const surface = isDark ? '#161B22' : '#FFFFFF';
    const border = isDark ? '#21262D' : '#E2E8F0';
    const textPrimary = isDark ? '#FFFFFF' : '#0F172A';
    const textSecondary = isDark ? '#94A3B8' : '#64748B';
    const chipBg = isDark ? '#1C2128' : '#F8FAFC';
    const chipBorder = isDark ? '#30363D' : '#E2E8F0';

    const dataScopeLabel = role.data_scope === 'levels' 
        ? 'Assigned Levels' 
        : role.data_scope === 'classes' 
        ? 'Assigned Classes' 
        : 'Whole School';

    const dataScopeColor = role.data_scope === 'levels'
        ? '#3B82F6'
        : role.data_scope === 'classes'
        ? '#8B5CF6'
        : '#10B981';

    return (
        <View style={{ 
            backgroundColor: surface, 
            padding: 22, 
            borderRadius: 20, 
            borderWidth: 1, 
            borderColor: border, 
            marginBottom: 16,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: isDark ? 0.2 : 0.04,
            shadowRadius: 6,
            elevation: 2
        }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 12 }}>
                    <View style={{ 
                        backgroundColor: isDark ? 'rgba(255,105,0,0.12)' : '#FFF7ED', 
                        padding: 10, 
                        borderRadius: 14, 
                        marginRight: 14,
                        borderWidth: 1,
                        borderColor: isDark ? 'rgba(255,105,0,0.25)' : 'rgba(255,105,0,0.2)'
                    }}>
                        <Shield size={22} color="#FF6900" />
                    </View>
                    <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <Text style={{ fontSize: 17, fontWeight: '700', color: textPrimary }}>{role.name}</Text>
                            <View style={{ 
                                backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F1F5F9', 
                                paddingHorizontal: 8, 
                                paddingVertical: 2, 
                                borderRadius: 6,
                                borderWidth: 1,
                                borderColor: chipBorder
                            }}>
                                <Text style={{ fontSize: 10, fontWeight: '700', color: dataScopeColor }}>
                                    {dataScopeLabel}
                                </Text>
                            </View>
                        </View>
                        <Text style={{ fontSize: 12, color: textSecondary, marginTop: 4, lineHeight: 17 }}>
                            {role.description || "Custom functional role"}
                        </Text>
                    </View>
                </View>

                {role.isDefault ? (
                    <View style={{ backgroundColor: chipBg, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: chipBorder }}>
                        <Text style={{ fontSize: 9, fontWeight: '800', color: textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                            Built-in
                        </Text>
                    </View>
                ) : (
                    <ActionTooltip
                        label="Delete Custom Role"
                        description="Permanently remove this custom role and revoke its assigned permissions."
                        learnMoreAnchor="custom-roles"
                    >
                        <TouchableOpacity 
                            onPress={() => onDelete(role.id)} 
                            style={{ padding: 6, borderRadius: 8, backgroundColor: isDark ? 'rgba(239,68,68,0.1)' : '#FEF2F2' }}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                            <Trash2 size={16} color="#EF4444" />
                        </TouchableOpacity>
                    </ActionTooltip>
                )}
            </View>

            {/* Configured permissions badges */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                {role.permissions.slice(0, 5).map((perm: string) => (
                    <View 
                        key={perm} 
                        style={{ 
                            backgroundColor: chipBg, 
                            borderWidth: 1, 
                            borderColor: chipBorder, 
                            paddingHorizontal: 9, 
                            paddingVertical: 4, 
                            borderRadius: 8, 
                            flexDirection: 'row', 
                            alignItems: 'center' 
                        }}
                    >
                        <Check size={11} color="#10B981" style={{ marginRight: 4 }} />
                        <Text style={{ fontSize: 11, fontWeight: '600', color: textSecondary }}>
                            {perm}
                        </Text>
                    </View>
                ))}
                {role.permissions.length > 5 && (
                    <View style={{ backgroundColor: chipBg, borderWidth: 1, borderColor: chipBorder, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
                        <Text style={{ fontSize: 11, fontWeight: '600', color: textSecondary }}>
                            +{role.permissions.length - 5} More
                        </Text>
                    </View>
                )}
                {role.permissions.length === 0 && (
                    <Text style={{ fontSize: 12, fontStyle: 'italic', color: textSecondary }}>
                        No permissions configured
                    </Text>
                )}
            </View>

            <ActionTooltip
                label={role.isDefault ? "System Guarded Role" : "Edit Permissions & Scope"}
                description={role.isDefault ? "Built-in system roles have immutable privileges to protect platform integrity." : "Configure data scope boundaries and granular module privileges."}
                learnMoreAnchor="custom-roles"
            >
                <TouchableOpacity
                    style={{
                        marginTop: 18,
                        flexDirection: 'row',
                        justifyContent: 'center',
                        alignItems: 'center',
                        paddingVertical: 10,
                        borderRadius: 12,
                        backgroundColor: role.isDefault ? chipBg : (isDark ? 'rgba(255,105,0,0.08)' : '#FFF7ED'),
                        borderWidth: 1,
                        borderColor: role.isDefault ? chipBorder : (isDark ? 'rgba(255,105,0,0.3)' : '#FED7AA'),
                    }}
                    disabled={role.isDefault}
                    onPress={() => onEdit(role)}
                >
                    {role.isDefault ? (
                        <>
                            <Lock size={14} color={textSecondary} style={{ marginRight: 6 }} />
                            <Text style={{ color: textSecondary, fontWeight: '600', fontSize: 12 }}>System Guarded</Text>
                        </>
                    ) : (
                        <Text style={{ color: '#FF6900', fontWeight: '700', fontSize: 12 }}>Edit Permissions & Scope</Text>
                    )}
                </TouchableOpacity>
            </ActionTooltip>
        </View>
    );
};

const RoleBuilderModal = ({ 
    visible, 
    onClose, 
    role, 
    onSave, 
    isDark 
}: {
    visible: boolean;
    onClose: () => void;
    role: CustomRole | null;
    onSave: (id: string | undefined, name: string, description: string, perms: string[], dataScope: DataScope, metadata: any) => Promise<void>;
    isDark: boolean;
}) => {
    const surface = isDark ? '#161B22' : '#FFFFFF';
    const bg = isDark ? '#0F141C' : '#F8FAFC';
    const border = isDark ? '#21262D' : '#E2E8F0';
    const textPrimary = isDark ? '#FFFFFF' : '#0F172A';
    const textSecondary = isDark ? '#94A3B8' : '#64748B';
    const inputBg = isDark ? '#161B22' : '#FFFFFF';

    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [dataScope, setDataScope] = useState<DataScope>('all');
    const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
    const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (role) {
            setName(role.name || '');
            setDescription(role.description || '');
            setDataScope(role.data_scope || 'all');
            setSelectedPermissions(role.permissions || []);
            setSelectedTemplate(role.metadata?.template || null);
        } else {
            setName('');
            setDescription('');
            setDataScope('all');
            setSelectedPermissions([]);
            setSelectedTemplate('blank');
        }
    }, [role, visible]);

    const applyTemplate = (template: RoleTemplate) => {
        setSelectedTemplate(template.id);
        setSelectedPermissions(template.permissions);
        setDataScope(template.data_scope);
        if (!name.trim() && template.id !== 'blank') {
            setName(template.title);
            setDescription(template.description);
        }
    };

    const getModuleAccess = (spec: ModulePermissionSpec): 'none' | 'read' | 'write' => {
        const hasWrite = selectedPermissions.includes(spec.writePerm);
        const hasRead = selectedPermissions.includes(spec.readPerm);
        if (hasWrite) return 'write';
        if (hasRead) return 'read';
        return 'none';
    };

    const setModuleAccess = (spec: ModulePermissionSpec, level: 'none' | 'read' | 'write') => {
        const toRemove = new Set<string>([spec.readPerm, spec.writePerm]);
        if (level === 'none' && spec.actions) {
            spec.actions.forEach(a => toRemove.add(a.id));
        }

        const filtered = selectedPermissions.filter(p => !toRemove.has(p));
        if (level === 'read') {
            filtered.push(spec.readPerm);
        } else if (level === 'write') {
            filtered.push(spec.readPerm);
            filtered.push(spec.writePerm);
        }
        setSelectedPermissions(filtered);
    };

    const toggleActionPermission = (permId: string) => {
        setSelectedPermissions(prev => 
            prev.includes(permId) ? prev.filter(p => p !== permId) : [...prev, permId]
        );
    };

    const handleSave = async () => {
        if (!name.trim()) {
            Alert.alert("Required", "Please enter a name for the custom role.");
            return;
        }

        setSaving(true);
        try {
            await onSave(
                role?.id,
                name.trim(),
                description.trim(),
                selectedPermissions,
                dataScope,
                { template: selectedTemplate }
            );
            onClose();
        } catch (err: any) {
            Alert.alert("Save Failed", err?.response?.data?.error || err.message || "Failed to save role configuration.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', alignItems: 'center', padding: 16 }}>
                <View style={{ 
                    backgroundColor: surface, 
                    borderRadius: 24, 
                    borderWidth: 1, 
                    borderColor: border, 
                    width: '100%', 
                    maxWidth: 780, 
                    maxHeight: '92%',
                    overflow: 'hidden',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 8 },
                    shadowOpacity: 0.35,
                    shadowRadius: 24,
                    elevation: 10
                }}>
                    {/* Header */}
                    <View style={{ 
                        flexDirection: 'row', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        paddingHorizontal: 24, 
                        paddingVertical: 18, 
                        borderBottomWidth: 1, 
                        borderBottomColor: border 
                    }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                            <View style={{ backgroundColor: isDark ? 'rgba(255,105,0,0.12)' : '#FFF7ED', padding: 8, borderRadius: 10 }}>
                                <Shield size={20} color="#FF6900" />
                            </View>
                            <View>
                                <Text style={{ fontSize: 18, fontWeight: '800', color: textPrimary }}>
                                    {role ? "Edit Custom Role" : "Create Custom Role"}
                                </Text>
                                <Text style={{ fontSize: 11, color: textSecondary }}>
                                    Configure granular permissions, action capabilities, and data scoping
                                </Text>
                            </View>
                        </View>
                        <TouchableOpacity onPress={onClose} style={{ padding: 6, borderRadius: 8 }}>
                            <X size={20} color={textSecondary} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={{ padding: 24 }} showsVerticalScrollIndicator={false}>
                        {/* Templates Selector (Only for new role) */}
                        {!role && (
                            <View style={{ marginBottom: 20 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                                    <Sparkles size={14} color="#FF6900" />
                                    <Text style={{ fontSize: 13, fontWeight: '700', color: textPrimary }}>
                                        Quick Templates
                                    </Text>
                                </View>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row' }}>
                                    {ROLE_TEMPLATES.map(tmpl => {
                                        const isSelected = selectedTemplate === tmpl.id;
                                        return (
                                            <TouchableOpacity
                                                key={tmpl.id}
                                                onPress={() => applyTemplate(tmpl)}
                                                style={{
                                                    paddingHorizontal: 14,
                                                    paddingVertical: 8,
                                                    borderRadius: 12,
                                                    borderWidth: 1,
                                                    borderColor: isSelected ? '#FF6900' : border,
                                                    backgroundColor: isSelected ? (isDark ? 'rgba(255,105,0,0.15)' : '#FFF7ED') : bg,
                                                    marginRight: 8,
                                                }}
                                            >
                                                <Text style={{ fontSize: 12, fontWeight: isSelected ? '700' : '600', color: isSelected ? '#FF6900' : textPrimary }}>
                                                    {tmpl.title}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </ScrollView>
                            </View>
                        )}

                        {/* Name & Description */}
                        <View style={{ marginBottom: 16 }}>
                            <Text style={{ fontSize: 13, fontWeight: '600', color: textSecondary, marginBottom: 6 }}>
                                Role Name *
                            </Text>
                            <TextInput
                                style={{
                                    backgroundColor: inputBg,
                                    color: textPrimary,
                                    borderRadius: 12,
                                    borderWidth: 1,
                                    borderColor: border,
                                    paddingHorizontal: 14,
                                    paddingVertical: 10,
                                    fontSize: 14,
                                    ...(Platform.OS === 'web' ? { outline: 'none' } : {})
                                } as any}
                                placeholder="e.g. Dean of Studies, Timetable Master"
                                placeholderTextColor={textSecondary}
                                value={name}
                                onChangeText={setName}
                                editable={!role?.isDefault}
                            />
                        </View>

                        <View style={{ marginBottom: 20 }}>
                            <Text style={{ fontSize: 13, fontWeight: '600', color: textSecondary, marginBottom: 6 }}>
                                Role Description
                            </Text>
                            <TextInput
                                style={{
                                    backgroundColor: inputBg,
                                    color: textPrimary,
                                    borderRadius: 12,
                                    borderWidth: 1,
                                    borderColor: border,
                                    paddingHorizontal: 14,
                                    paddingVertical: 10,
                                    fontSize: 13,
                                    minHeight: 56,
                                    textAlignVertical: 'top',
                                    ...(Platform.OS === 'web' ? { outline: 'none' } : {})
                                } as any}
                                placeholder="Explain what responsibilities this role handles in the institution"
                                placeholderTextColor={textSecondary}
                                value={description}
                                onChangeText={setDescription}
                                multiline
                            />
                        </View>

                        {/* Data Scope Selector */}
                        <View style={{ marginBottom: 24, padding: 16, backgroundColor: bg, borderRadius: 16, borderWidth: 1, borderColor: border }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                                <SlidersHorizontal size={15} color="#FF6900" />
                                <Text style={{ fontSize: 13, fontWeight: '700', color: textPrimary }}>
                                    Data Scope Boundary
                                </Text>
                            </View>
                            <Text style={{ fontSize: 11, color: textSecondary, marginBottom: 12 }}>
                                Defines whether this role has visibility across the entire institution, or only to their assigned classes/levels.
                            </Text>

                            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                                {[
                                    { id: 'all', title: 'Whole Institution', desc: 'All grades & classes' },
                                    { id: 'levels', title: 'Assigned Levels', desc: 'Only assigned grade levels' },
                                    { id: 'classes', title: 'Assigned Classes', desc: 'Only assigned classes' }
                                ].map((sc) => {
                                    const isSelected = dataScope === sc.id;
                                    return (
                                        <TouchableOpacity
                                            key={sc.id}
                                            onPress={() => setDataScope(sc.id as any)}
                                            style={{
                                                flex: 1,
                                                minWidth: 150,
                                                padding: 10,
                                                borderRadius: 10,
                                                borderWidth: 1,
                                                borderColor: isSelected ? '#FF6900' : border,
                                                backgroundColor: isSelected ? (isDark ? 'rgba(255,105,0,0.12)' : '#FFF7ED') : inputBg,
                                            }}
                                        >
                                            <Text style={{ fontSize: 12, fontWeight: isSelected ? '700' : '600', color: isSelected ? '#FF6900' : textPrimary }}>
                                                {sc.title}
                                            </Text>
                                            <Text style={{ fontSize: 10, color: textSecondary, marginTop: 2 }}>
                                                {sc.desc}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </View>

                        {/* Module Permissions Matrix */}
                        <Text style={{ fontSize: 14, fontWeight: '800', color: textPrimary, marginBottom: 12 }}>
                            Module Access & Operations
                        </Text>

                        {MODULE_SPECS.map(spec => {
                            const currentAccess = getModuleAccess(spec);
                            const IconComponent = spec.icon;

                            return (
                                <View 
                                    key={spec.id} 
                                    style={{ 
                                        backgroundColor: inputBg, 
                                        borderRadius: 16, 
                                        borderWidth: 1, 
                                        borderColor: border, 
                                        padding: 16, 
                                        marginBottom: 12 
                                    }}
                                >
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 12 }}>
                                            <View style={{ backgroundColor: isDark ? '#1C2128' : '#F1F5F9', padding: 8, borderRadius: 10, marginRight: 10 }}>
                                                <IconComponent size={18} color="#FF6900" />
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <Text style={{ fontSize: 14, fontWeight: '700', color: textPrimary }}>{spec.title}</Text>
                                                <Text style={{ fontSize: 11, color: textSecondary, marginTop: 2 }}>{spec.description}</Text>
                                            </View>
                                        </View>

                                        {/* 3-way toggle: None, Read, Read & Write */}
                                        <View style={{ flexDirection: 'row', backgroundColor: bg, borderRadius: 10, padding: 3, borderWidth: 1, borderColor: border }}>
                                            {(['none', 'read', 'write'] as const).map(lvl => {
                                                const isActive = currentAccess === lvl;
                                                const label = lvl === 'none' ? 'None' : lvl === 'read' ? 'Read' : 'R & W';
                                                return (
                                                    <TouchableOpacity
                                                        key={lvl}
                                                        onPress={() => setModuleAccess(spec, lvl)}
                                                        style={{
                                                            paddingHorizontal: 10,
                                                            paddingVertical: 5,
                                                            borderRadius: 7,
                                                            backgroundColor: isActive ? '#FF6900' : 'transparent',
                                                        }}
                                                    >
                                                        <Text style={{ 
                                                            fontSize: 11, 
                                                            fontWeight: isActive ? '700' : '600', 
                                                            color: isActive ? '#FFFFFF' : textSecondary 
                                                        }}>
                                                            {label}
                                                        </Text>
                                                    </TouchableOpacity>
                                                );
                                            })}
                                        </View>
                                    </View>

                                    {/* Action specific sub-toggles if module has actions and is accessible */}
                                    {spec.actions && currentAccess !== 'none' && (
                                        <View style={{ 
                                            marginTop: 10, 
                                            paddingTop: 10, 
                                            borderTopWidth: 1, 
                                            borderTopColor: border 
                                        }}>
                                            <Text style={{ fontSize: 11, fontWeight: '700', color: textSecondary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                                Authorized Workflow Actions
                                            </Text>
                                            {spec.actions.map(act => {
                                                const isActionActive = selectedPermissions.includes(act.id);
                                                return (
                                                    <TouchableOpacity
                                                        key={act.id}
                                                        onPress={() => toggleActionPermission(act.id)}
                                                        style={{ 
                                                            flexDirection: 'row', 
                                                            alignItems: 'center', 
                                                            justifyContent: 'space-between',
                                                            paddingVertical: 8,
                                                        }}
                                                    >
                                                        <View style={{ flex: 1, marginRight: 12 }}>
                                                            <Text style={{ fontSize: 12, fontWeight: '600', color: isActionActive ? textPrimary : textSecondary }}>
                                                                {act.label}
                                                            </Text>
                                                            <Text style={{ fontSize: 10, color: textSecondary, marginTop: 1 }}>
                                                                {act.description}
                                                            </Text>
                                                        </View>
                                                        <View style={{
                                                            width: 20,
                                                            height: 20,
                                                            borderRadius: 6,
                                                            borderWidth: isActionActive ? 0 : 2,
                                                            borderColor: border,
                                                            backgroundColor: isActionActive ? '#FF6900' : 'transparent',
                                                            alignItems: 'center',
                                                            justifyContent: 'center'
                                                        }}>
                                                            {isActionActive && <Check size={13} color="#FFFFFF" />}
                                                        </View>
                                                    </TouchableOpacity>
                                                );
                                            })}
                                        </View>
                                    )}
                                </View>
                            );
                        })}

                        {/* Guardrails notice */}
                        <View style={{ 
                            flexDirection: 'row', 
                            alignItems: 'flex-start', 
                            backgroundColor: isDark ? 'rgba(59,130,246,0.08)' : '#EFF6FF', 
                            borderWidth: 1, 
                            borderColor: isDark ? 'rgba(59,130,246,0.2)' : '#BFDBFE', 
                            borderRadius: 14, 
                            padding: 14, 
                            marginTop: 10, 
                            marginBottom: 20, 
                            gap: 10 
                        }}>
                            <Info size={18} color="#3B82F6" style={{ marginTop: 2 }} />
                            <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 12, fontWeight: '700', color: isDark ? '#93C5FD' : '#1E40AF' }}>
                                    Security Guardrails Applied
                                </Text>
                                <Text style={{ fontSize: 11, color: isDark ? '#BFDBFE' : '#1E3A8A', marginTop: 2, lineHeight: 16 }}>
                                    Role Assignment, Institution Configuration & Ownership, and Subscription Billing are permanently reserved for Main Admin and cannot be delegated to custom roles.
                                </Text>
                            </View>
                        </View>
                    </ScrollView>

                    {/* Footer */}
                    <View style={{ 
                        flexDirection: 'row', 
                        justifyContent: 'flex-end', 
                        alignItems: 'center', 
                        gap: 12, 
                        paddingHorizontal: 24, 
                        paddingVertical: 16, 
                        borderTopWidth: 1, 
                        borderTopColor: border 
                    }}>
                        <TouchableOpacity 
                            onPress={onClose}
                            style={{ 
                                paddingHorizontal: 16, 
                                paddingVertical: 10, 
                                borderRadius: 12, 
                                borderWidth: 1, 
                                borderColor: border 
                            }}
                        >
                            <Text style={{ fontSize: 13, fontWeight: '600', color: textSecondary }}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={handleSave}
                            disabled={saving}
                            style={{ 
                                backgroundColor: '#FF6900', 
                                paddingHorizontal: 20, 
                                paddingVertical: 10, 
                                borderRadius: 12,
                                opacity: saving ? 0.7 : 1,
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: 8
                            }}
                        >
                            {saving ? (
                                <ActivityIndicator size="small" color="#FFFFFF" />
                            ) : (
                                <Text style={{ fontSize: 13, fontWeight: '700', color: '#FFFFFF' }}>Save Role</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

export default function RolesAndPermissions() {
    const router = useRouter();
    const { isDark } = useTheme();
    const [activeTab, setActiveTab] = useState<'roles' | 'librarians'>('roles');
    const [roles, setRoles] = useState<CustomRole[]>([]);
    const [selectedRole, setSelectedRole] = useState<CustomRole | null>(null);
    const [modalVisible, setModalVisible] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const rolesData = await RoleAPI.getRoles();
            setRoles(rolesData);
        } catch (error) {
            console.error("Failed to load roles data:", error);
            Alert.alert("Error", "Failed to load roles and permissions configurations");
        } finally {
            setLoading(false);
        }
    };

    const handleSaveRole = async (
        id: string | undefined, 
        name: string, 
        description: string, 
        permissionNames: string[],
        dataScope: DataScope,
        metadata: any
    ) => {
        if (id) {
            await RoleAPI.updateRole(id, name, description, permissionNames, dataScope, metadata);
        } else {
            await RoleAPI.createRole(name, description, permissionNames, dataScope, metadata);
        }
        await loadData();
    };

    const handleDeleteRole = (id: string) => {
        Alert.alert(
            "Delete Custom Role",
            "Are you sure you want to delete this custom role? Assigned users will lose its permissions.",
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
                            Alert.alert("Error", "Failed to delete custom role");
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
                subtitle={activeTab === 'roles' ? "Roles & Permissions" : "Librarians"}
                role="Admin"
                onBack={() => router.back()}
                rightActions={
                    activeTab === 'roles' ? (
                        <ActionTooltip
                            label="Create Custom Role"
                            description="Define custom operational scopes, permissions, and templates."
                            learnMoreAnchor="custom-roles"
                        >
                            <TouchableOpacity 
                                style={{ 
                                    backgroundColor: '#FF6900', 
                                    width: 36, 
                                    height: 36, 
                                    borderRadius: 12, 
                                    alignItems: 'center', 
                                    justifyContent: 'center' 
                                }}
                                onPress={() => {
                                    setSelectedRole(null);
                                    setModalVisible(true);
                                }}
                            >
                                <Plus size={20} color="white" />
                            </TouchableOpacity>
                        </ActionTooltip>
                    ) : undefined
                }
            />

            {/* Segmented Tab Bar */}
            <View className="px-5 pt-3 pb-1">
                <View className="flex-row bg-[#F6F8FA] dark:bg-[#0F141C] p-1 rounded-2xl border border-gray-200 dark:border-gray-800">
                    <TouchableOpacity
                        onPress={() => setActiveTab('roles')}
                        className={`flex-1 flex-row items-center justify-center py-2.5 rounded-xl ${
                            activeTab === 'roles' ? 'bg-white dark:bg-[#1C2128] shadow-sm' : 'bg-transparent'
                        }`}
                    >
                        <Shield size={16} color={activeTab === 'roles' ? '#FF6900' : isDark ? '#9ca3af' : '#6b7280'} style={{ marginRight: 6 }} />
                        <Text className={`font-bold text-xs ${activeTab === 'roles' ? 'text-[#FF6900]' : 'text-gray-500 dark:text-gray-400'}`}>
                            Roles & Permissions
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => setActiveTab('librarians')}
                        className={`flex-1 flex-row items-center justify-center py-2.5 rounded-xl ${
                            activeTab === 'librarians' ? 'bg-white dark:bg-[#1C2128] shadow-sm' : 'bg-transparent'
                        }`}
                    >
                        <BookOpen size={16} color={activeTab === 'librarians' ? '#FF6900' : isDark ? '#9ca3af' : '#6b7280'} style={{ marginRight: 6 }} />
                        <Text className={`font-bold text-xs ${activeTab === 'librarians' ? 'text-[#FF6900]' : 'text-gray-500 dark:text-gray-400'}`}>
                            Librarian Assignment
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>

            {activeTab === 'librarians' ? (
                <View className="flex-1">
                    <LibrarianManagement />
                </View>
            ) : loading ? (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" color="#FF6900" />
                </View>
            ) : (
                <ScrollView style={{ flex: 1, padding: 20 }} showsVerticalScrollIndicator={false}>
                    {/* Info banner */}
                    <View style={{ 
                        backgroundColor: isDark ? 'rgba(255,105,0,0.08)' : '#FFF7ED', 
                        padding: 16, 
                        borderRadius: 16, 
                        marginBottom: 20, 
                        borderWidth: 1, 
                        borderColor: isDark ? 'rgba(255,105,0,0.2)' : '#FED7AA' 
                    }}>
                        <Text style={{ color: isDark ? '#FB923C' : '#9A3412', fontSize: 13, fontWeight: '500', lineHeight: 20 }}>
                            Define customized institutional roles with precise module permissions, operational action approvals, and data scoping.
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

            <RoleBuilderModal
                visible={modalVisible}
                role={selectedRole}
                onClose={() => setModalVisible(false)}
                onSave={handleSaveRole}
                isDark={isDark}
            />
        </View>
    );
}