import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
    View, Text, FlatList, TouchableOpacity, ActivityIndicator,
    TextInput, ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/libs/supabase';
import Toast from 'react-native-toast-message';

type UserItem = {
    id: string;
    full_name: string | null;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    role: string;
    status: string | null;
    created_at: string;
    institution_id: string | null;
    institutions: { name: string } | null;
};

const ROLES = ['all', 'student', 'teacher', 'admin', 'parent', 'bursary', 'master_admin'] as const;
type RoleFilter = typeof ROLES[number];

const ROLE_COLORS: Record<string, string> = {
    student: '#3B82F6',
    teacher: '#10B981',
    admin: '#F59E0B',
    parent: '#8B5CF6',
    bursary: '#EC4899',
    master_admin: '#FF6B00',
};

const ROLE_ICONS: Record<string, string> = {
    student: 'school-outline',
    teacher: 'human-male-board',
    admin: 'shield-account',
    parent: 'account-heart',
    bursary: 'currency-usd',
    master_admin: 'crown',
};

const PAGE_SIZE = 30;

// Backend base URL — no trailing /api suffix, we add it per-call
const getBackendUrl = () => process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4001';

export default function MasterAdminUsersScreen() {
    const { isDark } = useTheme();

    const [users, setUsers] = useState<UserItem[]>([]);
    const [institutions, setInstitutions] = useState<{ id: string; name: string }[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
    const [institutionFilter, setInstitutionFilter] = useState<string>('all');
    const [categoryFilter, setCategoryFilter] = useState<string>('all');
    const [showFilters, setShowFilters] = useState(false);
    const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);

    // Use a ref for page to avoid it being a dep in useCallback (prevents infinite loop)
    const pageRef = useRef(1);
    const isFetchingRef = useRef(false);

    const themeColors = {
        bg: isDark ? '#0F0B2E' : '#f8fafc',
        card: isDark ? '#13103A' : '#ffffff',
        text: isDark ? '#ffffff' : '#111827',
        subtext: isDark ? '#94a3b8' : '#6b7280',
        border: isDark ? 'rgba(255,255,255,0.07)' : '#e5e7eb',
        inputBg: isDark ? '#1a1645' : '#f9fafb',
        primary: '#FF6B00',
    };

    const fetchInstitutions = async () => {
        const { data } = await supabase
            .from('institutions')
            .select('id, name')
            .order('name');
        setInstitutions(data || []);
    };

    const fetchCategories = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;
            
            const res = await fetch(`${getBackendUrl()}/api/master-admin/school-categories`, {
                headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                    'Accept': 'application/json',
                }
            });
            const data = await res.json();
            if (res.ok) setCategories(data || []);
        } catch (err) {
            console.error('fetchCategories error:', err);
        }
    };

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
                isFetchingRef.current = false;
                return;
            }

            const params = new URLSearchParams({
                page: currentPage.toString(),
                limit: PAGE_SIZE.toString(),
            });
            if (roleFilter !== 'all') params.append('role', roleFilter);
            if (institutionFilter !== 'all') params.append('institution_id', institutionFilter);
            if (categoryFilter !== 'all') params.append('category_id', categoryFilter);
            if (search.trim()) params.append('search', search.trim());

            const res = await fetch(`${getBackendUrl()}/api/master-admin/users?${params}`, {
                headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                    'Accept': 'application/json',
                }
            });

            const text = await res.text();
            let data: any;
            try {
                data = JSON.parse(text);
            } catch {
                console.error('Non-JSON response from server:', text.slice(0, 200));
                Toast.show({ type: 'error', text1: 'Server Error', text2: 'Invalid response from server' });
                return;
            }

            if (res.ok) {
                const newUsers: UserItem[] = data.users || [];
                setUsers(prev => {
                    const combined = reset ? newUsers : [...prev, ...newUsers];
                    // Deduplicate by ID to prevent "duplicate key" warnings
                    return combined.filter((u, index, self) => 
                        index === self.findIndex((t) => t.id === u.id)
                    );
                });
                const more = newUsers.length === PAGE_SIZE;
                setHasMore(more);
                if (!reset && more) pageRef.current = currentPage + 1;
            } else {
                Toast.show({ type: 'error', text1: 'Error', text2: data.error || 'Failed to fetch users' });
            }
        } catch (err) {
            console.error('fetchUsers error:', err);
            Toast.show({ type: 'error', text1: 'Network Error', text2: 'Could not reach server' });
        } finally {
            setLoading(false);
            setLoadingMore(false);
            isFetchingRef.current = false;
        }
    }, [roleFilter, institutionFilter, search]);  // ← page NOT in deps

    useEffect(() => {
        fetchInstitutions();
        fetchCategories();
    }, []);

    useEffect(() => {
        fetchUsers(true);
    }, [roleFilter, institutionFilter, categoryFilter]);  // only reset on filter changes

    const handleSearch = () => fetchUsers(true);
    const handleLoadMore = () => { if (hasMore && !loadingMore && !loading) fetchUsers(false); };
    const toggleFilters = () => setShowFilters(!showFilters);

    const renderUser = ({ item }: { item: UserItem }) => {
        const roleColor = ROLE_COLORS[item.role] || '#6B7280';
        const roleIcon = ROLE_ICONS[item.role] || 'account';
        const displayName = item.full_name || `${item.first_name || ''} ${item.last_name || ''}`.trim() || 'Unknown';
        const initials = displayName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
        const joinDate = new Date(item.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

        return (
            <View style={{
                backgroundColor: themeColors.card,
                borderRadius: 16, padding: 16, marginBottom: 10,
                borderWidth: 1, borderColor: themeColors.border,
                flexDirection: 'row', alignItems: 'center', gap: 14,
            }}>
                <View style={{
                    width: 48, height: 48, borderRadius: 24,
                    backgroundColor: `${roleColor}20`,
                    alignItems: 'center', justifyContent: 'center',
                    borderWidth: 2, borderColor: `${roleColor}40`,
                }}>
                    <Text style={{ color: roleColor, fontWeight: '800', fontSize: 16 }}>{initials}</Text>
                </View>

                <View style={{ flex: 1 }}>
                    <Text style={{ color: themeColors.text, fontWeight: '700', fontSize: 15 }} numberOfLines={1}>
                        {displayName}
                    </Text>
                    <Text style={{ color: themeColors.subtext, fontSize: 12, marginTop: 2 }} numberOfLines={1}>
                        {item.email || 'No email'}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                        <View style={{
                            flexDirection: 'row', alignItems: 'center', gap: 4,
                            backgroundColor: `${roleColor}15`,
                            paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
                        }}>
                            <MaterialCommunityIcons name={roleIcon as any} size={12} color={roleColor} />
                            <Text style={{ color: roleColor, fontSize: 11, fontWeight: '700', textTransform: 'capitalize' }}>
                                {item.role.replace('_', ' ')}
                            </Text>
                        </View>
                        {item.institutions?.name && (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                <MaterialCommunityIcons name="office-building" size={11} color={themeColors.subtext} />
                                <Text style={{ color: themeColors.subtext, fontSize: 11 }} numberOfLines={1}>
                                    {item.institutions.name}
                                </Text>
                            </View>
                        )}
                    </View>
                </View>

                <View style={{ alignItems: 'flex-end', gap: 6 }}>
                    <Text style={{ color: themeColors.subtext, fontSize: 11 }}>{joinDate}</Text>
                    <View style={{
                        backgroundColor: item.status === 'approved' ? '#D1FAE5' : '#FEF3C7',
                        paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6
                    }}>
                        <Text style={{
                            fontSize: 10, fontWeight: '700',
                            color: item.status === 'approved' ? '#065F46' : '#92400E',
                            textTransform: 'uppercase'
                        }}>
                            {item.status || 'active'}
                        </Text>
                    </View>
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: themeColors.bg }} edges={['top', 'left', 'right']}>
            {/* Header */}
            <View style={{
                paddingHorizontal: 20, paddingTop: 10, paddingBottom: 16,
                flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'
            }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View style={{ backgroundColor: `${themeColors.primary}20`, padding: 8, borderRadius: 10 }}>
                        <MaterialCommunityIcons name="account-group" size={24} color={themeColors.primary} />
                    </View>
                    <View>
                        <Text style={{ fontSize: 22, fontWeight: '800', color: themeColors.text }}>All Users</Text>
                        <Text style={{ fontSize: 13, color: themeColors.subtext }}>
                            {loading ? 'Loading...' : `${users.length} user${users.length !== 1 ? 's' : ''} loaded`}
                        </Text>
                    </View>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <TouchableOpacity 
                        onPress={toggleFilters}
                        style={{ 
                            backgroundColor: showFilters ? themeColors.primary : `${themeColors.primary}15`,
                            padding: 8, borderRadius: 10,
                            borderWidth: 1, borderColor: showFilters ? themeColors.primary : `${themeColors.primary}40`
                        }}
                    >
                        <MaterialCommunityIcons 
                            name={showFilters ? "filter-variant-remove" : "filter-variant"} 
                            size={22} 
                            color={showFilters ? "#fff" : themeColors.primary} 
                        />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => fetchUsers(true)}>
                        <MaterialCommunityIcons name="refresh" size={24} color={themeColors.text} />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Collapsible Filter Panel */}
            {showFilters && (
                <View style={{ 
                    backgroundColor: themeColors.card, 
                    marginHorizontal: 20, 
                    marginBottom: 16, 
                    borderRadius: 16, 
                    padding: 16,
                    borderWidth: 1,
                    borderColor: themeColors.border,
                    boxShadow: [{ offsetX: 0, offsetY: 4, blurRadius: 12, color: 'rgba(0, 0, 0, 0.1)' }],
                    elevation: 4
                }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <Text style={{ color: themeColors.text, fontWeight: '700', fontSize: 14 }}>Advanced Filters</Text>
                        <TouchableOpacity onPress={toggleFilters}>
                            <Text style={{ color: themeColors.primary, fontSize: 12, fontWeight: '600' }}>Close</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Role Selection */}
                    <Text style={{ color: themeColors.subtext, fontSize: 11, fontWeight: '700', marginBottom: 10, textTransform: 'uppercase' }}>Filter by Role</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                        {ROLES.map(role => {
                            const active = roleFilter === role;
                            const color = role === 'all' ? themeColors.primary : (ROLE_COLORS[role] || '#6B7280');
                            return (
                                <TouchableOpacity key={role} onPress={() => setRoleFilter(role)} style={{
                                    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12,
                                    backgroundColor: active ? color : `${color}15`,
                                    borderWidth: 1, borderColor: active ? color : `${color}30`,
                                    minWidth: 80, alignItems: 'center'
                                }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                        {role !== 'all' && <MaterialCommunityIcons name={ROLE_ICONS[role] as any} size={14} color={active ? '#fff' : color} />}
                                        <Text style={{ color: active ? '#fff' : color, fontWeight: '700', fontSize: 12, textTransform: 'capitalize' }}>
                                            {role === 'all' ? 'All Roles' : role.replace('_', ' ')}
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    {/* Category Selection */}
                    <Text style={{ color: themeColors.subtext, fontSize: 11, fontWeight: '700', marginBottom: 10, textTransform: 'uppercase', marginTop: 4 }}>School Category</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                        <TouchableOpacity onPress={() => setCategoryFilter('all')} style={{
                            paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12,
                            backgroundColor: categoryFilter === 'all' ? themeColors.primary : themeColors.inputBg,
                            borderWidth: 1, borderColor: categoryFilter === 'all' ? themeColors.primary : themeColors.border,
                        }}>
                            <Text style={{ color: categoryFilter === 'all' ? '#fff' : themeColors.subtext, fontSize: 12, fontWeight: '700' }}>All Categories</Text>
                        </TouchableOpacity>
                        {categories.map(cat => (
                            <TouchableOpacity key={cat.id} onPress={() => setCategoryFilter(cat.id)} style={{
                                paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12,
                                backgroundColor: categoryFilter === cat.id ? themeColors.primary : themeColors.inputBg,
                                borderWidth: 1, borderColor: categoryFilter === cat.id ? themeColors.primary : themeColors.border,
                            }}>
                                <Text style={{ color: categoryFilter === cat.id ? '#fff' : themeColors.subtext, fontSize: 12, fontWeight: '700' }}>{cat.name}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Institution Selection */}
                    <Text style={{ color: themeColors.subtext, fontSize: 11, fontWeight: '700', marginBottom: 10, textTransform: 'uppercase', marginTop: 4 }}>Institution</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                        <TouchableOpacity onPress={() => setInstitutionFilter('all')} style={{
                            paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12,
                            backgroundColor: institutionFilter === 'all' ? themeColors.primary : themeColors.inputBg,
                            borderWidth: 1, borderColor: institutionFilter === 'all' ? themeColors.primary : themeColors.border,
                        }}>
                            <Text style={{ color: institutionFilter === 'all' ? '#fff' : themeColors.subtext, fontSize: 12, fontWeight: '700' }}>All Institutions</Text>
                        </TouchableOpacity>
                        {institutions.slice(0, 10).map(inst => (
                            <TouchableOpacity key={inst.id} onPress={() => setInstitutionFilter(inst.id)} style={{
                                paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12,
                                backgroundColor: institutionFilter === inst.id ? themeColors.primary : themeColors.inputBg,
                                borderWidth: 1, borderColor: institutionFilter === inst.id ? themeColors.primary : themeColors.border,
                            }}>
                                <Text style={{ color: institutionFilter === inst.id ? '#fff' : themeColors.subtext, fontSize: 12, fontWeight: '700' }}>{inst.name}</Text>
                            </TouchableOpacity>
                        ))}
                        {institutions.length > 10 && (
                            <View style={{ padding: 8 }}>
                                <Text style={{ color: themeColors.subtext, fontSize: 10 }}>+ {institutions.length - 10} more</Text>
                            </View>
                        )}
                    </View>
                    
                    <TouchableOpacity 
                        onPress={() => {
                            setRoleFilter('all');
                            setInstitutionFilter('all');
                            setCategoryFilter('all');
                            setSearch('');
                        }}
                        style={{ marginTop: 16, alignItems: 'center', paddingVertical: 8, borderTopWidth: 1, borderTopColor: themeColors.border }}
                    >
                        <Text style={{ color: '#ef4444', fontSize: 12, fontWeight: '700' }}>Reset All Filters</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Search */}
            <View style={{ paddingHorizontal: 20, marginBottom: 12 }}>
                <View style={{
                    flexDirection: 'row', alignItems: 'center', gap: 10,
                    backgroundColor: themeColors.inputBg, borderRadius: 14,
                    paddingHorizontal: 14, paddingVertical: 10,
                    borderWidth: 1, borderColor: themeColors.border,
                }}>
                    <MaterialCommunityIcons name="magnify" size={20} color={themeColors.subtext} />
                    <TextInput
                        style={{ flex: 1, color: themeColors.text, fontSize: 14 }}
                        placeholder="Search by name or email..."
                        placeholderTextColor={themeColors.subtext}
                        value={search}
                        onChangeText={setSearch}
                        onSubmitEditing={handleSearch}
                        returnKeyType="search"
                    />
                    {search.length > 0 && (
                        <TouchableOpacity onPress={() => { setSearch(''); fetchUsers(true); }}>
                            <MaterialCommunityIcons name="close-circle" size={18} color={themeColors.subtext} />
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity
                        onPress={handleSearch}
                        style={{ backgroundColor: themeColors.primary, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 }}
                    >
                        <Text style={{ color: 'white', fontWeight: '700', fontSize: 13 }}>Search</Text>
                    </TouchableOpacity>
                </View>
            </View>


            {/* User List */}
            {loading ? (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" color={themeColors.primary} />
                    <Text style={{ color: themeColors.subtext, marginTop: 12, fontSize: 14 }}>Loading users...</Text>
                </View>
            ) : (
                <FlatList
                    data={users}
                    keyExtractor={item => item.id}
                    renderItem={renderUser}
                    contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
                    onEndReached={handleLoadMore}
                    onEndReachedThreshold={0.4}
                    ListFooterComponent={loadingMore ? (
                        <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                            <ActivityIndicator size="small" color={themeColors.primary} />
                        </View>
                    ) : null}
                    ListEmptyComponent={
                        <View style={{ alignItems: 'center', marginTop: 60 }}>
                            <MaterialCommunityIcons name="account-off-outline" size={56} color={themeColors.border} />
                            <Text style={{ color: themeColors.subtext, marginTop: 16, fontSize: 16, fontWeight: '600' }}>
                                No users found
                            </Text>
                            <Text style={{ color: themeColors.subtext, marginTop: 4, fontSize: 13, textAlign: 'center' }}>
                                Try adjusting your filters or search query.
                            </Text>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
}
