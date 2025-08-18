const supabase = require("../utils/supabaseClient");
const { hasPaidAtLeastHalf } = require("../utils/feeUtils");


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

exports.enrollInCourse = async (req, res) => {
  try {
    const { course_id } = req.body;
    const student_id = req.user.id;

    // Check if the user is a student
    if (req.userRole !== "student") {
      return res.status(403).json({ error: "Only students can enroll in courses" });
    }

    // Check 50% fee threshold
    const eligible = await hasPaidAtLeastHalf(student_id, course_id);

    if (!eligible) {
      return res.status(403).json({
        error: "You must pay at least 50% of the course fee to enroll",
      });
    }

    // Enroll the student
    const { error } = await supabase
      .from("grades")
      .insert([{ student_id, course_id }]);

    if (error) throw error;

    res.status(200).json({ message: "Enrolled successfully" });
  } catch (err) {
    console.error("enrollInCourse error:", err);
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
        .eq("teacher_id", user.id)
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

// getCourseById
exports.getCourseById = async (req, res) => {
  const { id } = req.params;
  const { userRole, institution_id } = req;

  try {
    // Fetch course details
    const { data: course, error: courseError } = await supabase
      .from("courses")
      .select("*")
      .eq("id", id)
      .eq("institution_id", institution_id)
      .single();

    if (courseError) return res.status(404).json({ error: "Course not found" });

    // Role-based access control
    if (
      (userRole === "student" && !course.students?.includes(req.user.id)) ||
      (userRole === "teacher" && course.teacher_id !== req.user.id) ||
      (userRole !== "admin" && userRole !== "teacher" && userRole !== "student")
    ) {
      return res.status(403).json({ error: "Unauthorized access to course" });
    }

    res.json(course);
  } catch (err) {
    console.error("getCourseById error:", err);
    res.status(500).json({ error: "Server error" });
  }
};
