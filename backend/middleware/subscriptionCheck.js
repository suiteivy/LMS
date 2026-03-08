const supabase = require("../utils/supabaseClient");

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
  'trial',
  'basic_basic',   // was 'basic'
  'basic_pro',     // was 'pro'
  'basic_premium', // was 'premium'
  'enterprise_basic',
  'enterprise_pro',
  'enterprise_premium',
  'custom_basic',
  'custom_pro',
  'custom_premium',
];

// Normalise legacy/shorthand plan IDs to canonical ones
function normalisePlan(plan) {
  const map = {
    'beta_free': 'basic_basic',
    'basic': 'basic_basic',
    'pro': 'basic_pro',
    'premium': 'basic_premium',
  };
  return map[plan] || plan || 'trial';
}

// Return a numeric rank (higher = more capable)
function planRank(plan) {
  const idx = PLAN_ORDER.indexOf(normalisePlan(plan));
  return idx === -1 ? 0 : idx;
}

// ─── Student / Admin limits ───────────────────────────────────────────────────
const PLAN_LIMITS = {
  'trial': { maxStudents: 50, maxAdmins: 1 },
  'basic_basic': { maxStudents: 200, maxAdmins: 1 },
  'basic_pro': { maxStudents: 500, maxAdmins: 3 },
  'basic_premium': { maxStudents: Infinity, maxAdmins: Infinity },
  'enterprise_basic': { maxStudents: 2000, maxAdmins: 5 },
  'enterprise_pro': { maxStudents: 5000, maxAdmins: 15 },
  'enterprise_premium': { maxStudents: Infinity, maxAdmins: Infinity },
  'custom_basic': { maxStudents: Infinity, maxAdmins: Infinity },
  'custom_pro': { maxStudents: Infinity, maxAdmins: Infinity },
  'custom_premium': { maxStudents: Infinity, maxAdmins: Infinity },
};

// ─── Feature gate definitions ─────────────────────────────────────────────────
// minPlan is the LOWEST canonical plan ID that unlocks the feature.
// enterprise_basic ranks 4, basic_pro ranks 2 — finance is available to both.
const RESTRICTED_FEATURES = [
  // Finance & Bursary require at least basic_pro OR enterprise_basic
  // We use a custom resolver for these to handle the "enterprise gets it cheaper" logic.
  { path: '/api/finance', minRank: planRank('basic_pro') },
  { path: '/api/bursary', minRank: planRank('basic_pro') },

  // Analytics — at least basic_basic
  { path: '/api/analytics', minRank: planRank('basic_basic') },
  { path: '/api/analytics/advanced', minRank: planRank('basic_pro') },

  // Custom reports — basic_premium+
  { path: '/api/reports/custom', minRank: planRank('basic_premium') },

  // Branding — basic_premium+
  { path: '/api/settings/branding', minRank: planRank('basic_premium') },

  // Bulk ops — basic_premium+
  { path: '/api/bulk', minRank: planRank('basic_premium') },

  // ── Add-ons (all tiers need explicit add-on purchase or enterprise/custom plan) ──
  // Library is included from enterprise_basic onward; lower tiers need add-on.
  { path: '/api/library', minRank: planRank('basic_basic') },   // basic_basic gets read; write gated below via WRITE_FEATURES
  // Messaging add-on – enterprise_basic or higher, or basic_premium+
  { path: '/api/messaging', minRank: planRank('basic_pro') },
];

// Write-specific restrictions (POST/PUT/DELETE) on library for basic_basic
const WRITE_RESTRICTED = [
  { path: '/api/library', minRank: planRank('basic_pro') },
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
        .select('subscription_status, subscription_plan, trial_end_date, addon_library, addon_messaging, addon_finance, addon_analytics')
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

      const limits = PLAN_LIMITS[canonicalPlan] || PLAN_LIMITS['trial'];

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

    const { subscription_status, subscription_plan, addon_library, addon_messaging, addon_finance, addon_analytics } = institutionData.data;
    const fullPath = req.originalUrl || req.url || '';
    const currentRank = planRank(subscription_plan);

    // ── Feature gating ──────────────────────────────────────────────────────
    for (const feature of RESTRICTED_FEATURES) {
      if (fullPath.includes(feature.path)) {
        // Special Add-on Checks
        if (feature.path === '/api/library' && addon_library) continue;
        if (feature.path === '/api/messaging' && addon_messaging) continue;
        if ((feature.path === '/api/finance' || feature.path === '/api/bursary') && addon_finance) continue;
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
