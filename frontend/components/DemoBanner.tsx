import { useAuth } from '@/contexts/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { Clock, X } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Modal, Text, TouchableOpacity, View } from 'react-native';

export default function DemoBanner() {
    const { isDemo, logout, session } = useAuth();
    const [expiryTime, setExpiryTime] = useState<number | null>(null);
    const [timeLeft, setTimeLeft] = useState(0);
    const [showWarningModal, setShowWarningModal] = useState(false);
    const [showExpiredModal, setShowExpiredModal] = useState(false);
    const router = useRouter();

    useEffect(() => {
        if (!isDemo) return;

        const loadTimer = async () => {
            try {
                let expiry = null;
                const expiryStr = await AsyncStorage.getItem('demo_expiry');

                if (expiryStr) {
                    expiry = parseInt(expiryStr, 10);
                } else {
                    expiry = Date.now() + 15 * 60 * 1000;
                    await AsyncStorage.setItem('demo_expiry', expiry.toString());
                }

                setExpiryTime(expiry);
                const remaining = Math.floor((expiry - Date.now()) / 1000);
                setTimeLeft(remaining > 0 ? remaining : 0);
            } catch (e) {
                console.error("Failed to load trial timer", e);
            }
        };

        loadTimer();
    }, [isDemo]);

    useEffect(() => {
        if (!expiryTime) return;

        const interval = setInterval(() => {
            const remaining = Math.floor((expiryTime - Date.now()) / 1000);

            if (remaining <= 0) {
                setTimeLeft(0);
                clearInterval(interval);
                handleExpiry();
            } else {
                setTimeLeft(remaining);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [expiryTime]);

    // Separate effect for warning
    useEffect(() => {
        if (timeLeft === 120) {
            setShowWarningModal(true);
        }
        if (timeLeft === 0 && expiryTime) {
            handleExpiry();
        }
    }, [timeLeft]);

    const handleExpiry = async () => {
        setShowExpiredModal(true);
        try {
            await AsyncStorage.removeItem('demo_expiry');
            await logout();
        } catch (error) {
            console.error("Logout failed", error);
        }
    };

    const handleEndDemo = async () => {
        try {
            await AsyncStorage.removeItem('demo_expiry');
            await logout();
            router.replace('/(auth)/demo');
        } catch (error) {
            console.error("Logout failed", error);
        }
    };

    if (!isDemo || !session) return null;

    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;

    return (
        <>
            {/* Banner */}
            <View className="absolute top-10 left-0 right-0 z-50 px-4 flex items-center justify-center pt-2" pointerEvents="box-none">
                <View className="bg-orange-600/90 backdrop-blur-md rounded-full px-4 py-2 flex-row items-center shadow-lg border border-white/20">
                    <Clock size={16} color="white" strokeWidth={2.5} />
                    <Text className="text-white font-bold ml-2 font-mono">
                        DEMO: {minutes}:{seconds.toString().padStart(2, '0')}
                    </Text>
                    <View className="w-px h-4 bg-white/30 mx-3" />
                    <TouchableOpacity onPress={handleEndDemo} activeOpacity={0.8}>
                        <Text className="text-white font-bold text-xs uppercase">Exit</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* 2 Minute Warning Modal */}
            <Modal visible={showWarningModal} transparent animationType="fade">
                <View className="flex-1 bg-black/60 items-center justify-center px-6">
                    <View className="bg-white dark:bg-[#1a1a1a] rounded-3xl p-6 w-full border border-gray-100 dark:border-gray-800">
                        <View className="items-end mb-2">
                            <TouchableOpacity onPress={() => setShowWarningModal(false)}>
                                <X size={20} color="#9ca3af" />
                            </TouchableOpacity>
                        </View>
                        <View className="bg-orange-100 dark:bg-orange-950/40 w-14 h-14 rounded-2xl items-center justify-center mb-4 self-center">
                            <Clock size={28} color="#FF6900" />
                        </View>
                        <Text className="text-gray-900 dark:text-white text-xl font-bold text-center mb-2">
                            2 Minutes Left
                        </Text>
                        <Text className="text-gray-500 dark:text-gray-400 text-sm text-center mb-6">
                            Your demo session is almost up! Sign up to keep access to all features.
                        </Text>
                        <TouchableOpacity
                            className="bg-[#FF6900] rounded-2xl py-4 items-center mb-3"
                            onPress={() => {
                                setShowWarningModal(false);
                                handleEndDemo();
                            }}
                        >
                            <Text className="text-white font-bold text-base">Create an Account</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            className="py-3 items-center"
                            onPress={() => setShowWarningModal(false)}
                        >
                            <Text className="text-gray-400 dark:text-gray-500 font-medium text-sm">Continue Demo</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Expired Modal */}
            <Modal visible={showExpiredModal} transparent animationType="fade">
                <View className="flex-1 bg-black/60 items-center justify-center px-6">
                    <View className="bg-white dark:bg-[#1a1a1a] rounded-3xl p-6 w-full border border-gray-100 dark:border-gray-800">
                        <View className="bg-red-100 dark:bg-red-950/40 w-14 h-14 rounded-2xl items-center justify-center mb-4 self-center">
                            <Clock size={28} color="#f43f5e" />
                        </View>
                        <Text className="text-gray-900 dark:text-white text-xl font-bold text-center mb-2">
                            Demo Ended
                        </Text>
                        <Text className="text-gray-500 dark:text-gray-400 text-sm text-center mb-6">
                            Your 15-minute trial has ended. We hope you enjoyed the tour!
                        </Text>
                        <TouchableOpacity
                            className="bg-[#FF6900] rounded-2xl py-4 items-center mb-3"
                            onPress={() => {
                                setShowExpiredModal(false);
                                router.replace('/(auth)/demo');
                            }}
                        >
                            <Text className="text-white font-bold text-base">Create an Account</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            className="py-3 items-center"
                            onPress={() => {
                                setShowExpiredModal(false);
                                router.replace('/(auth)/demo');
                            }}
                        >
                            <Text className="text-gray-400 dark:text-gray-500 font-medium text-sm">Back to Demo Page</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </>
    );
}