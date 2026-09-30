const supabase = require("../utils/supabaseClient.js");
const configCache = require("../utils/configCache.js");
const { hasPaidAtLeastHalf } = require("../utils/feeUtils.js");
const { parsePagination, paginatedResponse } = require("../utils/pagination.js");

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
    const {
      title,
      description,
      fee_amount,
      teacher_id,
      teacher_ids,
      class_ids,
      level_ids,
      category_id,
      class_teacher_assignments,
      fee_config,
      materials,
      metadata,
      hod_teacher_id
    } = req.body;
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

    // Validate category_id if provided
    let validCategoryId = null;
    if (category_id) {
      const { data: catData, error: catError } = await supabase
        .from('subject_categories')
        .select('id')
        .eq('id', category_id)
        .eq('institution_id', institution_id)
        .maybeSingle();

      if (catError || !catData) {
        return res.status(400).json({ error: "Invalid subject category for institution" });
      }
      validCategoryId = catData.id;
    }

    // Determine normalized class IDs: union of class_ids and any classes in class_teacher_assignments
    const rawClassIds = [...(class_ids || [])];
    if (Array.isArray(class_teacher_assignments)) {
      class_teacher_assignments.forEach(a => {
        if (a && a.class_id) rawClassIds.push(a.class_id);
      });
    }
    const normalizedClassIds = normalizeClassIds(rawClassIds, null);
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

    // Collect all unique teacher IDs to validate
    const assignmentTeacherIds = Array.isArray(class_teacher_assignments)
      ? class_teacher_assignments.map(a => a?.teacher_id).filter(Boolean)
      : [];

    const allTeacherIds = Array.from(new Set([
      ...(teacherId ? [teacherId] : []),
      ...(teacher_ids || []),
      ...(hod_teacher_id ? [hod_teacher_id] : []),
      ...assignmentTeacherIds
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
      const invalidTeacherIds = allTeacherIds.filter((tid) => !validTeacherIds.has(tid));
      if (invalidTeacherIds.length > 0) {
        return res.status(400).json({ error: 'Invalid teacher assignment for institution' });
      }
    }

    const primaryTeacherId = teacherId || (assignmentTeacherIds.length > 0 ? assignmentTeacherIds[0] : hod_teacher_id || null);
    const normalizedFeeAmount = Number.isFinite(Number(fee_amount)) ? Number(fee_amount) : 0;
    const normalizedLevelIds = Array.isArray(level_ids) ? level_ids.filter(Boolean) : null;
    const finalLevelIds = normalizedLevelIds && normalizedLevelIds.length > 0 ? normalizedLevelIds : null;

    const { data, error } = await supabase.from("subjects").insert([
      {
        title,
        description,
        fee_amount: normalizedFeeAmount,
        teacher_id: primaryTeacherId,
        hod_teacher_id: hod_teacher_id || null,
        category_id: validCategoryId,
        class_id: primaryClassId,
        level_ids: finalLevelIds,
        institution_id,
        fee_config: fee_config || {},
        materials: materials || [],
        metadata: {
          ...(metadata || {}),
          class_ids: normalizedClassIds,
          level_ids: finalLevelIds,
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

    // Populate subject_teachers with per-class and HOD records
    const subjectTeacherRecords = [];
    const assignedClassTeacherPairs = new Set();

    if (Array.isArray(class_teacher_assignments) && class_teacher_assignments.length > 0) {
      for (const a of class_teacher_assignments) {
        if (a && a.teacher_id && a.class_id) {
          const key = `${a.subject_id || data.id}_${a.class_id}_${a.teacher_id}`;
          if (!assignedClassTeacherPairs.has(key)) {
            assignedClassTeacherPairs.add(key);
            subjectTeacherRecords.push({
              subject_id: data.id,
              teacher_id: a.teacher_id,
              class_id: a.class_id,
              institution_id,
              is_hod: a.teacher_id === hod_teacher_id,
            });
          }
        }
      }
    } else if (allTeacherIds.length > 0) {
      // Legacy fallback: if teacher(s) provided without explicit class breakdown
      for (const tid of allTeacherIds) {
        subjectTeacherRecords.push({
          subject_id: data.id,
          teacher_id: tid,
          institution_id,
          is_hod: tid === hod_teacher_id,
        });
      }
    }

    // Always ensure HOD is recorded with class_id: null if specified
    if (hod_teacher_id) {
      const hodAlreadyRecorded = subjectTeacherRecords.some(r => r.teacher_id === hod_teacher_id && r.class_id === null);
      if (!hodAlreadyRecorded) {
        subjectTeacherRecords.push({
          subject_id: data.id,
          teacher_id: hod_teacher_id,
          class_id: null,
          institution_id,
          is_hod: true,
        });
      }
    }

    if (subjectTeacherRecords.length > 0) {
      const { error: assocError } = await supabase
        .from("subject_teachers")
        .insert(subjectTeacherRecords);
      if (assocError && assocError.code !== "23505") {
        console.error("Error creating subject teacher associations:", assocError);
      }
    }

    if (institution_id) {
      configCache.invalidateSubjects(institution_id);
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
  const { page, limit, from, to } = parsePagination(req.query);
  const { level_id, category_id } = req.query || {};
  const cacheKey = institution_id ? `${institution_id}:subjects:${page}:${limit}:${level_id || 'all'}:${category_id || 'all'}` : null;

  if (cacheKey) {
    const cached = configCache.get(cacheKey);
    if (cached) {
      return res.json(cached);
    }
  }

  try {
    const richSelect = `
        *,
        category:subject_categories(id, name, description, color, sort_order),
        teacher:teachers!courses_new_teacher_id_fkey(user:users(first_name, last_name, full_name)),
        subject_teachers(
          teacher_id,
          class_id,
          is_hod,
          teachers(
            id,
            user_id,
            users:user_id(
              first_name,
              last_name,
              full_name
            )
          ),
          classes(
            id,
            name,
            display_name,
            grade_level,
            form_level,
            stream
          )
        )
      `;

    let query = supabase
      .from("subjects")
      .select(richSelect, { count: 'exact' })
      .eq("institution_id", institution_id);

    if (category_id === 'uncategorized') {
      query = query.is("category_id", null);
    } else if (category_id) {
      query = query.eq("category_id", category_id);
    }

    let { data, error, count } = await query
      .order('title')
      .range(from, to);

    if (error) {
      if (!isRelationshipResolutionError(error)) {
        return res.status(500).json({ error: error.message });
      }

      let fallbackQuery = supabase
        .from('subjects')
        .select('*', { count: 'exact' })
        .eq('institution_id', institution_id);

      if (category_id === 'uncategorized') {
        fallbackQuery = fallbackQuery.is("category_id", null);
      } else if (category_id) {
        fallbackQuery = fallbackQuery.eq("category_id", category_id);
      }

      const fallback = await fallbackQuery
        .order('title')
        .range(from, to);

      if (fallback.error) {
        return res.status(500).json({ error: fallback.error.message });
      }

      data = attachSubjectRelationsFallback(fallback.data || []);
      count = fallback.count;
    }

    const subjects = await enrichSubjectsWithClassIds(data || [], institution_id);
    let finalSubjects = subjects;
    if (level_id) {
      finalSubjects = subjects.filter((s) => {
        const sLevels = s.level_ids || s?.metadata?.level_ids;
        if (!sLevels || (Array.isArray(sLevels) && sLevels.length === 0)) return true;
        return Array.isArray(sLevels) && sLevels.includes(level_id);
      });
    }
    const responsePayload = paginatedResponse(finalSubjects, level_id ? finalSubjects.length : count, page, limit);
    if (cacheKey) {
      configCache.set(cacheKey, responsePayload, 300);
    }
    return res.json(responsePayload);
  } catch (err) {
    console.error("getSubjects error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// GET FILTERED SUBJECTS BASED ON USER ROLE
exports.getFilteredSubjects = async (req, res) => {
  const { institution_id, userRole, userId } = req;
  const { category_id } = req.query || {};

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

    const baseSelect = `
      *,
      category:subject_categories(id, name, description, color, sort_order),
      subject_teachers(
        teacher_id,
        class_id,
        is_hod,
        teachers(
          id,
          user_id,
          users:user_id(
            first_name,
            last_name,
            full_name
          )
        ),
        classes(
          id,
          name,
          display_name,
          grade_level,
          form_level,
          stream
        )
      )
    `;

    if (userRole === "admin") {
      let q = supabase
        .from("subjects")
        .select(baseSelect)
        .eq("institution_id", institution_id);

      if (category_id === 'uncategorized') {
        q = q.is("category_id", null);
      } else if (category_id) {
        q = q.eq("category_id", category_id);
      }

      ({ data, error } = await q.order("title"));

      if (error && isRelationshipResolutionError(error)) {
        let fallback = supabase
          .from("subjects")
          .select("*")
          .eq("institution_id", institution_id);

        if (category_id === 'uncategorized') {
          fallback = fallback.is("category_id", null);
        } else if (category_id) {
          fallback = fallback.eq("category_id", category_id);
        }

        const fbRes = await fallback.order("title");
        if (fbRes.error) {
          return res.status(500).json({ error: fbRes.error.message });
        }
        data = attachSubjectRelationsFallback(fbRes.data || []);
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

      let q = supabase
        .from("subjects")
        .select(baseSelect)
        .eq("institution_id", institution_id)
        .or(`teacher_id.eq.${teacherId}${subjectIds.length > 0 ? `,id.in.(${subjectIds.join(',')})` : ''}`);

      if (category_id === 'uncategorized') {
        q = q.is("category_id", null);
      } else if (category_id) {
        q = q.eq("category_id", category_id);
      }

      ({ data, error } = await q.order("title"));

      if (error && isRelationshipResolutionError(error)) {
        let fallback = supabase
          .from("subjects")
          .select("*")
          .eq("institution_id", institution_id)
          .or(`teacher_id.eq.${teacherId}${subjectIds.length > 0 ? `,id.in.(${subjectIds.join(',')})` : ''}`);

        if (category_id === 'uncategorized') {
          fallback = fallback.is("category_id", null);
        } else if (category_id) {
          fallback = fallback.eq("category_id", category_id);
        }

        const fbRes = await fallback.order("title");
        if (fbRes.error) {
          return res.status(500).json({ error: fbRes.error.message });
        }
        data = attachSubjectRelationsFallback(fbRes.data || []);
        error = null;
      }
    } else if (userRole === "student" || userRole === "parent") {
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
            studentId = children[0].student_id;
          }
        }
      }

      if (!studentId) {
        return res.json([]);
      }

      // Fetch student's assigned class for class-specific teacher scoping
      let studentClassId = null;
      const { data: currentEnrollment } = await supabase
        .from('class_enrollments')
        .select('class_id')
        .eq('student_id', studentId)
        .eq('institution_id', institution_id)
        .order('enrolled_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      studentClassId = currentEnrollment?.class_id || null;

      const { data: enrollments, error: enrError } = await supabase
        .from("enrollments")
        .select("subject_id")
        .eq("student_id", studentId)
        .eq("institution_id", institution_id)
        .eq("status", "enrolled");

      if (enrError) throw enrError;

      const subjectIds = (enrollments || []).map(e => e.subject_id);

      if (subjectIds.length === 0) return res.json([]);

      let q = supabase
        .from("subjects")
        .select(baseSelect)
        .in("id", subjectIds)
        .eq("institution_id", institution_id);

      if (category_id === 'uncategorized') {
        q = q.is("category_id", null);
      } else if (category_id) {
        q = q.eq("category_id", category_id);
      }

      ({ data, error } = await q.order("title"));

      if (error && isRelationshipResolutionError(error)) {
        let fallback = supabase
          .from("subjects")
          .select("*")
          .in("id", subjectIds)
          .eq("institution_id", institution_id);

        if (category_id === 'uncategorized') {
          fallback = fallback.is("category_id", null);
        } else if (category_id) {
          fallback = fallback.eq("category_id", category_id);
        }

        const fbRes = await fallback.order("title");
        if (fbRes.error) {
          return res.status(500).json({ error: fbRes.error.message });
        }
        data = attachSubjectRelationsFallback(fbRes.data || []);
        error = null;
      }

      // Enforce: students & parents see ONLY their own class's teacher for each subject
      if (Array.isArray(data) && studentClassId) {
        data = data.map(sub => {
          const stList = Array.isArray(sub.subject_teachers) ? sub.subject_teachers : [];
          // 1. Look for teacher assigned specifically to this class
          const classSpecificTeacher = stList.find(st => st.class_id === studentClassId);
          // 2. Fallback to HOD or general assignment
          const hodTeacher = stList.find(st => st.is_hod);
          const generalTeacher = stList.find(st => !st.class_id);

          const chosenAssignment = classSpecificTeacher || hodTeacher || generalTeacher;
          let teacherInfo = null;
          if (chosenAssignment && chosenAssignment.teachers) {
            teacherInfo = {
              id: chosenAssignment.teachers.id,
              user_id: chosenAssignment.teachers.user_id,
              user: chosenAssignment.teachers.users,
            };
          }

          return {
            ...sub,
            teacher: teacherInfo || sub.teacher,
            // Only expose the relevant class teacher link to the student/parent
            subject_teachers: chosenAssignment ? [chosenAssignment] : stList,
          };
        });
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
        category:subject_categories(id, name, description, color, sort_order),
        teacher:teachers!courses_new_teacher_id_fkey(user:users(first_name, last_name, full_name)),
        subject_teachers(
          teacher_id,
          class_id,
          is_hod,
          teachers(
            id,
            user_id,
            users:user_id(
              first_name,
              last_name,
              full_name
            )
          ),
          classes(
            id,
            name,
            display_name,
            grade_level,
            form_level,
            stream
          )
        )
      `)
      .eq("id", id)
      .eq("institution_id", institution_id)
      .single();

    if (subjectError) return res.status(404).json({ error: "Subject not found" });

    const [enriched] = await enrichSubjectsWithClassIds([subject], institution_id);
    const result = enriched || hydrateSubjectClassIds(subject);

    // Format class_teacher_assignments for straightforward client consumption
    const stList = Array.isArray(result.subject_teachers) ? result.subject_teachers : [];
    result.class_teacher_assignments = stList
      .filter(st => st.class_id)
      .map(st => ({
        class_id: st.class_id,
        teacher_id: st.teacher_id,
        is_hod: !!st.is_hod,
        class_name: st.classes?.display_name || st.classes?.name || '',
        teacher_name: st.teachers?.users?.full_name || '',
      }));

    res.json(result);
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

    let classLevelId = null;
    try {
      const { data: classRow } = await supabase
        .from("classes")
        .select("level_id")
        .eq("id", classId)
        .maybeSingle();
      classLevelId = classRow?.level_id || null;
    } catch (_) {}

    const isLevelMatch = (s) => {
      const sLevels = s.level_ids || s?.metadata?.level_ids;
      if (!sLevels || (Array.isArray(sLevels) && sLevels.length === 0)) return true;
      return classLevelId ? sLevels.includes(classLevelId) : true;
    };

    if (linksError && isMissingSubjectClassesTableError(linksError)) {
      const { data: subjects, error } = await supabase
        .from("subjects")
        .select("*")
        .eq("institution_id", institution_id)
        .order("title");

      if (error) return res.status(500).json({ error: error.message });

      const filtered = (subjects || []).filter((s) => {
        if (!isLevelMatch(s)) return false;
        if (s.class_id === classId) return true;
        const ids = s?.metadata?.class_ids;
        if (Array.isArray(ids) && ids.includes(classId)) return true;
        if (classLevelId) {
          const sLevels = s.level_ids || s?.metadata?.level_ids;
          if (Array.isArray(sLevels) && sLevels.includes(classLevelId)) {
            if (!s.class_id && (!Array.isArray(ids) || ids.length === 0)) return true;
          }
        }
        return false;
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
      if (!isLevelMatch(s)) return false;
      if (linkedIds.has(s.id)) return true;
      if (s.class_id === classId) return true;
      const ids = s?.metadata?.class_ids;
      if (Array.isArray(ids) && ids.includes(classId)) return true;
      if (classLevelId) {
        const sLevels = s.level_ids || s?.metadata?.level_ids;
        if (Array.isArray(sLevels) && sLevels.includes(classLevelId)) {
          if (!s.class_id && (!Array.isArray(ids) || ids.length === 0)) return true;
        }
      }
      return false;
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

    if (institution_id) {
      configCache.invalidateSubjects(institution_id);
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
      category_id,
      class_teacher_assignments,
      class_id,
      class_ids,
      level_ids,
      fee_config,
      materials,
      metadata,
      hod_teacher_id,
    } = req.body || {};

    const { data: existing, error: existingError } = await supabase
      .from("subjects")
      .select("id, metadata, teacher_id, hod_teacher_id, category_id")
      .eq("id", id)
      .eq("institution_id", institution_id)
      .single();

    if (existingError || !existing) {
      return res.status(404).json({ error: "Subject not found" });
    }

    // Validate category_id if provided
    let validCategoryId = undefined;
    if (category_id !== undefined) {
      if (category_id === null || category_id === '') {
        validCategoryId = null;
      } else {
        const { data: catData, error: catError } = await supabase
          .from('subject_categories')
          .select('id')
          .eq('id', category_id)
          .eq('institution_id', institution_id)
          .maybeSingle();

        if (catError || !catData) {
          return res.status(400).json({ error: "Invalid subject category for institution" });
        }
        validCategoryId = catData.id;
      }
    }

    // Determine raw class IDs including any in class_teacher_assignments
    const rawClassIds = class_ids !== undefined ? [...(class_ids || [])] : undefined;
    if (Array.isArray(class_teacher_assignments) && rawClassIds !== undefined) {
      class_teacher_assignments.forEach(a => {
        if (a && a.class_id) rawClassIds.push(a.class_id);
      });
    }

    const classesSpecified = class_id !== undefined || rawClassIds !== undefined;
    const normalizedClassIds = classesSpecified ? normalizeClassIds(rawClassIds, class_id) : [];
    if (classesSpecified && normalizedClassIds.length > 0) {
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

    const assignmentTeacherIds = Array.isArray(class_teacher_assignments)
      ? class_teacher_assignments.map(a => a?.teacher_id).filter(Boolean)
      : [];

    const teachersSpecified = teacher_id !== undefined || teacher_ids !== undefined || class_teacher_assignments !== undefined;
    const allTeacherIds = Array.from(
      new Set([
        ...(teacher_id ? [teacher_id] : []),
        ...((teacher_ids || []).filter(Boolean)),
        ...assignmentTeacherIds
      ])
    );

    if (teachersSpecified && allTeacherIds.length > 0) {
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

    if (hod_teacher_id) {
      const { data: validHod, error: validHodError } = await supabase
        .from("teachers")
        .select("id")
        .eq("institution_id", institution_id)
        .eq("id", hod_teacher_id)
        .single();
      if (validHodError || !validHod) {
        return res.status(400).json({ error: "Invalid HOD teacher assignment for institution" });
      }
    }

    const primaryTeacherId = allTeacherIds.length > 0 ? allTeacherIds[0] : null;
    const primaryClassId = normalizedClassIds.length > 0 ? normalizedClassIds[0] : null;
    const normalizedLevelIds = level_ids !== undefined
      ? (Array.isArray(level_ids) ? level_ids.filter(Boolean) : null)
      : undefined;
    const finalLevelIds = normalizedLevelIds !== undefined
      ? (normalizedLevelIds && normalizedLevelIds.length > 0 ? normalizedLevelIds : null)
      : undefined;

    const mergedMetadata = {
      ...((existing && existing.metadata) || {}),
      ...(metadata || {}),
      ...(classesSpecified ? { class_ids: normalizedClassIds } : {}),
      ...(finalLevelIds !== undefined ? { level_ids: finalLevelIds } : {}),
    };

    const updatePayload = {
      ...(title !== undefined ? { title } : {}),
      ...(description !== undefined ? { description } : {}),
      ...(fee_amount !== undefined ? { fee_amount: Number.isFinite(Number(fee_amount)) ? Number(fee_amount) : 0 } : {}),
      ...(teachersSpecified ? { teacher_id: primaryTeacherId } : {}),
      ...(validCategoryId !== undefined ? { category_id: validCategoryId } : {}),
      ...(hod_teacher_id !== undefined ? { hod_teacher_id: hod_teacher_id || null } : {}),
      ...(classesSpecified ? { class_id: primaryClassId } : {}),
      ...(finalLevelIds !== undefined ? { level_ids: finalLevelIds } : {}),
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

    if (teachersSpecified) {
      const { error: clearTeacherError } = await supabase
        .from("subject_teachers")
        .delete()
        .eq("subject_id", id)
        .eq("institution_id", institution_id);

      if (clearTeacherError) {
        return res.status(500).json({ error: clearTeacherError.message });
      }

      const effectiveHod = hod_teacher_id !== undefined ? hod_teacher_id : existing?.hod_teacher_id;
      const subjectTeacherRecords = [];
      const assignedPairs = new Set();

      if (Array.isArray(class_teacher_assignments) && class_teacher_assignments.length > 0) {
        for (const a of class_teacher_assignments) {
          if (a && a.teacher_id && a.class_id) {
            const key = `${id}_${a.class_id}_${a.teacher_id}`;
            if (!assignedPairs.has(key)) {
              assignedPairs.add(key);
              subjectTeacherRecords.push({
                subject_id: id,
                teacher_id: a.teacher_id,
                class_id: a.class_id,
                institution_id,
                is_hod: a.teacher_id === effectiveHod,
              });
            }
          }
        }
      } else if (allTeacherIds.length > 0) {
        for (const tid of allTeacherIds) {
          subjectTeacherRecords.push({
            subject_id: id,
            teacher_id: tid,
            institution_id,
            is_hod: tid === effectiveHod,
          });
        }
      }

      if (effectiveHod) {
        const hodRecorded = subjectTeacherRecords.some(r => r.teacher_id === effectiveHod && (!r.class_id || r.class_id === null));
        if (!hodRecorded) {
          subjectTeacherRecords.push({
            subject_id: id,
            teacher_id: effectiveHod,
            institution_id,
            is_hod: true,
          });
        }
      }

      if (subjectTeacherRecords.length > 0) {
        const { error: insertTeacherError } = await supabase
          .from("subject_teachers")
          .insert(subjectTeacherRecords);

        if (insertTeacherError && insertTeacherError.code !== "23505") {
          return res.status(500).json({ error: insertTeacherError.message });
        }
      }
    } else if (hod_teacher_id !== undefined) {
      // Reset is_hod flag for existing teachers of this subject
      await supabase
        .from("subject_teachers")
        .update({ is_hod: false })
        .eq("subject_id", id)
        .eq("institution_id", institution_id);

      if (hod_teacher_id) {
        const { data: existingLink } = await supabase
          .from("subject_teachers")
          .select("id")
          .eq("subject_id", id)
          .eq("teacher_id", hod_teacher_id)
          .maybeSingle();

        if (existingLink) {
          await supabase
            .from("subject_teachers")
            .update({ is_hod: true })
            .eq("id", existingLink.id);
        } else {
          await supabase
            .from("subject_teachers")
            .insert({
              subject_id: id,
              teacher_id: hod_teacher_id,
              class_id: null,
              institution_id,
              is_hod: true,
            });
        }
      }
    }

    if (classesSpecified) {
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
    }

    if (institution_id) {
      configCache.invalidateSubjects(institution_id);
    }
    req.params.id = id;
    return exports.getSubjectById(req, res);
  } catch (err) {
    console.error("updateSubject error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

// ── SUBJECT CATEGORIES CRUD ──────────────────────────────────────────────────

// GET /api/subject-categories
exports.getSubjectCategories = async (req, res) => {
  const { institution_id } = req;
  try {
    const { data: categories, error } = await supabase
      .from("subject_categories")
      .select(`
        *,
        subjects(count)
      `)
      .eq("institution_id", institution_id)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });

    if (error) {
      // In case relation metadata hasn't resolved
      const { data: rawCategories, error: rawError } = await supabase
        .from("subject_categories")
        .select("*")
        .eq("institution_id", institution_id)
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true });

      if (rawError) return res.status(500).json({ error: rawError.message });
      return res.json(rawCategories || []);
    }

    const formatted = (categories || []).map(cat => ({
      ...cat,
      subject_count: Array.isArray(cat.subjects) ? cat.subjects.length : (cat.subjects?.[0]?.count ?? 0),
    }));

    return res.json(formatted);
  } catch (err) {
    console.error("getSubjectCategories error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

// POST /api/subject-categories
exports.createSubjectCategory = async (req, res) => {
  const { institution_id, userRole } = req;
  if (!["admin", "master_admin"].includes(userRole)) {
    return res.status(403).json({ error: "Only admins can manage subject categories" });
  }

  const { name, description, color, sort_order } = req.body || {};
  if (!name || !name.trim()) {
    return res.status(400).json({ error: "Category name is required" });
  }

  try {
    const { data, error } = await supabase
      .from("subject_categories")
      .insert([
        {
          institution_id,
          name: name.trim(),
          description: description?.trim() || null,
          color: color?.trim() || null,
          sort_order: Number.isFinite(Number(sort_order)) ? Number(sort_order) : 0,
        }
      ])
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return res.status(400).json({ error: "A category with this name already exists" });
      }
      return res.status(500).json({ error: error.message });
    }

    return res.status(201).json(data);
  } catch (err) {
    console.error("createSubjectCategory error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

// PUT /api/subject-categories/:id
exports.updateSubjectCategory = async (req, res) => {
  const { id } = req.params;
  const { institution_id, userRole } = req;
  if (!["admin", "master_admin"].includes(userRole)) {
    return res.status(403).json({ error: "Only admins can manage subject categories" });
  }

  const { name, description, color, sort_order } = req.body || {};

  try {
    const updatePayload = {};
    if (name !== undefined) {
      if (!name || !name.trim()) {
        return res.status(400).json({ error: "Category name cannot be empty" });
      }
      updatePayload.name = name.trim();
    }
    if (description !== undefined) updatePayload.description = description?.trim() || null;
    if (color !== undefined) updatePayload.color = color?.trim() || null;
    if (sort_order !== undefined) updatePayload.sort_order = Number.isFinite(Number(sort_order)) ? Number(sort_order) : 0;
    updatePayload.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from("subject_categories")
      .update(updatePayload)
      .eq("id", id)
      .eq("institution_id", institution_id)
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return res.status(400).json({ error: "A category with this name already exists" });
      }
      return res.status(500).json({ error: error.message });
    }

    return res.json(data);
  } catch (err) {
    console.error("updateSubjectCategory error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

// DELETE /api/subject-categories/:id
exports.deleteSubjectCategory = async (req, res) => {
  const { id } = req.params;
  const { institution_id, userRole } = req;
  const confirm = req.query.confirm === "true" || req.body?.confirm === true;

  if (!["admin", "master_admin"].includes(userRole)) {
    return res.status(403).json({ error: "Only admins can manage subject categories" });
  }

  try {
    // Check how many subjects use this category
    const { data: assignedSubjects, error: checkError } = await supabase
      .from("subjects")
      .select("id, title")
      .eq("category_id", id)
      .eq("institution_id", institution_id);

    if (checkError) return res.status(500).json({ error: checkError.message });

    const count = (assignedSubjects || []).length;
    if (count > 0 && !confirm) {
      return res.status(409).json({
        error: `Category is currently assigned to ${count} subject${count === 1 ? '' : 's'}. Deleting it will unassign those subjects. Please confirm deletion.`,
        code: "CATEGORY_IN_USE",
        assigned_count: count,
        subjects: assignedSubjects.map(s => ({ id: s.id, title: s.title })),
      });
    }

    // If confirmed and in use, unassign subjects first
    if (count > 0) {
      const { error: unassignError } = await supabase
        .from("subjects")
        .update({ category_id: null })
        .eq("category_id", id)
        .eq("institution_id", institution_id);

      if (unassignError) return res.status(500).json({ error: unassignError.message });
    }

    const { error: deleteError } = await supabase
      .from("subject_categories")
      .delete()
      .eq("id", id)
      .eq("institution_id", institution_id);

    if (deleteError) return res.status(500).json({ error: deleteError.message });

    if (institution_id) {
      configCache.invalidateSubjects(institution_id);
    }

    return res.json({
      message: "Subject category deleted successfully",
      unassigned_subjects_count: count
    });
  } catch (err) {
    console.error("deleteSubjectCategory error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

