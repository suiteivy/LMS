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
    const bg = isDark ? '#121212' : '#ffffff';
    const card = isDark ? '#1e1e1e' : '#ffffff';
    const border = isDark ? '#2c2c2c' : '#f3f4f6';
    const textPrimary = isDark ? '#f9fafb' : '#111827';
    const textSecondary = isDark ? '#94a3b8' : '#6b7280';
    const inputBg = isDark ? '#1e1e1e' : '#f9fafb';
    const inputBorder = isDark ? '#2c2c2c' : '#f3f4f6';

    const { isDemo } = useAuth();

    useEffect(() => { fetchUsers(); }, [activeFilter, isDemo]);

    const fetchUsers = async () => {
        try {
            setLoading(true);

            if (isDemo) {
                // High-quality mock data for Admin Demo Mode
                const mockUsers: User[] = [
                    { id: 'u1', displayId: 'STU-101', name: 'Emily Davis', email: 'emily@demo.com', role: 'student', joinDate: new Date().toISOString() },
                    { id: 'u2', displayId: 'TEA-001', name: 'John Smith', email: 'john@demo.com', role: 'teacher', joinDate: new Date(Date.now() - 86400000).toISOString() },
                    { id: 'u3', displayId: 'STU-102', name: 'Robert Wilson', email: 'robert@demo.com', role: 'student', joinDate: new Date(Date.now() - 172800000).toISOString() },
                    { id: 'u4', displayId: 'TEA-002', name: 'Sarah Parker', email: 'sarah@demo.com', role: 'teacher', joinDate: new Date(Date.now() - 259200000).toISOString() },
                    { id: 'u5', displayId: 'ADM-001', name: 'Michael Brown', email: 'michael@demo.com', role: 'admin', joinDate: new Date(Date.now() - 345600000).toISOString() },
                    { id: 'u6', displayId: 'PAR-001', name: 'David Jones', email: 'david@demo.com', role: 'parent', joinDate: new Date(Date.now() - 432000000).toISOString() },
                ];

                const filtered = activeFilter === 'all'
                    ? mockUsers
                    : mockUsers.filter(u => u.role === activeFilter);

                setUsers(filtered);
                return;
            }

            let query = supabase
                .from('users')
                .select(`id, full_name, email, role, created_at, students(id), teachers(id), admins(id), parents(id)`)
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
                        return { id: u.id, displayId, name: u.full_name || 'Unknown User', email: u.email || 'No Email', role: u.role || 'user', joinDate: u.created_at || new Date().toISOString() } as User;
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

    // Sanitize search input — no dangerous chars
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
                        style={{ width: 48, height: 48, backgroundColor: '#FF6900', borderRadius: 16, alignItems: 'center', justifyContent: 'center', shadowColor: '#FF6900', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 }}
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
                                style={{
                                    paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12, borderWidth: 1,
                                    backgroundColor: isActive ? (isDark ? '#f9fafb' : '#111827') : (isDark ? '#1e1e1e' : '#ffffff'),
                                    borderColor: isActive ? (isDark ? '#f9fafb' : '#111827') : border,
                                }}
                            >
                                <Text style={{
                                    fontWeight: '600', fontSize: 13, textTransform: 'capitalize',
                                    color: isActive ? (isDark ? '#111827' : '#ffffff') : textSecondary,
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