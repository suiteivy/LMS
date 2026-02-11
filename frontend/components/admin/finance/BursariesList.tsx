import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { BursaryService } from '@/services/BursaryService';
import { Ionicons } from '@expo/vector-icons';
import { formatCurrency } from '@/utils/currency';
import { format } from 'date-fns';
import { useRouter } from 'expo-router';

import { Bursary } from '@/types/types';

export function BursariesList() {
    const [bursaries, setBursaries] = useState<Bursary[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        fetchBursaries();
    }, []);

    const fetchBursaries = async () => {
        try {
            setLoading(true);
            const data = await BursaryService.getBursaries();
            setBursaries(data || []);
        } catch (error: any) {
            console.error('Error fetching bursaries:', error.message);
        } finally {
            setLoading(false);
        }
    };

    const renderItem = ({ item }: { item: Bursary }) => (
        <TouchableOpacity
            className="bg-white p-4 rounded-xl mb-3 shadow-sm border border-gray-100"
            onPress={() => router.push(`/(admin)/finance/bursaries/${item.id}`)}
        >
            <View className="flex-row justify-between items-start mb-2">
                <View className="flex-1 mr-2">
                    <Text className="text-lg font-bold text-gray-900" numberOfLines={1}>{item.title}</Text>
                    <Text className="text-gray-500 text-sm mt-1" numberOfLines={2}>{item.description}</Text>
                </View>
                <View className={`px-2 py-1 rounded-full ${item.status === 'open' ? 'bg-green-100' : 'bg-red-100'}`}>
                    <Text className={`text-xs font-bold capitalize ${item.status === 'open' ? 'text-green-700' : 'text-red-700'}`}>
                        {item.status}
                    </Text>
                </View>
            </View>

            <View className="flex-row justify-between items-center mt-3 pt-3 border-t border-gray-50">
                <Text className="text-teal-700 font-bold text-base">
                    {formatCurrency(item.amount)}
                </Text>

                <View className="flex-row items-center space-x-4 gap-4">
                    <View className="flex-row items-center">
                        <Ionicons name="time-outline" size={14} color="#6B7280" />
                        <Text className="text-gray-500 text-xs ml-1">
                            Due: {item.deadline ? format(new Date(item.deadline), 'MMM dd') : 'No deadline'}
                        </Text>
                    </View>
                    {/* Placeholder for application count if available */}
                    {/* <View className="flex-row items-center">
                    <Ionicons name="people-outline" size={14} color="#6B7280" />
                    <Text className="text-gray-500 text-xs ml-1">
                        {item.applications_count || 0} Apps
                    </Text>
               </View> */}
                </View>
            </View>
        </TouchableOpacity>
    );

    if (loading) {
        return <ActivityIndicator size="large" color="#FF6B00" className="mt-10" />;
    }

    return (
        <View className="pb-20">
            <FlatList
                data={bursaries}
                renderItem={renderItem}
                keyExtractor={item => item.id}
                ListEmptyComponent={
                    <View className="items-center py-10">
                        <Text className="text-gray-500">No bursaries found</Text>
                        <Text className="text-gray-400 text-sm mt-2">Create one to get started</Text>
                    </View>
                }
                scrollEnabled={false}
            />
        </View>
    );
}
