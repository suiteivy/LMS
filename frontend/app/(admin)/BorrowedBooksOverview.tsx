import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BorrowedBook, BorrowedBooksOverviewProps } from "@/types/types";

export const BorrowedBooksOverview: React.FC<BorrowedBooksOverviewProps> = ({
  borrowedBooks = [],
  onReturnBook,
  onExtendDueDate,
  onSendReminder,
}) => {
  // Local state for search bar
  const [searchQuery, setSearchQuery] = useState("");
  // Local state for filter (all | borrowed | overdue)
  const [filterStatus, setFilterStatus] = useState<
    "all" | "borrowed" | "overdue"
  >("all");

  // Choose status color styles based on borrowedBook.status
  const getStatusColor = (status: string) => {
    switch (status) {
      case "borrowed":
        return {
          bg: "bg-teal-100",
          text: "text-teal-800",
          border: "border-teal-200",
        };
      case "overdue":
        return {
          bg: "bg-red-100",
          text: "text-red-800",
          border: "border-red-200",
        };
      default:
        return {
          bg: "bg-gray-100",
          text: "text-gray-800",
          border: "border-gray-200",
        };
    }
  };

  // Calculate days remaining until due date
  const getDaysRemaining = (dueDate: Date) => {
    const today = new Date();
    const timeDiff = dueDate.getTime() - today.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
    return daysDiff;
  };

  // Confirm and mark a book as returned
  const handleReturnBook = (borrowId: string, bookTitle: string) => {
    Alert.alert("Return Book", `Mark "${bookTitle}" as returned?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Return",
        onPress: () => onReturnBook?.(borrowId),
      },
    ]);
  };

  // Confirm and extend due date (7 or 14 days)
  const handleExtendDueDate = (borrowId: string) => {
    Alert.alert("Extend Due Date", "Extend due date by how many days?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "7 days",
        onPress: () => {
          const newDueDate = new Date();
          newDueDate.setDate(newDueDate.getDate() + 7);
          onExtendDueDate?.(borrowId, newDueDate);
        },
      },
      {
        text: "14 days",
        onPress: () => {
          const newDueDate = new Date();
          newDueDate.setDate(newDueDate.getDate() + 14);
          onExtendDueDate?.(borrowId, newDueDate);
        },
      },
    ]);
  };

  // Apply search & filter logic
  const filteredBooks = borrowedBooks.filter((book) => {
    const matchesSearch =
      book.bookTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      book.borrowerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      book.author.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesFilter =
      filterStatus === "all" || book.status === filterStatus;

    return matchesSearch && matchesFilter;
  });

  // Quick stats counters
  const overdueBooksCount = borrowedBooks.filter(
    (book) => book.status === "overdue"
  ).length;
  const activeBorrowsCount = borrowedBooks.filter(
    (book) => book.status === "borrowed"
  ).length;

  // Render a single borrowed book card
  const renderBorrowedBookItem = (borrowedBook: BorrowedBook) => {
    const statusColors = getStatusColor(borrowedBook.status);
    const daysRemaining = getDaysRemaining(borrowedBook.dueDate);

    return (
      <View
        key={borrowedBook.id}
        className="bg-white rounded-xl p-4 mb-3 shadow-sm border border-slate-200"
      >
        {/* Book + Status */}
        <View className="flex-row justify-between items-start mb-3">
          <View className="flex-1">
            <Text className="text-lg font-semibold text-slate-800 mb-1">
              {borrowedBook.bookTitle}
            </Text>
            <Text className="text-sm text-teal-600 mb-1">
              by {borrowedBook.author}
            </Text>
            <Text className="text-xs text-gray-500 mb-2">
              ISBN: {borrowedBook.isbn}
            </Text>
          </View>
          <View
            className={`px-3 py-1 rounded-full ${statusColors.bg} ${statusColors.border} border`}
          >
            <Text className={`text-xs font-medium ${statusColors.text}`}>
              {borrowedBook.status.toUpperCase()}
            </Text>
          </View>
        </View>

        {/* Borrower Info */}
        <View className="bg-mint-50 p-3 rounded-lg mb-3">
          <Text className="text-sm font-medium text-slate-700 mb-1">
            Borrower: {borrowedBook.borrowerName}
          </Text>
          <Text className="text-xs text-gray-600 mb-2">
            {borrowedBook.borrowerEmail}
          </Text>
          <View className="flex-row justify-between">
            <Text className="text-xs text-gray-600">
              Borrowed: {borrowedBook.borrowDate.toLocaleDateString()}
            </Text>
            <Text
              className={`text-xs font-medium ${
                daysRemaining < 0
                  ? "text-red-600"
                  : daysRemaining <= 3
                    ? "text-orange-600"
                    : "text-gray-600"
              }`}
            >
              Due: {borrowedBook.dueDate.toLocaleDateString()}
              {daysRemaining < 0
                ? ` (${Math.abs(daysRemaining)} days overdue)`
                : daysRemaining === 0
                  ? " (Due today)"
                  : ` (${daysRemaining} days left)`}
            </Text>
          </View>
        </View>

        {/* Actions: Return, Extend, Reminder */}
        <View className="flex-row justify-between">
          <TouchableOpacity
            className="bg-teal-600 flex-1 py-2 px-3 rounded-lg mr-2"
            onPress={() =>
              handleReturnBook(borrowedBook.id, borrowedBook.bookTitle)
            }
          >
            <Text className="text-white text-center font-medium text-sm">
              Mark Returned
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="bg-slate-600 py-2 px-3 rounded-lg mr-2"
            onPress={() => handleExtendDueDate(borrowedBook.id)}
          >
            <Ionicons name="calendar-outline" size={16} color="white" />
          </TouchableOpacity>

          <TouchableOpacity
            className="bg-blue-600 py-2 px-3 rounded-lg"
            onPress={() => onSendReminder?.(borrowedBook.id)}
          >
            <Ionicons name="mail-outline" size={16} color="white" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View className="flex-1 bg-mint-50">
      {/* Header with stats */}
      <View className="bg-white p-4 border-b border-slate-200">
        <Text className="text-xl font-bold text-slate-800 mb-4">
          Borrowed Books Overview
        </Text>

        {/* Stats Cards */}
        <View className="flex-row mb-4">
          <View className="bg-teal-100 rounded-lg p-3 flex-1 mr-2">
            <Text className="text-2xl font-bold text-teal-800">
              {activeBorrowsCount}
            </Text>
            <Text className="text-sm text-teal-600">Active Borrows</Text>
          </View>
          <View className="bg-red-100 rounded-lg p-3 flex-1 ml-2">
            <Text className="text-2xl font-bold text-red-800">
              {overdueBooksCount}
            </Text>
            <Text className="text-sm text-red-600">Overdue Books</Text>
          </View>
        </View>

        {/* Search bar */}
        <View className="flex-row items-center mb-2">
          <View className="flex-1 mr-3">
            <TextInput
              className="bg-gray-50 border border-gray-200 rounded-lg p-3"
              placeholder="Search books, borrowers..."
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </View>

        {/* Filter chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View className="flex-row">
            {["all", "borrowed", "overdue"].map((status) => (
              <TouchableOpacity
                key={status}
                className={`mr-2 px-4 py-2 rounded-full border ${
                  filterStatus === status
                    ? "bg-teal-600 border-teal-600"
                    : "bg-white border-gray-300"
                }`}
                onPress={() => setFilterStatus(status as any)}
              >
                <Text
                  className={`text-sm font-medium ${
                    filterStatus === status ? "text-white" : "text-gray-700"
                  }`}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Borrowed Books List */}
      <ScrollView className="flex-1 p-4">
        {filteredBooks.length === 0 ? (
          <View className="items-center justify-center py-12">
            <Ionicons name="library-outline" size={64} color="#A1EBE5" />
            <Text className="text-gray-500 text-center mt-4">
              {searchQuery || filterStatus !== "all"
                ? "No books match your search criteria."
                : "No borrowed books found."}
            </Text>
          </View>
        ) : (
          filteredBooks.map(renderBorrowedBookItem)
        )}
      </ScrollView>
    </View>
  );
};
