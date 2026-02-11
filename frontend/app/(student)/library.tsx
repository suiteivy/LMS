import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Modal, Alert, StatusBar, RefreshControl, ActivityIndicator } from 'react-native';
import { Search, FileText, BookOpen, X, Clock, CheckCircle2, Filter, Bookmark, History } from 'lucide-react-native';
import { LibraryAPI } from '@/services/LibraryService';
import { useAuth } from '@/contexts/AuthContext';
import { BackendBook, BackendBorrowedBook, FrontendBook, FrontendBorrowedBook } from '@/types/types';

export default function StudentLibrary() {
    const { studentId, displayId } = useAuth();
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedBook, setSelectedBook] = useState<FrontendBook | null>(null);
    const [modalVisible, setModalVisible] = useState(false);

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

            setBooks(booksData.map(LibraryAPI.transformBookData));
            setBorrowingHistory(historyData.map(LibraryAPI.transformBorrowedBookData));
        } catch (error) {
            console.error("Error loading library data:", error);
            Alert.alert("Error", "Failed to load library catalog.");
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
        if (!studentId) return;

        try {
            setActionLoading(true);
            // Default 14 days for now
            const dueDate = new Date();
            dueDate.setDate(dueDate.getDate() + 14);

            await LibraryAPI.borrowBook(book.id, dueDate.toISOString());
            Alert.alert("Success", `You have successfully borrowed "${book.title}".`);
            setModalVisible(false);
            loadData(); // Refresh to update quantities and history
        } catch (error: any) {
            const message = error.response?.data?.error || "Failed to borrow book.";
            Alert.alert("Borrowing Failed", message);
        } finally {
            setActionLoading(false);
        }
    };

    const filteredBooks = books.filter(book =>
        book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        book.author.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading && !refreshing) {
        return (
            <View className="flex-1 bg-white justify-center items-center">
                <ActivityIndicator size="large" color="#0d9488" />
                <Text className="mt-4 text-gray-500 font-medium">Opening Library...</Text>
            </View>
        );
    }

    return (
        <View className="flex-1 bg-gray-50">
            <StatusBar barStyle="dark-content" />

            {/* --- HEADER SECTION --- */}
            <View className="bg-white pt-14 pb-6 px-6 border-b border-gray-100 shadow-sm">
                <View className="flex-row justify-between items-center mb-6">
                    <View>
                        <Text className="text-gray-400 text-xs font-bold uppercase tracking-widest">Digital Resource</Text>
                        <Text className="text-3xl font-black text-gray-900">Library</Text>
                    </View>
                    <TouchableOpacity className="bg-teal-50 p-3 rounded-2xl">
                        <Bookmark size={22} color="#0d9488" />
                    </TouchableOpacity>
                </View>

                {/* Search Bar */}
                <View className="flex-row gap-2">
                    <View className="flex-1 flex-row items-center bg-gray-100 rounded-2xl px-4 py-2">
                        <Search size={18} color="#9CA3AF" />
                        <TextInput
                            placeholder="Find books or authors..."
                            className="flex-1 ml-2 text-gray-900 text-sm h-10"
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                    </View>
                    <TouchableOpacity className="bg-gray-900 p-3 rounded-2xl justify-center">
                        <Filter size={20} color="white" />
                    </TouchableOpacity>
                </View>
            </View>

            {/* --- BOOK LIST --- */}
            <ScrollView
                className="flex-1 px-6 pt-4"
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#0d9488"]} />
                }
            >
                {borrowingHistory.filter(b => b.status === 'borrowed').length > 0 && (
                    <View className="mb-6">
                        <View className="flex-row items-center gap-2 mb-4">
                            <History size={18} color="#0d9488" />
                            <Text className="text-gray-900 font-bold text-lg">Your Active Loans</Text>
                        </View>
                        {borrowingHistory.filter(b => b.status === 'borrowed').map((borrow) => (
                            <View key={borrow.id} className="bg-white p-4 rounded-3xl border border-teal-100 mb-2 flex-row items-center">
                                <View className="bg-teal-50 p-2 rounded-xl mr-3">
                                    <BookOpen size={16} color="#0d9488" />
                                </View>
                                <View className="flex-1">
                                    <Text className="text-gray-900 font-bold text-sm" numberOfLines={1}>{borrow.bookTitle}</Text>
                                    <Text className="text-gray-400 text-xs">Due: {new Date(borrow.dueDate).toLocaleDateString()}</Text>
                                </View>
                                <View className="bg-teal-600 px-3 py-1 rounded-full">
                                    <Text className="text-white font-bold text-[10px] uppercase">Active</Text>
                                </View>
                            </View>
                        ))}
                    </View>
                )}

                <Text className="text-gray-900 font-bold text-lg mb-4">Available Catalog</Text>

                {filteredBooks.length === 0 ? (
                    <View className="py-20 items-center">
                        <Text className="text-gray-400 font-medium italic">No books found matching your search.</Text>
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
                            className="bg-white p-4 rounded-[25px] border border-gray-100 mb-3 flex-row items-center justify-between"
                        >
                            <View className="flex-row items-center flex-1">
                                <View className={`p-3 rounded-2xl mr-4 ${item.quantity > 0 ? 'bg-teal-50' : 'bg-gray-50'}`}>
                                    <BookOpen size={22} color={item.quantity > 0 ? "#0d9488" : "#9CA3AF"} />
                                </View>
                                <View className="flex-1">
                                    <Text className="text-[10px] font-bold text-teal-600 uppercase mb-0.5">{item.category}</Text>
                                    <Text className="text-gray-900 font-bold text-base" numberOfLines={1}>{item.title}</Text>
                                    <Text className="text-gray-400 text-xs">{item.author}</Text>
                                </View>
                            </View>
                            <View className={`p-2 rounded-full ${item.available > 0 ? 'bg-teal-50' : 'bg-red-50'}`}>
                                <Text className={`font-bold text-[10px] px-1 ${item.available > 0 ? 'text-teal-600' : 'text-red-500'}`}>
                                    {item.available > 0 ? `${item.available} LEFT` : 'OUT'}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    ))
                )}

                <View className="h-20" />
            </ScrollView>

            {/* --- BORROW MODAL --- */}
            <Modal animationType="slide" transparent visible={modalVisible}>
                <View className="flex-1 bg-black/60 justify-end">
                    <TouchableOpacity className="flex-1" onPress={() => setModalVisible(false)} />
                    <View className="bg-white rounded-t-[50px] p-8">
                        <View className="w-12 h-1.5 bg-gray-200 rounded-full self-center mb-8" />

                        <View className="flex-row justify-between items-start mb-6">
                            <View className="flex-1 pr-4">
                                <Text className="text-teal-600 font-bold text-xs uppercase tracking-widest">{selectedBook?.category}</Text>
                                <Text className="text-3xl font-black text-gray-900 mt-2">{selectedBook?.title}</Text>
                                <Text className="text-gray-500 font-medium mt-1">by {selectedBook?.author}</Text>
                            </View>
                            <TouchableOpacity onPress={() => setModalVisible(false)} className="bg-gray-100 p-3 rounded-full">
                                <X size={20} color="#6B7280" />
                            </TouchableOpacity>
                        </View>

                        {selectedBook?.isbn && (
                            <View className="bg-gray-50 px-4 py-2 rounded-xl self-start mb-6">
                                <Text className="text-gray-400 text-xs font-bold uppercase tracking-tighter">ISBN: {selectedBook.isbn}</Text>
                            </View>
                        )}

                        <View className="flex-row justify-between mb-10">
                            <View className="bg-gray-50 p-5 rounded-[30px] flex-1 mr-2 border border-gray-100">
                                <Clock size={18} color="#0d9488" />
                                <Text className="text-gray-400 text-[10px] font-bold uppercase mt-3">Duration</Text>
                                <Text className="text-gray-900 font-bold text-base mt-1">14 Days</Text>
                            </View>
                            <View className="bg-gray-50 p-5 rounded-[30px] flex-1 ml-2 border border-gray-100">
                                <CheckCircle2 size={18} color="#0d9488" />
                                <Text className="text-gray-400 text-[10px] font-bold uppercase mt-3">Available</Text>
                                <Text className="text-gray-900 font-bold text-base mt-1">{selectedBook?.available} Copies</Text>
                            </View>
                        </View>

                        <TouchableOpacity
                            disabled={actionLoading || (selectedBook?.available ?? 0) <= 0}
                            className={`py-5 rounded-[25px] items-center shadow-lg ${actionLoading || (selectedBook?.available ?? 0) <= 0 ? 'bg-gray-300 shadow-none' : 'bg-teal-600 shadow-teal-200'}`}
                            onPress={() => selectedBook && handleBorrow(selectedBook)}
                        >
                            {actionLoading ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <Text className="text-white font-black text-lg">
                                    {(selectedBook?.available ?? 0) > 0 ? "Borrow Material" : "Out of Stock"}
                                </Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}
