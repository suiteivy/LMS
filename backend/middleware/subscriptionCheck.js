const supabase = require("../utils/supabaseClient");

// In-memory cache to prevent redundant DB calls on every request
// instId -> { data, timestamp }
const subscriptionCache = new Map();
const CACHE_TTL = 60000; // 60 seconds

/**
 * Middleware to check if the user's institution has an active subscription or a valid trial
 */
const checkSubscription = async (req, res, next) => {
  try {
    // 1. Validate Context: req.user and req.institution_id should be populated by authMiddleware
    if (!req.user || !req.institution_id) {
      // console.warn("[SubscriptionCheck] Auth context missing. If this is a public route, middleware order might be wrong.");
      // If we don't have an institution_id, we can't check subscription. 
      // For floating users/super-admins, we allow them through.
      return next();
    }

    const institutionId = req.institution_id;
    const now = Date.now();
    let institutionData = subscriptionCache.get(institutionId);

    // 2. Fetch/Refresh Subscription Data (with caching)
    if (!institutionData || (now - institutionData.timestamp > CACHE_TTL)) {
      const { data: institution, error: instError } = await supabase
        .from('institutions')
        .select('subscription_status, subscription_plan, trial_end_date')
        .eq('id', institutionId)
        .single();

      if (instError || !institution) {
        console.error("Subscription check error (institution):", instError || 'Institution not found');
        return res.status(500).json({ error: 'Failed to verify institution subscription status.' });
      }

      // Check Trial status and Auto-expire if needed
      let status = institution.subscription_status;
      const trialEnd = institution.trial_end_date ? new Date(institution.trial_end_date) : null;

      // If on a trial plan and the trial has ended, set status to expired
      if (institution.subscription_plan === 'trial' && trialEnd && new Date() > trialEnd && status === 'active') {
        status = 'expired';
        // Fire-and-forget update
        supabase.from('institutions').update({ subscription_status: 'expired' }).eq('id', institutionId).catch(err => console.error('Auto-expire update failed:', err));
      }

      // Check Plan Limits (Students & Admins)
      const planLimits = {
        'trial': { maxStudents: 50, maxAdmins: 1 },
        'basic': { maxStudents: 500, maxAdmins: 2 },
        'pro': { maxStudents: 1000, maxAdmins: 5 },
        'premium': { maxStudents: Infinity, maxAdmins: Infinity }
      };

      const limits = planLimits[institution.subscription_plan] || planLimits['trial'];
      const maxStudents = limits.maxStudents;
      const maxAdmins = limits.maxAdmins;

      // Check Student Counts
      if (maxStudents !== Infinity && status === 'active') {
        const { count: studentCount, error: studentError } = await supabase
          .from('users')
          .select('*', { count: 'exact', head: true })
          .eq('institution_id', institutionId)
          .eq('role', 'student');

        if (!studentError && studentCount > maxStudents) {
          status = 'expired';
        }
      }

      // Check Admin Counts
      if (maxAdmins !== Infinity && status === 'active') {
        const { count: adminCount, error: adminError } = await supabase
          .from('users')
          .select('*', { count: 'exact', head: true })
          .eq('institution_id', institutionId)
          .eq('role', 'admin');

        if (!adminError && adminCount > maxAdmins) {
          status = 'expired';
        }
      }

      institutionData = {
        data: {
          ...institution,
          subscription_status: status,
          maxStudents
        },
        timestamp: now
      };
      subscriptionCache.set(institutionId, institutionData);
    }

    const { subscription_status, subscription_plan } = institutionData.data;

    // 3. Evaluate Feature Gating (Using originalUrl to handle sub-routers correctly)
    const fullPath = req.originalUrl || req.url || '';

    const restrictedFeatures = [
      { path: '/api/finance', minPlan: 'pro' },
      { path: '/api/bursary', minPlan: 'pro' },
      { path: '/api/analytics', minPlan: 'basic' },
      { path: '/api/analytics/advanced', minPlan: 'pro' },
      { path: '/api/reports/custom', minPlan: 'premium' },
      { path: '/api/settings/branding', minPlan: 'premium' },
      { path: '/api/bulk', minPlan: 'premium' }
    ];

    const currentPlan = subscription_plan || 'trial';
    const planOrder = ['trial', 'basic', 'pro', 'premium'];
    const currentPlanRank = planOrder.indexOf(currentPlan);

    for (const feature of restrictedFeatures) {
      if (fullPath.includes(feature.path)) {
        const minPlanRank = planOrder.indexOf(feature.minPlan);
        if (currentPlanRank < minPlanRank) {
          return res.status(403).json({
            error: `Your current plan (${currentPlan.toUpperCase()}) does not include access to this feature. Please upgrade to ${feature.minPlan.toUpperCase()}.`,
            code: 'PLAN_INSUFFICIENT'
          });
        }
      }
    }

    // 4. Enforce Expiration Limits (Read-Only mode)
    if (subscription_status === 'expired' || subscription_status === 'cancelled') {
      const method = req.method;

      // Allow GET requests (Read-Only)
      if (method === 'GET') {
        return next();
      }

      // Whitelist routes that should NEVER be blocked (auth, logout, etc.)
      const whitelistedSubstrings = [
        '/auth/',
        '/api/submissions',
        '/api/institutions'
      ];

      const isWhitelisted = whitelistedSubstrings.some(ws => fullPath.includes(ws));

      if (!isWhitelisted) {
        return res.status(403).json({
          error: 'Your institution\'s subscription has expired or is over the limit. Access is now Read-Only.',
          code: 'SUBSCRIPTION_RESTRICTED'
        });
      }
    }

    // Success: Append status to request and proceed
    req.institutionSubscription = subscription_status;
    next();

  } catch (error) {
    console.error('Subscription Middleware Error Details:', {
      message: error.message,
      stack: error.stack,
      path: req.originalUrl,
      instId: req.institution_id
    });
    return res.status(500).json({ error: 'Internal server error during subscription check.' });
  }
};

module.exports = checkSubscription;

