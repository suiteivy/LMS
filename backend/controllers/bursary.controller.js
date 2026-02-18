const supabase = require("../utils/supabaseClient");

/** List all bursaries */
exports.listBursaries = async (req, res) => {
  try {
    const { institution_id } = req;
    console.log(`[Bursary] listBursaries for institution: ${institution_id}`);

    if (!institution_id) {
      console.warn(`[Bursary] listBursaries aborted: No institution_id`);
      return res.json([]);
    }

    const { data, error } = await supabase
      .from("bursaries")
      .select(`
                *,
                bursary_applications (id)
            `)
      .eq("institution_id", institution_id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const transformed = data.map(b => ({
      ...b,
      applications_count: b.bursary_applications?.length || 0
    }));

    res.json(transformed);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/** Create a new bursary (Admin) */
exports.createBursary = async (req, res) => {
  try {
    const { title, description, amount, deadline } = req.body;
    const { institution_id } = req;

    if (req.userRole !== "admin" && req.userRole !== "bursary") {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const { data, error } = await supabase
      .from("bursaries")
      .insert([{ title, description, amount, deadline, institution_id, status: 'open' }])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/** Get bursary details with applications (Admin) */
exports.getBursaryDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const { institution_id } = req;

    const { data, error } = await supabase
      .from("bursaries")
      .select(`
                *,
                applications:bursary_applications (
                    *,
                    student:students (
                        id,
                        user:users (full_name, email)
                    )
                )
            `)
      .eq("id", id)
      .eq("institution_id", institution_id)
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/** Apply for a bursary (Student) */
exports.applyForBursary = async (req, res) => {
  try {
    const { bursary_id } = req.body;
    const { userId, institution_id } = req;

    if (req.userRole !== "student") {
      return res.status(403).json({ error: "Students only" });
    }

    // Get student custom ID
    const { data: stuData } = await supabase
      .from("students")
      .select("id")
      .eq("user_id", userId)
      .single();

    if (!stuData) return res.status(404).json({ error: "Student profile not found" });

    const { data, error } = await supabase
      .from("bursary_applications")
      .insert([{ bursary_id, student_id: stuData.id, institution_id, status: 'pending' }])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/** Update application status (Admin) */
exports.updateApplicationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // approved, rejected
    const { institution_id } = req;

    if (req.userRole !== "admin" && req.userRole !== "bursary") {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const { data, error } = await supabase
      .from("bursary_applications")
      .update({ status })
      .eq("id", id)
      .eq("institution_id", institution_id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
