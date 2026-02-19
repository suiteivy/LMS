import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { Clock, X } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function TrialBanner() {
    const { isTrial, logout } = useAuth();
    const [expiryTime, setExpiryTime] = useState<number | null>(null);
    const [timeLeft, setTimeLeft] = useState(0); // Initialize to 0, will be set by effects
    const router = useRouter();

    useEffect(() => {
        if (!isTrial) return;

        const loadTimer = async () => {
            try {
                let expiry = null;
                const expiryStr = await AsyncStorage.getItem('trial_expiry');

                if (expiryStr) {
                    expiry = parseInt(expiryStr, 10);
                } else {
                    // Fallback: Set 15m and save
                    expiry = Date.now() + 15 * 60 * 1000;
                    await AsyncStorage.setItem('trial_expiry', expiry.toString());
                }

                setExpiryTime(expiry);

                // Immediate update
                const remaining = Math.floor((expiry - Date.now()) / 1000);
                setTimeLeft(remaining > 0 ? remaining : 0);

            } catch (e) {
                console.error("Failed to load trial timer", e);
            }
        };

        loadTimer();
    }, [isTrial]);

    useEffect(() => {
        if (!expiryTime) return;

        const interval = setInterval(() => {
            const now = Date.now();
            const remaining = Math.floor((expiryTime - now) / 1000);

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

    const handleExpiry = async () => {
        Alert.alert(
            "Demo Session Expired",
            "Your 15-minute trial session has ended. We hope you enjoyed the tour!",
            [{
                text: "OK", onPress: async () => {
                    await logout();
                    router.replace('/(auth)/trial');
                }
            }]
        );
    };

    const handleEndDemo = () => {
        Alert.alert(
            "End Demo?",
            "Are you sure you want to end your trial session?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "End Session", style: "destructive", onPress: async () => {
                        await logout();
                        router.replace('/(auth)/trial');
                    }
                }
            ]
        );
    };

    // Hide banner if not a trial OR if not logged in (session is null)
    const { session } = useAuth();
    if (!isTrial || !session) return null;

    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;

    return (
        <View className="absolute top-10 left-0 right-0 z-50 px-4 pointer-events-none flex items-center justify-center pt-2">
            <View className="bg-orange-600/90 backdrop-blur-md rounded-full px-4 py-2 flex-row items-center shadow-lg border border-white/20">
                <Clock size={16} color="white" strokeWidth={2.5} />
                <Text className="text-white font-bold ml-2 font-mono">
                    DEMO MODE: {minutes}:{seconds.toString().padStart(2, '0')}
                </Text>
                <View className="width-px h-4 bg-white/30 mx-3" />
                <TouchableOpacity onPress={handleEndDemo} activeOpacity={0.8}>
                    <Text className="text-white font-bold text-xs uppercase">Exit</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}
