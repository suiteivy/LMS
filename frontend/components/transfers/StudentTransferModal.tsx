import React, { useEffect, useMemo, useState } from 'react';
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
        grade_level?: number | string | null;
        form_level?: number | string | null;
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
    const [searchFilter, setSearchFilter] = useState('');
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
            setSearchFilter('');
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
            Alert.alert('Error', 'Failed to load available classes');
        } finally {
            setLoadingClasses(false);
        }
    };

    // Determine student's current level value (e.g. 7 or "Grade 7")
    const studentLevel = useMemo(() => {
        if (student?.grade_level !== undefined && student?.grade_level !== null) {
            return String(student.grade_level);
        }
        if (student?.form_level !== undefined && student?.form_level !== null) {
            return `Form ${student.form_level}`;
        }
        return null;
    }, [student]);

    // Group available classes by level
    const groupedClasses = useMemo(() => {
        const filtered = classes.filter((cls) => {
            if (!searchFilter.trim()) return true;
            const query = searchFilter.toLowerCase();
            const label = formatClassLabel(cls).toLowerCase();
            const stream = (cls.stream || '').toLowerCase();
            return label.includes(query) || stream.includes(query);
        });

        const groups: Record<string, ClassItem[]> = {};

        filtered.forEach((cls) => {
            let levelKey = 'Other Classes';
            if (cls.grade_level !== undefined && cls.grade_level !== null) {
                levelKey = `Grade ${cls.grade_level}`;
            } else if (cls.form_level !== undefined && cls.form_level !== null) {
                levelKey = `Form ${cls.form_level}`;
            } else if (cls.education_level) {
                levelKey = cls.education_level;
            }

            if (!groups[levelKey]) {
                groups[levelKey] = [];
            }
            groups[levelKey].push(cls);
        });

        return groups;
    }, [classes, searchFilter]);

    const selectedClass = useMemo(() => {
        return classes.find(c => c.id === selectedClassId);
    }, [classes, selectedClassId]);

    // Check if the selected transfer is cross-level
    const isCrossLevel = useMemo(() => {
        if (!selectedClass || !studentLevel) return false;
        const targetLevel = selectedClass.grade_level !== undefined && selectedClass.grade_level !== null
            ? String(selectedClass.grade_level)
            : selectedClass.form_level !== undefined && selectedClass.form_level !== null
                ? `Form ${selectedClass.form_level}`
                : null;
        if (!targetLevel) return false;
        return !studentLevel.includes(targetLevel) && !targetLevel.includes(studentLevel);
    }, [selectedClass, studentLevel]);

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
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' }}>
                <View
                    style={{
                        backgroundColor: surface,
                        borderTopLeftRadius: 28,
                        borderTopRightRadius: 28,
                        maxHeight: '90%',
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
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <Text style={{ fontSize: 18, fontWeight: '800', color: textPrimary }}>
                                    Transfer Student
                                </Text>
                                <View style={{
                                    backgroundColor: isAdmin ? '#FF69001A' : '#3B82F61A',
                                    paddingHorizontal: 8,
                                    paddingVertical: 2,
                                    borderRadius: 8,
                                }}>
                                    <Text style={{
                                        fontSize: 10,
                                        fontWeight: '800',
                                        color: isAdmin ? '#FF6900' : '#3B82F6',
                                        textTransform: 'uppercase',
                                    }}>
                                        {isAdmin ? 'Direct Action' : 'Approval Request'}
                                    </Text>
                                </View>
                            </View>
                            <Text style={{ fontSize: 12, color: textSecondary, marginTop: 2 }}>
                                {isAdmin ? 'Immediate Class & Level Reassignment' : 'Initiate transfer for Administration approval'}
                            </Text>
                        </View>
                        <TouchableOpacity onPress={onClose} style={{ padding: 6 }}>
                            <Ionicons name="close" size={24} color={textSecondary} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={{ padding: 20 }} showsVerticalScrollIndicator={false}>
                        {/* Student Details Card */}
                        <View
                            style={{
                                backgroundColor: isDark ? '#0D1117' : '#F9FAFB',
                                padding: 16,
                                borderRadius: 16,
                                borderWidth: 1,
                                borderColor: border,
                                marginBottom: 16,
                            }}
                        >
                            <Text style={{ fontSize: 11, fontWeight: '700', color: '#FF6900', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                Student Profile
                            </Text>
                            <Text style={{ fontSize: 17, fontWeight: '800', color: textPrimary, marginTop: 4 }}>
                                {student?.full_name}
                            </Text>
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                                {student?.current_class_name && (
                                    <View style={{ backgroundColor: isDark ? '#1C2128' : '#EEF2F6', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}>
                                        <Text style={{ fontSize: 12, color: textSecondary, fontWeight: '600' }}>
                                            Current Class: <Text style={{ color: textPrimary, fontWeight: '700' }}>{student.current_class_name}</Text>
                                        </Text>
                                    </View>
                                )}
                                {studentLevel && (
                                    <View style={{ backgroundColor: isDark ? '#1C2128' : '#EEF2F6', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}>
                                        <Text style={{ fontSize: 12, color: textSecondary, fontWeight: '600' }}>
                                            Current Level: <Text style={{ color: textPrimary, fontWeight: '700' }}>{studentLevel}</Text>
                                        </Text>
                                    </View>
                                )}
                            </View>
                        </View>

                        {/* Search & Filter Destination */}
                        <View style={{ marginBottom: 12 }}>
                            <Text style={{ fontSize: 13, fontWeight: '700', color: textPrimary, marginBottom: 6 }}>
                                Select Destination Class *
                            </Text>
                            <View
                                style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    backgroundColor: inputBg,
                                    borderWidth: 1,
                                    borderColor: border,
                                    borderRadius: 12,
                                    paddingHorizontal: 12,
                                    paddingVertical: 8,
                                }}
                            >
                                <Ionicons name="search" size={16} color={textSecondary} style={{ marginRight: 8 }} />
                                <TextInput
                                    placeholder="Filter by class or stream..."
                                    placeholderTextColor={textSecondary}
                                    value={searchFilter}
                                    onChangeText={setSearchFilter}
                                    style={{ flex: 1, color: textPrimary, fontSize: 13, padding: 0 }}
                                />
                                {searchFilter.length > 0 && (
                                    <TouchableOpacity onPress={() => setSearchFilter('')}>
                                        <Ionicons name="close-circle" size={16} color={textSecondary} />
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>

                        {/* Classes grouped by level */}
                        {loadingClasses ? (
                            <ActivityIndicator size="small" color="#FF6900" style={{ marginVertical: 24 }} />
                        ) : Object.keys(groupedClasses).length === 0 ? (
                            <View style={{ padding: 24, alignItems: 'center', backgroundColor: inputBg, borderRadius: 12, marginBottom: 16 }}>
                                <Text style={{ color: textSecondary, fontSize: 13 }}>
                                    {searchFilter ? 'No classes match your filter' : 'No available classes found'}
                                </Text>
                            </View>
                        ) : (
                            <ScrollView
                                nestedScrollEnabled
                                style={{
                                    maxHeight: 220,
                                    borderWidth: 1,
                                    borderColor: border,
                                    borderRadius: 14,
                                    marginBottom: 16,
                                }}
                            >
                                {Object.entries(groupedClasses).map(([levelName, classList]) => (
                                    <View key={levelName}>
                                        {/* Level Section Header */}
                                        <View
                                            style={{
                                                backgroundColor: isDark ? '#1F242C' : '#F3F4F6',
                                                paddingHorizontal: 14,
                                                paddingVertical: 6,
                                                flexDirection: 'row',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                            }}
                                        >
                                            <Text style={{ fontSize: 11, fontWeight: '800', color: textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                                {levelName}
                                            </Text>
                                            <Text style={{ fontSize: 11, color: textSecondary, fontWeight: '600' }}>
                                                {classList.length} {classList.length === 1 ? 'class' : 'classes'}
                                            </Text>
                                        </View>

                                        {/* Classes inside level */}
                                        {classList.map((cls) => {
                                            const isSelected = selectedClassId === cls.id;
                                            const clsLevel = cls.grade_level !== undefined && cls.grade_level !== null
                                                ? String(cls.grade_level)
                                                : cls.form_level !== undefined && cls.form_level !== null
                                                    ? `Form ${cls.form_level}`
                                                    : null;
                                            const isDifferentLevel = studentLevel && clsLevel && !studentLevel.includes(clsLevel) && !clsLevel.includes(studentLevel);

                                            return (
                                                <TouchableOpacity
                                                    key={cls.id}
                                                    onPress={() => setSelectedClassId(cls.id)}
                                                    style={{
                                                        padding: 12,
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
                                                    <View style={{ flex: 1 }}>
                                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                                            <Text
                                                                style={{
                                                                    fontSize: 14,
                                                                    fontWeight: isSelected ? '800' : '600',
                                                                    color: isSelected ? '#FF6900' : textPrimary,
                                                                }}
                                                            >
                                                                {formatClassLabel(cls)}
                                                            </Text>
                                                            {isDifferentLevel && (
                                                                <View style={{ backgroundColor: '#F59E0B20', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 6 }}>
                                                                    <Text style={{ fontSize: 9, fontWeight: '800', color: '#D97706', textTransform: 'uppercase' }}>
                                                                        Cross-Level
                                                                    </Text>
                                                                </View>
                                                            )}
                                                        </View>
                                                        {cls.capacity && (
                                                            <Text style={{ fontSize: 11, color: textSecondary, marginTop: 2 }}>
                                                                Capacity: {cls.capacity} students
                                                            </Text>
                                                        )}
                                                    </View>
                                                    {isSelected ? (
                                                        <Ionicons name="checkmark-circle" size={20} color="#FF6900" />
                                                    ) : (
                                                        <View style={{ width: 18, height: 18, borderRadius: 9, borderWidth: 1.5, borderColor: border }} />
                                                    )}
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </View>
                                ))}
                            </ScrollView>
                        )}

                        {/* Cross-Level Notice */}
                        {isCrossLevel && (
                            <View
                                style={{
                                    backgroundColor: isDark ? '#2A1B07' : '#FEF3C7',
                                    borderWidth: 1,
                                    borderColor: '#F59E0B60',
                                    borderRadius: 12,
                                    padding: 12,
                                    marginBottom: 16,
                                    flexDirection: 'row',
                                    gap: 10,
                                }}
                            >
                                <Ionicons name="swap-vertical" size={18} color="#D97706" style={{ marginTop: 2 }} />
                                <View style={{ flex: 1 }}>
                                    <Text style={{ fontSize: 12, fontWeight: '800', color: '#B45309' }}>
                                        Cross-Level Transfer Detected
                                    </Text>
                                    <Text style={{ fontSize: 11, color: isDark ? '#FDE68A' : '#92400E', marginTop: 2, lineHeight: 16 }}>
                                        {isAdmin
                                            ? "The student's grade/form level will be updated and relevant level curriculum subjects will be synchronized automatically upon transfer."
                                            : "This request will be routed to Administration. Once approved, the student's level will update accordingly."}
                                    </Text>
                                </View>
                            </View>
                        )}

                        {/* Reason / Notes */}
                        <Text style={{ fontSize: 13, fontWeight: '700', color: textPrimary, marginBottom: 6 }}>
                            Reason for Transfer
                        </Text>
                        <TextInput
                            multiline
                            numberOfLines={3}
                            placeholder="e.g., Stream rebalancing, academic adjustment, or guardian request..."
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
                                fontSize: 13,
                                minHeight: 70,
                                textAlignVertical: 'top',
                                marginBottom: 20,
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
                                    {isAdmin ? 'Execute Transfer Now' : 'Submit Transfer Request'}
                                </Text>
                            )}
                        </TouchableOpacity>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
};
