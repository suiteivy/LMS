const supabase = require("../utils/supabaseClient");

exports.createInstitution = async (req, res) => {
  // Only admins can create institutions
  if (req.userRole !== "admin") {
    return res
      .status(403)
      .json({ error: "Only admins can create institutions" });
  }

  const { name, location, email, plan = 'trial' } = req.body;
  if (!name)
    return res.status(400).json({ error: "Institution name is required" });

  // One-time trial enforcement: Check if an institution with this name OR email has already used a trial
  if (plan === 'trial') {
    if (!email) return res.status(400).json({ error: "Email is required for free trial signup" });

    const { data: existing, error: checkError } = await supabase
      .from('institutions')
      .select('has_used_trial')
      .or(`name.ilike.${name},email.eq.${email}`)
      .eq('has_used_trial', true)
      .maybeSingle();

    if (existing) {
      return res.status(403).json({
        error: "This institution or client has already utilized its one-time free trial.",
        code: "TRIAL_ALREADY_USED"
      });
    }
  }

  const subscription_status = plan === 'trial' ? 'trial' : 'active';
  const trial_end_date = plan === 'trial' ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() : null;

  const { data, error } = await supabase
    .from("institutions")
    .insert([{
      name,
      location,
      email: email || null,
      subscription_plan: plan,
      subscription_status,
      has_used_trial: plan === 'trial',
      trial_start_date: plan === 'trial' ? new Date().toISOString() : null,
      trial_end_date
    }])
    .select()
    .single();

  if (error) {
    console.error("Institution creation error:", error);
    return res.status(500).json({ error: error.message });
  }
  res.status(201).json({ message: "Institution created successfully", institution: data });
};

exports.getInstitutions = async (req, res) => {
  const { data, error } = await supabase.from("institutions").select("*").order('name');

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
};

exports.getInstitutionDetails = async (req, res) => {
  try {
    const { institution_id } = req;
    if (!institution_id) return res.json(null); // Return null instead of error

    const { data, error } = await supabase
      .from("institutions")
      .select("*")
      .eq("id", institution_id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return res.json(null); // Not found
      throw error;
    }
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateInstitution = async (req, res) => {
  try {
    const { institution_id, userRole } = req;
    if (userRole !== 'admin') return res.status(403).json({ error: "Unauthorized" });

    // Allow specifying an ID in params if super-admin, but usually scoped to current user's institution
    const targetId = req.params.id || institution_id;
    if (!targetId) return res.status(400).json({ error: "Target institution ID required" });

    const { name, location, phone, email, type, principal_name } = req.body;

    // We allow name to be NOT NULL, but others are nullable.
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (location !== undefined) updates.location = location;
    if (phone !== undefined) updates.phone = phone;
    if (email !== undefined) updates.email = email;
    if (type !== undefined) updates.type = type;
    if (principal_name !== undefined) updates.principal_name = principal_name;

    const { data, error } = await supabase
      .from("institutions")
      .update(updates)
      .eq("id", targetId)
      .select()
      .single();

    if (error) throw error;
    res.json({ message: "Institution updated", institution: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getClasses = async (req, res) => {
  try {
    // Assuming middleware attaches institution_id
    const { institution_id } = req;
    // If no institution_id in req (e.g. superadmin?), maybe fetch all? 
    // But typically we want for specific institution.

    let query = supabase.from("classes").select("*");
    if (institution_id) {
      query = query.eq("institution_id", institution_id);
    }

    const { data, error } = await query;
    if (error) throw error;
    res.json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
