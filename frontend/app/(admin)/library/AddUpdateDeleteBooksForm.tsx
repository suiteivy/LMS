import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LibraryAPI, useLibraryAPI } from "@/services/LibraryService";
import { FrontendBook, FrontendBorrowedBook } from "@/types/types";

export const AddUpdateDeleteBooksForm: React.FC = () => {
  const [books, setBooks] = useState<FrontendBook[]>([]);
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

  const { loading, error, executeWithLoading, clearError } = useLibraryAPI();

  // Fetch library + borrowed books
  useEffect(() => {
    fetchBooks();
    fetchBorrowedBooks();
  }, []);

  const fetchBooks = async () => {
    try {
      const backendBooks = await executeWithLoading(LibraryAPI.getBooks);
      setBooks(backendBooks.map(LibraryAPI.transformBookData));
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
        setBooks((prev) =>
          prev.map((b) => (b.id === editingBook.id ? updatedBook : b))
        );
      } else {
        const backendBook = await executeWithLoading(() =>
          LibraryAPI.addBook({
            title: formData.title,
            author: formData.author,
            isbn: formData.isbn,
            total_quantity: parseInt(formData.quantity) || 1,
            institution_id: "123", // TODO: replace with dynamic institution_id
            category: formData.category,
          })
        );
        const newBook = LibraryAPI.transformBookData(backendBook);
        setBooks((prev) => [...prev, newBook]);
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
            await executeWithLoading(() => LibraryAPI.deleteBook(book.id));
            setBooks((prev) => prev.filter((b) => b.id !== book.id));
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
      className="bg-white rounded-xl p-4 mb-3 shadow-sm border border-teal-100"
    >
      <View className="flex-row justify-between items-start mb-2">
        <View className="flex-1">
          <Text className="text-lg font-semibold text-slate-800 mb-1">
            {book.title}
          </Text>
          <Text className="text-sm text-teal-600 mb-1">by {book.author}</Text>
          <Text className="text-xs text-gray-500 mb-2">ISBN: {book.isbn}</Text>
          <View className="flex-row items-center">
            <View className="bg-mint-50 px-2 py-1 rounded-full mr-2">
              <Text className="text-xs text-teal-700">{book.category}</Text>
            </View>
            <Text className="text-xs text-gray-600">
              {book.available}/{book.quantity} available
            </Text>
          </View>
        </View>

        <View className="flex-row">
          {!borrowed && (
            <TouchableOpacity
              className="bg-teal-100 p-2 rounded-lg mr-2"
              onPress={() => handleEdit(book)}
            >
              <Ionicons name="pencil" size={16} color="#128C7E" />
            </TouchableOpacity>
          )}
          {!borrowed && (
            <TouchableOpacity
              className="bg-red-100 p-2 rounded-lg"
              onPress={() => handleDelete(book)}
            >
              <Ionicons name="trash" size={16} color="#EF4444" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );

  return (
    <View className="flex-1 bg-mint-50">
      {/* Header */}
      <View className="bg-white p-4 border-b border-teal-100">
        <View className="flex-row justify-between items-center">
          <Text className="text-xl font-bold text-slate-800">
            Book Management
          </Text>
          <TouchableOpacity
            className="bg-teal-600 px-4 py-2 rounded-lg"
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
          <ActivityIndicator size="small" color="#128C7E" />
          <Text className="text-gray-500 mt-2">Loading...</Text>
        </View>
      )}
      {error && (
        <View className="items-center py-2">
          <Text className="text-red-500">{error}</Text>
          <TouchableOpacity onPress={clearError}>
            <Text className="text-teal-600 underline">Dismiss</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Books List */}
      <ScrollView className="flex-1 p-4">
        <Text className="text-lg font-semibold mb-3">Library Books</Text>
        {books.length === 0 ? (
          <View className="items-center justify-center py-6">
            <Ionicons name="book-outline" size={48} color="#A1EBE5" />
            <Text className="text-gray-500 text-center mt-4">
              No books added yet.
            </Text>
          </View>
        ) : (
          books.map((book) => renderBookItem(book))
        )}

        {/* Borrowed Books */}
        <Text className="text-lg font-semibold mt-8 mb-3">Borrowed Books</Text>
        {borrowedBooks.length === 0 ? (
          <View className="items-center justify-center py-6">
            <Ionicons name="library-outline" size={48} color="#A1EBE5" />
            <Text className="text-gray-500 text-center mt-4">
              No borrowed books yet.
            </Text>
          </View>
        ) : (
          borrowedBooks.map((borrow) => (
            <View
              key={borrow.id}
              className="bg-white rounded-xl p-4 mb-3 shadow-sm border border-teal-100"
            >
              <Text className="text-lg font-semibold text-slate-800 mb-1">
                {borrow.bookTitle}
              </Text>
              <Text className="text-sm text-teal-600 mb-1">
                by {borrow.author}
              </Text>
              <Text className="text-xs text-gray-500 mb-1">
                Borrower: {borrow.borrowerName} ({borrow.borrowerEmail})
              </Text>
              <Text className="text-xs text-gray-500">
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
        <View className="flex-1 bg-white">
          <View className="bg-teal-600 p-4 pt-12">
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
              <Text className="text-sm font-medium text-slate-700 mb-2">
                Book Title *
              </Text>
              <TextInput
                className="bg-gray-50 border border-gray-200 rounded-lg p-3"
                value={formData.title}
                onChangeText={(text) =>
                  setFormData({ ...formData, title: text })
                }
                placeholder="Enter book title"
              />
            </View>

            {/* Author */}
            <View className="mb-4">
              <Text className="text-sm font-medium text-slate-700 mb-2">
                Author *
              </Text>
              <TextInput
                className="bg-gray-50 border border-gray-200 rounded-lg p-3"
                value={formData.author}
                onChangeText={(text) =>
                  setFormData({ ...formData, author: text })
                }
                placeholder="Enter author name"
              />
            </View>

            {/* ISBN */}
            <View className="mb-4">
              <Text className="text-sm font-medium text-slate-700 mb-2">
                ISBN *
              </Text>
              <TextInput
                className="bg-gray-50 border border-gray-200 rounded-lg p-3"
                value={formData.isbn}
                onChangeText={(text) =>
                  setFormData({ ...formData, isbn: text })
                }
                placeholder="Enter ISBN"
              />
            </View>

            {/* Category */}
            <View className="mb-4">
              <Text className="text-sm font-medium text-slate-700 mb-2">
                Category
              </Text>
              <TextInput
                className="bg-gray-50 border border-gray-200 rounded-lg p-3"
                value={formData.category}
                onChangeText={(text) =>
                  setFormData({ ...formData, category: text })
                }
                placeholder="Enter category (e.g., Fiction, Science)"
              />
            </View>

            {/* Quantity */}
            <View className="mb-6">
              <Text className="text-sm font-medium text-slate-700 mb-2">
                Quantity
              </Text>
              <TextInput
                className="bg-gray-50 border border-gray-200 rounded-lg p-3"
                value={formData.quantity}
                onChangeText={(text) =>
                  setFormData({ ...formData, quantity: text })
                }
                placeholder="Enter quantity"
                keyboardType="numeric"
              />
            </View>

            {/* Submit */}
            <TouchableOpacity
              className="bg-teal-600 p-4 rounded-lg"
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
