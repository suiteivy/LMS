import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Modal,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/libs/supabase';
import Toast from 'react-native-toast-message';
import { ListItemSkeleton } from '@/components/ui/skeletons';
import { getApiBaseUrl } from '@/utils/backendUrl';

type Institution = { id: string; name: string };
type Category = { id: string; name: string };

type UserItem = {
    id: string;
    custom_display_id?: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    phone?: string | null;
    role: string;
    canonical_role?: string;
    role_alias?: string;
    created_at: string;
    institution_id: string | null;
    institutions: { name: string } | null;
    otp_reset_pending?: boolean;
};

type RoleFilter = 'all' | 'teacher' | 'student' | 'parent' | 'admin' | 'master_admin';

const ROLE_OPTIONS: ReadonlyArray<RoleFilter> = ['all', 'teacher', 'student', 'parent', 'admin', 'master_admin'];
const PAGE_SIZE = 50;

const ROLE_COLOR: Record<string, string> = {
    student: '#3B82F6',
    teacher: '#10B981',
    admin: '#F59E0B',
    school_admin: '#F59E0B',
    parent: '#8B5CF6',
    master_admin: '#FB923C',
    platform_admin: '#FB923C',
    bursary: '#EC4899',
};

const ROLE_ICON: Record<string, string> = {
    student: 'school-outline',
    teacher: 'human-male-board',
    admin: 'shield-account',
    school_admin: 'shield-account',
    parent: 'account-heart',
    master_admin: 'crown',
    platform_admin: 'crown',
    bursary: 'currency-usd',
};



const roleLabel = (role: string) => {
    if (role === 'school_admin') return 'Admin';
    if (role === 'platform_admin') return 'Master Admin';
    return role.replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());
};

const roleFilterToApi = (role: RoleFilter): string | null => {
    if (role === 'all') return null;
    if (role === 'admin') return 'admin';
    if (role === 'master_admin') return 'master_admin';
    return role;
};

const toCanonicalRole = (role: string): string => {
    if (role === 'admin') return 'school_admin';
    if (role === 'master_admin') return 'platform_admin';
    return role;
};

const platformRoles = new Set(['master_admin', 'platform_admin']);

