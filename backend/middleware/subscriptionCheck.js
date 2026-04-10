const supabase = require("../utils/supabaseClient.js");

// In-memory cache to prevent redundant DB calls on every request
const subscriptionCache = new Map();
const CACHE_TTL = 60000; // 60 seconds

// ─── Plan rank helpers ────────────────────────────────────────────────────────
//
// Canonical plan IDs (stored in institutions.subscription_plan):
//   trial | basic_basic | basic_pro | basic_premium
//         | enterprise_basic | enterprise_pro | enterprise_premium
//         | custom_basic | custom_pro | custom_premium
//
// Legacy IDs kept for backward compat: beta_free, basic, pro, premium

const PLAN_ORDER = [
  'beta',
  'trial',
  'basic',
  'pro',
  'premium',
  'custom',
];

// Normalise legacy/shorthand plan IDs to canonical ones
function normalisePlan(plan) {
  const map = {
    'free': 'beta',
    'beta_free': 'beta',
    'beta': 'beta',
    'trial': 'trial',
    'basic': 'basic',
    'basic_basic': 'basic',
    'pro': 'pro',
    'basic_pro': 'pro',
    'premium': 'premium',
    'basic_premium': 'premium',
    'enterprise': 'custom',
    'enterprise_basic': 'custom',
    'enterprise_pro': 'custom',
    'enterprise_premium': 'custom',
    'custom': 'custom',
    'custom_basic': 'custom',
    'custom_pro': 'custom',
    'custom_premium': 'custom',
  };
  const p = plan ? plan.toLowerCase() : 'trial';
  return map[p] || p;
}

// Return a numeric rank (higher = more capable)
function planRank(plan) {
  const idx = PLAN_ORDER.indexOf(normalisePlan(plan));
  return idx === -1 ? 1 : idx; // Default to trial rank (1)
}

// ─── Student / Admin limits ───────────────────────────────────────────────────
const PLAN_LIMITS = {
  'beta': { maxStudents: 30, maxAdmins: 1 },
  'trial': { maxStudents: 50, maxAdmins: 1 },
  'basic': { maxStudents: 900, maxAdmins: 1 },
  'pro': { maxStudents: 1000, maxAdmins: 3 },
  'premium': { maxStudents: 5000, maxAdmins: Infinity },
  'custom': { maxStudents: Infinity, maxAdmins: Infinity },
};

// ─── Feature gate definitions ─────────────────────────────────────────────────
// minPlan is the LOWEST canonical plan ID that unlocks the feature.
const RESTRICTED_FEATURES = [
  // ── Finance Base (Fees, Payments, Transactions) — basic+ (Rank 2) ──
  { path: '/api/finance/fee-structures', minRank: planRank('basic') },
  { path: '/api/finance/fees', minRank: planRank('basic') },
  { path: '/api/finance/transactions', minRank: planRank('basic') },

  // ── Advanced Finance (Funds, Allocations, Budgeting) — premium+ (Rank 4) ──
  { path: '/api/finance/funds', minRank: planRank('premium') },
  { path: '/api/finance/allocations', minRank: planRank('premium') },

  // ── Bursary Module — premium+ (Rank 4) ──
  { path: '/api/bursary', minRank: planRank('premium') },

  // ── Analytics — premium+ (Rank 4) ──
  { path: '/api/analytics', minRank: planRank('premium') },
  { path: '/api/analytics/advanced', minRank: planRank('premium') },

  // ── Custom reports — premium+ (Rank 4) ──
  { path: '/api/reports/custom', minRank: planRank('premium') },

  // ── Branding — premium+ (Rank 4) ──
  { path: '/api/settings/branding', minRank: planRank('premium') },

  // ── Bulk ops — premium+ (Rank 4) ──
  { path: '/api/bulk', minRank: planRank('premium') },

  // ── Library — pro+ (Rank 3) ──
  { path: '/api/library', minRank: planRank('pro') },

  // ── Messaging + Virtual Diary — beta+ (Rank 0) ──
  { path: '/api/messaging', minRank: planRank('beta') },
  { path: '/api/diary', minRank: planRank('beta') },
];

// Write-specific restrictions (POST/PUT/DELETE) on library for basic
const WRITE_RESTRICTED = [
  { path: '/api/library', minRank: planRank('pro') },
];

/**
 * Middleware to check if the user's institution has an active subscription or a valid trial
 */
