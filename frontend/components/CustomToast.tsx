import React from 'react';
import { View, Text } from 'react-native';
import { BaseToast, ErrorToast, ToastConfig } from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';

// Define custom toast configuration
export const toastConfig: ToastConfig = {
    success: (props) => (
        <View className="w-[90%] bg-white border-l-4 border-green-500 rounded-xl shadow-lg shadow-gray-200 flex-row items-center p-4 min-h-[60px] my-2 mx-auto">
            <View className="w-8 h-8 rounded-full bg-green-100 items-center justify-center mr-3">
                <Ionicons name="checkmark" size={18} color="#10B981" />
            </View>
            <View className="flex-1">
                <Text className="text-gray-900 font-bold text-base mb-0.5">{props.text1}</Text>
                {props.text2 && <Text className="text-gray-500 text-xs font-medium">{props.text2}</Text>}
            </View>
        </View>
    ),
    error: (props) => (
        <View className="w-[90%] bg-white border-l-4 border-red-500 rounded-xl shadow-lg shadow-gray-200 flex-row items-center p-4 min-h-[60px] my-2 mx-auto">
            <View className="w-8 h-8 rounded-full bg-red-100 items-center justify-center mr-3">
                <Ionicons name="alert" size={18} color="#EF4444" />
            </View>
            <View className="flex-1">
                <Text className="text-gray-900 font-bold text-base mb-0.5">{props.text1}</Text>
                {props.text2 && <Text className="text-gray-500 text-xs font-medium">{props.text2}</Text>}
            </View>
        </View>
    ),
    info: (props) => (
        <View className="w-[90%] bg-white border-l-4 border-blue-500 rounded-xl shadow-lg shadow-gray-200 flex-row items-center p-4 min-h-[60px] my-2 mx-auto">
            <View className="w-8 h-8 rounded-full bg-blue-100 items-center justify-center mr-3">
                <Ionicons name="information" size={18} color="#3B82F6" />
            </View>
            <View className="flex-1">
                <Text className="text-gray-900 font-bold text-base mb-0.5">{props.text1}</Text>
                {props.text2 && <Text className="text-gray-500 text-xs font-medium">{props.text2}</Text>}
            </View>
        </View>
    ),
};
