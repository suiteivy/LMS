import { UnifiedHeader } from "@/components/common/UnifiedHeader";
import { useTheme } from "@/contexts/ThemeContext";
import { BursaryService } from '@/services/BursaryService';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';

const Field = ({ label, children, labelColor }: { label: string; children: React.ReactNode, labelColor: string }) => (
    <View style={{ marginBottom: 24 }}>
        <Text style={{ fontSize: 11, fontWeight: 'bold', color: labelColor, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>{label}</Text>
        {children}
    </View>
);

const createInputStyle = (inputBg: string, border: string, textPrimary: string) => ({
    backgroundColor: inputBg,
    borderWidth: 1,
    borderColor: border,
    borderRadius: 14,
    padding: 16,
    color: textPrimary,
    fontWeight: '500' as const,
    fontSize: 15
});

export default function CreateBursaryScreen() {
    const router = useRouter();
    const { isDark } = useTheme();
    const [loading, setLoading] = useState(false);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [requirements, setRequirements] = useState('');
    const [deadline, setDeadline] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);

    const surface = isDark ? '#1e1e1e' : '#ffffff';
    const border = isDark ? '#2c2c2c' : '#e5e7eb';
    const inputBg = isDark ? '#242424' : '#f9fafb';
    const textPrimary = isDark ? '#f1f1f1' : '#111827';
    const textSecondary = isDark ? '#9ca3af' : '#6b7280';
    const labelColor = isDark ? '#9ca3af' : '#374151';

    const handleCreate = async () => {
        if (!title || !amount) {
            Alert.alert('Error', 'Please fill in the title and amount');
            return;
        }
        try {
            setLoading(true);
            await BursaryService.createBursary({ title, description, amount: parseFloat(amount), requirements, deadline: deadline.toISOString() });
            Alert.alert('Success', 'Bursary created successfully');
            router.back();
        } catch (error: any) {
            Alert.alert('Error', error.message);
        } finally {
            setLoading(false);
        }
    };

    const onDateChange = (event: any, selectedDate?: Date) => {
        setShowDatePicker(Platform.OS === 'ios');
        if (selectedDate) setDeadline(selectedDate);
    };

    const inputStyle = createInputStyle(inputBg, border, textPrimary);

    return (
        <View style={{ flex: 1, backgroundColor: isDark ? '#121212' : '#f9fafb' }}>
            <UnifiedHeader
                title="Finance"
                subtitle="Create Bursary"
                role="Admin"
                onBack={() => router.back()}
            />

            <ScrollView style={{ flex: 1, paddingHorizontal: 20, paddingTop: 24 }}>
                <Field label="Title" labelColor={labelColor}>
                    <TextInput
                        style={inputStyle}
                        placeholder="e.g. Merit Scholarship 2024"
                        placeholderTextColor={textSecondary}
                        value={title}
                        onChangeText={setTitle}
                    />
                </Field>

                <Field label="Amount" labelColor={labelColor}>
                    <TextInput
                        style={inputStyle}
                        placeholder="0.00"
                        placeholderTextColor={textSecondary}
                        keyboardType="numeric"
                        value={amount}
                        onChangeText={setAmount}
                    />
                </Field>

                <Field label="Deadline" labelColor={labelColor}>
                    <TouchableOpacity
                        onPress={() => setShowDatePicker(true)}
                        style={{ ...inputStyle, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
                    >
                        <Text style={{ color: textPrimary, fontWeight: '500', fontSize: 15 }}>{format(deadline, 'MMMM dd, yyyy')}</Text>
                        <Ionicons name="calendar-outline" size={20} color={textSecondary} />
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
                </Field>

                <Field label="Description" labelColor={labelColor}>
                    <TextInput
                        style={{ ...inputStyle, height: 96, textAlignVertical: 'top' }}
                        placeholder="Brief description of the bursary..."
                        placeholderTextColor={textSecondary}
                        multiline
                        textAlignVertical="top"
                        value={description}
                        onChangeText={setDescription}
                    />
                </Field>

                <Field label="Requirements" labelColor={labelColor}>
                    <TextInput
                        style={{ ...inputStyle, height: 96, textAlignVertical: 'top' }}
                        placeholder="List eligibility requirements..."
                        placeholderTextColor={textSecondary}
                        multiline
                        textAlignVertical="top"
                        value={requirements}
                        onChangeText={setRequirements}
                    />
                </Field>

                <TouchableOpacity
                    style={{ backgroundColor: '#FF6B00', borderRadius: 16, paddingVertical: 18, alignItems: 'center', marginBottom: 48, opacity: loading ? 0.7 : 1 }}
                    onPress={handleCreate}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>Create Bursary</Text>
                    )}
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
}