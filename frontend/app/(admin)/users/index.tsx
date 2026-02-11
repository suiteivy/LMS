import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, ActivityIndicator, Alert, Platform } from 'react-native';
import { Stack, useRouter, useLocalSearchParams, Href } from 'expo-router';
import { supabase } from '@/libs/supabase';
import { Ionicons } from '@expo/vector-icons';
import { User } from '@/types/types'; // Your User type
import { UserCard } from '@/components/common/UserCard'; // Assuming you have this
import { useSchool } from '@/contexts/SchoolContext'; // If needed for school context

export default function UsersManagementScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState<'all' | 'student' | 'teacher' | 'admin'>('all');

    // Check if we need to open create modal immediately (optional feature based on params)
    useEffect(() => {
        if (params.action === 'create') {
            // Logic to open create modal or navigate to create screen
            // For now, let's just log or set a state
            console.log("Create action triggered");
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
                    *,
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
                    const getRoleId = (roleData: any) => {
                        if (!roleData) return null;
                        if (Array.isArray(roleData)) return roleData[0]?.id || null;
                        return roleData.id || null;
                    };

                    let displayId = u.id;
                    const roleId = getRoleId(u[`${u.role}s`]);
                    if (roleId) displayId = roleId;

                    return {
                        id: u.id,
                        displayId,
                        name: u.full_name,
                        email: u.email,
                        role: u.role,
                        status: u.status,
                        joinDate: u.created_at,
                    } as User;
                });
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
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (user.displayId && user.displayId.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const handleUserPress = (user: User) => {
        // Navigate to user details
        router.push(`/(admin)/users/${user.id}` as Href);
    };

    return (
        <View className="flex-1 bg-gray-50">
            {/* Header */}
            <View className="bg-white px-6 pt-12 pb-4 border-b border-gray-100">
                <View className="flex-row justify-between items-center mb-4">
                    <Text className="text-2xl font-bold text-gray-900">User Management</Text>
                    <TouchableOpacity
                        onPress={() => router.push('/(admin)/users/create')} // Assume create route
                        className="w-10 h-10 bg-black rounded-full items-center justify-center"
                    >
                        <Ionicons name="add" size={24} color="white" />
                    </TouchableOpacity>
                </View>

                {/* Search Bar */}
                <View className="flex-row items-center bg-gray-100 rounded-xl px-4 py-3 mb-4">
                    <Ionicons name="search" size={20} color="#9CA3AF" />
                    <TextInput
                        className="flex-1 ml-2 text-gray-900 font-medium"
                        placeholder="Search by name, email, or ID..."
                        value={searchQuery}
                        onChangeText={handleSearch}
                    />
                </View>

                {/* Filter Tabs */}
                <View className="flex-row space-x-2 gap-2">
                    {(['all', 'student', 'teacher', 'admin'] as const).map((filter) => (
                        <TouchableOpacity
                            key={filter}
                            onPress={() => setActiveFilter(filter)}
                            className={`px-4 py-2 rounded-full border ${activeFilter === filter
                                ? 'bg-black border-black'
                                : 'bg-white border-gray-200'
                                }`}
                        >
                            <Text className={`font-medium capitalize ${activeFilter === filter ? 'text-white' : 'text-gray-600'
                                }`}>
                                {filter}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            {/* User List */}
            {loading ? (
                <View className="flex-1 justify-center items-center">
                    <ActivityIndicator size="large" color="black" />
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
                        <View className="items-center py-20">
                            <Ionicons name="people-outline" size={48} color="#9CA3AF" />
                            <Text className="text-gray-500 mt-4">No users found</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
}
