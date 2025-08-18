import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AddUpdateDeleteBooksForm } from './AddUpdateDeleteBooksForm';
import { BorrowedBooksOverview } from './BorrowedBooksOverview';
import { Book, BorrowedBook, UserRoles } from '@/types/types';


type LibrarySection = 'overview' | 'books' | 'borrowed' | 'config';

const LibraryAction = () => {
  const [activeSection, setActiveSection] = useState<LibrarySection>('overview');
  
  // Sample data - replace with your actual data source
  const [books, setBooks] = useState<Book[]>([
    {
      id: '1',
      title: 'React Native Development',
      author: 'John Smith',
      isbn: '978-1234567890',
      category: 'Programming',
      quantity: 5,
      available: 3,
    },
    {
      id: '2',
      title: 'JavaScript Essentials',
      author: 'Jane Doe',
      isbn: '978-0987654321',
      category: 'Programming',
      quantity: 4,
      available: 2,
    },
  ]);

  const [borrowedBooks, setBorrowedBooks] = useState<BorrowedBook[]>([
    {
      id: '1',
      bookTitle: 'React Native Development',
      author: 'John Smith',
      isbn: '978-1234567890',
      borrowerName: 'Alice Johnson',
      borrowerEmail: 'alice@example.com',
      borrowDate: new Date('2025-08-01'),
      dueDate: new Date('2025-08-15'),
      status: 'borrowed',
    },
    {
      id: '2',
      bookTitle: 'JavaScript Essentials',
      author: 'Jane Doe',
      isbn: '978-0987654321',
      borrowerName: 'Bob Wilson',
      borrowerEmail: 'bob@example.com',
      borrowDate: new Date('2025-07-20'),
      dueDate: new Date('2025-08-10'),
      status: 'overdue',
    },
      {
      id: '2',
      bookTitle: 'JavaScript Essentials',
      author: 'Jane Doe',
      isbn: '978-0977654321',
      borrowerName: 'Leon Gabriel',
      borrowerEmail: 'bob@example.com',
      borrowDate: new Date('2025-07-24'),
      dueDate: new Date('2025-08-16'),
      status: 'overdue',
    },
  ]);

  const [userRoles, setUserRoles] = useState<UserRoles[]>([]);

  // Handler functions
  const handleAddBook = (bookData: Omit<Book, 'id'>) => {
    const newBook: Book = {
      ...bookData,
      id: Date.now().toString(),
    };
    setBooks([...books, newBook]);
  };

  const handleUpdateBook = (id: string, updatedData: Partial<Book>) => {
    setBooks(books.map(book => 
      book.id === id ? { ...book, ...updatedData } : book
    ));
  };

  const handleDeleteBook = (id: string) => {
    setBooks(books.filter(book => book.id !== id));
  };

  const handleReturnBook = (borrowId: string) => {
    setBorrowedBooks(borrowedBooks.map(borrowed =>
      borrowed.id === borrowId 
        ? { ...borrowed, status: 'returned' as const }
        : borrowed
    ));
    
    // Update book availability
    const borrowedBook = borrowedBooks.find(b => b.id === borrowId);
    if (borrowedBook) {
      const book = books.find(b => b.title === borrowedBook.bookTitle);
      if (book) {
        handleUpdateBook(book.id, { available: book.available + 1 });
      }
    }
  };

  const handleExtendDueDate = (borrowId: string, newDueDate: Date) => {
    setBorrowedBooks(borrowedBooks.map(borrowed =>
      borrowed.id === borrowId 
        ? { ...borrowed, dueDate: newDueDate }
        : borrowed
    ));
  };

  const handleSendReminder = (borrowId: string) => {
    // Implement email reminder logic
    console.log('Sending reminder for borrow ID:', borrowId);
  };

  const sections = [
    { id: 'overview', title: 'Overview', icon: 'home-outline' },
    { id: 'books', title: 'Books', icon: 'library-outline' },
    { id: 'borrowed', title: 'Borrowed', icon: 'book-outline' },
    { id: 'config', title: 'Config', icon: 'settings-outline' },
  ];

  const getOverviewStats = () => {
    const totalBooks = books.reduce((sum, book) => sum + book.quantity, 0);
    const availableBooks = books.reduce((sum, book) => sum + book.available, 0);
    const activeBorrows = borrowedBooks.filter(b => b.status === 'borrowed').length;
    const overdueBooks = borrowedBooks.filter(b => b.status === 'overdue').length;

    return { totalBooks, availableBooks, activeBorrows, overdueBooks };
  };

  const renderOverview = () => {
    const stats = getOverviewStats();
    
    return (
      <View className="p-4">
        {/* Stats Cards */}
        <View className="mb-6">
          <Text className="text-xl font-bold text-slate-800 mb-4">
            Library Overview
          </Text>
          
          <View className="flex-row flex-wrap -mx-2">
            <View className="w-1/2 px-2 mb-4">
              <View className="bg-white rounded-xl p-4 shadow-sm border border-teal-200">
                <View className="flex-row items-center justify-between">
                  <View>
                    <Text className="text-2xl font-bold text-teal-600">
                      {stats.totalBooks}
                    </Text>
                    <Text className="text-sm text-slate-600">Total Books</Text>
                  </View>
                  <View className="w-10 h-10 bg-teal-100 rounded-full items-center justify-center">
                    <Ionicons name="library-outline" size={20} color="#128C7E" />
                  </View>
                </View>
              </View>
            </View>

            <View className="w-1/2 px-2 mb-4">
              <View className="bg-white rounded-xl p-4 shadow-sm border border-mint-200">
                <View className="flex-row items-center justify-between">
                  <View>
                    <Text className="text-2xl font-bold text-mint-600">
                      {stats.availableBooks}
                    </Text>
                    <Text className="text-sm text-slate-600">Available</Text>
                  </View>
                  <View className="w-10 h-10 bg-mint-100 rounded-full items-center justify-center">
                    <Ionicons name="checkmark-circle-outline" size={20} color="#1ABC9C" />
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
              <View className="bg-white rounded-xl p-4 shadow-sm border border-red-200">
                <View className="flex-row items-center justify-between">
                  <View>
                    <Text className="text-2xl font-bold text-red-600">
                      {stats.overdueBooks}
                    </Text>
                    <Text className="text-sm text-slate-600">Overdue</Text>
                  </View>
                  <View className="w-10 h-10 bg-red-100 rounded-full items-center justify-center">
                    <Ionicons name="warning-outline" size={20} color="#EF4444" />
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
              onPress={() => setActiveSection('books')}
            >
              <View className="flex-row items-center">
                <View className="w-10 h-10 bg-teal-100 rounded-full items-center justify-center mr-3">
                  <Ionicons name="library-outline" size={20} color="#128C7E" />
                </View>
                <View className="flex-1">
                  <Text className="font-semibold text-slate-800">Manage Books</Text>
                  <Text className="text-sm text-slate-600">Add, edit, or delete books</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#64748B" />
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 active:bg-slate-50"
              onPress={() => setActiveSection('borrowed')}
            >
              <View className="flex-row items-center">
                <View className="w-10 h-10 bg-slate-100 rounded-full items-center justify-center mr-3">
                  <Ionicons name="book-outline" size={20} color="#2C3E50" />
                </View>
                <View className="flex-1">
                  <Text className="font-semibold text-slate-800">Borrowed Books</Text>
                  <Text className="text-sm text-slate-600">Track returns and manage loans</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#64748B" />
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              className="bg-white rounded-xl p-4 shadow-sm border border-mint-200 active:bg-mint-50"
              onPress={() => setActiveSection('config')}
            >
              <View className="flex-row items-center">
                <View className="w-10 h-10 bg-mint-100 rounded-full items-center justify-center mr-3">
                  <Ionicons name="settings-outline" size={20} color="#1ABC9C" />
                </View>
                <View className="flex-1">
                  <Text className="font-semibold text-slate-800">Borrow Configuration</Text>
                  <Text className="text-sm text-slate-600">Set limits and policies</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#64748B" />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Recent Activity */}
        <View className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
          <Text className="font-semibold text-slate-800 mb-3">Recent Library Activity</Text>
          
          <View className="space-y-3">
            <View className="flex-row items-center">
              <View className="w-8 h-8 bg-teal-100 rounded-full items-center justify-center mr-3">
                <Ionicons name="add-outline" size={14} color="#128C7E" />
              </View>
              <View className="flex-1">
                <Text className="text-sm text-slate-800">New book added: "React Native Guide"</Text>
                <Text className="text-xs text-slate-500">2 hours ago</Text>
              </View>
            </View>
            
            <View className="flex-row items-center">
              <View className="w-8 h-8 bg-red-100 rounded-full items-center justify-center mr-3">
                <Ionicons name="warning-outline" size={14} color="#EF4444" />
              </View>
              <View className="flex-1">
                <Text className="text-sm text-slate-800">Book overdue: "JavaScript Essentials"</Text>
                <Text className="text-xs text-slate-500">1 day ago</Text>
              </View>
            </View>
            
            <View className="flex-row items-center">
              <View className="w-8 h-8 bg-mint-100 rounded-full items-center justify-center mr-3">
                <Ionicons name="checkmark-outline" size={14} color="#1ABC9C" />
              </View>
              <View className="flex-1">
                <Text className="text-sm text-slate-800">Book returned: "TypeScript Handbook"</Text>
                <Text className="text-xs text-slate-500">3 hours ago</Text>
              </View>
            </View>
          </View>
        </View>
      </View>
    );
  };

  const renderSectionContent = () => {
    switch (activeSection) {
      case 'overview':
        return renderOverview();
      case 'books':
        return (
          <AddUpdateDeleteBooksForm
            books={books}
            onAddBook={handleAddBook}
            onUpdateBook={handleUpdateBook}
            onDeleteBook={handleDeleteBook}
          />
        );
      case 'borrowed':
        return (
          <BorrowedBooksOverview
            borrowedBooks={borrowedBooks}
            onReturnBook={handleReturnBook}
            onExtendDueDate={handleExtendDueDate}
            onSendReminder={handleSendReminder}
          />
        );
      case 'config':
        // return (
        //   <BorrowLimitConfiguration
        //     userRoles={userRoles}
        //     onUpdateRole={(roleId, updatedRole) => {
        //       setUserRoles(userRoles.map(role =>
        //         role.id === roleId ? { ...role, ...updatedRole } : role
        //       ));
        //     }}
        //     onAddRole={(roleData) => {
        //       const newRole: UserRole = {
        //         ...roleData,
        //         id: Date.now().toString(),
        //       };
        //       setUserRoles([...userRoles, newRole]);
        //     }}
        //     onDeleteRole={(roleId) => {
        //       setUserRoles(userRoles.filter(role => role.id !== roleId));
        //     }}
        //   />
        // );
      default:
        return renderOverview();
    }
  };

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
                    ? 'bg-teal-600 border-teal-600'
                    : 'bg-white border-slate-300'
                }`}
                onPress={() => setActiveSection(section.id as LibrarySection)}
              >
                <View className="flex-row items-center">
                  <Ionicons
                    name={section.icon as any}
                    size={16}
                    color={activeSection === section.id ? 'white' : '#64748B'}
                  />
                  <Text
                    className={`ml-2 text-sm font-medium ${
                      activeSection === section.id ? 'text-white' : 'text-slate-700'
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
      <View className="flex-1">
        {renderSectionContent()}
      </View>
    </SafeAreaView>
  );
};

export default LibraryAction