import React from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { Zap } from 'lucide-react-native';
import { getPlanLabel, getPlanRank, normalisePlan } from '@/services/SubscriptionService';
import { AddonRequestModal } from './AddonRequestModal';
import { useSubscriptionTier } from '@/hooks/useSubscriptionTier';

export { AddonRequestModal };

/**
 * Banner displayed at the top of the dashboard for Admins/Teachers
 */
/**
 * Banner displayed at the top of the dashboard for Admins/Teachers
 */
export const SubscriptionBanner = () => {
    // Persistent bottom banners removed per user request.
    // We only show critical system-wide banners here if any.
    return null;
};

// â”€â”€â”€ Plan Hierarchy (frontend gate) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Mirrors PLAN_RANK in useSubscriptionTier.ts
const PLAN_HIERARCHY: Record<string, number> = {
    'beta': 0,
    'trial': 1,
    'basic': 2,
    'pro': 3,
    'premium': 4,
    'custom': 5,
};


interface SubscriptionGateProps {
    children: React.ReactNode;
    fallback?: React.ReactNode;
    minPlan?: string;
    feature?: 'finance' | 'bursary' | 'analytics' | 'messaging' | 'diary' | 'library' | 'attendance';
    className?: string;
    style?: any;
}


export const AddonRequestButton = ({ onPress, style }: { onPress: () => void; style?: any }) => (
    <TouchableOpacity
        onPress={onPress}
        style={[{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: '#FF6900',
            paddingHorizontal: 16,
            paddingVertical: 10,
            borderRadius: 12,
            gap: 8,
            boxShadow: [{ offsetX: 0, offsetY: 4, blurRadius: 8, color: 'rgba(255, 105, 0, 0.2)' }],
            shadowColor: '#FF6900',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.2,
            shadowRadius: 8,
            elevation: 4
        }, style]}
    >
        <Zap size={16} color="white" />
        <Text style={{ color: 'white', fontWeight: '800', fontSize: 13 }}>Request Feature</Text>
    </TouchableOpacity>
);

/**
 * Wrapper component to hide or disable UI elements based on subscription plan level.
 * Refined to hide features completely to maintain clean layout.
 */
export const SubscriptionGate = ({ children, fallback, minPlan, feature, className, style }: SubscriptionGateProps) => {
    const { subscriptionStatus } = useAuth();
    const tier = useSubscriptionTier();

    const isExpired = subscriptionStatus === 'expired' || subscriptionStatus === 'cancelled' || subscriptionStatus === 'over_limit';
    
    // 1. Check feature-specific gate if provided
    let hasAccess = true;
    if (feature) {
        switch (feature) {
            case 'finance': hasAccess = tier.hasFinance; break;
            case 'bursary': hasAccess = tier.hasBursary; break;
            case 'analytics': hasAccess = tier.hasAnalytics; break;
            case 'messaging': hasAccess = tier.hasMessaging; break;
            case 'diary': hasAccess = tier.hasDiary; break;
            case 'library': hasAccess = tier.hasLibrary; break;
            case 'attendance': hasAccess = tier.hasAttendance; break;
        }
    }

    // 2. Check plan level gate if provided (fallback to true if not provided)
    if (minPlan) {
        const userPlanLevel = tier.planRank;
        const requiredLevel = PLAN_HIERARCHY[normalisePlan(minPlan)] ?? 1;
        if (userPlanLevel < requiredLevel) hasAccess = false;
    }

    if (isExpired || !hasAccess) {
        return fallback ? <>{fallback}</> : null;
    }

    return <>{children}</>;
};

/**
 * Premium Status Badge for the Header
 */
