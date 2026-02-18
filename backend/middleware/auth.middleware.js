const supabase = require("../utils/supabaseClient");

async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : null;

    // console.log("Auth middleware called with token:", token ? "[REDACTED]" : "null");

    if (!token) {
      return res.status(401).json({ error: "No token provided" });
    }

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      // Reduced logging for standard auth failures to minimize noise
      // console.error("Supabase auth error:", error);
      return res.status(401).json({ error: "Invalid token" });
    }

    // Get institution_id and role (and id for convenience) from profile table
    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("id, institution_id, role")
      .eq("id", user.id)
      .single();

    // console.log("User profile:", profile, profileError);

    if (profileError || !profile) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    // Add user info to request object in a consistent shape
    req.user = {
      id: profile.id || user.id,
      institution_id: profile.institution_id,
      role: profile.role,
    };

    // Convenience shorthands used throughout controllers
    req.institution_id = profile.institution_id;
    req.userId = profile.id || user.id;
    req.userRole = profile.role;

    next();
  } catch (err) {
    console.error("authMiddleware unexpected error:", err);
    return res.status(500).json({ error: "Authorization failed" });
  }
}

module.exports = { authMiddleware };
