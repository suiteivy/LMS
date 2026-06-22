const supabase = require("../utils/supabaseClient.js");
const { hasPaidAtLeastHalf } = require("../utils/feeUtils.js");

// CREATE SUBJECT
exports.createSubject = async (req, res) => {
  try {
    const { title, description, fee_amount, teacher_id, teacher_ids, fee_config, materials, metadata } = req.body;
    let teacherId;
    const institution_id = req.institution_id;

    if (req.userRole !== "teacher" && req.userRole !== "admin") {
      return res
        .status(403)
        .json({ error: "Only teachers or admins can create subjects" });
    }

    if (req.userRole === "teacher") {
      const { data: teacher } = await supabase.from('teachers').select('id').eq('user_id', req.userId).single();
      if (!teacher) return res.status(403).json({ error: "Teacher profile not found" });
      teacherId = teacher.id;
    }
    if (req.userRole === "admin") {
      teacherId = teacher_id || (teacher_ids && teacher_ids.length > 0 ? teacher_ids[0] : null);
    }

    if (!title || !fee_amount) {
      return res.status(400).json({ error: "Title and fee amount are required" });
    }

    const { data, error } = await supabase.from("subjects").insert([
      {
        title,
        description,
        fee_amount: Number(fee_amount),
        teacher_id: teacherId,
        institution_id,
        fee_config: fee_config || {},
        materials: materials || [],
        metadata: metadata || {}
      },
    ]).select().single();

    if (error) return res.status(500).json({ error: error.message });

    // Populate subject_teachers many-to-many table
    const allTeacherIds = Array.from(new Set([
      ...(teacherId ? [teacherId] : []),
      ...(teacher_ids || [])
    ]));

    if (allTeacherIds.length > 0) {
      const records = allTeacherIds.map(tid => ({
        subject_id: data.id,
        teacher_id: tid,
        institution_id
      }));
      const { error: assocError } = await supabase
        .from("subject_teachers")
        .insert(records);
      if (assocError && assocError.code !== '23505') {
        console.error("Error creating subject teacher associations:", assocError);
      }
    }

    res.status(201).json({ message: "Subject created", data });
  } catch (err) {
    console.error("createSubject error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

//  ENROLL STUDENT WITH 50% PAYMENT CHECK
exports.enrollStudentInSubject = async (req, res) => {
  try {
    const { subject_id } = req.body;
    const appUserId = req.userId;

    if (req.userRole !== "student") {
      return res
        .status(403)
        .json({ error: "Only students can enroll in subjects" });
    }

    // 1. Get Student ID
    const { data: student } = await supabase.from('students').select('id').eq('user_id', appUserId).single();
    if (!student) return res.status(404).json({ error: "Student profile not found" });
    const student_id = student.id;

    // 2. Check Fees
    const eligible = await hasPaidAtLeastHalf(student_id, subject_id);

    if (!eligible) {
      return res.status(403).json({
        error: "You must pay at least 50% of the subject fee to enroll",
      });
    }

    // 3. Enroll (Insert into enrollments)
    // 3. Enroll (Insert into enrollments)

    const { error } = await supabase
      .from("enrollments")
      .insert([{
        student_id,
        subject_id,
        institution_id: req.institution_id,
        status: 'enrolled',
        enrollment_date: new Date().toISOString()
      }]);

    if (error) {
      console.error("[Enrollment] Insert error:", error);
      if (error.code === '23505') { // Unique violation
        return res.status(400).json({ error: "Already enrolled" });
      }
      if (error.code === '23503') { // Foreign key violation
        return res.status(400).json({ error: "Invalid student or subject ID (Reference violation)" });
      }
      throw error;
    }

    res.status(200).json({ message: "Enrolled successfully" });
  } catch (err) {
    console.error("enrollStudentInSubject error:", err);
    res.status(500).json({ error: "Server error: " + (err.message || err) });
  }
};

// GET SUBJECTS (unfiltered list for institution)
exports.getSubjects = async (req, res) => {
  const { institution_id } = req;

  try {
    const { data, error } = await supabase
      .from("subjects")
      .select(`
        *,
        teacher:teachers(user:users(first_name, last_name, full_name)),
        subject_teachers(
          teacher_id,
          teachers(
            id,
            user_id,
            users:user_id(
              first_name,
              last_name,
              full_name
            )
          )
        )
      `)
      .eq("institution_id", institution_id)
      .order('title');

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json(data);
  } catch (err) {
    console.error("getSubjects error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// GET FILTERED SUBJECTS BASED ON USER ROLE
exports.getFilteredSubjects = async (req, res) => {
  const { institution_id, userRole, userId } = req;

  try {
    if (!institution_id) {
      return res
        .status(400)
        .json({ error: "Missing institution context" });
    }

    if (!["admin", "teacher", "student", "parent"].includes(userRole)) {
      return res.status(403).json({ error: "Unauthorized role" });
    }

    let data;
    let error;

    if (userRole === "admin") {
      // All subjects in the institution
      ({ data, error } = await supabase
        .from("subjects")
        .select(`
          *,
          subject_teachers(
            teacher_id,
            teachers(
              id,
              user_id,
              users:user_id(
                first_name,
                last_name,
                full_name
              )
            )
          )
        `)
        .eq("institution_id", institution_id));
    } else if (userRole === "teacher") {
      const { data: teacher, error: tError } = await supabase.from('teachers').select('id').eq('user_id', userId).single();

      if (tError || !teacher) {
        console.warn(`[SubjectController] Teacher profile not found for user ${userId}`);
        return res.status(404).json({ error: "Teacher profile not found" });
      }

      const teacherId = teacher.id;

      // Find subjects where teacher is in subject_teachers
      const { data: subjectIdsData } = await supabase
        .from("subject_teachers")
        .select("subject_id")
        .eq("teacher_id", teacherId);

      const subjectIds = (subjectIdsData || []).map(s => s.subject_id);

      ({ data, error } = await supabase
        .from("subjects")
        .select(`
          *,
          subject_teachers(
            teacher_id,
            teachers(
              id,
              user_id,
              users:user_id(
                first_name,
                last_name,
                full_name
              )
            )
          )
        `)
        .eq("institution_id", institution_id)
        .or(`teacher_id.eq.${teacherId}${subjectIds.length > 0 ? `,id.in.(${subjectIds.join(',')})` : ''}`));
    } else if (userRole === "student" || userRole === "parent") {
      // For student or parent, get student enrollments
      let studentId;
      if (userRole === "student") {
        const { data: student } = await supabase.from('students').select('id').eq('user_id', userId).single();
        if (student) studentId = student.id;
      } else {
        // Parent: get first student's enrollments for simplicity, or all students linked to the parent
        const { data: parent } = await supabase.from('parents').select('id').eq('user_id', userId).single();
        if (parent) {
          const { data: children } = await supabase.from('parent_students').select('student_id').eq('parent_id', parent.id);
          if (children && children.length > 0) {
            studentId = children[0].student_id; // For simplicity, pick first child
          }
        }
      }

      if (!studentId) {
        return res.json([]);
      }

      const { data: enrollments, error: enrError } = await supabase
        .from("enrollments")
        .select("subject_id")
        .eq("student_id", studentId)
        .eq("status", "enrolled");

      if (enrError) throw enrError;

      const subjectIds = (enrollments || []).map(e => e.subject_id);

      if (subjectIds.length === 0) return res.json([]);

      ({ data, error } = await supabase
        .from("subjects")
        .select(`
          *,
          subject_teachers(
            teacher_id,
            teachers(
              id,
              user_id,
              users:user_id(
                first_name,
                last_name,
                full_name
              )
            )
          )
        `)
        .in("id", subjectIds)
        .eq("institution_id", institution_id));
    }

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json(data);
  } catch (err) {
    console.error("getFilteredSubjects error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// GET SUBJECT BY ID
exports.getSubjectById = async (req, res) => {
  const { id } = req.params;
  const { institution_id } = req;

  try {
    const { data: subject, error: subjectError } = await supabase
      .from("subjects")
      .select(`
        *,
        subject_teachers(
          teacher_id,
          teachers(
            id,
            user_id,
            users:user_id(
              first_name,
              last_name,
              full_name
            )
          )
        )
      `)
      .eq("id", id)
      .eq("institution_id", institution_id)
      .single();

    if (subjectError) return res.status(404).json({ error: "Subject not found" });

    res.json(subject);
  } catch (err) {
    console.error("getSubjectById error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// GET SUBJECTS BY CLASS
exports.getSubjectsByClass = async (req, res) => {
  const { classId } = req.params;
  const { institution_id } = req;

  try {
    const { data: subjects, error } = await supabase
      .from("subjects")
      .select("*")
      .eq("institution_id", institution_id)
      .eq("class_id", classId)
      .order('title');

    if (error) return res.status(500).json({ error: error.message });
    res.json(subjects);
  } catch (err) {
    console.error("getSubjectsByClass error:", err);
    res.status(500).json({ error: "Server error" });
  }
};
// UPDATE SUBJECT PROGRESS
exports.updateProgress = async (req, res) => {
  try {
    const { id } = req.params;
    const { progress_percent } = req.body;
    const { userId, userRole, institution_id } = req;

    if (userRole !== "teacher" && userRole !== "admin") {
      return res.status(403).json({ error: "Only teachers or admins can update progress" });
    }

    // If teacher, verify they teach this subject
    if (userRole === "teacher") {
      const { data: teacher } = await supabase.from('teachers').select('id').eq('user_id', userId).single();
      if (!teacher) return res.status(403).json({ error: "Teacher profile not found" });

      const { data: subject } = await supabase.from('subjects').select('id, teacher_id').eq('id', id).eq('institution_id', institution_id).single();
      if (!subject) return res.status(404).json({ error: "Subject not found" });
      
      let isAssigned = (subject.teacher_id === teacher.id);
      if (!isAssigned) {
        const { data: assoc } = await supabase
          .from('subject_teachers')
          .select('id')
          .eq('subject_id', id)
          .eq('teacher_id', teacher.id)
          .maybeSingle();
        if (assoc) isAssigned = true;
      }

      if (!isAssigned) {
        return res.status(403).json({ error: "You are not assigned to this subject" });
      }
    }

    const { data, error } = await supabase
      .from("subjects")
      .update({ 
        progress_percent: Math.min(Math.max(0, Number(progress_percent)), 100), 
        updated_at: new Date().toISOString() 
      })
      .eq("id", id)
      .eq("institution_id", institution_id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error("updateProgress error:", err);
    res.status(500).json({ error: err.message });
  }
};
