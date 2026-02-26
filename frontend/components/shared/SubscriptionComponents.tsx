import React from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

/**
 * Banner displayed at the top of the dashboard for Admins/Teachers
 */
/**
 * Banner displayed at the top of the dashboard for Admins/Teachers
 */
export const SubscriptionBanner = () => {
    const { subscriptionStatus, subscriptionPlan, trialEndDate, profile } = useAuth();

    if (!profile || (profile.role !== 'admin' && profile.role !== 'teacher')) return null;

    const isExpired = subscriptionStatus === 'expired' || subscriptionStatus === 'cancelled';
    const isTrial = subscriptionStatus === 'trial' || subscriptionPlan === 'trial';

    let daysRemaining = 0;
    if (trialEndDate) {
        const end = new Date(trialEndDate).getTime();
        const now = new Date().getTime();
        daysRemaining = Math.max(0, Math.floor((end - now) / (1000 * 60 * 60 * 24)));
    }

    const handleUpgradePress = () => {
        Alert.alert(
            "Upgrade Subscription",
            "Please contact LMS billing support at billing@cloudora.live to upgrade or renew your institution's subscription."
        );
    };

    if (isExpired) {
        return (
            <View className="bg-red-500 flex-row items-center px-4 py-3 justify-between">
                <View className="flex-row items-center flex-1 pr-2">
                    <Ionicons name="warning" size={20} color="white" />
                    <Text className="text-white font-bold ml-2 text-sm flex-1">
                        Subscription Expired! Access is now read-only.
                    </Text>
                </View>
                <TouchableOpacity
                    className="bg-white px-3 py-1.5 rounded-lg"
                    onPress={handleUpgradePress}
                >
                    <Text className="text-red-600 font-bold text-xs uppercase">Renew</Text>
                </TouchableOpacity>
            </View>
        );
    }

    if (isTrial) {
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
                    <Text className="text-white font-bold text-xs uppercase">Upgrade</Text>
                </TouchableOpacity>
            </View>
        );
    }

    // Active paid plans
    const planColors: Record<string, string> = {
        'basic': 'bg-blue-600',
        'pro': 'bg-indigo-600',
        'premium': 'bg-emerald-600'
    };

    const bgColor = planColors[subscriptionPlan || 'basic'] || 'bg-blue-600';

    return (
        <View className={`${bgColor} flex-row items-center px-4 py-1.5 justify-center`}>
            <Text className="text-white font-bold text-[10px] uppercase tracking-widest opacity-90">
                {subscriptionPlan} INSTITUTION
            </Text>
        </View>
    );
};

interface SubscriptionGateProps {
    children: React.ReactNode;
    fallback?: React.ReactNode;
    minPlan?: 'trial' | 'basic' | 'pro' | 'premium';
}

/**
 * Wrapper component to hide or disable UI elements based on subscription status and plan level
 */
export const SubscriptionGate = ({ children, fallback, minPlan = 'trial' }: SubscriptionGateProps) => {
    const { subscriptionStatus, subscriptionPlan } = useAuth();

    const isExpired = subscriptionStatus === 'expired' || subscriptionStatus === 'cancelled';

    // Check if current plan meets min requirements (Trial < Basic < Pro < Premium)
    const planHierarchy: Record<string, number> = { 'trial': 0, 'basic': 1, 'pro': 2, 'premium': 3 };
    const userPlanLevel = planHierarchy[subscriptionPlan || 'trial'] ?? 0;
    const requiredLevel = planHierarchy[minPlan];

    if (isExpired) {
        if (fallback) return <>{fallback}</>;
        return (
            <TouchableOpacity
                className="opacity-50"
                onPress={() => Alert.alert("Subscription Expired", "This feature is restricted. Please renew your subscription to regain access.")}
                activeOpacity={0.7}
            >
                <View pointerEvents="none">
                    {children}
                </View>
            </TouchableOpacity>
        );
    }

    if (userPlanLevel < requiredLevel) {
        if (fallback) return <>{fallback}</>;
        return (
            <TouchableOpacity
                className="opacity-50"
                onPress={() => Alert.alert("Upgrade Required", `This feature requires a ${minPlan.toUpperCase()} plan. Please upgrade to gain access.`)}
                activeOpacity={0.7}
            >
                <View pointerEvents="none">
                    {children}
                </View>
            </TouchableOpacity>
        );
    }

    return <>{children}</>;
};

/**
 * A small badge shown next to premium features or institution name
 */
export const SubscriptionBadge = () => {
    const { subscriptionStatus, subscriptionPlan } = useAuth();

    if (subscriptionStatus === 'expired' || subscriptionStatus === 'cancelled') {
        return (
            <View className="bg-red-500/20 px-1.5 py-0.5 rounded ml-2 flex-row items-center border border-red-500/30">
                <Text className="text-red-500 text-[9px] font-extrabold uppercase tracking-widest">EXPIRED</Text>
            </View>
        );
    }

    if (subscriptionStatus === 'trial') {
        return (
            <View className="bg-orange-500/20 px-1.5 py-0.5 rounded ml-2 flex-row items-center border border-orange-500/30">
                <Text className="text-orange-500 text-[9px] font-extrabold uppercase tracking-widest">TRIAL</Text>
            </View>
        );
    }

    const planStyles: Record<string, { bg: string, text: string, border: string }> = {
        'basic': { bg: 'bg-blue-500/20', text: 'text-blue-500', border: 'border-blue-500/30' },
        'pro': { bg: 'bg-indigo-500/20', text: 'text-indigo-500', border: 'border-indigo-500/30' },
        'premium': { bg: 'bg-emerald-500/20', text: 'text-emerald-500', border: 'border-emerald-500/30' }
    };

    const style = planStyles[subscriptionPlan || 'basic'] || planStyles.basic;

    return (
        <View className={`${style.bg} px-1.5 py-0.5 rounded ml-2 flex-row items-center border ${style.border}`}>
            <Text className={`${style.text} text-[9px] font-extrabold uppercase tracking-widest`}>
                {subscriptionPlan === 'premium' ? '✨ ' : ''}{subscriptionPlan}
            </Text>
        </View>
    );
};

/**
 * A gold badge shown only for the Master Admin of an institution
 */
export const MasterAdminBadge = () => {
    const { isMaster, profile } = useAuth();

    if (!isMaster || profile?.role !== 'admin') return null;

    return (
        <View
            className="bg-amber-100 px-1.5 py-0.5 rounded ml-2 flex-row items-center border border-amber-300 shadow-sm"
            style={{ elevation: 1 }}
        >
            <Ionicons name="star" size={10} color="#92400E" className="mr-1" />
            <Text className="text-amber-800 text-[9px] font-extrabold uppercase tracking-widest">
                Master Admin
            </Text>
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
