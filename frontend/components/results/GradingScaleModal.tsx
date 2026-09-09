import React, { useState } from 'react';
import {
    Modal,
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    TextInput,
} from 'react-native';
import { X, Award, Calculator, CheckCircle, HelpCircle } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';

interface GradingScaleModalProps {
    visible: boolean;
    onClose: () => void;
}

interface ScaleRow {
    grade: string;
    range: string;
    min: number;
    max: number;
    gpa: string;
    label: string;
    color: string;
    bg: string;
    border: string;
}

const DEFAULT_SCALE: ScaleRow[] = [
    { grade: 'A', range: '90 - 100%', min: 90, max: 100, gpa: '4.0', label: 'Excellent', color: '#10B981', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.3)' },
    { grade: 'A-', range: '85 - 89%', min: 85, max: 89.9, gpa: '3.7', label: 'Very Good', color: '#059669', bg: 'rgba(5,150,105,0.12)', border: 'rgba(5,150,105,0.3)' },
    { grade: 'B+', range: '80 - 84%', min: 80, max: 84.9, gpa: '3.3', label: 'Good', color: '#3B82F6', bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.3)' },
    { grade: 'B', range: '70 - 79%', min: 70, max: 79.9, gpa: '3.0', label: 'Above Average', color: '#2563EB', bg: 'rgba(37,99,235,0.12)', border: 'rgba(37,99,235,0.3)' },
    { grade: 'C+', range: '60 - 69%', min: 60, max: 69.9, gpa: '2.3', label: 'Average', color: '#D97706', bg: 'rgba(217,119,6,0.12)', border: 'rgba(217,119,6,0.3)' },
    { grade: 'C', range: '50 - 59%', min: 50, max: 59.9, gpa: '2.0', label: 'Pass', color: '#F59E0B', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)' },
    { grade: 'D', range: '40 - 49%', min: 40, max: 49.9, gpa: '1.0', label: 'Marginal', color: '#F97316', bg: 'rgba(249,115,22,0.12)', border: 'rgba(249,115,22,0.3)' },
    { grade: 'F', range: '< 40%', min: 0, max: 39.9, gpa: '0.0', label: 'Failing', color: '#EF4444', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.3)' },
];

