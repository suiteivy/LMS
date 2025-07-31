const supabase = require("../utils/supabaseClient");

async function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "No token provided" });

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);
  if (error || !user) return res.status(401).json({ error: "Invalid token" });

  // Get institution_id and role
  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("institution_id, role")
    .eq("uid", user.id)
    .single();

  if (profileError) return res.status(403).json({ error: "Unauthorized" });

  req.user = user;
  req.institution_id = profile.institution_id;
  req.userRole = profile.role;

  next();
}

module.exports = { authMiddleware };