const checkSubscription = async (req, res, next) => {
  try {
    if (!req.user || !req.institution_id) {
      return next();
    }

    const institutionId = req.institution_id;
    const now = Date.now();
    let institutionData = subscriptionCache.get(institutionId);

    // Fetch/refresh subscription data (with caching)
    if (!institutionData || (now - institutionData.timestamp > CACHE_TTL)) {
      const { data: institution, error: instError } = await supabase
        .from('institutions')
        .select('subscription_status, subscription_plan, trial_end_date, addon_library, addon_messaging, addon_diary, addon_bursary, addon_finance, addon_analytics, custom_student_limit')
        .eq('id', institutionId)
        .single();

      if (instError || !institution) {
        console.error("Subscription check error:", instError || 'Institution not found');
        return res.status(500).json({ error: 'Failed to verify institution subscription status.' });
      }

      const canonicalPlan = normalisePlan(institution.subscription_plan);
      let status = institution.subscription_status;
      const trialEnd = institution.trial_end_date ? new Date(institution.trial_end_date) : null;

      // Auto-expire trial
      if (canonicalPlan === 'trial' && trialEnd && new Date() > trialEnd && status === 'active') {
        status = 'expired';
        supabase.from('institutions').update({ subscription_status: 'expired' }).eq('id', institutionId)
          .catch(err => console.error('Auto-expire update failed:', err));
      }

      let limits = PLAN_LIMITS[canonicalPlan] || PLAN_LIMITS['trial'];
      
      // Override limits for custom plan if specified
      if (canonicalPlan === 'custom' && institution.custom_student_limit !== null && institution.custom_student_limit !== undefined) {
        limits = { ...limits, maxStudents: institution.custom_student_limit };
      }

      // Check Student Counts
      if (limits.maxStudents !== Infinity && status === 'active') {
        const { count: studentCount, error: studentError } = await supabase
          .from('users').select('*', { count: 'exact', head: true })
          .eq('institution_id', institutionId).eq('role', 'student');
        if (!studentError && studentCount > limits.maxStudents) status = 'over_limit';
      }

      // Check Admin Counts
      if (limits.maxAdmins !== Infinity && status === 'active') {
        const { count: adminCount, error: adminError } = await supabase
          .from('users').select('*', { count: 'exact', head: true })
          .eq('institution_id', institutionId).eq('role', 'admin');
        if (!adminError && adminCount > limits.maxAdmins) status = 'over_limit';
      }

      institutionData = {
        data: {
          ...institution,
          subscription_plan: canonicalPlan,
          subscription_status: status,
          maxStudents: limits.maxStudents,
          maxAdmins: limits.maxAdmins,
        },
        timestamp: now
      };
      subscriptionCache.set(institutionId, institutionData);
    }

    const { subscription_status, subscription_plan, addon_library, addon_messaging, addon_diary, addon_bursary, addon_finance, addon_analytics } = institutionData.data;
    const fullPath = req.originalUrl || req.url || '';
    const currentRank = planRank(subscription_plan);

    // ── Feature gating ──────────────────────────────────────────────────────
    for (const feature of RESTRICTED_FEATURES) {
      if (fullPath.includes(feature.path)) {
        // Add-on overrides — each add-on is independently allocated by master admin
        if (feature.path === '/api/library' && addon_library) continue;
        if (feature.path === '/api/messaging' && addon_messaging) continue;
        if (feature.path === '/api/diary' && addon_diary) continue;
        if (feature.path === '/api/bursary' && addon_bursary) continue;        // Bursary is its own add-on
        if ((feature.path === '/api/finance' || feature.path === '/api/funds') && addon_finance) continue;
        if (feature.path.startsWith('/api/analytics') && addon_analytics) continue;

        if (currentRank < feature.minRank) {
          const minPlanLabel = PLAN_ORDER[feature.minRank] || 'higher';
          return res.status(403).json({
            error: `Your current plan (${subscription_plan}) does not include this feature. Please upgrade to ${minPlanLabel} or above.`,
            code: 'PLAN_INSUFFICIENT',
            currentPlan: subscription_plan,
            requiredPlan: PLAN_ORDER[feature.minRank],
          });
        }
        // Write-specific library gating (basic_basic can only read without add-on)
        if (req.method !== 'GET') {
          for (const wf of WRITE_RESTRICTED) {
            if (fullPath.includes(wf.path) && currentRank < wf.minRank && !addon_library) {
              return res.status(403).json({
                error: `Creating/editing library content requires at least ${PLAN_ORDER[wf.minRank]} or the Digital Library add-on.`,
                code: 'PLAN_INSUFFICIENT_WRITE',
              });
            }
          }
        }
        break; // Only check the most specific matching feature
      }
    }

    // ── Expiration / over-limit enforcement (read-only mode) ────────────────
    if (subscription_status === 'expired' || subscription_status === 'cancelled' || subscription_status === 'over_limit') {
      const method = req.method;
      if (method === 'GET') return next();

      const whitelisted = ['/auth/', '/api/submissions', '/api/institutions'];
      if (whitelisted.some(ws => fullPath.includes(ws))) return next();

      return res.status(403).json({
        error: subscription_status === 'over_limit'
          ? 'Your institution has exceeded its plan limits. Writes are restricted. Please upgrade.'
          : 'Your subscription has expired or been cancelled. Access is now read-only.',
        code: subscription_status === 'over_limit' ? 'OVER_LIMIT' : 'SUBSCRIPTION_RESTRICTED',
      });
    }

    req.institutionSubscription = subscription_status;
    req.institutionPlan = subscription_plan;
    next();

  } catch (error) {
    console.error('Subscription Middleware Error:', { message: error.message, path: req.originalUrl });
    return res.status(500).json({ error: 'Internal server error during subscription check.' });
  }
};

module.exports = checkSubscription;
