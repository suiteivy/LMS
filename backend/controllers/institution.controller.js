const supabase = require("../utils/supabaseClient");

exports.createInstitution = async (req, res) => {
  // Only admins can create institutions
  if (req.userRole !== "admin") {
    return res
      .status(403)
      .json({ error: "Only admins can create institutions" });
  }

  const { name, location } = req.body;
  if (!name)
    return res.status(400).json({ error: "Institution name is required" });

  const { data, error } = await supabase
    .from("institutions")
    .insert([{ name, location }])
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json({ message: "Institution created", institution: data });
};

exports.getInstitutions = async (req, res) => {
  const { data, error } = await supabase.from("institutions").select("*");

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
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
