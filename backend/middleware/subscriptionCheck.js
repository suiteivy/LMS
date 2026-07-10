const supabase = require("../utils/supabaseClient.js");

// In-memory cache to prevent redundant DB calls on every request
const subscriptionCache = new Map();
const CACHE_TTL = 60000; // 60 seconds

// ─── Plan rank helpers ────────────────────────────────────────────────────────
//
// Canonical plan IDs: beta | basic | pro | premium
// Legacy aliases map into these canonical tiers.

const PLAN_ORDER = [
  'beta',
  'basic',
  'pro',
  'premium',
];

// Normalise legacy/shorthand plan IDs to canonical ones
function normalisePlan(plan) {
  const map = {
    'free': 'beta',
    'beta_free': 'beta',
    'beta': 'beta',
    'basic': 'basic',
    'basic_basic': 'basic',
    'pro': 'pro',
    'basic_pro': 'pro',
    'premium': 'premium',
    'basic_premium': 'premium',
  };
  const p = plan ? plan.toLowerCase() : 'basic';
  return map[p] || 'basic';
}

// Return a numeric rank (higher = more capable)
function planRank(plan) {
  const idx = PLAN_ORDER.indexOf(normalisePlan(plan));
  return idx === -1 ? 1 : idx; // Default to basic rank (1)
}

// ─── Student / Admin limits ───────────────────────────────────────────────────
const PLAN_LIMITS = {
  'beta': { maxStudents: 30, maxAdmins: 2 },
  'basic': { maxStudents: 900, maxAdmins: Infinity },
  'pro': { maxStudents: 1000, maxAdmins: Infinity },
  'premium': { maxStudents: 5000, maxAdmins: Infinity },
};

/**
 * Middleware to check if the user's institution has an active subscription
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
        .select('subscription_status, subscription_plan, addon_library, addon_messaging, addon_diary, addon_bursary, custom_student_limit')
        .eq('id', institutionId)
        .single();

      if (instError || !institution) {
        console.error("Subscription check error:", instError || 'Institution not found');
        return res.status(500).json({ error: 'Failed to verify institution subscription status.' });
      }

      const canonicalPlan = normalisePlan(institution.subscription_plan);
      let status = institution.subscription_status;
      let limits = PLAN_LIMITS[canonicalPlan] || PLAN_LIMITS['basic'];

      // Beta allows custom student limit override where configured.
      if (canonicalPlan === 'beta' && institution.custom_student_limit !== null && institution.custom_student_limit !== undefined) {
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

    const { subscription_status, subscription_plan, addon_library, addon_messaging, addon_diary, addon_bursary } = institutionData.data;
    const fullPath = req.originalUrl || req.url || '';

    // ── Feature gating ──────────────────────────────────────────────────────
    // Add-on-only gates for non-beta institutions.
    // Basic/Pro/Premium are capacity tiers; add-ons are independent feature flags.
    if (subscription_plan !== 'beta') {
      const isLibraryPath = fullPath.includes('/api/library');
      const isMessagingPath = fullPath.includes('/api/messaging') || fullPath.includes('/api/messages');
      const isDiaryPath = fullPath.includes('/api/diary');
      const isBursaryPath = fullPath.includes('/api/bursary');

      if (isLibraryPath && !addon_library) {
        return res.status(403).json({
          error: 'Digital Library add-on is required for this feature.',
          code: 'ADDON_REQUIRED',
          requiredAddon: 'library',
        });
      }

      if (isMessagingPath && !addon_messaging) {
        return res.status(403).json({
          error: 'Messaging + Diary add-on is required for messaging.',
          code: 'ADDON_REQUIRED',
          requiredAddon: 'messaging',
        });
      }

      if (isDiaryPath && !addon_diary) {
        return res.status(403).json({
          error: 'Messaging + Diary add-on is required for diary.',
          code: 'ADDON_REQUIRED',
          requiredAddon: 'diary',
        });
      }

      if (isBursaryPath && !addon_bursary) {
        return res.status(403).json({
          error: 'Bursary add-on is required for this feature.',
          code: 'ADDON_REQUIRED',
          requiredAddon: 'bursary',
        });
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
