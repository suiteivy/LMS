import { UnifiedHeader } from "@/components/common/UnifiedHeader";
import { ListItemSkeleton } from "@/components/ui/skeletons";
import { useAuth } from "@/contexts/AuthContext";
import { LibraryAPI } from "@/services/LibraryService";
import { FrontendBook, FrontendBorrowedBook } from "@/types/types";
import { router } from "expo-router";
import {
    AlertCircle,
    BookOpen,
    Calendar,
    CheckCircle2,
    Clock,
    Filter,
    Plus,
    RotateCcw,
    Search,
    ShieldAlert,
    User,
    Users,
    X,
    Zap
} from "lucide-react-native";
import React, { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Modal,
    RefreshControl,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";
import { SubscriptionGate } from "@/components/shared/SubscriptionComponents";
import { supabase } from "@/libs/supabase";

interface BorrowerItem {
    id: string;
    name: string;
    type: 'student' | 'teacher';
    displayInfo: string;
    userId: string;
}

export default function TeacherLibraryPage() {
    const { profile, isLibrarian, teacherId } = useAuth();
    const [activeTab, setActiveTab] = useState<'issue' | 'returns'>('issue');

    // Data
    const [books, setBooks] = useState<FrontendBook[]>([]);
    const [borrowedBooks, setBorrowedBooks] = useState<FrontendBorrowedBook[]>([]);
    const [borrowers, setBorrowers] = useState<BorrowerItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Issue Book State
    const [bookSearch, setBookSearch] = useState('');
    const [selectedBook, setSelectedBook] = useState<FrontendBook | null>(null);
    const [borrowerType, setBorrowerType] = useState<'student' | 'teacher'>('student');
    const [borrowerSearch, setBorrowerSearch] = useState('');
    const [selectedBorrower, setSelectedBorrower] = useState<BorrowerItem | null>(null);
    const [loanDays, setLoanDays] = useState(14);
    const [issueNotes, setIssueNotes] = useState('');
    const [isIssuing, setIsIssuing] = useState(false);

    // Return Modal State
    const [returnModalVisible, setReturnModalVisible] = useState(false);
    const [selectedLoanToReturn, setSelectedLoanToReturn] = useState<FrontendBorrowedBook | null>(null);
    const [returnNotes, setReturnNotes] = useState('');
    const [isReturning, setIsReturning] = useState(false);

    // Filter for Active Loans
    const [loanSearch, setLoanSearch] = useState('');
    const [loanFilter, setLoanFilter] = useState<'all' | 'active' | 'overdue'>('active');

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const institutionId = profile?.institution_id;
            if (!institutionId) return;

            const [booksData, borrowedData, studentsRes, teachersRes] = await Promise.all([
                LibraryAPI.getBooks(),
                LibraryAPI.getAllBorrowedBooks(),
                supabase
                    .from('students')
                    .select('id, user_id, grade_level, form_level, users!inner(id, full_name, first_name, last_name, email)')
                    .eq('institution_id', institutionId),
                supabase
                    .from('teachers')
                    .select('id, user_id, department, position, users!inner(id, full_name, first_name, last_name, email)')
                    .eq('institution_id', institutionId)
            ]);

            setBooks(booksData.map(LibraryAPI.transformBookData));
            setBorrowedBooks(borrowedData.map(LibraryAPI.transformBorrowedBookData));

            const studentItems: BorrowerItem[] = (studentsRes.data || []).map((s: any) => {
                const u = s.users;
                const name = u?.full_name || `${u?.first_name || ''} ${u?.last_name || ''}`.trim() || 'Unnamed Student';
                const level = s.grade_level ? `Grade ${s.grade_level}` : (s.form_level ? `Form ${s.form_level}` : 'Student');
                return {
                    id: s.id,
                    name,
                    type: 'student',
                    displayInfo: level,
                    userId: s.user_id || u?.id
                };
            });

            const teacherItems: BorrowerItem[] = (teachersRes.data || []).map((t: any) => {
                const u = t.users;
                const name = u?.full_name || `${u?.first_name || ''} ${u?.last_name || ''}`.trim() || 'Unnamed Teacher';
                const dept = t.department ? `Dept: ${t.department}` : (t.position || 'Faculty');
                return {
                    id: t.id,
                    name,
                    type: 'teacher',
                    displayInfo: dept,
                    userId: t.user_id || u?.id
                };
            });

            setBorrowers([...studentItems, ...teacherItems]);
        } catch (error) {
            console.error("Error fetching library data:", error);
            Alert.alert("Error", "Failed to load library circulation data.");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [profile?.institution_id]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const onRefresh = () => {
        setRefreshing(true);
        loadData();
    };

    // Handle Issue Book
    const handleIssueBook = async () => {
        if (!selectedBook) {
            Alert.alert("Missing Book", "Please select a book to issue.");
            return;
        }
        if (!selectedBorrower) {
            Alert.alert("Missing Borrower", "Please select a borrower.");
            return;
        }

        // Self-checkout check
        if (selectedBorrower.type === 'teacher' && selectedBorrower.id === teacherId) {
            Alert.alert(
                "Self-Checkout Not Permitted",
                "Librarians cannot issue books to themselves. Please have another designated librarian process your loan."
            );
            return;
        }

        try {
            setIsIssuing(true);
            const payload = {
                bookId: selectedBook.id,
                ...(selectedBorrower.type === 'student' ? { studentId: selectedBorrower.id } : { teacherId: selectedBorrower.id }),
                notes: issueNotes,
                days: loanDays
            };

            await LibraryAPI.issueBook(payload);
            Alert.alert("Success", `"${selectedBook.title}" issued to ${selectedBorrower.name}!`);

            // Reset form
            setSelectedBook(null);
            setSelectedBorrower(null);
            setBorrowerSearch('');
            setIssueNotes('');
            setLoanDays(14);
            loadData();
        } catch (error: any) {
            console.error("Error issuing book:", error);
            Alert.alert("Issue Failed", error.response?.data?.error || "Failed to issue book.");
        } finally {
            setIsIssuing(false);
        }
    };

    // Handle Process Return
    const handleReturnBook = async () => {
        if (!selectedLoanToReturn) return;

        try {
            setIsReturning(true);
            await LibraryAPI.returnBook(selectedLoanToReturn.id, returnNotes);
            Alert.alert("Success", `Book returned successfully!`);
            setReturnModalVisible(false);
            setSelectedLoanToReturn(null);
            setReturnNotes('');
            loadData();
        } catch (error: any) {
            console.error("Error returning book:", error);
            Alert.alert("Return Failed", error.response?.data?.error || "Failed to process book return.");
        } finally {
            setIsReturning(false);
        }
    };

    // Filtered lists
    const filteredAvailableBooks = books.filter(b =>
        b.available > 0 &&
        (b.title.toLowerCase().includes(bookSearch.toLowerCase()) ||
         b.author.toLowerCase().includes(bookSearch.toLowerCase()))
    );

    const filteredBorrowers = borrowers.filter(b =>
        b.type === borrowerType &&
        b.name.toLowerCase().includes(borrowerSearch.toLowerCase())
    );

    const filteredLoans = borrowedBooks.filter(loan => {
        const matchesSearch =
            loan.bookTitle.toLowerCase().includes(loanSearch.toLowerCase()) ||
            loan.borrowerName.toLowerCase().includes(loanSearch.toLowerCase());

        const isReturned = loan.status === 'returned';
        const isOverdue = loan.status === 'overdue';

        if (loanFilter === 'active') return !isReturned;
        if (loanFilter === 'overdue') return isOverdue;
        return true;
    });

    // Guard: Non-librarians cannot view this desk
    if (!isLibrarian) {
        return (
            <View className="flex-1 bg-[#FFFFFF] dark:bg-[#161B22]">
                <UnifiedHeader
                    title="Management"
                    subtitle="Circulation Desk"
                    role="Teacher"
                    fallbackPath="/(teacher)/management"
                />
                <View className="flex-1 items-center justify-center p-8">
                    <View className="bg-red-50 dark:bg-red-950/20 p-8 rounded-[36px] items-center border border-red-200 dark:border-red-900 border-dashed max-w-sm">
                        <ShieldAlert size={52} color="#EF4444" style={{ marginBottom: 16 }} />
                        <Text className="text-xl font-bold text-gray-900 dark:text-white text-center mb-2">
                            Librarian Designation Required
                        </Text>
                        <Text className="text-gray-500 dark:text-gray-400 text-center mb-6 text-xs leading-5">
                            You are not designated as a Librarian for this institution. Book circulation (checkout and return) is restricted to designated staff.
                        </Text>
                        <TouchableOpacity
                            onPress={() => router.back()}
                            className="bg-gray-900 dark:bg-white px-6 py-3.5 rounded-xl"
                        >
                            <Text className="text-white dark:text-gray-900 font-bold text-xs uppercase tracking-wider">
                                Return to Management
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        );
    }

    return (
        <View className="flex-1 bg-[#FFFFFF] dark:bg-[#161B22]">
            <UnifiedHeader
                title="Management"
                subtitle="Circulation Desk"
                role="Teacher"
                fallbackPath="/(teacher)/management"
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
                        </View>
                    </View>
                }
            >
                {/* Desk Switcher Tabs */}
                <View className="flex-row bg-[#F6F8FA] dark:bg-[#1C2128] p-1.5 mx-4 mt-4 rounded-2xl border border-[#D0D7DE] dark:border-[#21262D]">
                    <TouchableOpacity
                        onPress={() => setActiveTab('issue')}
                        className={`flex-1 py-3 rounded-xl flex-row items-center justify-center gap-2 ${activeTab === 'issue' ? 'bg-[#FF6900]' : ''}`}
                    >
                        <BookOpen size={16} color={activeTab === 'issue' ? 'white' : '#6B7280'} />
                        <Text className={`text-xs font-bold uppercase tracking-wider ${activeTab === 'issue' ? 'text-white' : 'text-gray-500 dark:text-gray-400'}`}>
                            Issue Book
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={() => setActiveTab('returns')}
                        className={`flex-1 py-3 rounded-xl flex-row items-center justify-center gap-2 ${activeTab === 'returns' ? 'bg-[#FF6900]' : ''}`}
                    >
                        <RotateCcw size={16} color={activeTab === 'returns' ? 'white' : '#6B7280'} />
                        <Text className={`text-xs font-bold uppercase tracking-wider ${activeTab === 'returns' ? 'text-white' : 'text-gray-500 dark:text-gray-400'}`}>
                            Circulation & Returns
                        </Text>
                    </TouchableOpacity>
                </View>

                {loading ? (
                    <View className="p-6">
                        <ListItemSkeleton loading={loading} count={4} label="Loading circulation desk..." />
                    </View>
                ) : activeTab === 'issue' ? (
                    /* ================= TAB 1: ISSUE BOOK ================= */
                    <ScrollView
                        className="flex-1 p-4 md:p-8"
                        showsVerticalScrollIndicator={false}
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#FF6900"]} />}
                        contentContainerStyle={{ paddingBottom: 100 }}
                    >
                        {/* 1. SELECT BOOK */}
                        <View className="mb-6">
                            <Text className="text-gray-400 dark:text-gray-500 font-bold text-[10px] uppercase tracking-[3px] mb-2 px-1">
                                1. Select Book
                            </Text>
                            {selectedBook ? (
                                <View className="bg-orange-50 dark:bg-orange-950/20 p-4 rounded-2xl border border-orange-200 dark:border-orange-800 flex-row justify-between items-center">
                                    <View className="flex-1 mr-3">
                                        <Text className="text-gray-900 dark:text-white font-bold text-sm" numberOfLines={1}>{selectedBook.title}</Text>
                                        <Text className="text-gray-500 dark:text-gray-400 text-xs">by {selectedBook.author} • {selectedBook.available} available</Text>
                                    </View>
                                    <TouchableOpacity onPress={() => setSelectedBook(null)} className="p-2">
                                        <X size={18} color="#FF6900" />
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <View>
                                    <View className="flex-row items-center bg-[#F6F8FA] dark:bg-[#161B22] px-4 py-3 rounded-xl border border-[#D0D7DE] dark:border-[#21262D] mb-2">
                                        <Search size={16} color="#9CA3AF" />
                                        <TextInput
                                            placeholder="Search available books..."
                                            placeholderTextColor="#9CA3AF"
                                            className="flex-1 ml-2 text-gray-900 dark:text-white text-xs font-medium"
                                            value={bookSearch}
                                            onChangeText={setBookSearch}
                                        />
                                    </View>
                                    <View className="max-h-48 bg-[#F6F8FA] dark:bg-[#161B22] rounded-xl border border-[#D0D7DE] dark:border-[#21262D] overflow-hidden">
                                        <ScrollView nestedScrollEnabled>
                                            {filteredAvailableBooks.length === 0 ? (
                                                <Text className="p-4 text-center text-gray-400 text-xs">No matching available books</Text>
                                            ) : (
                                                filteredAvailableBooks.map((b) => (
                                                    <TouchableOpacity
                                                        key={b.id}
                                                        onPress={() => {
                                                            setSelectedBook(b);
                                                            setBookSearch('');
                                                        }}
                                                        className="p-3 border-b border-[#D0D7DE] dark:border-[#21262D] flex-row justify-between items-center active:bg-gray-100 dark:active:bg-gray-800"
                                                    >
                                                        <View className="flex-1 pr-2">
                                                            <Text className="text-gray-900 dark:text-white font-bold text-xs" numberOfLines={1}>{b.title}</Text>
                                                            <Text className="text-gray-400 text-[11px]">{b.author}</Text>
                                                        </View>
                                                        <View className="bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded-full">
                                                            <Text className="text-emerald-600 text-[10px] font-bold">{b.available} left</Text>
                                                        </View>
                                                    </TouchableOpacity>
                                                ))
                                            )}
                                        </ScrollView>
                                    </View>
                                </View>
                            )}
                        </View>

                        {/* 2. SELECT BORROWER */}
                        <View className="mb-6">
                            <Text className="text-gray-400 dark:text-gray-500 font-bold text-[10px] uppercase tracking-[3px] mb-2 px-1">
                                2. Select Borrower
                            </Text>

                            {/* Borrower Type Pill */}
                            <View className="flex-row gap-2 mb-3">
                                <TouchableOpacity
                                    onPress={() => {
                                        setBorrowerType('student');
                                        setSelectedBorrower(null);
                                    }}
                                    className={`flex-1 py-2 rounded-xl items-center border ${borrowerType === 'student' ? 'bg-[#FF6900] border-[#FF6900]' : 'bg-[#F6F8FA] dark:bg-[#161B22] border-[#D0D7DE] dark:border-[#21262D]'}`}
                                >
                                    <Text className={`text-xs font-bold ${borrowerType === 'student' ? 'text-white' : 'text-gray-600 dark:text-gray-400'}`}>
                                        Student
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={() => {
                                        setBorrowerType('teacher');
                                        setSelectedBorrower(null);
                                    }}
                                    className={`flex-1 py-2 rounded-xl items-center border ${borrowerType === 'teacher' ? 'bg-[#FF6900] border-[#FF6900]' : 'bg-[#F6F8FA] dark:bg-[#161B22] border-[#D0D7DE] dark:border-[#21262D]'}`}
                                >
                                    <Text className={`text-xs font-bold ${borrowerType === 'teacher' ? 'text-white' : 'text-gray-600 dark:text-gray-400'}`}>
                                        Teacher / Staff
                                    </Text>
                                </TouchableOpacity>
                            </View>

                            {selectedBorrower ? (
                                <View className="bg-orange-50 dark:bg-orange-950/20 p-4 rounded-2xl border border-orange-200 dark:border-orange-800 flex-row justify-between items-center">
                                    <View className="flex-1 mr-3">
                                        <Text className="text-gray-900 dark:text-white font-bold text-sm">{selectedBorrower.name}</Text>
                                        <Text className="text-gray-500 dark:text-gray-400 text-xs">
                                            {selectedBorrower.type.toUpperCase()} • {selectedBorrower.displayInfo}
                                        </Text>
                                    </View>
                                    <TouchableOpacity onPress={() => setSelectedBorrower(null)} className="p-2">
                                        <X size={18} color="#FF6900" />
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <View>
                                    <View className="flex-row items-center bg-[#F6F8FA] dark:bg-[#161B22] px-4 py-3 rounded-xl border border-[#D0D7DE] dark:border-[#21262D] mb-2">
                                        <Search size={16} color="#9CA3AF" />
                                        <TextInput
                                            placeholder={`Search ${borrowerType === 'student' ? 'students' : 'teachers'}...`}
                                            placeholderTextColor="#9CA3AF"
                                            className="flex-1 ml-2 text-gray-900 dark:text-white text-xs font-medium"
                                            value={borrowerSearch}
                                            onChangeText={setBorrowerSearch}
                                        />
                                    </View>
                                    <View className="max-h-48 bg-[#F6F8FA] dark:bg-[#161B22] rounded-xl border border-[#D0D7DE] dark:border-[#21262D] overflow-hidden">
                                        <ScrollView nestedScrollEnabled>
                                            {filteredBorrowers.length === 0 ? (
                                                <Text className="p-4 text-center text-gray-400 text-xs">No borrowers found</Text>
                                            ) : (
                                                filteredBorrowers.map((b) => (
                                                    <TouchableOpacity
                                                        key={b.id}
                                                        onPress={() => {
                                                            setSelectedBorrower(b);
                                                            setBorrowerSearch('');
                                                        }}
                                                        className="p-3 border-b border-[#D0D7DE] dark:border-[#21262D] flex-row justify-between items-center active:bg-gray-100 dark:active:bg-gray-800"
                                                    >
                                                        <View className="flex-1 pr-2">
                                                            <Text className="text-gray-900 dark:text-white font-bold text-xs">{b.name}</Text>
                                                            <Text className="text-gray-400 text-[11px]">{b.displayInfo}</Text>
                                                        </View>
                                                        {b.id === teacherId && (
                                                            <Text className="text-xs text-amber-500 font-bold">(You)</Text>
                                                        )}
                                                    </TouchableOpacity>
                                                ))
                                            )}
                                        </ScrollView>
                                    </View>
                                </View>
                            )}

                            {selectedBorrower && selectedBorrower.type === 'teacher' && selectedBorrower.id === teacherId && (
                                <View className="mt-2 bg-amber-50 dark:bg-amber-950/20 p-3 rounded-xl border border-amber-200 dark:border-amber-800 flex-row items-center">
                                    <AlertCircle size={16} color="#F59E0B" className="mr-2" />
                                    <Text className="text-amber-800 dark:text-amber-200 text-xs ml-2 flex-1">
                                        Librarians cannot checkout books to themselves. Please select another borrower or have a peer librarian issue this book.
                                    </Text>
                                </View>
                            )}
                        </View>

                        {/* 3. LOAN DURATION */}
                        <View className="mb-6">
                            <Text className="text-gray-400 dark:text-gray-500 font-bold text-[10px] uppercase tracking-[3px] mb-2 px-1">
                                3. Loan Period
                            </Text>
                            <View className="flex-row gap-2">
                                {[7, 14, 21, 28].map((days) => (
                                    <TouchableOpacity
                                        key={days}
                                        onPress={() => setLoanDays(days)}
                                        className={`flex-1 py-3 rounded-xl items-center border ${loanDays === days ? 'bg-[#FF6900] border-[#FF6900]' : 'bg-[#F6F8FA] dark:bg-[#161B22] border-[#D0D7DE] dark:border-[#21262D]'}`}
                                    >
                                        <Text className={`text-xs font-bold ${loanDays === days ? 'text-white' : 'text-gray-600 dark:text-gray-400'}`}>
                                            {days} Days
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        {/* 4. CONDITION / REMARKS */}
                        <View className="mb-8">
                            <Text className="text-gray-400 dark:text-gray-500 font-bold text-[10px] uppercase tracking-[3px] mb-2 px-1">
                                4. Issue Remarks & Condition
                            </Text>
                            <TextInput
                                placeholder="E.g. Brand new copy, slight crease on cover, borrower notified of due date..."
                                placeholderTextColor="#9CA3AF"
                                multiline
                                numberOfLines={3}
                                className="bg-[#F6F8FA] dark:bg-[#161B22] p-4 rounded-xl border border-[#D0D7DE] dark:border-[#21262D] text-gray-900 dark:text-white text-xs font-medium min-h-[80px]"
                                value={issueNotes}
                                onChangeText={setIssueNotes}
                            />
                        </View>

                        {/* SUBMIT BUTTON */}
                        <TouchableOpacity
                            disabled={!selectedBook || !selectedBorrower || isIssuing || (selectedBorrower?.type === 'teacher' && selectedBorrower?.id === teacherId)}
                            onPress={handleIssueBook}
                            className={`py-4 rounded-xl items-center shadow-sm ${!selectedBook || !selectedBorrower || (selectedBorrower?.type === 'teacher' && selectedBorrower?.id === teacherId) ? 'bg-gray-300 dark:bg-gray-800' : 'bg-[#FF6900]'}`}
                        >
                            {isIssuing ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <Text className="text-white font-bold text-sm uppercase tracking-wider">
                                    Confirm Book Checkout
                                </Text>
                            )}
                        </TouchableOpacity>
                    </ScrollView>
                ) : (
                    /* ================= TAB 2: ACTIVE LOANS & RETURNS ================= */
                    <View className="flex-1 p-4 md:p-8">
                        {/* Search & Filter Header */}
                        <View className="flex-row items-center bg-[#F6F8FA] dark:bg-[#161B22] px-4 py-3 rounded-xl border border-[#D0D7DE] dark:border-[#21262D] mb-4">
                            <Search size={18} color="#9CA3AF" />
                            <TextInput
                                placeholder="Search by book or borrower..."
                                placeholderTextColor="#9CA3AF"
                                className="flex-1 ml-2 text-gray-900 dark:text-white text-xs font-medium"
                                value={loanSearch}
                                onChangeText={setLoanSearch}
                            />
                        </View>

                        {/* Status Filter Badges */}
                        <View className="flex-row gap-2 mb-4">
                            {(['active', 'overdue', 'all'] as const).map((filter) => (
                                <TouchableOpacity
                                    key={filter}
                                    onPress={() => setLoanFilter(filter)}
                                    className={`px-4 py-2 rounded-full border ${loanFilter === filter ? 'bg-[#FF6900] border-[#FF6900]' : 'bg-[#F6F8FA] dark:bg-[#161B22] border-[#D0D7DE] dark:border-[#21262D]'}`}
                                >
                                    <Text className={`text-[10px] font-bold uppercase tracking-wider ${loanFilter === filter ? 'text-white' : 'text-gray-600 dark:text-gray-400'}`}>
                                        {filter === 'active' ? 'Active Borrows' : filter === 'overdue' ? 'Overdue Only' : 'All Records'}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {filteredLoans.length === 0 ? (
                            <View className="bg-[#F6F8FA] dark:bg-[#161B22] p-12 rounded-3xl items-center border border-[#D0D7DE] dark:border-[#21262D] border-dashed mt-4">
                                <CheckCircle2 size={44} color="#10B981" style={{ opacity: 0.5 }} />
                                <Text className="text-gray-400 font-bold text-center mt-4 text-xs uppercase tracking-wider">
                                    No matching loans found
                                </Text>
                            </View>
                        ) : (
                            <ScrollView
                                showsVerticalScrollIndicator={false}
                                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#FF6900"]} />}
                                contentContainerStyle={{ paddingBottom: 100 }}
                            >
                                {filteredLoans.map((loan) => (
                                    <View
                                        key={loan.id}
                                        className="bg-[#F6F8FA] dark:bg-[#161B22] p-4 rounded-2xl border border-[#D0D7DE] dark:border-[#21262D] mb-3"
                                    >
                                        <View className="flex-row justify-between items-start mb-2">
                                            <View className="flex-1 pr-2">
                                                <Text className="text-gray-900 dark:text-white font-bold text-sm" numberOfLines={1}>
                                                    {loan.bookTitle}
                                                </Text>
                                                <Text className="text-[#FF6900] text-xs font-bold mt-0.5">
                                                    {loan.borrowerName} ({loan.borrowerType === 'student' ? 'Student' : 'Staff'})
                                                </Text>
                                            </View>
                                            <View className={`px-2.5 py-1 rounded-full border ${loan.status === 'overdue' ? 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900' : loan.status === 'returned' ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900' : 'bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-900'}`}>
                                                <Text className={`font-bold text-[8px] uppercase tracking-wider ${loan.status === 'overdue' ? 'text-red-600' : loan.status === 'returned' ? 'text-emerald-600' : 'text-[#FF6900]'}`}>
                                                    {loan.status}
                                                </Text>
                                            </View>
                                        </View>

                                        <View className="bg-white dark:bg-[#21262D] p-3 rounded-xl mb-3 flex-row justify-between text-xs">
                                            <View>
                                                <Text className="text-gray-400 text-[9px] font-bold uppercase">Borrowed</Text>
                                                <Text className="text-gray-700 dark:text-gray-300 font-medium text-xs">
                                                    {new Date(loan.borrowDate).toLocaleDateString()}
                                                </Text>
                                            </View>
                                            <View className="items-end">
                                                <Text className="text-gray-400 text-[9px] font-bold uppercase">Due Back</Text>
                                                <Text className={`font-bold text-xs ${loan.status === 'overdue' ? 'text-red-600' : 'text-gray-700 dark:text-gray-300'}`}>
                                                    {new Date(loan.dueDate).toLocaleDateString()}
                                                </Text>
                                            </View>
                                        </View>

                                        {loan.issuerName && (
                                            <Text className="text-gray-400 text-[10px] mb-2 px-1">
                                                Issued by: <Text className="font-semibold text-gray-600 dark:text-gray-300">{loan.issuerName}</Text>
                                            </Text>
                                        )}

                                        {loan.status !== 'returned' && (
                                            <TouchableOpacity
                                                onPress={() => {
                                                    setSelectedLoanToReturn(loan);
                                                    setReturnModalVisible(true);
                                                }}
                                                className="py-2.5 bg-gray-900 dark:bg-white rounded-xl items-center flex-row justify-center gap-2"
                                            >
                                                <RotateCcw size={14} color={profile?.role === 'teacher' ? 'white' : '#111827'} />
                                                <Text className="text-white dark:text-gray-900 font-bold text-xs uppercase tracking-wider">
                                                    Process Return
                                                </Text>
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                ))}
                            </ScrollView>
                        )}
                    </View>
                )}

                {/* Return Book Modal */}
                <Modal
                    visible={returnModalVisible}
                    transparent
                    animationType="slide"
                    onRequestClose={() => setReturnModalVisible(false)}
                >
                    <View className="flex-1 bg-black/60 justify-end">
                        <View className="bg-white dark:bg-[#161B22] rounded-t-[40px] p-8 pb-12 border-t border-[#D0D7DE] dark:border-[#21262D]">
                            <View className="flex-row justify-between items-center mb-6">
                                <View>
                                    <Text className="text-xs text-[#FF6900] font-bold uppercase tracking-wider">Circulation Desk</Text>
                                    <Text className="text-2xl font-bold dark:text-white">Process Book Return</Text>
                                </View>
                                <TouchableOpacity onPress={() => setReturnModalVisible(false)} className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-full items-center justify-center">
                                    <X size={20} color="#94a3b8" />
                                </TouchableOpacity>
                            </View>

                            <View className="bg-gray-50 dark:bg-[#21262D] p-4 rounded-2xl mb-4">
                                <Text className="text-gray-400 text-[10px] font-bold uppercase mb-1">Book</Text>
                                <Text className="font-bold text-sm dark:text-white">{selectedLoanToReturn?.bookTitle}</Text>
                                <Text className="text-gray-400 text-xs mt-1">
                                    Borrower: <Text className="text-gray-700 dark:text-gray-200 font-semibold">{selectedLoanToReturn?.borrowerName}</Text>
                                </Text>
                            </View>

                            <View className="mb-6">
                                <Text className="text-gray-400 text-[10px] font-bold uppercase mb-2">
                                    Return Notes / Condition
                                </Text>
                                <TextInput
                                    placeholder="E.g. Returned in good condition, minor cover wear..."
                                    placeholderTextColor="#94a3b8"
                                    multiline
                                    numberOfLines={3}
                                    className="bg-gray-50 dark:bg-[#21262D] p-4 rounded-2xl text-xs dark:text-white min-h-[80px]"
                                    value={returnNotes}
                                    onChangeText={setReturnNotes}
                                />
                            </View>

                            <TouchableOpacity
                                onPress={handleReturnBook}
                                disabled={isReturning}
                                className="py-4 bg-[#FF6900] rounded-xl items-center shadow-md mb-3"
                            >
                                {isReturning ? (
                                    <ActivityIndicator color="white" />
                                ) : (
                                    <Text className="text-white font-bold text-sm uppercase tracking-wider">
                                        Confirm Return & Restock Book
                                    </Text>
                                )}
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={() => setReturnModalVisible(false)}
                                className="py-3 items-center"
                            >
                                <Text className="text-gray-400 font-bold text-xs uppercase">Cancel</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>
            </SubscriptionGate>
        </View>
    );
}
