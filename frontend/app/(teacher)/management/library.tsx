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
    const [issueModalVisible, setIssueModalVisible] = useState(false);
    const [students, setStudents] = useState<{ id: string, name: string }[]>([]);
    const [selectedStudentId, setSelectedStudentId] = useState('');
    const [isIssuing, setIsIssuing] = useState(false);
    const { isDemo, profile } = useAuth();

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
                setStudents([{ id: 'stu1', name: 'John Doe' }, { id: 'stu2', name: 'Jane Smith' }]);
                return;
            }
            const [booksData, studentsData] = await Promise.all([
                LibraryAPI.getBooks(),
                supabase.from('users').select('id, first_name, last_name, students(id)').eq('role', 'student').eq('institution_id', profile?.institution_id)
            ]);
            
            setBooks(booksData.map(LibraryAPI.transformBookData));
            
            if (studentsData.data) {
                setStudents(studentsData.data.map((u: any) => ({
                    id: u.students[0]?.id || u.id,
                    name: `${u.first_name} ${u.last_name || ''}`.trim()
                })));
            }
        } catch (error) {
            console.error("Error fetching library data:", error);
            Alert.alert("Error", "Failed to fetch library data.");
        } finally {
            setLoading(false);
        }
    };

    const handleIssueBook = async () => {
        if (!selectedBook || !selectedStudentId) {
            Alert.alert("Error", "Please select a student.");
            return;
        }

        try {
            setIsIssuing(true);
            await LibraryAPI.issueBook(selectedBook.id, selectedStudentId, "Issued by teacher", 14);
            Alert.alert("Success", "Book issued successfully!");
            setIssueModalVisible(false);
            setSelectedStudentId('');
            fetchBooks();
        } catch (error) {
            console.error("Error issuing book:", error);
            Alert.alert("Error", "Failed to issue book.");
        } finally {
            setIsIssuing(false);
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
                                    <TouchableOpacity
                                        key={book.id}
                                        className="bg-white dark:bg-navy-surface p-5 rounded-[32px] border border-gray-50 dark:border-gray-800 mb-4 flex-row items-center shadow-sm"
                                        onPress={() => {
                                            if (book.available > 0) {
                                                setSelectedBook(book);
                                                setIssueModalVisible(true);
                                            } else {
                                                Alert.alert("Unavailable", "No copies available for this book.");
                                            }
                                        }}
                                    >
                                        <View className="w-12 h-12 rounded-2xl bg-orange-50 dark:bg-orange-950/20 items-center justify-center mr-4">
                                            <BookOpen size={22} color="#FF6900" />
                                        </View>
                                        <View className="flex-1">
                                            <Text className="text-slate-900 dark:text-white font-bold text-base leading-tight" numberOfLines={1}>{book.title}</Text>
                                            <Text className="text-slate-400 text-xs font-medium mt-1">{book.author}</Text>
                                        </View>
                                        <View className="flex-row items-center gap-3">
                                            <View className="bg-slate-50 dark:bg-navy-light px-3 py-1 rounded-full">
                                                <Text className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase">{book.available}/{book.quantity}</Text>
                                            </View>
                                            <View className="w-8 h-8 rounded-full bg-orange-50 dark:bg-orange-950/20 items-center justify-center">
                                                <Plus size={16} color="#FF6900" />
                                            </View>
                                        </View>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        )}
                    </View>
                    </View>
                </View>
            </SubscriptionGate>

            {/* Issue Book Modal */}
            <Modal
                visible={issueModalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setIssueModalVisible(false)}
            >
                <View className="flex-1 bg-black/50 justify-center p-6">
                    <View className="bg-white dark:bg-navy-surface rounded-[40px] p-8">
                        <View className="flex-row justify-between items-center mb-6">
                            <Text className="text-xl font-bold dark:text-white">Issue Book</Text>
                            <TouchableOpacity onPress={() => setIssueModalVisible(false)}>
                                <X size={24} color="#94a3b8" />
                            </TouchableOpacity>
                        </View>

                        <View className="mb-6">
                            <Text className="text-gray-400 text-[10px] font-bold uppercase mb-2">Book Selected</Text>
                            <View className="bg-gray-50 dark:bg-navy-light p-4 rounded-2xl">
                                <Text className="font-bold dark:text-white">{selectedBook?.title}</Text>
                                <Text className="text-xs text-gray-400">{selectedBook?.author}</Text>
                            </View>
                        </View>

                        <View className="mb-8">
                            <Text className="text-gray-400 text-[10px] font-bold uppercase mb-2">Select Student</Text>
                            <ScrollView style={{ maxHeight: 200 }} className="bg-gray-50 dark:bg-navy-light rounded-2xl overflow-hidden">
                                {students.map((s) => (
                                    <TouchableOpacity
                                        key={s.id}
                                        onPress={() => setSelectedStudentId(s.id)}
                                        className={`p-4 border-b border-gray-100 dark:border-gray-800 ${selectedStudentId === s.id ? 'bg-orange-50 dark:bg-orange-950/20' : ''}`}
                                    >
                                        <Text className={`font-medium ${selectedStudentId === s.id ? 'text-orange-500' : 'dark:text-white'}`}>{s.name}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>

                        <TouchableOpacity 
                            onPress={handleIssueBook}
                            disabled={isIssuing || !selectedStudentId}
                            className={`h-16 rounded-3xl items-center justify-center ${!selectedStudentId ? 'bg-gray-200' : 'bg-orange-500 shadow-lg shadow-orange-500/30'}`}
                        >
                            {isIssuing ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <Text className="text-white font-bold text-lg">Confirm Issue</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}
