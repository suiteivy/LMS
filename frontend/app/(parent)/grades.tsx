import { UnifiedHeader } from "@/components/common/UnifiedHeader";
import { router } from "expo-router";
import { BookOpen, LayoutList, Star, TrendingUp } from "lucide-react-native";
import React from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";

const DUMMY_PERFORMANCE = {
  gpa: "3.7",
  class_rank: "4",
  class_size: "40",
  attendance_pct: "92",
};

const DUMMY_EXAM_RESULTS = [
  { id: "1", title: "Mid-Term Mathematics", subject: "Mathematics", score: 88, max_score: 100, grade: "A", feedback: "Excellent work! Strong algebra skills. Keep it up with geometry." },
  { id: "2", title: "English Composition", subject: "English", score: 76, max_score: 100, grade: "B+", feedback: "Good structure and vocabulary. Work on thesis clarity." },
  { id: "3", title: "Biology CAT 2", subject: "Biology", score: 91, max_score: 100, grade: "A+", feedback: "Outstanding! Perfect understanding of cell theory." },
  { id: "4", title: "History Essay", subject: "History", score: 70, max_score: 100, grade: "B", feedback: "Good factual recall. Improve analysis and citations." },
  { id: "5", title: "Physics Practicals", subject: "Physics", score: 83, max_score: 100, grade: "A-", feedback: "Accurate readings and good lab report structure." },
];

const gradeColor = (g: string) => {
  if (g.startsWith("A")) return { bg: "bg-emerald-50", text: "text-emerald-700" };
  if (g.startsWith("B")) return { bg: "bg-blue-50", text: "text-blue-700" };
  return { bg: "bg-amber-50", text: "text-amber-700" };
};

export default function StudentGradesPage() {
  return (
    <View className="flex-1 bg-gray-50 dark:bg-black">
      <UnifiedHeader
        title="Intelligence"
        subtitle="Performance"
        role="Parent"
        onBack={() => router.back()}
        showNotification={false}
      />

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 150 }}
      >
        <View className="p-4 md:p-8">
          {/* GPA Hero Section */}
          <View className="bg-gray-900 p-8 rounded-[48px] shadow-2xl mb-8">
            <View className="flex-row justify-between items-start mb-10">
              <View>
                <Text className="text-white/40 text-[10px] font-bold uppercase tracking-[3px] mb-2">Cumulative Index</Text>
                <Text className="text-white text-6xl font-black tracking-tighter">{DUMMY_PERFORMANCE.gpa}</Text>
                <Text className="text-[#FF6900] text-xs font-bold mt-2 uppercase tracking-widest">Distinction Runner</Text>
              </View>
              <View className="bg-[#FF6900] p-4 rounded-3xl shadow-lg">
                <TrendingUp size={28} color="white" />
              </View>
            </View>

            {/* Performance Grid */}
            <View className="flex-row justify-between pt-8 border-t border-white/10">
              <View className="items-center">
                <Text className="text-white/30 text-[8px] font-bold uppercase tracking-widest">Cohort Rank</Text>
                <Text className="text-white font-bold text-xl mt-1">#4 / 40</Text>
              </View>
              <View className="items-center border-x border-white/10 px-8">
                <Text className="text-white/30 text-[8px] font-bold uppercase tracking-widest">Attendance</Text>
                <Text className="text-white font-bold text-xl mt-1">{DUMMY_PERFORMANCE.attendance_pct}%</Text>
              </View>
              <View className="items-center">
                <Text className="text-white/30 text-[8px] font-bold uppercase tracking-widest">Standing</Text>
                <Text className="text-emerald-400 font-bold text-xl mt-1">Excellent</Text>
              </View>
            </View>
          </View>

          {/* Transcript Breakdown */}
          <View className="px-2 flex-row justify-between items-center mb-6">
            <Text className="text-gray-900 dark:text-white font-bold text-xl tracking-tight">Academic Transcript</Text>
            <TouchableOpacity className="bg-white dark:bg-[#1a1a1a] p-2 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm">
              <LayoutList size={16} color="#FF6900" />
            </TouchableOpacity>
          </View>

          {DUMMY_EXAM_RESULTS.map((result) => {
            const gc = gradeColor(result.grade);
            return (
              <View key={result.id} className="bg-white dark:bg-[#1a1a1a] p-6 rounded-[32px] mb-4 border border-gray-50 dark:border-gray-800 shadow-sm">
                <View className="flex-row justify-between items-center mb-6">
                  <View className="flex-row items-center flex-1">
                    <View className="w-10 h-10 rounded-2xl bg-orange-50 items-center justify-center mr-3">
                      <BookOpen size={18} color="#FF6900" />
                    </View>
                    <View>
                      <Text className="text-gray-900 dark:text-white font-bold text-base tracking-tight">{result.subject}</Text>
                      <Text className="text-gray-400 text-[8px] font-bold uppercase tracking-widest mt-0.5">{result.title}</Text>
                    </View>
                  </View>
                  <View className="items-end">
                    <View className={`${gc.bg} px-3 py-1 rounded-full mb-1`}>
                      <Text className={`${gc.text} font-black text-xs uppercase tracking-widest`}>{result.grade}</Text>
                    </View>
                    <Text className="text-gray-400 text-[8px] font-bold uppercase tracking-widest">{result.score}% Accuracy</Text>
                  </View>
                </View>

                {result.feedback && (
                  <View className="bg-gray-50 dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700">
                    <View className="flex-row items-center mb-3">
                      <Star size={14} color="#FF6900" />
                      <Text className="text-gray-400 text-[8px] font-bold uppercase tracking-widest ml-2">Faculty Evaluation</Text>
                    </View>
                    <Text className="text-gray-600 dark:text-gray-300 text-xs font-medium leading-5">{result.feedback}</Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

