import { UnifiedHeader } from "@/components/common/UnifiedHeader";
import demoData from "@/constants/demoData";
import { useAuth } from '@/contexts/AuthContext';
import { LibraryAPI } from '@/services/LibraryService';
import { FrontendBook, FrontendBorrowedBook } from '@/types/types';
import { router } from "expo-router";
import { BookOpen, CheckCircle2, Clock, Filter, Search, X } from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, RefreshControl, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useRealtimeQuery } from '@/hooks/useRealtimeQuery';

export default function StudentLibrary() {
    const { studentId } = useAuth();
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedBook, setSelectedBook] = useState<FrontendBook | null>(null);
    const [modalVisible, setModalVisible] = useState(false);

    // Listen to realtime changes on the books table
    useRealtimeQuery('books', () => {
        if (!loading && !actionLoading && !refreshing) {
            loadData();
        }
    });

    const [books, setBooks] = useState<FrontendBook[]>([]);
    const [borrowingHistory, setBorrowingHistory] = useState<FrontendBorrowedBook[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);

    const loadData = useCallback(async () => {
        try {
            const [booksData, historyData] = await Promise.all([
                LibraryAPI.getBooks(),
                studentId ? LibraryAPI.getBorrowingHistory(studentId) : Promise.resolve([])
            ]);

            const finalBooks = booksData.length > 0
                ? booksData.map(LibraryAPI.transformBookData)
                : demoData.MOCK_LIBRARY.catalog;

            const finalHistory = historyData.length > 0
                ? historyData.map(LibraryAPI.transformBorrowedBookData)
                : demoData.MOCK_LIBRARY.activity;

            setBooks(finalBooks as any);
            setBorrowingHistory(finalHistory as any);
        } catch (error) {
            console.error("Error loading library data:", error);
            setBooks(demoData.MOCK_LIBRARY.catalog as any);
            setBorrowingHistory(demoData.MOCK_LIBRARY.activity as any);
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

    const handleBorrow = async (book: FrontendBook) => {
        setActionLoading(true);
        if (!studentId) {
            setTimeout(() => {
                const newBorrow: any = {
                    id: Math.random().toString(),
                    bookTitle: book.title,
                    status: 'waiting',
                    dueDate: new Date(Date.now() + 1209600000).toISOString() as any,
                    borrowDate: new Date().toISOString() as any,
                };
                setBorrowingHistory(prev => [newBorrow, ...prev]);
                Alert.alert("Request Sent", `Successfully requested "${book.title}".`);
                setModalVisible(false);
                setActionLoading(false);
            }, 1000);
            return;
        }

        try {
            const dueDate = new Date();
            dueDate.setDate(dueDate.getDate() + 14);
            await LibraryAPI.borrowBook(book.id, dueDate.toISOString() as any);
            Alert.alert("Success", `You have successfully borrowed "${book.title}".`);
            setModalVisible(false);
            loadData();
        } catch (error: any) {
            Alert.alert("Borrowing Failed", error.response?.data?.error || "Failed to borrow book.");
        } finally {
            setActionLoading(false);
        }
    };

    const filteredBooks = books.filter(book =>
        book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        book.author.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <View className="flex-1 bg-gray-50 dark:bg-black">
            <UnifiedHeader
                title="Resources"
                subtitle="Library"
                role="Student"
                onBack={() => router.back()}
            />

            <View className="p-4 md:p-8">
                {/* Search Header */}
                <View className="flex-row gap-3 mb-8">
                    <View className="flex-1 flex-row items-center bg-white dark:bg-[#1a1a1a] px-5 py-3.5 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
                        <Search size={18} color="#9CA3AF" />
                        <TextInput
                            placeholder="Find publications..."
                            placeholderTextColor="#9CA3AF"
                            className="flex-1 ml-3 text-gray-900 dark:text-white font-bold text-xs uppercase tracking-widest"
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                    </View>
                    <TouchableOpacity className="w-14 h-14 bg-white dark:bg-[#1a1a1a] rounded-2xl items-center justify-center border border-gray-100 dark:border-gray-800 shadow-sm active:bg-gray-50">
                        <Filter size={20} color="#FF6900" />
                    </TouchableOpacity>
                </View>

                {loading ? (
                    <ActivityIndicator size="large" color="#FF6900" className="mt-8" />
                ) : (
                    <ScrollView
                        className="flex-1"
                        showsVerticalScrollIndicator={false}
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#FF6900"]} />}
                        contentContainerStyle={{ paddingBottom: 200 }}
                    >
                        {/* Borrowing History */}
                        {borrowingHistory.filter(b => ['borrowed', 'waiting', 'ready_for_pickup', 'overdue'].includes(b.status)).length > 0 && (
                            <>
                                <View className="px-2 mb-4">
                                    <Text className="text-gray-400 dark:text-gray-500 font-bold text-[10px] uppercase tracking-[3px]">Active Borrowing</Text>
                                </View>
                                {borrowingHistory.filter(b => ['borrowed', 'waiting', 'ready_for_pickup', 'overdue'].includes(b.status)).map((borrow) => (
                                    <View key={borrow.id} className="bg-white dark:bg-[#1a1a1a] p-5 rounded-3xl border border-gray-100 dark:border-gray-800 mb-3 flex-row items-center shadow-sm">
                                        <View className="w-12 h-12 rounded-2xl bg-orange-50 dark:bg-orange-950/20 items-center justify-center mr-4">
                                            <BookOpen size={20} color="#FF6900" />
                                        </View>
                                        <View className="flex-1">
                                            <Text className="text-gray-900 dark:text-white font-bold text-base tracking-tight" numberOfLines={1}>{borrow.bookTitle}</Text>
                                            <Text className="text-gray-400 dark:text-gray-500 text-[10px] font-bold uppercase tracking-widest mt-1">
                                                {borrow.status === 'waiting' ? 'Requested' : borrow.status === 'ready_for_pickup' ? 'Ready for Pickup' : `Due ${new Date(borrow.dueDate).toLocaleDateString()}`}
                                            </Text>
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
                            <Text className="text-gray-400 dark:text-gray-500 font-bold text-[10px] uppercase tracking-[3px]">Digital Catalog</Text>
                        </View>
                        {filteredBooks.length === 0 ? (
                            <View className="bg-white dark:bg-[#1a1a1a] p-12 rounded-[40px] items-center border border-gray-100 dark:border-gray-800 border-dashed mt-4">
                                <Search size={48} color="#E5E7EB" style={{ opacity: 0.3 }} />
                                <Text className="text-gray-400 dark:text-gray-500 font-bold text-center mt-6">No matches found</Text>
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
                                    className="bg-white dark:bg-[#1a1a1a] p-5 rounded-[32px] border border-gray-50 dark:border-gray-800 mb-4 flex-row items-center shadow-sm active:bg-gray-50 dark:active:bg-gray-900"
                                >
                                    <View className={`p-4 rounded-2xl mr-4 ${item.available > 0 ? 'bg-orange-50 dark:bg-orange-950/20' : 'bg-gray-50 dark:bg-gray-800'}`}>
                                        <BookOpen size={22} color={item.available > 0 ? "#FF6900" : "#9CA3AF"} />
                                    </View>
                                    <View className="flex-1">
                                        <Text className="text-[#FF6900] text-[8px] font-bold uppercase tracking-[2px] mb-1">{item.category}</Text>
                                        <Text className="text-gray-900 dark:text-white font-bold text-base leading-tight" numberOfLines={1}>{item.title}</Text>
                                        <Text className="text-gray-400 dark:text-gray-500 text-xs font-medium">{item.author}</Text>
                                    </View>
                                    <View className={`px-2 py-0.5 rounded-full ${item.available > 0 ? 'bg-orange-500' : 'bg-gray-100 dark:bg-gray-800'}`}>
                                        <Text className={`font-bold text-[8px] uppercase tracking-widest ${item.available > 0 ? 'text-white' : 'text-gray-400 dark:text-gray-500'}`}>
                                            {item.available > 0 ? `${item.available} Left` : 'N/A'}
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            ))
                        )}
                    </ScrollView>
                )}
            </View>

            <Modal animationType="slide" transparent visible={modalVisible}>
                <View className="flex-1 bg-black/60 justify-end">
                    <View className="bg-white dark:bg-[#121212] rounded-t-[50px] p-8 pb-12 border-t border-gray-100 dark:border-gray-800">
                        <View className="flex-row justify-between items-start mb-8">
                            <View className="flex-1 pr-6">
                                <Text className="text-[#FF6900] font-bold text-[10px] uppercase tracking-[3px] mb-2">{selectedBook?.category}</Text>
                                <Text className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight leading-tight">{selectedBook?.title}</Text>
                                <Text className="text-gray-400 dark:text-gray-500 font-bold text-sm mt-2">by {selectedBook?.author}</Text>
                            </View>
                            <TouchableOpacity onPress={() => setModalVisible(false)} className="w-10 h-10 bg-gray-50 dark:bg-gray-800 rounded-full items-center justify-center">
                                <X size={20} color="#6B7280" />
                            </TouchableOpacity>
                        </View>

                        <View className="flex-row gap-4 mb-10">
                            <View className="flex-1 bg-gray-50 dark:bg-gray-800 p-6 rounded-[32px] border border-gray-100 dark:border-gray-700 items-center justify-center">
                                <Clock size={20} color="#FF6900" />
                                <Text className="text-gray-400 dark:text-gray-500 text-[8px] font-bold uppercase tracking-widest mt-3">Period</Text>
                                <Text className="text-gray-900 dark:text-white font-bold text-base mt-1">14 Days</Text>
                            </View>
                            <View className="flex-1 bg-gray-50 dark:bg-gray-800 p-6 rounded-[32px] border border-gray-100 dark:border-gray-700 items-center justify-center">
                                <CheckCircle2 size={20} color="#FF6900" />
                                <Text className="text-gray-400 dark:text-gray-500 text-[8px] font-bold uppercase tracking-widest mt-3">Stock</Text>
                                <Text className="text-gray-900 dark:text-white font-bold text-base mt-1">{selectedBook?.available} Items</Text>
                            </View>
                        </View>

                        <TouchableOpacity
                            disabled={actionLoading || (selectedBook?.available ?? 0) <= 0}
                            className={`py-5 rounded-2xl items-center shadow-lg active:bg-gray-800 ${actionLoading || (selectedBook?.available ?? 0) <= 0 ? 'bg-gray-300 shadow-none' : 'bg-gray-900'}`}
                            onPress={() => selectedBook && handleBorrow(selectedBook)}
                        >
                            {actionLoading ? <ActivityIndicator color="white" /> : (
                                <Text className="text-white font-bold text-lg">
                                    {(selectedBook?.available ?? 0) > 0 ? "Reserve Publication" : "Currently Unavailable"}
                                </Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

        </View>
    );
}