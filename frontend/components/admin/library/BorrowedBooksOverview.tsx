import { EmptyState } from "@/components/common/EmptyState";
import { useTheme } from "@/contexts/ThemeContext";
import { LibraryAPI, useLibraryAPI } from "@/services/LibraryService";
import { FrontendBorrowedBook } from "@/types/types";
import { Ionicons } from "@expo/vector-icons";
import { BookOpen } from "lucide-react-native";
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
  View,
} from "react-native";

// Extended interface to match your original component structure
interface ExtendedBorrowedBook extends FrontendBorrowedBook {
  borrowerPhone?: string;
  renewalCount?: number;
  maxRenewals?: number;
  fineAmount?: number;
}

interface BorrowedBooksOverviewProps {
  // Optional props to allow parent components to override default behavior
  borrowedBooks?: FrontendBorrowedBook[];
  onReturnBook?: (
    borrowId: string,
    fineAmount?: number,
    condition?: string
  ) => void;
  onExtendDueDate?: (borrowId: string, newDueDate: Date) => void;
  onSendReminder?: (borrowId: string) => void;
  onProcessFine?: (borrowId: string, amount: number) => void;
}

const BorrowedBooksOverview: React.FC<BorrowedBooksOverviewProps> = ({
  borrowedBooks: propsBorrowedBooks,
  onReturnBook,
  onExtendDueDate,
  onSendReminder,
  onProcessFine,
}) => {
  // State management
  const { isDark } = useTheme();
  const [localBorrowedBooks, setLocalBorrowedBooks] = useState<ExtendedBorrowedBook[]>([]);
  const borrowedBooks = (propsBorrowedBooks?.map(b => (b as ExtendedBorrowedBook)) || localBorrowedBooks);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "borrowed" | "overdue" | "returned" | "waiting" | "ready_for_pickup"
  >("all");
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [selectedBook, setSelectedBook] = useState<ExtendedBorrowedBook | null>(null);
  const [returnCondition, setReturnCondition] = useState("good");
  const [fineAmount, setFineAmount] = useState("0");
  const [notes, setNotes] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  // API hook
  const { loading, error, executeWithLoading, clearError } = useLibraryAPI();

  // Helper function to transform backend data to extended format
  const transformToExtendedFormat = (backendBook: any): ExtendedBorrowedBook => {
    const frontendBook = LibraryAPI.transformBorrowedBookData(backendBook);
    return {
      ...frontendBook,
      borrowerPhone: backendBook.student?.phone || undefined,
      renewalCount: backendBook.renewal_count || 0,
      maxRenewals: backendBook.max_renewals || 1,
      fineAmount: backendBook.fine_amount || undefined,
    };
  };

  // Fetch borrowed books from API
  const fetchBorrowedBooks = useCallback(async () => {
    try {
      const backendBooks = await executeWithLoading(() =>
        LibraryAPI.getAllBorrowedBooks()
      );

      const transformedBooks = backendBooks.map(transformToExtendedFormat);

      // Update status based on due date for books that are still borrowed
      const booksWithUpdatedStatus = transformedBooks.map(book => {
        if (book.status === "borrowed") {
          const today = new Date();
          const dueDate = new Date(book.dueDate);
          if (dueDate < today) {
            return { ...book, status: "overdue" as const };
          }
        }
        return book;
      });

      setLocalBorrowedBooks(booksWithUpdatedStatus);
    } catch (err) {
      console.error("Failed to fetch borrowed books:", err);
      Alert.alert(
        "Error",
        "Failed to load borrowed books. Please try again.",
        [{ text: "OK" }]
      );
    }
  }, [executeWithLoading]);

  // Initial load
  useEffect(() => {
    if (!propsBorrowedBooks) {
      fetchBorrowedBooks();
    }
  }, [fetchBorrowedBooks, propsBorrowedBooks]);

  // Refresh handler
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchBorrowedBooks();
    setRefreshing(false);
  }, [fetchBorrowedBooks]);

  // Clear error when user dismisses
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        clearError();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, clearError]);

  const getStatusColor = (status: string, daysRemaining?: number) => {
    switch (status) {
      case "borrowed":
        if (daysRemaining !== undefined && daysRemaining <= 1) {
          return {
            bg: "bg-orange-100 dark:bg-orange-900",
            text: "text-orange-800 dark:text-orange-200",
            border: "border-orange-200 dark:border-orange-700",
          };
        }
        return {
          bg: "bg-teal-100 dark:bg-teal-900",
          text: "text-teal-800 dark:text-teal-200",
          border: "border-teal-200 dark:border-teal-700",
        };
      case "overdue":
        return {
          bg: "bg-red-100 dark:bg-red-900",
          text: "text-red-800 dark:text-red-200",
          border: "border-red-200 dark:border-red-700",
        };
      case "returned":
        return {
          bg: "bg-green-100 dark:bg-green-900",
          text: "text-green-800 dark:text-green-200",
          border: "border-green-200 dark:border-green-700",
        };
      case "waiting":
        return {
          bg: "bg-yellow-100 dark:bg-yellow-900",
          text: "text-yellow-800 dark:text-yellow-200",
          border: "border-yellow-200 dark:border-yellow-700",
        };
      case "ready_for_pickup":
        return {
          bg: "bg-green-100 dark:bg-green-900",
          text: "text-green-800 dark:text-green-200",
          border: "border-green-200 dark:border-green-700",
        };
      default:
        return {
          bg: "bg-gray-100 dark:bg-gray-800",
          text: "text-gray-800 dark:text-gray-200",
          border: "border-gray-200 dark:border-gray-700",
        };
    }
  };

  const getDaysRemaining = (dueDate: Date) => {
    const today = new Date();
    const timeDiff = dueDate.getTime() - today.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
    return daysDiff;
  };

  const calculateFine = (dueDate: Date, finePerDay: number = 0.5) => {
    const daysOverdue = Math.abs(getDaysRemaining(dueDate));
    return daysOverdue > 0 && getDaysRemaining(dueDate) < 0
      ? daysOverdue * finePerDay
      : 0;
  };

  const handleReturnBook = (book: ExtendedBorrowedBook) => {
    setSelectedBook(book);
    const calculatedFine =
      book.status === "overdue" ? calculateFine(book.dueDate) : 0;
    setFineAmount(calculatedFine.toString());
    setReturnCondition("good");
    setNotes("");
    setShowReturnModal(true);
  };

  const confirmReturn = async () => {
    if (!selectedBook) return;

    const finalFine = parseFloat(fineAmount) || 0;

    Alert.alert(
      "Confirm Return",
      `Mark "${selectedBook.bookTitle}" as returned?\n${finalFine > 0 ? `Fine: $${finalFine.toFixed(2)}\n` : ""
      }Condition: ${returnCondition}\n${notes ? `Notes: ${notes}` : ""}`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm Return",
          onPress: async () => {
            try {
              if (onReturnBook) {
                // Use parent's custom handler if provided
                onReturnBook(selectedBook.id, finalFine, returnCondition);
              } else {
                // Use API to return book
                await executeWithLoading(() =>
                  LibraryAPI.returnBook(selectedBook.id)
                );

                // Refresh the list
                await fetchBorrowedBooks();

                Alert.alert(
                  "Success",
                  "Book returned successfully!",
                  [{ text: "OK" }]
                );
              }

              setShowReturnModal(false);
              setSelectedBook(null);
            } catch (err) {
              console.error("Failed to return book:", err);
              Alert.alert(
                "Error",
                "Failed to return book. Please try again.",
                [{ text: "OK" }]
              );
            }
          },
        },
      ]
    );
  };

  const handleExtendDueDate = async (borrowId: string, book: ExtendedBorrowedBook) => {
    const canRenew = (book.renewalCount || 0) < (book.maxRenewals || 1);

    if (!canRenew) {
      Alert.alert(
        "Cannot Renew",
        "This book has reached the maximum number of renewals allowed."
      );
      return;
    }

    Alert.alert("Extend Due Date", "Extend due date by how many days?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "7 days",
        onPress: async () => {
          const newDueDate = new Date(book.dueDate);
          newDueDate.setDate(newDueDate.getDate() + 7);
          await performDueDateExtension(borrowId, newDueDate);
        },
      },
      {
        text: "14 days",
        onPress: async () => {
          const newDueDate = new Date(book.dueDate);
          newDueDate.setDate(newDueDate.getDate() + 14);
          await performDueDateExtension(borrowId, newDueDate);
        },
      },
      {
        text: "Custom",
        onPress: () => {
          Alert.prompt(
            "Custom Extension",
            "Enter number of days to extend:",
            [
              { text: "Cancel", style: "cancel" },
              {
                text: "Extend",
                onPress: (days?: string) => {
                  const numDays = parseInt(days || "0");
                  if (numDays > 0) {
                    const newDueDate = new Date(book.dueDate);
                    newDueDate.setDate(newDueDate.getDate() + numDays);
                    performDueDateExtension(borrowId, newDueDate);
                  }
                },
              },
            ],
            "plain-text",
            "",
            "numeric"
          );
        },
      },
    ]);
  };

  const performDueDateExtension = async (borrowId: string, newDueDate: Date) => {
    try {
      if (onExtendDueDate) {
        // Use parent's custom handler if provided
        onExtendDueDate(borrowId, newDueDate);
      } else {
        // Use API to extend due date
        const newDueDateString = newDueDate.toISOString().split('T')[0];
        await executeWithLoading(() =>
          LibraryAPI.extendDueDate(borrowId, newDueDateString)
        );

        // Refresh the list
        await fetchBorrowedBooks();

        Alert.alert(
          "Success",
          "Due date extended successfully!",
          [{ text: "OK" }]
        );
      }
    } catch (err) {
      console.error("Failed to extend due date:", err);
      Alert.alert(
        "Error",
        "Failed to extend due date. Please try again.",
        [{ text: "OK" }]
      );
    }
  };

  const handleSendReminder = async (
    borrowId: string,
    borrowerEmail: string,
    bookTitle: string
  ) => {
    Alert.alert(
      "Send Reminder",
      `Send reminder email to ${borrowerEmail} about "${bookTitle}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Send Reminder",
          onPress: async () => {
            try {
              if (onSendReminder) {
                // Use parent's custom handler if provided
                onSendReminder(borrowId);
              } else {
                // Use API to send reminder
                await executeWithLoading(() =>
                  LibraryAPI.sendReminder(borrowId)
                );
              }

              Alert.alert(
                "Success",
                "Email reminder has been sent successfully!",
                [{ text: "OK" }]
              );
            } catch (err) {
              console.error("Failed to send reminder:", err);
              Alert.alert(
                "Error",
                "Failed to send reminder. Please try again.",
                [{ text: "OK" }]
              );
            }
          },
        },
      ]
    );
  };

  const handleProcessFine = async (borrowId: string, amount: number) => {
    Alert.alert(
      "Process Fine",
      `Process fine of $${amount.toFixed(2)} for overdue book?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Process Fine",
          onPress: async () => {
            try {
              if (onProcessFine) {
                // Use parent's custom handler if provided
                onProcessFine(borrowId, amount);
              } else {
                // Here you would implement fine processing logic
                // This might involve calling a separate API endpoint
                Alert.alert(
                  "Fine Processed",
                  `Fine of $${amount.toFixed(2)} has been recorded.`,
                  [{ text: "OK" }]
                );
              }
            } catch (err) {
              console.error("Failed to process fine:", err);
              Alert.alert(
                "Error",
                "Failed to process fine. Please try again.",
                [{ text: "OK" }]
              );
            }
          },
        },
      ]
    );
  };

  const filteredBooks = borrowedBooks.filter((book) => {
    const matchesSearch =
      book.bookTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      book.borrowerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      book.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
      book.isbn.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesFilter =
      statusFilter === "all" || book.status === statusFilter;

    return matchesSearch && matchesFilter;
  });

  const getFilterCounts = () => {
    return {
      all: borrowedBooks.length,
      borrowed: borrowedBooks.filter((book) => book.status === "borrowed")
        .length,
      waiting: borrowedBooks.filter((book) => book.status === "waiting").length,
      ready_for_pickup: borrowedBooks.filter((book) => book.status === "ready_for_pickup").length,
      overdue: borrowedBooks.filter((book) => book.status === "overdue").length,
      returned: borrowedBooks.filter((book) => book.status === "returned")
        .length,
    };
  };

  const overdueBooksCount = borrowedBooks.filter(
    (book) => book.status === "overdue"
  ).length;
  const activeBorrowsCount = borrowedBooks.filter(
    (book) => book.status === "borrowed"
  ).length;
  const dueSoonCount = borrowedBooks.filter((book) => {
    if (book.status !== "borrowed") return false;
    const daysRemaining = getDaysRemaining(book.dueDate);
    return daysRemaining <= 3 && daysRemaining >= 0;
  }).length;

  const renderBorrowedBookItem = (borrowedBook: ExtendedBorrowedBook) => {
    const daysRemaining = getDaysRemaining(borrowedBook.dueDate);
    const statusColors = getStatusColor(borrowedBook.status, daysRemaining);
    const fine = borrowedBook.fineAmount || calculateFine(borrowedBook.dueDate);

    return (
      <View
        key={borrowedBook.id}
        className="bg-white dark:bg-gray-900 rounded-xl p-4 mb-3 shadow-sm border border-slate-200 dark:border-gray-700"
      >
        <View className="flex-row justify-between items-start mb-3">
          <View className="flex-1">
            <Text className="text-lg font-semibold text-slate-800 dark:text-white mb-1">
              {borrowedBook.bookTitle}
            </Text>
            <Text className="text-sm text-teal-600 dark:text-teal-400 mb-1">
              by {borrowedBook.author}
            </Text>
            <Text className="text-xs text-gray-500 dark:text-gray-400 mb-2">
              ISBN: {borrowedBook.isbn}
            </Text>
          </View>
          <View className="items-end">
            <View
              className={`px-3 py-1 rounded-full ${statusColors.bg} ${statusColors.border} border mb-1`}
            >
              <Text className={`text-xs font-medium ${statusColors.text}`}>
                {borrowedBook.status.toUpperCase()}
              </Text>
            </View>
            {fine > 0 && (
              <Text className="text-xs text-red-600 dark:text-red-400 font-medium">
                Fine: ${fine.toFixed(2)}
              </Text>
            )}
          </View>
        </View>

        <View className="bg-mint-50 dark:bg-gray-800 p-3 rounded-lg mb-3">
          <View className="flex-row justify-between items-start mb-2">
            <View className="flex-1">
              <Text className="text-sm font-medium text-slate-700 dark:text-gray-200 mb-1">
                Borrower: {borrowedBook.borrowerName}
              </Text>
              {borrowedBook.borrowerDisplayId && (
                <Text className="text-xs text-teal-600 dark:text-teal-400 font-medium mb-1">
                  ID: {borrowedBook.borrowerDisplayId}
                </Text>
              )}
              <Text className="text-xs text-gray-600 dark:text-gray-300 mb-1">
                📧 {borrowedBook.borrowerEmail}
              </Text>
              {borrowedBook.borrowerPhone && (
                <Text className="text-xs text-gray-600 dark:text-gray-300 mb-1">
                  📞 {borrowedBook.borrowerPhone}
                </Text>
              )}
              {borrowedBook.renewalCount !== undefined && (
                <Text className="text-xs text-teal-600 dark:text-teal-400">
                  Renewals: {borrowedBook.renewalCount}/
                  {borrowedBook.maxRenewals || 1}
                </Text>
              )}
            </View>
          </View>

          <View className="flex-row justify-between items-center">
            <View className="flex-1">
              <Text className="text-xs text-gray-600 dark:text-gray-300">
                Borrowed: {borrowedBook.borrowDate.toLocaleDateString()}
              </Text>
              <Text
                className={`text-xs font-medium ${daysRemaining < 0
                  ? "text-red-600 dark:text-red-400"
                  : daysRemaining <= 3
                    ? "text-orange-600 dark:text-orange-400"
                    : "text-gray-600 dark:text-gray-300"
                  }`}
              >
                Due: {borrowedBook.dueDate.toLocaleDateString()}
                {borrowedBook.status !== "returned" && (
                  <>
                    {daysRemaining < 0
                      ? ` (${Math.abs(daysRemaining)} days overdue)`
                      : daysRemaining === 0
                        ? " (Due today)"
                        : ` (${daysRemaining} days left)`}
                  </>
                )}
              </Text>
              {borrowedBook.returnDate && (
                <Text className="text-xs text-green-600 dark:text-green-400">
                  Returned: {borrowedBook.returnDate.toLocaleDateString()}
                </Text>
              )}
            </View>
          </View>
        </View>

        {borrowedBook.status !== "returned" && (
          <View className="flex-row justify-between">
            {borrowedBook.status === "waiting" ? (
              <>
                <TouchableOpacity
                  className="bg-red-500 flex-1 py-2 px-3 rounded-lg mr-2 active:bg-red-600"
                  onPress={() => {
                    Alert.alert("Reject Request", "Are you sure?", [
                      { text: "Cancel", style: "cancel" },
                      {
                        text: "Reject",
                        style: "destructive",
                        onPress: async () => {
                          await executeWithLoading(() => LibraryAPI.rejectBorrowRequest(borrowedBook.id));
                          fetchBorrowedBooks();
                        }
                      }
                    ])
                  }}
                >
                  <Text className="text-white text-center font-medium text-sm">Reject</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className="bg-orange-500 flex-1 py-2 px-3 rounded-lg mr-2 active:bg-orange-600"
                  onPress={() => {
                    executeWithLoading(() => LibraryAPI.updateBorrowStatus(borrowedBook.id, 'ready_for_pickup'))
                      .then(() => fetchBorrowedBooks());
                  }}
                >
                  <Text className="text-white text-center font-medium text-sm">Mark Ready</Text>
                </TouchableOpacity>
              </>
            ) : borrowedBook.status === "ready_for_pickup" ? (
              <TouchableOpacity
                className="bg-green-600 flex-1 py-2 px-3 rounded-lg mr-2 active:bg-green-700"
                onPress={() => {
                  executeWithLoading(() => LibraryAPI.updateBorrowStatus(borrowedBook.id, 'borrowed'))
                    .then(() => fetchBorrowedBooks());
                }}
              >
                <Text className="text-white text-center font-medium text-sm">Confirm Pickup</Text>
              </TouchableOpacity>
            ) : (
              <>
                <TouchableOpacity
                  className="bg-teal-600 flex-1 py-2 px-3 rounded-lg mr-2 active:bg-teal-700"
                  onPress={() => handleReturnBook(borrowedBook)}
                >
                  <Text className="text-white text-center font-medium text-sm">
                    Process Return
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  className="bg-slate-600 py-2 px-3 rounded-lg mr-2 active:bg-slate-700"
                  onPress={() => handleExtendDueDate(borrowedBook.id, borrowedBook)}
                >
                  <View className="flex-row items-center">
                    <Ionicons name="calendar-outline" size={14} color="white" />
                    <Text className="text-white text-xs ml-1">Extend</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  className="bg-blue-600 py-2 px-3 rounded-lg mr-2 active:bg-blue-700"
                  onPress={() =>
                    handleSendReminder(
                      borrowedBook.id,
                      borrowedBook.borrowerEmail,
                      borrowedBook.bookTitle
                    )
                  }
                >
                  <Ionicons name="mail-outline" size={16} color="white" />
                </TouchableOpacity>
              </>
            )}

            {fine > 0 && (
              <TouchableOpacity
                className="bg-orange-600 py-2 px-3 rounded-lg active:bg-orange-700"
                onPress={() => handleProcessFine(borrowedBook.id, fine)}
              >
                <View className="flex-row items-center">
                  <Ionicons name="cash-outline" size={14} color="white" />
                  <Text className="text-white text-xs ml-1">Fine</Text>
                </View>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    );
  };

  const filterCounts = getFilterCounts();

  // Show loading spinner on initial load
  if (loading && borrowedBooks.length === 0) {
    return (
      <View className="flex-1 bg-mint-50 dark:bg-black justify-center items-center">
        <ActivityIndicator size="large" color="#0D9488" />
        <Text className="text-gray-600 dark:text-gray-300 mt-2">Loading borrowed books...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-mint-50 dark:bg-black">
      {/* Header */}
      <View className="bg-white dark:bg-[#121212] p-4 border-b border-teal-100 dark:border-gray-800">
        <Text className="text-xl font-bold text-slate-800 dark:text-white">
          Borrowed Books
        </Text>
      </View>

      {/* Filters & Search */}
      <View className="bg-white dark:bg-[#121212] px-4 pb-4 border-b border-teal-100 dark:border-gray-800">
        <View className="flex-row items-center bg-gray-50 dark:bg-[#1a1a1a] border border-teal-100 dark:border-gray-800 rounded-xl px-4 py-2 mt-2 mb-4">
          <Ionicons name="search" size={20} color={isDark ? "#9CA3AF" : "#6B7280"} />
          <TextInput
            className="flex-1 ml-2 text-slate-800 dark:text-white"
            placeholder="Search by book, borrower, or email..."
            placeholderTextColor={isDark ? "#6B7280" : "#9CA3AF"}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View className="flex-row">
            {(["all", "borrowed", "returned", "overdue", "waiting", "ready_for_pickup"] as const).map(
              (filter) => (
                <TouchableOpacity
                  key={filter}
                  className={`mr-2 px-4 py-2 rounded-full border ${statusFilter === filter
                    ? "bg-orange-600 border-orange-600"
                    : "bg-white dark:bg-gray-800 border-slate-300 dark:border-gray-700"
                    }`}
                  onPress={() => setStatusFilter(filter)}
                >
                  <Text
                    className={`text-xs font-medium capitalize ${statusFilter === filter
                      ? "text-white"
                      : "text-slate-700 dark:text-gray-300"
                      }`}
                  >
                    {filter.replace(/_/g, ' ')} ({filterCounts[filter]})
                  </Text>
                </TouchableOpacity>
              )
            )}
          </View>
        </ScrollView>
      </View>

      {/* Borrowed Books List */}
      <ScrollView
        className="flex-1 p-4"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[isDark ? "#ff6900" : "#ff6900"]}
            tintColor={isDark ? "#ff6900" : "#ff6900"}
          />
        }
      >
        {filteredBooks.length === 0 ? (
          <EmptyState
            title={searchQuery || statusFilter !== "all" ? "No matches found" : "No borrowed books"}
            message={searchQuery || statusFilter !== "all"
              ? "Try adjusting your search or filters to find what you're looking for."
              : "There are currently no books borrowed from the library."
            }
            icon={BookOpen}
            color={isDark ? "#ff6900" : "#ff6900"}
            actionLabel={searchQuery || statusFilter !== "all" ? "Clear Filters" : "Refresh List"}
            onAction={() => {
              if (searchQuery || statusFilter !== "all") {
                setSearchQuery("");
                setStatusFilter("all");
              } else {
                onRefresh();
              }
            }}
          />
        ) : (
          <View className="flex-row flex-wrap gap-4">
            {filteredBooks.map((book) => (
              <View key={book.id} className="w-full lg:w-[48%] xl:w-[32%]">
                {renderBorrowedBookItem(book)}
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Return Book Modal */}
      <Modal
        visible={showReturnModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowReturnModal(false)}
      >
        <View className="flex-1 bg-white dark:bg-[#121212]">
          <View className="bg-teal-600 p-4 pt-12">
            <View className="flex-row justify-between items-center">
              <Text className="text-xl font-bold text-white">
                Process Book Return
              </Text>
              <TouchableOpacity onPress={() => setShowReturnModal(false)}>
                <Ionicons name="close" size={24} color="white" />
              </TouchableOpacity>
            </View>
          </View>

          {selectedBook && (
            <ScrollView className="flex-1 p-4">
              <View className="bg-gray-50 dark:bg-[#1a1a1a] p-4 rounded-lg mb-4">
                <Text className="font-semibold text-slate-800 dark:text-white mb-1">
                  {selectedBook.bookTitle}
                </Text>
                <Text className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                  by {selectedBook.author}
                </Text>
                <Text className="text-sm text-gray-600 dark:text-gray-400">
                  Borrower: {selectedBook.borrowerName}
                </Text>
              </View>

              <View className="mb-4">
                <Text className="text-sm font-medium text-slate-700 dark:text-gray-200 mb-2">
                  Book Condition
                </Text>
                <View className="flex-row">
                  {["good", "fair", "damaged", "lost"].map((condition) => (
                    <TouchableOpacity
                      key={condition}
                      className={`mr-2 px-4 py-2 rounded-full border ${returnCondition === condition
                        ? "bg-teal-600 border-teal-600"
                        : "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700"
                        }`}
                      onPress={() => setReturnCondition(condition)}
                    >
                      <Text
                        className={`text-sm font-medium ${returnCondition === condition
                          ? "text-white"
                          : "text-gray-700 dark:text-gray-300"
                          }`}
                      >
                        {condition.charAt(0).toUpperCase() + condition.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View className="mb-4">
                <Text className="text-sm font-medium text-slate-700 dark:text-gray-200 mb-2">
                  Fine Amount ($)
                </Text>
                <TextInput
                  className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 text-slate-800 dark:text-white"
                  value={fineAmount}
                  onChangeText={setFineAmount}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  placeholderTextColor={isDark ? "#9CA3AF" : "#6B7280"}
                />
                {selectedBook.status === "overdue" && (
                  <Text className="text-xs text-red-600 mt-1">
                    Suggested fine: $
                    {calculateFine(selectedBook.dueDate).toFixed(2)}
                  </Text>
                )}
              </View>

              <View className="mb-6">
                <Text className="text-sm font-medium text-slate-700 dark:text-gray-200 mb-2">
                  Notes (Optional)
                </Text>
                <TextInput
                  className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 h-20 text-slate-800 dark:text-white"
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Add any notes about the return..."
                  placeholderTextColor={isDark ? "#9CA3AF" : "#6B7280"}
                  multiline
                  textAlignVertical="top"
                />
              </View>

              {/* Actions */}
              <View className="flex-row space-x-3 mb-6">
                <TouchableOpacity
                  className="flex-1 bg-gray-200 dark:bg-gray-700 p-4 rounded-xl"
                  onPress={() => setShowReturnModal(false)}
                >
                  <Text className="text-slate-700 dark:text-gray-300 text-center font-bold">
                    Cancel
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className={`flex-1 p-4 rounded-xl ${loading
                    ? "bg-teal-400"
                    : "bg-teal-600 dark:bg-teal-700"
                    }`}
                  onPress={confirmReturn}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text className="text-white text-center font-bold">
                      Confirm Return
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}
        </View>
      </Modal>
    </View>
  );
};

export { BorrowedBooksOverview };
export default BorrowedBooksOverview;
