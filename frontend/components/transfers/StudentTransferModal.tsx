import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { ClassItem, ClassService } from '@/services/ClassService';
import { formatClassLabel } from '@/utils/classLabel';

interface StudentTransferModalProps {
    visible: boolean;
    student: {
        id: string;
        full_name: string;
        class_id?: string | null;
        current_class_name?: string | null;
    } | null;
    onClose: () => void;
    onSuccess: () => void;
}

export const StudentTransferModal: React.FC<StudentTransferModalProps> = ({
    visible,
    student,
    onClose,
    onSuccess,
}) => {
    const { isDark } = useTheme();
    const { user } = useAuth();
    const [classes, setClasses] = useState<ClassItem[]>([]);
    const [loadingClasses, setLoadingClasses] = useState(false);
    const [selectedClassId, setSelectedClassId] = useState<string>('');
    const [reason, setReason] = useState<string>('');
    const [submitting, setSubmitting] = useState(false);

    const isAdmin = user?.role === 'admin' || user?.role === 'master_admin';

    const surface = isDark ? '#161B22' : '#FFFFFF';
    const border = isDark ? '#21262D' : '#E5E7EB';
    const textPrimary = isDark ? '#FFFFFF' : '#111827';
    const textSecondary = isDark ? '#9CA3AF' : '#6B7280';
    const inputBg = isDark ? '#0D1117' : '#F9FAFB';

    useEffect(() => {
        if (visible) {
            loadAvailableClasses();
            setSelectedClassId('');
            setReason('');
        }
    }, [visible]);

    const loadAvailableClasses = async () => {
        setLoadingClasses(true);
        try {
            const data = await ClassService.getClasses();
            // Filter out current class if known
            const filtered = (data || []).filter(c => c.id !== student?.class_id);
            setClasses(filtered);
        } catch (error: any) {
            console.error('Failed to load classes for transfer:', error);
            Alert.alert('Error', 'Failed to load classes');
        } finally {
            setLoadingClasses(false);
        }
    };

    const handleSubmit = async () => {
        if (!student?.id) return;
        if (!selectedClassId) {
            Alert.alert('Selection Required', 'Please select a destination class for the transfer.');
            return;
        }

        setSubmitting(true);
        try {
            const res = await ClassService.requestTransfer({
                student_id: student.id,
                to_class_id: selectedClassId,
                reason: reason.trim() || undefined,
            });

            Alert.alert(
                'Success',
                res?.message || (isAdmin ? 'Student transferred successfully' : 'Transfer request submitted for admin approval')
            );
            onSuccess();
            onClose();
        } catch (error: any) {
            console.error('Transfer request error:', error);
            const msg = error?.response?.data?.error || error?.message || 'Failed to process transfer';
            Alert.alert('Transfer Error', msg);
        } finally {
            setSubmitting(false);
        }
    };

    if (!visible) return null;

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent
            onRequestClose={onClose}
        >
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}>
                <View
                    style={{
                        backgroundColor: surface,
                        borderTopLeftRadius: 24,
                        borderTopRightRadius: 24,
                        maxHeight: '85%',
                        paddingBottom: 32,
                    }}
                >
                    {/* Header */}
                    <View
                        style={{
                            padding: 20,
                            borderBottomWidth: 1,
                            borderColor: border,
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                        }}
                    >
                        <View>
                            <Text style={{ fontSize: 18, fontWeight: '800', color: textPrimary }}>
                                Transfer Student
                            </Text>
                            <Text style={{ fontSize: 12, color: textSecondary, marginTop: 2 }}>
                                {isAdmin ? 'Direct Class Transfer' : 'Request Class Transfer (Admin Approval)'}
                            </Text>
                        </View>
                        <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
                            <Ionicons name="close" size={24} color={textSecondary} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={{ padding: 20 }}>
                        {/* Student Details Card */}
                        <View
                            style={{
                                backgroundColor: isDark ? '#0D1117' : '#F9FAFB',
                                padding: 16,
                                borderRadius: 16,
                                borderWidth: 1,
                                borderColor: border,
                                marginBottom: 20,
                            }}
                        >
                            <Text style={{ fontSize: 11, fontWeight: '700', color: '#FF6900', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                Student
                            </Text>
                            <Text style={{ fontSize: 17, fontWeight: '800', color: textPrimary, marginTop: 4 }}>
                                {student?.full_name}
                            </Text>
                            {student?.current_class_name && (
                                <Text style={{ fontSize: 13, color: textSecondary, marginTop: 2 }}>
                                    Current Class: {student.current_class_name}
                                </Text>
                            )}
                        </View>

                        {/* Destination Class Selection */}
                        <Text style={{ fontSize: 14, fontWeight: '700', color: textPrimary, marginBottom: 8 }}>
                            Destination Class *
                        </Text>

                        {loadingClasses ? (
                            <ActivityIndicator size="small" color="#FF6900" style={{ marginVertical: 20 }} />
                        ) : classes.length === 0 ? (
                            <Text style={{ color: textSecondary, fontSize: 13, marginVertical: 12 }}>
                                No other classes available in this school.
                            </Text>
                        ) : (
                            <ScrollView
                                horizontal={false}
                                style={{
                                    maxHeight: 180,
                                    borderWidth: 1,
                                    borderColor: border,
                                    borderRadius: 14,
                                    marginBottom: 20,
                                }}
                            >
                                {classes.map((cls) => {
                                    const isSelected = selectedClassId === cls.id;
                                    return (
                                        <TouchableOpacity
                                            key={cls.id}
                                            onPress={() => setSelectedClassId(cls.id)}
                                            style={{
                                                padding: 14,
                                                flexDirection: 'row',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                backgroundColor: isSelected
                                                    ? isDark ? '#2A1A0A' : '#FFF7F0'
                                                    : 'transparent',
                                                borderBottomWidth: 1,
                                                borderColor: border,
                                            }}
                                        >
                                            <View>
                                                <Text
                                                    style={{
                                                        fontSize: 14,
                                                        fontWeight: isSelected ? '800' : '600',
                                                        color: isSelected ? '#FF6900' : textPrimary,
                                                    }}
                                                >
                                                    {formatClassLabel(cls)}
                                                </Text>
                                                {cls.capacity && (
                                                    <Text style={{ fontSize: 11, color: textSecondary, marginTop: 2 }}>
                                                        Capacity: {cls.capacity} students
                                                    </Text>
                                                )}
                                            </View>
                                            {isSelected && (
                                                <Ionicons name="checkmark-circle" size={20} color="#FF6900" />
                                            )}
                                        </TouchableOpacity>
                                    );
                                })}
                            </ScrollView>
                        )}

                        {/* Reason / Notes */}
                        <Text style={{ fontSize: 14, fontWeight: '700', color: textPrimary, marginBottom: 8 }}>
                            Reason for Transfer
                        </Text>
                        <TextInput
                            multiline
                            numberOfLines={3}
                            placeholder="e.g., Stream rebalancing, academic progression, or guardian request..."
                            placeholderTextColor={textSecondary}
                            value={reason}
                            onChangeText={setReason}
                            style={{
                                backgroundColor: inputBg,
                                borderWidth: 1,
                                borderColor: border,
                                borderRadius: 14,
                                padding: 12,
                                color: textPrimary,
                                fontSize: 14,
                                minHeight: 80,
                                textAlignVertical: 'top',
                                marginBottom: 24,
                            }}
                        />

                        {/* Submit Button */}
                        <TouchableOpacity
                            onPress={handleSubmit}
                            disabled={submitting || !selectedClassId}
                            style={{
                                backgroundColor: '#FF6900',
                                paddingVertical: 14,
                                borderRadius: 14,
                                alignItems: 'center',
                                opacity: submitting || !selectedClassId ? 0.5 : 1,
                            }}
                        >
                            {submitting ? (
                                <ActivityIndicator size="small" color="#FFFFFF" />
                            ) : (
                                <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 15 }}>
                                    {isAdmin ? 'Complete Transfer Now' : 'Submit Transfer Request'}
                                </Text>
                            )}
                        </TouchableOpacity>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
};
