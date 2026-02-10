import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Modal, Alert, StatusBar } from 'react-native';
import { Search, FileText, BookOpen, X, Clock, CheckCircle2, Filter, Bookmark } from 'lucide-react-native';

interface LibraryBook {
    id: string;
    title: string;
    subject_code: string;
    author: string;
    file_type: "PDF" | "EPUB" | "Physical";
    description: string;
    available_copies: number;
}

export default function StudentLibrary() {
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedBook, setSelectedBook] = useState<LibraryBook | null>(null);
    const [modalVisible, setModalVisible] = useState(false);

    // Mock data based on your library table
    const materials: LibraryBook[] = [
        {
            id: '1',
            title: 'Introduction to Quantum Computing',
            subject_code: 'PHY402',
            author: 'Dr. Aris Thorne',
            file_type: 'PDF',
            description: 'Explore the foundations of quantum mechanics applied to computing. This book covers qubits, entanglement, and quantum gates.',
            available_copies: 5
        },
        {
            id: '2',
            title: 'Neural Networks and Deep Learning',
            subject_code: 'CS501',
            author: 'Michael Nielsen',
            file_type: 'Physical',
            description: 'A deep dive into the mathematical structures that power modern AI and machine learning models.',
            available_copies: 2
        }
    ];

    const handleBorrow = (bookTitle: string) => {
        Alert.alert("Request Sent", `You have requested to borrow "${bookTitle}".`);
        setModalVisible(false);
    };

    return (
        <View className="flex-1 bg-gray-50">
            <StatusBar barStyle="dark-content" />

            {/* --- HEADER SECTION --- */}
            <View className="bg-white pt-14 pb-6 px-6 border-b border-gray-100 shadow-sm">
                <View className="flex-row justify-between items-center mb-6">
                    <View>
                        <Text className="text-gray-400 text-xs font-bold uppercase tracking-widest">Digital Resource</Text>
                        <Text className="text-3xl font-black text-gray-900">Library</Text>
                    </View>
                    <TouchableOpacity className="bg-teal-50 p-3 rounded-2xl">
                        <Bookmark size={22} color="#0d9488" />
                    </TouchableOpacity>
                </View>

                {/* Search Bar */}
                <View className="flex-row gap-2">
                    <View className="flex-1 flex-row items-center bg-gray-100 rounded-2xl px-4 py-2">
                        <Search size={18} color="#9CA3AF" />
                        <TextInput
                            placeholder="Find books or subjects..."
                            className="flex-1 ml-2 text-gray-900 text-sm h-10"
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                    </View>
                    <TouchableOpacity className="bg-gray-900 p-3 rounded-2xl justify-center">
                        <Filter size={20} color="white" />
                    </TouchableOpacity>
                </View>
            </View>

            {/* --- BOOK LIST --- */}
            <ScrollView className="flex-1 px-6 pt-4" showsVerticalScrollIndicator={false}>
                <Text className="text-gray-900 font-bold text-lg mb-4">Recommended for you</Text>

                {materials.map((item) => (
                    <TouchableOpacity
                        key={item.id}
                        activeOpacity={0.7}
                        onPress={() => {
                            setSelectedBook(item);
                            setModalVisible(true);
                        }}
                        className="bg-white p-4 rounded-[25px] border border-gray-100 mb-3 flex-row items-center justify-between"
                    >
                        <View className="flex-row items-center flex-1">
                            <View className={`p-3 rounded-2xl mr-4 ${item.file_type === 'PDF' ? 'bg-red-50' : 'bg-teal-50'}`}>
                                {item.file_type === 'PDF' ? <FileText size={22} color="#ef4444" /> : <BookOpen size={22} color="#0d9488" />}
                            </View>
                            <View className="flex-1">
                                <Text className="text-[10px] font-bold text-teal-600 uppercase mb-0.5">{item.subject_code}</Text>
                                <Text className="text-gray-900 font-bold text-base" numberOfLines={1}>{item.title}</Text>
                                <Text className="text-gray-400 text-xs">{item.author}</Text>
                            </View>
                        </View>
                        <View className="bg-gray-50 p-2 rounded-full">
                            <Text className="text-teal-600 font-bold text-[10px] px-1">VIEW</Text>
                        </View>
                    </TouchableOpacity>
                ))}

                <View className="h-20" />
            </ScrollView>

            {/* --- BORROW MODAL --- */}
            <Modal animationType="slide" transparent visible={modalVisible}>
                <View className="flex-1 bg-black/60 justify-end">
                    <TouchableOpacity className="flex-1" onPress={() => setModalVisible(false)} />
                    <View className="bg-white rounded-t-[50px] p-8">
                        <View className="w-12 h-1.5 bg-gray-200 rounded-full self-center mb-8" />

                        <View className="flex-row justify-between items-start mb-6">
                            <View className="flex-1 pr-4">
                                <Text className="text-teal-600 font-bold text-xs uppercase tracking-widest">{selectedBook?.subject_code}</Text>
                                <Text className="text-3xl font-black text-gray-900 mt-2">{selectedBook?.title}</Text>
                                <Text className="text-gray-500 font-medium mt-1">by {selectedBook?.author}</Text>
                            </View>
                            <TouchableOpacity onPress={() => setModalVisible(false)} className="bg-gray-100 p-3 rounded-full">
                                <X size={20} color="#6B7280" />
                            </TouchableOpacity>
                        </View>

                        <Text className="text-gray-600 leading-6 mb-8 text-base">
                            {selectedBook?.description}
                        </Text>

                        <View className="flex-row justify-between mb-10">
                            <View className="bg-gray-50 p-5 rounded-[30px] flex-1 mr-2 border border-gray-100">
                                <Clock size={18} color="#0d9488" />
                                <Text className="text-gray-400 text-[10px] font-bold uppercase mt-3">Duration</Text>
                                <Text className="text-gray-900 font-bold text-base mt-1">14 Days</Text>
                            </View>
                            <View className="bg-gray-50 p-5 rounded-[30px] flex-1 ml-2 border border-gray-100">
                                <CheckCircle2 size={18} color="#0d9488" />
                                <Text className="text-gray-400 text-[10px] font-bold uppercase mt-3">Available</Text>
                                <Text className="text-gray-900 font-bold text-base mt-1">{selectedBook?.available_copies} Copies</Text>
                            </View>
                        </View>

                        <TouchableOpacity
                            className="bg-teal-600 py-5 rounded-[25px] items-center shadow-lg shadow-teal-200"
                            onPress={() => handleBorrow(selectedBook?.title || "")}
                        >
                            <Text className="text-white font-black text-lg">Borrow Material</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}
