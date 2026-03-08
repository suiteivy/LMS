import { useAuth } from '@/contexts/AuthContext';

// ─── Plan order (lowest → highest capability) ────────────────────────────────
export const PLAN_ORDER = [
    'trial',
    'basic_basic',
    'basic_pro',
    'basic_premium',
    'enterprise_basic',
    'enterprise_pro',
    'enterprise_premium',
    'custom_basic',
    'custom_pro',
    'custom_premium',
] as const;

type PlanId = typeof PLAN_ORDER[number] | string;

// Legacy plan normalisation (for data migrated before the tier rename)
const LEGACY_MAP: Record<string, string> = {
    beta_free: 'basic_basic',
    basic: 'basic_basic',
    pro: 'basic_pro',
    premium: 'basic_premium',
};

export function normalisePlan(plan: string | null | undefined): string {
    if (!plan) return 'trial';
    return LEGACY_MAP[plan] || plan;
}

export function getPlanRank(plan: string | null | undefined): number {
    const canonical = normalisePlan(plan);
    const idx = PLAN_ORDER.indexOf(canonical as any);
    return idx === -1 ? 0 : idx;
}

// ─── Human-readable labels ────────────────────────────────────────────────────
const PLAN_LABELS: Record<string, string> = {
    trial: 'Free Trial',
    basic_basic: 'Basic',
    basic_pro: 'Basic Pro',
    basic_premium: 'Basic Premium',
    enterprise_basic: 'Enterprise Basic',
    enterprise_pro: 'Enterprise Pro',
    enterprise_premium: 'Enterprise Premium',
    custom_basic: 'Custom Basic',
    custom_pro: 'Custom Pro',
    custom_premium: 'Custom Premium',
};

export function getPlanLabel(plan: string | null | undefined): string {
    return PLAN_LABELS[normalisePlan(plan)] || normalisePlan(plan) || 'Trial';
}

// ─── Tier helpers ─────────────────────────────────────────────────────────────
export function isEnterpriseTier(plan: string | null | undefined): boolean {
    return normalisePlan(plan).startsWith('enterprise_');
}

export function isCustomTier(plan: string | null | undefined): boolean {
    return normalisePlan(plan).startsWith('custom_');
}

// ─── Add-on availability ─────────────────────────────────────────────────────
// Add-ons: Library and Messaging can be purchased separately; they are
// included automatically for plans at or above a certain rank.

const ADDON_MIN_RANKS: Record<string, number> = {
    library: getPlanRank('basic_basic'),   // read-only from basic_basic; write from basic_pro
    messaging: getPlanRank('basic_pro'),     // full messaging from basic_pro+
};

/**
 * Returns true if the plan includes the named add-on by default,
 * OR if `addonsEnabled` is passed and contains the add-on key.
 */
export function isAddonEnabled(
    plan: string | null | undefined,
    addon: 'library' | 'messaging',
    addonsEnabled: string[] = [],
): boolean {
    if (addonsEnabled.includes(addon)) return true;
    const rank = getPlanRank(plan);
    return rank >= (ADDON_MIN_RANKS[addon] ?? Infinity);
}

// ─── Subscription gate helper (useSubscriptionGate hook) ─────────────────────
export function usePlanAccess() {
    const { subscriptionPlan, subscriptionStatus } = useAuth();

    const isExpired = subscriptionStatus === 'expired' || subscriptionStatus === 'cancelled';
    const rank = getPlanRank(subscriptionPlan);

    return {
        plan: normalisePlan(subscriptionPlan),
        label: getPlanLabel(subscriptionPlan),
        rank,
        isExpired,
        hasAccess: (minPlan: PlanId) => !isExpired && rank >= getPlanRank(minPlan),
        hasAddon: (addon: 'library' | 'messaging') => isAddonEnabled(subscriptionPlan, addon),
    };
}
