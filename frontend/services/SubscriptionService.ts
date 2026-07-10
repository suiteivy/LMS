import { useAuth } from '@/contexts/AuthContext';

// ─── Plan order (lowest → highest capability) ────────────────────────────────
export const PLAN_ORDER = [
    'beta',
    'basic',
    'pro',
    'premium',
] as const;

type PlanId = typeof PLAN_ORDER[number] | string;

// Map legacy tiered plan IDs to our new clean canonical ones
const LEGACY_MAP: Record<string, string> = {
    free: 'beta',
    beta_free: 'beta',
    beta: 'beta',
    trial: 'basic',
    basic: 'basic',
    basic_basic: 'basic',
    pro: 'pro',
    basic_pro: 'pro',
    premium: 'premium',
    basic_premium: 'premium',
    enterprise: 'premium',
    enterprise_basic: 'premium',
    enterprise_pro: 'premium',
    enterprise_premium: 'premium',
    custom: 'premium',
    custom_basic: 'premium',
    custom_pro: 'premium',
    custom_premium: 'premium',
};

export function normalisePlan(plan: string | null | undefined): string {
    if (!plan) return 'basic';
    const p = plan.toLowerCase();
    const canonical = LEGACY_MAP[p] || p;
    return PLAN_ORDER.includes(canonical as any) ? canonical : 'basic';
}

export function getPlanRank(plan: string | null | undefined): number {
    const canonical = normalisePlan(plan);
    const idx = PLAN_ORDER.indexOf(canonical as any);
    return idx === -1 ? 1 : idx; // Default to basic rank (1) if unknown
}

// ─── Human-readable labels ────────────────────────────────────────────────────
const PLAN_LABELS: Record<string, string> = {
    beta: 'Beta Access',
    basic: 'Basic',
    pro: 'Pro',
    premium: 'Premium',
};

export function getPlanLabel(plan: string | null | undefined): string {
    return PLAN_LABELS[normalisePlan(plan)] || normalisePlan(plan) || 'Basic';
}

// ─── Tier helpers ─────────────────────────────────────────────────────────────
export function isEnterpriseTier(plan: string | null | undefined): boolean {
    return false;
}

export function isCustomTier(plan: string | null | undefined): boolean {
    return false;
}

// ─── Add-on availability ─────────────────────────────────────────────────────
// Add-ons: Library and Messaging can be purchased separately; they are
// included automatically for plans at or above a certain rank.

const ADDON_MIN_RANKS: Record<string, number> = {
    library: getPlanRank('pro'),   // included in pro+
    messaging: getPlanRank('pro'),   // included in pro+
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