export function GradingScaleModal({ visible, onClose }: GradingScaleModalProps) {
    const { isDark } = useTheme();

    // Mini test calculator
    const [calcScore, setCalcScore] = useState('');
    const [calcMax, setCalcMax] = useState('100');

    const scoreNum = parseFloat(calcScore);
    const maxNum = parseFloat(calcMax) || 100;
    const computedPct = !isNaN(scoreNum) && maxNum > 0 ? (scoreNum / maxNum) * 100 : null;

    const matchedScale = computedPct !== null
        ? DEFAULT_SCALE.find(s => computedPct >= s.min && (computedPct <= s.max || s.grade === 'A')) || DEFAULT_SCALE[DEFAULT_SCALE.length - 1]
        : null;

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
                                    Standard academic performance thresholds
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
                        {/* Quick Interactive Calculator */}
                        <View className={`p-4 rounded-2xl border mb-5 ${isDark ? 'bg-white/5 border-white/10' : 'bg-orange-50/50 border-orange-100'}`}>
                            <View className="flex-row items-center gap-2 mb-3">
                                <Calculator size={16} color="#FF6900" />
                                <Text className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                    Quick Grade Tester
                                </Text>
                            </View>
                            <View className="flex-row items-center gap-3">
                                <View className="flex-1">
                                    <Text className="text-[10px] text-gray-400 font-bold uppercase mb-1">Score</Text>
                                    <TextInput
                                        className={`rounded-xl px-3 py-2 text-sm font-bold border ${isDark ? 'bg-[#0F0B2E] border-gray-700 text-white' : 'bg-white border-gray-200 text-gray-900'}`}
                                        placeholder="e.g. 84"
                                        placeholderTextColor="#9CA3AF"
                                        keyboardType="numeric"
                                        value={calcScore}
                                        onChangeText={setCalcScore}
                                    />
                                </View>
                                <View className="flex-1">
                                    <Text className="text-[10px] text-gray-400 font-bold uppercase mb-1">Max Score</Text>
                                    <TextInput
                                        className={`rounded-xl px-3 py-2 text-sm font-bold border ${isDark ? 'bg-[#0F0B2E] border-gray-700 text-white' : 'bg-white border-gray-200 text-gray-900'}`}
                                        placeholder="100"
                                        placeholderTextColor="#9CA3AF"
                                        keyboardType="numeric"
                                        value={calcMax}
                                        onChangeText={setCalcMax}
                                    />
                                </View>
                            </View>

                            {matchedScale && computedPct !== null && (
                                <View className="mt-3 pt-3 border-t border-gray-200/40 dark:border-gray-700/40 flex-row items-center justify-between">
                                    <View>
                                        <Text className={`text-xs font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                            Calculated: <Text className="font-bold">{computedPct.toFixed(1)}%</Text>
                                        </Text>
                                        <Text className="text-[11px] text-gray-400 mt-0.5">
                                            Status: {matchedScale.label} • GPA: {matchedScale.gpa}
                                        </Text>
                                    </View>
                                    <View
                                        className="px-3 py-1 rounded-xl flex-row items-center gap-1.5"
                                        style={{ backgroundColor: matchedScale.bg, borderWidth: 1, borderColor: matchedScale.border }}
                                    >
                                        <Text className="font-extrabold text-sm" style={{ color: matchedScale.color }}>
                                            Grade {matchedScale.grade}
                                        </Text>
                                    </View>
                                </View>
                            )}
                        </View>

                        {/* Scale Table */}
                        <View className={`rounded-2xl border overflow-hidden ${isDark ? 'border-gray-800' : 'border-gray-100'}`}>
                            {/* Table Header */}
                            <View className={`flex-row px-4 py-2.5 border-b ${isDark ? 'bg-gray-800/60 border-gray-800' : 'bg-gray-100 border-gray-200'}`}>
                                <Text className="w-16 text-[10px] font-bold uppercase tracking-wider text-gray-400">Grade</Text>
                                <Text className="flex-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">Mark Range</Text>
                                <Text className="w-14 text-center text-[10px] font-bold uppercase tracking-wider text-gray-400">GPA</Text>
                                <Text className="w-24 text-right text-[10px] font-bold uppercase tracking-wider text-gray-400">Standing</Text>
                            </View>

                            {/* Table Rows */}
                            {DEFAULT_SCALE.map((row, idx) => (
                                <View
                                    key={row.grade}
                                    className={`flex-row items-center px-4 py-3 border-b ${isDark ? 'border-gray-800/60' : 'border-gray-50'} ${idx % 2 === 1 ? (isDark ? 'bg-white/[0.02]' : 'bg-gray-50/50') : ''}`}
                                >
                                    <View className="w-16 flex-row items-center">
                                        <View
                                            className="px-2 py-0.5 rounded-md"
                                            style={{ backgroundColor: row.bg, borderWidth: 1, borderColor: row.border }}
                                        >
                                            <Text className="text-xs font-bold" style={{ color: row.color }}>
                                                {row.grade}
                                            </Text>
                                        </View>
                                    </View>
                                    <Text className={`flex-1 text-xs font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
                                        {row.range}
                                    </Text>
                                    <Text className={`w-14 text-center text-xs font-bold ${isDark ? 'text-gray-300' : 'text-gray-800'}`}>
                                        {row.gpa}
                                    </Text>
                                    <Text className="w-24 text-right text-xs font-medium" style={{ color: row.color }}>
                                        {row.label}
                                    </Text>
                                </View>
                            ))}
                        </View>

                        <View className="mt-4 flex-row items-center gap-2 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
                            <HelpCircle size={14} color="#3B82F6" />
                            <Text className="flex-1 text-[11px] text-blue-600 dark:text-blue-400">
                                Letter grades and GPA points are calculated automatically upon entering student scores.
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
