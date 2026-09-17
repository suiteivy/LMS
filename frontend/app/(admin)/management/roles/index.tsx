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
import { FinanceDesignationSection } from "@/components/admin/finance/FinanceDesignationSection";
import { SubjectAPI, SubjectData } from "@/services/SubjectService";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/libs/supabase";
import Toast from 'react-native-toast-message';
import { ConfirmationModal } from "@/components/common/ConfirmationModal";

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
    onDelete: (role: CustomRole) => void; 
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
                            onPress={() => onDelete(role)} 
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

type RoleTab = 'roles' | 'users' | 'librarians' | 'finance' | 'hod';

export default function RolesAndPermissions() {
    const router = useRouter();
    const { isDark } = useTheme();
    const { profile } = useAuth();
    const [activeTab, setActiveTab] = useState<RoleTab>('roles');
    const [roles, setRoles] = useState<CustomRole[]>([]);
    const [selectedRole, setSelectedRole] = useState<CustomRole | null>(null);
    const [modalVisible, setModalVisible] = useState(false);
    const [loading, setLoading] = useState(true);

    // Staff User Assignment State
    const [staffList, setStaffList] = useState<any[]>([]);
    const [userRolesMap, setUserRolesMap] = useState<Record<string, any[]>>({});
    const [userSearch, setUserSearch] = useState('');
    const [userRoleFilter, setUserRoleFilter] = useState<'all' | 'teacher' | 'admin'>('all');
    const [staffLoading, setStaffLoading] = useState(false);
    const [assignUserModalVisible, setAssignUserModalVisible] = useState(false);
    const [selectedStaffUser, setSelectedStaffUser] = useState<any | null>(null);
    const [selectedRoleIdsForUser, setSelectedRoleIdsForUser] = useState<string[]>([]);
    const [savingUserAssignment, setSavingUserAssignment] = useState(false);

    // HOD Assignment State
    const [subjectsList, setSubjectsList] = useState<SubjectData[]>([]);
    const [teachersList, setTeachersList] = useState<{ id: string; name: string; email: string }[]>([]);
    const [hodSearch, setHodSearch] = useState('');
    const [hodLoading, setHodLoading] = useState(false);
    const [hodModalVisible, setHodModalVisible] = useState(false);
    const [selectedSubjectForHOD, setSelectedSubjectForHOD] = useState<SubjectData | null>(null);
    const [selectedHODTeacherId, setSelectedHODTeacherId] = useState<string | null>(null);
    const [savingHOD, setSavingHOD] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        if (activeTab === 'users') {
            loadStaffAndRoles();
        } else if (activeTab === 'hod') {
            loadHODData();
        }
    }, [activeTab]);

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

    const loadStaffAndRoles = async () => {
        try {
            setStaffLoading(true);
            const { data: usersData, error: userError } = await supabase
                .from('users')
                .select('id, full_name, first_name, last_name, email, role, is_active')
                .in('role', ['admin', 'teacher', 'master_admin'])
                .order('full_name', { ascending: true });

            if (userError) throw userError;
            setStaffList(usersData || []);

            const { data: urData, error: urError } = await supabase
                .from('user_roles')
                .select('user_id, role_id, roles(id, name, description, data_scope)');

            if (urError) throw urError;
            const map: Record<string, any[]> = {};
            (urData || []).forEach((row: any) => {
                if (!map[row.user_id]) map[row.user_id] = [];
                if (row.roles) map[row.user_id].push(row.roles);
            });
            setUserRolesMap(map);
        } catch (e: any) {
            console.error("Failed to load staff role assignments:", e);
            Alert.alert("Error", "Could not load staff users list.");
        } finally {
            setStaffLoading(false);
        }
    };

    const loadHODData = async () => {
        try {
            setHodLoading(true);
            const [subs, teachRes] = await Promise.all([
                SubjectAPI.getSubjects(),
                supabase.from('teachers').select('id, user_id, users(id, full_name, email)')
            ]);
            setSubjectsList(subs || []);
            const teachers = (teachRes.data || []).map((t: any) => ({
                id: t.id,
                name: t.users?.full_name || 'Unnamed Teacher',
                email: t.users?.email || ''
            }));
            setTeachersList(teachers);
        } catch (e) {
            console.error("Failed to load HOD data:", e);
            Alert.alert("Error", "Could not load subjects and teachers for HOD assignment.");
        } finally {
            setHodLoading(false);
        }
    };

    const [roleToDelete, setRoleToDelete] = useState<CustomRole | null>(null);
    const [deleteRoleLoading, setDeleteRoleLoading] = useState(false);

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
        Toast.show({
            type: 'success',
            text1: id ? 'Role Updated' : 'Role Created',
            text2: `Role "${name}" has been saved successfully.`,
        });
        await loadData();
    };

    const confirmDeleteRole = async () => {
        if (!roleToDelete) return;
        setDeleteRoleLoading(true);
        try {
            await RoleAPI.deleteRole(roleToDelete.id);
            const deletedRoleName = roleToDelete.name;
            setRoleToDelete(null);
            Toast.show({
                type: 'success',
                text1: 'Role Deleted',
                text2: `Custom role "${deletedRoleName}" was deleted successfully.`,
            });
            await loadData();
        } catch (err: any) {
            console.error('Delete role error:', err);
            const errData = err?.response?.data;
            const errorMsg = errData?.error || err.message || 'Failed to delete custom role';
            Toast.show({
                type: 'error',
                text1: errData?.code === 'ROLE_IN_USE' ? 'Role In Use' : 'Delete Failed',
                text2: errorMsg,
                visibilityTime: 5000,
            });
            Alert.alert(
                errData?.code === 'ROLE_IN_USE' ? 'Cannot Delete Role' : 'Error',
                errorMsg
            );
        } finally {
            setDeleteRoleLoading(false);
        }
    };

    const handleOpenAssignUserModal = (user: any) => {
        setSelectedStaffUser(user);
        const userAssigned = (userRolesMap[user.id] || []).map((r: any) => r.id);
        setSelectedRoleIdsForUser(userAssigned);
        setAssignUserModalVisible(true);
    };

    const handleToggleUserRole = (roleId: string) => {
        setSelectedRoleIdsForUser(prev => 
            prev.includes(roleId) ? prev.filter(id => id !== roleId) : [...prev, roleId]
        );
    };

    const handleSaveUserRoles = async () => {
        if (!selectedStaffUser) return;
        setSavingUserAssignment(true);
        try {
            await RoleAPI.assignUserRoles(selectedStaffUser.id, selectedRoleIdsForUser);
            Toast.show({
                type: 'success',
                text1: 'Roles Updated',
                text2: `Assigned roles updated for ${selectedStaffUser.full_name || selectedStaffUser.email}`,
            });
            setAssignUserModalVisible(false);
            await loadStaffAndRoles();
        } catch (err: any) {
            Alert.alert("Assignment Error", err?.response?.data?.error || err.message || "Failed to update user roles");
        } finally {
            setSavingUserAssignment(false);
        }
    };

    const handleOpenHODModal = (subject: SubjectData) => {
        setSelectedSubjectForHOD(subject);
        setSelectedHODTeacherId(subject.hod_teacher_id || null);
        setHodModalVisible(true);
    };

    const handleSaveHOD = async () => {
        if (!selectedSubjectForHOD) return;
        setSavingHOD(true);
        try {
            await SubjectAPI.updateSubject(selectedSubjectForHOD.id, {
                hod_teacher_id: selectedHODTeacherId
            });
            Toast.show({
                type: 'success',
                text1: 'HOD Updated',
                text2: selectedHODTeacherId ? 'Head of Department assigned successfully' : 'HOD designation removed',
            });
            setHodModalVisible(false);
            await loadHODData();
        } catch (err: any) {
            Alert.alert("HOD Update Failed", err?.response?.data?.error || err.message || "Failed to update Head of Department");
        } finally {
            setSavingHOD(false);
        }
    };

    const handleRemoveHOD = (subject: SubjectData) => {
        Alert.alert(
            "Remove HOD Designation",
            `Remove Head of Department assignment for ${subject.title}?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Remove",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await SubjectAPI.updateSubject(subject.id, { hod_teacher_id: null });
                            Toast.show({
                                type: 'success',
                                text1: 'HOD Removed',
                                text2: `Removed HOD for ${subject.title}`,
                            });
                            await loadHODData();
                        } catch (err: any) {
                            Alert.alert("Error", err?.message || "Failed to remove HOD");
                        }
                    }
                }
            ]
        );
    };

    const subtitles: Record<RoleTab, string> = {
        roles: 'Custom Roles & Scopes',
        users: 'Staff Role Assignment',
        librarians: 'Librarian Designation',
        finance: 'Finance Administrators',
        hod: 'Head of Department (HOD)'
    };

    // Filtered staff users
    const filteredStaff = staffList.filter(u => {
        const matchesRole = userRoleFilter === 'all' || u.role === userRoleFilter;
        const needle = userSearch.trim().toLowerCase();
        const matchesSearch = !needle 
            || (u.full_name && u.full_name.toLowerCase().includes(needle))
            || (u.email && u.email.toLowerCase().includes(needle));
        return matchesRole && matchesSearch;
    });

    // Filtered subjects for HOD
    const filteredSubjects = subjectsList.filter(s => {
        const needle = hodSearch.trim().toLowerCase();
        return !needle || s.title.toLowerCase().includes(needle);
    });

    const surface = isDark ? '#161B22' : '#FFFFFF';
    const border = isDark ? '#21262D' : '#E2E8F0';
    const textPrimary = isDark ? '#FFFFFF' : '#0F172A';
    const textSecondary = isDark ? '#94A3B8' : '#64748B';
    const bg = isDark ? '#0F141C' : '#F8FAFC';

    return (
        <View className="flex-1 bg-[#FFFFFF] dark:bg-[#161B22]">
            <UnifiedHeader
                title="Management"
                subtitle={subtitles[activeTab]}
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

            {/* Segmented Responsive Tab Bar */}
            <View className="px-4 pt-3 pb-1">
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
                    <View className="flex-row bg-[#F6F8FA] dark:bg-[#0F141C] p-1 rounded-2xl border border-gray-200 dark:border-gray-800">
                        <TouchableOpacity
                            onPress={() => setActiveTab('roles')}
                            className={`flex-row items-center justify-center px-4 py-2.5 rounded-xl ${
                                activeTab === 'roles' ? 'bg-white dark:bg-[#1C2128] shadow-sm' : 'bg-transparent'
                            }`}
                        >
                            <Shield size={15} color={activeTab === 'roles' ? '#FF6900' : textSecondary} style={{ marginRight: 6 }} />
                            <Text className={`font-bold text-xs ${activeTab === 'roles' ? 'text-[#FF6900]' : 'text-gray-500 dark:text-gray-400'}`}>
                                Custom Roles
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => setActiveTab('users')}
                            className={`flex-row items-center justify-center px-4 py-2.5 rounded-xl ${
                                activeTab === 'users' ? 'bg-white dark:bg-[#1C2128] shadow-sm' : 'bg-transparent'
                            }`}
                        >
                            <Users size={15} color={activeTab === 'users' ? '#FF6900' : textSecondary} style={{ marginRight: 6 }} />
                            <Text className={`font-bold text-xs ${activeTab === 'users' ? 'text-[#FF6900]' : 'text-gray-500 dark:text-gray-400'}`}>
                                User Assignment
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => setActiveTab('librarians')}
                            className={`flex-row items-center justify-center px-4 py-2.5 rounded-xl ${
                                activeTab === 'librarians' ? 'bg-white dark:bg-[#1C2128] shadow-sm' : 'bg-transparent'
                            }`}
                        >
                            <BookOpen size={15} color={activeTab === 'librarians' ? '#FF6900' : textSecondary} style={{ marginRight: 6 }} />
                            <Text className={`font-bold text-xs ${activeTab === 'librarians' ? 'text-[#FF6900]' : 'text-gray-500 dark:text-gray-400'}`}>
                                Librarians
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => setActiveTab('finance')}
                            className={`flex-row items-center justify-center px-4 py-2.5 rounded-xl ${
                                activeTab === 'finance' ? 'bg-white dark:bg-[#1C2128] shadow-sm' : 'bg-transparent'
                            }`}
                        >
                            <Wallet size={15} color={activeTab === 'finance' ? '#FF6900' : textSecondary} style={{ marginRight: 6 }} />
                            <Text className={`font-bold text-xs ${activeTab === 'finance' ? 'text-[#FF6900]' : 'text-gray-500 dark:text-gray-400'}`}>
                                Finance Admins
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => setActiveTab('hod')}
                            className={`flex-row items-center justify-center px-4 py-2.5 rounded-xl ${
                                activeTab === 'hod' ? 'bg-white dark:bg-[#1C2128] shadow-sm' : 'bg-transparent'
                            }`}
                        >
                            <GraduationCap size={15} color={activeTab === 'hod' ? '#FF6900' : textSecondary} style={{ marginRight: 6 }} />
                            <Text className={`font-bold text-xs ${activeTab === 'hod' ? 'text-[#FF6900]' : 'text-gray-500 dark:text-gray-400'}`}>
                                HOD Assignment
                            </Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </View>

            {/* TAB CONTENT: LIBRARIANS */}
            {activeTab === 'librarians' ? (
                <View className="flex-1">
                    <LibrarianManagement />
                </View>
            ) : activeTab === 'finance' ? (
                /* TAB CONTENT: FINANCE ADMINS */
                <View className="flex-1">
                    <FinanceDesignationSection />
                </View>
            ) : activeTab === 'users' ? (
                /* TAB CONTENT: USER ASSIGNMENT */
                <View className="flex-1 p-5">
                    {/* Search & Filter */}
                    <View className="flex-row gap-3 mb-4 items-center">
                        <View className="flex-1 flex-row items-center bg-[#F6F8FA] dark:bg-[#0D1117] rounded-xl px-3.5 py-2.5 border border-gray-200 dark:border-gray-800">
                            <TextInput
                                className="flex-1 text-gray-900 dark:text-white font-medium text-xs"
                                placeholder="Search staff members by name or email..."
                                placeholderTextColor={textSecondary}
                                value={userSearch}
                                onChangeText={setUserSearch}
                            />
                        </View>
                        <View className="flex-row bg-[#F6F8FA] dark:bg-[#0D1117] rounded-xl p-1 border border-gray-200 dark:border-gray-800">
                            {(['all', 'teacher', 'admin'] as const).map(flt => (
                                <TouchableOpacity
                                    key={flt}
                                    onPress={() => setUserRoleFilter(flt)}
                                    className={`px-3 py-1.5 rounded-lg ${userRoleFilter === flt ? 'bg-[#FF6900]' : 'bg-transparent'}`}
                                >
                                    <Text className={`text-[11px] font-bold capitalize ${userRoleFilter === flt ? 'text-white' : 'text-gray-500'}`}>
                                        {flt === 'all' ? 'All Staff' : flt}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {staffLoading ? (
                        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                            <ActivityIndicator size="large" color="#FF6900" />
                        </View>
                    ) : filteredStaff.length === 0 ? (
                        <View className="bg-white dark:bg-[#161B22] p-12 rounded-[28px] items-center border border-gray-200 dark:border-gray-800 border-dashed">
                            <Users size={44} color="#9CA3AF" style={{ opacity: 0.4 }} />
                            <Text className="text-gray-900 dark:text-white font-bold text-base mt-4">No Staff Members Found</Text>
                            <Text className="text-gray-400 text-xs text-center mt-1">
                                Adjust your search term or filter criteria.
                            </Text>
                        </View>
                    ) : (
                        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
                            {filteredStaff.map((u) => {
                                const assignedRoles = userRolesMap[u.id] || [];
                                return (
                                    <View 
                                        key={u.id}
                                        style={{
                                            backgroundColor: surface,
                                            padding: 16,
                                            borderRadius: 18,
                                            borderWidth: 1,
                                            borderColor: border,
                                            marginBottom: 12,
                                        }}
                                    >
                                        <View className="flex-row justify-between items-start mb-2">
                                            <View className="flex-1 mr-3">
                                                <View className="flex-row items-center gap-2">
                                                    <Text style={{ fontSize: 15, fontWeight: '700', color: textPrimary }}>
                                                        {u.full_name || `${u.first_name || ''} ${u.last_name || ''}`.trim() || 'Staff Member'}
                                                    </Text>
                                                    <View style={{
                                                        backgroundColor: u.role === 'admin' ? 'rgba(239,68,68,0.1)' : 'rgba(59,130,246,0.1)',
                                                        paddingHorizontal: 8,
                                                        paddingVertical: 2,
                                                        borderRadius: 6,
                                                    }}>
                                                        <Text style={{
                                                            fontSize: 10,
                                                            fontWeight: '800',
                                                            color: u.role === 'admin' ? '#EF4444' : '#3B82F6',
                                                            textTransform: 'uppercase'
                                                        }}>
                                                            {u.role}
                                                        </Text>
                                                    </View>
                                                </View>
                                                <Text style={{ fontSize: 12, color: textSecondary, marginTop: 2 }}>{u.email}</Text>
                                            </View>

                                            <TouchableOpacity
                                                onPress={() => handleOpenAssignUserModal(u)}
                                                style={{
                                                    backgroundColor: isDark ? 'rgba(255,105,0,0.15)' : '#FFF7ED',
                                                    paddingHorizontal: 12,
                                                    paddingVertical: 6,
                                                    borderRadius: 10,
                                                    borderWidth: 1,
                                                    borderColor: isDark ? 'rgba(255,105,0,0.3)' : '#FED7AA'
                                                }}
                                            >
                                                <Text style={{ fontSize: 11, fontWeight: '700', color: '#FF6900' }}>
                                                    Assign Roles
                                                </Text>
                                            </TouchableOpacity>
                                        </View>

                                        {/* Assigned custom roles chips */}
                                        <View className="flex-row flex-wrap gap-1.5 mt-2">
                                            {assignedRoles.length === 0 ? (
                                                <Text style={{ fontSize: 11, color: textSecondary, fontStyle: 'italic' }}>
                                                    No custom roles assigned
                                                </Text>
                                            ) : (
                                                assignedRoles.map((r: any) => (
                                                    <View 
                                                        key={r.id}
                                                        style={{
                                                            backgroundColor: isDark ? '#1C2128' : '#F1F5F9',
                                                            paddingHorizontal: 8,
                                                            paddingVertical: 3,
                                                            borderRadius: 6,
                                                            borderWidth: 1,
                                                            borderColor: border,
                                                            flexDirection: 'row',
                                                            alignItems: 'center'
                                                        }}
                                                    >
                                                        <Check size={10} color="#10B981" style={{ marginRight: 4 }} />
                                                        <Text style={{ fontSize: 10, fontWeight: '700', color: textPrimary }}>
                                                            {r.name}
                                                        </Text>
                                                    </View>
                                                ))
                                            )}
                                        </View>
                                    </View>
                                );
                            })}
                        </ScrollView>
                    )}
                </View>
            ) : activeTab === 'hod' ? (
                /* TAB CONTENT: HOD ASSIGNMENT */
                <View className="flex-1 p-5">
                    {/* Search */}
                    <View className="flex-row items-center bg-[#F6F8FA] dark:bg-[#0D1117] rounded-xl px-3.5 py-2.5 border border-gray-200 dark:border-gray-800 mb-4">
                        <TextInput
                            className="flex-1 text-gray-900 dark:text-white font-medium text-xs"
                            placeholder="Search subjects to view or assign Head of Department..."
                            placeholderTextColor={textSecondary}
                            value={hodSearch}
                            onChangeText={setHodSearch}
                        />
                    </View>

                    {hodLoading ? (
                        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                            <ActivityIndicator size="large" color="#FF6900" />
                        </View>
                    ) : filteredSubjects.length === 0 ? (
                        <View className="bg-white dark:bg-[#161B22] p-12 rounded-[28px] items-center border border-gray-200 dark:border-gray-800 border-dashed">
                            <GraduationCap size={44} color="#9CA3AF" style={{ opacity: 0.4 }} />
                            <Text className="text-gray-900 dark:text-white font-bold text-base mt-4">No Subjects Found</Text>
                            <Text className="text-gray-400 text-xs text-center mt-1">
                                Create subjects in the Curriculum module first.
                            </Text>
                        </View>
                    ) : (
                        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
                            {filteredSubjects.map((sub) => {
                                const hodTeacher = teachersList.find(t => t.id === sub.hod_teacher_id);
                                return (
                                    <View 
                                        key={sub.id}
                                        style={{
                                            backgroundColor: surface,
                                            padding: 16,
                                            borderRadius: 18,
                                            borderWidth: 1,
                                            borderColor: border,
                                            marginBottom: 12,
                                        }}
                                    >
                                        <View className="flex-row justify-between items-start mb-2">
                                            <View className="flex-1 mr-3">
                                                <Text style={{ fontSize: 16, fontWeight: '700', color: textPrimary }}>
                                                    {sub.title}
                                                </Text>
                                                {sub.description ? (
                                                    <Text style={{ fontSize: 11, color: textSecondary, marginTop: 2 }} numberOfLines={1}>
                                                        {sub.description}
                                                    </Text>
                                                ) : null}
                                            </View>

                                            <View className="flex-row items-center gap-2">
                                                <TouchableOpacity
                                                    onPress={() => handleOpenHODModal(sub)}
                                                    style={{
                                                        backgroundColor: isDark ? 'rgba(255,105,0,0.15)' : '#FFF7ED',
                                                        paddingHorizontal: 12,
                                                        paddingVertical: 6,
                                                        borderRadius: 10,
                                                        borderWidth: 1,
                                                        borderColor: isDark ? 'rgba(255,105,0,0.3)' : '#FED7AA'
                                                    }}
                                                >
                                                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#FF6900' }}>
                                                        {sub.hod_teacher_id ? 'Change HOD' : 'Assign HOD'}
                                                    </Text>
                                                </TouchableOpacity>

                                                {sub.hod_teacher_id && (
                                                    <TouchableOpacity
                                                        onPress={() => handleRemoveHOD(sub)}
                                                        style={{
                                                            backgroundColor: isDark ? 'rgba(239,68,68,0.15)' : '#FEF2F2',
                                                            paddingHorizontal: 10,
                                                            paddingVertical: 6,
                                                            borderRadius: 10,
                                                            borderWidth: 1,
                                                            borderColor: isDark ? 'rgba(239,68,68,0.3)' : '#FECACA'
                                                        }}
                                                    >
                                                        <Text style={{ fontSize: 11, fontWeight: '700', color: '#EF4444' }}>
                                                            Remove
                                                        </Text>
                                                    </TouchableOpacity>
                                                )}
                                            </View>
                                        </View>

                                        {/* Current HOD Info */}
                                        <View style={{
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            backgroundColor: bg,
                                            padding: 10,
                                            borderRadius: 12,
                                            borderWidth: 1,
                                            borderColor: border,
                                            marginTop: 6
                                        }}>
                                            <GraduationCap size={16} color={sub.hod_teacher_id ? '#10B981' : textSecondary} style={{ marginRight: 8 }} />
                                            {sub.hod_teacher_id && hodTeacher ? (
                                                <View className="flex-1">
                                                    <Text style={{ fontSize: 12, fontWeight: '700', color: textPrimary }}>
                                                        {hodTeacher.name} <Text style={{ color: '#10B981', fontWeight: '800' }}>(HOD Active)</Text>
                                                    </Text>
                                                    <Text style={{ fontSize: 10, color: textSecondary }}>{hodTeacher.email}</Text>
                                                </View>
                                            ) : (
                                                <Text style={{ fontSize: 12, color: textSecondary, fontStyle: 'italic' }}>
                                                    No Head of Department assigned for this subject
                                                </Text>
                                            )}
                                        </View>
                                    </View>
                                );
                            })}
                        </ScrollView>
                    )}
                </View>
            ) : loading ? (
                /* TAB CONTENT: CUSTOM ROLES */
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
                            onDelete={(r) => setRoleToDelete(r)}
                        />
                    ))}

                    <View style={{ height: 80 }} />
                </ScrollView>
            )}

            {/* Custom Role Builder Modal */}
            <RoleBuilderModal
                visible={modalVisible}
                role={selectedRole}
                onClose={() => setModalVisible(false)}
                onSave={handleSaveRole}
                isDark={isDark}
            />

            {/* Assign User Custom Roles Modal */}
            <Modal
                visible={assignUserModalVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setAssignUserModalVisible(false)}
            >
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', alignItems: 'center', padding: 16 }}>
                    <View style={{
                        backgroundColor: surface,
                        borderRadius: 24,
                        borderWidth: 1,
                        borderColor: border,
                        width: '100%',
                        maxWidth: 600,
                        maxHeight: '85%',
                        overflow: 'hidden',
                    }}>
                        <View style={{
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            paddingHorizontal: 20,
                            paddingVertical: 16,
                            borderBottomWidth: 1,
                            borderBottomColor: border
                        }}>
                            <View>
                                <Text style={{ fontSize: 17, fontWeight: '800', color: textPrimary }}>
                                    Assign Custom Roles
                                </Text>
                                <Text style={{ fontSize: 12, color: textSecondary, marginTop: 2 }}>
                                    {selectedStaffUser?.full_name || selectedStaffUser?.email}
                                </Text>
                            </View>
                            <TouchableOpacity onPress={() => setAssignUserModalVisible(false)}>
                                <X size={20} color={textSecondary} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={{ padding: 20 }}>
                            <Text style={{ fontSize: 12, fontWeight: '700', color: textSecondary, textTransform: 'uppercase', marginBottom: 12 }}>
                                Available Custom Roles
                            </Text>

                            {roles.filter(r => !r.isDefault).length === 0 ? (
                                <Text style={{ fontSize: 13, color: textSecondary, fontStyle: 'italic', paddingVertical: 12 }}>
                                    No custom roles created yet. Create a custom role first from the Custom Roles tab.
                                </Text>
                            ) : (
                                roles.filter(r => !r.isDefault).map(r => {
                                    const isAssigned = selectedRoleIdsForUser.includes(r.id);
                                    return (
                                        <TouchableOpacity
                                            key={r.id}
                                            onPress={() => handleToggleUserRole(r.id)}
                                            style={{
                                                flexDirection: 'row',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                padding: 14,
                                                borderRadius: 14,
                                                borderWidth: 1,
                                                borderColor: isAssigned ? '#FF6900' : border,
                                                backgroundColor: isAssigned ? (isDark ? 'rgba(255,105,0,0.1)' : '#FFF7ED') : bg,
                                                marginBottom: 10
                                            }}
                                        >
                                            <View style={{ flex: 1, marginRight: 12 }}>
                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                                    <Text style={{ fontSize: 14, fontWeight: '700', color: textPrimary }}>{r.name}</Text>
                                                    <View style={{ backgroundColor: isDark ? '#1C2128' : '#E2E8F0', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                                                        <Text style={{ fontSize: 9, fontWeight: '700', color: textSecondary, textTransform: 'uppercase' }}>
                                                            {r.data_scope}
                                                        </Text>
                                                    </View>
                                                </View>
                                                {r.description ? (
                                                    <Text style={{ fontSize: 11, color: textSecondary, marginTop: 3 }}>{r.description}</Text>
                                                ) : null}
                                            </View>
                                            <View style={{
                                                width: 22,
                                                height: 22,
                                                borderRadius: 7,
                                                borderWidth: isAssigned ? 0 : 2,
                                                borderColor: border,
                                                backgroundColor: isAssigned ? '#FF6900' : 'transparent',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}>
                                                {isAssigned && <Check size={14} color="#FFFFFF" />}
                                            </View>
                                        </TouchableOpacity>
                                    );
                                })
                            )}
                        </ScrollView>

                        <View style={{
                            flexDirection: 'row',
                            justifyContent: 'flex-end',
                            gap: 10,
                            padding: 16,
                            borderTopWidth: 1,
                            borderTopColor: border
                        }}>
                            <TouchableOpacity
                                onPress={() => setAssignUserModalVisible(false)}
                                style={{ paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: border }}
                            >
                                <Text style={{ fontSize: 13, fontWeight: '600', color: textSecondary }}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={handleSaveUserRoles}
                                disabled={savingUserAssignment}
                                style={{
                                    backgroundColor: '#FF6900',
                                    paddingHorizontal: 20,
                                    paddingVertical: 10,
                                    borderRadius: 10,
                                    opacity: savingUserAssignment ? 0.7 : 1
                                }}
                            >
                                {savingUserAssignment ? (
                                    <ActivityIndicator size="small" color="#FFFFFF" />
                                ) : (
                                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#FFFFFF' }}>Save Assignment</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Assign HOD Modal */}
            <Modal
                visible={hodModalVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setHodModalVisible(false)}
            >
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', alignItems: 'center', padding: 16 }}>
                    <View style={{
                        backgroundColor: surface,
                        borderRadius: 24,
                        borderWidth: 1,
                        borderColor: border,
                        width: '100%',
                        maxWidth: 600,
                        maxHeight: '85%',
                        overflow: 'hidden',
                    }}>
                        <View style={{
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            paddingHorizontal: 20,
                            paddingVertical: 16,
                            borderBottomWidth: 1,
                            borderBottomColor: border
                        }}>
                            <View>
                                <Text style={{ fontSize: 17, fontWeight: '800', color: textPrimary }}>
                                    Assign Head of Department
                                </Text>
                                <Text style={{ fontSize: 12, color: textSecondary, marginTop: 2 }}>
                                    Subject: {selectedSubjectForHOD?.title}
                                </Text>
                            </View>
                            <TouchableOpacity onPress={() => setHodModalVisible(false)}>
                                <X size={20} color={textSecondary} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={{ padding: 20 }}>
                            {/* Option: None / Remove */}
                            <TouchableOpacity
                                onPress={() => setSelectedHODTeacherId(null)}
                                style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: 14,
                                    borderRadius: 14,
                                    borderWidth: 1,
                                    borderColor: selectedHODTeacherId === null ? '#FF6900' : border,
                                    backgroundColor: selectedHODTeacherId === null ? (isDark ? 'rgba(255,105,0,0.1)' : '#FFF7ED') : bg,
                                    marginBottom: 10
                                }}
                            >
                                <View>
                                    <Text style={{ fontSize: 14, fontWeight: '700', color: textPrimary }}>None (Unassigned)</Text>
                                    <Text style={{ fontSize: 11, color: textSecondary, marginTop: 2 }}>No teacher acts as HOD for this subject</Text>
                                </View>
                                {selectedHODTeacherId === null && <Check size={18} color="#FF6900" />}
                            </TouchableOpacity>

                            <Text style={{ fontSize: 12, fontWeight: '700', color: textSecondary, textTransform: 'uppercase', marginVertical: 10 }}>
                                Select Teacher
                            </Text>

                            {teachersList.map((teach) => {
                                const isSelected = selectedHODTeacherId === teach.id;
                                return (
                                    <TouchableOpacity
                                        key={teach.id}
                                        onPress={() => setSelectedHODTeacherId(teach.id)}
                                        style={{
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            padding: 14,
                                            borderRadius: 14,
                                            borderWidth: 1,
                                            borderColor: isSelected ? '#FF6900' : border,
                                            backgroundColor: isSelected ? (isDark ? 'rgba(255,105,0,0.1)' : '#FFF7ED') : bg,
                                            marginBottom: 8
                                        }}
                                    >
                                        <View>
                                            <Text style={{ fontSize: 14, fontWeight: '700', color: textPrimary }}>{teach.name}</Text>
                                            <Text style={{ fontSize: 11, color: textSecondary, marginTop: 2 }}>{teach.email}</Text>
                                        </View>
                                        {isSelected && <Check size={18} color="#FF6900" />}
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>

                        <View style={{
                            flexDirection: 'row',
                            justifyContent: 'flex-end',
                            gap: 10,
                            padding: 16,
                            borderTopWidth: 1,
                            borderTopColor: border
                        }}>
                            <TouchableOpacity
                                onPress={() => setHodModalVisible(false)}
                                style={{ paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: border }}
                            >
                                <Text style={{ fontSize: 13, fontWeight: '600', color: textSecondary }}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={handleSaveHOD}
                                disabled={savingHOD}
                                style={{
                                    backgroundColor: '#FF6900',
                                    paddingHorizontal: 20,
                                    paddingVertical: 10,
                                    borderRadius: 10,
                                    opacity: savingHOD ? 0.7 : 1
                                }}
                            >
                                {savingHOD ? (
                                    <ActivityIndicator size="small" color="#FFFFFF" />
                                ) : (
                                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#FFFFFF' }}>Save HOD</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Custom Role Delete Confirmation Modal */}
            <ConfirmationModal
                visible={!!roleToDelete}
                title="Delete Custom Role"
                targetName={roleToDelete?.name}
                message="Are you sure you want to delete this custom role? This action cannot be undone."
                confirmText="Delete Role"
                isDestructive={true}
                icon="trash-outline"
                loading={deleteRoleLoading}
                onConfirm={confirmDeleteRole}
                onClose={() => !deleteRoleLoading && setRoleToDelete(null)}
            />
        </View>
    );
}