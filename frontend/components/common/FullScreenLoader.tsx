import React from 'react';
import { ActivityIndicator, Modal, Text, View } from 'react-native';

interface FullScreenLoaderProps {
    visible: boolean;
    message?: string;
}

export const FullScreenLoader: React.FC<FullScreenLoaderProps> = ({ visible, message = "Loading..." }) => {
    if (!visible) return null;

    return (
        <Modal
            transparent={true}
            animationType="fade"
            visible={visible}
            onRequestClose={() => { }} // Prevent closing on Android back button
        >
            <View style={{
                flex: 1,
                backgroundColor: 'transparent',
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: 9999
            }} className="bg-white/90 dark:bg-black/90">
                <View className="bg-white dark:bg-[#1a1a1a] p-6 rounded-2xl shadow-lg items-center border border-gray-100 dark:border-gray-800">
                    <ActivityIndicator size="large" color="#f97316" />
                    {message && (
                        <Text className="mt-4 text-gray-600 dark:text-gray-300 font-medium text-sm">
                            {message}
                        </Text>
                    )}
                </View>
            </View>
        </Modal>
    );
};
