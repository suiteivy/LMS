import { BursaryService } from '@/services/BursaryService';
import { formatCurrency } from '@/utils/currency';
import { format } from 'date-fns';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';

export default function BursaryDetailsScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const [bursary, setBursary] = useState<any>(null);
    const [applications, setApplications] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (id) {
            fetchDetails();
        }
    }, [id]);

    const fetchDetails = async () => {
        try {
            setLoading(true);
            const data = await BursaryService.getBursaryDetails(id);
            setBursary(data);
            setApplications(data.applications || []);
        } catch (error: any) {
            Alert.alert('Error', error.message);
            router.back();
        } finally {
            setLoading(false);
        }
    };

    const handleApplicationStatus = async (appId: string, newStatus: 'approved' | 'rejected') => {
        try {
            await BursaryService.updateApplicationStatus(appId, newStatus);
            Alert.alert('Success', `Application ${newStatus}`);
            fetchDetails(); // Refresh list
        } catch (error: any) {
            Alert.alert('Error', error.message);
        }
    };

    if (loading) {
        return (
            <View className="flex-1 justify-center items-center bg-white">
                <ActivityIndicator size="large" color="#FF6B00" />
            </View>
        );
    }

    return (
        <View className="flex-1 bg-gray-50">
            <Stack.Screen options={{ title: 'Bursary Details', headerBackTitle: 'Back' }} />

            <ScrollView className="flex-1 p-4">
                {/* Bursary Info Card */}
                {bursary && (
                    <View className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-6">
                        <View className="flex-row justify-between items-start mb-2">
                            <View className="flex-1">
                                <Text className="text-2xl font-bold text-gray-900">{bursary.title}</Text>
                                <Text className="text-3xl font-extrabold text-[#FF6B00] mt-2">{formatCurrency(bursary.amount)}</Text>
                            </View>
                            <View 
                                className="px-3 py-1 rounded-full"
                                style={{ backgroundColor: bursary.status === 'open' ? '#dcfce7' : '#fee2e2' }}
                            >
                                <Text 
                                    className="text-xs font-bold uppercase"
                                    style={{ color: bursary.status === 'open' ? '#15803d' : '#b91c1c' }}
                                >
                                    {bursary.status}
                                </Text>
                            </View>
                        </View>

                        <Text className="text-gray-600 mt-4 leading-6">{bursary.description}</Text>

                        <View className="mt-4 pt-4 border-t border-gray-50 flex-row gap-6">
                            <View>
                                <Text className="text-xs text-gray-400 font-bold uppercase">Deadline</Text>
                                <Text className="text-gray-900 font-medium">{format(new Date(bursary.deadline), 'MMM dd, yyyy')}</Text>
                            </View>
                            <View>
                                <Text className="text-xs text-gray-400 font-bold uppercase">Applications</Text>
                                <Text className="text-gray-900 font-medium">{applications.length}</Text>
                            </View>
                        </View>
                    </View>
                )}

                {/* Applications List */}
                <Text className="text-lg font-bold text-gray-900 mb-4 px-2">Student Applications</Text>

                {applications.length === 0 ? (
                    <View className="items-center py-10 bg-white rounded-xl">
                        <Text className="text-gray-400">No applications yet</Text>
                    </View>
                ) : (
                    applications.map((app) => (
                        <View key={app.id} className="bg-white p-4 rounded-xl mb-3 shadow-sm border border-gray-100">
                            <View className="flex-row justify-between mb-2">
                                <View>
                                    <Text className="text-base font-bold text-gray-900">{app.student?.user?.full_name}</Text>
                                    <Text className="text-xs text-gray-500">{app.student?.user?.email}</Text>
                                </View>
                                <View 
                                    className="px-2 py-1 rounded h-6 w-20 items-center justify-center"
                                    style={{ 
                                        backgroundColor: app.status === 'approved' ? '#dcfce7' : 
                                                         app.status === 'rejected' ? '#fee2e2' : '#fef9c3' 
                                    }}
                                >
                                    <Text 
                                        className="text-[10px] font-bold uppercase"
                                        style={{ 
                                            color: app.status === 'approved' ? '#166534' : 
                                                   app.status === 'rejected' ? '#991b1b' : '#854d0e' 
                                        }}
                                    >
                                        {app.status}
                                    </Text>
                                </View>
                            </View>

                            {app.justification && (
                                <Text className="text-gray-600 text-sm mt-2 italic bg-gray-50 p-2 rounded">
                                    "{app.justification}"
                                </Text>
                            )}

                            {app.status === 'pending' && (
                                <View className="flex-row mt-4 justify-end gap-3 space-x-3">
                                    <TouchableOpacity
                                        onPress={() => handleApplicationStatus(app.id, 'rejected')}
                                        className="bg-gray-100 px-4 py-2 rounded-full"
                                    >
                                        <Text className="text-gray-600 font-bold text-xs">Reject</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        onPress={() => handleApplicationStatus(app.id, 'approved')}
                                        className="bg-[#FF6B00] px-4 py-2 rounded-full"
                                    >
                                        <Text className="text-white font-bold text-xs">Approve</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>
                    ))
                )}

                {/* Spacer for bottom */}
                <View className="h-10" />
            </ScrollView>
        </View>
    );
}
