import { AlertCircle, BookOpen, TrendingUp } from "lucide-react-native";
import React from "react";
import { ScrollView, Text, View } from "react-native";

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
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white px-6 pt-12 pb-6 border-b border-gray-100">
        <Text className="text-2xl font-bold text-gray-900">Academic Records</Text>
        <Text className="text-gray-500 text-sm mt-1">Ethan Kamau — Grade 9A · Demo Data</Text>
      </View>

      <ScrollView className="flex-1 px-6 pt-6" showsVerticalScrollIndicator={false}>
        {/* Summary Card */}
        <View className="bg-[#FF6B00] p-6 rounded-[40px] mb-6 shadow-lg shadow-orange-200">
          <View className="flex-row justify-between items-center mb-6">
            <View>
              <Text className="text-orange-100 text-xs font-bold uppercase mb-1">Current GPA</Text>
              <Text className="text-white text-5xl font-bold">{DUMMY_PERFORMANCE.gpa}</Text>
            </View>
            <View className="bg-white/20 p-4 rounded-3xl">
              <TrendingUp size={32} color="white" />
            </View>
          </View>
          <View className="flex-row gap-4">
            <View className="flex-1 bg-white/10 p-4 rounded-3xl">
              <Text className="text-orange-100 text-[10px] font-bold uppercase">Class Rank</Text>
              <Text className="text-white text-xl font-bold">#{DUMMY_PERFORMANCE.class_rank}/{DUMMY_PERFORMANCE.class_size}</Text>
            </View>
            <View className="flex-1 bg-white/10 p-4 rounded-3xl">
              <Text className="text-orange-100 text-[10px] font-bold uppercase">Attendance</Text>
              <Text className="text-white text-xl font-bold">{DUMMY_PERFORMANCE.attendance_pct}%</Text>
            </View>
          </View>
        </View>

        {/* Exam Results */}
        <Text className="text-lg font-bold text-gray-900 mb-4 ml-2">Recent Exam Results</Text>
        {DUMMY_EXAM_RESULTS.map((result) => {
          const gc = gradeColor(result.grade);
          return (
            <View key={result.id} className="bg-white p-5 rounded-3xl mb-4 border border-gray-100 shadow-sm">
              <View className="flex-row justify-between items-start mb-3">
                <View className="flex-1">
                  <View className="flex-row items-center mb-1">
                    <BookOpen size={16} color="#FF6B00" />
                    <Text className="text-gray-900 font-bold ml-2 text-base">{result.title}</Text>
                  </View>
                  <Text className="text-gray-400 text-xs ml-6">{result.subject}</Text>
                </View>
                <View className="items-end gap-1">
                  <View className={`px-3 py-1 rounded-full ${gc.bg}`}>
                    <Text className={`font-black text-sm ${gc.text}`}>{result.grade}</Text>
                  </View>
                  <Text className="text-gray-400 text-xs">{result.score}/{result.max_score}</Text>
                </View>
              </View>
              {result.feedback && (
                <View className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                  <View className="flex-row items-center mb-2">
                    <AlertCircle size={14} color="#6B7280" />
                    <Text className="text-gray-400 text-[10px] font-bold uppercase ml-2">Teacher Feedback</Text>
                  </View>
                  <Text className="text-gray-600 text-sm leading-5">{result.feedback}</Text>
                </View>
              )}
            </View>
          );
        })}
        <View className="h-20" />
      </ScrollView>
    </View>
  );
}
