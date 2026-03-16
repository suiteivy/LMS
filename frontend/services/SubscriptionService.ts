import { useAuth } from '@/contexts/AuthContext';

// ─── Plan order (lowest → highest capability) ────────────────────────────────
export const PLAN_ORDER = [
    'free',
    'trial',
    'basic',
    'pro',
    'premium',
    'custom',
] as const;

type PlanId = typeof PLAN_ORDER[number] | string;

// Map legacy tiered plan IDs to our new clean canonical ones
const LEGACY_MAP: Record<string, string> = {
    free: 'free',
    beta_free: 'free',
    trial: 'trial',
    basic: 'basic',
    basic_basic: 'basic',
    pro: 'pro',
    basic_pro: 'pro',
    premium: 'premium',
    basic_premium: 'premium',
    enterprise: 'custom',
    enterprise_basic: 'custom',
    enterprise_pro: 'custom',
    enterprise_premium: 'custom',
    custom: 'custom',
    custom_basic: 'custom',
    custom_pro: 'custom',
    custom_premium: 'custom',
};

export function normalisePlan(plan: string | null | undefined): string {
    if (!plan) return 'trial';
    const p = plan.toLowerCase();
    return LEGACY_MAP[p] || p;
}

export function getPlanRank(plan: string | null | undefined): number {
    const canonical = normalisePlan(plan);
    const idx = PLAN_ORDER.indexOf(canonical as any);
    return idx === -1 ? 1 : idx; // Default to trial rank (1) if unknown
}

// ─── Human-readable labels ────────────────────────────────────────────────────
const PLAN_LABELS: Record<string, string> = {
    free: 'Free Access',
    trial: 'Free Trial',
    basic: 'Basic',
    pro: 'Pro',
    premium: 'Premium',
    custom: 'Custom',
};

export function getPlanLabel(plan: string | null | undefined): string {
    return PLAN_LABELS[normalisePlan(plan)] || normalisePlan(plan) || 'Trial';
}

// ─── Tier helpers ─────────────────────────────────────────────────────────────
export function isEnterpriseTier(plan: string | null | undefined): boolean {
    return normalisePlan(plan) === 'custom';
}

export function isCustomTier(plan: string | null | undefined): boolean {
    return normalisePlan(plan) === 'custom';
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
