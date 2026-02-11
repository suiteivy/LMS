import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { supabase } from '@/libs/supabase';
import { TeacherPayout } from '@/types/types';
import { Ionicons } from '@expo/vector-icons';
import { formatCurrency } from '@/utils/currency';
import { format } from 'date-fns';

export function TeacherPayoutsList() {
    const [payouts, setPayouts] = useState<TeacherPayout[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchPayouts();
    }, []);

    const fetchPayouts = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('teacher_payouts')
                .select(`
            *,
            teacher:users!inner(full_name) -- Assuming 'teacher_id' links to users
        `)
                .order('created_at', { ascending: false });

            if (error) throw error;

            if (data) {
                const formattedPayouts: TeacherPayout[] = data.map((item: any) => ({
                    id: item.id,
                    teacher_id: item.teacher_id,
                    teacher_name: item.teacher?.full_name || 'Unknown Teacher',
                    amount: item.amount,
                    hours_taught: 0, // Placeholder
                    rate_per_hour: 0, // Placeholder
                    period_start: item.period_start,
                    period_end: item.period_end,
                    status: item.status,
                    payment_date: item.payment_date
                }));
                setPayouts(formattedPayouts);
            }
        } catch (error: any) {
            console.error('Error fetching payouts:', error.message);
        } finally {
            setLoading(false);
        }
    };

    const renderItem = ({ item }: { item: TeacherPayout }) => (
        <View className="bg-white p-4 rounded-xl mb-3 shadow-sm border border-gray-100">
            <View className="flex-row justify-between items-center mb-2">
                <View>
                    <Text className="text-lg font-bold text-gray-900">{item.teacher_name}</Text>
                    <Text className="text-gray-500 text-xs">
                        {item.period_start ? format(new Date(item.period_start), 'MMM dd') : 'N/A'} - {item.period_end ? format(new Date(item.period_end), 'MMM dd') : 'N/A'}
                    </Text>
                </View>
                <Text className="text-lg font-bold text-gray-900">{formatCurrency(item.amount)}</Text>
            </View>

            <View className="flex-row justify-between items-center mt-2">
                <View className={`px-2 py-1 rounded-full ${item.status === 'paid' ? 'bg-green-100' :
                        item.status === 'processing' ? 'bg-blue-100' : 'bg-yellow-100'
                    }`}>
                    <Text className={`text-xs font-bold capitalize ${item.status === 'paid' ? 'text-green-700' :
                            item.status === 'processing' ? 'text-blue-700' : 'text-yellow-700'
                        }`}>
                        {item.status}
                    </Text>
                </View>

                {item.status === 'pending' && (
                    <TouchableOpacity className="bg-black px-3 py-1 rounded-full">
                        <Text className="text-white text-xs font-bold">Process</Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );

    if (loading) {
        return <ActivityIndicator size="large" color="#000" className="mt-10" />;
    }

    return (
        <View className="pb-20">
            <FlatList
                data={payouts}
                renderItem={renderItem}
                keyExtractor={item => item.id}
                ListEmptyComponent={
                    <View className="items-center py-10">
                        <Text className="text-gray-500">No payouts records found</Text>
                    </View>
                }
                scrollEnabled={false}
            />
        </View>
    );
}
