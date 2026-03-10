import { useAuth } from '@/contexts/AuthContext';

// ── Plan rank order (mirrors backend subscriptionCheck.js) ──────────────────
// free=0, trial=1, standard=2, pro=3, premium=4, custom=5
const PLAN_RANK: Record<string, number> = {
    free: 0,
    trial: 1,
    basic: 2,
    pro: 3,
    premium: 4,
    custom: 5,
};

// Normalise legacy plan IDs to canonical ones
function normalisePlan(plan: string | null | undefined): string {
    const map: Record<string, string> = {
        beta_free: 'free',
        basic_basic: 'basic',
        basic_pro: 'pro',
        basic_premium: 'premium',
    };
    return map[plan ?? ''] ?? plan ?? 'trial';
}

function rank(plan: string | null | undefined): number {
    const canonical = normalisePlan(plan);
    return PLAN_RANK[canonical] ?? 1; // default to trial rank
}

export interface SubscriptionTierInfo {
    /** The raw/normalised canonical plan ID e.g. 'free', 'basic' */
    plan: string;
    /** True if the institution is on the free (master-admin granted) tier */
    isFree: boolean;
    /** True if any paid plan (basic and above) */
    isPaid: boolean;
    /** Whether this tier includes the Finance module */
    hasFinance: boolean;
    /** Whether this tier includes the Bursary add-on */
    hasBursary: boolean;
    /** Whether this tier includes the full Student module for students to login */
    hasStudentModule: boolean;
    /** Whether this tier includes Analytics */
    hasAnalytics: boolean;
    /** Whether this tier includes full Messaging (without add-on) */
    hasMessaging: boolean;
    /** Whether this tier includes Class Diary */
    hasDiary: boolean;
    /** Whether this tier includes Library (without add-on) */
    hasLibrary: boolean;
    /** Numeric rank — higher = more capable */
    planRank: number;
}

/**
 * Lightweight hook that exposes feature flags derived from the current
 * institution's subscription plan and specific add-ons.
 */
export function useSubscriptionTier(): SubscriptionTierInfo {
    const {
        subscriptionPlan,
        addonMessaging,
        addonLibrary,
        addonFinance,
        addonAnalytics,
        addonBursary,
        addonDiary
    } = useAuth();

    const canonical = normalisePlan(subscriptionPlan);
    const r = rank(canonical);

    // Feature gates logic:
    // - Pro (rank 3) includes Library ONLY.
    // - Premium (rank 4) includes Library, Messaging, Finance, and Analytics.
    // - Custom (rank 5) depends entirely on add-on flags.
    // - Specific add-ons always grant access regardless of base plan.

    return {
        plan: canonical,
        isFree: canonical === 'free',
        isPaid: r >= PLAN_RANK['basic'],

        // Finance: Included in Premium (4) OR explicitly granted as add-on
        hasFinance: r === PLAN_RANK['premium'] || addonFinance,

        // Bursary: Independent add-on
        hasBursary: addonBursary,

        // Student Module: Always enabled for authenticated students
        hasStudentModule: true,

        // Analytics: Included in Premium (4) OR explicitly granted as add-on
        hasAnalytics: r === PLAN_RANK['premium'] || addonAnalytics,

        // Messaging: Included in Pro (3) and Premium (4) OR explicitly granted as add-on
        hasMessaging: r >= PLAN_RANK['pro'] || addonMessaging,

        // Diary: Included in Pro (3) and Premium (4) OR explicitly granted as add-on
        hasDiary: r >= PLAN_RANK['pro'] || addonDiary,

        // Library: Included in Basic (2), Pro (3) and Premium (4) OR explicitly granted as add-on
        hasLibrary: r >= PLAN_RANK['basic'] || addonLibrary,

        planRank: r,
    };
}
