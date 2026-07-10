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

//  Plan Hierarchy (frontend gate) 
// Mirrors PLAN_RANK in useSubscriptionTier.ts
const PLAN_HIERARCHY: Record<string, number> = {
    'beta': 0,
    'basic': 1,
    'pro': 2,
    'premium': 3,
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
    const { subscriptionPlan, subscriptionStatus, profile } = useAuth();
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

    // Premium/Pro Gradients logic (CSS based for Web, View based for Native)
    const getBadgeStyle = () => {
        const label = getPlanLabel(plan);
        switch (plan) {
            case 'premium':
                return { bg: 'bg-purple-600/10', text: 'text-purple-600', border: 'border-purple-600/20', label: `${label}` };
            case 'pro':
                return { bg: 'bg-indigo-600/10', text: 'text-indigo-600', border: 'border-indigo-600/20', label };
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
 * Aliases for compatibility with older code
 */
export const TrialBanner = SubscriptionBanner;
export const PremiumBadge = SubscriptionBadge;
