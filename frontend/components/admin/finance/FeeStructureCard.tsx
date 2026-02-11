import React, { useState, useEffect } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { supabase } from '@/libs/supabase';
import { FeeStructure } from '@/types/types';
import { formatCurrency } from '@/utils/currency';
import { Ionicons } from '@expo/vector-icons';

export function FeeStructureCard() {
    const [feeStructures, setFeeStructures] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchFeeStructures();
    }, []);

    const fetchFeeStructures = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('fee_structures')
                .select('*')
                .eq('is_active', true); // Fetch only active ones for display logic simplicity

            if (error) throw error;

            if (data) {
                setFeeStructures(data);
            }
        } catch (error: any) {
            console.error('Error fetching fees:', error.message);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <ActivityIndicator size="large" color="#000" className="mt-10" />;
    }

    return (
        <View className="pb-20">
            {feeStructures.length === 0 ? (
                <View className="items-center py-10">
                    <Text className="text-gray-500">No active fee structures</Text>
                </View>
            ) : (
                feeStructures.map((fee) => (
                    <View key={fee.id} className="bg-white p-5 rounded-2xl mb-4 shadow-sm border border-gray-100">
                        <View className="flex-row items-center mb-4">
                            <View className="w-10 h-10 bg-teal-50 rounded-full items-center justify-center mr-3">
                                <Ionicons name="school-outline" size={20} color="#0f766e" />
                            </View>
                            <View>
                                <Text className="text-lg font-bold text-gray-900">{fee.title}</Text>
                                <Text className="text-gray-500 text-sm">{fee.academic_year || 'Current Year'} • {fee.term || 'All Terms'}</Text>
                            </View>
                        </View>

                        <Text className="text-3xl font-extrabold text-teal-700 mb-2">
                            {formatCurrency(fee.amount)}
                        </Text>

                        <Text className="text-gray-600 leading-6 mb-4">
                            {fee.description || 'Standard tuition fees covering standard curriculum and facility usage.'}
                        </Text>

                        <View className="flex-row items-center justify-between pt-4 border-t border-gray-100">
                            <View>
                                <Text className="text-xs text-gray-400 font-bold uppercase tracking-wider">Due Date</Text>
                                <Text className="text-gray-900 font-medium">
                                    {fee.due_date || 'Flexible'}
                                </Text>
                            </View>
                            <View>
                                <Text className="text-xs text-gray-400 font-bold uppercase tracking-wider text-right">Status</Text>
                                <Text className="text-green-600 font-medium text-right">Active</Text>
                            </View>
                        </View>
                    </View>
                ))
            )}
        </View>
    );
}
