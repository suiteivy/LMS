import React from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

/**
 * Banner displayed at the top of the dashboard for Admins/Teachers
 */
export const TrialBanner = () => {
    const { subscriptionStatus, trialEndDate, profile } = useAuth();

    // Only show for admins or if explicitly needed. For now, showing for all authenticated users to be transparent, 
    // but maybe prioritize admins. Let's show for admins and teachers.
    if (!profile || (profile.role !== 'admin' && profile.role !== 'teacher')) return null;

    if (subscriptionStatus === 'active') return null; // Don't show if fully subscribed

    const isExpired = subscriptionStatus === 'expired';

    let daysRemaining = 0;
    if (trialEndDate) {
        const end = new Date(trialEndDate).getTime();
        const now = new Date().getTime();
        daysRemaining = Math.max(0, Math.floor((end - now) / (1000 * 60 * 60 * 24)));
    }

    const handleUpgradePress = () => {
        Alert.alert(
            "Upgrade Required",
            "Please contact LMS billing support to upgrade your institution's subscription."
        );
    };

    if (isExpired || daysRemaining === 0) {
        return (
            <View className="bg-red-500 flex-row items-center px-4 py-3 justify-between">
                <View className="flex-row items-center flex-1 pr-2">
                    <Ionicons name="warning" size={20} color="white" />
                    <Text className="text-white font-bold ml-2 text-sm flex-1">
                        Trial Expired! Core features are now read-only.
                    </Text>
                </View>
                <TouchableOpacity
                    className="bg-white px-3 py-1.5 rounded-lg"
                    onPress={handleUpgradePress}
                >
                    <Text className="text-red-600 font-bold text-xs uppercase">Upgrade</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View className="bg-orange-500 flex-row items-center px-4 py-3 justify-between">
            <View className="flex-row items-center">
                <Ionicons name="time" size={20} color="white" />
                <Text className="text-white font-bold ml-2 text-sm">
                    Free Trial: {daysRemaining} days remaining
                </Text>
            </View>
            <TouchableOpacity
                className="bg-white/20 px-3 py-1.5 rounded-lg border border-white/40"
                onPress={handleUpgradePress}
            >
                <Text className="text-white font-bold text-xs uppercase">View Plans</Text>
            </TouchableOpacity>
        </View>
    );
};

/**
 * Wrapper component to hide or disable UI elements based on subscription status
 */
export const SubscriptionGate = ({ children, fallbackAction }: { children: React.ReactNode, fallbackAction?: React.ReactNode }) => {
    const { subscriptionStatus } = useAuth();

    // If empty or loading, assume trial just in case to prevent UI flicker
    if (!subscriptionStatus || subscriptionStatus === 'trial' || subscriptionStatus === 'active') {
        return <>{children}</>;
    }

    if (fallbackAction) {
        return <>{fallbackAction}</>;
    }

    // Default: disabled button look
    return (
        <TouchableOpacity
            className="opacity-50"
            onPress={() => Alert.alert("Action Disabled", "This action requires an active subscription. Your trial has expired.")}
            activeOpacity={0.7}
        >
            <View pointerEvents="none">
                {children}
            </View>
        </TouchableOpacity>
    );
}

/**
 * A small "PRO" badge shown next to premium features during the free trial
 */
export const PremiumBadge = () => {
    const { subscriptionStatus } = useAuth();

    // Only highlight premium features during the trial so they know what they're getting for free
    if (subscriptionStatus !== 'trial') return null;

    return (
        <View className="bg-amber-100/20 px-1.5 py-0.5 rounded ml-2 flex-row items-center border border-amber-500/30">
            <Text className="text-amber-500 text-[9px] font-extrabold uppercase tracking-widest">✨ PRO</Text>
        </View>
    );
};

/**
 * Gamified onboarding tracker widget for new Admins
 */
export const OnboardingTracker = ({ stats }: { stats: any[] }) => {
    const { subscriptionStatus, profile } = useAuth();

    // Only show during active trial for Admins
    if (subscriptionStatus !== 'trial' || profile?.role !== 'admin') return null;

    // Derive completion from stats passed in (e.g. from useDashboardStats)
    const hasStudents = parseInt(stats.find(s => s.label === 'Total Students')?.value?.replace(/,/g, '') || '0') > 0;
    const hasSubjects = parseInt(stats.find(s => s.label === 'Subjects')?.value?.replace(/,/g, '') || '0') > 0;
    const hasRevenue = stats.find(s => s.label === 'Revenue')?.value !== 'KES 0';

    const steps = [
        { title: 'Create your first subject', completed: hasSubjects },
        { title: 'Enroll a student', completed: hasStudents },
        { title: 'Process a fee payment', completed: hasRevenue }
    ];

    const completedCount = steps.filter(s => s.completed).length;

    // Hide if fully completed to reduce clutter
    if (completedCount === steps.length) return null;

    const progressPercent = (completedCount / steps.length) * 100;

    return (
        <View className="bg-[#1E293B] rounded-2xl p-4 mb-6 border border-slate-700 shadow-lg">
            <View className="flex-row justify-between items-center mb-3">
                <Text className="text-white font-bold text-lg">🚀 Getting Started</Text>
                <Text className="text-slate-400 text-sm">{completedCount} of {steps.length} completed</Text>
            </View>

            {/* Progress Bar */}
            <View className="h-2 bg-slate-700 rounded-full mb-4 overflow-hidden">
                <View
                    className="h-full bg-blue-500 rounded-full"
                    style={{ width: `${progressPercent}%` }}
                />
            </View>

            {/* Checklist */}
            {steps.map((step, index) => (
                <View key={index} className="flex-row items-center mt-2">
                    <Ionicons
                        name={step.completed ? "checkmark-circle" : "ellipse-outline"}
                        size={20}
                        color={step.completed ? "#10B981" : "#475569"}
                    />
                    <Text className={`ml-3 text-sm ${step.completed ? 'text-slate-400 line-through' : 'text-slate-200 font-medium'}`}>
                        {step.title}
                    </Text>
                </View>
            ))}
        </View>
    );
};
