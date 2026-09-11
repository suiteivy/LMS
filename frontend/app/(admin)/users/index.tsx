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
import Toast from 'react-native-toast-message';

export default function UsersManagementScreen() {
    const params = useLocalSearchParams();
    const { isDark } = useTheme();
    const insets = useSafeAreaInsets();
    const { width } = useWindowDimensions();

    const numColumns = width >= 1024 ? 3 : width >= 640 ? 2 : 1;
    const cardWidth = numColumns === 3 ? '31.5%' : numColumns === 2 ? '48.5%' : '100%';

    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState<'all' | 'student' | 'teacher' | 'admin'>('all');

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

    const confirmCredentialReset = async () => {
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
            const res = await SettingsService.adminResetPassword(resettingUser.id);
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

    const { isDemo, profile } = useAuth();

    useEffect(() => { fetchUsers(); }, [activeFilter, profile?.institution_id]);

    const fetchUsers = async () => {
        try {
            setLoading(true);

            if (!profile?.institution_id) {
                console.warn('[UsersManagement] No institution_id on session — aborting fetch');
                setUsers([]);
                return;
            }

            let query = supabase
                .from('users')
                .select(`id, full_name, first_name, last_name, email, role, created_at, students(id), teachers(id), admins(id), parents(id)`)
                .eq('institution_id', profile.institution_id)
                .order('created_at', { ascending: false });

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
                        const fallbackName = `${u.first_name || ''} ${u.last_name || ''}`.trim();
                        return { id: u.id, displayId, name: u.full_name || fallbackName || 'Unknown User', email: u.email || 'No Email', role: u.role || 'user', joinDate: u.created_at || new Date().toISOString() } as User;
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

            {/* Credential Reset Confirmation Modal */}
            <Modal
                visible={showResetModal}
                transparent
                animationType="fade"
                onRequestClose={() => {
                    if (!resettingLoading) setShowResetModal(false);
                }}
            >
                <View style={{
                    flex: 1,
                    backgroundColor: 'rgba(0,0,0,0.6)',
                    justifyContent: 'center',
                    alignItems: 'center',
                    padding: 16,
                }}>
                    <View style={{
                        backgroundColor: card,
                        borderColor: border,
                        borderWidth: 1,
                        borderRadius: 16,
                        padding: 20,
                        width: '100%',
                        maxWidth: 440,
                        maxHeight: '90%',
                    }}>
                        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                                <View style={{ backgroundColor: isDark ? 'rgba(239,68,68,0.2)' : '#FEE2E2', padding: 8, borderRadius: 10, marginRight: 10 }}>
                                    <MaterialCommunityIcons name="lock-reset" size={24} color="#DC2626" />
                                </View>
                                <Text style={{ color: textPrimary, fontWeight: '800', fontSize: 18, flex: 1 }}>
                                    Confirm Credential Reset
                                </Text>
                            </View>

                            {!!resettingUser && (
                                <View style={{
                                    backgroundColor: inputBg,
                                    borderColor: border,
                                    borderWidth: 1,
                                    borderRadius: 10,
                                    padding: 12,
                                    marginBottom: 14,
                                }}>
                                    <Text style={{ color: textPrimary, fontWeight: '700', fontSize: 14 }}>
                                        {resettingUser.name || 'User'}
                                    </Text>
                                    <Text style={{ color: textSecondary, fontSize: 12, marginTop: 2 }}>
                                        Email: {resettingUser.email || 'N/A'}
                                    </Text>
                                    <Text style={{ color: textSecondary, fontSize: 12, marginTop: 2, textTransform: 'capitalize' }}>
                                        Role: {resettingUser.role || 'User'}
                                    </Text>
                                </View>
                            )}

                            <View style={{
                                backgroundColor: isDark ? 'rgba(239,68,68,0.12)' : '#FEF2F2',
                                borderColor: isDark ? '#7f1d1d' : '#FCA5A5',
                                borderWidth: 1,
                                borderRadius: 10,
                                padding: 12,
                                marginBottom: 16,
                            }}>
                                <Text style={{ color: '#B91C1C', fontWeight: '700', fontSize: 13, marginBottom: 4 }}>
                                    Security Action Notice
                                </Text>
                                <Text style={{ color: isDark ? '#FCA5A5' : '#991B1B', fontSize: 12, lineHeight: 18 }}>
                                    Reset credentials for <Text style={{ fontWeight: '800' }}>{resettingUser?.name || resettingUser?.email || 'this user'}</Text>? This will generate a new temporary credential, force logout all active sessions, and require password + security question setup at next login.
                                </Text>
                            </View>

                            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 'auto', paddingTop: 8 }}>
                                <TouchableOpacity
                                    onPress={() => setShowResetModal(false)}
                                    disabled={resettingLoading}
                                    style={{
                                        borderWidth: 1,
                                        borderColor: border,
                                        borderRadius: 10,
                                        paddingHorizontal: 14,
                                        paddingVertical: 10,
                                        backgroundColor: inputBg,
                                    }}
                                >
                                    <Text style={{ color: textSecondary, fontWeight: '700' }}>Cancel</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    onPress={confirmCredentialReset}
                                    disabled={resettingLoading}
                                    style={{
                                        borderWidth: 1,
                                        borderColor: '#DC2626',
                                        borderRadius: 10,
                                        paddingHorizontal: 16,
                                        paddingVertical: 10,
                                        backgroundColor: '#DC2626',
                                        minWidth: 110,
                                        alignItems: 'center',
                                    }}
                                >
                                    {resettingLoading ? (
                                        <ActivityIndicator size="small" color="#FFF" />
                                    ) : (
                                        <Text style={{ color: '#FFF', fontWeight: '800' }}>Confirm Reset</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </ScrollView>
                    </View>
                </View>
            </Modal>

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
        </View>
    );
}
