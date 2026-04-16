import { UnifiedHeader } from "@/components/common/UnifiedHeader";
import { useAuth } from '@/contexts/AuthContext';
import { LibraryAPI } from '@/services/LibraryService';
import { FrontendBook, FrontendBorrowedBook } from '@/types/types';
import { router } from "expo-router";
import { BookOpen, CheckCircle2, Clock, Filter, Search, X } from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, RefreshControl, ScrollView, Text, TextInput, TouchableOpacity, View, FlatList } from 'react-native';
import { StudentService } from '@/services/StudentService';
import { useRealtimeQuery } from '@/hooks/useRealtimeQuery';
import { SubscriptionGate } from "@/components/shared/SubscriptionComponents";
import { Zap } from "lucide-react-native";

export default function TeacherLibrary() {
    const { teacherId } = useAuth();
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
    const [studentLoans, setStudentLoans] = useState<FrontendBorrowedBook[]>([]);
    const [students, setStudents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [viewMode, setViewMode] = useState<'personal' | 'students'>('personal');
    
    // Issue Book State
    const [isIssuing, setIsIssuing] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState<any>(null);
    const [issueRemarks, setIssueRemarks] = useState("");
    const [studentSearch, setStudentSearch] = useState("");

    const loadData = useCallback(async () => {
        try {
            const [booksData, historyData, allBorrowed, studentsData] = await Promise.all([
                LibraryAPI.getBooks(),
                teacherId ? LibraryAPI.getBorrowingHistory(teacherId) : Promise.resolve([]),
                LibraryAPI.getAllBorrowedBooks(),
                StudentService.getStudents()
            ]);

            const finalBooks = booksData.map(LibraryAPI.transformBookData);
            const finalHistory = historyData.map(LibraryAPI.transformBorrowedBookData);
            const finalAllBorrowed = allBorrowed.map(LibraryAPI.transformBorrowedBookData);

            setBooks(finalBooks as any);
            setBorrowingHistory(finalHistory as any);
            setStudentLoans(finalAllBorrowed as any);
            setStudents(studentsData || []);
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

    const handleBorrow = async (book: FrontendBook) => {
        setActionLoading(true);
        if (!teacherId) {
            Alert.alert("Unauthorized", "Profile data missing. Please try again.");
            setActionLoading(false);
            return;
        }

        try {
            await LibraryAPI.borrowBook(book.id, 14);
            Alert.alert("Success", `You have successfully borrowed "${book.title}".`);
            setModalVisible(false);
            loadData();
        } catch (error: any) {
            Alert.alert("Borrowing Failed", error.response?.data?.error || "Failed to borrow book.");
        } finally {
            setActionLoading(false);
        }
    };

    const handleIssueToStudent = async () => {
        if (!selectedBook || !selectedStudent) return;
        
        setActionLoading(true);
        try {
            await LibraryAPI.issueBook(selectedBook.id, selectedStudent.id, issueRemarks);
            Alert.alert("Success", `Issued "${selectedBook.title}" to ${selectedStudent.users?.full_name}`);
            setModalVisible(false);
            setIsIssuing(false);
            setSelectedStudent(null);
            setIssueRemarks("");
            loadData();
        } catch (error: any) {
            Alert.alert("Error", error.response?.data?.error || "Failed to issue book.");
        } finally {
            setActionLoading(false);
        }
    };


    const filteredBooks = books.filter(book =>
        book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        book.author.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <View className="flex-1 bg-gray-50 dark:bg-navy">
            <UnifiedHeader
                title="Resources"
                subtitle="Library"
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
                                the Digital Library is not included in your current subscription plan.
                            </Text>
                        </View>
                    </View>
                }
            >

            <View className="flex-row bg-gray-100 dark:bg-gray-800 p-1 mx-4 mt-4 rounded-2xl">
                <TouchableOpacity 
                    onPress={() => setViewMode('personal')}
                    className={`flex-1 py-3 rounded-xl items-center ${viewMode === 'personal' ? 'bg-white dark:bg-gray-700 shadow-sm' : ''}`}
                >
                    <Text className={`text-[10px] font-black uppercase tracking-widest ${viewMode === 'personal' ? 'text-gray-900 dark:text-white' : 'text-gray-400'}`}>My Library</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                    onPress={() => setViewMode('students')}
                    className={`flex-1 py-3 rounded-xl items-center ${viewMode === 'students' ? 'bg-white dark:bg-gray-700 shadow-sm' : ''}`}
                >
                    <Text className={`text-[10px] font-black uppercase tracking-widest ${viewMode === 'students' ? 'text-gray-900 dark:text-white' : 'text-gray-400'}`}>Student Loans</Text>
                </TouchableOpacity>
            </View>

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
                        {viewMode === 'personal' ? (
                            <>
                                {/* Borrowing History */}
                        {borrowingHistory.filter(b => ['borrowed', 'waiting', 'ready_for_pickup', 'overdue'].includes(b.status)).length > 0 && (
                            <>
                                <View className="px-2 mb-4">
                                    <Text className="text-gray-400 dark:text-gray-500 font-bold text-[10px] uppercase tracking-[3px]">My Borrowed Books</Text>
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
                            </>
                        ) : (
                            <>
                                <View className="px-2 mb-4">
                                    <Text className="text-gray-400 dark:text-gray-500 font-bold text-[10px] uppercase tracking-[3px]">Outstanding Student Loans</Text>
                                </View>
                                {studentLoans.filter(l => l.borrowerType === 'student' && l.status !== 'returned').length === 0 ? (
                                    <View className="bg-white dark:bg-[#1a1a1a] p-12 rounded-[40px] items-center border border-gray-100 dark:border-gray-800 border-dashed mt-4">
                                        <CheckCircle2 size={48} color="#10B981" style={{ opacity: 0.3 }} />
                                        <Text className="text-gray-400 font-bold text-center mt-6 uppercase tracking-widest text-[10px]">All books accounted for</Text>
                                    </View>
                                ) : (
                                    studentLoans.filter(l => l.borrowerType === 'student' && l.status !== 'returned').map((loan) => (
                                        <View key={loan.id} className="bg-white dark:bg-[#1a1a1a] p-5 rounded-3xl border border-gray-100 dark:border-gray-800 mb-3 shadow-sm">
                                            <View className="flex-row justify-between mb-4">
                                                <View className="flex-1">
                                                    <Text className="text-gray-900 dark:text-white font-bold text-base tracking-tight" numberOfLines={1}>{loan.bookTitle}</Text>
                                                    <Text className="text-[#FF6900] text-[10px] font-black uppercase tracking-widest mt-0.5">{loan.borrowerName}</Text>
                                                </View>
                                                <View className="bg-red-50 dark:bg-red-900/20 px-3 py-1 rounded-full border border-red-100 dark:border-red-900">
                                                    <Text className="text-red-600 font-bold text-[8px] uppercase tracking-widest">{loan.status}</Text>
                                                </View>
                                            </View>
                                            <View className="flex-row justify-between items-center bg-gray-50 dark:bg-gray-800/50 p-3 rounded-2xl">
                                                <View>
                                                    <Text className="text-gray-400 text-[8px] font-bold uppercase">Issued On</Text>
                                                    <Text className="text-gray-900 dark:text-white font-bold text-[10px]">{new Date(loan.borrowDate).toLocaleDateString()}</Text>
                                                </View>
                                                <View className="items-end">
                                                    <Text className="text-gray-400 text-[8px] font-bold uppercase">Due Back</Text>
                                                    <Text className="text-red-600 font-bold text-[10px]">{new Date(loan.dueDate).toLocaleDateString()}</Text>
                                                </View>
                                            </View>
                                        </View>
                                    ))
                                )}
                            </>
                        )}
                    </ScrollView>
                )}
            </View>

            <Modal animationType="slide" transparent visible={modalVisible}>
                <View className="flex-1 bg-black/60 justify-end">
                    <View className="bg-white dark:bg-[#0F0B2E] rounded-t-[50px] p-8 pb-12 border-t border-gray-100 dark:border-gray-800">
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
                            onPress={() => {
                                if (viewMode === 'students') {
                                    setIsIssuing(true);
                                } else {
                                    selectedBook && handleBorrow(selectedBook);
                                }
                            }}
                        >
                            {actionLoading ? <ActivityIndicator color="white" /> : (
                                <Text className="text-white font-bold text-lg">
                                    {viewMode === 'students' ? "Issue to Student" : (selectedBook?.available ?? 0) > 0 ? "Borrow Publication" : "Currently Unavailable"}
                                </Text>
                            )}
                        </TouchableOpacity>

                        {isIssuing && (
                            <View className="mt-8 border-t border-gray-100 dark:border-gray-800 pt-8">
                                <Text className="text-gray-400 font-bold text-[10px] uppercase tracking-[3px] mb-4 text-center">ISSUE WORKFLOW</Text>
                                
                                <View className="bg-gray-50 dark:bg-gray-800 px-5 py-4 rounded-2xl border border-gray-100 dark:border-gray-700 mb-4">
                                    <TextInput 
                                        placeholder="Search Students..."
                                        className="text-gray-900 dark:text-white font-bold"
                                        placeholderTextColor="#9CA3AF"
                                        value={studentSearch}
                                        onChangeText={setStudentSearch}
                                    />
                                </View>

                                {studentSearch.length > 0 && !selectedStudent && (
                                    <View className="max-h-40 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 mb-4 overflow-hidden">
                                        <FlatList 
                                            data={students.filter(s => s.users?.full_name?.toLowerCase().includes(studentSearch.toLowerCase()))}
                                            keyExtractor={item => item.id}
                                            renderItem={({ item }) => (
                                                <TouchableOpacity 
                                                    onPress={() => {
                                                        setSelectedStudent(item);
                                                        setStudentSearch(item.users?.full_name);
                                                    }}
                                                    className="p-4 border-b border-gray-50 dark:border-gray-800"
                                                >
                                                    <Text className="text-gray-900 dark:text-white font-bold">{item.users?.full_name}</Text>
                                                    <Text className="text-gray-400 text-xs">{item.grade_level || item.form_level}</Text>
                                                </TouchableOpacity>
                                            )}
                                        />
                                    </View>
                                )}

                                {selectedStudent && (
                                    <View className="bg-orange-50 dark:bg-orange-950/20 p-4 rounded-2xl flex-row justify-between items-center mb-4">
                                        <Text className="text-orange-600 font-bold">Issuing to: {selectedStudent.users?.full_name}</Text>
                                        <TouchableOpacity onPress={() => setSelectedStudent(null)}>
                                            <X size={16} color="#FF6900" />
                                        </TouchableOpacity>
                                    </View>
                                )}

                                <View className="bg-gray-50 dark:bg-gray-800 px-5 py-4 rounded-2xl border border-gray-100 dark:border-gray-700 mb-6">
                                    <TextInput 
                                        placeholder="Add remarks (e.g. slight tear on cover)..."
                                        multiline
                                        className="text-gray-900 dark:text-white font-medium min-h-[60px]"
                                        placeholderTextColor="#9CA3AF"
                                        value={issueRemarks}
                                        onChangeText={setIssueRemarks}
                                    />
                                </View>

                                <TouchableOpacity 
                                    disabled={!selectedStudent || actionLoading}
                                    onPress={handleIssueToStudent}
                                    className={`py-5 rounded-2xl items-center ${!selectedStudent ? 'bg-gray-200' : 'bg-[#FF6900]'}`}
                                >
                                    <Text className="text-white font-black uppercase tracking-widest text-xs">Confirm Assignment</Text>
                                </TouchableOpacity>
                                
                                <TouchableOpacity onPress={() => setIsIssuing(false)} className="mt-4 p-2 items-center">
                                    <Text className="text-gray-400 font-bold text-[10px] uppercase">Cancel</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                </View>
            </Modal>

            </SubscriptionGate>
        </View>
    );
}
