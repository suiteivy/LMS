import { X } from 'lucide-react-native';
import React from 'react';
import { Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native';

interface TestScore {
    title: string;
    mark: number;
    maxMark: number;
    weight: number;
}

interface GradeDetailModalProps {
    visible: boolean;
    onClose: () => void;
    subjectName: string;
    lecturerName: string;
    examMark: number;
    testScores: TestScore[];
}

export const GradeDetailModal = ({ visible, onClose, subjectName, lecturerName, examMark, testScores }: GradeDetailModalProps) => {
    return (
        <Modal visible={visible} animationType="slide" transparent>
            <View className="flex-1 bg-black/60 justify-end">
                <View className="bg-white dark:bg-[#121212] rounded-t-[40px] p-8 h-[80%] border-t border-gray-100 dark:border-gray-800">
                    <View className="flex-row justify-between items-center mb-8">
                        <Text className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Grade Details</Text>
                        <TouchableOpacity
                            className="w-10 h-10 bg-gray-50 dark:bg-[#1a1a1a] rounded-full items-center justify-center"
                            onPress={onClose}
                        >
                            <X size={20} color="#6B7280" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false}>
                        {/* Summary Card */}
                        <View className="bg-gray-900 dark:bg-[#1a1a1a] p-6 rounded-[32px] mb-8 shadow-xl border border-transparent dark:border-gray-800">
                            <View className="mb-4">
                                <Text className="text-white/40 dark:text-gray-500 text-[10px] font-bold uppercase tracking-[2px] mb-1">Subject</Text>
                                <Text className="text-white font-bold text-xl leading-tight">{subjectName}</Text>
                            </View>

                            <View className="flex-row justify-between border-t border-white/10 pt-4 mt-2">
                                <View>
                                    <Text className="text-white/40 dark:text-gray-500 text-[8px] font-bold uppercase tracking-widest mb-1">Lecturer</Text>
                                    <Text className="text-white font-bold text-sm">{lecturerName}</Text>
                                </View>
                                <View className="items-end">
                                    <Text className="text-white/40 dark:text-gray-500 text-[8px] font-bold uppercase tracking-widest mb-1">Final Exam</Text>
                                    <Text className="text-[#FF6900] font-bold text-lg">{examMark}%</Text>
                                </View>
                            </View>
                        </View>

                        {/* Test Scores Table */}
                        <View className="mb-6">
                            <Text className="text-gray-900 dark:text-white font-bold text-lg mb-4 tracking-tight px-1">Component Breakdown</Text>

                            {/* Table Header */}
                            <View className="flex-row px-4 py-3 bg-gray-50 dark:bg-[#1a1a1a] rounded-t-2xl border-x border-t border-gray-100 dark:border-gray-800">
                                <Text className="flex-1 text-gray-400 dark:text-gray-500 text-[10px] font-bold uppercase tracking-widest">Title</Text>
                                <Text className="w-16 text-center text-gray-400 dark:text-gray-500 text-[10px] font-bold uppercase tracking-widest">Mark</Text>
                                <Text className="w-16 text-right text-gray-400 dark:text-gray-500 text-[10px] font-bold uppercase tracking-widest">Weight</Text>
                            </View>

                            {/* Table Body */}
                            <View className="border border-gray-100 dark:border-gray-800 rounded-b-2xl overflow-hidden shadow-sm">
                                {testScores.length === 0 ? (
                                    <View className="p-8 bg-white dark:bg-[#1a1a1a] items-center">
                                        <Text className="text-gray-400 dark:text-gray-500 text-xs font-bold">No components found</Text>
                                    </View>
                                ) : (
                                    testScores.map((score, index) => (
                                        <View key={index} className={`flex-row px-4 py-4 bg-white dark:bg-[#1a1a1a] ${index < testScores.length - 1 ? 'border-b border-gray-50 dark:border-gray-800' : ''}`}>
                                            <Text className="flex-1 text-gray-900 dark:text-gray-100 font-bold text-sm" numberOfLines={1}>{score.title}</Text>
                                            <Text className="w-16 text-center text-gray-900 dark:text-gray-100 font-bold text-sm">{score.mark}/{score.maxMark}</Text>
                                            <Text className="w-16 text-right text-[#FF6900] font-black text-xs">{score.weight}%</Text>
                                        </View>
                                    ))
                                )}
                            </View>
                        </View>

                        <View className="bg-orange-50 dark:bg-orange-950/20 p-5 rounded-3xl border border-orange-100 dark:border-orange-900/30">
                            <Text className="text-orange-900 dark:text-orange-400 text-xs font-semibold leading-relaxed">
                                Note: This breakdown includes both formative and summative assessments.
                                Weights are applied to calculate your final cumulative grade.
                            </Text>
                        </View>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
};
