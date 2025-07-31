const supabase = require("../utils/supabaseClient");

exports.createCourse = async (req, res) => {
  const { title, description, teacher_id } = req.body;
  const { institution_id } = req;

  if (!title || !teacher_id) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const { data, error } = await supabase
    .from("courses")
    .insert([{ title, description, teacher_id, institution_id }]);

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json({ message: "Course created", data });
};

exports.getCourses = async (req, res) => {
  const { institution_id } = req;

  const { data, error } = await supabase
    .from("courses")
    .select("*")
    .eq("institution_id", institution_id);

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
};
