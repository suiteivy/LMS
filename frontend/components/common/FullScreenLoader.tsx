import React from 'react';
import { View, ActivityIndicator, Text, Modal, Platform } from 'react-native';

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
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: 9999
            }}>
                <View className="bg-white p-6 rounded-2xl shadow-lg items-center border border-gray-100">
                    <ActivityIndicator size="large" color="#f97316" />
                    {message && (
                        <Text className="mt-4 text-gray-600 font-medium text-sm">
                            {message}
                        </Text>
                    )}
                </View>
            </View>
        </Modal>
    );
};
