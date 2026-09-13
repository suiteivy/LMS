import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Image, ActivityIndicator } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { ParentService } from '@/services/ParentService';
import { setParentSelectedChild, getParentSelectedChild } from '@/utils/parentSelectedChild';
import { Ionicons } from '@expo/vector-icons';

export interface LinkedChild {
    id: string;
    first_name: string;
    last_name: string;
    full_name?: string;
    avatar_url?: string;
    class_id?: string;
    class_name?: string;
    grade_level?: string | number;
    form_level?: string | number;
}

interface ParentChildSelectorProps {
    selectedStudentId?: string;
    onSelectChild: (child: LinkedChild) => void;
    containerStyle?: any;
}

export const ParentChildSelector: React.FC<ParentChildSelectorProps> = ({
    selectedStudentId,
    onSelectChild,
    containerStyle,
}) => {
    const { isDark } = useTheme();
    const [children, setChildren] = useState<LinkedChild[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;

        const loadChildren = async () => {
            try {
                const data = await ParentService.getLinkedStudents();
                if (!isMounted) return;

                const formatted: LinkedChild[] = (data || []).map((item: any) => {
                    const rawStudent = item.student || item;
                    const rawUser = rawStudent.users || rawStudent.user || {};
                    const fullName = rawUser.full_name || `${rawUser.first_name || ''} ${rawUser.last_name || ''}`.trim() || 'Student';
                    return {
                        id: rawStudent.id,
                        first_name: rawUser.first_name || fullName.split(' ')[0] || 'Student',
                        last_name: rawUser.last_name || '',
                        full_name: fullName,
                        avatar_url: rawUser.avatar_url,
                        class_id: item.class_id || rawStudent.class_id,
                        class_name: item.class_name || rawStudent.class_name || 'Class Unassigned',
                        grade_level: rawStudent.grade_level,
                        form_level: rawStudent.form_level,
                    };
                });

                setChildren(formatted);

                // If no child is actively selected, select first or hydrate from storage
                if (!selectedStudentId && formatted.length > 0) {
                    const cached = await getParentSelectedChild();
                    const match = formatted.find(c => c.id === cached?.studentId) || formatted[0];
                    if (match) {
                        await setParentSelectedChild({
                            studentId: match.id,
                            studentName: match.full_name,
                            classId: match.class_id,
                        });
                        onSelectChild(match);
                    }
                }
            } catch (err) {
                console.error('[ParentChildSelector] Failed to fetch linked children:', err);
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        loadChildren();
        return () => {
            isMounted = false;
        };
    }, []);

    if (loading) {
        return (
            <View style={[{ paddingVertical: 10, paddingHorizontal: 16 }, containerStyle]}>
                <ActivityIndicator size="small" color="#FF6900" />
            </View>
        );
    }

    if (children.length <= 1) {
        // Even with 1 child, display a compact confirmed banner
        const single = children[0];
        if (!single) return null;

        return (
            <View
                style={[
                    {
                        paddingHorizontal: 16,
                        paddingVertical: 10,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        borderBottomWidth: 1,
                        borderBottomColor: isDark ? '#21262D' : '#E5E7EB',
                        backgroundColor: isDark ? '#161B22' : '#F9FAFB',
                    },
                    containerStyle,
                ]}
            >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    {single.avatar_url ? (
                        <Image
                            source={{ uri: single.avatar_url }}
                            style={{ width: 28, height: 28, borderRadius: 14 }}
                        />
                    ) : (
                        <View
                            style={{
                                width: 28,
                                height: 28,
                                borderRadius: 14,
                                backgroundColor: '#FF6900',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            <Text style={{ color: '#FFFFFF', fontWeight: 'bold', fontSize: 12 }}>
                                {single.first_name[0] || 'S'}
                            </Text>
                        </View>
                    )}
                    <View>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: isDark ? '#F9FAFB' : '#111827' }}>
                            {single.full_name}
                        </Text>
                        <Text style={{ fontSize: 11, color: isDark ? '#9CA3AF' : '#6B7280' }}>
                            {single.class_name}
                        </Text>
                    </View>
                </View>
                <View
                    style={{
                        paddingHorizontal: 8,
                        paddingVertical: 3,
                        borderRadius: 6,
                        backgroundColor: isDark ? '#21262D' : '#EEF2F6',
                    }}
                >
                    <Text style={{ fontSize: 10, fontWeight: '600', color: '#FF6900' }}>Active Student</Text>
                </View>
            </View>
        );
    }

    return (
        <View
            style={[
                {
                    paddingVertical: 10,
                    borderBottomWidth: 1,
                    borderBottomColor: isDark ? '#21262D' : '#E5E7EB',
                    backgroundColor: isDark ? '#161B22' : '#FFFFFF',
                },
                containerStyle,
            ]}
        >
            <View style={{ paddingHorizontal: 16, marginBottom: 6, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="people-outline" size={14} color="#FF6900" />
                <Text style={{ fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, color: isDark ? '#9CA3AF' : '#6B7280' }}>
                    Select Child
                </Text>
            </View>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}
            >
                {children.map((child) => {
                    const isSelected = child.id === selectedStudentId;

                    return (
                        <TouchableOpacity
                            key={child.id}
                            activeOpacity={0.7}
                            onPress={async () => {
                                await setParentSelectedChild({
                                    studentId: child.id,
                                    studentName: child.full_name,
                                    classId: child.class_id,
                                });
                                onSelectChild(child);
                            }}
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: 10,
                                paddingVertical: 6,
                                paddingHorizontal: 12,
                                borderRadius: 14,
                                borderWidth: 1.5,
                                borderColor: isSelected ? '#FF6900' : (isDark ? '#21262D' : '#E5E7EB'),
                                backgroundColor: isSelected
                                    ? (isDark ? 'rgba(255, 105, 0, 0.15)' : '#FFF7ED')
                                    : (isDark ? '#0D1117' : '#F9FAFB'),
                            }}
                        >
                            {child.avatar_url ? (
                                <Image
                                    source={{ uri: child.avatar_url }}
                                    style={{ width: 28, height: 28, borderRadius: 14 }}
                                />
                            ) : (
                                <View
                                    style={{
                                        width: 28,
                                        height: 28,
                                        borderRadius: 14,
                                        backgroundColor: isSelected ? '#FF6900' : (isDark ? '#30363D' : '#D1D5DB'),
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    <Text style={{ color: '#FFFFFF', fontWeight: 'bold', fontSize: 12 }}>
                                        {child.first_name[0] || 'S'}
                                    </Text>
                                </View>
                            )}
                            <View>
                                <Text
                                    style={{
                                        fontSize: 13,
                                        fontWeight: isSelected ? '700' : '600',
                                        color: isSelected
                                            ? '#FF6900'
                                            : (isDark ? '#F9FAFB' : '#111827'),
                                    }}
                                >
                                    {child.full_name}
                                </Text>
                                <Text style={{ fontSize: 10, color: isDark ? '#9CA3AF' : '#6B7280' }}>
                                    {child.class_name}
                                </Text>
                            </View>
                            {isSelected && (
                                <Ionicons name="checkmark-circle" size={16} color="#FF6900" style={{ marginLeft: 4 }} />
                            )}
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>
        </View>
    );
};
