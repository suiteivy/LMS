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
    .select("id, institution_id, role, full_name, email")
    .eq("id", user.id)
    .single();

  if (profileError) return res.status(403).json({ error: "Unauthorized" });

  // Add user info to request object
  req.user = {
    ...profile,
    id: profile.id // Ensure ID is available for filtering
  };
  req.institution_id = profile.institution_id;
  req.userRole = profile.role;

  next();
}

module.exports = { authMiddleware };
