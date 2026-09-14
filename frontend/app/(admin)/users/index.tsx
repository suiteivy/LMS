import { ActionTooltip } from '@/components/common/ActionTooltip';
import { ConfirmationModal } from '@/components/common/ConfirmationModal';
import { EmptyState } from '@/components/common/EmptyState';
import { UnifiedHeader } from "@/components/common/UnifiedHeader";
import { UserCard } from '@/components/common/UserCard';
import { ListItemSkeleton } from '@/components/ui/skeletons';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/libs/supabase';
import { User } from '@/types/types';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Href, router, useLocalSearchParams } from 'expo-router';
import { Users } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator, Alert, FlatList, Modal, Platform,
    ScrollView, Text, TextInput, TouchableOpacity, View, useWindowDimensions
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SettingsService } from '@/services/SettingsService';
import { AdminPasswordResetModal, VerificationDetails } from '@/components/auth/AdminPasswordResetModal';
import Toast from 'react-native-toast-message';

export default function UsersManagementScreen() {
    const params = useLocalSearchParams();
    const { isDark } = useTheme();
    const insets = useSafeAreaInsets();
    const { width } = useWindowDimensions();

    const numColumns = width >= 1200 ? 3 : width >= 768 ? 2 : 1;
    const cardWidth = numColumns === 3 ? '31.8%' : numColumns === 2 ? '48.8%' : '100%';

    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState<'all' | 'student' | 'teacher' | 'admin'>('all');

    // System-wide standardized confirmation modal state
    const [confirmModalConfig, setConfirmModalConfig] = useState<{
        visible: boolean;
        title: string;
        message: string;
        targetName?: string;
        confirmText?: string;
        isDestructive?: boolean;
        loading?: boolean;
        icon?: any;
        onConfirm: () => Promise<void>;
    }>({
        visible: false,
        title: '',
        message: '',
        onConfirm: async () => {},
    });

    const [showResetModal, setShowResetModal] = useState(false);
    const [resettingUser, setResettingUser] = useState<User | null>(null);
    const [resettingLoading, setResettingLoading] = useState(false);
    const [showResultModal, setShowResultModal] = useState(false);
    const [resetResult, setResetResult] = useState<any>(null);

    const openCredentialReset = (targetUser: User) => {
        if (profile?.id && targetUser.id === profile.id) {
            Alert.alert(
                'Action Restricted',
                'Administrators cannot reset their own credentials through the management console. Please use Account Settings or contact Master Admin.'
            );
            return;
        }
        setResettingUser(targetUser);
        setShowResetModal(true);
    };

    const copyToClipboard = (text: string, label: string) => {
        if (Platform.OS === 'web' && typeof navigator !== 'undefined' && (navigator as any)?.clipboard?.writeText) {
            (navigator as any).clipboard.writeText(text);
        } else {
            try {
                const { Clipboard } = require('react-native');
                Clipboard.setString(text);
            } catch (err) {
                console.error('Clipboard copy error:', err);
            }
        }
        Toast.show({
            type: 'success',
            text1: 'Copied',
            text2: `${label} copied to clipboard`,
            position: 'top',
        });
    };

    const confirmCredentialReset = async (verification: VerificationDetails) => {
        if (!resettingUser || resettingLoading) return;
        if (profile?.id && resettingUser.id === profile.id) {
            Alert.alert(
                'Action Restricted',
                'Administrators cannot reset their own credentials through the management console. Please use Account Settings or contact Master Admin.'
            );
            return;
        }
        setResettingLoading(true);
        try {
            const res = await SettingsService.adminResetPassword(resettingUser.id, undefined, verification);
            setResetResult({
                ...res,
                user: resettingUser,
            });
            setShowResetModal(false);
            setShowResultModal(true);
            Toast.show({
                type: 'success',
                text1: 'Credentials Reset',
                text2: 'Temporary credential generated. All active sessions were revoked.',
                position: 'top',
            });
        } catch (err: any) {
            console.error('confirmCredentialReset error:', err);
            const errorMsg = err?.response?.data?.error || err.message || 'Failed to reset credentials';
            Toast.show({
                type: 'error',
                text1: 'Reset Failed',
                text2: errorMsg,
                position: 'top',
            });
            Alert.alert('Reset Failed', errorMsg);
        } finally {
            setResettingLoading(false);
        }
    };

    // Theme shorthands
    const bg = isDark ? '#161B22' : '#FFFFFF';
    const card = isDark ? '#161B22' : '#FFFFFF';
    const border = isDark ? '#21262D' : '#D0D7DE';
    const textPrimary = isDark ? '#f9fafb' : '#111827';
    const textSecondary = isDark ? '#94a3b8' : '#6b7280';
    const inputBg = isDark ? '#161B22' : '#FFFFFF';
    const inputBorder = isDark ? '#21262D' : '#D0D7DE';

    const { isDemo, profile, isProfileLoading, isPlatformAdmin } = useAuth();

    useEffect(() => { 
        if (!isProfileLoading) {
            fetchUsers(); 
        }
    }, [activeFilter, profile?.institution_id, isProfileLoading]);

    const handleMarkLeaver = (targetUser: User) => {
        if (profile?.id && targetUser.id === profile.id) {
            Toast.show({
                type: 'error',
                text1: 'Action Restricted',
                text2: 'Administrators cannot change their own active status.',
            });
            return;
        }

        setConfirmModalConfig({
            visible: true,
            title: 'Confirm Leaver Status',
            targetName: `${targetUser.name} (${targetUser.role})`,
            message: `Marking this user as a leaver deactivates active portal access and revokes current login sessions. Historical academic records, grades, transcripts, and audit trails remain permanently preserved under institutional data retention regulations.`,
            confirmText: 'Mark as Leaver',
            isDestructive: true,
            icon: 'exit-outline',
            loading: false,
            onConfirm: async () => {
                setConfirmModalConfig(prev => ({ ...prev, loading: true }));
                try {
                    const status = targetUser.role === 'student' ? 'withdrawn' : 'resigned';
                    await SettingsService.markUserAsLeaver(targetUser.id, { status });
                    setConfirmModalConfig(prev => ({ ...prev, visible: false, loading: false }));
                    Toast.show({
                        type: 'success',
                        text1: 'Status Updated',
                        text2: `${targetUser.name} marked as leaver. Records preserved.`,
                    });
                    fetchUsers();
                } catch (err: any) {
                    setConfirmModalConfig(prev => ({ ...prev, loading: false }));
                    Toast.show({
                        type: 'error',
                        text1: 'Update Failed',
                        text2: err?.response?.data?.error || err.message || 'Failed to update user status',
                    });
                }
            },
        });
    };

    const handleReactivate = (targetUser: User) => {
        setConfirmModalConfig({
            visible: true,
            title: 'Reactivate Account',
            targetName: `${targetUser.name} (${targetUser.role})`,
            message: `Reactivating this account restores institutional login capabilities, dashboard access, and active course assignments.`,
            confirmText: 'Reactivate Account',
            isDestructive: false,
            icon: 'refresh-circle',
            loading: false,
            onConfirm: async () => {
                setConfirmModalConfig(prev => ({ ...prev, loading: true }));
                try {
                    await SettingsService.reactivateUser(targetUser.id);
                    setConfirmModalConfig(prev => ({ ...prev, visible: false, loading: false }));
                    Toast.show({
                        type: 'success',
                        text1: 'User Reactivated',
                        text2: `${targetUser.name} is now active.`,
                    });
                    fetchUsers();
                } catch (err: any) {
                    setConfirmModalConfig(prev => ({ ...prev, loading: false }));
                    Toast.show({
                        type: 'error',
                        text1: 'Reactivation Failed',
                        text2: err?.response?.data?.error || err.message || 'Failed to reactivate user',
                    });
                }
            },
        });
    };

    const fetchUsers = async () => {
        try {
            setLoading(true);

            // Wait if profile is still loading
            if (isProfileLoading) return;

            const instId = profile?.institution_id;
            const isMaster = isPlatformAdmin || profile?.role === 'master_admin';

            if (!instId && !isMaster) {
                console.warn('[UsersManagement] No institution_id on session — aborting fetch');
                setUsers([]);
                return;
            }

            let query = supabase
                .from('users')
                .select(`id, full_name, first_name, last_name, email, role, is_active, created_at, students(id, enrollment_status), teachers(id, employment_status), admins(id), parents(id)`);

            if (instId) {
                query = query.eq('institution_id', instId);
            }

            query = query.order('created_at', { ascending: false });

            if (activeFilter !== 'all') query = query.eq('role', activeFilter);

            const { data, error } = await query;
            if (error) throw error;
            if (data) {
                const formattedUsers = data.map((u: any) => {
                    try {
                        const getRoleId = (roleData: any) => {
                            if (!roleData) return null;
                            if (Array.isArray(roleData)) return roleData[0]?.id || null;
                            return roleData?.id || null;
                        };
                        let displayId = null;
                        if (u.role === 'student') displayId = getRoleId(u.students);
                        else if (u.role === 'teacher') displayId = getRoleId(u.teachers);
                        else if (u.role === 'admin') displayId = getRoleId(u.admins);
                        else if (u.role === 'parent') displayId = getRoleId(u.parents);

                        const studentObj = Array.isArray(u.students) ? u.students[0] : u.students;
                        const teacherObj = Array.isArray(u.teachers) ? u.teachers[0] : u.teachers;
                        let status: string | undefined = undefined;
                        if (u.role === 'student' && studentObj?.enrollment_status && studentObj.enrollment_status !== 'active') {
                            status = studentObj.enrollment_status;
                        } else if (u.role === 'teacher' && teacherObj?.employment_status && teacherObj.employment_status !== 'active') {
                            status = teacherObj.employment_status;
                        } else if (u.is_active === false) {
                            status = 'inactive';
                        }

                        const fallbackName = `${u.first_name || ''} ${u.last_name || ''}`.trim();
                        return {
                            id: u.id,
                            displayId,
                            name: u.full_name || fallbackName || 'Unknown User',
                            email: u.email || 'No Email',
                            role: u.role || 'user',
                            is_active: u.is_active !== false && !status,
                            status,
                            joinDate: u.created_at || new Date().toISOString()
                        } as User;
                    } catch { return null; }
                }).filter((u): u is User => u !== null);
                setUsers(formattedUsers);
            }
        } catch (error: any) {
            Alert.alert('Error', error.message);
        } finally {
            setLoading(false);
        }
    };

    const DANGEROUS_CHARS = /['"`;\\<>{}()\[\]|&$#%^*+=~]/g;
    const handleSearch = (text: string) => setSearchQuery(text.replace(DANGEROUS_CHARS, ''));

    const filteredUsers = users.filter(user =>
        (user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
        (user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
        (user.displayId?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
    );

    const FILTERS = ['all', 'student', 'teacher', 'admin'] as const;

    return (
        <View style={{ flex: 1, backgroundColor: bg }}>
            <UnifiedHeader
                title="Management"
                subtitle="User Statistics"
                role="Admin"
                onBack={() => router.back()}
            />

            {/* Search & Filters */}
            <View style={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: border }}>
                {/* Search row */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: inputBg, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12, borderWidth: 1, borderColor: inputBorder }}>
                        <Ionicons name="search" size={20} color={textSecondary} />
                        <TextInput
                            style={{ flex: 1, marginLeft: 8, color: textPrimary, fontWeight: '600', fontSize: 13 }}
                            placeholder="Search by name, email, or ID..."
                            placeholderTextColor={textSecondary}
                            value={searchQuery}
                            onChangeText={handleSearch}
                        />
                        {searchQuery.length > 0 && (
                            <TouchableOpacity onPress={() => setSearchQuery('')}>
                                <Ionicons name="close-circle" size={18} color={textSecondary} />
                            </TouchableOpacity>
                        )}
                    </View>
                    <ActionTooltip
                        label="Create User"
                        description="Register a new student, teacher, admin, or parent account."
                        learnMoreAnchor="custom-roles"
                    >
                        <TouchableOpacity
                            onPress={() => router.push('/(admin)/users/create')}
                            activeOpacity={0.7}
                            style={{
                                width: 48,
                                height: 48,
                                backgroundColor: '#FF6900',
                                borderRadius: 16,
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            <Ionicons name="add" size={28} color="white" />
                        </TouchableOpacity>
                    </ActionTooltip>
                </View>

                {/* Filter tabs */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                    {FILTERS.map(filter => {
                        const isActive = activeFilter === filter;
                        return (
                            <TouchableOpacity
                                key={filter}
                                onPress={() => setActiveFilter(filter)}
                                activeOpacity={0.7}
                                style={{
                                    paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12, borderWidth: 1,
                                    backgroundColor: card,
                                    borderColor: isActive ? '#FF6900' : border,
                                }}
                            >
                                <Text style={{
                                    fontWeight: '600', fontSize: 13, textTransform: 'capitalize',
                                    color: isActive ? '#FF6900' : textSecondary,
                                }}>
                                    {filter}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            </View>

            {/* User list */}
            {loading ? (
                <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 16 }}>
                    <ListItemSkeleton loading={loading} count={6} label="Loading users..." />
                </View>
            ) : (
                <FlatList
                    data={filteredUsers}
                    keyExtractor={item => item.id}
                    contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24 }}
                    numColumns={numColumns}
                    key={`user-grid-${numColumns}`}
                    columnWrapperStyle={numColumns > 1 ? { gap: 16 } : undefined}
                    renderItem={({ item }) => (
                        <View style={{ width: cardWidth }}>
                            <UserCard
                                user={item}
                                showActions={true}
                                onResetCredentialsPress={item.id === profile?.id ? undefined : openCredentialReset}
                                onMarkLeaverPress={item.id === profile?.id ? undefined : handleMarkLeaver}
                                onReactivatePress={item.id === profile?.id ? undefined : handleReactivate}
                                onPress={u => router.push(`/(admin)/users/${u.id}` as Href)}
                            />
                        </View>
                    )}
                    ListEmptyComponent={
                        <EmptyState
                            title="No users found"
                            message={searchQuery
                                ? `No users match "${searchQuery}" in the ${activeFilter} category.`
                                : `There are no users registered under the ${activeFilter} role yet.`
                            }
                            icon={Users}
                            color="#6366f1"
                        />
                    }
                />
            )}

            {/* Identity Verification & Credential Reset Modal */}
            <AdminPasswordResetModal
                visible={showResetModal}
                onClose={() => setShowResetModal(false)}
                onConfirm={confirmCredentialReset}
                loading={resettingLoading}
                targetUser={resettingUser}
            />

            {/* Temporary Credential Result Modal */}
            <Modal
                visible={showResultModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowResultModal(false)}
            >
                <View style={{
                    flex: 1,
                    backgroundColor: 'rgba(0,0,0,0.6)',
                    justifyContent: 'center',
                    alignItems: 'center',
                    padding: 16,
                    zIndex: 100000,
                    elevation: 100000,
                }}>
                    <View style={{
                        backgroundColor: card,
                        borderColor: border,
                        borderWidth: 1,
                        borderRadius: 16,
                        padding: 20,
                        width: '100%',
                        maxWidth: 460,
                        maxHeight: '90%',
                    }}>
                        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1 }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                                <Text style={{ color: textPrimary, fontSize: 19, fontWeight: '800' }}>Temporary Credential</Text>
                                <TouchableOpacity onPress={() => setShowResultModal(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                                    <MaterialCommunityIcons name="close" size={22} color={textSecondary} />
                                </TouchableOpacity>
                            </View>

                            <View style={{ borderWidth: 1, borderColor: border, borderRadius: 12, padding: 14, backgroundColor: inputBg }}>
                                {!!(resetResult?.user?.email || resetResult?.email) && (
                                    <Text style={{ color: textSecondary, fontSize: 13, marginBottom: 8 }}>
                                        Login Email: <Text style={{ color: textPrimary, fontWeight: '700' }}>{resetResult?.user?.email || resetResult?.email}</Text>
                                    </Text>
                                )}

                                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                                    <Text style={{ color: textSecondary, fontSize: 13 }}>Temporary Password:</Text>
                                    <TouchableOpacity
                                        onPress={() => {
                                            const pwd = resetResult?.tempPassword;
                                            if (pwd) copyToClipboard(pwd, 'Password');
                                        }}
                                        style={{ backgroundColor: '#FF6900', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}
                                    >
                                        <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>Copy Password</Text>
                                    </TouchableOpacity>
                                </View>

                                <Text style={{ color: textPrimary, fontWeight: '800', fontSize: 16, marginBottom: 10, letterSpacing: 1 }}>
                                    {resetResult?.tempPassword || 'N/A'}
                                </Text>

                                {!!resetResult?.credential_delivery?.url && (
                                    <View style={{ marginTop: 6, paddingTop: 10, borderTopWidth: 1, borderTopColor: border }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                                            <Text style={{ color: textSecondary, fontSize: 12 }}>One-Time Credential Link:</Text>
                                            <TouchableOpacity
                                                onPress={() => {
                                                    const url = resetResult.credential_delivery.url;
                                                    if (url) copyToClipboard(url, 'Link');
                                                }}
                                                style={{ borderWidth: 1, borderColor: border, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}
                                            >
                                                <Text style={{ color: textPrimary, fontSize: 11, fontWeight: '700' }}>Copy Link</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                )}

                                <Text style={{ color: textSecondary, fontSize: 12, marginTop: 8 }}>
                                    User will be forced to logout of all sessions and complete password and security question setup at next login.
                                </Text>
                            </View>

                            <TouchableOpacity
                                onPress={() => setShowResultModal(false)}
                                style={{ marginTop: 14, backgroundColor: '#FF6900', borderRadius: 12, paddingVertical: 12, alignItems: 'center' }}
                            >
                                <Text style={{ color: '#fff', fontWeight: '800' }}>Done</Text>
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* System-Wide Standardized Confirmation Modal */}
            <ConfirmationModal
                visible={confirmModalConfig.visible}
                title={confirmModalConfig.title}
                message={confirmModalConfig.message}
                targetName={confirmModalConfig.targetName}
                confirmText={confirmModalConfig.confirmText}
                isDestructive={confirmModalConfig.isDestructive}
                icon={confirmModalConfig.icon}
                loading={confirmModalConfig.loading}
                onConfirm={confirmModalConfig.onConfirm}
                onClose={() => setConfirmModalConfig(prev => ({ ...prev, visible: false }))}
            />
        </View>
    );
}
