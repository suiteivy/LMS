import { useAuth } from '@/contexts/AuthContext';

// ── Plan rank order (mirrors backend subscriptionCheck.js) ──────────────────
// free=0, trial=1, basic_basic=2, basic_pro=3, basic_premium=4,
// enterprise_basic=5, enterprise_pro=6, enterprise_premium=7,
// custom_basic=8, custom_pro=9, custom_premium=10
const PLAN_RANK: Record<string, number> = {
    free: 0,
    trial: 1,
    basic_basic: 2,
    basic_pro: 3,
    basic_premium: 4,
    enterprise_basic: 5,
    enterprise_pro: 6,
    enterprise_premium: 7,
    custom_basic: 8,
    custom_pro: 9,
    custom_premium: 10,
};

// Normalise legacy plan IDs to canonical ones (same logic as backend)
function normalisePlan(plan: string | null | undefined): string {
    const map: Record<string, string> = {
        beta_free: 'free',
        basic: 'basic_basic',
        pro: 'basic_pro',
        premium: 'basic_premium',
    };
    return map[plan ?? ''] ?? plan ?? 'trial';
}

function rank(plan: string | null | undefined): number {
    const canonical = normalisePlan(plan);
    return PLAN_RANK[canonical] ?? 1; // default to trial rank
}

export interface SubscriptionTierInfo {
    /** The raw/normalised canonical plan ID e.g. 'free', 'basic_basic' */
    plan: string;
    /** True if the institution is on the free (master-admin granted) tier */
    isFree: boolean;
    /** True if any paid plan (basic_basic and above) */
    isPaid: boolean;
    /** Whether this tier includes the Finance/Bursary module */
    hasFinance: boolean;
    /** Whether this tier includes the full Student module for students to login */
    hasStudentModule: boolean;
    /** Whether this tier includes Analytics */
    hasAnalytics: boolean;
    /** Whether this tier includes full Messaging (without add-on) */
    hasMessaging: boolean;
    /** Whether this tier includes Library (without add-on) */
    hasLibrary: boolean;
    /** Numeric rank — higher = more capable */
    planRank: number;
}

/**
 * Lightweight hook that exposes feature flags derived from the current
 * institution's subscription plan.  Use this to gate UI elements per plan.
 *
 * @example
 * const { isFree, hasFinance } = useSubscriptionTier();
 * if (isFree) { // hide finance tab }
 */
export function useSubscriptionTier(): SubscriptionTierInfo {
    const { subscriptionPlan } = useAuth();
    const canonical = normalisePlan(subscriptionPlan);
    const r = rank(canonical);

    return {
        plan: canonical,
        isFree: canonical === 'free',
        isPaid: r >= PLAN_RANK['basic_basic'],
        hasFinance: r >= PLAN_RANK['basic_pro'],
        hasStudentModule: r >= PLAN_RANK['basic_basic'], // basic_basic and above include student portal
        hasAnalytics: r >= PLAN_RANK['basic_basic'],
        hasMessaging: r >= PLAN_RANK['basic_pro'],       // without add-on; add-on allows messaging on free too
        hasLibrary: r >= PLAN_RANK['basic_basic'],       // without add-on; add-on allows library on free too
        planRank: r,
    };
}