export default function MasterAdminUsersScreen() {
    const { isDark } = useTheme();

    const [users, setUsers] = useState<UserItem[]>([]);
    const [institutions, setInstitutions] = useState<Institution[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
    const [institutionFilter, setInstitutionFilter] = useState<string>('all');
    const [categoryFilters, setCategoryFilters] = useState<string[]>([]);
    const [showFilters, setShowFilters] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    const [editVisible, setEditVisible] = useState(false);
    const [editingUser, setEditingUser] = useState<UserItem | null>(null);
    const [editFirstName, setEditFirstName] = useState('');
    const [editLastName, setEditLastName] = useState('');
    const [editEmail, setEditEmail] = useState('');
    const [editPhone, setEditPhone] = useState('');
    const [editRole, setEditRole] = useState<RoleFilter>('teacher');
    const [editInstitution, setEditInstitution] = useState<string>('none');
    const [savingEdit, setSavingEdit] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deletingUser, setDeletingUser] = useState(false);

    const [showResetModal, setShowResetModal] = useState(false);
    const [resettingUser, setResettingUser] = useState<UserItem | null>(null);
    const [resettingLoading, setResettingLoading] = useState(false);

    const pageRef = useRef(1);
    const isFetchingRef = useRef(false);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const colors = {
        pageBg: isDark ? '#0D1117' : '#F6F8FA',
        cardBg: isDark ? '#161B22' : '#FFFFFF',
        text: isDark ? '#E6EDF3' : '#111827',
        subtext: isDark ? '#8B949E' : '#6B7280',
        border: isDark ? '#4B5563' : '#9CA3AF',
        inputBg: isDark ? '#111827' : '#F3F4F6',
        primary: '#FF6B00',
    };

    const fetchInstitutions = useCallback(async () => {
        const { data } = await supabase.from('institutions').select('id, name').order('name');
        setInstitutions(data || []);
    }, []);

    const fetchCategories = useCallback(async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const res = await fetch(`${getApiBaseUrl()}/master-admin/school-categories`, {
                headers: {
                    Authorization: `Bearer ${session.access_token}`,
                    Accept: 'application/json',
                },
            });
            const data = await res.json();
            if (res.ok) {
                setCategories(Array.isArray(data) ? data : []);
            }
        } catch (err) {
            console.error('fetchCategories error:', err);
        }
    }, []);

    const fetchUsers = useCallback(async (reset = false) => {
        if (isFetchingRef.current) return;
        isFetchingRef.current = true;

        try {
            const currentPage = reset ? 1 : pageRef.current;
            if (reset) {
                setLoading(true);
                setUsers([]);
                pageRef.current = 1;
                setHasMore(true);
            } else {
                setLoadingMore(true);
            }

            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                setLoading(false);
                setLoadingMore(false);
                return;
            }

            const params = new URLSearchParams({
                page: String(currentPage),
                limit: String(PAGE_SIZE),
            });

            const roleParam = roleFilterToApi(roleFilter);
            if (roleParam) params.append('role', roleParam);
            if (institutionFilter !== 'all') params.append('institution_id', institutionFilter);
            if (categoryFilters.length > 0) params.append('category_ids', categoryFilters.join(','));
            if (search.trim()) params.append('search', search.trim());

            const response = await fetch(`${getApiBaseUrl()}/master-admin/users?${params.toString()}`, {
                headers: {
                    Authorization: `Bearer ${session.access_token}`,
                    Accept: 'application/json',
                },
            });

            const text = await response.text();
            let payload: any;
            try {
                payload = JSON.parse(text);
            } catch {
                Toast.show({ type: 'error', text1: 'Server Error', text2: 'Invalid response body', position: 'top' });
                return;
            }

            if (!response.ok) {
                Toast.show({ type: 'error', text1: 'Fetch Failed', text2: payload?.error || 'Unable to load users', position: 'top' });
                return;
            }

            const incoming = Array.isArray(payload?.users) ? payload.users : [];
            setUsers((prev) => {
                const combined: UserItem[] = reset ? incoming : [...prev, ...incoming];
                return combined.filter((u: UserItem, index: number, self: UserItem[]) => index === self.findIndex((x: UserItem) => x.id === u.id));
            });

            const more = incoming.length === PAGE_SIZE;
            setHasMore(more);
            if (!reset && more) {
                pageRef.current = currentPage + 1;
            }
        } catch (err) {
            console.error('fetchUsers error:', err);
            Toast.show({ type: 'error', text1: 'Network Error', text2: 'Could not reach server', position: 'top' });
        } finally {
            setLoading(false);
            setLoadingMore(false);
            isFetchingRef.current = false;
            setRefreshing(false);
        }
    }, [categoryFilters, institutionFilter, roleFilter, search]);

    const toggleCategoryFilter = useCallback((id: string) => {
        setCategoryFilters((prev) =>
            prev.includes(id)
                ? prev.filter((item) => item !== id)
                : [...prev, id]
        );
    }, []);

    useEffect(() => {
        fetchInstitutions();
        fetchCategories();
    }, [fetchCategories, fetchInstitutions]);

    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            fetchUsers(true);
        }, 300);

        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, [fetchUsers]);

    const groupedSections = useMemo(() => {
        const platformUsers = users.filter((u) => platformRoles.has(u.canonical_role || u.role));
        const institutionUsers = users.filter((u) => !platformRoles.has(u.canonical_role || u.role));

        const groupedByInstitution = institutionUsers.reduce<Record<string, UserItem[]>>((acc, user) => {
            const key = user.institution_id || 'no-institution';
            if (!acc[key]) acc[key] = [];
            acc[key].push(user);
            return acc;
        }, {});

        const sections: Array<{ key: string; title: string; items: UserItem[] }> = [];
        if (platformUsers.length > 0) {
            sections.push({ key: 'platform-admins', title: 'Platform Admins', items: platformUsers });
        }

        Object.entries(groupedByInstitution)
            .sort((a, b) => {
                const aName = a[1][0]?.institutions?.name || 'Unknown Institution';
                const bName = b[1][0]?.institutions?.name || 'Unknown Institution';
                return aName.localeCompare(bName);
            })
            .forEach(([key, value]) => {
                const title = value[0]?.institutions?.name || 'Unassigned Institution';
                sections.push({ key, title, items: value });
            });

        return sections;
    }, [users]);

    const selectedCategoryCount = categoryFilters.length;

    const openEdit = useCallback((user: UserItem) => {
        setEditingUser(user);
        setEditFirstName(user.first_name || '');
        setEditLastName(user.last_name || '');
        setEditEmail(user.email || '');
        setEditPhone(user.phone || '');
        const canonicalRole = user.canonical_role || user.role;
        if (canonicalRole === 'school_admin') setEditRole('admin');
        else if (canonicalRole === 'platform_admin') setEditRole('master_admin');
        else setEditRole((canonicalRole as RoleFilter) || 'teacher');
        setEditInstitution(user.institution_id || 'none');
        setEditVisible(true);
    }, []);

    const closeEdit = useCallback(() => {
        setEditVisible(false);
        setEditingUser(null);
        setSavingEdit(false);
        setShowDeleteConfirm(false);
        setDeletingUser(false);
    }, []);

    const requestDeleteMasterAdmin = useCallback(() => {
        if (!editingUser) return;
        const canonicalRole = editingUser.canonical_role || editingUser.role;
        if (!platformRoles.has(canonicalRole)) return;
        setShowDeleteConfirm(true);
    }, [editingUser]);

    const cancelDeleteMasterAdmin = useCallback(() => {
        if (deletingUser) return;
        setShowDeleteConfirm(false);
    }, [deletingUser]);

    const confirmDeleteMasterAdmin = useCallback(async () => {
        if (!editingUser || deletingUser) return;
        setDeletingUser(true);

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                Toast.show({ type: 'error', text1: 'Unauthorized', text2: 'Please sign in again', position: 'top' });
                setDeletingUser(false);
                return;
            }

            const response = await fetch(`${getApiBaseUrl()}/master-admin/users/${editingUser.id}`, {
                method: 'DELETE',
                headers: {
                    Authorization: `Bearer ${session.access_token}`,
                    Accept: 'application/json',
                },
            });

            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                Toast.show({ type: 'error', text1: 'Delete Failed', text2: data?.error || 'Could not delete user', position: 'top' });
                setDeletingUser(false);
                return;
            }

            setUsers((prev) => prev.filter((u) => u.id !== editingUser.id));
            Toast.show({ type: 'success', text1: 'Master Admin Deleted', text2: 'User removed successfully', position: 'top' });
            closeEdit();
        } catch (err) {
            console.error('confirmDeleteMasterAdmin error:', err);
            Toast.show({ type: 'error', text1: 'Network Error', text2: 'Failed to delete user', position: 'top' });
            setDeletingUser(false);
        }
    }, [closeEdit, deletingUser, editingUser]);

    const openCredentialReset = useCallback((user: UserItem) => {
        setResettingUser(user);
        setShowResetModal(true);
    }, []);

    const closeCredentialReset = useCallback(() => {
        if (resettingLoading) return;
        setShowResetModal(false);
        setResettingUser(null);
    }, [resettingLoading]);

    const confirmCredentialReset = useCallback(async () => {
        if (!resettingUser || resettingLoading) return;
        setResettingLoading(true);

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                Toast.show({ type: 'error', text1: 'Unauthorized', text2: 'Please sign in again', position: 'top' });
                setResettingLoading(false);
                return;
            }

            const response = await fetch(`${getApiBaseUrl()}/auth/admin-reset-password`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${session.access_token}`,
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    targetUserId: resettingUser.id,
                    otpReset: true,
                }),
            });

            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                Toast.show({ type: 'error', text1: 'Reset Failed', text2: data?.error || 'Could not reset credentials', position: 'top' });
                setResettingLoading(false);
                return;
            }

            setUsers((prev) => prev.map((u) => {
                if (u.id !== resettingUser.id) return u;
                return { ...u, otp_reset_pending: true };
            }));

            Toast.show({
                type: 'success',
                text1: 'Credentials Reset Successfully',
                text2: 'Password invalidated, active sessions revoked, and OTP verification dispatched.',
                position: 'top',
                visibilityTime: 5000,
            });

            setShowResetModal(false);
            setResettingUser(null);
        } catch (err) {
            console.error('confirmCredentialReset error:', err);
            Toast.show({ type: 'error', text1: 'Network Error', text2: 'Failed to trigger credential reset', position: 'top' });
        } finally {
            setResettingLoading(false);
        }
    }, [resettingUser, resettingLoading]);

    const saveEdit = useCallback(async () => {
        if (!editingUser || savingEdit) return;
        setSavingEdit(true);

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                Toast.show({ type: 'error', text1: 'Unauthorized', text2: 'Please sign in again', position: 'top' });
                setSavingEdit(false);
                return;
            }

            const payload = {
                first_name: editFirstName.trim() || null,
                last_name: editLastName.trim() || null,
                email: editEmail.trim() || null,
                phone: editPhone.trim() || null,
                role: editRole,
                institution_id: editInstitution === 'none' ? null : editInstitution,
            };

            const response = await fetch(`${getApiBaseUrl()}/master-admin/users/${editingUser.id}`, {
                method: 'PUT',
                headers: {
                    Authorization: `Bearer ${session.access_token}`,
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            const data = await response.json();
            if (!response.ok) {
                Toast.show({ type: 'error', text1: 'Update Failed', text2: data?.error || 'Could not update user', position: 'top' });
                setSavingEdit(false);
                return;
            }

            const serverUser = data?.user || {};
            const canonicalRole = toCanonicalRole(editRole);
            const institutionObj = editInstitution === 'none'
                ? null
                : { name: institutions.find((i) => i.id === editInstitution)?.name || 'Unknown Institution' };

            setUsers((prev) => prev.map((u) => {
                if (u.id !== editingUser.id) return u;
                return {
                    ...u,
                    ...serverUser,
                    first_name: editFirstName.trim() || u.first_name,
                    last_name: editLastName.trim() || u.last_name,
                    email: editEmail.trim() || null,
                    phone: editPhone.trim() || null,
                    role: serverUser.role || editRole,
                    canonical_role: serverUser.canonical_role || canonicalRole,
                    role_alias: serverUser.role_alias || canonicalRole,
                    institution_id: editInstitution === 'none' ? null : editInstitution,
                    institutions: institutionObj,
                } as UserItem;
            }));

            Toast.show({ type: 'success', text1: 'User Updated', text2: 'Changes saved successfully', position: 'top' });
            closeEdit();
        } catch (err) {
            console.error('saveEdit error:', err);
            Toast.show({ type: 'error', text1: 'Network Error', text2: 'Failed to save changes', position: 'top' });
            setSavingEdit(false);
        }
    }, [closeEdit, editEmail, editFirstName, editInstitution, editLastName, editPhone, editRole, editingUser, institutions, savingEdit]);

    const renderUserCard = useCallback(({ item }: { item: UserItem }) => {
        const roleKey = item.canonical_role || item.role;
        const color = ROLE_COLOR[roleKey] || '#6B7280';
        const icon = ROLE_ICON[roleKey] || 'account';
        const displayName = `${item.first_name || ''} ${item.last_name || ''}`.trim() || 'Unknown User';
        const initials = displayName.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();

        return (
            <View style={{
                backgroundColor: colors.cardBg,
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 14,
                padding: 14,
                marginBottom: 10,
            }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={{
                        width: 44,
                        height: 44,
                        borderRadius: 22,
                        backgroundColor: `${color}22`,
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderWidth: 1,
                        borderColor: `${color}55`,
                    }}>
                        <Text style={{ color, fontWeight: '800' }}>{initials}</Text>
                    </View>

                    <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={{ color: colors.text, fontWeight: '700', fontSize: 15 }}>{displayName}</Text>
                        <Text style={{ color: colors.subtext, fontSize: 12 }} numberOfLines={1}>{item.email || 'No email'}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
                            <View style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                backgroundColor: `${color}20`,
                                paddingHorizontal: 8,
                                paddingVertical: 3,
                                borderRadius: 8,
                                marginRight: 8,
                            }}>
                                <MaterialCommunityIcons name={icon as any} size={12} color={color} />
                                <Text style={{ color, marginLeft: 4, fontWeight: '700', fontSize: 11 }}>{roleLabel(roleKey)}</Text>
                            </View>
                            {!!item.custom_display_id && (
                                <Text style={{ color: colors.subtext, fontSize: 11, marginRight: 8 }}>ID: {item.custom_display_id}</Text>
                            )}
                            {!!item.otp_reset_pending && (
                                <View style={{
                                    backgroundColor: '#FEF3C7',
                                    borderWidth: 1,
                                    borderColor: '#F59E0B',
                                    borderRadius: 6,
                                    paddingHorizontal: 6,
                                    paddingVertical: 2,
                                }}>
                                    <Text style={{ color: '#D97706', fontSize: 10, fontWeight: '800' }}>Pending OTP</Text>
                                </View>
                            )}
                        </View>
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <TouchableOpacity
                            onPress={() => openCredentialReset(item)}
                            style={{
                                backgroundColor: '#FEE2E2',
                                borderColor: '#FCA5A5',
                                borderWidth: 1,
                                borderRadius: 10,
                                paddingHorizontal: 10,
                                paddingVertical: 8,
                            }}
                        >
                            <Text style={{ color: '#DC2626', fontWeight: '700', fontSize: 12 }}>Reset Access</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => openEdit(item)}
                            style={{
                                backgroundColor: `${colors.primary}18`,
                                borderColor: `${colors.primary}40`,
                                borderWidth: 1,
                                borderRadius: 10,
                                paddingHorizontal: 10,
                                paddingVertical: 8,
                            }}
                        >
                            <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 12 }}>Manage</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        );
    }, [colors.border, colors.cardBg, colors.primary, colors.subtext, colors.text, openCredentialReset, openEdit]);

    const renderSection = ({ item }: { item: { key: string; title: string; items: UserItem[] } }) => {
        return (
            <View style={{ marginBottom: 18 }}>
                <View style={{
                    backgroundColor: colors.cardBg,
                    borderColor: colors.border,
                    borderWidth: 1,
                    borderRadius: 12,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    marginBottom: 10,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                }}>
                    <Text style={{ color: colors.text, fontWeight: '700' }}>{item.title}</Text>
                    <Text style={{ color: colors.subtext, fontSize: 12 }}>{item.items.length} users</Text>
                </View>
                {item.items.map((u) => (
                    <View key={`${item.key}-${u.id}`}>
                        {renderUserCard({ item: u })}
                    </View>
                ))}
            </View>
        );
    };

    const loadMore = () => {
        if (hasMore && !loading && !loadingMore) {
            fetchUsers(false);
        }
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.pageBg }} edges={['top', 'left', 'right']}>
            <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 10, flexDirection: 'row', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={{ backgroundColor: `${colors.primary}20`, padding: 8, borderRadius: 10, marginRight: 10 }}>
                        <MaterialCommunityIcons name="account-group" size={22} color={colors.primary} />
                    </View>
                    <View>
                        <Text style={{ color: colors.text, fontWeight: '800', fontSize: 22 }}>All Users</Text>
                        <Text style={{ color: colors.subtext, fontSize: 12 }}>{users.length} loaded</Text>
                    </View>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <TouchableOpacity
                        onPress={() => setShowFilters((v) => !v)}
                        style={{
                            backgroundColor: showFilters ? colors.primary : `${colors.primary}18`,
                            borderColor: `${colors.primary}45`,
                            borderWidth: 1,
                            padding: 8,
                            borderRadius: 10,
                            marginRight: 8,
                        }}
                    >
                        <MaterialCommunityIcons
                            name={showFilters ? 'filter-remove' : 'filter-variant'}
                            size={18}
                            color={showFilters ? '#FFFFFF' : colors.primary}
                        />
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={() => {
                            setRefreshing(true);
                            fetchUsers(true);
                        }}
                        style={{
                            backgroundColor: colors.cardBg,
                            borderColor: colors.border,
                            borderWidth: 1,
                            padding: 8,
                            borderRadius: 10,
                        }}
                    >
                        {refreshing ? (
                            <ActivityIndicator size="small" color={colors.primary} />
                        ) : (
                            <MaterialCommunityIcons name="refresh" size={18} color={colors.text} />
                        )}
                    </TouchableOpacity>
                </View>
            </View>

            <View style={{ paddingHorizontal: 16, marginBottom: 12 }}>
                <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: colors.inputBg,
                    borderColor: colors.border,
                    borderWidth: 1,
                    borderRadius: 12,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                }}>
                    <MaterialCommunityIcons name="magnify" size={18} color={colors.subtext} />
                    <TextInput
                        value={search}
                        onChangeText={setSearch}
                        placeholder="Search by name or email"
                        placeholderTextColor={colors.subtext}
                        style={{ flex: 1, marginLeft: 8, color: colors.text, fontSize: 14 }}
                    />
                    {search.length > 0 && (
                        <TouchableOpacity onPress={() => setSearch('')}>
                            <MaterialCommunityIcons name="close-circle" size={18} color={colors.subtext} />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {showFilters && (
                <View style={{
                    marginHorizontal: 16,
                    marginBottom: 12,
                    backgroundColor: colors.cardBg,
                    borderColor: colors.border,
                    borderWidth: 1,
                    borderRadius: 12,
                    padding: 12,
                }}>
                    <Text style={{ color: colors.text, fontWeight: '700', marginBottom: 8 }}>Role</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 10 }}>
                        {ROLE_OPTIONS.map((r) => {
                            const active = roleFilter === r;
                            return (
                                <TouchableOpacity
                                    key={r}
                                    onPress={() => setRoleFilter(r)}
                                    style={{
                                        marginRight: 8,
                                        marginBottom: 8,
                                        borderRadius: 10,
                                        paddingHorizontal: 10,
                                        paddingVertical: 7,
                                        backgroundColor: active ? colors.primary : colors.inputBg,
                                        borderWidth: 1,
                                        borderColor: active ? colors.primary : colors.border,
                                    }}
                                >
                                    <Text style={{ color: active ? '#FFF' : colors.subtext, fontSize: 12, fontWeight: '700' }}>
                                        {r === 'all' ? 'All Roles' : roleLabel(r)}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    <Text style={{ color: colors.text, fontWeight: '700', marginBottom: 8 }}>Category</Text>
                    {selectedCategoryCount > 0 && (
                        <Text style={{ color: colors.subtext, marginBottom: 8 }}>
                            {selectedCategoryCount} selected
                        </Text>
                    )}
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 10 }}>
                        <TouchableOpacity
                            onPress={() => setCategoryFilters([])}
                            style={{
                                marginRight: 8,
                                marginBottom: 8,
                                borderRadius: 10,
                                paddingHorizontal: 10,
                                paddingVertical: 7,
                                backgroundColor: categoryFilters.length === 0 ? colors.primary : colors.inputBg,
                                borderWidth: 1,
                                borderColor: categoryFilters.length === 0 ? colors.primary : colors.border,
                            }}
                        >
                            <Text style={{ color: categoryFilters.length === 0 ? '#FFF' : colors.subtext, fontSize: 12, fontWeight: '700' }}>
                                All Categories
                            </Text>
                        </TouchableOpacity>
                        {categories.map((c) => (
                            <TouchableOpacity
                                key={c.id}
                                onPress={() => toggleCategoryFilter(c.id)}
                                style={{
                                    marginRight: 8,
                                    marginBottom: 8,
                                    borderRadius: 10,
                                    paddingHorizontal: 10,
                                    paddingVertical: 7,
                                    backgroundColor: categoryFilters.includes(c.id) ? colors.primary : colors.inputBg,
                                    borderWidth: 1,
                                    borderColor: categoryFilters.includes(c.id) ? colors.primary : colors.border,
                                }}
                            >
                                <Text style={{ color: categoryFilters.includes(c.id) ? '#FFF' : colors.subtext, fontSize: 12, fontWeight: '700' }}>
                                    {c.name}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <Text style={{ color: colors.text, fontWeight: '700', marginBottom: 8 }}>Institution</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                        <TouchableOpacity
                            onPress={() => setInstitutionFilter('all')}
                            style={{
                                marginRight: 8,
                                marginBottom: 8,
                                borderRadius: 10,
                                paddingHorizontal: 10,
                                paddingVertical: 7,
                                backgroundColor: institutionFilter === 'all' ? colors.primary : colors.inputBg,
                                borderWidth: 1,
                                borderColor: institutionFilter === 'all' ? colors.primary : colors.border,
                            }}
                        >
                            <Text style={{ color: institutionFilter === 'all' ? '#FFF' : colors.subtext, fontSize: 12, fontWeight: '700' }}>
                                All Institutions
                            </Text>
                        </TouchableOpacity>
                        {institutions.map((inst) => (
                            <TouchableOpacity
                                key={inst.id}
                                onPress={() => setInstitutionFilter(inst.id)}
                                style={{
                                    marginRight: 8,
                                    marginBottom: 8,
                                    borderRadius: 10,
                                    paddingHorizontal: 10,
                                    paddingVertical: 7,
                                    backgroundColor: institutionFilter === inst.id ? colors.primary : colors.inputBg,
                                    borderWidth: 1,
                                    borderColor: institutionFilter === inst.id ? colors.primary : colors.border,
                                }}
                            >
                                <Text style={{ color: institutionFilter === inst.id ? '#FFF' : colors.subtext, fontSize: 12, fontWeight: '700' }}>
                                    {inst.name}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            )}

            {loading ? (
                <View style={{ paddingHorizontal: 16, paddingBottom: 24 }}>
                    <ListItemSkeleton loading={loading} count={8} label="Loading users..." />
                </View>
            ) : (
                <FlatList
                    data={groupedSections}
                    keyExtractor={(item) => item.key}
                    renderItem={renderSection}
                    contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }}
                    showsVerticalScrollIndicator={false}
                    onEndReached={loadMore}
                    onEndReachedThreshold={0.3}
                    ListFooterComponent={loadingMore ? (
                        <View style={{ paddingTop: 6, paddingBottom: 14 }}>
                            <ListItemSkeleton loading={loadingMore} count={1} label="Loading more users..." />
                        </View>
                    ) : null}
                    ListEmptyComponent={
                        <View style={{ alignItems: 'center', marginTop: 80 }}>
                            <MaterialCommunityIcons name="account-off-outline" size={52} color={colors.border} />
                            <Text style={{ color: colors.subtext, marginTop: 10 }}>No users match current filters</Text>
                        </View>
                    }
                />
            )}

            <Modal visible={editVisible} transparent animationType="fade" onRequestClose={closeEdit}>
                <View style={{
                    flex: 1,
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingHorizontal: 16,
                }}>
                    <View style={{
                        width: '100%',
                        maxWidth: 520,
                        backgroundColor: colors.cardBg,
                        borderColor: colors.border,
                        borderWidth: 1,
                        borderRadius: 14,
                        padding: 16,
                    }}>
                        <Text style={{ color: colors.text, fontWeight: '800', fontSize: 18, marginBottom: 10 }}>
                            Manage User
                        </Text>

                        <Text style={{ color: colors.subtext, fontSize: 12, marginBottom: 6 }}>First Name</Text>
                        <TextInput
                            value={editFirstName}
                            onChangeText={setEditFirstName}
                            placeholder="First name"
                            placeholderTextColor={colors.subtext}
                            style={{
                                color: colors.text,
                                borderColor: colors.border,
                                borderWidth: 1,
                                borderRadius: 10,
                                paddingHorizontal: 10,
                                paddingVertical: 10,
                                marginBottom: 10,
                                backgroundColor: colors.inputBg,
                            }}
                        />

                        <Text style={{ color: colors.subtext, fontSize: 12, marginBottom: 6 }}>Last Name</Text>
                        <TextInput
                            value={editLastName}
                            onChangeText={setEditLastName}
                            placeholder="Last name"
                            placeholderTextColor={colors.subtext}
                            style={{
                                color: colors.text,
                                borderColor: colors.border,
                                borderWidth: 1,
                                borderRadius: 10,
                                paddingHorizontal: 10,
                                paddingVertical: 10,
                                marginBottom: 10,
                                backgroundColor: colors.inputBg,
                            }}
                        />

                        <Text style={{ color: colors.subtext, fontSize: 12, marginBottom: 6 }}>Email</Text>
                        <TextInput
                            value={editEmail}
                            onChangeText={setEditEmail}
                            placeholder="Email address"
                            placeholderTextColor={colors.subtext}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            style={{
                                color: colors.text,
                                borderColor: colors.border,
                                borderWidth: 1,
                                borderRadius: 10,
                                paddingHorizontal: 10,
                                paddingVertical: 10,
                                marginBottom: 10,
                                backgroundColor: colors.inputBg,
                            }}
                        />

                        <Text style={{ color: colors.subtext, fontSize: 12, marginBottom: 6 }}>Phone</Text>
                        <TextInput
                            value={editPhone}
                            onChangeText={setEditPhone}
                            placeholder="Phone number"
                            placeholderTextColor={colors.subtext}
                            style={{
                                color: colors.text,
                                borderColor: colors.border,
                                borderWidth: 1,
                                borderRadius: 10,
                                paddingHorizontal: 10,
                                paddingVertical: 10,
                                marginBottom: 10,
                                backgroundColor: colors.inputBg,
                            }}
                        />

                        <Text style={{ color: colors.subtext, fontSize: 12, marginBottom: 6 }}>Role</Text>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 10 }}>
                            {ROLE_OPTIONS.filter((r) => r !== 'all').map((r) => {
                                const active = editRole === r;
                                return (
                                    <TouchableOpacity
                                        key={`edit-${r}`}
                                        onPress={() => setEditRole(r)}
                                        style={{
                                            marginRight: 8,
                                            marginBottom: 8,
                                            borderRadius: 10,
                                            paddingHorizontal: 10,
                                            paddingVertical: 7,
                                            backgroundColor: active ? colors.primary : colors.inputBg,
                                            borderWidth: 1,
                                            borderColor: active ? colors.primary : colors.border,
                                        }}
                                    >
                                        <Text style={{ color: active ? '#FFF' : colors.subtext, fontSize: 12, fontWeight: '700' }}>
                                            {roleLabel(r)}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        <Text style={{ color: colors.subtext, fontSize: 12, marginBottom: 6 }}>Institution</Text>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 14 }}>
                            <TouchableOpacity
                                onPress={() => setEditInstitution('none')}
                                style={{
                                    marginRight: 8,
                                    marginBottom: 8,
                                    borderRadius: 10,
                                    paddingHorizontal: 10,
                                    paddingVertical: 7,
                                    backgroundColor: editInstitution === 'none' ? colors.primary : colors.inputBg,
                                    borderWidth: 1,
                                    borderColor: editInstitution === 'none' ? colors.primary : colors.border,
                                }}
                            >
                                <Text style={{ color: editInstitution === 'none' ? '#FFF' : colors.subtext, fontSize: 12, fontWeight: '700' }}>
                                    No Institution
                                </Text>
                            </TouchableOpacity>
                            {institutions.map((inst) => (
                                <TouchableOpacity
                                    key={`edit-inst-${inst.id}`}
                                    onPress={() => setEditInstitution(inst.id)}
                                    style={{
                                        marginRight: 8,
                                        marginBottom: 8,
                                        borderRadius: 10,
                                        paddingHorizontal: 10,
                                        paddingVertical: 7,
                                        backgroundColor: editInstitution === inst.id ? colors.primary : colors.inputBg,
                                        borderWidth: 1,
                                        borderColor: editInstitution === inst.id ? colors.primary : colors.border,
                                    }}
                                >
                                    <Text style={{ color: editInstitution === inst.id ? '#FFF' : colors.subtext, fontSize: 12, fontWeight: '700' }}>
                                        {inst.name}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {(editingUser && platformRoles.has(editingUser.canonical_role || editingUser.role)) && (
                            <TouchableOpacity
                                onPress={requestDeleteMasterAdmin}
                                disabled={savingEdit || deletingUser}
                                style={{
                                    borderWidth: 1,
                                    borderColor: '#EF4444',
                                    borderRadius: 10,
                                    paddingHorizontal: 14,
                                    paddingVertical: 10,
                                    marginBottom: 12,
                                    backgroundColor: isDark ? 'rgba(239,68,68,0.14)' : '#FEE2E2',
                                    alignItems: 'center',
                                }}
                            >
                                <Text style={{ color: '#B91C1C', fontWeight: '800' }}>Delete Master Admin</Text>
                            </TouchableOpacity>
                        )}

                        <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
                            <TouchableOpacity
                                onPress={closeEdit}
                                disabled={savingEdit || deletingUser}
                                style={{
                                    borderWidth: 1,
                                    borderColor: colors.border,
                                    borderRadius: 10,
                                    paddingHorizontal: 14,
                                    paddingVertical: 10,
                                    marginRight: 8,
                                    backgroundColor: colors.inputBg,
                                }}
                            >
                                <Text style={{ color: colors.subtext, fontWeight: '700' }}>Cancel</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={saveEdit}
                                disabled={savingEdit || deletingUser}
                                style={{
                                    borderWidth: 1,
                                    borderColor: colors.primary,
                                    borderRadius: 10,
                                    paddingHorizontal: 14,
                                    paddingVertical: 10,
                                    backgroundColor: colors.primary,
                                    minWidth: 96,
                                    alignItems: 'center',
                                }}
                            >
                                {savingEdit ? (
                                    <ActivityIndicator size="small" color="#FFF" />
                                ) : (
                                    <Text style={{ color: '#FFF', fontWeight: '800' }}>Save</Text>
                                )}
                            </TouchableOpacity>
                        </View>

                        {showDeleteConfirm && (
                            <View style={{
                                marginTop: 14,
                                borderWidth: 1,
                                borderColor: isDark ? '#7F1D1D' : '#FCA5A5',
                                backgroundColor: isDark ? 'rgba(127,29,29,0.25)' : '#FEF2F2',
                                borderRadius: 12,
                                padding: 12,
                            }}>
                                <Text style={{ color: colors.text, fontWeight: '800', marginBottom: 6 }}>Confirm Delete</Text>
                                <Text style={{ color: colors.subtext, fontSize: 12, marginBottom: 10 }}>
                                    This action will permanently delete this Master Admin account. This cannot be undone.
                                </Text>

                                <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
                                    <TouchableOpacity
                                        onPress={cancelDeleteMasterAdmin}
                                        disabled={deletingUser}
                                        style={{
                                            borderWidth: 1,
                                            borderColor: colors.border,
                                            borderRadius: 10,
                                            paddingHorizontal: 12,
                                            paddingVertical: 8,
                                            marginRight: 8,
                                            backgroundColor: colors.inputBg,
                                        }}
                                    >
                                        <Text style={{ color: colors.subtext, fontWeight: '700' }}>Cancel</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        onPress={confirmDeleteMasterAdmin}
                                        disabled={deletingUser}
                                        style={{
                                            borderWidth: 1,
                                            borderColor: '#DC2626',
                                            borderRadius: 10,
                                            paddingHorizontal: 12,
                                            paddingVertical: 8,
                                            backgroundColor: '#DC2626',
                                            minWidth: 88,
                                            alignItems: 'center',
                                        }}
                                    >
                                        {deletingUser ? (
                                            <ActivityIndicator size="small" color="#FFF" />
                                        ) : (
                                            <Text style={{ color: '#FFF', fontWeight: '800' }}>Delete</Text>
                                        )}
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}
                    </View>
                </View>
            </Modal>

            {/* Credential Reset Confirmation Modal */}
            <Modal
                visible={showResetModal}
                transparent
                animationType="fade"
                onRequestClose={closeCredentialReset}
            >
                <View style={{
                    flex: 1,
                    backgroundColor: 'rgba(0,0,0,0.6)',
                    justifyContent: 'center',
                    alignItems: 'center',
                    padding: 16,
                }}>
                    <View style={{
                        backgroundColor: colors.cardBg,
                        borderColor: colors.border,
                        borderWidth: 1,
                        borderRadius: 16,
                        padding: 20,
                        width: '100%',
                        maxWidth: 440,
                    }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                            <View style={{ backgroundColor: '#FEE2E2', padding: 8, borderRadius: 10, marginRight: 10 }}>
                                <MaterialCommunityIcons name="lock-reset" size={24} color="#DC2626" />
                            </View>
                            <Text style={{ color: colors.text, fontWeight: '800', fontSize: 18 }}>
                                Confirm Credential Reset
                            </Text>
                        </View>

                        {!!resettingUser && (
                            <View style={{
                                backgroundColor: colors.inputBg,
                                borderColor: colors.border,
                                borderWidth: 1,
                                borderRadius: 10,
                                padding: 12,
                                marginBottom: 14,
                            }}>
                                <Text style={{ color: colors.text, fontWeight: '700', fontSize: 14 }}>
                                    {`${resettingUser.first_name || ''} ${resettingUser.last_name || ''}`.trim() || 'User'}
                                </Text>
                                <Text style={{ color: colors.subtext, fontSize: 12, marginTop: 2 }}>
                                    Email: {resettingUser.email || 'N/A'}
                                </Text>
                                <Text style={{ color: colors.subtext, fontSize: 12, marginTop: 2 }}>
                                    Role: {roleLabel(resettingUser.canonical_role || resettingUser.role)}
                                </Text>
                                <Text style={{ color: colors.subtext, fontSize: 12, marginTop: 2 }}>
                                    Institution: {resettingUser.institutions?.name || 'Unassigned'}
                                </Text>
                            </View>
                        )}

                        <View style={{
                            backgroundColor: isDark ? 'rgba(239,68,68,0.12)' : '#FEF2F2',
                            borderColor: '#FCA5A5',
                            borderWidth: 1,
                            borderRadius: 10,
                            padding: 12,
                            marginBottom: 16,
                        }}>
                            <Text style={{ color: '#B91C1C', fontWeight: '700', fontSize: 13, marginBottom: 4 }}>
                                Security Action Notice
                            </Text>
                            <Text style={{ color: isDark ? '#FCA5A5' : '#991B1B', fontSize: 12, lineHeight: 18 }}>
                                Confirming will <Text style={{ fontWeight: '800' }}>immediately invalidate</Text> this user's current password and <Text style={{ fontWeight: '800' }}>synchronously revoke all active sessions</Text>. The user must complete standard OTP verification to regain access.
                            </Text>
                        </View>

                        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10 }}>
                            <TouchableOpacity
                                onPress={closeCredentialReset}
                                disabled={resettingLoading}
                                style={{
                                    borderWidth: 1,
                                    borderColor: colors.border,
                                    borderRadius: 10,
                                    paddingHorizontal: 14,
                                    paddingVertical: 10,
                                    backgroundColor: colors.inputBg,
                                }}
                            >
                                <Text style={{ color: colors.subtext, fontWeight: '700' }}>Cancel</Text>
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
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}
