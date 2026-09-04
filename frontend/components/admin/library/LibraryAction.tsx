import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { LibraryAPI } from "@/services/LibraryService";
import {
    FrontendBook,
    FrontendBorrowedBook,
    UserRoles,
} from "@/types/types";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    RefreshControl,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AddUpdateDeleteBooksForm } from "./AddUpdateDeleteBooksForm";
import { BorrowedBooksOverview } from "./BorrowedBooksOverview";
import { BorrowLimitConfiguration } from "./BorrowLimitConfiguration";
import { LibrarianManagement } from "./LibrarianManagement";
import { UnifiedHeader } from "@/components/common/UnifiedHeader";

type LibrarySection = "overview" | "books" | "borrowed" | "config" | "librarians";

const LibraryAction = () => {
    const { isMain, profile } = useAuth();
    const isMainAdmin = isMain === true;
    const { isDark } = useTheme();
    const [activeSection, setActiveSection] = useState<LibrarySection>("overview");
    const [books, setBooks] = useState<FrontendBook[]>([]);
    const [borrowedBooks, setBorrowedBooks] = useState<FrontendBorrowedBook[]>([]);
    const [userRoles, setUserRoles] = useState<UserRoles[]>([]);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const pageBg = isDark ? '#161B22' : '#FFFFFF';
    const surface = isDark ? '#161B22' : '#F6F8FA';
    const cardBg = isDark ? '#161B22' : '#FFFFFF';
    const border = isDark ? '#21262D' : '#D0D7DE';
    const textSecondary = isDark ? '#9ca3af' : '#64748b';

    useEffect(() => { loadInitialData(); }, []);

    const loadInitialData = async () => {
        setLoading(true);
        setError(null);
        try {
            await Promise.all([loadBooks(), loadBorrowedBooks()]);
        } catch (err) {
            setError("Failed to load library data");
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        try { await loadInitialData(); } finally { setRefreshing(false); }
    };

    const loadBooks = async () => {
        try {
            const booksData = await LibraryAPI.getBooks();
            const transformed = booksData.map(LibraryAPI.transformBookData);
            setBooks(transformed);
        } catch (error) { throw error; }
    };

    const loadBorrowedBooks = async () => {
        try {
            const borrowedData = await LibraryAPI.getAllBorrowedBooks();
            const transformed = borrowedData.map(LibraryAPI.transformBorrowedBookData);
            setBorrowedBooks(transformed);
        } catch (error) { throw error; }
    };

    const showError = (title: string, message: string) => Alert.alert(title, message, [{ text: "OK" }]);
    const showSuccess = (title: string, message: string) => Alert.alert(title, message, [{ text: "OK" }]);

    const handleAddBook = async (bookData: Omit<FrontendBook, "id">) => {
        try {
            setLoading(true);
            const newBook = await LibraryAPI.addBook({ title: bookData.title, author: bookData.author, isbn: bookData.isbn, total_quantity: bookData.quantity, institution_id: profile?.institution_id || "" });
            setBooks(prev => [...prev, LibraryAPI.transformBookData(newBook)]);
            showSuccess("Success", "Book added successfully!");
        } catch { showError("Error", "Failed to add book."); } finally { setLoading(false); }
    };

    const handleUpdateBook = async (id: string, updatedData: Partial<FrontendBook>) => {
        try {
            setLoading(true);
            const updated = await LibraryAPI.updateBook(id, { ...(updatedData.title && { title: updatedData.title }), ...(updatedData.author && { author: updatedData.author }), ...(updatedData.isbn && { isbn: updatedData.isbn }), ...(updatedData.quantity && { total_quantity: updatedData.quantity }) });
            setBooks(prev => prev.map(b => b.id === id ? LibraryAPI.transformBookData(updated) : b));
            showSuccess("Success", "Book updated successfully!");
        } catch { showError("Error", "Failed to update book."); } finally { setLoading(false); }
    };

    const handleDeleteBook = async (id: string) => {
        Alert.alert("Confirm Delete", "Are you sure you want to delete this book?", [
            { text: "Cancel", style: "cancel" },
            { text: "Delete", style: "destructive", onPress: async () => { try { setLoading(true); await LibraryAPI.deleteBook(id); setBooks(prev => prev.filter(b => b.id !== id)); showSuccess("Success", "Book deleted!"); } catch { showError("Error", "Failed to delete book."); } finally { setLoading(false); } } },
        ]);
    };

    const handleReturnBook = async (borrowId: string, fineAmount?: number, condition?: string) => {
        try {
            setLoading(true);
            await LibraryAPI.returnBook(borrowId, condition);
            setBorrowedBooks(prev => prev.map(b => b.id === borrowId ? { ...b, status: "returned" as const, returnDate: new Date().toISOString() as any, returnNotes: condition } : b));
            loadBooks();
            showSuccess("Success", "Book returned successfully!");
        } catch { showError("Error", "Failed to return book."); } finally { setLoading(false); }
    };

    const handleExtendDueDate = async (borrowId: string, newDueDate: Date) => {
        try {
            setLoading(true);
            await LibraryAPI.extendDueDate(borrowId, newDueDate.toISOString().split("T")[0]);
            setBorrowedBooks(prev => prev.map(b => b.id === borrowId ? { ...b, dueDate: newDueDate } : b));
            showSuccess("Success", "Due date extended!");
        } catch { showError("Error", "Failed to extend due date."); } finally { setLoading(false); }
    };

    const handleSendReminder = async (borrowId: string) => {
        try {
            setLoading(true);
            await LibraryAPI.sendReminder(borrowId);
            showSuccess("Success", "Reminder sent!");
        } catch { showError("Error", "Failed to send reminder."); } finally { setLoading(false); }
    };

    const sections = [
        { id: "overview", title: "Overview", icon: "home-outline" },
        { id: "books", title: "Books", icon: "library-outline" },
        { id: "borrowed", title: "Borrowed", icon: "book-outline" },
        { id: "config", title: "Config", icon: "settings-outline" },
        ...(isMainAdmin ? [{ id: "librarians", title: "Librarians", icon: "people-outline" }] : []),
    ];

    const getOverviewStats = () => {
        const totalBooks = books.reduce((sum, b) => sum + b.quantity, 0);
        const availableBooks = books.reduce((sum, b) => sum + b.available, 0);
        const activeBorrows = borrowedBooks.filter(b => b.status === "borrowed").length;
        const overdueBooks = borrowedBooks.filter(b => b.status === "overdue").length;
        const returnedBooks = borrowedBooks.filter(b => b.status === "returned").length;
        return { totalBooks, availableBooks, activeBorrows, overdueBooks, returnedBooks };
    };

    const renderOverview = () => {
        const stats = getOverviewStats();
        const statCards = [
            { value: stats.totalBooks, label: "Total Books", icon: "library-outline", color: "#FF6900", bg: isDark ? 'rgba(255,107,0,0.12)' : '#fff7ed' },
            { value: stats.availableBooks, label: "Available", icon: "checkmark-circle-outline", color: "#10b981", bg: isDark ? '#052e16' : '#f0fdf4' },
            { value: stats.returnedBooks, label: "Returned", icon: "checkmark-done-circle-outline", color: "#10b981", bg: isDark ? '#052e16' : '#f0fdf4' },
            { value: stats.activeBorrows, label: "Borrowed", icon: "book-outline", color: "#FF6900", bg: isDark ? 'rgba(255,107,0,0.12)' : '#fff7ed' },
            { value: stats.overdueBooks, label: "Overdue", icon: "warning-outline", color: "#ef4444", bg: isDark ? 'rgba(239,68,68,0.12)' : '#fef2f2' },
        ];

        return (
            <ScrollView
                style={{ backgroundColor: pageBg }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF6900" colors={["#FF6900"]} />}
            >
                <View style={{ padding: 16 }}>
                    {error && (
                        <View style={{ backgroundColor: isDark ? 'rgba(239,68,68,0.1)' : '#fef2f2', borderWidth: 1, borderColor: isDark ? 'rgba(239,68,68,0.2)' : '#fecaca', borderRadius: 12, padding: 12, marginBottom: 16 }}>
                            <Text style={{ color: '#ef4444', fontWeight: '600' }}>Error: {error}</Text>
                            <TouchableOpacity style={{ marginTop: 8, backgroundColor: '#ef4444', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start' }} onPress={() => { setError(null); loadInitialData(); }}>
                                <Text style={{ color: 'white', fontSize: 12 }}>Retry</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    <Text style={{ fontSize: 19, fontWeight: 'bold', color: isDark ? '#f1f1f1' : '#1e293b', marginBottom: 16 }}>Library Overview</Text>

                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -8, marginBottom: 24 }}>
                        {statCards.map((card, i) => (
                            <View key={i} style={{ width: '50%', paddingHorizontal: 8, marginBottom: 16 }}>
                                <View style={{ borderRadius: 16, padding: 16, borderWidth: 1, borderColor: border, backgroundColor: cardBg }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <View>
                                            <Text style={{ fontSize: 24, fontWeight: 'bold', color: card.color }}>{card.value}</Text>
                                            <Text style={{ fontSize: 13, color: textSecondary }}>{card.label}</Text>
                                        </View>
                                        <View style={{ width: 40, height: 40, backgroundColor: card.bg, borderRadius: 20, alignItems: 'center', justifyContent: 'center' }}>
                                            <Ionicons name={card.icon as any} size={20} color={card.color} />
                                        </View>
                                    </View>
                                </View>
                            </View>
                        ))}
                    </View>

                    <Text style={{ fontSize: 17, fontWeight: '600', color: isDark ? '#f1f1f1' : '#1e293b', marginBottom: 16 }}>Quick Access</Text>
                    <View style={{ gap: 12 }}>
                        {[
                            { section: "books", label: "Manage Books", desc: "Add, edit, or delete books", icon: "library-outline" },
                            { section: "borrowed", label: "Borrowed Books", desc: "Track returns and manage loans", icon: "book-outline" },
                            { section: "config", label: "Borrow Configuration", desc: "Set limits and policies", icon: "settings-outline" },
                            ...(isMainAdmin ? [{ section: "librarians", label: "Manage Librarians", desc: "Designate staff & view audit logs", icon: "people-outline" }] : []),
                        ].map((item) => (
                            <TouchableOpacity key={item.section} style={{ backgroundColor: cardBg, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: border, flexDirection: 'row', alignItems: 'center' }} onPress={() => setActiveSection(item.section as LibrarySection)}>
                                <View style={{ width: 40, height: 40, backgroundColor: isDark ? 'rgba(255,107,0,0.12)' : '#fff7ed', borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                                    <Ionicons name={item.icon as any} size={20} color="#FF6900" />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ fontWeight: '600', color: isDark ? '#f1f1f1' : '#1e293b' }}>{item.label}</Text>
                                    <Text style={{ fontSize: 13, color: textSecondary }}>{item.desc}</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={16} color="#FF6900" />
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            </ScrollView>
        );
    };

    const renderSectionContent = () => {
        switch (activeSection) {
            case "overview": return renderOverview();
            case "books": return <AddUpdateDeleteBooksForm books={books} onAddBook={handleAddBook} onUpdateBook={handleUpdateBook} onDeleteBook={handleDeleteBook} />;
            case "borrowed": return <BorrowedBooksOverview borrowedBooks={borrowedBooks} onReturnBook={handleReturnBook} onExtendDueDate={handleExtendDueDate} onSendReminder={handleSendReminder} />;
            case "config": return (
                <BorrowLimitConfiguration
                    userRoles={userRoles}
                    onUpdateRole={(roleId, updatedRole) => setUserRoles(userRoles.map(r => r.id === roleId ? { ...r, ...updatedRole } : r))}
                    onAddRole={(roleData) => setUserRoles([...userRoles, { ...roleData, id: Date.now().toString() }])}
                    onDeleteRole={(roleId) => setUserRoles(userRoles.filter(r => r.id !== roleId))}
                />
            );
            case "librarians": return <LibrarianManagement />;
            default: return renderOverview();
        }
    };

    return (
        <View style={{ flex: 1, backgroundColor: pageBg }}>
            <UnifiedHeader
                title="Management"
                subtitle="Library"
                role="Admin"
                onBack={() => router.navigate('/management')}
            />

            {/* Section Tabs */}
            <View style={{ backgroundColor: pageBg, borderBottomWidth: 1, borderBottomColor: border }}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
                    <View style={{ flexDirection: 'row', gap: 8, backgroundColor: pageBg }}>
                        {sections.map((section) => {
                            const isActive = activeSection === section.id;
                            return (
                                <TouchableOpacity
                                    key={section.id}
                                    style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999, borderWidth: 1, backgroundColor: isActive ? '#FF6900' : 'transparent', borderColor: isActive ? '#FF6900' : border, flexDirection: 'row', alignItems: 'center', gap: 6 }}
                                    onPress={() => setActiveSection(section.id as LibrarySection)}
                                    disabled={loading}
                                >
                                    <Ionicons name={section.icon as any} size={16} color={isActive ? 'white' : textSecondary} />
                                    <Text style={{ fontSize: 13, fontWeight: '600', color: isActive ? 'white' : textSecondary }}>{section.title}</Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </ScrollView>
            </View>

            <View style={{ flex: 1 }}>{renderSectionContent()}</View>

            {loading && (
                <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
                    <View style={{ backgroundColor: surface, borderRadius: 16, padding: 24, alignItems: 'center' }}>
                        <ActivityIndicator size="large" color="#FF6900" />
                        <Text style={{ marginTop: 12, color: textSecondary, fontWeight: '500' }}>Loading...</Text>
                    </View>
                </View>
            )}
        </View>
    );
};

export default LibraryAction;
