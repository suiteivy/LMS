const supabase = require("../utils/supabaseClient.js");
const { hasPaidAtLeastHalf } = require("../utils/feeUtils.js");

const normalizeClassIds = (class_ids = [], class_id = null) => {
  return Array.from(new Set([...(class_ids || []).filter(Boolean), ...(class_id ? [class_id] : [])]));
};

const hydrateSubjectClassIds = (subject) => {
  const legacyClassIds = normalizeClassIds(subject?.metadata?.class_ids || [], subject?.class_id);
  return { ...subject, class_ids: legacyClassIds };
};

const isRelationshipResolutionError = (error) => {
  if (!error) return false;
  const code = String(error.code || "");
  const message = String(error.message || "").toLowerCase();
  return (
    code === "PGRST200" ||
    code === "PGRST201" ||
    message.includes("relationship") ||
    message.includes("foreign key")
  );
};

const attachSubjectRelationsFallback = (rows = []) =>
  (rows || []).map((row) => ({
    ...row,
    teacher: null,
    subject_teachers: [],
  }));

const isMissingSubjectClassesTableError = (error) => {
  if (!error) return false;
  const code = String(error.code || "");
  const message = String(error.message || "").toLowerCase();
  return (
    code === "42P01" ||
    code === "PGRST205" ||
    message.includes("subject_classes")
  );
};

const enrichSubjectsWithClassIds = async (subjects = [], institution_id) => {
  if (!subjects || subjects.length === 0) return [];

  const subjectIds = subjects.map((s) => s.id).filter(Boolean);
  if (subjectIds.length === 0) return subjects.map(hydrateSubjectClassIds);

  const { data: links, error } = await supabase
    .from("subject_classes")
    .select("subject_id,class_id")
    .eq("institution_id", institution_id)
    .in("subject_id", subjectIds);

  if (error) {
    // Migration not yet applied; keep legacy behavior.
    if (isMissingSubjectClassesTableError(error)) {
      return subjects.map(hydrateSubjectClassIds);
    }
    throw error;
  }

  const classMap = new Map();
  for (const link of links || []) {
    if (!classMap.has(link.subject_id)) classMap.set(link.subject_id, []);
    classMap.get(link.subject_id).push(link.class_id);
  }

  return subjects.map((subject) => {
    const joinClassIds = classMap.get(subject.id) || [];
    const legacyClassIds = normalizeClassIds(subject?.metadata?.class_ids || [], subject?.class_id);
    return {
      ...subject,
      class_ids: Array.from(new Set([...joinClassIds, ...legacyClassIds])),
    };
  });
};

