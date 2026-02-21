import { UnifiedHeader } from "@/components/common/UnifiedHeader";
import { LibraryAPI, useLibraryAPI } from '@/services/LibraryService';
import { FrontendBorrowedBook } from '@/types/types';
import { router } from "expo-router";
import { BookOpen, CheckCircle2, User, XCircle } from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native';

export default function TeacherLibraryManagement() {
    const [activeTab, setActiveTab] = useState<'requests' | 'ready'>('requests');
    const [requests, setRequests] = useState<FrontendBorrowedBook[]>([]);
    const [readyBooks, setReadyBooks] = useState<FrontendBorrowedBook[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const { loading, executeWithLoading } = useLibraryAPI();

    const loadData = useCallback(async () => {
        try {
            const allBooks = await LibraryAPI.getAllBorrowedBooks();
            const transformed = allBooks.map(LibraryAPI.transformBorrowedBookData);
            setRequests(transformed.filter(b => b.status === 'waiting'));
            setReadyBooks(transformed.filter(b => b.status === 'ready_for_pickup'));
        } catch (error) {
            console.error("Error loading library data:", error);
            Alert.alert("Error", "Failed to load library requests.");
        } finally {
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const onRefresh = () => {
        setRefreshing(true);
        loadData();
    };

    const handleUpdateStatus = async (borrowId: string, newStatus: 'ready_for_pickup' | 'borrowed') => {
        try {
            await executeWithLoading(() => LibraryAPI.updateBorrowStatus(borrowId, newStatus));
            Alert.alert("Success", newStatus === 'ready_for_pickup' ? "Marked as Ready" : "Marked as Picked Up");
            loadData();
        } catch (error) {
            Alert.alert("Error", "Failed to update status");
        }
    };

    const handleReject = async (borrowId: string) => {
        Alert.alert(
            "Reject Request",
            "Are you sure you want to reject this request?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Reject",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await executeWithLoading(() => LibraryAPI.rejectBorrowRequest(borrowId));
                            Alert.alert("Success", "Request rejected");
                            loadData();
                        } catch (error) {
                            Alert.alert("Error", "Failed to reject request");
                        }
                    }
                }
            ]
        );
    };

    const renderRequestCard = (book: FrontendBorrowedBook) => (
        <View key={book.id} className="bg-white dark:bg-[#1a1a1a] p-5 rounded-3xl border border-gray-100 dark:border-gray-800 mb-4 shadow-sm">
            <View className="flex-row justify-between items-start mb-4">
                <View className="flex-1 pr-4">
                    <Text className="text-gray-900 dark:text-white font-bold text-lg leading-tight mb-1">{book.bookTitle}</Text>
                    <Text className="text-gray-400 dark:text-gray-500 text-[10px] font-bold uppercase tracking-wider mb-3">by {book.author}</Text>
                    <View className="flex-row items-center border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800 px-3 py-1.5 rounded-xl self-start">
                        <User size={12} color="#6B7280" />
                        <Text className="text-gray-600 dark:text-gray-400 text-[10px] font-bold ml-2">{book.borrowerName}</Text>
                    </View>
                </View>
                <View className="bg-yellow-50 dark:bg-yellow-950/20 px-3 py-1 rounded-full border border-yellow-100 dark:border-yellow-900">
                    <Text className="text-yellow-600 dark:text-yellow-400 font-bold text-[8px] uppercase tracking-widest">Waiting</Text>
                </View>
            </View>

            <View className="flex-row gap-3 mt-2">
                <TouchableOpacity
                    className="flex-1 bg-gray-100 py-3.5 rounded-2xl flex-row justify-center items-center"
                    onPress={() => handleReject(book.id)}
                >
                    <XCircle size={16} color="#ef4444" />
                    <Text className="ml-2 font-bold text-gray-700 text-xs uppercase tracking-widest">Reject</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    className="flex-1 bg-[#FF6900] py-3.5 rounded-2xl flex-row justify-center items-center shadow-lg"
                    onPress={() => handleUpdateStatus(book.id, 'ready_for_pickup')}
                >
                    <CheckCircle2 size={16} color="white" />
                    <Text className="ml-2 font-bold text-white text-xs uppercase tracking-widest">Mark Ready</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    const renderReadyCard = (book: FrontendBorrowedBook) => (
        <View key={book.id} className="bg-white dark:bg-[#1a1a1a] p-5 rounded-3xl border border-gray-100 dark:border-gray-800 mb-4 shadow-sm">
            <View className="flex-row justify-between items-start mb-4">
                <View className="flex-1 pr-4">
                    <Text className="text-gray-900 dark:text-white font-bold text-lg leading-tight mb-1">{book.bookTitle}</Text>
                    <Text className="text-gray-400 dark:text-gray-500 text-[10px] font-bold uppercase tracking-wider mb-3">by {book.author}</Text>
                    <View className="flex-row items-center border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800 px-3 py-1.5 rounded-xl self-start">
                        <User size={12} color="#6B7280" />
                        <Text className="text-gray-600 dark:text-gray-400 text-[10px] font-bold ml-2">{book.borrowerName}</Text>
                    </View>
                </View>
                <View className="bg-green-50 dark:bg-green-950/20 px-3 py-1 rounded-full border border-green-100 dark:border-green-900">
                    <Text className="text-green-600 dark:text-green-400 font-bold text-[8px] uppercase tracking-widest">Ready</Text>
                </View>
            </View>

            <TouchableOpacity
                className="w-full bg-green-600 py-4 rounded-2xl flex-row justify-center items-center shadow-lg"
                onPress={() => handleUpdateStatus(book.id, 'borrowed')}
            >
                <BookOpen size={18} color="white" />
                <Text className="ml-2 font-bold text-white text-sm uppercase tracking-widest">Confirm Pickup</Text>
            </TouchableOpacity>
        </View>
    );

    return (
        <View className="flex-1 bg-gray-50 dark:bg-black">
            <UnifiedHeader
                title="Management"
                subtitle="Library"
                role="Teacher"
                onBack={() => router.back()}
            />

            <View className="px-4 md:px-8 mt-6">
                <View className="flex-row bg-white dark:bg-[#1a1a1a] p-1.5 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
                    <TouchableOpacity
                        className={`flex-1 py-3 rounded-xl items-center ${activeTab === 'requests' ? 'bg-gray-900 dark:bg-gray-800 shadow-sm' : ''}`}
                        onPress={() => setActiveTab('requests')}
                    >
                        <Text className={`text-[10px] font-bold uppercase tracking-widest ${activeTab === 'requests' ? 'text-white' : 'text-gray-400 dark:text-gray-500'}`}>
                            Requests ({requests.length})
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        className={`flex-1 py-3 rounded-xl items-center ${activeTab === 'ready' ? 'bg-[#FF6900] shadow-sm' : ''}`}
                        onPress={() => setActiveTab('ready')}
                    >
                        <Text className={`text-[10px] font-bold uppercase tracking-widest ${activeTab === 'ready' ? 'text-white' : 'text-gray-400 dark:text-gray-500'}`}>
                            Pickup Ready ({readyBooks.length})
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView
                className="flex-1"
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#FF6900"]} />
                }
                contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
            >
                {loading && !refreshing ? (
                    <ActivityIndicator size="large" color="#FF6900" className="mt-8" />
                ) : (
                    activeTab === 'requests' ? (
                        requests.length === 0 ? (
                            <View className="bg-white dark:bg-[#1a1a1a] p-12 rounded-[40px] items-center border border-gray-100 dark:border-gray-800 border-dashed mt-8">
                                <BookOpen size={48} color="#E5E7EB" style={{ opacity: 0.3 }} />
                                <Text className="text-gray-400 dark:text-gray-500 font-bold text-center mt-6">No pending requests</Text>
                            </View>
                        ) : (
                            requests.map(item => renderRequestCard(item))
                        )
                    ) : (
                        readyBooks.length === 0 ? (
                            <View className="bg-white dark:bg-[#1a1a1a] p-12 rounded-[40px] items-center border border-gray-100 dark:border-gray-800 border-dashed mt-8">
                                <CheckCircle2 size={48} color="#E5E7EB" style={{ opacity: 0.3 }} />
                                <Text className="text-gray-400 dark:text-gray-500 font-bold text-center mt-6">No books for pickup</Text>
                            </View>
                        ) : (
                            readyBooks.map(item => renderReadyCard(item))
                        )
                    )
                )}
            </ScrollView>
        </View>
    );
}
