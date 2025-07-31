const supabase = require("../utils/supabaseClient");

exports.createInstitution = async (req, res) => {
  // Only admins can create institutions
  if (req.userRole !== "admin") {
    return res
      .status(403)
      .json({ error: "Only admins can create institutions" });
  }

  const { name, domain } = req.body;
  if (!name)
    return res.status(400).json({ error: "Institution name is required" });

  const { data, error } = await supabase
    .from("institutions")
    .insert([{ name, domain }])
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
