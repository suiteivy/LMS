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

// GET COURSES (unfiltered list for institution)
exports.getCourses = async (req, res) => {
  const { institution_id } = req;

  try {
    const { data, error } = await supabase
      .from("courses")
      .select("*")
      .eq("institution_id", institution_id);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json(data);
  } catch (err) {
    console.error("getCourses error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// GET FILTERED COURSES BASED ON USER ROLE
// Mirrors the behavior described in docs/api_endpoints.md
exports.getFilteredCourses = async (req, res) => {
  const { institution_id, userRole, userId } = req;

  try {
    if (!institution_id) {
      return res
        .status(400)
        .json({ error: "Missing institution context for user" });
    }

    if (!["admin", "teacher", "student"].includes(userRole)) {
      return res.status(403).json({ error: "Unauthorized role" });
    }

    let data;
    let error;

    if (userRole === "admin") {
      // All courses in the institution
      ({ data, error } = await supabase
        .from("courses")
        .select("*")
        .eq("institution_id", institution_id));
    } else if (userRole === "teacher") {
      // Courses where the user is the teacher
      ({ data, error } = await supabase
        .from("courses")
        .select("*")
        .eq("institution_id", institution_id)
        .eq("teacher_id", userId));
    } else if (userRole === "student") {
      // Courses where the student has attendance records or submissions
      const { data: attendanceRows, error: attendanceError } = await supabase
        .from("attendance")
        .select("course_id")
        .eq("student_id", userId);

      if (attendanceError) {
        return res.status(500).json({ error: attendanceError.message });
      }

      const { data: submissionRows, error: submissionError } = await supabase
        .from("submissions")
        .select("course_id")
        .eq("student_id", userId);

      if (submissionError) {
        return res.status(500).json({ error: submissionError.message });
      }

      const courseIds = Array.from(
        new Set([
          ...attendanceRows.map((r) => r.course_id),
          ...submissionRows.map((r) => r.course_id),
        ])
      );

      if (courseIds.length === 0) {
        return res.json([]);
      }

      ({ data, error } = await supabase
        .from("courses")
        .select("*")
        .eq("institution_id", institution_id)
        .in("id", courseIds));
    }

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json(data);
  } catch (err) {
    console.error("getFilteredCourses error:", err);
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
