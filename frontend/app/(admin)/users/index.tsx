import { EmptyState } from '@/components/common/EmptyState';
import { UnifiedHeader } from "@/components/common/UnifiedHeader";
import { UserCard } from '@/components/common/UserCard';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/libs/supabase';
import { User } from '@/types/types';
import { Ionicons } from '@expo/vector-icons';
import { Href, router, useLocalSearchParams } from 'expo-router';
import { Users } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator, Alert, FlatList, Platform,
    ScrollView, Text, TextInput, TouchableOpacity, View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function UsersManagementScreen() {
    const params = useLocalSearchParams();
    const { isDark } = useTheme();
    const insets = useSafeAreaInsets();

    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState<'all' | 'student' | 'teacher' | 'admin'>('all');

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

            // Guard: every admin must belong to an institution
            if (!profile?.institution_id) {
                console.warn('[UsersManagement] No institution_id on session — aborting fetch');
                setUsers([]);
                return;
            }

            let query = supabase
                .from('users')
                .select(`id, full_name, first_name, last_name, email, role, created_at, students(id), teachers(id), admins(id), parents(id)`)
                .eq('institution_id', profile.institution_id)   // ← scope to this institution only
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

    // Sanitize search input   no dangerous chars
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
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" color={isDark ? '#f9fafb' : '#111827'} />
                </View>
            ) : (
                <FlatList
                    data={filteredUsers}
                    keyExtractor={item => item.id}
                    contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24 }}
                    numColumns={Platform.OS === 'web' ? 3 : 1}
                    key={Platform.OS === 'web' ? 'web-grid' : 'mobile-list'}
                    columnWrapperStyle={Platform.OS === 'web' ? { gap: 16 } : undefined}
                    renderItem={({ item }) => (
                        <View style={Platform.OS === 'web' ? { width: '31.5%' } : { width: '100%' }}>
                            <UserCard user={item} onPress={u => router.push(`/(admin)/users/${u.id}` as Href)} />
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
        </View>
    );
}
