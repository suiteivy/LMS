import { UnifiedHeader } from "@/components/common/UnifiedHeader";
import { ListItemSkeleton } from "@/components/ui/skeletons";
import { useAuth } from '@/contexts/AuthContext';
import { LibraryAPI } from '@/services/LibraryService';
import { FrontendBook, FrontendBorrowedBook } from '@/types/types';
import { router } from "expo-router";
import { BookOpen, CheckCircle2, Clock, Filter, Info, Search, X } from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import { Modal, RefreshControl, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useRealtimeQuery } from '@/hooks/useRealtimeQuery';
import { SubscriptionGate } from "@/components/shared/SubscriptionComponents";
import { Zap } from "lucide-react-native";

export default function StudentLibrary() {
    const { studentId } = useAuth();
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedBook, setSelectedBook] = useState<FrontendBook | null>(null);
    const [modalVisible, setModalVisible] = useState(false);

    // Listen to realtime changes on the books table
    useRealtimeQuery('books', () => {
        if (!loading && !refreshing) {
            loadData();
        }
    });

    const [books, setBooks] = useState<FrontendBook[]>([]);
    const [borrowingHistory, setBorrowingHistory] = useState<FrontendBorrowedBook[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const loadData = useCallback(async () => {
        try {
            const [booksData, historyData] = await Promise.all([
                LibraryAPI.getBooks(),
                LibraryAPI.getBorrowingHistory()
            ]);

            const finalBooks = (Array.isArray(booksData) ? booksData : []).map(LibraryAPI.transformBookData);
            const finalHistory = (Array.isArray(historyData) ? historyData : []).map(LibraryAPI.transformBorrowedBookData);

            setBooks(finalBooks);
            setBorrowingHistory(finalHistory);
        } catch (error) {
            console.error("Error loading library data:", error);
            setBooks([]);
            setBorrowingHistory([]);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [studentId]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const onRefresh = () => {
        setRefreshing(true);
        loadData();
    };

    const filteredBooks = books.filter(book =>
        book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        book.author.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <View className="flex-1 bg-[#F6F8FA] dark:bg-[#161B22]">
            <UnifiedHeader
                title="Resources"
                subtitle="Library"
                role="Student"
                onBack={() => router.back()}
            />

            <SubscriptionGate 
                feature="library"
                fallback={
                    <View className="flex-1 items-center justify-center p-8">
                        <View className="bg-orange-50 p-8 rounded-xl items-center border border-orange-100 border-dashed max-w-sm">
                            <Zap size={48} color="#FF6900" style={{ marginBottom: 20 }} />
                            <Text className="text-xl font-bold text-gray-900 text-center mb-2">Library Locked</Text>
                            <Text className="text-gray-500 text-center mb-8 leading-5">
                                The Digital Library is not included in your current subscription plan.
                            </Text>
                        </View>
                    </View>
                }
            >

            <View className="p-4 md:p-8">
                {/* Informative Librarian-Mediated Banner */}
                <View className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/40 rounded-xl p-4 mb-5 flex-row items-start">
                    <Info size={18} color="#2563EB" style={{ marginTop: 2, marginRight: 10 }} />
                    <View className="flex-1">
                        <Text className="text-blue-900 dark:text-blue-200 font-bold text-xs">Librarian-Assisted Circulation</Text>
                        <Text className="text-blue-700 dark:text-blue-300 text-xs mt-0.5 leading-4">
                            All book checkouts and returns are processed in person by the school librarian. Browse available titles below and visit the library with your Student ID.
                        </Text>
                    </View>
                </View>

                {/* Search Header */}
                <View className="flex-row gap-3 mb-6">
                    <View className="flex-1 flex-row items-center bg-[#FFFFFF] dark:bg-[#161B22] px-5 py-3.5 rounded-xl border border-[#D0D7DE] dark:border-[#21262D] shadow-sm">
                        <Search size={18} color="#9CA3AF" />
                        <TextInput
                            placeholder="Find publications..."
                            placeholderTextColor="#9CA3AF"
                            className="flex-1 ml-3 text-gray-900 dark:text-white font-bold text-xs uppercase tracking-widest"
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                    </View>
                    <TouchableOpacity className="w-14 h-14 bg-[#FFFFFF] dark:bg-[#161B22] rounded-xl items-center justify-center border border-[#D0D7DE] dark:border-[#21262D] shadow-sm active:bg-gray-50">
                        <Filter size={20} color="#FF6900" />
                    </TouchableOpacity>
                </View>

                {loading ? (
                    <ListItemSkeleton loading={loading} count={4} label="Loading library books..." />
                ) : (
                    <ScrollView
                        className="flex-1"
                        showsVerticalScrollIndicator={false}
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#FF6900"]} />}
                        contentContainerStyle={{ paddingBottom: 200 }}
                    >
                        {/* Borrowing History */}
                        {borrowingHistory.filter(b => ['borrowed', 'active', 'overdue'].includes(b.status)).length > 0 && (
                            <>
                                <View className="px-2 mb-4">
                                    <Text className="text-gray-500 dark:text-gray-400 font-bold text-[10px] uppercase tracking-[3px]">Active Borrowing</Text>
                                </View>
                                {borrowingHistory.filter(b => ['borrowed', 'active', 'overdue'].includes(b.status)).map((borrow) => (
                                    <View key={borrow.id} className="bg-[#FFFFFF] dark:bg-[#161B22] p-5 rounded-xl border border-[#D0D7DE] dark:border-[#21262D] mb-3 flex-row items-center shadow-sm">
                                        <View className="w-12 h-12 rounded-xl bg-orange-50 dark:bg-orange-950/20 items-center justify-center mr-4">
                                            <BookOpen size={20} color="#FF6900" />
                                        </View>
                                        <View className="flex-1">
                                            <Text className="text-gray-900 dark:text-white font-bold text-base tracking-tight" numberOfLines={1}>{borrow.bookTitle}</Text>
                                            <Text className="text-gray-500 dark:text-gray-400 text-[10px] font-bold uppercase tracking-widest mt-1">
                                                {`Due ${new Date(borrow.dueDate).toLocaleDateString()}`}
                                            </Text>
                                            {borrow.issuerName && (
                                                <Text className="text-gray-400 text-[9px] mt-0.5">
                                                    Issued by: {borrow.issuerName}
                                                </Text>
                                            )}
                                        </View>
                                        <View className={`px-3 py-1 rounded-full ${borrow.status === 'overdue' ? 'bg-red-50 dark:bg-red-950/20 border-red-100 dark:border-red-900' : 'bg-orange-50 dark:bg-orange-950/20 border-orange-100 dark:border-orange-900'} border`}>
                                            <Text className={`font-bold text-[8px] uppercase tracking-widest ${borrow.status === 'overdue' ? 'text-red-600' : 'text-[#FF6900]'}`}>{borrow.status}</Text>
                                        </View>
                                    </View>
                                ))}
                                <View className="h-6" />
                            </>
                        )}

                        {/* Catalog */}
                        <View className="px-2 mb-4">
                            <Text className="text-gray-500 dark:text-gray-400 font-bold text-[10px] uppercase tracking-[3px]">Digital Catalog</Text>
                        </View>
                        {filteredBooks.length === 0 ? (
                            <View className="bg-[#FFFFFF] dark:bg-[#161B22] p-12 rounded-xl items-center border border-[#D0D7DE] dark:border-[#21262D] border-dashed mt-4">
                                <Search size={48} color="#E5E7EB" style={{ opacity: 0.3 }} />
                                <Text className="text-gray-500 dark:text-gray-400 font-bold text-center mt-6">No matches found</Text>
                            </View>
                        ) : (
                            filteredBooks.map((item) => (
                                <TouchableOpacity
                                    key={item.id}
                                    activeOpacity={0.7}
                                    onPress={() => {
                                        setSelectedBook(item);
                                        setModalVisible(true);
                                    }}
                                    className="bg-[#FFFFFF] dark:bg-[#161B22] p-5 rounded-xl border border-[#D0D7DE] dark:border-[#21262D] mb-4 flex-row items-center shadow-sm active:bg-gray-50 dark:active:bg-gray-900"
                                >
                                    <View className={`p-4 rounded-xl mr-4 ${item.available > 0 ? 'bg-orange-50 dark:bg-orange-950/20' : 'bg-gray-50 dark:bg-[#161B22]'}`}>
                                        <BookOpen size={22} color={item.available > 0 ? "#FF6900" : "#9CA3AF"} />
                                    </View>
                                    <View className="flex-1">
                                        <Text className="text-[#FF6900] text-[8px] font-bold uppercase tracking-[2px] mb-1">{item.category}</Text>
                                        <Text className="text-gray-900 dark:text-white font-bold text-base leading-tight" numberOfLines={1}>{item.title}</Text>
                                        <Text className="text-gray-500 dark:text-gray-400 text-xs font-medium">{item.author}</Text>
                                    </View>
                                    <View className={`px-2 py-0.5 rounded-full ${item.available > 0 ? 'bg-orange-500' : 'bg-gray-100 dark:bg-[#161B22]'}`}>
                                        <Text className={`font-bold text-[8px] uppercase tracking-widest ${item.available > 0 ? 'text-white' : 'text-gray-500 dark:text-gray-400'}`}>
                                            {item.available > 0 ? `${item.available} Left` : 'Out of stock'}
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            ))
                        )}
                    </ScrollView>
                )}
            </View>

            {/* Read-only Book Details Modal */}
            <Modal animationType="slide" transparent visible={modalVisible}>
                <View className="flex-1 bg-black/60 justify-end">
                    <View className="bg-[#FFFFFF] dark:bg-[#161B22] rounded-t-[50px] p-8 pb-12 border-t border-[#D0D7DE] dark:border-[#21262D]">
                        <View className="flex-row justify-between items-start mb-6">
                            <View className="flex-1 pr-6">
                                <Text className="text-[#FF6900] font-bold text-[10px] uppercase tracking-[3px] mb-2">{selectedBook?.category}</Text>
                                <Text className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight leading-tight">{selectedBook?.title}</Text>
                                <Text className="text-gray-500 dark:text-gray-400 font-bold text-sm mt-1">by {selectedBook?.author}</Text>
                                {selectedBook?.isbn && (
                                    <Text className="text-gray-400 text-xs mt-1">ISBN: {selectedBook.isbn}</Text>
                                )}
                            </View>
                            <TouchableOpacity onPress={() => setModalVisible(false)} className="w-10 h-10 bg-gray-50 dark:bg-[#161B22] rounded-full items-center justify-center">
                                <X size={20} color="#6B7280" />
                            </TouchableOpacity>
                        </View>

                        <View className="flex-row gap-4 mb-6">
                            <View className="flex-1 bg-[#F6F8FA] dark:bg-[#161B22] p-5 rounded-xl border border-[#D0D7DE] dark:border-[#21262D] items-center justify-center">
                                <Clock size={20} color="#FF6900" />
                                <Text className="text-gray-500 dark:text-gray-400 text-[8px] font-bold uppercase tracking-widest mt-2">Standard Loan</Text>
                                <Text className="text-gray-900 dark:text-white font-bold text-base mt-1">14 Days</Text>
                            </View>
                            <View className="flex-1 bg-[#F6F8FA] dark:bg-[#161B22] p-5 rounded-xl border border-[#D0D7DE] dark:border-[#21262D] items-center justify-center">
                                <CheckCircle2 size={20} color="#FF6900" />
                                <Text className="text-gray-500 dark:text-gray-400 text-[8px] font-bold uppercase tracking-widest mt-2">Available</Text>
                                <Text className="text-gray-900 dark:text-white font-bold text-base mt-1">{selectedBook?.available} Copies</Text>
                            </View>
                        </View>

                        <View className="bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900/40 rounded-xl p-4 mb-6">
                            <Text className="text-orange-900 dark:text-orange-200 font-bold text-xs mb-1">How to check out this book:</Text>
                            <Text className="text-orange-800 dark:text-orange-300 text-xs leading-4">
                                Please visit the school library during open hours. An authorized librarian will issue this book to your student account.
                            </Text>
                        </View>

                        <TouchableOpacity
                            className="py-4 rounded-xl items-center bg-gray-900 dark:bg-gray-800 active:bg-gray-700"
                            onPress={() => setModalVisible(false)}
                        >
                            <Text className="text-white font-bold text-base">Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            </SubscriptionGate>
        </View>
    );
}
