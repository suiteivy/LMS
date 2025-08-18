import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Book {
  id: string;
  title: string;
  author: string;
  isbn: string;
  category: string;
  quantity: number;
  available: number;
}

interface AddUpdateDeleteBooksFormProps {
  books?: Book[];
  onAddBook?: (book: Omit<Book, 'id'>) => void;
  onUpdateBook?: (id: string, book: Partial<Book>) => void;
  onDeleteBook?: (id: string) => void;
}

export const AddUpdateDeleteBooksForm: React.FC<AddUpdateDeleteBooksFormProps> = ({
  books = [],
  onAddBook,
  onUpdateBook,
  onDeleteBook,
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    author: '',
    isbn: '',
    category: '',
    quantity: '',
  });

  const resetForm = () => {
    setFormData({
      title: '',
      author: '',
      isbn: '',
      category: '',
      quantity: '',
    });
    setEditingBook(null);
  };

  const handleSubmit = () => {
    if (!formData.title || !formData.author || !formData.isbn) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    const bookData = {
      title: formData.title,
      author: formData.author,
      isbn: formData.isbn,
      category: formData.category,
      quantity: parseInt(formData.quantity) || 1,
      available: parseInt(formData.quantity) || 1,
    };

    if (editingBook) {
      onUpdateBook?.(editingBook.id, bookData);
    } else {
      onAddBook?.(bookData);
    }

    resetForm();
    setModalVisible(false);
  };

  const handleEdit = (book: Book) => {
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

  const handleDelete = (book: Book) => {
    Alert.alert(
      'Delete Book',
      `Are you sure you want to delete "${book.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => onDeleteBook?.(book.id),
        },
      ]
    );
  };

  const renderBookItem = (book: Book) => (
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
          <TouchableOpacity
            className="bg-teal-100 p-2 rounded-lg mr-2"
            onPress={() => handleEdit(book)}
          >
            <Ionicons name="pencil" size={16} color="#128C7E" />
          </TouchableOpacity>
          <TouchableOpacity
            className="bg-red-100 p-2 rounded-lg"
            onPress={() => handleDelete(book)}
          >
            <Ionicons name="trash" size={16} color="#EF4444" />
          </TouchableOpacity>
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

      {/* Books List */}
      <ScrollView className="flex-1 p-4">
        {books.length === 0 ? (
          <View className="items-center justify-center py-12">
            <Ionicons name="book-outline" size={64} color="#A1EBE5" />
            <Text className="text-gray-500 text-center mt-4">
              No books added yet. Add your first book to get started.
            </Text>
          </View>
        ) : (
          books.map(renderBookItem)
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
                {editingBook ? 'Edit Book' : 'Add New Book'}
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
            <View className="mb-4">
              <Text className="text-sm font-medium text-slate-700 mb-2">
                Book Title *
              </Text>
              <TextInput
                className="bg-gray-50 border border-gray-200 rounded-lg p-3"
                value={formData.title}
                onChangeText={(text) => setFormData({ ...formData, title: text })}
                placeholder="Enter book title"
              />
            </View>

            <View className="mb-4">
              <Text className="text-sm font-medium text-slate-700 mb-2">
                Author *
              </Text>
              <TextInput
                className="bg-gray-50 border border-gray-200 rounded-lg p-3"
                value={formData.author}
                onChangeText={(text) => setFormData({ ...formData, author: text })}
                placeholder="Enter author name"
              />
            </View>

            <View className="mb-4">
              <Text className="text-sm font-medium text-slate-700 mb-2">
                ISBN *
              </Text>
              <TextInput
                className="bg-gray-50 border border-gray-200 rounded-lg p-3"
                value={formData.isbn}
                onChangeText={(text) => setFormData({ ...formData, isbn: text })}
                placeholder="Enter ISBN"
              />
            </View>

            <View className="mb-4">
              <Text className="text-sm font-medium text-slate-700 mb-2">
                Category
              </Text>
              <TextInput
                className="bg-gray-50 border border-gray-200 rounded-lg p-3"
                value={formData.category}
                onChangeText={(text) => setFormData({ ...formData, category: text })}
                placeholder="Enter category (e.g., Fiction, Science)"
              />
            </View>

            <View className="mb-6">
              <Text className="text-sm font-medium text-slate-700 mb-2">
                Quantity
              </Text>
              <TextInput
                className="bg-gray-50 border border-gray-200 rounded-lg p-3"
                value={formData.quantity}
                onChangeText={(text) => setFormData({ ...formData, quantity: text })}
                placeholder="Enter quantity"
                keyboardType="numeric"
              />
            </View>

            <TouchableOpacity
              className="bg-teal-600 p-4 rounded-lg"
              onPress={handleSubmit}
            >
              <Text className="text-white text-center font-semibold">
                {editingBook ? 'Update Book' : 'Add Book'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
};