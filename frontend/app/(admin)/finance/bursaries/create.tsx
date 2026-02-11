import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, Platform, ActivityIndicator } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { BursaryService } from '@/services/BursaryService';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';

export default function CreateBursaryScreen() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [requirements, setRequirements] = useState('');
    const [deadline, setDeadline] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);

    const handleCreate = async () => {
        if (!title || !amount) {
            Alert.alert('Error', 'Please fill in the title and amount');
            return;
        }

        try {
            setLoading(true);
            await BursaryService.createBursary({
                title,
                description,
                amount: parseFloat(amount),
                requirements,
                deadline: deadline.toISOString(),
            });

            Alert.alert('Success', 'Bursary created successfully');
            router.back();
        } catch (error: any) {
            Alert.alert('Error', error.message);
        } finally {
            setLoading(false);
        }
    };

    const onDateChange = (event: any, selectedDate?: Date) => {
        const currentDate = selectedDate || deadline;
        setShowDatePicker(Platform.OS === 'ios');
        setDeadline(currentDate);
    };

    return (
        <View className="flex-1 bg-white">
            <Stack.Screen options={{ title: 'Create Bursary', headerBackTitle: 'Back' }} />

            <ScrollView className="flex-1 px-6 py-6">
                <View className="mb-6">
                    <Text className="text-sm font-bold text-gray-700 mb-2 uppercase tracking-wider">Title</Text>
                    <TextInput
                        className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-gray-900 font-medium"
                        placeholder="e.g. Merit Scholarship 2024"
                        value={title}
                        onChangeText={setTitle}
                    />
                </View>

                <View className="mb-6">
                    <Text className="text-sm font-bold text-gray-700 mb-2 uppercase tracking-wider">Amount</Text>
                    <TextInput
                        className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-gray-900 font-medium"
                        placeholder="0.00"
                        keyboardType="numeric"
                        value={amount}
                        onChangeText={setAmount}
                    />
                </View>

                <View className="mb-6">
                    <Text className="text-sm font-bold text-gray-700 mb-2 uppercase tracking-wider">Deadline</Text>
                    <TouchableOpacity
                        onPress={() => setShowDatePicker(true)}
                        className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex-row justify-between items-center"
                    >
                        <Text className="text-gray-900 font-medium">
                            {format(deadline, 'MMMM dd, yyyy')}
                        </Text>
                        <Ionicons name="calendar-outline" size={20} color="#6B7280" />
                    </TouchableOpacity>
                    {showDatePicker && (
                        <DateTimePicker
                            value={deadline}
                            mode="date"
                            display="default"
                            onChange={onDateChange}
                            minimumDate={new Date()}
                        />
                    )}
                </View>

                <View className="mb-6">
                    <Text className="text-sm font-bold text-gray-700 mb-2 uppercase tracking-wider">Description</Text>
                    <TextInput
                        className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-gray-900 h-24"
                        placeholder="Brief description of the bursary..."
                        multiline
                        textAlignVertical="top"
                        value={description}
                        onChangeText={setDescription}
                    />
                </View>

                <View className="mb-8">
                    <Text className="text-sm font-bold text-gray-700 mb-2 uppercase tracking-wider">Requirements</Text>
                    <TextInput
                        className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-gray-900 h-24"
                        placeholder="List eligibility requirements..."
                        multiline
                        textAlignVertical="top"
                        value={requirements}
                        onChangeText={setRequirements}
                    />
                </View>

                <TouchableOpacity
                    className={`bg-[#FF6B00] rounded-xl py-4 items-center mb-10 ${loading ? 'opacity-70' : ''}`}
                    onPress={handleCreate}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <Text className="text-white font-bold text-lg">Create Bursary</Text>
                    )}
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
}
