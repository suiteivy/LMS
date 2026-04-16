import { UnifiedHeader } from "@/components/common/UnifiedHeader";
import { LibraryAPI } from "@/services/LibraryService";
import { FrontendBorrowedBook } from "@/types/types";
import { router, useLocalSearchParams } from "expo-router";
import { BookOpen, Clock, Info, BookMarked, MessageSquare } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { ActivityIndicator, RefreshControl, ScrollView, Text, View, TouchableOpacity } from "react-native";

export default function StudentLibraryPage() {
  const { studentId, studentName } = useLocalSearchParams<{ studentId: string; studentName?: string }>();
  const { isDark } = useTheme();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [borrowings, setBorrowings] = useState<FrontendBorrowedBook[]>([]);

  const fetchBorrowings = async () => {
    if (!studentId) return;
    try {
      const data = await LibraryAPI.getBorrowingHistory(studentId);
      const transformed = data.map(LibraryAPI.transformBorrowedBookData);
      setBorrowings(transformed as any);
    } catch (error) {
      console.error("Error fetching library data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchBorrowings();
  }, [studentId]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchBorrowings();
  };

  if (!studentId) {
    return (
      <View className="flex-1 bg-gray-50 dark:bg-navy">
        <UnifiedHeader
          title="Library"
          subtitle="Resource Access"
          role="Parent"
          onBack={() => router.back()}
          showNotification={false}
        />
        <View className="flex-1 items-center justify-center p-8">
             <View className="bg-white dark:bg-navy-surface p-10 rounded-[40px] border border-gray-100 dark:border-gray-800 items-center w-full">
            <BookOpen size={40} color="#FF6900" style={{ opacity: 0.6 }} />
            <Text className="text-gray-900 dark:text-white font-bold text-lg text-center mt-6">Select a Child First</Text>
            <TouchableOpacity onPress={() => router.replace("/(parent)" as any)} className="mt-8 bg-[#FF6900] px-8 py-4 rounded-2xl">
              <Text className="text-white font-bold">Go to Home</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  if (loading && !refreshing) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50 dark:bg-navy">
        <ActivityIndicator size="large" color="#FF6900" />
      </View>
    );
  }

  const activeLoans = borrowings.filter(b => b.status !== 'returned');
  const pastLoans = borrowings.filter(b => b.status === 'returned');

  return (
    <View className="flex-1 bg-gray-50 dark:bg-navy">
      <UnifiedHeader
        title={studentName ? `${studentName}'s Library` : "Library"}
        subtitle="Borrowed Books"
        role="Parent"
        onBack={() => router.back()}
        showNotification={false}
      />

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#FF6900"]} tintColor="#FF6900" />
        }
      >
        <View className="p-4 md:p-8">
          
          {/* Active Loans Section */}
          <View className="px-2 mb-6">
            <Text className="text-gray-900 dark:text-white font-bold text-xl tracking-tight">Active Borrowings</Text>
            <Text className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mt-1">Currently in possession</Text>
          </View>

          {activeLoans.length === 0 ? (
            <View className="bg-white dark:bg-navy-surface p-12 rounded-[40px] border border-dashed border-gray-100 dark:border-gray-800 items-center mb-10">
              <BookMarked size={40} color="#E5E7EB" />
              <Text className="text-gray-400 text-sm font-bold mt-4">No active loans</Text>
            </View>
          ) : (
            activeLoans.map((loan) => (
              <View 
                key={loan.id}
                className="bg-white dark:bg-navy-surface p-6 rounded-[32px] mb-6 border border-gray-50 dark:border-gray-800 shadow-sm"
              >
                <View className="flex-row justify-between items-start mb-6">
                    <View className="flex-1 pr-4">
                        <Text className="text-gray-900 dark:text-white font-black text-xl tracking-tight leading-tight" numberOfLines={2}>
                            {loan.bookTitle}
                        </Text>
                        <Text className="text-[#FF6900] text-[10px] font-black uppercase tracking-widest mt-1">
                            {loan.author}
                        </Text>
                    </View>
                    <View className={`px-3 py-1 rounded-full ${loan.status === 'overdue' ? 'bg-red-50 dark:bg-red-950/30 border-red-100' : 'bg-orange-50 dark:bg-orange-950/30 border-orange-100'} border`}>
                        <Text className={`text-[9px] font-black uppercase tracking-widest ${loan.status === 'overdue' ? 'text-red-600' : 'text-[#FF6900]'}`}>
                            {loan.status.replace('_', ' ')}
                        </Text>
                    </View>
                </View>

                <View className="flex-row gap-4 mb-6">
                    <View className="flex-1 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-2xl items-center border border-gray-100 dark:border-gray-700">
                        <Clock size={16} color="#9CA3AF" />
                        <Text className="text-gray-400 text-[8px] font-bold uppercase tracking-widest mt-2">Due Date</Text>
                        <Text className={`font-bold mt-0.5 ${loan.status === 'overdue' ? 'text-red-600' : 'text-gray-900 dark:text-white'}`}>
                            {new Date(loan.dueDate).toLocaleDateString()}
                        </Text>
                    </View>
                    <View className="flex-1 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-2xl items-center border border-gray-100 dark:border-gray-700">
                        <BookOpen size={16} color="#9CA3AF" />
                        <Text className="text-gray-400 text-[8px] font-bold uppercase tracking-widest mt-2">Borrowed</Text>
                        <Text className="text-gray-900 dark:text-white font-bold mt-0.5">
                            {new Date(loan.borrowDate).toLocaleDateString()}
                        </Text>
                    </View>
                </View>

                {loan.notes && (
                    <View className="bg-blue-50 dark:bg-blue-950/30 p-4 rounded-2xl flex-row items-start border border-blue-100 dark:border-blue-900">
                        <MessageSquare size={16} color="#3B82F6" style={{ marginTop: 2 }} />
                        <View className="flex-1 ml-3">
                            <Text className="text-blue-800 dark:text-blue-400 text-[8px] font-black uppercase tracking-widest mb-1">Teacher Remarks</Text>
                            <Text className="text-blue-700 dark:text-blue-300 text-xs leading-5 font-medium">{loan.notes}</Text>
                        </View>
                    </View>
                )}
              </View>
            ))
          )}

          {/* Past History */}
          {pastLoans.length > 0 && (
            <View className="mt-10">
                <View className="px-2 mb-6">
                    <Text className="text-gray-900 dark:text-white font-bold text-xl tracking-tight">Return History</Text>
                </View>
                {pastLoans.map((loan) => (
                    <View key={loan.id} className="bg-white dark:bg-navy-surface p-5 rounded-[28px] mb-4 flex-row items-center border border-gray-50 dark:border-gray-800 opacity-70">
                        <View className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-gray-800 items-center justify-center mr-4">
                            <BookMarked size={18} color="#9CA3AF" />
                        </View>
                        <View className="flex-1">
                            <Text className="text-gray-900 dark:text-white font-bold text-sm" numberOfLines={1}>{loan.bookTitle}</Text>
                            <Text className="text-gray-400 text-[9px] font-bold uppercase tracking-widest mt-1">Returned {new Date(loan.returnDate!).toLocaleDateString()}</Text>
                        </View>
                    </View>
                ))}
            </View>
          )}

        </View>
      </ScrollView>
    </View>
  );
}
