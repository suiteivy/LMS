import { UnifiedHeader } from "@/components/common/UnifiedHeader";
import { useAuth } from "@/contexts/AuthContext";
import { LibraryAPI } from "@/services/LibraryService";
import { FrontendBook } from "@/types/types";
import { router } from "expo-router";
import { BookOpen, Calendar, ChevronRight, Plus, Search, User, X, Zap } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SubscriptionGate, AddonRequestButton } from "@/components/shared/SubscriptionComponents";

export default function TeacherLibraryPage() {
    const [books, setBooks] = useState<FrontendBook[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedBook, setSelectedBook] = useState<FrontendBook | null>(null);
    const [modalVisible, setModalVisible] = useState(false);
    const { isDemo } = useAuth();

    useEffect(() => {
        fetchBooks();
    }, [isDemo]);

    const fetchBooks = async () => {
        try {
            setLoading(true);
            if (isDemo) {
                const mockBooks: FrontendBook[] = [
                    { id: '1', title: "Advanced Calculus", author: "Dr. Smith", isbn: "1234567890", category: "Mathematics", available: 5, quantity: 10, publisher: "Oxford", publicationYear: 2022, createdAt: new Date().toISOString(), institutionId: 'mock-inst-1' },
                    { id: '2', title: "Physics Vol 1", author: "Newton", isbn: "0987654321", category: "Science", available: 2, quantity: 5, publisher: "Cambridge", publicationYear: 2021, createdAt: new Date().toISOString(), institutionId: 'mock-inst-1' }
                ];
                setBooks(mockBooks);
                return;
            }
            const data = await LibraryAPI.getBooks();
            const transformed = data.map(LibraryAPI.transformBookData);
            setBooks(transformed);
        } catch (error) {
            console.error("Error fetching books:", error);
            Alert.alert("Error", "Failed to fetch library books.");
        } finally {
            setLoading(false);
        }
    };

    const filteredBooks = books.filter(book => 
        book.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
        book.author.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <View className="flex-1 bg-gray-50 dark:bg-navy">
            <UnifiedHeader
                title="Management"
                subtitle="Library Books"
                role="Teacher"
                onBack={() => router.push("/(teacher)/management")}
            />

            <SubscriptionGate 
                feature="library"
                fallback={
                    <View className="flex-1 items-center justify-center p-8">
                        <View className="bg-orange-50 p-8 rounded-[40px] items-center border border-orange-100 border-dashed max-w-sm">
                            <Zap size={48} color="#FF6900" style={{ marginBottom: 20 }} />
                            <Text className="text-xl font-bold text-gray-900 text-center mb-2">Library Locked</Text>
                            <Text className="text-gray-500 text-center mb-8 leading-5">
                                Digital Library features are not included in your current subscription plan.
                            </Text>
                            <AddonRequestButton onPress={() => { /* Handle request */ }} />
                        </View>
                    </View>
                }
            >
                <View className="flex-1">
                    <View className="p-4 md:p-8">
                        <View className="flex-row items-center bg-white dark:bg-navy-surface px-5 py-4 rounded-[28px] border border-gray-100 dark:border-gray-800 shadow-sm mb-6">
                            <Search size={20} color="#94a3b8" />
                            <TextInput
                                placeholder="Search books by title or author..."
                                placeholderTextColor="#94a3b8"
                                className="flex-1 ml-3 text-slate-900 dark:text-white font-medium"
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                            />
                        </View>

                        {loading ? (
                            <ActivityIndicator size="large" color="#FF6900" className="mt-8" />
                        ) : filteredBooks.length === 0 ? (
                            <View className="bg-white dark:bg-navy-surface p-12 rounded-[40px] items-center border border-gray-100 dark:border-gray-800 border-dashed mt-4">
                                <BookOpen size={48} color="#e2e8f0" style={{ opacity: 0.5 }} />
                                <Text className="text-slate-400 font-bold text-center mt-6">No books found</Text>
                            </View>
                        ) : (
                            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
                                {filteredBooks.map((book) => (
                                    <View
                                        key={book.id}
                                        className="bg-white dark:bg-navy-surface p-5 rounded-[32px] border border-gray-50 dark:border-gray-800 mb-4 flex-row items-center shadow-sm"
                                    >
                                        <View className="w-12 h-12 rounded-2xl bg-orange-50 dark:bg-orange-950/20 items-center justify-center mr-4">
                                            <BookOpen size={22} color="#FF6900" />
                                        </View>
                                        <View className="flex-1">
                                            <Text className="text-slate-900 dark:text-white font-bold text-base leading-tight" numberOfLines={1}>{book.title}</Text>
                                            <Text className="text-slate-400 text-xs font-medium mt-1">{book.author}</Text>
                                        </View>
                                        <View className="bg-slate-50 dark:bg-navy-light px-3 py-1 rounded-full">
                                            <Text className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase">{book.available}/{book.quantity}</Text>
                                        </View>
                                    </View>
                                ))}
                            </ScrollView>
                        )}
                    </View>
                </View>
            </SubscriptionGate>
        </View>
    );
}
