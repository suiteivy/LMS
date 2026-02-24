import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/libs/supabase';
import { formatCurrency } from '@/utils/currency';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

export function FeeStructureCard() {
    const { isDark } = useTheme();
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
        return <ActivityIndicator size="large" color={isDark ? "#FF6900" : "#000"} className="mt-10" />;
    }

    return (
        <View className="pb-20">
            {feeStructures.length === 0 ? (
                <View className="items-center py-10">
                    <Text className="text-gray-500 dark:text-gray-400">No active fee structures</Text>
                </View>
            ) : (
                feeStructures.map((fee) => (
                    <View key={fee.id} className="bg-white dark:bg-[#1a1a1a] p-5 rounded-2xl mb-4 shadow-sm border border-gray-100 dark:border-gray-800">
                        <View className="flex-row items-center mb-4">
                            <View className="w-10 h-10 bg-teal-50 dark:bg-teal-900/20 rounded-full items-center justify-center mr-3">
                                <Ionicons name="school-outline" size={20} color={isDark ? "#2DD4BF" : "#0f766e"} />
                            </View>
                            <View>
                                <Text className="text-lg font-bold text-gray-900 dark:text-white">{fee.title}</Text>
                                <Text className="text-gray-500 dark:text-gray-400 text-sm">{fee.academic_year || 'Current Year'} • {fee.term || 'All Terms'}</Text>
                            </View>
                        </View>

                        <Text className="text-3xl font-extrabold text-teal-700 dark:text-teal-400 mb-2">
                            {formatCurrency(fee.amount)}
                        </Text>

                        <Text className="text-gray-600 dark:text-gray-300 leading-6 mb-4">
                            {fee.description || 'Standard tuition fees covering standard curriculum and facility usage.'}
                        </Text>

                        <View className="flex-row items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-800">
                            <View>
                                <Text className="text-xs text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider">Due Date</Text>
                                <Text className="text-gray-900 dark:text-white font-medium">
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
