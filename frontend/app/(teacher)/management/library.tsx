import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StatusBar, Alert, ActivityIndicator, RefreshControl } from 'react-native';
import { ArrowLeft, CheckCircle2, Clock, BookOpen, XCircle, User } from 'lucide-react-native';
import { router } from "expo-router";
import { LibraryAPI, useLibraryAPI } from '@/services/LibraryService';
import { FrontendBorrowedBook } from '@/types/types';

export default function TeacherLibraryManagement() {
    const [activeTab, setActiveTab] = useState<'requests' | 'ready'>('requests');
    const [requests, setRequests] = useState<FrontendBorrowedBook[]>([]);
    const [readyBooks, setReadyBooks] = useState<FrontendBorrowedBook[]>([]);
    const [refreshing, setRefreshing] = useState(false);

    const { loading, executeWithLoading } = useLibraryAPI();

    const loadData = useCallback(async () => {
        try {
            // Fetch all borrowed books and filter client-side
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
        <View key={book.id} className="bg-white p-4 rounded-2xl border border-gray-100 mb-3 shadow-sm">
            <View className="flex-row justify-between items-start mb-2">
                <View className="flex-1">
                    <Text className="text-gray-900 font-bold text-base mb-1">{book.bookTitle}</Text>
                    <Text className="text-gray-500 text-xs mb-2">by {book.author}</Text>

                    <View className="flex-row items-center bg-gray-50 p-2 rounded-lg self-start">
                        <User size={14} color="#6B7280" />
                        <Text className="text-gray-600 text-xs ml-1 font-medium">{book.borrowerName}</Text>
                    </View>
                </View>
                <View className="bg-yellow-50 px-3 py-1 rounded-full border border-yellow-100">
                    <Text className="text-yellow-600 font-bold text-[10px] uppercase">Waiting</Text>
                </View>
            </View>

            <View className="flex-row gap-2 mt-2">
                <TouchableOpacity
                    className="flex-1 bg-gray-100 py-3 rounded-xl flex-row justify-center items-center"
                    onPress={() => handleReject(book.id)}
                >
                    <XCircle size={16} color="#ef4444" />
                    <Text className="ml-2 font-bold text-gray-700 text-sm">Reject</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    className="flex-1 bg-orange-500 py-3 rounded-xl flex-row justify-center items-center"
                    onPress={() => handleUpdateStatus(book.id, 'ready_for_pickup')}
                >
                    <CheckCircle2 size={16} color="white" />
                    <Text className="ml-2 font-bold text-white text-sm">Mark Ready</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    const renderReadyCard = (book: FrontendBorrowedBook) => (
        <View key={book.id} className="bg-white p-4 rounded-2xl border border-gray-100 mb-3 shadow-sm">
            <View className="flex-row justify-between items-start mb-2">
                <View className="flex-1">
                    <Text className="text-gray-900 font-bold text-base mb-1">{book.bookTitle}</Text>
                    <Text className="text-gray-500 text-xs mb-2">by {book.author}</Text>

                    <View className="flex-row items-center bg-gray-50 p-2 rounded-lg self-start">
                        <User size={14} color="#6B7280" />
                        <Text className="text-gray-600 text-xs ml-1 font-medium">{book.borrowerName}</Text>
                    </View>
                </View>
                <View className="bg-green-50 px-3 py-1 rounded-full border border-green-100">
                    <Text className="text-green-600 font-bold text-[10px] uppercase">Ready</Text>
                </View>
            </View>

            <TouchableOpacity
                className="w-full bg-green-600 py-3 rounded-xl flex-row justify-center items-center mt-2"
                onPress={() => handleUpdateStatus(book.id, 'borrowed')}
            >
                <BookOpen size={16} color="white" />
                <Text className="ml-2 font-bold text-white text-sm">Confirm Pickup</Text>
            </TouchableOpacity>
        </View>
    );

    return (
        <View className="flex-1 bg-gray-50">
            <StatusBar barStyle="dark-content" />

            {/* Header */}
            <View className="bg-white p-4 pt-4 border-b border-gray-100">
                <View className="flex-row items-center justify-between mb-4">
                    <View className="bg-white pt-10 px-4 pb-4">
                        <View className="flex-row items-center">
                            <TouchableOpacity onPress={() => router.back()} className="mr-3 p-2 bg-gray-50 rounded-full">
                                <ArrowLeft size={20} color="black" />
                            </TouchableOpacity>
                            <Text className="text-2xl font-bold text-gray-900">Library Requests</Text>
                        </View>
                    </View>
                </View>

                {/* Tabs */}
                {/* Fixed the onPress logic which was wrapping the JSX implicitly */}
                <View className="flex-row bg-gray-100 p-1 rounded-xl">
                    <TouchableOpacity
                        className={`flex-1 py-2 rounded-lg items-center ${activeTab === 'requests' ? 'bg-white shadow-sm' : ''}`}
                        onPress={() => setActiveTab('requests')}
                    >
                        <Text className={`text-sm font-bold ${activeTab === 'requests' ? 'text-gray-900' : 'text-gray-500'}`}>
                            Requests ({requests.length})
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        className={`flex-1 py-2 rounded-lg items-center ${activeTab === 'ready' ? 'bg-white shadow-sm' : ''}`}
                        onPress={() => setActiveTab('ready')}
                    >
                        <Text className={`text-sm font-bold ${activeTab === 'ready' ? 'text-gray-900' : 'text-gray-500'}`}>
                            Ready ({readyBooks.length})
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView
                className="flex-1 p-4"
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#FF6B00"]} />
                }
            >
                {loading && !refreshing ? (
                    <ActivityIndicator size="large" color="#FF6B00" className="mt-8" />
                ) : (
                    activeTab === 'requests' ? (
                        requests.length === 0 ? (
                            <View className="items-center justify-center mt-20">
                                <Clock size={48} color="#D1D5DB" />
                                <Text className="text-gray-400 font-medium mt-4">No pending requests</Text>
                            </View>
                        ) : (
                            requests.map(item => renderRequestCard(item))
                        )
                    ) : (
                        readyBooks.length === 0 ? (
                            <View className="items-center justify-center mt-20">
                                <CheckCircle2 size={48} color="#D1D5DB" />
                                <Text className="text-gray-400 font-medium mt-4">No books waiting for pickup</Text>
                            </View>
                        ) : (
                            readyBooks.map(item => renderReadyCard(item))
                        )
                    )
                )}
                <View className="h-20" />
            </ScrollView>
        </View>
    );
}
