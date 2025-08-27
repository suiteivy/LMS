const supabase = require("../utils/supabaseClient");
const { hasPaidAtLeastHalf } = require("../utils/feeUtils");

// CREATE COURSE
exports.createCourse = async (req, res) => {
  try {
    const { title, description, fee_amount, teacher_id } = req.body;
    let teacherId;
    const institution_id = req.institution_id;

    if (req.userRole !== "teacher" && req.userRole !== "admin") {
      return res
        .status(403)
        .json({ error: "Only teachers or admins can create courses" });
    }

    if (req.userRole === "teacher") {
      teacherId = req.userId;
    }
    if (req.userRole === "admin") {
      teacherId = teacher_id;
    }

    if (!title || !teacherId || !fee_amount) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const { data, error } = await supabase.from("courses").insert([
      {
        title,
        description,
        fee_amount,
        teacher_id: teacherId,
        institution_id,
      },
    ]);

    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json({ message: "Course created", data });
  } catch (err) {
    console.error("createCourse error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

//  ENROLL STUDENT WITH 50% PAYMENT CHECK
exports.enrollStudentInCourse = async (req, res) => {
  try {
    const { course_id } = req.body;
    const student_id = req.user.id;

    if (req.userRole !== "student") {
      return res
        .status(403)
        .json({ error: "Only students can enroll in courses" });
    }

    const eligible = await hasPaidAtLeastHalf(student_id, course_id);

    if (!eligible) {
      return res.status(403).json({
        error: "You must pay at least 50% of the course fee to enroll",
      });
    }

    const { error } = await supabase
      .from("grades")
      .insert([{ student_id, course_id }]);

    if (error) throw error;

    res.status(200).json({ message: "Enrolled successfully" });
  } catch (err) {
    console.error("enrollStudentInCourse error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// GET COURSES
exports.getCourses = async (req, res) => {
  const { institution_id, userRole } = req;

  try {
    let courses;
    let error;

    if (userRole === "student") {
      const { data: gradeRows, error: gradeError } = await supabase
        .from("grades")
        .select("course_id")
        .eq("student_id", req.userId);

      if (gradeError)
        return res.status(500).json({ error: gradeError.message });

      const courseIds = gradeRows.map((row) => row.course_id);

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
        .eq("teacher_id", req.userId)
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

// GET COURSE BY ID
exports.getCourseById = async (req, res) => {
  const { id } = req.params;
  const { userRole, institution_id } = req;

  try {
    const { data: course, error: courseError } = await supabase
      .from("courses")
      .select("*")
      .eq("id", id)
      .eq("institution_id", institution_id)
      .single();

    if (courseError) return res.status(404).json({ error: "Course not found" });

    if (
      (userRole === "student" && !course.students?.includes(req.req.userId)) ||
      (userRole === "teacher" && course.teacher_id !== req.req.userId) ||
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
