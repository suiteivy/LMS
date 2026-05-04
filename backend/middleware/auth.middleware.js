const supabase = require("../utils/supabaseClient.js");

// Simple in-memory cache for profiles: userId -> { profile, timestamp }
const profileCache = new Map();
const CACHE_TTL = 60000; // 60 seconds

async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : null;

    if (!token) {
      console.warn("[AuthMiddleware] No token provided for:", req.url);
      return res.status(401).json({ error: "No token provided" });
    }

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      console.error(`[AuthMiddleware] Supabase auth error for ${req.url}:`, error?.message || "Invalid user");
      return res.status(401).json({ error: "Invalid token" });
    }

    // --- Demo User Enforcement ---
    // If the user is a demo user, we MUST enforce the 15-minute limit
    // regardless of the global Supabase JWT expiry setting.
    if (user.email && user.email.startsWith('demo.')) {
      const { data: trialSessions, error: trialError } = await supabase
        .from('trial_sessions')
        .select('expires_at')
        .eq('demo_user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);

      const trialSession = trialSessions?.[0];

      if (trialError || !trialSession) {
        console.warn(`[AuthMiddleware] No trial session found for demo user: ${user.id}`);
        return res.status(401).json({ error: "Trial session missing or expired" });
      }

      const expiresAt = new Date(trialSession.expires_at).getTime();
      if (Date.now() > expiresAt) {
        console.log(`[AuthMiddleware] Trial session expired for demo user: ${user.id}`);
        // Clean up if expired
        await supabase.from('trial_sessions').delete().eq('demo_user_id', user.id).catch(() => { });
        return res.status(401).json({ error: "Trial session has expired" });
      }
    }
    // ----------------------------

    // Check cache first
    const cached = profileCache.get(user.id);
    const now = Date.now();
    let profile;

    if (cached && (now - cached.timestamp < CACHE_TTL)) {
      profile = cached.profile;
    } else {
      // Query the extended profile from 'users' table (which includes platform_admins join if applicable)
      const { data: profileData, error: profileError } = await supabase
        .from('users')
        .select('*, admins(id, is_main), platform_admins(id)')
        .eq('id', user.id)
        .single();

      if (profileError || !profileData) {
        console.error(`[AuthMiddleware] Profile fetch error for ${user.id}:`, profileError?.message);
        return res.status(403).json({ error: "Unauthorized" });
      }

      // Determine if platform admin
      let isPlatformAdmin = profileData.role === 'master_admin';

      // Fallback/Legacy check just in case
      if (!isPlatformAdmin && profileData.role === 'admin' && !profileData.institution_id) {
        // The new select statement already includes platform_admins(id)
        if (profileData.platform_admins && profileData.platform_admins.length > 0) {
          isPlatformAdmin = true;
        }
      }

      const isMain = profileData.admins?.[0]?.is_main || false;

      profile = {
        id: profileData.id,
        email: profileData.email,
        institution_id: profileData.institution_id,
        role: profileData.role,
        is_main: isMain,
        isPlatformAdmin: isPlatformAdmin
      };

      // Update cache
      profileCache.set(user.id, { profile, timestamp: now });

      // Periodic cache cleanup (crude)
      if (profileCache.size > 1000) {
        const fiveMinsAgo = now - (300000);
        for (const [key, val] of profileCache.entries()) {
          if (val.timestamp < fiveMinsAgo) profileCache.delete(key);
        }
      }
    }

    // Add user info to request object
    req.user = {
      id: profile.id,
      email: profile.email,
      institution_id: profile.institution_id,
      role: profile.role,
      is_main: profile.is_main || false,
      is_platform_admin: profile.isPlatformAdmin || false
    };

    // Convenience shorthands (ensure always set)
    // Defensive: Convert literal "null" strings to primitive null
    const sanitizeId = (id) => (id === "null" || id === "" ? null : id);

    req.institution_id = sanitizeId(profile.institution_id);
    req.userId = sanitizeId(profile.id);
    req.userRole = profile.role || null;
    req.isMain = req.user.is_main;
    req.isPlatformAdmin = req.user.is_platform_admin;

    // Defensive: fallback if somehow missing
    if (!req.userRole) {
      console.error('[AuthMiddleware] userRole missing for user:', profile.id);
      return res.status(403).json({ error: "User role not found in profile" });
    }

    next();
  } catch (err) {
    console.error("authMiddleware unexpected error:", err);
    return res.status(500).json({ error: "Authorization failed" });
  }
}

module.exports = { authMiddleware };
