import { UnifiedHeader } from "@/components/common/UnifiedHeader";
import { ListItemSkeleton } from "@/components/ui/skeletons";
import { useAuth } from '@/contexts/AuthContext';
import { LibraryAPI } from '@/services/LibraryService';
import { FrontendBook, FrontendBorrowedBook } from '@/types/types';
import { router } from "expo-router";
import { BookOpen, CheckCircle2, ChevronRight, Clock, Info, Search, X, Zap } from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import { Modal, RefreshControl, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useRealtimeQuery } from '@/hooks/useRealtimeQuery';
import { SubscriptionGate } from "@/components/shared/SubscriptionComponents";

export default function TeacherLibrary() {
    const { teacherId, isLibrarian } = useAuth();
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
                teacherId ? LibraryAPI.getBorrowingHistory() : Promise.resolve([])
            ]);

            const finalBooks = booksData.map(LibraryAPI.transformBookData);
            const finalHistory = historyData.map(LibraryAPI.transformBorrowedBookData);

            setBooks(finalBooks as any);
            setBorrowingHistory(finalHistory as any);
        } catch (error) {
            console.error("Error loading library data:", error);
            setBooks([]);
            setBorrowingHistory([]);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [teacherId]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const onRefresh = () => {
        setRefreshing(true);
        loadData();
    };

    const activeBorrows = borrowingHistory.filter(b => ['borrowed', 'active', 'overdue'].includes(b.status));

    const filteredBooks = books.filter(book =>
        book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        book.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (book.category && book.category.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    return (
        <View className="flex-1 bg-[#FFFFFF] dark:bg-[#161B22]">
            <UnifiedHeader
                title="Resources"
                subtitle="Library Catalog"
                role="Teacher"
                onBack={() => router.back()}
            />

            <SubscriptionGate
                feature="library"
                fallback={
                    <View className="flex-1 items-center justify-center p-8">
                        <View className="bg-orange-50 p-8 rounded-[40px] items-center border border-orange-100 border-dashed max-w-sm">
                            <Zap size={48} color="#FF6900" style={{ marginBottom: 20 }} />
                            <Text className="text-xl font-bold text-gray-900 text-center mb-2">Library Locked</Text>
                            <Text className="text-gray-500 text-center mb-8 leading-5">
                                The Digital Library is not included in your current subscription plan.
                            </Text>
                        </View>
                    </View>
                }
            >
                {/* Librarian Circulation Banner or Physical Library Notice */}
                {isLibrarian ? (
                    <TouchableOpacity
                        onPress={() => router.push('/(teacher)/management/library' as any)}
                        activeOpacity={0.8}
                        className="mx-4 mt-4 p-4 rounded-2xl bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 flex-row items-center justify-between"
                    >
                        <View className="flex-1 mr-3">
                            <View className="flex-row items-center gap-2 mb-1">
                                <View className="bg-[#FF6900] px-2 py-0.5 rounded-full">
                                    <Text className="text-white text-[8px] font-black uppercase tracking-wider">Librarian</Text>
                                </View>
                                <Text className="text-gray-900 dark:text-white font-bold text-sm">Circulation Desk</Text>
                            </View>
                            <Text className="text-gray-600 dark:text-gray-300 text-xs">
                                You are a designated Librarian. Tap to issue, return, and inspect book loans.
                            </Text>
                        </View>
                        <ChevronRight size={20} color="#FF6900" />
                    </TouchableOpacity>
                ) : (
                    <View className="mx-4 mt-4 p-4 rounded-2xl bg-[#F6F8FA] dark:bg-[#161B22] border border-[#D0D7DE] dark:border-[#21262D] flex-row items-center">
                        <View className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-950/30 items-center justify-center mr-3">
                            <Info size={20} color="#FF6900" />
                        </View>
                        <View className="flex-1">
                            <Text className="text-gray-900 dark:text-white font-bold text-xs uppercase tracking-wider">In-Person Circulation</Text>
                            <Text className="text-gray-500 dark:text-gray-400 text-xs mt-0.5 leading-4">
                                Book checkouts and returns must be processed in person with the designated school librarian.
                            </Text>
                        </View>
                    </View>
                )}

                <View className="p-4 md:p-8 flex-1">
                    {/* Search Header */}
                    <View className="flex-row gap-3 mb-6">
                        <View className="flex-1 flex-row items-center bg-[#F6F8FA] dark:bg-[#161B22] px-5 py-3.5 rounded-xl border border-[#D0D7DE] dark:border-[#21262D]">
                            <Search size={18} color="#9CA3AF" />
                            <TextInput
                                placeholder="Search by title, author, or category..."
                                placeholderTextColor="#9CA3AF"
                                className="flex-1 ml-3 text-gray-900 dark:text-white font-medium text-xs"
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                            />
                            {searchQuery.length > 0 && (
                                <TouchableOpacity onPress={() => setSearchQuery("")}>
                                    <X size={16} color="#9CA3AF" />
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>

                    {loading ? (
                        <ListItemSkeleton loading={loading} count={4} label="Loading library catalog..." />
                    ) : (
                        <ScrollView
                            className="flex-1"
                            showsVerticalScrollIndicator={false}
                            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#FF6900"]} />}
                            contentContainerStyle={{ paddingBottom: 120 }}
                        >
                            {/* Personal Active Loans */}
                            {activeBorrows.length > 0 && (
                                <View className="mb-6">
                                    <View className="px-2 mb-3">
                                        <Text className="text-gray-400 dark:text-gray-500 font-bold text-[10px] uppercase tracking-[3px]">My Borrowed Books ({activeBorrows.length})</Text>
                                    </View>
                                    {activeBorrows.map((borrow) => (
                                        <View key={borrow.id} className="bg-[#F6F8FA] dark:bg-[#161B22] p-5 rounded-2xl border border-[#D0D7DE] dark:border-[#21262D] mb-3 flex-row items-center">
                                            <View className="w-12 h-12 rounded-xl bg-orange-50 dark:bg-orange-950/20 items-center justify-center mr-4">
                                                <BookOpen size={20} color="#FF6900" />
                                            </View>
                                            <View className="flex-1">
                                                <Text className="text-gray-900 dark:text-white font-bold text-base tracking-tight" numberOfLines={1}>{borrow.bookTitle}</Text>
                                                <Text className="text-gray-400 dark:text-gray-500 text-xs mt-0.5">
                                                    by {borrow.author}
                                                </Text>
                                                <View className="flex-row items-center gap-3 mt-1.5 flex-wrap">
                                                    <Text className="text-gray-500 dark:text-gray-400 text-[10px] font-bold uppercase tracking-widest">
                                                        Due: {new Date(borrow.dueDate).toLocaleDateString()}
                                                    </Text>
                                                    {borrow.issuerName && (
                                                        <Text className="text-[#FF6900] text-[10px] font-bold">
                                                            Issued by: {borrow.issuerName}
                                                        </Text>
                                                    )}
                                                </View>
                                            </View>
                                            <View className={`px-3 py-1 rounded-full ${borrow.status === 'overdue' ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900' : 'bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-900'} border`}>
                                                <Text className={`font-bold text-[9px] uppercase tracking-widest ${borrow.status === 'overdue' ? 'text-red-600' : 'text-[#FF6900]'}`}>
                                                    {borrow.status}
                                                </Text>
                                            </View>
                                        </View>
                                    ))}
                                </View>
                            )}

                            {/* Catalog */}
                            <View className="px-2 mb-3">
                                <Text className="text-gray-400 dark:text-gray-500 font-bold text-[10px] uppercase tracking-[3px]">Digital Catalog ({filteredBooks.length})</Text>
                            </View>

                            {filteredBooks.length === 0 ? (
                                <View className="bg-[#F6F8FA] dark:bg-[#161B22] p-12 rounded-3xl items-center border border-[#D0D7DE] dark:border-[#21262D] border-dashed mt-2">
                                    <Search size={40} color="#9CA3AF" style={{ opacity: 0.5 }} />
                                    <Text className="text-gray-400 dark:text-gray-500 font-bold text-center mt-4">No publications found</Text>
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
                                        className="bg-[#F6F8FA] dark:bg-[#161B22] p-4 rounded-2xl border border-[#D0D7DE] dark:border-[#21262D] mb-3 flex-row items-center"
                                    >
                                        <View className={`p-3.5 rounded-xl mr-4 ${item.available > 0 ? 'bg-orange-50 dark:bg-orange-950/20' : 'bg-gray-100 dark:bg-[#21262D]'}`}>
                                            <BookOpen size={22} color={item.available > 0 ? "#FF6900" : "#9CA3AF"} />
                                        </View>
                                        <View className="flex-1">
                                            <Text className="text-[#FF6900] text-[8px] font-bold uppercase tracking-[2px] mb-0.5">{item.category}</Text>
                                            <Text className="text-gray-900 dark:text-white font-bold text-sm leading-tight" numberOfLines={1}>{item.title}</Text>
                                            <Text className="text-gray-400 dark:text-gray-500 text-xs mt-0.5 font-medium">{item.author}</Text>
                                        </View>
                                        <View className={`px-2.5 py-1 rounded-full ${item.available > 0 ? 'bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800' : 'bg-gray-100 dark:bg-[#21262D]'}`}>
                                            <Text className={`font-bold text-[9px] uppercase tracking-widest ${item.available > 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-gray-400 dark:text-gray-500'}`}>
                                                {item.available > 0 ? `${item.available} Available` : 'Checked Out'}
                                            </Text>
                                        </View>
                                    </TouchableOpacity>
                                ))
                            )}
                        </ScrollView>
                    )}
                </View>

                {/* Read-Only Book Details Modal */}
                <Modal animationType="slide" transparent visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
                    <View className="flex-1 bg-black/60 justify-end">
                        <View className="bg-[#FFFFFF] dark:bg-[#161B22] rounded-t-[40px] p-8 pb-12 border-t border-[#D0D7DE] dark:border-[#21262D]">
                            <View className="flex-row justify-between items-start mb-6">
                                <View className="flex-1 pr-4">
                                    <Text className="text-[#FF6900] font-bold text-[10px] uppercase tracking-[3px] mb-2">{selectedBook?.category}</Text>
                                    <Text className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight leading-tight">{selectedBook?.title}</Text>
                                    <Text className="text-gray-400 dark:text-gray-500 font-bold text-sm mt-1">by {selectedBook?.author}</Text>
                                    {selectedBook?.isbn && (
                                        <Text className="text-gray-400 text-xs mt-1">ISBN: {selectedBook.isbn}</Text>
                                    )}
                                </View>
                                <TouchableOpacity onPress={() => setModalVisible(false)} className="w-10 h-10 bg-gray-100 dark:bg-[#21262D] rounded-full items-center justify-center">
                                    <X size={20} color="#6B7280" />
                                </TouchableOpacity>
                            </View>

                            <View className="flex-row gap-4 mb-8">
                                <View className="flex-1 bg-[#F6F8FA] dark:bg-[#161B22] p-5 rounded-2xl border border-[#D0D7DE] dark:border-[#21262D] items-center justify-center">
                                    <Clock size={20} color="#FF6900" />
                                    <Text className="text-gray-400 dark:text-gray-500 text-[8px] font-bold uppercase tracking-widest mt-2">Standard Loan</Text>
                                    <Text className="text-gray-900 dark:text-white font-bold text-base mt-1">14 Days</Text>
                                </View>
                                <View className="flex-1 bg-[#F6F8FA] dark:bg-[#161B22] p-5 rounded-2xl border border-[#D0D7DE] dark:border-[#21262D] items-center justify-center">
                                    <CheckCircle2 size={20} color={selectedBook && selectedBook.available > 0 ? "#10B981" : "#9CA3AF"} />
                                    <Text className="text-gray-400 dark:text-gray-500 text-[8px] font-bold uppercase tracking-widest mt-2">Inventory</Text>
                                    <Text className="text-gray-900 dark:text-white font-bold text-base mt-1">
                                        {selectedBook?.available ?? 0} of {selectedBook?.quantity ?? 0}
                                    </Text>
                                </View>
                            </View>

                            {/* In-Person Circulation Info */}
                            <View className="bg-orange-50 dark:bg-orange-950/20 p-4 rounded-2xl border border-orange-200 dark:border-orange-800 mb-6 flex-row items-center">
                                <Info size={20} color="#FF6900" />
                                <Text className="text-orange-900 dark:text-orange-200 text-xs font-medium ml-3 flex-1">
                                    Self-checkout is disabled. To borrow or return physical books, please visit the designated librarian desk.
                                </Text>
                            </View>

                            {isLibrarian && (
                                <TouchableOpacity
                                    onPress={() => {
                                        setModalVisible(false);
                                        router.push('/(teacher)/management/library' as any);
                                    }}
                                    className="py-4 bg-[#FF6900] rounded-xl items-center mb-3"
                                >
                                    <Text className="text-white font-bold text-sm uppercase tracking-wider">Open Librarian Desk</Text>
                                </TouchableOpacity>
                            )}

                            <TouchableOpacity
                                onPress={() => setModalVisible(false)}
                                className="py-4 bg-gray-100 dark:bg-[#21262D] rounded-xl items-center"
                            >
                                <Text className="text-gray-700 dark:text-gray-300 font-bold text-sm">Close</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>
            </SubscriptionGate>
        </View>
    );
}
