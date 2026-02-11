import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { supabase } from '@/libs/supabase';
import { Payment } from '@/types/types';
import { Ionicons } from '@expo/vector-icons';
import { formatCurrency } from '@/utils/currency'; // Assuming this utility exists or I should create it
import { format } from 'date-fns';

export function PaymentsList() {
    const [payments, setPayments] = useState<Payment[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchPayments();
    }, []);

    const fetchPayments = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('payments')
                .select(`
            *,
            student:users!inner(full_name) -- Assuming 'student_id' links to users
        `)
                .order('payment_date', { ascending: false });

            if (error) throw error;

            if (data) {
                const formattedPayments: Payment[] = data.map((item: any) => ({
                    id: item.id,
                    student_id: item.student_id,
                    student_name: item.student?.full_name || 'Unknown Student',
                    amount: item.amount,
                    payment_date: item.payment_date,
                    payment_method: item.payment_method,
                    status: item.status,
                    reference_number: item.reference_number
                }));
                setPayments(formattedPayments);
            }
        } catch (error: any) {
            console.error('Error fetching payments:', error.message);
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed': return 'text-green-600 bg-green-100';
            case 'pending': return 'text-yellow-600 bg-yellow-100';
            case 'failed': return 'text-red-600 bg-red-100';
            default: return 'text-gray-600 bg-gray-100';
        }
    }

    const renderItem = ({ item }: { item: Payment }) => (
        <View className="bg-white p-4 rounded-xl mb-3 shadow-sm border border-gray-100">
            <View className="flex-row justify-between items-start mb-2">
                <View>
                    <Text className="text-lg font-bold text-gray-900">{formatCurrency(item.amount)}</Text>
                    <Text className="text-gray-600 font-medium">{item.student_name}</Text>
                </View>
                <View className={`px-2 py-1 rounded-full ${getStatusColor(item.status).split(' ')[1]}`}>
                    <Text className={`text-xs font-bold capitalize ${getStatusColor(item.status).split(' ')[0]}`}>
                        {item.status}
                    </Text>
                </View>
            </View>

            <View className="flex-row justify-between items-center mt-2">
                <View className="flex-row items-center">
                    <Ionicons name="calendar-outline" size={14} color="#6B7280" />
                    <Text className="text-gray-500 text-xs ml-1">
                        {format(new Date(item.payment_date), 'MMM dd, yyyy')}
                    </Text>
                </View>
                <View className="flex-row items-center">
                    <Ionicons name="card-outline" size={14} color="#6B7280" />
                    <Text className="text-gray-500 text-xs ml-1 capitalize">
                        {item.payment_method.replace('_', ' ')}
                    </Text>
                </View>
            </View>
            {item.reference_number && (
                <Text className="text-gray-400 text-xs mt-2">Ref: {item.reference_number}</Text>
            )}
        </View>
    );

    if (loading) {
        return <ActivityIndicator size="large" color="#000" className="mt-10" />;
    }

    return (
        <View className="pb-20">
            <FlatList
                data={payments}
                renderItem={renderItem}
                keyExtractor={item => item.id}
                ListEmptyComponent={
                    <View className="items-center py-10">
                        <Text className="text-gray-500">No payments found</Text>
                    </View>
                }
                scrollEnabled={false} // Since parent is ScrollView
            />
        </View>
    );
}
