import { UnifiedHeader } from "@/components/common/UnifiedHeader";
import { ActionTooltip } from "@/components/common/ActionTooltip";
import { HelpTooltip } from "@/components/settings/HelpTooltip";
import { TableScreenSkeleton, CardGridScreenSkeleton } from "@/components/ui/skeletons";
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
    Sparkles,
    ChevronDown,
    ChevronUp,
    Eye,
    AlertTriangle,
    FileText,
    History,
    Search,
    UserCheck,
    Settings,
    Edit3,
    ArrowRight
} from 'lucide-react-native';
import React, { useEffect, useState, useMemo } from 'react';
import { 
    Modal, 
    ScrollView, 
    Text, 
    TouchableOpacity, 
    View, 
    ActivityIndicator, 
    TextInput, 
    Alert, 
    Platform,
    useWindowDimensions
} from 'react-native';
import { 
    RoleAPI, 
    CustomRole, 
    RoleTemplate, 
    AuditLogRecord,
    DataScope,
    RoleScope 
} from '@/services/RoleService';
import { LibrarianManagement } from "@/components/admin/library/LibrarianManagement";
import { SubjectAPI, SubjectData } from "@/services/SubjectService";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/libs/supabase";
import Toast from 'react-native-toast-message';
import { ConfirmationModal } from "@/components/common/ConfirmationModal";
import { AdminEnrollmentWizard } from "@/components/admin/roles/AdminEnrollmentWizard";
import { 
    generatePlainEnglishSummary, 
    analyzePermissionRisks,
    DOMAIN_LABELS,
    ACTION_LABELS
} from '@/utils/permissionGuidance';

type RoleTab = 'roles' | 'templates' | 'staff' | 'extra_duties' | 'audit';

// 13 System Domain Areas per Section 3
const SYSTEM_DOMAINS = [
    { id: 'academic', title: 'Academic & Curriculum', icon: GraduationCap, actions: ['view', 'create', 'edit', 'delete', 'publish'] },
    { id: 'students', title: 'Students', icon: Users, actions: ['view', 'create', 'edit', 'delete', 'export_data'] },
    { id: 'parents', title: 'Parents', icon: Users, actions: ['view', 'create', 'edit', 'delete'] },
    { id: 'teachers_staff', title: 'Teachers & Staff', icon: School, actions: ['view', 'create', 'edit', 'delete'] },
    { id: 'finance', title: 'Finance & Fees', icon: Wallet, actions: ['view', 'create', 'edit', 'delete', 'approve', 'disburse'] },
    { id: 'reports', title: 'Reports & Analytics', icon: FileText, actions: ['view', 'generate_report', 'download_report'] },
    { id: 'library', title: 'Library', icon: Library, actions: ['view', 'create', 'edit', 'delete'] },
    { id: 'communication', title: 'Messages & Notices', icon: MessageSquare, actions: ['view', 'create', 'edit', 'delete'] },
    { id: 'attendance', title: 'Attendance', icon: CalendarCheck, actions: ['view', 'create', 'edit', 'approve'] },
    { id: 'timetable', title: 'Timetable', icon: Clock, actions: ['view', 'create', 'edit', 'publish', 'download_report'] },
    { id: 'settings', title: 'School Settings', icon: Settings, actions: ['view', 'edit'] },
    { id: 'roles_access', title: 'Roles & Access', icon: Shield, actions: ['view', 'create', 'edit', 'delete', 'manage_roles'] },
    { id: 'audit_logs', title: 'Activity History', icon: History, actions: ['view'] },
];

