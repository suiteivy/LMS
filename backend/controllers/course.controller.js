const supabase = require("../utils/supabaseClient");

async function createCourse(req, res) {
  try {
    const { title, description } = req.body;
    const teacher_id = req.user.id;
    const institution_id = req.institution_id;

    // Check if user is a teacher or admin
    if (req.userRole !== "teacher" && req.userRole !== "admin") {
      return res.status(403).json({ error: "Only teachers and admins can create courses" });
    }

    const { data, error } = await supabase
      .from("courses")
      .insert([
        {
          title,
          description,
          teacher_id,
          institution_id,
        },
      ])
      .select();

    if (error) throw error;

    return res.status(201).json(data[0]);
  } catch (error) {
    console.error("Error creating course:", error.message);
    return res.status(500).json({ error: error.message });
  }
}

async function getCourses(req, res) {
  try {
    const institution_id = req.institution_id;

    const { data, error } = await supabase
      .from("courses")
      .select("*")
      .eq("institution_id", institution_id);

    if (error) throw error;

    return res.status(200).json(data);
  } catch (error) {
    console.error("Error fetching courses:", error.message);
    return res.status(500).json({ error: error.message });
  }
}

async function getFilteredCourses(req, res) {
  try {
    const userId = req.user.id;
    const userRole = req.userRole;
    const institutionId = req.institution_id;
    let query = supabase.from("courses").select("*").eq("institution_id", institutionId);

    // Apply role-based filtering
    if (userRole === "student") {
      // For students, get courses they're associated with via attendance or submissions
      const { data: attendanceCourses, error: attendanceError } = await supabase
        .from("attendance")
        .select("course_id")
        .eq("user_id", userId);

      if (attendanceError) throw attendanceError;

      // Get courses from submissions via assignments
      const { data: assignmentSubmissions, error: submissionsError } = await supabase
        .from("submissions")
        .select("assignment_id")
        .eq("student_id", userId);

      if (submissionsError) throw submissionsError;

      if (assignmentSubmissions && assignmentSubmissions.length > 0) {
        const assignmentIds = assignmentSubmissions.map(sub => sub.assignment_id);
        
        const { data: courseAssignments, error: assignmentsError } = await supabase
          .from("assignments")
          .select("course_id")
          .in("id", assignmentIds);

        if (assignmentsError) throw assignmentsError;

        // Combine course IDs from attendance and assignments
        const attendanceCourseIds = attendanceCourses ? attendanceCourses.map(a => a.course_id) : [];
        const assignmentCourseIds = courseAssignments ? courseAssignments.map(a => a.course_id) : [];
        const courseIds = [...new Set([...attendanceCourseIds, ...assignmentCourseIds])];

        if (courseIds.length > 0) {
          query = query.in("id", courseIds);
        } else {
          // If student has no courses, return empty array
          return res.status(200).json([]);
        }
      } else if (attendanceCourses && attendanceCourses.length > 0) {
        // Only attendance records exist
        const courseIds = attendanceCourses.map(a => a.course_id);
        query = query.in("id", courseIds);
      } else {
        // If student has no courses, return empty array
        return res.status(200).json([]);
      }
    } else if (userRole === "teacher") {
      // For teachers, get courses they teach
      query = query.eq("teacher_id", userId);
    }
    // For admins, get all courses in their institution (already filtered by institution_id)

    const { data, error } = await query;

    if (error) throw error;

    return res.status(200).json(data);
  } catch (error) {
    console.error("Error fetching filtered courses:", error.message);
    return res.status(500).json({ error: error.message });
  }
}

async function getCourseById(req, res) {
  try {
    const courseId = req.params.id;
    const userId = req.user.id;
    const userRole = req.userRole;

    // Get the course
    const { data: course, error } = await supabase
      .from("courses")
      .select("*")
      .eq("id", courseId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return res.status(404).json({ error: "Course not found" });
      }
      throw error;
    }

    // Apply role-based access control
    if (userRole === "student") {
      // Check if student is associated with this course
      const { data: attendance, error: attendanceError } = await supabase
        .from("attendance")
        .select("*")
        .eq("user_id", userId)
        .eq("course_id", courseId);

      if (attendanceError) throw attendanceError;

      // Check if student has submissions for this course
      const { data: assignments, error: assignmentsError } = await supabase
        .from("assignments")
        .select("id")
        .eq("course_id", courseId);

      if (assignmentsError) throw assignmentsError;

      let hasSubmissions = false;
      if (assignments && assignments.length > 0) {
        const assignmentIds = assignments.map(a => a.id);
        const { data: submissions, error: submissionsError } = await supabase
          .from("submissions")
          .select("*")
          .eq("student_id", userId)
          .in("assignment_id", assignmentIds);

        if (submissionsError) throw submissionsError;
        hasSubmissions = submissions && submissions.length > 0;
      }

      // If student is not associated with this course, deny access
      if ((!attendance || attendance.length === 0) && !hasSubmissions) {
        return res.status(403).json({ error: "You do not have access to this course" });
      }
    } else if (userRole === "teacher" && course.teacher_id !== userId) {
      // Teachers can only access their own courses
      return res.status(403).json({ error: "You do not have access to this course" });
    }
    // Admins can access any course

    return res.status(200).json(course);
  } catch (error) {
    console.error("Error fetching course by ID:", error.message);
    return res.status(500).json({ error: error.message });
  }
}

module.exports = {
  createCourse,
  getCourses,
  getFilteredCourses,
  getCourseById
};
