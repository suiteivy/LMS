import { useAuth } from '@/contexts/AuthContext';

// ── Plan rank order (mirrors backend subscriptionCheck.js) ──────────────────
// beta=0, basic=1, pro=2, premium=3
const PLAN_RANK: Record<string, number> = {
    beta: 0,
    basic: 1,
    pro: 2,
    premium: 3,
};

// Normalise legacy plan IDs to canonical ones
function normalisePlan(plan: string | null | undefined): string {
    const map: Record<string, string> = {
        beta_free: 'beta',
        free: 'beta',
        basic_basic: 'basic',
        basic_pro: 'pro',
        basic_premium: 'premium',
        trial: 'basic',
        custom: 'premium',
        enterprise_basic: 'premium',
        enterprise_pro: 'premium',
        enterprise_premium: 'premium',
    };
    const p = (plan ?? 'basic').toLowerCase();
    return map[p] ?? (PLAN_RANK[p] !== undefined ? p : 'basic');
}

function rank(plan: string | null | undefined): number {
    const canonical = normalisePlan(plan);
    return PLAN_RANK[canonical] ?? PLAN_RANK.basic;
}

export interface SubscriptionTierInfo {
    /** The raw/normalised canonical plan ID e.g. 'free', 'basic' */
    plan: string;
    /** True if the institution is on the beta (master-admin granted) tier */
    isBeta: boolean;
    /** True if any paid plan (basic and above) */
    isPaid: boolean;
    /** Whether this tier includes the Bursary add-on */
    hasBursary: boolean;
    /** Whether this tier includes the full Student module for students to login */
    hasStudentModule: boolean;
    /** Whether this tier includes full Messaging (without add-on) */
    hasMessaging: boolean;
    /** Whether this tier includes Class Diary */
    hasDiary: boolean;
    /** Whether this tier includes Library (without add-on) */
    hasLibrary: boolean;
    /** Finance module availability */
    hasFinance: boolean;
    /** Analytics module availability */
    hasAnalytics: boolean;
    /** Attendance module availability */
    hasAttendance: boolean;
    /** Numeric rank — higher = more capable */
    planRank: number;
    /** True if the institution is on a free/beta/trial tier */
    isFree: boolean;
    /** Whether to show financial/revenue/payment UI elements */
    showFinancials: boolean;
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
        addonBursary,
        addonDiary,
    } = useAuth();

    const canonical = normalisePlan(subscriptionPlan);
    const r = rank(canonical);

    // Feature gates logic (aligned with landing page promises):
    // - PRO (Rank 3): Messaging, Diary, Library.
    // - PREMIUM (Rank 4): Finance, Analytics, Bursary (all add-ons).
    // - CUSTOM (Rank 5): Custom settings.
    // - Specific add-ons always grant access regardless of base plan.

    const isBeta = canonical === 'beta';
    const hasAddonOrBeta = (addonEnabled: boolean) => isBeta || !!addonEnabled;

    return {
        plan: canonical,
        isBeta,
        isPaid: true,

        // Bursary: Add-on controlled (beta unaffected)
        hasBursary: hasAddonOrBeta(addonBursary),

        // Student Module: Always enabled for authenticated students
        hasStudentModule: true,

        // Messaging: Add-on controlled (beta unaffected)
        hasMessaging: hasAddonOrBeta(addonMessaging),

        // Diary: Add-on controlled (beta unaffected)
        hasDiary: hasAddonOrBeta(addonDiary),

        // Library: Add-on controlled (beta unaffected)
        hasLibrary: hasAddonOrBeta(addonLibrary),

        // Legacy add-on model removed: these modules are now always available.
        hasFinance: true,
        hasAnalytics: true,
        hasAttendance: true,

        isFree: false,
        planRank: r,
        showFinancials: true,
    };
}
