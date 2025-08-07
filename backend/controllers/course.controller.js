const supabase = require("../utils/supabaseClient");

exports.createCourse = async (req, res) => {
  try {
    const { title, description } = req.body;
    const teacher_id = req.user.id;
    const institution_id = req.institution_id;

    if (req.userRole !== "teacher" && req.userRole !== "admin") {
      return res
        .status(403)
        .json({ error: "Only teachers or admins can create courses" });
    }

    if (!title || !teacher_id) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const { data, error } = await supabase
      .from("courses")
      .insert([{ title, description, teacher_id, institution_id }]);

    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json({ message: "Course created", data });
  } catch (err) {
    console.error("createCourse error:", err);
    res.status(500).json({ error: "Server error" });
  }
};
// exports.getCourses = async (req, res) => {
//   const { institution_id } = req;

//   const { data, error } = await supabase
//     .from("courses")
//     .select("*")
//     .eq("institution_id", institution_id);

//   if (error) return res.status(500).json({ error: error.message });
//   res.json(data);
// };

exports.getCourses = async (req, res) => {
  const { institution_id, user, userRole } = req;
  console.log("getCourses called with:", { institution_id, user, userRole });

  try {
    let courses;
    let error;

    if (userRole === "student") {
      // Step 1: Get course_ids for this student via grades table
      const { data: gradeRows, error: gradeError } = await supabase
        .from("grades")
        .select("course_id")
        .eq("student_id", user.id);

      if (gradeError)
        return res.status(500).json({ error: gradeError.message });

      const courseIds = gradeRows.map((row) => row.course_id);

      // Step 2: Get full course details from course IDs
      const { data, error: courseError } = await supabase
        .from("courses")
        .select("*")
        .in("id", courseIds)
        .eq("institution_id", institution_id);

      courses = data;
      error = courseError;
    } else if (userRole === "teacher") {
      const { data, error: teacherError } = await supabase
        .from("courses")
        .select("*")
        .eq("teacher_id", userId)
        .eq("institution_id", institution_id);

      courses = data;
      error = teacherError;
    } else if (userRole === "admin") {
      const { data, error: adminError } = await supabase
        .from("courses")
        .select("*")
        .eq("institution_id", institution_id);

      courses = data;
      error = adminError;
    } else {
      return res.status(403).json({ error: "Unauthorized role" });
    }

    if (error) return res.status(500).json({ error: error.message });

    res.json(courses);
  } catch (err) {
    console.error("getCourses error:", err);
    res.status(500).json({ error: "Server error" });
  }
};
