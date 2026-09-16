import React, { useState, useEffect } from 'react';
import {
    Modal,
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
} from 'react-native';
import { X, Award, HelpCircle } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { GradingAPI } from '@/services/GradingService';
import { GradingScaleRow, getPerformanceLabel } from '@/utils/getPerformanceLabel';

interface GradingScaleModalProps {
    visible: boolean;
    onClose: () => void;
    scales?: GradingScaleRow[];
}

export function GradingScaleModal({ visible, onClose, scales: propScales }: GradingScaleModalProps) {
    const { isDark } = useTheme();
    const [scales, setScales] = useState<GradingScaleRow[]>(propScales || []);
    const [weights, setWeights] = useState<{ exam_weight: number; continuous_assessment_weight: number }>({
        exam_weight: 60,
        continuous_assessment_weight: 40,
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (visible) {
            let isMounted = true;
            setLoading(true);

            Promise.all([
                propScales && propScales.length > 0 ? Promise.resolve(propScales) : GradingAPI.getGradingScales(),
                GradingAPI.getAssessmentWeights().catch(() => ({ exam_weight: 60, continuous_assessment_weight: 40 })),
            ])
                .then(([scalesData, weightsData]: [any, any]) => {
                    if (!isMounted) return;
                    if (Array.isArray(scalesData) && scalesData.length > 0) {
                        setScales(scalesData);
                    }
                    if (weightsData) {
                        setWeights({
                            exam_weight: Number(weightsData.exam_weight ?? 60),
                            continuous_assessment_weight: Number(weightsData.continuous_assessment_weight ?? 40),
                        });
                    }
                })
                .catch((err) => {
                    console.warn('Failed to load grading scale modal details:', err);
                })
                .finally(() => {
                    if (isMounted) setLoading(false);
                });

            return () => {
                isMounted = false;
            };
        }
    }, [visible, propScales]);

    // Format and sort scale rows
    const sortedScales = [...scales].sort((a, b) => Number(b.min_score) - Number(a.min_score));

    // Detect scale type (e.g. KCSE 12-pt scale vs standard GPA 4.0 / 5.0)
    const maxPoints = Math.max(...sortedScales.map(s => Number(s.gpa_points || s.points || 0)), 0);
    const pointsHeader = maxPoints > 5 ? 'Points' : 'GPA';

    return (
        <Modal
            visible={visible}
            animationType="fade"
            transparent
            onRequestClose={onClose}
        >
            <View className="flex-1 bg-black/60 items-center justify-center p-4">
                <View
                    className={`w-full max-w-lg rounded-3xl border ${isDark ? 'bg-[#161B22] border-gray-800' : 'bg-white border-gray-100'} shadow-2xl overflow-hidden`}
                    style={{ maxHeight: '88%' }}
                >
                    {/* Header */}
                    <View className={`px-6 py-5 border-b flex-row items-center justify-between ${isDark ? 'border-gray-800 bg-[#0F0B2E]/40' : 'border-gray-100 bg-gray-50'}`}>
                        <View className="flex-row items-center gap-3">
                            <View className="w-10 h-10 rounded-2xl bg-[#FF6900]/20 items-center justify-center">
                                <Award size={20} color="#FF6900" />
                            </View>
                            <View>
                                <Text className={`text-base font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                    Grading Scale & Legend
                                </Text>
                                <Text className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                    Institutional academic performance thresholds
                                </Text>
                            </View>
                        </View>
                        <TouchableOpacity
                            onPress={onClose}
                            className={`w-8 h-8 rounded-full items-center justify-center ${isDark ? 'bg-gray-800' : 'bg-gray-200'}`}
                            accessibilityRole="button"
                            accessibilityLabel="Close modal"
                        >
                            <X size={16} color={isDark ? '#9CA3AF' : '#6B7280'} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false} className="p-6">
                        {/* Assessment Weighting Ratio Banner */}
                        <View className={`mb-4 p-4 rounded-2xl border flex-row items-center justify-between ${isDark ? 'bg-orange-500/10 border-orange-500/20' : 'bg-orange-50 border-orange-200'}`}>
                            <View className="flex-1 mr-3">
                                <Text className={`text-xs font-bold ${isDark ? 'text-orange-400' : 'text-orange-700'}`}>
                                    Assessment Weighting Split
                                </Text>
                                <Text className={`text-[11px] mt-0.5 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                    Official institutional compilation ratio
                                </Text>
                            </View>
                            <View className="flex-row items-center gap-2">
                                <View className="px-2.5 py-1 rounded-lg bg-orange-600">
                                    <Text className="text-white text-[11px] font-black">Exam {weights.exam_weight}%</Text>
                                </View>
                                <View className="px-2.5 py-1 rounded-lg bg-blue-600">
                                    <Text className="text-white text-[11px] font-black">CA {weights.continuous_assessment_weight}%</Text>
                                </View>
                            </View>
                        </View>

                        {loading ? (
                            <View className="py-12 items-center justify-center">
                                <ActivityIndicator size="large" color="#FF6900" />
                                <Text className="mt-3 text-xs text-gray-400 font-medium">Loading grading scale...</Text>
                            </View>
                        ) : sortedScales.length === 0 ? (
                            <View className="py-10 items-center justify-center">
                                <Text className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                    No grading scale configured for this institution.
                                </Text>
                            </View>
                        ) : (
                            <View className={`rounded-2xl border overflow-hidden ${isDark ? 'border-gray-800' : 'border-gray-100'}`}>
                                {/* Table Header */}
                                <View className={`flex-row px-4 py-2.5 border-b ${isDark ? 'bg-gray-800/60 border-gray-800' : 'bg-gray-100 border-gray-200'}`}>
                                    <Text className="flex-[1.2] pr-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">Grade / Level</Text>
                                    <Text className="flex-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">Mark Range</Text>
                                    <Text className="w-14 text-center text-[10px] font-bold uppercase tracking-wider text-gray-400">{pointsHeader}</Text>
                                    <Text className="flex-1 text-right text-[10px] font-bold uppercase tracking-wider text-gray-400">Standing</Text>
                                </View>

                                {/* Table Rows */}
                                {sortedScales.map((row, idx) => {
                                    const min = Number(row.min_score);
                                    const max = Number(row.max_score);
                                    const rangeText = `${min} - ${max}%`;
                                    const points = row.points ?? row.gpa_points ?? 0;
                                    const perf = getPerformanceLabel(min, [row]);

                                    return (
                                        <View
                                            key={row.id || `${row.letter_grade}-${idx}`}
                                            className={`flex-row items-center px-4 py-3 border-b ${isDark ? 'border-gray-800/60' : 'border-gray-50'} ${idx % 2 === 1 ? (isDark ? 'bg-white/[0.02]' : 'bg-gray-50/50') : ''}`}
                                        >
                                            <View className="flex-[1.2] pr-2 flex-row items-center">
                                                <View
                                                    className={`px-2 py-0.5 rounded-md border ${perf.bg} ${perf.borderColor}`}
                                                >
                                                    <Text className={`text-xs font-bold ${perf.color}`}>
                                                        {row.letter_grade}
                                                    </Text>
                                                </View>
                                            </View>
                                            <Text className={`flex-1 text-xs font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
                                                {rangeText}
                                            </Text>
                                            <Text className={`w-14 text-center text-xs font-bold ${isDark ? 'text-gray-300' : 'text-gray-800'}`}>
                                                {typeof points === 'number' ? points.toFixed(maxPoints > 5 ? 0 : 1) : points}
                                            </Text>
                                            <Text className={`flex-1 text-right text-xs font-medium ${perf.color}`}>
                                                {row.description || perf.label}
                                            </Text>
                                        </View>
                                    );
                                })}
                            </View>
                        )}

                        <View className="mt-4 flex-row items-center gap-2 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
                            <HelpCircle size={14} color="#3B82F6" />
                            <Text className="flex-1 text-[11px] text-blue-600 dark:text-blue-400">
                                Grades and performance standings are applied according to the institution's official scale configured in Academic Setup.
                            </Text>
                        </View>
                    </ScrollView>

                    {/* Footer */}
                    <View className={`px-6 py-4 border-t flex-row justify-end ${isDark ? 'border-gray-800 bg-[#161B22]' : 'border-gray-100 bg-white'}`}>
                        <TouchableOpacity
                            onPress={onClose}
                            className="px-5 py-2.5 rounded-xl bg-[#FF6900] active:opacity-90"
                        >
                            <Text className="text-white font-bold text-xs">Got It</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}
