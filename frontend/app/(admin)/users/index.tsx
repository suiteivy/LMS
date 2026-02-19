import { EmptyState } from '@/components/common/EmptyState';
import { UserCard } from '@/components/common/UserCard';
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
                    const getRoleId = (roleData: any) => {
                        if (Array.isArray(roleData)) return roleData[0]?.id || null;
                        return roleData?.id || null;
                    };
                    let displayId = null;
                    const roleId = getRoleId(u[`${u.role}s`]);
                    if (roleId) displayId = roleId;
                    return {
                        id: u.id,
                        displayId,
                        name: u.full_name,
                        email: u.email,
                        role: u.role,
                        joinDate: u.created_at
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
            <View className="bg-white px-6 pt-6 pb-4 border-b border-gray-100">
                <View className="flex-row justify-between items-center mb-4">
                    <Text className="text-2xl font-bold text-gray-900">User Management</Text>
                    
                </View>
                {/* Search Bar & Add Button */}
                <View className="flex-row items-center gap-3 mb-6">
                    <View className="flex-1 flex-row items-center bg-gray-100 rounded-2xl px-4 py-3">
                        <Ionicons name="search" size={20} color="#9CA3AF" />
                        <TextInput
                            className="flex-1 ml-2 text-gray-900 font-medium"
                            placeholder="Search by name, email, or ID..."
                            value={searchQuery}
                            onChangeText={handleSearch}
                        />
                    </View>
                    <TouchableOpacity
                        onPress={() => router.push('/(admin)/users/create')}
                        className="w-12 h-12 bg-orange-500 rounded-2xl items-center justify-center shadow-lg shadow-orange-200"
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
                            className={`px-6 py-2.5 rounded-xl border ${activeFilter === filter
                                ? 'bg-orange-500 border-orange-500 shadow-md shadow-orange-100'
                                : 'bg-white border-gray-200'
                                }`}
                        >
                            <Text className={`font-bold capitalize ${activeFilter === filter ? 'text-white' : 'text-gray-600'
                                }`}>
                                {filter}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
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
