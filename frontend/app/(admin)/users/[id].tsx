import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity, Alert, Image } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '@/libs/supabase';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';

export default function UserDetailsScreen() {
    const { id: idParam } = useLocalSearchParams();
    const id = Array.isArray(idParam) ? idParam[0] : idParam;
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [roleData, setRoleData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (id) fetchUserDetails();
    }, [id]);

    const fetchUserDetails = async () => {
        try {
            setLoading(true);

            // Fetch core user data
            const { data: userData, error: userError } = await supabase
                .from('users')
                .select('*')
                .eq('id', id)
                .single();

            if (userError) throw userError;
            setUser(userData);

            // Fetch role specific data
            let roleQuery = null;
            const role = (userData as any)?.role;
            if (role === 'student') roleQuery = supabase.from('students').select('*').eq('user_id', id as string).single();
            else if (role === 'teacher') roleQuery = supabase.from('teachers').select('*').eq('user_id', id as string).single();
            else if (role === 'admin') roleQuery = supabase.from('admins').select('*').eq('user_id', id as string).single();
            else if (role === 'parent') roleQuery = supabase.from('parents').select('*').eq('user_id', id as string).single();

            if (roleQuery) {
                const { data: rData, error: rError } = await roleQuery;
                if (!rError && rData) {
                    // Extract ID correctly if it's an array (though .single() should handle it)
                    const normalizedData = Array.isArray(rData) ? rData[0] : rData;
                    setRoleData(normalizedData);
                }
            }

        } catch (error: any) {
            Alert.alert('Error', error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleStatusChange = async (newStatus: 'approved' | 'rejected' | 'pending') => {
        try {
            const { error } = await supabase
                .from('users')
                .update({ status: newStatus })
                .eq('id', id);

            if (error) throw error;

            Alert.alert('Success', `User status updated to ${newStatus}`);
            fetchUserDetails(); // Refresh
        } catch (error: any) {
            Alert.alert('Error', error.message);
        }
    };

    const getInitials = (name: string) => {
        return name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '??';
    }

    if (loading) {
        return (
            <View className="flex-1 justify-center items-center bg-white">
                <ActivityIndicator size="large" color="black" />
            </View>
        );
    }

    if (!user) {
        return (
            <View className="flex-1 justify-center items-center bg-white">
                <Text className="text-gray-500">User not found</Text>
            </View>
        );
    }

    return (
        <View className="flex-1 bg-white">
            <Stack.Screen options={{ title: 'User Details', headerBackTitle: 'Back' }} />

            <ScrollView className="flex-1">
                {/* Profile Header */}
                <View className="items-center py-8 bg-gray-50 border-b border-gray-100">
                    <View className="w-24 h-24 bg-gray-200 rounded-full items-center justify-center mb-4 overflow-hidden border-4 border-white shadow-sm">
                        {/* Placeholder for avatar, or use initials */}
                        <Text className="text-3xl font-bold text-gray-500">{getInitials(user.full_name)}</Text>
                    </View>
                    <Text className="text-2xl font-bold text-gray-900">{user.full_name}</Text>
                    <Text className="text-gray-500 text-sm mb-2">{user.email}</Text>

                    <View className="flex-row items-center gap-2 mt-2">
                        <View className={`px-3 py-1 rounded-full ${paramsToColor(user.role)}`}>
                            <Text className={`text-xs font-bold uppercase ${paramsToTextColor(user.role)}`}>
                                {user.role}
                            </Text>
                        </View>
                        <View className={`px-3 py-1 rounded-full ${user.status === 'approved' ? 'bg-green-100' :
                            user.status === 'rejected' ? 'bg-red-100' : 'bg-yellow-100'
                            }`}>
                            <Text className={`text-xs font-bold uppercase ${user.status === 'approved' ? 'text-green-700' :
                                user.status === 'rejected' ? 'text-red-700' : 'text-yellow-700'
                                }`}>
                                {user.status || 'Pending'}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Info Sections */}
                <View className="p-6">
                    <Text className="text-lg font-bold text-gray-900 mb-4">Profile Information</Text>

                    <InfoRow label="User ID" value={roleData?.id || 'N/A'} />

                    <InfoRow label="Joined Date" value={format(new Date(user.created_at), 'MMM dd, yyyy')} />

                    {user.role === 'student' && roleData && (
                        <>
                            <InfoRow label="Grade Level" value={roleData.grade_level} />
                            <InfoRow label="Parent Contact" value={roleData.parent_contact} />
                        </>
                    )}
                    {user.role === 'teacher' && roleData && (
                        <>
                            <InfoRow label="Department" value={roleData.department} />
                            <InfoRow label="Qualification" value={roleData.qualification} />
                        </>
                    )}
                </View>

                {/* Actions */}
                <View className="p-6 pt-0">
                    <Text className="text-lg font-bold text-gray-900 mb-4">Actions</Text>
                    <View className="flex-row gap-4">
                        <TouchableOpacity
                            onPress={() => handleStatusChange('approved')}
                            className="flex-1 bg-black py-3 rounded-xl items-center"
                        >
                            <Text className="text-white font-bold">Approve User</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => handleStatusChange('rejected')}
                            className="flex-1 bg-red-50 border border-red-100 py-3 rounded-xl items-center"
                        >
                            <Text className="text-red-600 font-bold">Reject / Suspend</Text>
                        </TouchableOpacity>
                    </View>
                </View>

            </ScrollView>
        </View>
    );
}

const InfoRow = ({ label, value }: { label: string, value: string }) => (
    <View className="flex-row py-3 border-b border-gray-100">
        <Text className="w-1/3 text-gray-500 font-medium">{label}</Text>
        <Text className="flex-1 text-gray-900 font-medium text-right">{value || 'N/A'}</Text>
    </View>
);

const paramsToColor = (role: string) => {
    switch (role) {
        case 'admin': return 'bg-blue-100';
        case 'teacher': return 'bg-purple-100';
        case 'student': return 'bg-green-100';
        default: return 'bg-gray-100';
    }
}
const paramsToTextColor = (role: string) => {
    switch (role) {
        case 'admin': return 'text-blue-700';
        case 'teacher': return 'text-purple-700';
        case 'student': return 'text-green-700';
        default: return 'text-gray-700';
    }
}
