const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Middleware to check if the user's institution has an active subscription or a valid trial
 */
const checkSubscription = async (req, res, next) => {
  try {
    const userId = req.user.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized: User not found in request context.' });
    }

    // 1. Fetch the user's institution ID
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('institution_id')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      console.error("Subscription check error (user):", userError);
      return res.status(500).json({ error: 'Failed to fetch user institution.' });
    }

    if (!user.institution_id) {
      // Super admins or floating users might not have an institution. 
      // Depending on LMS rules, we could allow or block. Let's allow for now to prevent breaking core system.
      return next();
    }

    // 2. Fetch the institution's subscription details
    const { data: institution, error: instError } = await supabase
      .from('institutions')
      .select('subscription_status, subscription_plan, trial_end_date')
      .eq('id', user.institution_id)
      .single();

    if (instError || !institution) {
      console.error("Subscription check error (institution):", instError);
      return res.status(500).json({ error: 'Failed to fetch institution subscription details.' });
    }

    // 3. Evaluate Trial Expiration
    let { subscription_status, trial_end_date } = institution;

    const now = new Date();
    const trialEnd = new Date(trial_end_date);

    // Auto-expire trials
    if (subscription_status === 'trial' && now > trialEnd) {
      subscription_status = 'expired';

      // Fire-and-forget update to Postgres so we dont do this on every request
      supabase.from('institutions').update({ subscription_status: 'expired' }).eq('id', user.institution_id).then();
    }

    // Evaluate Student Limits based on Plan
    const planLimits = {
      'trial': 50,
      'basic': 500,
      'pro': 1000,
      'premium': Infinity
    };

    const maxStudents = planLimits[institution.subscription_plan] || 50;

    if (maxStudents !== Infinity && (subscription_status === 'active' || subscription_status === 'trial')) {
      const { count: studentCount } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('institution_id', user.institution_id)
        .eq('role', 'student');

      if (studentCount > maxStudents) {
        subscription_status = 'expired'; // Or 'over_limit' if we had that status
      }
    }

    // Evaluate Feature Gating
    const path = req.path;
    const method = req.method;

    const restrictedFeatures = [
      { path: '/api/finance', minPlan: 'pro' },
      { path: '/api/bursary', minPlan: 'pro' },
      { path: '/api/analytics', minPlan: 'basic' }, // Basic analytics allowed
      { path: '/api/analytics/advanced', minPlan: 'pro' },
      { path: '/api/reports/custom', minPlan: 'premium' },
      { path: '/api/settings/branding', minPlan: 'premium' },
      { path: '/api/bulk', minPlan: 'premium' }
    ];

    const currentPlan = institution.subscription_plan || 'trial';
    const planOrder = ['trial', 'basic', 'pro', 'premium'];
    const currentPlanRank = planOrder.indexOf(currentPlan);

    for (const feature of restrictedFeatures) {
      if (path.includes(feature.path)) {
        const minPlanRank = planOrder.indexOf(feature.minPlan);
        if (currentPlanRank < minPlanRank) {
          return res.status(403).json({
            error: `Your current plan (${currentPlan.toUpperCase()}) does not include access to this feature. Please upgrade to ${feature.minPlan.toUpperCase()}.`,
            code: 'PLAN_INSUFFICIENT'
          });
        }
      }
    }

    // 4. Enforce Limits
    if (subscription_status === 'expired' || subscription_status === 'cancelled') {
      const path = req.path;
      const method = req.method;

      // Allow GET requests (Read-Only)
      if (method === 'GET') {
        return next();
      }

      // Define which routes are EXPLICITLY allowed even during expired state
      // For example: submissions, grading
      const allowedExpiredRoutes = [
        '/auth/login',
        '/auth/logout',
        '/api/submissions', // Assuming students can submit
      ];

      // If the route is not in the allowed list, block it
      const isAllowed = allowedExpiredRoutes.some(allowed => path.includes(allowed));

      if (!isAllowed) {
        return res.status(403).json({
          error: 'Your institution\'s subscription has expired or is over the student limit. Access is now Read-Only.',
          code: 'SUBSCRIPTION_RESTRICTED'
        });
      }
    }

    // If active or valid trial, append status to request for later use and proceed
    req.institutionSubscription = subscription_status;
    next();

  } catch (error) {
    console.error('Subscription Middleware Error:', error);
    return res.status(500).json({ error: 'Internal server error during subscription check.' });
  }
};

module.exports = checkSubscription;
