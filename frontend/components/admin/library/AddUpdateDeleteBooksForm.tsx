import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { LibraryAPI, useLibraryAPI } from "@/services/LibraryService";
import { AddUpdateDeleteBooksFormProps, FrontendBook, FrontendBorrowedBook } from "@/types/types";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const AddUpdateDeleteBooksForm: React.FC<AddUpdateDeleteBooksFormProps> = ({
  books: propsBooks,
  onAddBook,
  onUpdateBook,
  onDeleteBook,
}) => {
  const { profile } = useAuth();
  const { isDark } = useTheme();
  const [localBooks, setLocalBooks] = useState<FrontendBook[]>([]);
  const books = propsBooks || localBooks;
  const [borrowedBooks, setBorrowedBooks] = useState<FrontendBorrowedBook[]>(
    []
  );
  const [modalVisible, setModalVisible] = useState(false);
  const [editingBook, setEditingBook] = useState<FrontendBook | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    author: "",
    isbn: "",
    category: "",
    quantity: "",
  });

  const [searchQuery, setSearchQuery] = useState("");

  const filteredBooks = books.filter(book =>
    book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    book.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
    book.isbn.includes(searchQuery)
  );

  const { loading, error, executeWithLoading, clearError } = useLibraryAPI();

  // Fetch library + borrowed books
  useEffect(() => {
    if (!propsBooks) {
      fetchBooks();
    }
    fetchBorrowedBooks();
  }, [propsBooks]);

  const fetchBooks = async () => {
    try {
      const backendBooks = await executeWithLoading(LibraryAPI.getBooks);
      setLocalBooks(backendBooks.map(LibraryAPI.transformBookData));
    } catch (err) {
      console.error("Failed to fetch books:", err);
    }
  };

  const fetchBorrowedBooks = async () => {
    try {
      const backendBorrowed = await executeWithLoading(
        LibraryAPI.getAllBorrowedBooks
      );
      setBorrowedBooks(
        backendBorrowed.map(LibraryAPI.transformBorrowedBookData)
      );
    } catch (err) {
      console.error("Failed to fetch borrowed books:", err);
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      author: "",
      isbn: "",
      category: "",
      quantity: "",
    });
    setEditingBook(null);
  };

  const handleSubmit = async () => {
    if (!formData.title || !formData.author || !formData.isbn) {
      Alert.alert("Error", "Please fill in all required fields");
      return;
    }

    try {
      if (editingBook) {
        if (onUpdateBook) {
          onUpdateBook(editingBook.id, {
            title: formData.title,
            author: formData.author,
            isbn: formData.isbn,
            quantity: parseInt(formData.quantity) || 1,
            category: formData.category,
          });
        } else {
          const backendBook = await executeWithLoading(() =>
            LibraryAPI.updateBook(editingBook.id, {
              title: formData.title,
              author: formData.author,
              isbn: formData.isbn,
              total_quantity: parseInt(formData.quantity) || 1,
              category: formData.category,
            })
          );
          const updatedBook = LibraryAPI.transformBookData(backendBook);
          setLocalBooks((prev: any) =>
            prev.map((b: any) => (b.id === editingBook.id ? updatedBook : b))
          );
        }
      } else {
        if (onAddBook) {
          onAddBook({
            title: formData.title,
            author: formData.author,
            isbn: formData.isbn,
            quantity: parseInt(formData.quantity) || 1,
            category: formData.category,
            available: parseInt(formData.quantity) || 1,
            institutionId: profile?.institution_id || "",
          });
        } else {
          const backendBook = await executeWithLoading(() =>
            LibraryAPI.addBook({
              title: formData.title,
              author: formData.author,
              isbn: formData.isbn,
              total_quantity: parseInt(formData.quantity) || 1,
              institution_id: profile?.institution_id || "",
              category: formData.category,
            })
          );
          const newBook = LibraryAPI.transformBookData(backendBook);
          setLocalBooks((prev: any) => [...prev, newBook]);
        }
      }

      resetForm();
      setModalVisible(false);
    } catch (err) {
      console.error("Submit failed:", err);
    }
  };

  const handleEdit = (book: FrontendBook) => {
    setEditingBook(book);
    setFormData({
      title: book.title,
      author: book.author,
      isbn: book.isbn,
      category: book.category,
      quantity: book.quantity.toString(),
    });
    setModalVisible(true);
  };

  const handleDelete = (book: FrontendBook) => {
    Alert.alert("Delete Book", `Delete "${book.title}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            if (onDeleteBook) {
              onDeleteBook(book.id);
            } else {
              await executeWithLoading(() => LibraryAPI.deleteBook(book.id));
              setLocalBooks((prev: any) => prev.filter((b: any) => b.id !== book.id));
            }
          } catch (err) {
            console.error("Delete failed:", err);
          }
        },
      },
    ]);
  };

  // Render book item
  const renderBookItem = (book: FrontendBook, borrowed = false) => (
    <View
      key={book.id}
      className="bg-white dark:bg-[#1a1a1a] rounded-xl p-4 mb-3 shadow-sm border border-teal-100 dark:border-teal-900"
    >
      <View className="flex-row justify-between items-start mb-2">
        <View className="flex-1">
          <Text className="text-lg font-semibold text-slate-800 dark:text-white mb-1">
            {book.title}
          </Text>
          <Text className="text-sm text-teal-600 dark:text-teal-400 mb-1">by {book.author}</Text>
          <Text className="text-xs text-gray-500 dark:text-gray-400 mb-2">ISBN: {book.isbn}</Text>
          <View className="flex-row items-center">
            <View className="bg-mint-50 dark:bg-teal-950/30 px-2 py-1 rounded-full mr-2">
              <Text className="text-xs text-teal-700 dark:text-teal-300">{book.category}</Text>
            </View>
            <Text className="text-xs text-gray-600 dark:text-gray-400">
              {book.available}/{book.quantity} available
            </Text>
          </View>
        </View>

        <View className="flex-row">
          {!borrowed && (
            <TouchableOpacity
              className="bg-teal-100 dark:bg-teal-900/30 p-2 rounded-lg mr-2"
              onPress={() => handleEdit(book)}
            >
              <Ionicons name="pencil" size={16} color={isDark ? "#ff6900" : "#ff6900"} />
            </TouchableOpacity>
          )}
          {!borrowed && (
            <TouchableOpacity
              className="bg-red-100 dark:bg-red-900/30 p-2 rounded-lg"
              onPress={() => handleDelete(book)}
            >
              <Ionicons name="trash" size={16} color={isDark ? "#f87171" : "#EF4444"} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );

  return (
    <View className="flex-1 bg-mint-50 dark:bg-black">
      {/* Header */}
      <View className="bg-white dark:bg-[#121212] p-4 border-b border-teal-100 dark:border-gray-800">
        <View className="flex-row justify-between items-center">
          <Text className="text-xl font-bold text-slate-800 dark:text-white">
            Book Management
          </Text>
          <TouchableOpacity
            className="bg-orange-500 px-4 py-2 rounded-lg"
            onPress={() => {
              resetForm();
              setModalVisible(true);
            }}
          >
            <Text className="text-white font-medium">Add Book</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Loading / Error */}
      {loading && (
        <View className="items-center py-4">
          <ActivityIndicator size="small" color="#FF6B00" />
          <Text className="text-gray-500 dark:text-gray-400 mt-2">Loading...</Text>
        </View>
      )}
      {error && (
        <View className="items-center py-2">
          <Text className="text-red-500 dark:text-red-400">{error}</Text>
          <TouchableOpacity onPress={clearError}>
            <Text className="text-teal-600 dark:text-teal-400 underline">Dismiss</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Search Bar */}
      <View className="px-4 py-2">
        <View className="flex-row items-center bg-white dark:bg-[#1a1a1a] border border-teal-100 dark:border-gray-800 rounded-xl px-4 py-2 shadow-sm">
          <Ionicons name="search" size={20} color={isDark ? "#9CA3AF" : "#6B7280"} />
          <TextInput
            className="flex-1 ml-2 text-slate-800 dark:text-white"
            placeholder="Search books by title, author, or ISBN..."
            placeholderTextColor={isDark ? "#6B7280" : "#9CA3AF"}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Ionicons name="close-circle" size={18} color={isDark ? "#9CA3AF" : "#6B7280"} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Books List */}
      <ScrollView className="flex-1 p-4">
        <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Library Books</Text>
        {filteredBooks.length === 0 ? (
          <View className="items-center justify-center py-6">
            <Ionicons name="book-outline" size={48} color={isDark ? "#ff6900" : "#ff6900"} />
            <Text className="text-gray-500 dark:text-gray-400 text-center mt-4">
              {books.length === 0 ? "No books added yet." : "No books match your search."}
            </Text>
          </View>
        ) : (
          filteredBooks.map((book) => renderBookItem(book))
        )}

        {/* Borrowed Books */}
        <Text className="text-lg font-semibold text-gray-900 dark:text-white mt-8 mb-3">Borrowed Books</Text>
        {borrowedBooks.length === 0 ? (
          <View className="items-center justify-center py-6">
            <Ionicons name="library-outline" size={48} color={isDark ? "#ff6900" : "#ff6900"} />
            <Text className="text-gray-500 dark:text-gray-400 text-center mt-4">
              No borrowed books yet.
            </Text>
          </View>
        ) : (
          borrowedBooks.map((borrow) => (
            <View
              key={borrow.id}
              className="bg-white dark:bg-[#1a1a1a] rounded-xl p-4 mb-3 shadow-sm border border-teal-100 dark:border-teal-900"
            >
              <Text className="text-lg font-semibold text-slate-800 dark:text-white mb-1">
                {borrow.bookTitle}
              </Text>
              <Text className="text-sm text-teal-600 dark:text-teal-400 mb-1">
                by {borrow.author}
              </Text>
              <Text className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                Borrower: {borrow.borrowerName} ({borrow.borrowerEmail})
              </Text>
              <Text className="text-xs text-gray-500 dark:text-gray-400">
                Status: {borrow.status}
              </Text>
            </View>
          ))
        )}
      </ScrollView>

      {/* Add/Edit Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View className="flex-1 bg-white dark:bg-[#121212]">
          <View className="bg-teal-600 dark:bg-teal-900 p-4 pt-12">
            <View className="flex-row justify-between items-center">
              <Text className="text-xl font-bold text-white">
                {editingBook ? "Edit Book" : "Add New Book"}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  resetForm();
                  setModalVisible(false);
                }}
              >
                <Ionicons name="close" size={24} color="white" />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView className="flex-1 p-4">
            {/* Title */}
            <View className="mb-4">
              <Text className="text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">
                Book Title *
              </Text>
              <TextInput
                className="bg-gray-50 dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-lg p-3 text-gray-900 dark:text-white"
                value={formData.title}
                onChangeText={(text) =>
                  setFormData({ ...formData, title: text })
                }
                placeholder="Enter book title"
                placeholderTextColor={isDark ? "#6B7280" : "#9CA3AF"}
              />
            </View>

            {/* Author */}
            <View className="mb-4">
              <Text className="text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">
                Author *
              </Text>
              <TextInput
                className="bg-gray-50 dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-lg p-3 text-gray-900 dark:text-white"
                value={formData.author}
                onChangeText={(text) =>
                  setFormData({ ...formData, author: text })
                }
                placeholder="Enter author name"
                placeholderTextColor={isDark ? "#6B7280" : "#9CA3AF"}
              />
            </View>

            {/* ISBN */}
            <View className="mb-4">
              <Text className="text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">
                ISBN *
              </Text>
              <TextInput
                className="bg-gray-50 dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-lg p-3 text-gray-900 dark:text-white"
                value={formData.isbn}
                onChangeText={(text) =>
                  setFormData({ ...formData, isbn: text })
                }
                placeholder="Enter ISBN"
                placeholderTextColor={isDark ? "#6B7280" : "#9CA3AF"}
              />
            </View>

            {/* Category */}
            <View className="mb-4">
              <Text className="text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">
                Category
              </Text>
              <TextInput
                className="bg-gray-50 dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-lg p-3 text-gray-900 dark:text-white"
                value={formData.category}
                onChangeText={(text) =>
                  setFormData({ ...formData, category: text })
                }
                placeholder="Enter category (e.g., Fiction, Science)"
                placeholderTextColor={isDark ? "#6B7280" : "#9CA3AF"}
              />
            </View>

            {/* Quantity */}
            <View className="mb-6">
              <Text className="text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">
                Quantity
              </Text>
              <TextInput
                className="bg-gray-50 dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-lg p-3 text-gray-900 dark:text-white"
                value={formData.quantity}
                onChangeText={(text) =>
                  setFormData({ ...formData, quantity: text })
                }
                placeholder="Enter quantity"
                placeholderTextColor={isDark ? "#6B7280" : "#9CA3AF"}
                keyboardType="numeric"
              />
            </View>

            {/* Submit */}
            <TouchableOpacity
              className="bg-orange-500 p-4 rounded-lg"
              onPress={handleSubmit}
              disabled={loading}
            >
              <Text className="text-white text-center font-semibold">
                {editingBook ? "Update Book" : "Add Book"}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
};


export { AddUpdateDeleteBooksForm };
export default AddUpdateDeleteBooksForm;
