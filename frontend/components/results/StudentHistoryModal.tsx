import React, { useEffect, useState } from 'react';
import {
    Modal,
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
} from 'react-native';
import { X, History, Award, Calendar, ChevronRight, TrendingUp } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { GradingAPI } from '@/services/GradingService';
import { showError } from '@/utils/toast';
import { colorFromLetter } from '@/utils/getPerformanceLabel';

interface HistoricalCard {
    id: string;
    student_id: string;
    class_id: string;
    term_id: string;
    term_name?: string;
    academic_year_name?: string;
    gpa?: number;
    overall_average?: number;
    total_score?: number;
    class_rank?: number;
    total_students?: number;
    status: string;
    grades?: any[];
    created_at?: string;
}

interface StudentHistoryModalProps {
    visible: boolean;
    onClose: () => void;
    studentId: string | null;
    studentName?: string;
}

export function StudentHistoryModal({
    visible,
    onClose,
    studentId,
    studentName,
}: StudentHistoryModalProps) {
    const { isDark } = useTheme();
    const [history, setHistory] = useState<HistoricalCard[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedCard, setSelectedCard] = useState<HistoricalCard | null>(null);

    useEffect(() => {
        if (!visible || !studentId) {
            setHistory([]);
            setSelectedCard(null);
            return;
        }

        let isMounted = true;
        setLoading(true);

        GradingAPI.getStudentHistoricalReportCards(studentId)
            .then((data: any) => {
                if (!isMounted) return;
                const list = Array.isArray(data) ? data : data?.data || [];
                setHistory(list);
            })
            .catch((err: any) => {
                console.error('Failed to load student report card history:', err);
                showError('Error', 'Failed to load historical report cards');
            })
            .finally(() => {
                if (isMounted) setLoading(false);
            });

        return () => {
            isMounted = false;
        };
    }, [visible, studentId]);

    const bg = isDark ? '#161B22' : '#FFFFFF';
    const border = isDark ? '#21262D' : '#D0D7DE';
    const textPrimary = isDark ? '#FFFFFF' : '#111827';
    const textSecondary = isDark ? '#9CA3AF' : '#6B7280';
    const textMuted = isDark ? '#6B7280' : '#9CA3AF';
    const cardBg = isDark ? '#1C2128' : '#F6F8FA';

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
                        backgroundColor: bg,
                        borderTopLeftRadius: 28,
                        borderTopRightRadius: 28,
                        maxHeight: '90%',
                        overflow: 'hidden',
                    }}
                >
                    {/* Header */}
                    <View
                        style={{
                            paddingHorizontal: 20,
                            paddingVertical: 18,
                            borderBottomWidth: 1,
                            borderBottomColor: border,
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                        }}
                    >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                            <View
                                style={{
                                    width: 42,
                                    height: 42,
                                    borderRadius: 14,
                                    backgroundColor: isDark ? '#2A1A0A' : '#FFF3E8',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                <History size={20} color="#FF6900" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text
                                    style={{
                                        color: textPrimary,
                                        fontSize: 16,
                                        fontWeight: '800',
                                    }}
                                    numberOfLines={1}
                                >
                                    {studentName || 'Student'} — Academic History
                                </Text>
                                <Text style={{ color: textSecondary, fontSize: 12, marginTop: 2 }}>
                                    Cross-term report cards & academic trajectory
                                </Text>
                            </View>
                        </View>
                        <TouchableOpacity
                            onPress={onClose}
                            style={{
                                width: 32,
                                height: 32,
                                borderRadius: 16,
                                alignItems: 'center',
                                justifyContent: 'center',
                                backgroundColor: isDark ? '#21262D' : '#EAEEF2',
                            }}
                            accessibilityLabel="Close"
                        >
                            <X size={16} color={textSecondary} />
                        </TouchableOpacity>
                    </View>

                    {/* Body */}
                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
                    >
                        {loading ? (
                            <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                                <ActivityIndicator size="large" color="#FF6900" />
                                <Text style={{ color: textSecondary, marginTop: 12, fontSize: 13 }}>
                                    Fetching historical report cards...
                                </Text>
                            </View>
                        ) : history.length === 0 ? (
                            <View
                                style={{
                                    padding: 32,
                                    borderRadius: 16,
                                    borderWidth: 1,
                                    borderColor: border,
                                    borderStyle: 'dashed',
                                    alignItems: 'center',
                                }}
                            >
                                <Calendar size={36} color={textMuted} />
                                <Text style={{ color: textSecondary, fontWeight: '600', marginTop: 12 }}>
                                    No historical report cards found for this student.
                                </Text>
                                <Text style={{ color: textMuted, fontSize: 12, marginTop: 4, textAlign: 'center' }}>
                                    Report cards compiled in previous terms will appear here automatically.
                                </Text>
                            </View>
                        ) : (
                            <View style={{ gap: 12 }}>
                                {history.map((item) => {
                                    const isExpanded = selectedCard?.id === item.id;
                                    const termLabel = item.term_name || 'Academic Term';
                                    const avg = item.overall_average != null ? Number(item.overall_average).toFixed(1) : null;
                                    const gpa = item.gpa != null ? Number(item.gpa).toFixed(2) : null;

                                    return (
                                        <TouchableOpacity
                                            key={item.id}
                                            activeOpacity={0.8}
                                            onPress={() => setSelectedCard(isExpanded ? null : item)}
                                            style={{
                                                backgroundColor: cardBg,
                                                borderRadius: 16,
                                                borderWidth: 1,
                                                borderColor: border,
                                                padding: 16,
                                            }}
                                        >
                                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                                <View style={{ flex: 1 }}>
                                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                                        <Text style={{ color: textPrimary, fontSize: 15, fontWeight: '700' }}>
                                                            {termLabel}
                                                        </Text>
                                                        <View
                                                            style={{
                                                                backgroundColor: item.status === 'released' ? '#05966920' : '#2563EB20',
                                                                paddingHorizontal: 8,
                                                                paddingVertical: 2,
                                                                borderRadius: 8,
                                                            }}
                                                        >
                                                            <Text
                                                                style={{
                                                                    color: item.status === 'released' ? '#059669' : '#2563EB',
                                                                    fontSize: 10,
                                                                    fontWeight: '700',
                                                                    textTransform: 'uppercase',
                                                                }}
                                                            >
                                                                {item.status}
                                                            </Text>
                                                        </View>
                                                    </View>
                                                    {item.academic_year_name && (
                                                        <Text style={{ color: textMuted, fontSize: 12, marginTop: 2 }}>
                                                            {item.academic_year_name}
                                                        </Text>
                                                    )}
                                                </View>

                                                <View style={{ alignItems: 'flex-end', marginRight: 8 }}>
                                                    {avg != null && (
                                                        <Text style={{ color: textPrimary, fontSize: 16, fontWeight: '800' }}>
                                                            {avg}%
                                                        </Text>
                                                    )}
                                                    {gpa != null && (
                                                        <Text style={{ color: '#FF6900', fontSize: 12, fontWeight: '700' }}>
                                                            GPA {gpa}
                                                        </Text>
                                                    )}
                                                </View>

                                                <ChevronRight
                                                    size={16}
                                                    color={textMuted}
                                                    style={{ transform: [{ rotate: isExpanded ? '90deg' : '0deg' }] }}
                                                />
                                            </View>

                                            {/* Details when expanded */}
                                            {isExpanded && (
                                                <View
                                                    style={{
                                                        marginTop: 14,
                                                        paddingTop: 14,
                                                        borderTopWidth: 1,
                                                        borderTopColor: border,
                                                    }}
                                                >
                                                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
                                                        {item.class_rank != null && (
                                                            <View style={{ backgroundColor: isDark ? '#2A1A0A' : '#FFF3E8', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 }}>
                                                                <Text style={{ color: '#FF6900', fontSize: 12, fontWeight: '700' }}>
                                                                    Rank: #{item.class_rank}{item.total_students ? ` / ${item.total_students}` : ''}
                                                                </Text>
                                                            </View>
                                                        )}
                                                        {item.total_score != null && (
                                                            <View style={{ backgroundColor: isDark ? '#1E293B' : '#E2E8F0', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 }}>
                                                                <Text style={{ color: textPrimary, fontSize: 12, fontWeight: '600' }}>
                                                                    Total Marks: {item.total_score}
                                                                </Text>
                                                            </View>
                                                        )}
                                                    </View>

                                                    {/* Subject Breakdown if available */}
                                                    {Array.isArray(item.grades) && item.grades.length > 0 && (
                                                        <View style={{ gap: 6, marginTop: 4 }}>
                                                            <Text style={{ color: textMuted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>
                                                                Subject Marks
                                                            </Text>
                                                            {item.grades.map((g: any, gIdx: number) => (
                                                                <View
                                                                    key={g.subject_id || gIdx}
                                                                    style={{
                                                                        flexDirection: 'row',
                                                                        justifyContent: 'space-between',
                                                                        alignItems: 'center',
                                                                        paddingVertical: 4,
                                                                    }}
                                                                >
                                                                    <Text style={{ color: textPrimary, fontSize: 13, flex: 1 }} numberOfLines={1}>
                                                                        {g.subject_name || 'Subject'}
                                                                    </Text>
                                                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                                                        <Text style={{ color: textPrimary, fontSize: 13, fontWeight: '700' }}>
                                                                            {g.final_score != null ? `${Number(g.final_score).toFixed(0)}%` : '-'}
                                                                        </Text>
                                                                        {g.letter_grade && (() => {
                                                                            const badge = colorFromLetter(g.letter_grade);
                                                                            return (
                                                                                <View
                                                                                    className={`px-2 py-0.5 rounded-md border ${badge.bg} ${badge.borderColor}`}
                                                                                >
                                                                                    <Text className={`text-[11px] font-extrabold ${badge.color}`}>
                                                                                        {g.letter_grade}
                                                                                    </Text>
                                                                                </View>
                                                                            );
                                                                        })()}
                                                                    </View>
                                                                </View>
                                                            ))}
                                                        </View>
                                                    )}
                                                </View>
                                            )}
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        )}
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}
