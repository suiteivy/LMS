import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AddUpdateDeleteBooksForm } from "./AddUpdateDeleteBooksForm";
import { BorrowedBooksOverview } from "./BorrowedBooksOverview";
import { Book, BorrowedBook, UserRoles } from "@/types/types";
import { BorrowLimitConfiguration } from "./BorrowLimitConfiguration";
import { LibraryAPI } from "@/services/LibraryService";

type LibrarySection = "overview" | "books" | "borrowed" | "config";

const LibraryAction = () => {
  const [activeSection, setActiveSection] =
    useState<LibrarySection>("overview");

  // State management
  const [books, setBooks] = useState<Book[]>([]);
  const [borrowedBooks, setBorrowedBooks] = useState<BorrowedBook[]>([]);
  const [userRoles, setUserRoles] = useState<UserRoles[]>([]);

  // Loading states
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load initial data
  useEffect(() => {
    loadInitialData();
  }, []);

  /**
   * Load all required data on component mount
   */
  const loadInitialData = async () => {
    setLoading(true);
    setError(null);

    try {
      await Promise.all([
        loadBooks(),
        loadBorrowedBooks(),
        // loadUserRoles(), // Implement when roles API is available
      ]);
    } catch (err) {
      setError("Failed to load library data");
      console.error("Error loading initial data:", err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Refresh data with pull-to-refresh
   */
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadInitialData();
    } finally {
      setRefreshing(false);
    }
  };

  /**
   * Load books from API
   */
  const loadBooks = async () => {
    try {
      const booksData = await LibraryAPI.getBooks();
      const transformedBooks = booksData.map(LibraryAPI.transformBookData);
      setBooks(transformedBooks);
    } catch (error) {
      console.error("Error loading books:", error);
      throw error;
    }
  };

  /**
   * Load borrowed books from API
   */
  const loadBorrowedBooks = async () => {
    try {
      const borrowedData = await LibraryAPI.getAllBorrowedBooks();
      const transformedBorrowedBooks = borrowedData.map(
        LibraryAPI.transformBorrowedBookData
      );
      setBorrowedBooks(transformedBorrowedBooks);
    } catch (error) {
      console.error("Error loading borrowed books:", error);
      throw error;
    }
  };

  /**
   * Show error alert
   */
  const showError = (title: string, message: string) => {
    Alert.alert(title, message, [{ text: "OK" }]);
  };

  /**
   * Show success alert
   */
  const showSuccess = (title: string, message: string) => {
    Alert.alert(title, message, [{ text: "OK" }]);
  };

  // Handler functions integrated with API
  const handleAddBook = async (bookData: Omit<Book, "id">) => {
    try {
      setLoading(true);

      // Transform to backend format
      const backendBookData = {
        title: bookData.title,
        author: bookData.author,
        isbn: bookData.isbn,
        total_quantity: bookData.quantity,
        institution_id: "current-institution-id", // Get from user context
      };

      const newBook = await LibraryAPI.addBook(backendBookData);
      const transformedBook = LibraryAPI.transformBookData(newBook);

      setBooks((prevBooks) => [...prevBooks, transformedBook]);
      showSuccess("Success", "Book added successfully!");
    } catch (error) {
      showError("Error", "Failed to add book. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateBook = async (id: string, updatedData: Partial<Book>) => {
    try {
      setLoading(true);

      // Transform to backend format
      const backendUpdateData = {
        ...(updatedData.title && { title: updatedData.title }),
        ...(updatedData.author && { author: updatedData.author }),
        ...(updatedData.isbn && { isbn: updatedData.isbn }),
        ...(updatedData.quantity && { total_quantity: updatedData.quantity }),
      };

      const updatedBook = await LibraryAPI.updateBook(id, backendUpdateData);
      const transformedBook = LibraryAPI.transformBookData(updatedBook);

      setBooks((prevBooks) =>
        prevBooks.map((book) => (book.id === id ? transformedBook : book))
      );
      showSuccess("Success", "Book updated successfully!");
    } catch (error) {
      showError("Error", "Failed to update book. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBook = async (id: string) => {
    Alert.alert(
      "Confirm Delete",
      "Are you sure you want to delete this book?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true);
              await LibraryAPI.deleteBook(id);
              setBooks((prevBooks) =>
                prevBooks.filter((book) => book.id !== id)
              );
              showSuccess("Success", "Book deleted successfully!");
            } catch (error) {
              showError("Error", "Failed to delete book. Please try again.");
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleReturnBook = async (borrowId: string) => {
    try {
      setLoading(true);

      await LibraryAPI.returnBook(borrowId);

      // Update local state
      setBorrowedBooks((prevBorrowedBooks) =>
        prevBorrowedBooks.map((borrowed) =>
          borrowed.id === borrowId
            ? {
                ...borrowed,
                status: "returned" as const,
                returnDate: new Date(),
              }
            : borrowed
        )
      );

      // Update book availability
      const borrowedBook = borrowedBooks.find((b) => b.id === borrowId);
      if (borrowedBook) {
        const book = books.find((b) => b.title === borrowedBook.bookTitle);
        if (book) {
          setBooks((prevBooks) =>
            prevBooks.map((b) =>
              b.id === book.id ? { ...b, available: b.available + 1 } : b
            )
          );
        }
      }

      showSuccess("Success", "Book returned successfully!");
    } catch (error) {
      showError("Error", "Failed to return book. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleExtendDueDate = async (borrowId: string, newDueDate: Date) => {
    try {
      setLoading(true);

      const formattedDate = newDueDate.toISOString().split("T")[0];
      await LibraryAPI.extendDueDate(borrowId, formattedDate);

      setBorrowedBooks((prevBorrowedBooks) =>
        prevBorrowedBooks.map((borrowed) =>
          borrowed.id === borrowId
            ? { ...borrowed, dueDate: newDueDate }
            : borrowed
        )
      );

      showSuccess("Success", "Due date extended successfully!");
    } catch (error) {
      showError("Error", "Failed to extend due date. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSendReminder = async (borrowId: string) => {
    try {
      setLoading(true);

      await LibraryAPI.sendReminder(borrowId);
      showSuccess("Success", "Reminder sent successfully!");
    } catch (error) {
      showError("Error", "Failed to send reminder. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Navigation sections
  const sections = [
    { id: "overview", title: "Overview", icon: "home-outline" },
    { id: "books", title: "Books", icon: "library-outline" },
    { id: "borrowed", title: "Borrowed", icon: "book-outline" },
    { id: "config", title: "Config", icon: "settings-outline" },
  ];

  const getOverviewStats = () => {
    const totalBooks = books.reduce((sum, book) => sum + book.quantity, 0);
    const availableBooks = books.reduce((sum, book) => sum + book.available, 0);
    const activeBorrows = borrowedBooks.filter(
      (b) => b.status === "borrowed"
    ).length;
    const overdueBooks = borrowedBooks.filter(
      (b) => b.status === "overdue"
    ).length;
    const returnedBooks = borrowedBooks.filter(
      (b) => b.status === "returned"
    ).length;

    return {
      totalBooks,
      availableBooks,
      activeBorrows,
      overdueBooks,
      returnedBooks,
    };
  };

  const renderOverview = () => {
    const stats = getOverviewStats();

    return (
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View className="p-4">
          {/* Error Display */}
          {error && (
            <View className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
              <View className="flex-row items-center">
                <Ionicons name="warning-outline" size={20} color="#EF4444" />
                <Text className="ml-2 text-red-600 font-medium">Error</Text>
              </View>
              <Text className="text-red-600 mt-1">{error}</Text>
              <TouchableOpacity
                className="mt-2 bg-red-600 rounded-md px-3 py-1 self-start"
                onPress={() => {
                  setError(null);
                  loadInitialData();
                }}
              >
                <Text className="text-white text-sm">Retry</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Stats Cards */}
          <View className="mb-6">
            <Text className="text-xl font-bold text-slate-800 mb-4">
              Library Overview
            </Text>

            <View className="flex-row flex-wrap -mx-2">
              <View className="w-1/2 px-2 mb-4">
                <View className="bg-white rounded-xl p-4 shadow-sm">
                  <View className="flex-row items-center justify-between">
                    <View>
                      <Text className="text-2xl font-bold text-teal-600">
                        {stats.totalBooks}
                      </Text>
                      <Text className="text-sm text-slate-600">
                        Total Books
                      </Text>
                    </View>
                    <View className="w-10 h-10 bg-teal-100 rounded-full items-center justify-center">
                      <Ionicons
                        name="library-outline"
                        size={20}
                        color="#128C7E"
                      />
                    </View>
                  </View>
                </View>
              </View>

              <View className="w-1/2 px-2 mb-4">
                <View className="bg-white rounded-xl p-4 shadow-sm">
                  <View className="flex-row items-center justify-between">
                    <View>
                      <Text className="text-2xl font-bold text-mint-600">
                        {stats.availableBooks}
                      </Text>
                      <Text className="text-sm text-slate-600">Available</Text>
                    </View>
                    <View className="w-10 h-10 bg-mint-100 rounded-full items-center justify-center">
                      <Ionicons
                        name="checkmark-circle-outline"
                        size={20}
                        color="#1ABC9C"
                      />
                    </View>
                  </View>
                </View>
              </View>

              <View className="w-1/2 px-2 mb-4">
                <View className="bg-white rounded-xl p-4 shadow-sm">
                  <View className="flex-row items-center justify-between">
                    <View>
                      <Text className="text-2xl font-bold text-mint-600">
                        {stats.returnedBooks}
                      </Text>
                      <Text className="text-sm text-slate-600">Returned</Text>
                    </View>
                    <View className="w-10 h-10 bg-mint-100 rounded-full items-center justify-center">
                      <Ionicons
                        name="checkmark-circle-outline"
                        size={20}
                        color="#1ABC9C"
                      />
                    </View>
                  </View>
                </View>
              </View>

              <View className="w-1/2 px-2 mb-4">
                <View className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
                  <View className="flex-row items-center justify-between">
                    <View>
                      <Text className="text-2xl font-bold text-slate-600">
                        {stats.activeBorrows}
                      </Text>
                      <Text className="text-sm text-slate-600">Borrowed</Text>
                    </View>
                    <View className="w-10 h-10 bg-slate-100 rounded-full items-center justify-center">
                      <Ionicons name="book-outline" size={20} color="#2C3E50" />
                    </View>
                  </View>
                </View>
              </View>

              <View className="w-1/2 px-2 mb-4">
                <View className="bg-white rounded-xl p-4 shadow-sm">
                  <View className="flex-row items-center justify-between">
                    <View>
                      <Text className="text-2xl font-bold text-red-600">
                        {stats.overdueBooks}
                      </Text>
                      <Text className="text-sm text-slate-600">Overdue</Text>
                    </View>
                    <View className="w-10 h-10 bg-red-100 rounded-full items-center justify-center">
                      <Ionicons
                        name="warning-outline"
                        size={20}
                        color="#EF4444"
                      />
                    </View>
                  </View>
                </View>
              </View>
            </View>
          </View>

          {/* Quick Access Buttons */}
          <View className="mb-6">
            <Text className="text-lg font-semibold text-slate-800 mb-4">
              Quick Access
            </Text>

            <View className="space-y-3">
              <TouchableOpacity
                className="bg-white rounded-xl p-4 shadow-sm border border-teal-200 active:bg-teal-50"
                onPress={() => setActiveSection("books")}
              >
                <View className="flex-row items-center">
                  <View className="w-10 h-10 bg-teal-100 rounded-full items-center justify-center mr-3">
                    <Ionicons
                      name="library-outline"
                      size={20}
                      color="#128C7E"
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="font-semibold text-slate-800">
                      Manage Books
                    </Text>
                    <Text className="text-sm text-slate-600">
                      Add, edit, or delete books
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#64748B" />
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 active:bg-slate-50"
                onPress={() => setActiveSection("borrowed")}
              >
                <View className="flex-row items-center">
                  <View className="w-10 h-10 bg-slate-100 rounded-full items-center justify-center mr-3">
                    <Ionicons name="book-outline" size={20} color="#2C3E50" />
                  </View>
                  <View className="flex-1">
                    <Text className="font-semibold text-slate-800">
                      Borrowed Books
                    </Text>
                    <Text className="text-sm text-slate-600">
                      Track returns and manage loans
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#64748B" />
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                className="bg-white rounded-xl p-4 shadow-sm border border-mint-200 active:bg-mint-50"
                onPress={() => setActiveSection("config")}
              >
                <View className="flex-row items-center">
                  <View className="w-10 h-10 bg-mint-100 rounded-full items-center justify-center mr-3">
                    <Ionicons
                      name="settings-outline"
                      size={20}
                      color="#1ABC9C"
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="font-semibold text-slate-800">
                      Borrow Configuration
                    </Text>
                    <Text className="text-sm text-slate-600">
                      Set limits and policies
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#64748B" />
                </View>
              </TouchableOpacity>
            </View>
          </View>

          {/* Recent Activity - You can populate this with real data */}
          <View className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
            <Text className="font-semibold text-slate-800 mb-3">
              Recent Library Activity
            </Text>
            <View className="space-y-3">
              <View className="flex-row items-center">
                <View className="w-8 h-8 bg-teal-100 rounded-full items-center justify-center mr-3">
                  <Ionicons name="add-outline" size={14} color="#128C7E" />
                </View>
                <View className="flex-1">
                  <Text className="text-sm text-slate-800">
                    System ready for library management
                  </Text>
                  <Text className="text-xs text-slate-500">
                    Connected to API
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    );
  };

  const renderSectionContent = () => {
    switch (activeSection) {
      case "overview":
        return renderOverview();
      case "books":
        return <AddUpdateDeleteBooksForm />;
      case "borrowed":
        return (
          <BorrowedBooksOverview
            onReturnBook={handleReturnBook}
            onExtendDueDate={handleExtendDueDate}
            onSendReminder={handleSendReminder}
          />
        );

      case "config":
        return (
          <BorrowLimitConfiguration
            userRoles={userRoles}
            onUpdateRole={(roleId, updatedRole) => {
              setUserRoles(
                userRoles.map((role) =>
                  role.id === roleId ? { ...role, ...updatedRole } : role
                )
              );
            }}
            onAddRole={(roleData) => {
              const newRole: UserRoles = {
                ...roleData,
                id: Date.now().toString(),
              };
              setUserRoles([...userRoles, newRole]);
            }}
            onDeleteRole={(roleId) => {
              setUserRoles(userRoles.filter((role) => role.id !== roleId));
            }}
          />
        );
      default:
        return renderOverview();
    }
  };

  // Show loading spinner overlay when loading
  const LoadingOverlay = () => (
    <View className="absolute top-0 left-0 right-0 bottom-0 bg-black bg-opacity-20 items-center justify-center z-50">
      <View className="bg-white rounded-lg p-4 items-center">
        <ActivityIndicator size="large" color="#128C7E" />
        <Text className="mt-2 text-slate-600">Loading...</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-mint-50">
      {/* Navigation Header */}
      <View className="bg-white border-b border-slate-200">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="px-4 py-3"
        >
          <View className="flex-row">
            {sections.map((section) => (
              <TouchableOpacity
                key={section.id}
                className={`mr-4 px-4 py-2 rounded-full border ${
                  activeSection === section.id
                    ? "bg-teal-600 border-teal-600"
                    : "bg-white border-slate-300"
                }`}
                onPress={() => setActiveSection(section.id as LibrarySection)}
                disabled={loading}
              >
                <View className="flex-row items-center">
                  <Ionicons
                    name={section.icon as any}
                    size={16}
                    color={activeSection === section.id ? "white" : "#64748B"}
                  />
                  <Text
                    className={`ml-2 text-sm font-medium ${
                      activeSection === section.id
                        ? "text-white"
                        : "text-slate-700"
                    }`}
                  >
                    {section.title}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Section Content */}
      <View className="flex-1">{renderSectionContent()}</View>

      {/* Loading Overlay */}
      {loading && <LoadingOverlay />}
    </SafeAreaView>
  );
};

export default LibraryAction;