export default function RolesAndPermissions() {
    const router = useRouter();
    const { isDark } = useTheme();
    const { profile, isMain } = useAuth();
    const { width } = useWindowDimensions();
    const isMobile = width < 768;

    const [activeTab, setActiveTab] = useState<RoleTab>('roles');
    const [extraDutyTab, setExtraDutyTab] = useState<'librarians' | 'hod'>('librarians');

    // Data states
    const [roles, setRoles] = useState<CustomRole[]>([]);
    const [templates, setTemplates] = useState<RoleTemplate[]>([]);
    const [staffList, setStaffList] = useState<any[]>([]);
    const [userRolesMap, setUserRolesMap] = useState<Record<string, any[]>>({});
    const [auditLogs, setAuditLogs] = useState<AuditLogRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [auditLoading, setAuditLoading] = useState(false);
    const [staffLoading, setStaffLoading] = useState(false);

    // Search filters
    const [roleSearch, setRoleSearch] = useState('');
    const [staffSearch, setStaffSearch] = useState('');
    const [auditSearch, setAuditSearch] = useState('');

    // Modals
    const [builderModalVisible, setBuilderModalVisible] = useState(false);
    const [selectedRoleForEdit, setSelectedRoleForEdit] = useState<CustomRole | null>(null);
    const [enrollWizardVisible, setEnrollWizardVisible] = useState(false);

    // Effective Permissions Modal
    const [effectiveModalVisible, setEffectiveModalVisible] = useState(false);
    const [selectedStaffUser, setSelectedStaffUser] = useState<any | null>(null);
    const [effectiveData, setEffectiveData] = useState<{ permissions: any; scopes: any } | null>(null);
    const [loadingEffective, setLoadingEffective] = useState(false);

    // Change Roles Modal
    const [changeRolesModalVisible, setChangeRolesModalVisible] = useState(false);
    const [selectedRoleIdsForStaff, setSelectedRoleIdsForStaff] = useState<string[]>([]);
    const [savingRoleAssignment, setSavingRoleAssignment] = useState(false);

    // Delete Confirmation
    const [confirmDeleteModal, setConfirmDeleteModal] = useState<{
        visible: boolean;
        role: CustomRole | null;
        loading: boolean;
    }>({ visible: false, role: null, loading: false });

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
        if (activeTab === 'templates') {
            loadTemplates();
        } else if (activeTab === 'staff') {
            loadStaffUsers();
        } else if (activeTab === 'audit') {
            loadAuditLogs();
        } else if (activeTab === 'extra_duties' && extraDutyTab === 'hod') {
            loadHODData();
        }
    }, [activeTab, extraDutyTab]);

    const loadData = async () => {
        try {
            setLoading(true);
            const rolesData = await RoleAPI.getRoles();
            setRoles(rolesData || []);
        } catch (error) {
            console.error("Failed to load roles data:", error);
            Alert.alert("Error", "Failed to load roles and permissions configurations");
        } finally {
            setLoading(false);
        }
    };

    const loadTemplates = async () => {
        try {
            const data = await RoleAPI.getTemplates();
            setTemplates(data || []);
        } catch (e) {
            console.error("Failed to load templates:", e);
        }
    };

    const loadStaffUsers = async () => {
        try {
            setStaffLoading(true);
            // Non-negotiable Rule 4: Administrators ONLY (strictly exclude teachers)
            const { data: usersData, error: userError } = await supabase
                .from('users')
                .select('id, full_name, first_name, last_name, email, role, is_active')
                .in('role', ['admin', 'master_admin'])
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
        } catch (e) {
            console.error("Failed to load staff users:", e);
        } finally {
            setStaffLoading(false);
        }
    };

    const loadAuditLogs = async () => {
        try {
            setAuditLoading(true);
            const res = await RoleAPI.getAuditLogs(100, 0);
            setAuditLogs(res.logs || []);
        } catch (e) {
            console.error("Failed to load audit logs:", e);
        } finally {
            setAuditLoading(false);
        }
    };

    const loadHODData = async () => {
        try {
            setHodLoading(true);
            const [subs, teachersRes] = await Promise.all([
                SubjectAPI.getSubjects(),
                supabase.from('teachers').select('id, user_id, users(id, full_name, email)').order('id')
            ]);
            setSubjectsList(subs || []);
            const tList = (teachersRes.data || []).map((t: any) => ({
                id: t.id,
                name: t.users?.full_name || 'Unknown',
                email: t.users?.email || ''
            }));
            setTeachersList(tList);
        } catch (e) {
            console.error("Failed to load HOD data:", e);
        } finally {
            setHodLoading(false);
        }
    };

    const handleOpenEffectiveModal = async (user: any) => {
        setSelectedStaffUser(user);
        setEffectiveModalVisible(true);
        setLoadingEffective(true);
        try {
            const data = await RoleAPI.getEffectivePermissions(user.id);
            setEffectiveData(data);
        } catch (e) {
            console.error("Failed to get effective permissions:", e);
            Alert.alert("Error", "Could not fetch effective permissions for this user.");
        } finally {
            setLoadingEffective(false);
        }
    };

    const handleOpenChangeRoles = (user: any) => {
        setSelectedStaffUser(user);
        const currentRoleIds = (userRolesMap[user.id] || []).map((r: any) => r.id);
        setSelectedRoleIdsForStaff(currentRoleIds);
        setChangeRolesModalVisible(true);
    };

    const handleSaveRoleAssignment = async () => {
        if (!selectedStaffUser) return;
        try {
            setSavingRoleAssignment(true);
            await RoleAPI.assignUserRoles({
                userId: selectedStaffUser.id,
                roleIds: selectedRoleIdsForStaff
            });
            Toast.show({ type: 'success', text1: 'Roles Updated', text2: `Assigned ${selectedRoleIdsForStaff.length} role(s) to ${selectedStaffUser.full_name}` });
            setChangeRolesModalVisible(false);
            loadStaffUsers();
        } catch (err: any) {
            console.error("Failed to assign roles:", err);
            const msg = err.response?.data?.error || err.message || "Failed to update role assignment";
            Alert.alert("Assignment Error", msg);
        } finally {
            setSavingRoleAssignment(false);
        }
    };

    const handleDeleteRole = (role: CustomRole) => {
        setConfirmDeleteModal({ visible: true, role, loading: false });
    };

    const executeDeleteRole = async () => {
        if (!confirmDeleteModal.role) return;
        try {
            setConfirmDeleteModal(prev => ({ ...prev, loading: true }));
            await RoleAPI.deleteRole(confirmDeleteModal.role.id);
            Toast.show({ type: 'success', text1: 'Role Deleted', text2: `Deleted ${confirmDeleteModal.role.name}` });
            setConfirmDeleteModal({ visible: false, role: null, loading: false });
            loadData();
        } catch (err: any) {
            console.error("Failed to delete role:", err);
            const msg = err.response?.data?.error || err.message || "Failed to delete role";
            Alert.alert("Delete Failed", msg);
            setConfirmDeleteModal(prev => ({ ...prev, loading: false }));
        }
    };

    const handleUseTemplate = (template: RoleTemplate) => {
        // Pre-fill creation modal with template
        setSelectedRoleForEdit({
            id: '',
            name: template.name,
            description: template.description,
            data_scope: template.data_scope || 'all',
            isDefault: false,
            permissions: (template.permissions || []) as any
        });
        setActiveTab('roles');
        setBuilderModalVisible(true);
    };

    // HOD actions
    const handleOpenHODModal = (subject: SubjectData) => {
        setSelectedSubjectForHOD(subject);
        setSelectedHODTeacherId(subject.hod_teacher_id || null);
        setHodModalVisible(true);
    };

    const handleSaveHOD = async () => {
        if (!selectedSubjectForHOD) return;
        try {
            setSavingHOD(true);
            await SubjectAPI.updateSubject(selectedSubjectForHOD.id, {
                hod_teacher_id: selectedHODTeacherId
            });
            Toast.show({ type: 'success', text1: 'HOD Updated', text2: 'Subject Head of Department assigned successfully.' });
            setHodModalVisible(false);
            loadHODData();
        } catch (e: any) {
            Alert.alert("Error", e.message || "Failed to assign HOD");
        } finally {
            setSavingHOD(false);
        }
    };

    const handleRemoveHOD = async (subject: SubjectData) => {
        try {
            await SubjectAPI.updateSubject(subject.id, { hod_teacher_id: null });
            Toast.show({ type: 'info', text1: 'HOD Removed', text2: 'Head of Department cleared for this subject.' });
            loadHODData();
        } catch (e: any) {
            Alert.alert("Error", e.message || "Failed to remove HOD");
        }
    };

    // Styling constants
    const surface = isDark ? '#161B22' : '#FFFFFF';
    const border = isDark ? '#21262D' : '#E2E8F0';
    const textPrimary = isDark ? '#FFFFFF' : '#0F172A';
    const textSecondary = isDark ? '#94A3B8' : '#64748B';
    const bg = isDark ? '#0F141C' : '#F8FAFC';

    const subtitles: Record<RoleTab, string> = {
        roles: 'Job Roles & Access Control',
        templates: 'Ready-Made System Roles',
        staff: 'Administrative Staff Access',
        extra_duties: 'Extra Duties (Teaching Staff)',
        audit: 'System Activity History',
    };

    return (
        <View style={{ flex: 1, backgroundColor: surface }}>
            <UnifiedHeader
                title="Management"
                subtitle={subtitles[activeTab]}
                role="Admin"
                onBack={() => router.back()}
                rightActions={
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                        {activeTab === 'roles' && (
                            <TouchableOpacity
                                onPress={() => {
                                    setSelectedRoleForEdit(null);
                                    setBuilderModalVisible(true);
                                }}
                                style={{
                                    backgroundColor: '#FF6900',
                                    paddingHorizontal: 14,
                                    height: 38,
                                    borderRadius: 10,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexDirection: 'row',
                                    gap: 6
                                }}
                            >
                                <Plus size={16} color="white" />
                                <Text style={{ color: 'white', fontWeight: '700', fontSize: 13 }}>Create Role</Text>
                            </TouchableOpacity>
                        )}
                        {activeTab === 'staff' && (
                            <TouchableOpacity
                                onPress={() => setEnrollWizardVisible(true)}
                                style={{
                                    backgroundColor: '#FF6900',
                                    paddingHorizontal: 14,
                                    height: 38,
                                    borderRadius: 10,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexDirection: 'row',
                                    gap: 6
                                }}
                            >
                                <UserCheck size={16} color="white" />
                                <Text style={{ color: 'white', fontWeight: '700', fontSize: 13 }}>Enroll Admin</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                }
            />

            {/* Segmented 5-Tab Bar */}
            <View style={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 6 }}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: isDark ? '#0F141C' : '#F1F5F9', padding: 4, borderRadius: 14, borderWidth: 1, borderColor: border }}>
                        <TouchableOpacity
                            onPress={() => setActiveTab('roles')}
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                paddingHorizontal: 14,
                                height: 36,
                                borderRadius: 10,
                                backgroundColor: activeTab === 'roles' ? (isDark ? '#1C2128' : '#FFFFFF') : 'transparent'
                            }}
                        >
                            <Shield size={14} color={activeTab === 'roles' ? '#FF6900' : textSecondary} style={{ marginRight: 6 }} />
                            <Text style={{ fontSize: 12, fontWeight: '700', color: activeTab === 'roles' ? '#FF6900' : textSecondary }}>
                                Job Roles
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => setActiveTab('templates')}
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                paddingHorizontal: 14,
                                height: 36,
                                borderRadius: 10,
                                backgroundColor: activeTab === 'templates' ? (isDark ? '#1C2128' : '#FFFFFF') : 'transparent'
                            }}
                        >
                            <Sparkles size={14} color={activeTab === 'templates' ? '#FF6900' : textSecondary} style={{ marginRight: 6 }} />
                            <Text style={{ fontSize: 12, fontWeight: '700', color: activeTab === 'templates' ? '#FF6900' : textSecondary }}>
                                Ready-Made Roles
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => setActiveTab('staff')}
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                paddingHorizontal: 14,
                                height: 36,
                                borderRadius: 10,
                                backgroundColor: activeTab === 'staff' ? (isDark ? '#1C2128' : '#FFFFFF') : 'transparent'
                            }}
                        >
                            <Users size={14} color={activeTab === 'staff' ? '#FF6900' : textSecondary} style={{ marginRight: 6 }} />
                            <Text style={{ fontSize: 12, fontWeight: '700', color: activeTab === 'staff' ? '#FF6900' : textSecondary }}>
                                Staff Access
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => setActiveTab('extra_duties')}
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                paddingHorizontal: 14,
                                height: 36,
                                borderRadius: 10,
                                backgroundColor: activeTab === 'extra_duties' ? (isDark ? '#1C2128' : '#FFFFFF') : 'transparent'
                            }}
                        >
                            <BookOpen size={14} color={activeTab === 'extra_duties' ? '#FF6900' : textSecondary} style={{ marginRight: 6 }} />
                            <Text style={{ fontSize: 12, fontWeight: '700', color: activeTab === 'extra_duties' ? '#FF6900' : textSecondary }}>
                                Extra Duties
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => setActiveTab('audit')}
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                paddingHorizontal: 14,
                                height: 36,
                                borderRadius: 10,
                                backgroundColor: activeTab === 'audit' ? (isDark ? '#1C2128' : '#FFFFFF') : 'transparent'
                            }}
                        >
                            <History size={14} color={activeTab === 'audit' ? '#FF6900' : textSecondary} style={{ marginRight: 6 }} />
                            <Text style={{ fontSize: 12, fontWeight: '700', color: activeTab === 'audit' ? '#FF6900' : textSecondary }}>
                                Activity History
                            </Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </View>

            {/* TAB 1: JOB ROLES */}
            {activeTab === 'roles' && (
                <View style={{ flex: 1, padding: 16 }}>
                    {/* Search */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: isDark ? '#0D1117' : '#F6F8FA', borderRadius: 12, paddingHorizontal: 12, height: 44, borderWidth: 1, borderColor: border, marginBottom: 14 }}>
                        <Search size={16} color={textSecondary} style={{ marginRight: 8 }} />
                        <TextInput
                            value={roleSearch}
                            onChangeText={setRoleSearch}
                            placeholder="Search custom roles by title or scope..."
                            placeholderTextColor={textSecondary}
                            style={{ flex: 1, color: textPrimary, fontSize: 13 }}
                        />
                    </View>

                    {loading ? (
                        <CardGridScreenSkeleton count={4} />
                    ) : roles.length === 0 ? (
                        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
                            <Shield size={48} color={textSecondary} style={{ opacity: 0.4, marginBottom: 12 }} />
                            <Text style={{ fontSize: 16, fontWeight: '700', color: textPrimary, marginBottom: 6 }}>No Custom Roles Found</Text>
                            <Text style={{ fontSize: 13, color: textSecondary, textAlign: 'center', marginBottom: 20 }}>
                                Create your first job role or choose a ready-made role from the templates tab.
                            </Text>
                            <TouchableOpacity
                                onPress={() => setBuilderModalVisible(true)}
                                style={{ backgroundColor: '#FF6900', paddingHorizontal: 20, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center' }}
                            >
                                <Text style={{ color: 'white', fontWeight: '700', fontSize: 14 }}>+ Create Job Role</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
                            {roles
                                .filter(r => r.name.toLowerCase().includes(roleSearch.toLowerCase()) || (r.description || '').toLowerCase().includes(roleSearch.toLowerCase()))
                                .map(role => {
                                    const summary = generatePlainEnglishSummary(role.permissions as any, { data_scope: role.data_scope });
                                    const permCount = Array.isArray(role.permissions) ? role.permissions.length : 0;
                                    return (
                                        <View
                                            key={role.id}
                                            style={{
                                                backgroundColor: surface,
                                                padding: 18,
                                                borderRadius: 16,
                                                borderWidth: 1,
                                                borderColor: border,
                                                marginBottom: 12,
                                                shadowColor: '#000',
                                                shadowOffset: { width: 0, height: 2 },
                                                shadowOpacity: isDark ? 0.2 : 0.04,
                                                shadowRadius: 6,
                                                elevation: 2
                                            }}
                                        >
                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                                                <View style={{ flex: 1, marginRight: 12 }}>
                                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                                        <Text style={{ fontSize: 16, fontWeight: '800', color: textPrimary }}>
                                                            {role.name}
                                                        </Text>
                                                        <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, backgroundColor: isDark ? 'rgba(59,130,246,0.15)' : '#EFF6FF', borderWidth: 1, borderColor: isDark ? '#1E3A8A' : '#BFDBFE' }}>
                                                            <Text style={{ fontSize: 10, fontWeight: '700', color: '#3B82F6' }}>
                                                                Scope: {role.data_scope || 'all'}
                                                            </Text>
                                                        </View>
                                                        <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, backgroundColor: isDark ? '#21262D' : '#F1F5F9' }}>
                                                            <Text style={{ fontSize: 10, fontWeight: '600', color: textSecondary }}>
                                                                {permCount} permissions
                                                            </Text>
                                                        </View>
                                                    </View>
                                                    {role.description ? (
                                                        <Text style={{ fontSize: 12, color: textSecondary, marginTop: 4 }}>
                                                            {role.description}
                                                        </Text>
                                                    ) : null}
                                                </View>

                                                {!role.isDefault && (
                                                    <TouchableOpacity
                                                        onPress={() => handleDeleteRole(role)}
                                                        style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}
                                                    >
                                                        <Trash2 size={16} color="#EF4444" />
                                                    </TouchableOpacity>
                                                )}
                                            </View>

                                            {/* Auto-generated Summary Sentence (Section 7A) */}
                                            <View style={{ padding: 12, borderRadius: 10, backgroundColor: isDark ? '#0D1117' : '#F8FAFC', borderWidth: 1, borderColor: border, marginTop: 6, marginBottom: 12 }}>
                                                <Text style={{ fontSize: 12, color: textPrimary, lineHeight: 17, fontWeight: '500' }}>
                                                    {summary}
                                                </Text>
                                            </View>

                                            <TouchableOpacity
                                                onPress={() => {
                                                    setSelectedRoleForEdit(role);
                                                    setBuilderModalVisible(true);
                                                }}
                                                style={{
                                                    flexDirection: 'row',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    height: 38,
                                                    borderRadius: 10,
                                                    borderWidth: 1,
                                                    borderColor: isDark ? 'rgba(255,105,0,0.3)' : '#FED7AA',
                                                    backgroundColor: isDark ? 'rgba(255,105,0,0.08)' : '#FFF7ED',
                                                    gap: 6
                                                }}
                                            >
                                                <Edit3 size={14} color="#FF6900" />
                                                <Text style={{ fontSize: 12, fontWeight: '700', color: '#FF6900' }}>
                                                    Edit Permissions & Scopes
                                                </Text>
                                            </TouchableOpacity>
                                        </View>
                                    );
                                })}
                        </ScrollView>
                    )}
                </View>
            )}

            {/* TAB 2: READY-MADE ROLES */}
            {activeTab === 'templates' && (
                <ScrollView style={{ flex: 1, padding: 16 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: textSecondary, marginBottom: 14 }}>
                        System role templates pre-configured with industry-standard school permissions. Use them as starting points.
                    </Text>

                    {templates.map(tmpl => {
                        return (
                            <View
                                key={tmpl.id}
                                style={{
                                    backgroundColor: surface,
                                    padding: 18,
                                    borderRadius: 16,
                                    borderWidth: 1,
                                    borderColor: border,
                                    marginBottom: 12
                                }}
                            >
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                                    <View style={{ flex: 1, marginRight: 12 }}>
                                        <Text style={{ fontSize: 16, fontWeight: '800', color: textPrimary }}>
                                            {tmpl.name}
                                        </Text>
                                        <Text style={{ fontSize: 13, color: textSecondary, marginTop: 4, lineHeight: 18 }}>
                                            {tmpl.description}
                                        </Text>
                                    </View>
                                </View>

                                {tmpl.best_for ? (
                                    <View style={{ padding: 10, borderRadius: 8, backgroundColor: isDark ? 'rgba(16,185,129,0.1)' : '#ECFDF5', borderWidth: 1, borderColor: isDark ? '#065F46' : '#A7F3D0', marginVertical: 8 }}>
                                        <Text style={{ fontSize: 11, fontWeight: '700', color: '#10B981', textTransform: 'uppercase', marginBottom: 2 }}>
                                            Best For:
                                        </Text>
                                        <Text style={{ fontSize: 12, color: textPrimary, fontWeight: '500' }}>
                                            {tmpl.best_for}
                                        </Text>
                                    </View>
                                ) : null}

                                <TouchableOpacity
                                    onPress={() => handleUseTemplate(tmpl)}
                                    style={{
                                        marginTop: 8,
                                        height: 40,
                                        borderRadius: 10,
                                        backgroundColor: '#FF6900',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexDirection: 'row',
                                        gap: 6
                                    }}
                                >
                                    <Sparkles size={14} color="white" />
                                    <Text style={{ color: 'white', fontWeight: '700', fontSize: 13 }}>
                                        Use This Role
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        );
                    })}
                </ScrollView>
            )}

            {/* TAB 3: STAFF ACCESS */}
            {activeTab === 'staff' && (
                <View style={{ flex: 1, padding: 16 }}>
                    {/* Search */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: isDark ? '#0D1117' : '#F6F8FA', borderRadius: 12, paddingHorizontal: 12, height: 44, borderWidth: 1, borderColor: border, marginBottom: 14 }}>
                        <Search size={16} color={textSecondary} style={{ marginRight: 8 }} />
                        <TextInput
                            value={staffSearch}
                            onChangeText={setStaffSearch}
                            placeholder="Search administrators by name or email..."
                            placeholderTextColor={textSecondary}
                            style={{ flex: 1, color: textPrimary, fontSize: 13 }}
                        />
                    </View>

                    {staffLoading ? (
                        <TableScreenSkeleton rows={6} columns={2} />
                    ) : (
                        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
                            {staffList
                                .filter(u => u.full_name?.toLowerCase().includes(staffSearch.toLowerCase()) || u.email?.toLowerCase().includes(staffSearch.toLowerCase()))
                                .map(user => {
                                    const heldRoles = userRolesMap[user.id] || [];
                                    const isMainUser = user.role === 'master_admin' || heldRoles.some((r: any) => r.name === 'Main Administrator');
                                    return (
                                        <View
                                            key={user.id}
                                            style={{
                                                backgroundColor: surface,
                                                padding: 16,
                                                borderRadius: 16,
                                                borderWidth: 1,
                                                borderColor: border,
                                                marginBottom: 12
                                            }}
                                        >
                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                                                <View style={{ flex: 1 }}>
                                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                                        <Text style={{ fontSize: 15, fontWeight: '700', color: textPrimary }}>
                                                            {user.full_name}
                                                        </Text>
                                                        {isMainUser && (
                                                            <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, backgroundColor: '#FF6900' }}>
                                                                <Text style={{ color: 'white', fontSize: 10, fontWeight: '800' }}>MAIN ADMIN</Text>
                                                            </View>
                                                        )}
                                                    </View>
                                                    <Text style={{ fontSize: 12, color: textSecondary, marginTop: 2 }}>{user.email}</Text>
                                                </View>
                                            </View>

                                            {/* Held Roles Badges */}
                                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginVertical: 8 }}>
                                                {heldRoles.length === 0 ? (
                                                    <Text style={{ fontSize: 11, fontStyle: 'italic', color: textSecondary }}>
                                                        No custom job roles assigned
                                                    </Text>
                                                ) : (
                                                    heldRoles.map((r: any) => (
                                                        <View key={r.id} style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: isDark ? '#21262D' : '#F1F5F9', borderWidth: 1, borderColor: border }}>
                                                            <Text style={{ fontSize: 11, fontWeight: '600', color: textPrimary }}>{r.name}</Text>
                                                        </View>
                                                    ))
                                                )}
                                            </View>

                                            {/* Action Buttons */}
                                            <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
                                                <TouchableOpacity
                                                    onPress={() => handleOpenEffectiveModal(user)}
                                                    style={{
                                                        flex: 1,
                                                        height: 36,
                                                        borderRadius: 8,
                                                        borderWidth: 1,
                                                        borderColor: border,
                                                        backgroundColor: isDark ? '#0D1117' : '#F6F8FA',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        flexDirection: 'row',
                                                        gap: 6
                                                    }}
                                                >
                                                    <Eye size={13} color={textSecondary} />
                                                    <Text style={{ fontSize: 12, fontWeight: '600', color: textPrimary }}>
                                                        View Capabilities
                                                    </Text>
                                                </TouchableOpacity>

                                                <TouchableOpacity
                                                    onPress={() => handleOpenChangeRoles(user)}
                                                    disabled={isMainUser && !isMain}
                                                    style={{
                                                        flex: 1,
                                                        height: 36,
                                                        borderRadius: 8,
                                                        backgroundColor: isDark ? 'rgba(255,105,0,0.1)' : '#FFF7ED',
                                                        borderWidth: 1,
                                                        borderColor: isDark ? 'rgba(255,105,0,0.3)' : '#FED7AA',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        flexDirection: 'row',
                                                        gap: 6
                                                    }}
                                                >
                                                    <Shield size={13} color="#FF6900" />
                                                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#FF6900' }}>
                                                        Change Roles
                                                    </Text>
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    );
                                })}
                        </ScrollView>
                    )}
                </View>
            )}

            {/* TAB 4: EXTRA DUTIES */}
            {activeTab === 'extra_duties' && (
                <View style={{ flex: 1, padding: 16 }}>
                    {/* Educational Banner */}
                    <View style={{ padding: 12, borderRadius: 12, backgroundColor: isDark ? 'rgba(59,130,246,0.1)' : '#EFF6FF', borderWidth: 1, borderColor: isDark ? '#1E3A8A' : '#BFDBFE', marginBottom: 14 }}>
                        <Text style={{ fontSize: 12, color: textPrimary, lineHeight: 18 }}>
                            <Text style={{ fontWeight: '700' }}>Notice: </Text>
                            Extra duties are assigned to teaching staff to grant specific departmental responsibilities (such as library cataloging or subject curriculum oversight) without granting administrative access.
                        </Text>
                    </View>

                    {/* Sub-tab Switcher */}
                    <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
                        <TouchableOpacity
                            onPress={() => setExtraDutyTab('librarians')}
                            style={{
                                flex: 1,
                                height: 38,
                                borderRadius: 10,
                                backgroundColor: extraDutyTab === 'librarians' ? '#FF6900' : (isDark ? '#0D1117' : '#F6F8FA'),
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                        >
                            <Text style={{ color: extraDutyTab === 'librarians' ? 'white' : textSecondary, fontWeight: '700', fontSize: 13 }}>
                                Librarians
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => setExtraDutyTab('hod')}
                            style={{
                                flex: 1,
                                height: 38,
                                borderRadius: 10,
                                backgroundColor: extraDutyTab === 'hod' ? '#FF6900' : (isDark ? '#0D1117' : '#F6F8FA'),
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                        >
                            <Text style={{ color: extraDutyTab === 'hod' ? 'white' : textSecondary, fontWeight: '700', fontSize: 13 }}>
                                Heads of Department (HOD)
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {extraDutyTab === 'librarians' ? (
                        <LibrarianManagement />
                    ) : (
                        <View style={{ flex: 1 }}>
                            <TextInput
                                placeholder="Search subjects for HOD assignment..."
                                placeholderTextColor={textSecondary}
                                value={hodSearch}
                                onChangeText={setHodSearch}
                                style={{ height: 44, backgroundColor: isDark ? '#0D1117' : '#F6F8FA', borderRadius: 10, borderWidth: 1, borderColor: border, paddingHorizontal: 12, color: textPrimary, marginBottom: 12 }}
                            />
                            {hodLoading ? (
                                <ActivityIndicator size="small" color="#FF6900" style={{ marginVertical: 24 }} />
                            ) : (
                                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
                                    {subjectsList
                                        .filter(s => s.title.toLowerCase().includes(hodSearch.toLowerCase()))
                                        .map(sub => {
                                            const teacher = teachersList.find(t => t.id === sub.hod_teacher_id);
                                            return (
                                                <View key={sub.id} style={{ padding: 14, borderRadius: 12, borderWidth: 1, borderColor: border, backgroundColor: surface, marginBottom: 10 }}>
                                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                                        <Text style={{ fontSize: 15, fontWeight: '700', color: textPrimary }}>{sub.title}</Text>
                                                        <TouchableOpacity
                                                            onPress={() => handleOpenHODModal(sub)}
                                                            style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, backgroundColor: isDark ? 'rgba(255,105,0,0.1)' : '#FFF7ED', borderWidth: 1, borderColor: '#FF6900' }}
                                                        >
                                                            <Text style={{ fontSize: 11, fontWeight: '700', color: '#FF6900' }}>
                                                                {sub.hod_teacher_id ? 'Change' : 'Assign'}
                                                            </Text>
                                                        </TouchableOpacity>
                                                    </View>
                                                    <Text style={{ fontSize: 12, color: textSecondary }}>
                                                        Head of Department: {teacher ? `${teacher.name} (${teacher.email})` : 'Unassigned'}
                                                    </Text>
                                                </View>
                                            );
                                        })}
                                </ScrollView>
                            )}
                        </View>
                    )}
                </View>
            )}

            {/* TAB 5: ACTIVITY HISTORY */}
            {activeTab === 'audit' && (
                <View style={{ flex: 1, padding: 16 }}>
                    <TextInput
                        placeholder="Filter activity history..."
                        placeholderTextColor={textSecondary}
                        value={auditSearch}
                        onChangeText={setAuditSearch}
                        style={{ height: 44, backgroundColor: isDark ? '#0D1117' : '#F6F8FA', borderRadius: 10, borderWidth: 1, borderColor: border, paddingHorizontal: 12, color: textPrimary, marginBottom: 14 }}
                    />
                    {auditLoading ? (
                        <ActivityIndicator size="small" color="#FF6900" style={{ marginVertical: 32 }} />
                    ) : auditLogs.length === 0 ? (
                        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                            <History size={40} color={textSecondary} style={{ opacity: 0.4, marginBottom: 8 }} />
                            <Text style={{ fontSize: 14, color: textSecondary }}>No role changes recorded yet.</Text>
                        </View>
                    ) : (
                        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
                            {auditLogs
                                .filter(log => (log.action || '').toLowerCase().includes(auditSearch.toLowerCase()) || (log.actor?.full_name || '').toLowerCase().includes(auditSearch.toLowerCase()))
                                .map(log => {
                                    const dateStr = new Date(log.created_at).toLocaleString();
                                    return (
                                        <View key={log.id} style={{ padding: 14, borderRadius: 12, borderWidth: 1, borderColor: border, backgroundColor: surface, marginBottom: 10 }}>
                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                                                <View style={{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, backgroundColor: isDark ? '#21262D' : '#F1F5F9' }}>
                                                    <Text style={{ fontSize: 10, fontWeight: '700', color: '#FF6900', textTransform: 'uppercase' }}>
                                                        {log.action}
                                                    </Text>
                                                </View>
                                                <Text style={{ fontSize: 11, color: textSecondary }}>{dateStr}</Text>
                                            </View>
                                            <Text style={{ fontSize: 13, fontWeight: '700', color: textPrimary, marginTop: 4 }}>
                                                By: {log.actor?.full_name || 'System / Admin'} ({log.actor?.email || 'N/A'})
                                            </Text>
                                            {log.after_state ? (
                                                <Text style={{ fontSize: 11, color: textSecondary, marginTop: 4 }}>
                                                    Details: {JSON.stringify(log.after_state)}
                                                </Text>
                                            ) : null}
                                        </View>
                                    );
                                })}
                        </ScrollView>
                    )}
                </View>
            )}

            {/* EFFECTIVE PERMISSIONS MODAL */}
            <Modal visible={effectiveModalVisible} animationType="slide" transparent={false} onRequestClose={() => setEffectiveModalVisible(false)}>
                <View style={{ flex: 1, backgroundColor: surface, paddingTop: Platform.OS === 'ios' ? 48 : 16 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: border }}>
                        <View>
                            <Text style={{ fontSize: 17, fontWeight: '800', color: textPrimary }}>
                                Effective Permissions
                            </Text>
                            <Text style={{ fontSize: 12, color: textSecondary }}>
                                {selectedStaffUser?.full_name} ({selectedStaffUser?.email})
                            </Text>
                        </View>
                        <TouchableOpacity onPress={() => setEffectiveModalVisible(false)} style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}>
                            <X size={20} color={textSecondary} />
                        </TouchableOpacity>
                    </View>

                    {loadingEffective ? (
                        <ActivityIndicator size="large" color="#FF6900" style={{ marginVertical: 48 }} />
                    ) : (
                        <ScrollView style={{ flex: 1, padding: 16 }} contentContainerStyle={{ paddingBottom: 100 }}>
                            {effectiveData?.scopes?.is_unrestricted ? (
                                <View style={{ padding: 16, borderRadius: 12, backgroundColor: '#FF6900', marginBottom: 16 }}>
                                    <Text style={{ color: 'white', fontWeight: '800', fontSize: 15 }}>Unrestricted Main Administrator</Text>
                                    <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 12, marginTop: 4 }}>
                                        This administrator possesses complete authority across all areas, databases, and configuration settings.
                                    </Text>
                                </View>
                            ) : null}

                            {/* Plain English Summary */}
                            <View style={{ padding: 14, borderRadius: 10, backgroundColor: isDark ? '#0D1117' : '#F0FDF4', borderWidth: 1, borderColor: isDark ? '#21262D' : '#BBF7D0', marginBottom: 16 }}>
                                <Text style={{ fontSize: 11, fontWeight: '800', color: '#10B981', textTransform: 'uppercase', marginBottom: 4 }}>
                                    Effective Access Summary
                                </Text>
                                <Text style={{ fontSize: 13, color: textPrimary, fontWeight: '600', lineHeight: 18 }}>
                                    {generatePlainEnglishSummary(effectiveData?.permissions || {}, { data_scope: 'all' })}
                                </Text>
                            </View>

                            {/* Domain Breakdown */}
                            <Text style={{ fontSize: 14, fontWeight: '700', color: textPrimary, marginBottom: 10 }}>Areas & Actions</Text>
                            {SYSTEM_DOMAINS.map(domain => {
                                const domainPerms = effectiveData?.permissions?.[domain.id] || {};
                                const grantedActions = Object.entries(domainPerms).filter(([_, v]: any) => v.granted);
                                if (grantedActions.length === 0 && !effectiveData?.scopes?.is_unrestricted) return null;

                                return (
                                    <View key={domain.id} style={{ padding: 14, borderRadius: 12, borderWidth: 1, borderColor: border, backgroundColor: surface, marginBottom: 10 }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                            <domain.icon size={16} color="#FF6900" />
                                            <Text style={{ fontSize: 14, fontWeight: '700', color: textPrimary }}>{domain.title}</Text>
                                        </View>
                                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                                            {effectiveData?.scopes?.is_unrestricted ? (
                                                domain.actions.map(act => (
                                                    <View key={act} style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: '#10B981' }}>
                                                        <Text style={{ color: 'white', fontSize: 11, fontWeight: '700' }}>{act}</Text>
                                                    </View>
                                                ))
                                            ) : (
                                                grantedActions.map(([act, info]: any) => (
                                                    <View key={act} style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: isDark ? '#21262D' : '#F1F5F9', borderWidth: 1, borderColor: border }}>
                                                        <Text style={{ fontSize: 11, fontWeight: '700', color: textPrimary }}>{act}</Text>
                                                        {info.sources && (
                                                            <Text style={{ fontSize: 9, color: textSecondary }}>{info.sources.join(', ')}</Text>
                                                        )}
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
            </Modal>

            {/* CHANGE ROLES MODAL */}
            <Modal visible={changeRolesModalVisible} animationType="slide" transparent={false} onRequestClose={() => setChangeRolesModalVisible(false)}>
                <View style={{ flex: 1, backgroundColor: surface, paddingTop: Platform.OS === 'ios' ? 48 : 16 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: border }}>
                        <View>
                            <Text style={{ fontSize: 17, fontWeight: '800', color: textPrimary }}>Assign Job Roles</Text>
                            <Text style={{ fontSize: 12, color: textSecondary }}>{selectedStaffUser?.full_name}</Text>
                        </View>
                        <TouchableOpacity onPress={() => setChangeRolesModalVisible(false)} style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}>
                            <X size={20} color={textSecondary} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={{ flex: 1, padding: 16 }} contentContainerStyle={{ paddingBottom: 100 }}>
                        <Text style={{ fontSize: 13, color: textSecondary, marginBottom: 14 }}>
                            Select the custom job roles to assign to this administrator.
                        </Text>

                        {roles.map(r => {
                            const isChecked = selectedRoleIdsForStaff.includes(r.id);
                            return (
                                <TouchableOpacity
                                    key={r.id}
                                    activeOpacity={0.7}
                                    onPress={() => {
                                        setSelectedRoleIdsForStaff(prev =>
                                            prev.includes(r.id) ? prev.filter(x => x !== r.id) : [...prev, r.id]
                                        );
                                    }}
                                    style={{
                                        padding: 16,
                                        borderRadius: 12,
                                        borderWidth: 1.5,
                                        borderColor: isChecked ? '#FF6900' : border,
                                        backgroundColor: isChecked ? (isDark ? 'rgba(255,105,0,0.08)' : '#FFF9F5') : surface,
                                        marginBottom: 10
                                    }}
                                >
                                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <Text style={{ fontSize: 14, fontWeight: '700', color: isChecked ? '#FF6900' : textPrimary }}>{r.name}</Text>
                                        <View style={{ width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: isChecked ? '#FF6900' : textSecondary, backgroundColor: isChecked ? '#FF6900' : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                                            {isChecked && <Check size={14} color="white" strokeWidth={3} />}
                                        </View>
                                    </View>
                                    {r.description ? <Text style={{ fontSize: 12, color: textSecondary, marginTop: 4 }}>{r.description}</Text> : null}
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>

                    <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: border, backgroundColor: surface }}>
                        <TouchableOpacity
                            onPress={handleSaveRoleAssignment}
                            disabled={savingRoleAssignment}
                            style={{ height: 48, borderRadius: 10, backgroundColor: '#FF6900', alignItems: 'center', justifyContent: 'center' }}
                        >
                            {savingRoleAssignment ? (
                                <ActivityIndicator size="small" color="white" />
                            ) : (
                                <Text style={{ color: 'white', fontWeight: '700', fontSize: 14 }}>Save Role Assignment</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* ROLE BUILDER MODAL (AREA CARDS + SUMMARY) */}
            <RoleBuilderModal
                visible={builderModalVisible}
                onClose={() => setBuilderModalVisible(false)}
                role={selectedRoleForEdit}
                onSaved={() => {
                    setBuilderModalVisible(false);
                    loadData();
                }}
            />

            {/* ADMIN ENROLLMENT WIZARD */}
            <AdminEnrollmentWizard
                visible={enrollWizardVisible}
                onClose={() => setEnrollWizardVisible(false)}
                onSuccess={() => {
                    loadStaffUsers();
                }}
            />

            {/* DELETE CONFIRMATION MODAL */}
            <ConfirmationModal
                visible={confirmDeleteModal.visible}
                title="Delete Job Role"
                message={`Are you sure you want to permanently delete "${confirmDeleteModal.role?.name}"? Staff holding this role will immediately lose its permissions.`}
                confirmText="Delete Role"
                isDestructive={true}
                loading={confirmDeleteModal.loading}
                onConfirm={executeDeleteRole}
                onClose={() => setConfirmDeleteModal({ visible: false, role: null, loading: false })}
            />

            {/* HOD MODAL */}
            <Modal visible={hodModalVisible} transparent animationType="fade" onRequestClose={() => setHodModalVisible(false)}>
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 }}>
                    <View style={{ backgroundColor: surface, borderRadius: 18, padding: 20, borderWidth: 1, borderColor: border }}>
                        <Text style={{ fontSize: 16, fontWeight: '700', color: textPrimary, marginBottom: 6 }}>
                            Assign Head of Department
                        </Text>
                        <Text style={{ fontSize: 12, color: textSecondary, marginBottom: 16 }}>
                            {selectedSubjectForHOD?.title}
                        </Text>

                        <ScrollView style={{ maxHeight: 250 }}>
                            {teachersList.map(t => (
                                <TouchableOpacity
                                    key={t.id}
                                    onPress={() => setSelectedHODTeacherId(t.id)}
                                    style={{
                                        padding: 12,
                                        borderRadius: 8,
                                        borderWidth: 1,
                                        borderColor: selectedHODTeacherId === t.id ? '#FF6900' : border,
                                        backgroundColor: selectedHODTeacherId === t.id ? (isDark ? 'rgba(255,105,0,0.08)' : '#FFF7ED') : surface,
                                        marginBottom: 6
                                    }}
                                >
                                    <Text style={{ fontSize: 13, fontWeight: '600', color: textPrimary }}>{t.name}</Text>
                                    <Text style={{ fontSize: 11, color: textSecondary }}>{t.email}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
                            <TouchableOpacity
                                onPress={() => setHodModalVisible(false)}
                                style={{ flex: 1, height: 42, borderRadius: 8, borderWidth: 1, borderColor: border, alignItems: 'center', justifyContent: 'center' }}
                            >
                                <Text style={{ color: textSecondary, fontWeight: '600' }}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={handleSaveHOD}
                                disabled={savingHOD}
                                style={{ flex: 1, height: 42, borderRadius: 8, backgroundColor: '#FF6900', alignItems: 'center', justifyContent: 'center' }}
                            >
                                {savingHOD ? <ActivityIndicator size="small" color="white" /> : <Text style={{ color: 'white', fontWeight: '700' }}>Assign HOD</Text>}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

// ROLE BUILDER MODAL WITH COLLAPSIBLE AREA CARDS
function RoleBuilderModal({
    visible,
    onClose,
    role,
    onSaved
}: {
    visible: boolean;
    onClose: () => void;
    role: CustomRole | null;
    onSaved: () => void;
}) {
    const { isDark } = useTheme();
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [dataScope, setDataScope] = useState<DataScope>('all');
    const [selectedPermissions, setSelectedPermissions] = useState<Array<{ domain: string; action: string }>>([]);
    const [expandedDomains, setExpandedDomains] = useState<Record<string, boolean>>({ academic: true });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (role) {
            setName(role.name || '');
            setDescription(role.description || '');
            setDataScope(role.data_scope || 'all');
            const perms: Array<{ domain: string; action: string }> = [];
            if (Array.isArray(role.permissions)) {
                role.permissions.forEach(p => {
                    if (typeof p === 'object' && (p as any).domain && (p as any).action) {
                        perms.push({ domain: (p as any).domain, action: (p as any).action });
                    }
                });
            }
            setSelectedPermissions(perms);
        } else {
            setName('');
            setDescription('');
            setDataScope('all');
            setSelectedPermissions([]);
        }
    }, [role, visible]);

    const toggleDomainExpand = (domId: string) => {
        setExpandedDomains(prev => ({ ...prev, [domId]: !prev[domId] }));
    };

    const togglePermission = (domain: string, action: string) => {
        setSelectedPermissions(prev => {
            const exists = prev.some(p => p.domain === domain && p.action === action);
            if (exists) {
                return prev.filter(p => !(p.domain === domain && p.action === action));
            } else {
                return [...prev, { domain, action }];
            }
        });
    };

    const isPermChecked = (domain: string, action: string) => {
        return selectedPermissions.some(p => p.domain === domain && p.action === action);
    };

    const summarySentence = useMemo(() => {
        return generatePlainEnglishSummary(selectedPermissions, { data_scope: dataScope });
    }, [selectedPermissions, dataScope]);

    const risks = useMemo(() => {
        return analyzePermissionRisks(selectedPermissions, dataScope);
    }, [selectedPermissions, dataScope]);

    const handleSave = async () => {
        if (!name.trim()) {
            Alert.alert("Name Required", "Please provide a job role name.");
            return;
        }
        try {
            setSaving(true);
            if (role?.id) {
                await RoleAPI.updateRole(role.id, {
                    name: name.trim(),
                    description: description.trim(),
                    data_scope: dataScope,
                    permissions: selectedPermissions
                });
                Toast.show({ type: 'success', text1: 'Role Updated', text2: `Updated ${name}` });
            } else {
                await RoleAPI.createRole({
                    name: name.trim(),
                    description: description.trim(),
                    data_scope: dataScope,
                    permissions: selectedPermissions
                });
                Toast.show({ type: 'success', text1: 'Role Created', text2: `Created ${name}` });
            }
            onSaved();
        } catch (err: any) {
            console.error("Failed to save role:", err);
            const msg = err.response?.data?.error || err.message || "Failed to save role";
            Alert.alert("Error", msg);
        } finally {
            setSaving(false);
        }
    };

    const surface = isDark ? '#161B22' : '#FFFFFF';
    const border = isDark ? '#21262D' : '#E2E8F0';
    const textPrimary = isDark ? '#FFFFFF' : '#0F172A';
    const textSecondary = isDark ? '#94A3B8' : '#64748B';
    const bg = isDark ? '#0D1117' : '#F8FAFC';

    return (
        <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
            <View style={{ flex: 1, backgroundColor: surface, paddingTop: Platform.OS === 'ios' ? 48 : 16 }}>
                {/* Header */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: border }}>
                    <Text style={{ fontSize: 17, fontWeight: '800', color: textPrimary }}>
                        {role?.id ? "Edit Job Role" : "Create Job Role"}
                    </Text>
                    <TouchableOpacity onPress={onClose} style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}>
                        <X size={20} color={textSecondary} />
                    </TouchableOpacity>
                </View>

                <ScrollView style={{ flex: 1, padding: 16 }} contentContainerStyle={{ paddingBottom: 120 }}>
                    {/* Basic details */}
                    <Text style={{ fontSize: 12, fontWeight: '700', color: textSecondary, marginBottom: 6 }}>ROLE NAME *</Text>
                    <TextInput
                        value={name}
                        onChangeText={setName}
                        placeholder="e.g. Grade 7 Coordinator"
                        placeholderTextColor={textSecondary}
                        style={{ height: 46, backgroundColor: bg, borderRadius: 10, borderWidth: 1, borderColor: border, paddingHorizontal: 14, color: textPrimary, marginBottom: 14 }}
                    />

                    <Text style={{ fontSize: 12, fontWeight: '700', color: textSecondary, marginBottom: 6 }}>DESCRIPTION</Text>
                    <TextInput
                        value={description}
                        onChangeText={setDescription}
                        placeholder="Purpose and responsibilities of this role..."
                        placeholderTextColor={textSecondary}
                        style={{ height: 46, backgroundColor: bg, borderRadius: 10, borderWidth: 1, borderColor: border, paddingHorizontal: 14, color: textPrimary, marginBottom: 16 }}
                    />

                    {/* Data Scoping */}
                    <Text style={{ fontSize: 12, fontWeight: '700', color: textSecondary, marginBottom: 6 }}>DATA SCOPE</Text>
                    <View style={{ flexDirection: 'row', gap: 8, marginBottom: 18 }}>
                        {(['all', 'levels', 'classes'] as DataScope[]).map(sc => (
                            <TouchableOpacity
                                key={sc}
                                onPress={() => setDataScope(sc)}
                                style={{
                                    flex: 1,
                                    height: 38,
                                    borderRadius: 8,
                                    borderWidth: 1,
                                    borderColor: dataScope === sc ? '#FF6900' : border,
                                    backgroundColor: dataScope === sc ? (isDark ? 'rgba(255,105,0,0.1)' : '#FFF7ED') : bg,
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                            >
                                <Text style={{ fontSize: 12, fontWeight: '700', color: dataScope === sc ? '#FF6900' : textSecondary }}>
                                    {sc === 'all' ? 'Whole School' : sc === 'levels' ? 'Levels' : 'Classes'}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Live Summary Sentence Box */}
                    <View style={{ padding: 14, borderRadius: 10, backgroundColor: isDark ? 'rgba(16,185,129,0.08)' : '#F0FDF4', borderWidth: 1, borderColor: isDark ? '#065F46' : '#BBF7D0', marginBottom: 18 }}>
                        <Text style={{ fontSize: 10, fontWeight: '800', color: '#10B981', textTransform: 'uppercase', marginBottom: 4 }}>
                            Plain-Language Summary
                        </Text>
                        <Text style={{ fontSize: 13, fontWeight: '600', color: textPrimary, lineHeight: 18 }}>
                            {summarySentence}
                        </Text>
                    </View>

                    {/* Risk Warnings */}
                    {risks.length > 0 && (
                        <View style={{ padding: 12, borderRadius: 10, backgroundColor: isDark ? 'rgba(239,68,68,0.1)' : '#FEF2F2', borderWidth: 1, borderColor: '#FCA5A5', marginBottom: 18 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                                <AlertTriangle size={14} color="#EF4444" />
                                <Text style={{ fontSize: 11, fontWeight: '800', color: '#EF4444' }}>AUDIT NOTICE</Text>
                            </View>
                            {risks.map((r, i) => (
                                <Text key={i} style={{ fontSize: 11, color: isDark ? '#FCA5A5' : '#991B1B', marginBottom: 2 }}>
                                    • {r.message}
                                </Text>
                            ))}
                        </View>
                    )}

                    {/* Area Cards (Collapsible Accordion) */}
                    <Text style={{ fontSize: 13, fontWeight: '800', color: textPrimary, textTransform: 'uppercase', marginBottom: 10 }}>
                        System Areas & Actions
                    </Text>

                    {SYSTEM_DOMAINS.map(domain => {
                        const isExpanded = !!expandedDomains[domain.id];
                        const checkedCount = domain.actions.filter(a => isPermChecked(domain.id, a)).length;
                        return (
                            <View
                                key={domain.id}
                                style={{
                                    borderRadius: 14,
                                    borderWidth: 1,
                                    borderColor: checkedCount > 0 ? (isDark ? '#FF6900' : '#FF6900') : border,
                                    backgroundColor: surface,
                                    marginBottom: 10,
                                    overflow: 'hidden'
                                }}
                            >
                                <TouchableOpacity
                                    onPress={() => toggleDomainExpand(domain.id)}
                                    style={{
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: 14,
                                        backgroundColor: isDark ? '#0D1117' : '#F8FAFC'
                                    }}
                                >
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                        <domain.icon size={18} color="#FF6900" />
                                        <Text style={{ fontSize: 14, fontWeight: '700', color: textPrimary }}>{domain.title}</Text>
                                        {checkedCount > 0 && (
                                            <View style={{ paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10, backgroundColor: '#FF6900' }}>
                                                <Text style={{ color: 'white', fontSize: 10, fontWeight: '800' }}>{checkedCount}</Text>
                                            </View>
                                        )}
                                    </View>
                                    {isExpanded ? <ChevronUp size={18} color={textSecondary} /> : <ChevronDown size={18} color={textSecondary} />}
                                </TouchableOpacity>

                                {isExpanded && (
                                    <View style={{ padding: 14, backgroundColor: surface, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                                        {domain.actions.map(action => {
                                            const checked = isPermChecked(domain.id, action);
                                            const actionInfo = ACTION_LABELS[action] || { label: action, explanation: '' };
                                            return (
                                                <TouchableOpacity
                                                    key={action}
                                                    onPress={() => togglePermission(domain.id, action)}
                                                    style={{
                                                        paddingHorizontal: 12,
                                                        paddingVertical: 8,
                                                        borderRadius: 8,
                                                        borderWidth: 1,
                                                        borderColor: checked ? '#FF6900' : border,
                                                        backgroundColor: checked ? (isDark ? 'rgba(255,105,0,0.1)' : '#FFF7ED') : bg,
                                                        flexDirection: 'row',
                                                        alignItems: 'center',
                                                        gap: 6
                                                    }}
                                                >
                                                    <View style={{ width: 16, height: 16, borderRadius: 4, borderWidth: 1.5, borderColor: checked ? '#FF6900' : textSecondary, backgroundColor: checked ? '#FF6900' : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                                                        {checked && <Check size={11} color="white" strokeWidth={3} />}
                                                    </View>
                                                    <Text style={{ fontSize: 12, fontWeight: checked ? '700' : '500', color: checked ? '#FF6900' : textPrimary }}>
                                                        {actionInfo.label}
                                                    </Text>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </View>
                                )}
                            </View>
                        );
                    })}
                </ScrollView>

                {/* Footer Save */}
                <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, borderTopWidth: 1, borderTopColor: border, backgroundColor: surface }}>
                    <TouchableOpacity
                        onPress={handleSave}
                        disabled={saving}
                        style={{ height: 48, borderRadius: 10, backgroundColor: '#FF6900', alignItems: 'center', justifyContent: 'center' }}
                    >
                        {saving ? (
                            <ActivityIndicator size="small" color="white" />
                        ) : (
                            <Text style={{ color: 'white', fontWeight: '700', fontSize: 14 }}>
                                {role?.id ? "Update Role" : "Create Role"}
                            </Text>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}
