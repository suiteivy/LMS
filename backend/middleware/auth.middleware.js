const supabase = require("../utils/supabaseClient");

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

    // Check cache first
    const cached = profileCache.get(user.id);
    const now = Date.now();
    let profile;

    if (cached && (now - cached.timestamp < CACHE_TTL)) {
      profile = cached.profile;
    } else {
      // Get institution_id and role from profile table
      const { data, error: profileError } = await supabase
        .from("users")
        .select("id, institution_id, role")
        .eq("id", user.id)
        .single();

      if (profileError || !data) {
        console.error(`[AuthMiddleware] Profile fetch error for ${user.id}:`, profileError?.message);
        return res.status(403).json({ error: "Unauthorized" });
      }

      profile = data;
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
      institution_id: profile.institution_id,
      role: profile.role,
    };

    // Convenience shorthands (ensure always set)
    req.institution_id = profile.institution_id || null;
    req.userId = profile.id || null;
    req.userRole = profile.role || null;

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