export const SubscriptionStatusBadge = () => {
    const { subscriptionPlan, subscriptionStatus, isTrial, profile } = useAuth();
    const plan = normalisePlan(subscriptionPlan);

    // Hide for non-admins
    if (profile?.role !== 'admin' && profile?.role !== 'master_admin') return null;

    if (subscriptionStatus === 'expired' || subscriptionStatus === 'cancelled') {
        return (
            <View className="bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/20">
                <Text className="text-red-500 text-[10px] font-bold uppercase tracking-wider">Status: Expired</Text>
            </View>
        );
    }

    if (isTrial) {
        return (
            <View className="bg-orange-500/10 px-2 py-0.5 rounded-full border border-orange-500/20">
                <Text className="text-orange-500 text-[10px] font-bold uppercase tracking-wider">Trial Mode</Text>
            </View>
        );
    }

    // Premium/Pro Gradients logic (CSS based for Web, View based for Native)
    const getBadgeStyle = () => {
        const label = getPlanLabel(plan);
        switch (plan) {
            case 'premium':
                return { bg: 'bg-purple-600/10', text: 'text-purple-600', border: 'border-purple-600/20', label: `âœ¨ ${label}` };
            case 'pro':
                return { bg: 'bg-indigo-600/10', text: 'text-indigo-600', border: 'border-indigo-600/20', label };
            case 'custom':
                return { bg: 'bg-blue-600/10', text: 'text-blue-600', border: 'border-blue-600/20', label };
            case 'beta':
                return { bg: 'bg-emerald-600/10', text: 'text-emerald-600', border: 'border-emerald-600/20', label };
            default: return { bg: 'bg-slate-500/10', text: 'text-slate-500', border: 'border-slate-500/20', label };
        }
    };

    const style = getBadgeStyle();

    return (
        <View className={`${style.bg} px-2 py-0.5 rounded-full border ${style.border} items-center justify-center`}>
            <Text className={`${style.text} text-[10px] font-black uppercase tracking-widest`}>
                {style.label}
            </Text>
        </View>
    );
};

/**
 * A small badge shown next to premium features or institution name (Legacy support)
 */
export const SubscriptionBadge = () => <SubscriptionStatusBadge />;

/**
 * A gold badge shown only for the Main Admin of an institution
 */
export const MainAdminBadge = () => {
    const { isMain, profile } = useAuth();

    if (!isMain || profile?.role !== 'admin') return null;

    return (
        <View
            style={{
                boxShadow: [{
                    offsetX: 0,
                    offsetY: 1,
                    blurRadius: 2,
                    color: 'rgba(0, 0, 0, 0.05)',
                }],
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.05,
                shadowRadius: 2,
                elevation: 1,
            }}
            className="bg-amber-100 px-1.5 py-0.5 rounded flex-row items-center border border-amber-300"
        >
            <Ionicons name="star" size={10} color="#92400E" className="mr-1" />
            <Text className="text-amber-800 text-[9px] font-extrabold uppercase tracking-widest">
                Main Admin
            </Text>
        </View>
    );
};

/**
 * Gamified onboarding tracker widget for new Admins
 */
export const OnboardingTracker = ({ stats }: { stats: any[] }) => {
    const { subscriptionStatus, profile } = useAuth();

    if (subscriptionStatus !== 'trial' || profile?.role !== 'admin') return null;

    const hasStudents = parseInt(stats.find(s => s.label === 'Total Students')?.value?.replace(/,/g, '') || '0') > 0;
    const hasSubjects = parseInt(stats.find(s => s.label === 'Subjects')?.value?.replace(/,/g, '') || '0') > 0;
    const hasRevenue = stats.find(s => s.label === 'Revenue')?.value !== 'KES 0';

    const steps = [
        { title: 'Create your first subject', completed: hasSubjects },
        { title: 'Enroll a student', completed: hasStudents },
        { title: 'Process a fee payment', completed: hasRevenue }
    ];

    const completedCount = steps.filter(s => s.completed).length;
    if (completedCount === steps.length) return null;

    const progressPercent = (completedCount / steps.length) * 100;

    return (
        <View 
            style={{
                boxShadow: [{
                    offsetX: 0,
                    offsetY: 10,
                    blurRadius: 15,
                    color: 'rgba(0, 0, 0, 0.3)',
                }],
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 10 },
                shadowOpacity: 0.3,
                shadowRadius: 15,
                elevation: 10,
            }}
            className="bg-[#1E293B] rounded-2xl p-4 mb-6 border border-slate-700"
        >
            <View className="flex-row justify-between items-center mb-3">
                <Text className="text-white font-bold text-lg">ðŸš€ Getting Started</Text>
                <Text className="text-slate-400 text-sm">{completedCount} of {steps.length} completed</Text>
            </View>
            <View className="h-2 bg-slate-700 rounded-full mb-4 overflow-hidden">
                <View className="h-full bg-blue-500 rounded-full" style={{ width: `${progressPercent}%` }} />
            </View>
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

/**
 * Aliases for compatibility with older code
 */
export const TrialBanner = SubscriptionBanner;
export const PremiumBadge = SubscriptionBadge;
