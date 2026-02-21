import { EmptyState } from '@/components/common/EmptyState';
import { UnifiedHeader } from "@/components/common/UnifiedHeader";
import { UserCard } from '@/components/common/UserCard';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/libs/supabase';
import { User } from '@/types/types';
import { Ionicons } from '@expo/vector-icons';
import { Href, router, useLocalSearchParams } from 'expo-router';
import { Users } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
export default function UsersManagementScreen() {
    const params = useLocalSearchParams();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState<'all' | 'student' | 'teacher' | 'admin'>('all');
    const { isDark } = useTheme();
    // Check if we need to open create modal immediately (optional feature based on params)
    useEffect(() => {
        if (params.action === 'create') {
            // Logic to open create modal or navigate to create screen
            // For now, let's just log or set a state
            // console.log("Create action triggered");
        }
    }, [params]);
    useEffect(() => {
        fetchUsers();
    }, [activeFilter]);
    const fetchUsers = async () => {
        try {
            setLoading(true);
            let query = supabase
                .from('users')
                .select(`
                    id, 
                    full_name, 
                    email, 
                    role, 
                    created_at,
                    students (id),
                    teachers (id),
                    admins (id),
                    parents (id)
                `)
                .order('created_at', { ascending: false });
            if (activeFilter !== 'all') {
                query = query.eq('role', activeFilter);
            }
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
                        // Use explicit checks instead of dynamic string construction
                        // This is safer and prevents crashes if 'role' is unexpected
                        if (u.role === 'student') displayId = getRoleId(u.students);
                        else if (u.role === 'teacher') displayId = getRoleId(u.teachers);
                        else if (u.role === 'admin') displayId = getRoleId(u.admins);
                        else if (u.role === 'parent') displayId = getRoleId(u.parents);

                        return {
                            id: u.id,
                            displayId,
                            name: u.full_name || 'Unknown User',
                            email: u.email || 'No Email',
                            role: u.role || 'user',
                            joinDate: u.created_at || new Date().toISOString()
                        } as User;
                    } catch (err) {
                        console.warn('Error formatting user:', u.id, err);
                        return null;
                    }
                }).filter((u): u is User => u !== null);

                setUsers(formattedUsers);
            }
        } catch (error: any) {
            Alert.alert('Error', error.message);
        } finally {
            setLoading(false);
        }
    };
    const handleSearch = (text: string) => {
        setSearchQuery(text);
        // Simple client-side filtering for now since list won't be massive initially
        // Ideally should debounce and search on server
    };
    const filteredUsers = users.filter(user =>
        (user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
        (user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
        (user.displayId?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
    );
    const handleUserPress = (user: User) => {
        // Navigate to user details
        router.push(`/(admin)/users/${user.id}` as Href);
    };
    return (
        <View className="flex-1 bg-white dark:bg-black">
            <UnifiedHeader
                title="Management"
                subtitle="User Statistics"
                role="Admin"
                onBack={() => router.back()}
            />

            {/* Sub-header with Search & Filters */}
            <View className="px-6 py-4 border-b border-gray-50">
                {/* Search Bar & Add Button */}
                <View className="flex-row items-center gap-3 mb-6 ">
                    <View style={{
                        flex: 1, flexDirection: 'row', alignItems: 'center',
                        backgroundColor: isDark ? '#242424' : '#f9fafb',
                        borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12,
                        borderWidth: 1, borderColor: isDark ? '#2c2c2c' : '#f3f4f6',
                    }}>
                        <Ionicons name="search" size={20} color={isDark ? "#9CA3AF" : "#6B7280"} />
                        <TextInput
                            style={{ flex: 1, marginLeft: 8, color: isDark ? '#f1f1f1' : '#111827', fontWeight: '600', fontSize: 13 }}
                            placeholder="Search by name, email, or ID..."
                            placeholderTextColor="#9CA3AF"
                            value={searchQuery}
                            onChangeText={handleSearch}
                        />
                    </View>
                    <TouchableOpacity
                        onPress={() => router.push('/(admin)/users/create')}
                        className="w-12 h-12 bg-[#FF6900] rounded-2xl items-center justify-center shadow-lg shadow-orange-100"
                    >
                        <Ionicons name="add" size={28} color="white" />
                    </TouchableOpacity>
                </View>

                {/* Filter Tabs */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    className="flex-row"
                    contentContainerStyle={{ gap: 8 }}
                >
                    {(['all', 'student', 'teacher', 'admin'] as const).map((filter) => (
                        <TouchableOpacity
                            key={filter}
                            onPress={() => setActiveFilter(filter)}
                            style={{
                                paddingHorizontal: 24,
                                paddingVertical: 16,
                                borderRadius: 16,
                                borderBottomWidth: 1,
                                borderBottomColor: isDark ? '#2c2c2c' : '#f9fafb',
                                borderBottomLeftRadius: 16,
                                borderBottomRightRadius: 16,
                                backgroundColor: activeFilter === filter
                                    ? (isDark ? '#f1f1f1' : '#111827')
                                    : (isDark ? '#1e1e1e' : '#ffffff'),
                                borderColor: activeFilter === filter
                                    ? (isDark ? '#f1f1f1' : '#111827')
                                    : (isDark ? '#2c2c2c' : '#f3f4f6'),
                            }}
                        >
                            <Text style={{
                                fontWeight: '600',
                                fontSize: 12,
                                textTransform: 'capitalize',
                                color: activeFilter === filter
                                    ? (isDark ? '#111827' : '#ffffff')
                                    : (isDark ? '#9ca3af' : '#6b7280'),
                            }}>
                                {filter}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>
            {/* User List */}
            {loading ? (
                <View className="flex-1 justify-center items-center">
                    <ActivityIndicator size="large" color={isDark ? "#f1f1f1" : "#111827"} />
                </View>
            ) : (
                <FlatList
                    data={filteredUsers}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
                    numColumns={Platform.OS === 'web' ? 3 : 1}
                    key={Platform.OS === 'web' ? 'web-grid' : 'mobile-list'}
                    columnWrapperStyle={Platform.OS === 'web' ? { gap: 16 } : undefined}
                    renderItem={({ item }) => (
                        <View style={Platform.OS === 'web' ? { width: '31.5%' } : { width: '100%' }}>
                            <UserCard
                                user={item}
                                onPress={handleUserPress}
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
        </View>
    );
}
