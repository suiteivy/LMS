import { useAuth } from '@/contexts/AuthContext';

// ── Plan rank order (mirrors backend subscriptionCheck.js) ──────────────────
// beta=0, trial=1, basic=2, pro=3, premium=4, custom=5
const PLAN_RANK: Record<string, number> = {
    beta: 0,
    trial: 1,
    basic: 2,
    pro: 3,
    premium: 4,
    custom: 5,
};

// Normalise legacy plan IDs to canonical ones
function normalisePlan(plan: string | null | undefined): string {
    const map: Record<string, string> = {
        beta_free: 'beta',
        free: 'beta', // handle plain legacy 'free'
        basic_basic: 'basic',
        basic_pro: 'pro',
        basic_premium: 'premium',
        enterprise_basic: 'custom',
        enterprise_pro: 'custom',
        enterprise_premium: 'custom',
    };
    const p = plan ?? 'trial';
    return map[p] ?? p;
}

function rank(plan: string | null | undefined): number {
    const canonical = normalisePlan(plan);
    return PLAN_RANK[canonical] ?? 1; // default to trial rank
}

export interface SubscriptionTierInfo {
    /** The raw/normalised canonical plan ID e.g. 'free', 'basic' */
    plan: string;
    /** True if the institution is on the beta (master-admin granted) tier */
    isBeta: boolean;
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
    /** Whether this tier includes Attendance */
    hasAttendance: boolean;
    /** Numeric rank — higher = more capable */
    planRank: number;
    /** True if the institution is on a free/beta/trial tier */
    isFree: boolean;
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
        addonDiary,
        addonAttendance
    } = useAuth();

    const canonical = normalisePlan(subscriptionPlan);
    const r = rank(canonical);

    // Feature gates logic (aligned with landing page promises):
    // - PRO (Rank 3): Messaging, Diary, Library.
    // - PREMIUM (Rank 4): Finance, Analytics, Bursary (all add-ons).
    // - CUSTOM (Rank 5): Custom settings.
    // - Specific add-ons always grant access regardless of base plan.

    return {
        plan: canonical,
        isBeta: canonical === 'beta',
        isPaid: r >= PLAN_RANK['basic'],

        // Finance: Included in Premium (4) OR explicitly granted as add-on
        hasFinance: r >= PLAN_RANK['premium'] || addonFinance,

        // Bursary: Included in Premium (4) OR explicitly granted as add-on
        hasBursary: r >= PLAN_RANK['premium'] || addonBursary,

        // Student Module: Always enabled for authenticated students
        hasStudentModule: true,

        // Analytics: Included in Premium (4) OR explicitly granted as add-on
        hasAnalytics: r >= PLAN_RANK['premium'] || addonAnalytics,

        // Messaging: Included in Beta (0)+ OR explicitly granted as add-on
        hasMessaging: r >= PLAN_RANK['beta'] || addonMessaging,

        // Diary: Included in Beta (0)+ OR explicitly granted as add-on
        hasDiary: r >= PLAN_RANK['beta'] || addonDiary,

        // Library: Included in Pro (3)+ OR explicitly granted as add-on
        hasLibrary: r >= PLAN_RANK['pro'] || addonLibrary,

        // Attendance: Included in Pro (3) and Premium (4) OR explicitly granted as add-on
        // Specifically for Custom (5), it's only granted if the addonAttendance flag is set.
        hasAttendance: (r >= PLAN_RANK['pro'] && r !== PLAN_RANK['custom']) || addonAttendance,
        isFree: r < PLAN_RANK['basic'],
        planRank: r,
    };
}