// CREATE SUBJECT
exports.createSubject = async (req, res) => {
  try {
    const { title, description, fee_amount, teacher_id, teacher_ids, class_ids, fee_config, materials, metadata } = req.body;
    let teacherId;
    const institution_id = req.institution_id;

    if (!['teacher', 'admin', 'master_admin'].includes(req.userRole)) {
      return res
        .status(403)
        .json({ error: "Only teachers or admins can create subjects" });
    }

    if (req.userRole === "teacher") {
      const { data: teacher } = await supabase
        .from('teachers')
        .select('id')
        .eq('user_id', req.userId)
        .eq('institution_id', institution_id)
        .single();
      if (!teacher) return res.status(403).json({ error: "Teacher profile not found" });
      teacherId = teacher.id;
    }
    if (req.userRole === "admin" || req.userRole === "master_admin") {
      teacherId = teacher_id || (teacher_ids && teacher_ids.length > 0 ? teacher_ids[0] : null);
    }

    if (!title) {
      return res.status(400).json({ error: "Title is required" });
    }

    const normalizedClassIds = normalizeClassIds(class_ids, null);
    const primaryClassId = normalizedClassIds.length > 0 ? normalizedClassIds[0] : null;

    if (normalizedClassIds.length > 0) {
      const { data: validClasses, error: validClassesError } = await supabase
        .from('classes')
        .select('id')
        .eq('institution_id', institution_id)
        .in('id', normalizedClassIds);

      if (validClassesError) {
        return res.status(500).json({ error: validClassesError.message });
      }

      const validClassIds = new Set((validClasses || []).map((row) => row.id));
      const invalidClassIds = normalizedClassIds.filter((id) => !validClassIds.has(id));
      if (invalidClassIds.length > 0) {
        return res.status(400).json({ error: 'Invalid class assignment for institution' });
      }
    }

    const allTeacherIds = Array.from(new Set([
      ...(teacherId ? [teacherId] : []),
      ...(teacher_ids || [])
    ]));

    if (allTeacherIds.length > 0) {
      const { data: validTeachers, error: validTeachersError } = await supabase
        .from('teachers')
        .select('id')
        .eq('institution_id', institution_id)
        .in('id', allTeacherIds);

      if (validTeachersError) {
        return res.status(500).json({ error: validTeachersError.message });
      }

      const validTeacherIds = new Set((validTeachers || []).map((row) => row.id));
      const invalidTeacherIds = allTeacherIds.filter((id) => !validTeacherIds.has(id));
      if (invalidTeacherIds.length > 0) {
        return res.status(400).json({ error: 'Invalid teacher assignment for institution' });
      }
    }

    const normalizedFeeAmount = Number.isFinite(Number(fee_amount)) ? Number(fee_amount) : 0;

    const { data, error } = await supabase.from("subjects").insert([
      {
        title,
        description,
        fee_amount: normalizedFeeAmount,
        teacher_id: teacherId,
        class_id: primaryClassId,
        institution_id,
        fee_config: fee_config || {},
        materials: materials || [],
        metadata: {
          ...(metadata || {}),
          class_ids: normalizedClassIds,
        }
      },
    ]).select().single();

    if (error) return res.status(500).json({ error: error.message });

    if (normalizedClassIds.length > 0) {
      const subjectClassRecords = normalizedClassIds.map((cid) => ({
        subject_id: data.id,
        class_id: cid,
        institution_id,
      }));

      const { error: subjectClassesError } = await supabase
        .from("subject_classes")
        .insert(subjectClassRecords);

      if (
        subjectClassesError &&
        subjectClassesError.code !== "23505" &&
        !isMissingSubjectClassesTableError(subjectClassesError)
      ) {
        await supabase.from("subjects").delete().eq("id", data.id).eq("institution_id", institution_id);
        return res.status(500).json({ error: subjectClassesError.message });
      }
    }

    // Populate subject_teachers many-to-many table
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

    res.status(201).json({ message: "Subject created", data: { ...data, class_ids: normalizedClassIds } });
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
    const { data: student } = await supabase
      .from('students')
      .select('id')
      .eq('user_id', appUserId)
      .eq('institution_id', req.institution_id)
      .single();
    if (!student) return res.status(404).json({ error: "Student profile not found" });
    const student_id = student.id;

    const { data: subject, error: subjectError } = await supabase
      .from('subjects')
      .select('id')
      .eq('id', subject_id)
      .eq('institution_id', req.institution_id)
      .single();

    if (subjectError || !subject) {
      return res.status(400).json({ error: "Invalid subject for institution" });
    }

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
    const richSelect = `
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
      `;

    let { data, error } = await supabase
      .from("subjects")
      .select(richSelect)
      .eq("institution_id", institution_id)
      .order('title');

    if (error) {
      if (!isRelationshipResolutionError(error)) {
        return res.status(500).json({ error: error.message });
      }

      const fallback = await supabase
        .from('subjects')
        .select('*')
        .eq('institution_id', institution_id)
        .order('title');

      if (fallback.error) {
        return res.status(500).json({ error: fallback.error.message });
      }

      data = attachSubjectRelationsFallback(fallback.data || []);
    }

    const subjects = await enrichSubjectsWithClassIds(data || [], institution_id);
    return res.json(subjects);
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

      if (error && isRelationshipResolutionError(error)) {
        const fallback = await supabase
          .from("subjects")
          .select("*")
          .eq("institution_id", institution_id)
          .order("title");
        if (fallback.error) {
          return res.status(500).json({ error: fallback.error.message });
        }
        data = attachSubjectRelationsFallback(fallback.data || []);
        error = null;
      }
    } else if (userRole === "teacher") {
      const { data: teacher, error: tError } = await supabase
        .from('teachers')
        .select('id')
        .eq('user_id', userId)
        .eq('institution_id', institution_id)
        .single();

      if (tError || !teacher) {
        console.warn(`[SubjectController] Teacher profile not found for user ${userId}`);
        return res.status(404).json({ error: "Teacher profile not found" });
      }

      const teacherId = teacher.id;

      // Find subjects where teacher is in subject_teachers
      const { data: subjectIdsData } = await supabase
        .from("subject_teachers")
        .select("subject_id")
        .eq("teacher_id", teacherId)
        .eq("institution_id", institution_id);

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

      if (error && isRelationshipResolutionError(error)) {
        const fallback = await supabase
          .from("subjects")
          .select("*")
          .eq("institution_id", institution_id)
          .or(`teacher_id.eq.${teacherId}${subjectIds.length > 0 ? `,id.in.(${subjectIds.join(',')})` : ''}`)
          .order("title");
        if (fallback.error) {
          return res.status(500).json({ error: fallback.error.message });
        }
        data = attachSubjectRelationsFallback(fallback.data || []);
        error = null;
      }
    } else if (userRole === "student" || userRole === "parent") {
      // For student or parent, get student enrollments
      let studentId;
      if (userRole === "student") {
        const { data: student } = await supabase
          .from('students')
          .select('id')
          .eq('user_id', userId)
          .eq('institution_id', institution_id)
          .single();
        if (student) studentId = student.id;
      } else {
        // Parent: get first student's enrollments for simplicity, or all students linked to the parent
        const { data: parent } = await supabase
          .from('parents')
          .select('id')
          .eq('user_id', userId)
          .eq('institution_id', institution_id)
          .single();
        if (parent) {
          const { data: children } = await supabase
            .from('parent_students')
            .select('student_id')
            .eq('parent_id', parent.id)
            .eq('institution_id', institution_id);
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
        .eq("institution_id", institution_id)
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

      if (error && isRelationshipResolutionError(error)) {
        const fallback = await supabase
          .from("subjects")
          .select("*")
          .in("id", subjectIds)
          .eq("institution_id", institution_id)
          .order("title");
        if (fallback.error) {
          return res.status(500).json({ error: fallback.error.message });
        }
        data = attachSubjectRelationsFallback(fallback.data || []);
        error = null;
      }
    }

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    const subjects = await enrichSubjectsWithClassIds(data || [], institution_id);
    return res.json(subjects);
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
    let { data: subject, error: subjectError } = await supabase
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

    const [enriched] = await enrichSubjectsWithClassIds([subject], institution_id);
    res.json(enriched || hydrateSubjectClassIds(subject));
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
    const { data: links, error: linksError } = await supabase
      .from("subject_classes")
      .select("subject_id")
      .eq("institution_id", institution_id)
      .eq("class_id", classId);

    if (linksError && !isMissingSubjectClassesTableError(linksError)) {
      return res.status(500).json({ error: linksError.message });
    }

    if (linksError && isMissingSubjectClassesTableError(linksError)) {
      const { data: subjects, error } = await supabase
        .from("subjects")
        .select("*")
        .eq("institution_id", institution_id)
        .order("title");

      if (error) return res.status(500).json({ error: error.message });

      const filtered = (subjects || []).filter((s) => {
        if (s.class_id === classId) return true;
        const ids = s?.metadata?.class_ids;
        return Array.isArray(ids) && ids.includes(classId);
      });
      return res.json(filtered.map(hydrateSubjectClassIds));
    }

    const { data: subjects, error } = await supabase
      .from("subjects")
      .select("*")
      .eq("institution_id", institution_id)
      .order("title");

    if (error) return res.status(500).json({ error: error.message });

    const linkedIds = new Set((links || []).map((l) => l.subject_id).filter(Boolean));
    const filtered = (subjects || []).filter((s) => {
      if (linkedIds.has(s.id)) return true;
      if (s.class_id === classId) return true;
      const ids = s?.metadata?.class_ids;
      return Array.isArray(ids) && ids.includes(classId);
    });

    const enriched = await enrichSubjectsWithClassIds(filtered, institution_id);
    res.json(enriched);
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

// DELETE SUBJECT
exports.deleteSubject = async (req, res) => {
  const { id } = req.params;
  const { institution_id } = req;

  try {
    const { data: existing, error: existingError } = await supabase
      .from("subjects")
      .select("id")
      .eq("id", id)
      .eq("institution_id", institution_id)
      .single();

    if (existingError || !existing) {
      return res.status(404).json({ error: "Subject not found" });
    }

    const cleanupTargets = [
      { table: "subject_teachers", column: "subject_id" },
      { table: "enrollments", column: "subject_id" },
      { table: "subject_classes", column: "subject_id" },
    ];

    for (const target of cleanupTargets) {
      const { error } = await supabase
        .from(target.table)
        .delete()
        .eq(target.column, id)
        .eq("institution_id", institution_id);

      // subject_classes may not exist yet in mixed rollout envs
      if (error && !isMissingSubjectClassesTableError(error)) {
        return res.status(500).json({ error: error.message });
      }
    }

    const { error: deleteError } = await supabase
      .from("subjects")
      .delete()
      .eq("id", id)
      .eq("institution_id", institution_id);

    if (deleteError) {
      return res.status(500).json({ error: deleteError.message });
    }

    return res.json({ message: "Subject deleted" });
  } catch (err) {
    console.error("deleteSubject error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

// UPDATE SUBJECT (admin/module-safe update with class + teacher links)
exports.updateSubject = async (req, res) => {
  const { id } = req.params;
  const { institution_id } = req;

  try {
    const {
      title,
      description,
      fee_amount,
      teacher_id,
      teacher_ids,
      class_id,
      class_ids,
      fee_config,
      materials,
      metadata,
    } = req.body || {};

    const { data: existing, error: existingError } = await supabase
      .from("subjects")
      .select("id, metadata")
      .eq("id", id)
      .eq("institution_id", institution_id)
      .single();

    if (existingError || !existing) {
      return res.status(404).json({ error: "Subject not found" });
    }

    const normalizedClassIds = normalizeClassIds(class_ids, class_id);
    if (normalizedClassIds.length > 0) {
      const { data: validClasses, error: validClassesError } = await supabase
        .from("classes")
        .select("id")
        .eq("institution_id", institution_id)
        .in("id", normalizedClassIds);

      if (validClassesError) {
        return res.status(500).json({ error: validClassesError.message });
      }

      const validClassIds = new Set((validClasses || []).map((row) => row.id));
      const invalidClassIds = normalizedClassIds.filter((cid) => !validClassIds.has(cid));
      if (invalidClassIds.length > 0) {
        return res.status(400).json({ error: "Invalid class assignment for institution" });
      }
    }

    const allTeacherIds = Array.from(
      new Set([...(teacher_id ? [teacher_id] : []), ...((teacher_ids || []).filter(Boolean))])
    );

    if (allTeacherIds.length > 0) {
      const { data: validTeachers, error: validTeachersError } = await supabase
        .from("teachers")
        .select("id")
        .eq("institution_id", institution_id)
        .in("id", allTeacherIds);

      if (validTeachersError) {
        return res.status(500).json({ error: validTeachersError.message });
      }

      const validTeacherIds = new Set((validTeachers || []).map((row) => row.id));
      const invalidTeacherIds = allTeacherIds.filter((tid) => !validTeacherIds.has(tid));
      if (invalidTeacherIds.length > 0) {
        return res.status(400).json({ error: "Invalid teacher assignment for institution" });
      }
    }

    const primaryTeacherId = allTeacherIds.length > 0 ? allTeacherIds[0] : null;
    const primaryClassId = normalizedClassIds.length > 0 ? normalizedClassIds[0] : null;

    const mergedMetadata = {
      ...((existing && existing.metadata) || {}),
      ...(metadata || {}),
      class_ids: normalizedClassIds,
    };

    const updatePayload = {
      ...(title !== undefined ? { title } : {}),
      ...(description !== undefined ? { description } : {}),
      ...(fee_amount !== undefined ? { fee_amount: Number.isFinite(Number(fee_amount)) ? Number(fee_amount) : 0 } : {}),
      teacher_id: primaryTeacherId,
      class_id: primaryClassId,
      ...(fee_config !== undefined ? { fee_config } : {}),
      ...(materials !== undefined ? { materials } : {}),
      metadata: mergedMetadata,
    };

    const { error: updateError } = await supabase
      .from("subjects")
      .update(updatePayload)
      .eq("id", id)
      .eq("institution_id", institution_id);

    if (updateError) {
      return res.status(500).json({ error: updateError.message });
    }

    const { error: clearTeacherError } = await supabase
      .from("subject_teachers")
      .delete()
      .eq("subject_id", id)
      .eq("institution_id", institution_id);

    if (clearTeacherError) {
      return res.status(500).json({ error: clearTeacherError.message });
    }

    if (allTeacherIds.length > 0) {
      const teacherRows = allTeacherIds.map((tid) => ({
        subject_id: id,
        teacher_id: tid,
        institution_id,
      }));
      const { error: insertTeacherError } = await supabase
        .from("subject_teachers")
        .insert(teacherRows);

      if (insertTeacherError && insertTeacherError.code !== "23505") {
        return res.status(500).json({ error: insertTeacherError.message });
      }
    }

    const { error: clearClassError } = await supabase
      .from("subject_classes")
      .delete()
      .eq("subject_id", id)
      .eq("institution_id", institution_id);

    if (clearClassError && !isMissingSubjectClassesTableError(clearClassError)) {
      return res.status(500).json({ error: clearClassError.message });
    }

    if (normalizedClassIds.length > 0) {
      const classRows = normalizedClassIds.map((cid) => ({
        subject_id: id,
        class_id: cid,
        institution_id,
      }));
      const { error: insertClassError } = await supabase
        .from("subject_classes")
        .insert(classRows);

      if (
        insertClassError &&
        insertClassError.code !== "23505" &&
        !isMissingSubjectClassesTableError(insertClassError)
      ) {
        return res.status(500).json({ error: insertClassError.message });
      }
    }

    req.params.id = id;
    return exports.getSubjectById(req, res);
  } catch (err) {
    console.error("updateSubject error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};
