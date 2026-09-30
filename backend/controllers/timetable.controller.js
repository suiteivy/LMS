// controllers/timetable.controller.js
const supabase = require("../utils/supabaseClient.js");
const { buildClassLabel } = require('../utils/classLabel');
const { recomputeForTimetableDayMutation } = require('../services/dailyHours.service.js');
const { getStudentCurrentClassEnrollment } = require('../utils/studentClassEnrollment');
const { solveTimetable } = require('../services/timetableSolver.service.js');

// ── Shared helpers ────────────────────────────────────────────────────────────

const toMin = (t) => {
  if (!t) return 0;
  const [h, m] = t.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
};

const overlaps = (s1, e1, s2, e2) => s1 < e2 && s2 < e1;

async function resolveClassRoomLabel(class_id, institution_id) {
  if (!class_id) return null;
  const { data: cls } = await supabase
    .from("classes")
    .select("id, name, display_name, grade_level, form_level, stream, class_type")
    .eq("id", class_id)
    .eq("institution_id", institution_id)
    .maybeSingle();

  if (!cls) return null;
  return buildClassLabel(cls);
}

async function validateClassAndSubject({ class_id, subject_id, institution_id }) {
  const { data: cls, error: classError } = await supabase
    .from("classes")
    .select("id, name, display_name, grade_level, form_level, stream, class_type")
    .eq("id", class_id)
    .eq("institution_id", institution_id)
    .single();

  if (classError || !cls) {
    return { ok: false, status: 400, error: "Invalid class for institution", classObj: null };
  }

  const { data: subject, error: subjectError } = await supabase
    .from("subjects")
    .select("id,class_id,teacher_id,metadata,title")
    .eq("id", subject_id)
    .eq("institution_id", institution_id)
    .single();

  if (subjectError || !subject) {
    return { ok: false, status: 400, error: "Invalid subject for institution", classObj: cls, subjectObj: null };
  }

  const { data: links, error: linkError } = await supabase
    .from("subject_classes")
    .select("class_id")
    .eq("institution_id", institution_id)
    .eq("subject_id", subject_id);

  if (linkError && linkError.code !== "42P01") {
    throw linkError;
  }

  let allowedClassIds = [];
  if (!linkError) {
    allowedClassIds = (links || []).map((l) => l.class_id).filter(Boolean);
  }

  if (allowedClassIds.length === 0) {
    const metadataClassIds = Array.isArray(subject?.metadata?.class_ids)
      ? subject.metadata.class_ids
      : [];
    allowedClassIds = [
      ...(subject.class_id ? [subject.class_id] : []),
      ...metadataClassIds,
    ];
  }

  if (allowedClassIds.length > 0 && !allowedClassIds.includes(class_id)) {
    return {
      ok: false,
      status: 400,
      error: "Selected subject is not assigned to this class",
      classObj: cls,
      subjectObj: subject,
    };
  }

  return { ok: true, classObj: cls, subjectObj: subject };
}

async function resolveTeacherIdForUser(userId) {
  const { data: teacher } = await supabase
    .from('teachers')
    .select('id')
    .eq('user_id', userId)
    .single();
  return teacher?.id || null;
}

async function isTeacherAllowedClassTimetable({ teacherId, class_id, institution_id }) {
  if (!teacherId || !class_id || !institution_id) return false;

  const { data: classTeacherRow, error: classTeacherError } = await supabase
    .from('classes')
    .select('id')
    .eq('id', class_id)
    .eq('institution_id', institution_id)
    .eq('teacher_id', teacherId)
    .maybeSingle();

  if (classTeacherError) throw classTeacherError;
  if (classTeacherRow) return true;

  const { data: primarySubjects, error: primarySubjectsError } = await supabase
    .from('subjects')
    .select('id')
    .eq('class_id', class_id)
    .eq('teacher_id', teacherId)
    .eq('institution_id', institution_id)
    .limit(1);

  if (primarySubjectsError) throw primarySubjectsError;
  if ((primarySubjects || []).length > 0) return true;

  const { data: linkedSubjectRows, error: linkedSubjectRowsError } = await supabase
    .from('subject_teachers')
    .select('subject_id')
    .eq('teacher_id', teacherId)
    .eq('institution_id', institution_id);

  if (linkedSubjectRowsError) throw linkedSubjectRowsError;

  const linkedSubjectIds = (linkedSubjectRows || []).map((row) => row.subject_id).filter(Boolean);
  if (linkedSubjectIds.length === 0) return false;

  const { data: linkedSubjectClassMatches, error: linkedSubjectClassMatchesError } = await supabase
    .from('subject_classes')
    .select('subject_id')
    .eq('institution_id', institution_id)
    .eq('class_id', class_id)
    .in('subject_id', linkedSubjectIds)
    .limit(1);

  if (linkedSubjectClassMatchesError && linkedSubjectClassMatchesError.code !== '42P01') {
    throw linkedSubjectClassMatchesError;
  }

  if ((linkedSubjectClassMatches || []).length > 0) return true;

  const { data: linkedSubjectMatches, error: linkedSubjectMatchesError } = await supabase
    .from('subjects')
    .select('id')
    .in('id', linkedSubjectIds)
    .eq('class_id', class_id)
    .eq('institution_id', institution_id)
    .limit(1);

  if (linkedSubjectMatchesError) throw linkedSubjectMatchesError;
  return (linkedSubjectMatches || []).length > 0;
}

async function isParentAllowedClassTimetable({ userId, class_id, institution_id }) {
  if (!userId || !class_id || !institution_id) return false;

  const { data: parent } = await supabase
    .from('parents')
    .select('id')
    .eq('user_id', userId)
    .single();

  if (!parent?.id) return false;

  const { data: links, error: linksError } = await supabase
    .from('parent_students')
    .select('student_id')
    .eq('parent_id', parent.id);

  if (linksError) throw linksError;
  const linkedStudentIds = (links || []).map((row) => row.student_id).filter(Boolean);
  if (linkedStudentIds.length === 0) return false;

  const enrollments = await Promise.all(
    linkedStudentIds.map((studentId) => getStudentCurrentClassEnrollment(studentId, institution_id))
  );

  const allowedClassIds = new Set(
    enrollments.map((enrollment) => enrollment?.class_id).filter(Boolean)
  );

  return allowedClassIds.has(class_id);
}

async function canAccessClassTimetable({ userRole, userId, class_id, institution_id }) {
  if (['admin', 'master_admin'].includes(userRole)) {
    return true;
  }

  if (userRole === 'student') {
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('id')
      .eq('user_id', userId)
      .eq('institution_id', institution_id)
      .single();

    if (studentError || !student) return false;

    const enrollment = await getStudentCurrentClassEnrollment(student.id, institution_id);
    return !!enrollment?.class_id && enrollment.class_id === class_id;
  }

  if (userRole === 'teacher') {
    const teacherId = await resolveTeacherIdForUser(userId);
    return isTeacherAllowedClassTimetable({ teacherId, class_id, institution_id });
  }

  if (userRole === 'parent') {
    return isParentAllowedClassTimetable({ userId, class_id, institution_id });
  }

  return false;
}

/**
 * Run institution-wide conflict checks before inserting/updating.
 * Note: room_number represents the class's identity/name (e.g. "Grade 4 East").
 * Physical room clash is NOT performed per system specification.
 * Parallel elective slots for Senior Secondary are permitted if subjects/teachers differ.
 */
async function checkConflicts(
  { class_id, subject_id, teacher_id, day_of_week, start_time, end_time, is_elective, track_id },
  institution_id,
  excludeId = null,
) {
  const issues = [];

  let query = supabase
    .from("timetables")
    .select(
      "id, class_id, subject_id, teacher_id, start_time, end_time, room_number, is_elective, track_id, is_draft"
    )
    .eq("institution_id", institution_id)
    .eq("day_of_week", day_of_week);

  if (excludeId) query = query.neq("id", excludeId);

  const { data: existing } = await query;
  if (!existing || existing.length === 0) return issues;

  const ns = toMin(start_time);
  const ne = toMin(end_time);

  // Resolve incoming teacher IDs: explicit teacher_id or subject linked teachers
  let incomingTeacherIds = new Set();
  if (teacher_id) {
    incomingTeacherIds.add(teacher_id);
  } else if (subject_id) {
    let classTeacherFound = false;
    if (class_id) {
      const { data: classAssoc } = await supabase
        .from("subject_teachers")
        .select("teacher_id")
        .eq("subject_id", subject_id)
        .eq("class_id", class_id)
        .limit(1);
      if (classAssoc && classAssoc.length > 0 && classAssoc[0].teacher_id) {
        incomingTeacherIds.add(classAssoc[0].teacher_id);
        classTeacherFound = true;
      }
    }
    if (!classTeacherFound) {
      const { data: primaryRow } = await supabase
        .from("subjects")
        .select("teacher_id")
        .eq("id", subject_id)
        .single();
      const { data: assocRows } = await supabase
        .from("subject_teachers")
        .select("teacher_id")
        .eq("subject_id", subject_id);

      if (primaryRow?.teacher_id) incomingTeacherIds.add(primaryRow.teacher_id);
      (assocRows || []).forEach(r => { if (r.teacher_id) incomingTeacherIds.add(r.teacher_id); });
    }
  }

  for (const e of existing) {
    const es = toMin(e.start_time);
    const ee = toMin(e.end_time);
    if (!overlaps(ns, ne, es, ee)) continue;

    // Class double-booking:
    if (e.class_id === class_id) {
      issues.push(
        `This class already has a subject scheduled at overlapping times (${e.start_time.slice(0, 5)}–${e.end_time.slice(0, 5)})`
      );
    }

    // Teacher double-booking (institution-wide):
    let existingTeacherIds = new Set();
    if (e.teacher_id) {
      existingTeacherIds.add(e.teacher_id);
    } else if (e.subject_id) {
      let existingClassTeacherFound = false;
      if (e.class_id) {
        const { data: existingClassAssoc } = await supabase
          .from("subject_teachers")
          .select("teacher_id")
          .eq("subject_id", e.subject_id)
          .eq("class_id", e.class_id)
          .limit(1);
        if (existingClassAssoc && existingClassAssoc.length > 0 && existingClassAssoc[0].teacher_id) {
          existingTeacherIds.add(existingClassAssoc[0].teacher_id);
          existingClassTeacherFound = true;
        }
      }
      if (!existingClassTeacherFound) {
        const { data: existingPrimary } = await supabase
          .from("subjects")
          .select("teacher_id")
          .eq("id", e.subject_id)
          .single();
        const { data: existingAssoc } = await supabase
          .from("subject_teachers")
          .select("teacher_id")
          .eq("subject_id", e.subject_id);

        if (existingPrimary?.teacher_id) existingTeacherIds.add(existingPrimary.teacher_id);
        (existingAssoc || []).forEach(r => { if (r.teacher_id) existingTeacherIds.add(r.teacher_id); });
      }
    }

    let hasTeacherConflict = false;
    for (const tid of existingTeacherIds) {
      if (incomingTeacherIds.has(tid)) {
        hasTeacherConflict = true;
        break;
      }
    }

    if (hasTeacherConflict && e.class_id !== class_id) {
      issues.push(
        `The assigned teacher is already teaching another class at overlapping times on ${day_of_week} (${e.start_time.slice(0, 5)}–${e.end_time.slice(0, 5)})`
      );
    }
  }

  return issues;
}

/**
 * Live Conflict Detection Endpoint for Step-by-Step Manual Builder
 */
async function liveCheckConflict(req, res) {
  try {
    const { userRole, institution_id } = req;
    if (!["admin", "master_admin"].includes(userRole)) {
      return res.status(403).json({ error: "Admin only." });
    }

    const {
      class_id,
      subject_id,
      teacher_id,
      day_of_week,
      start_time,
      end_time,
      exclude_id,
      is_elective,
      track_id
    } = req.body;

    if (!class_id || !day_of_week || !start_time || !end_time) {
      return res.status(400).json({ error: "Missing minimum required fields (class_id, day_of_week, start_time, end_time)" });
    }

    const conflicts = await checkConflicts(
      { class_id, subject_id, teacher_id, day_of_week, start_time, end_time, is_elective, track_id },
      institution_id,
      exclude_id
    );

    res.json({
      has_conflict: conflicts.length > 0,
      conflicts
    });
  } catch (err) {
    console.error("Live check conflict error:", err);
    res.status(500).json({ error: err.message });
  }
}

/**
 * Get Institution Timetable Configuration
 */
async function getTimetableConfig(req, res) {
  try {
    const { institution_id } = req;
    if (!institution_id) {
      return res.status(400).json({ error: "Missing institution context" });
    }

    const { data: config, error } = await supabase
      .from("timetable_configs")
      .select("*")
      .eq("institution_id", institution_id)
      .maybeSingle();

    if (error && error.code !== "PGRST116") {
      throw error;
    }

    if (config) {
      return res.json(config);
    }

    const defaultConfig = {
      institution_id,
      days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      periods: [
        { period_number: 1, start_time: "08:00", end_time: "08:45", is_break: false, label: "Lesson 1" },
        { period_number: 2, start_time: "08:45", end_time: "09:30", is_break: false, label: "Lesson 2" },
        { period_number: 3, start_time: "09:30", end_time: "10:15", is_break: false, label: "Lesson 3" },
        { period_number: 4, start_time: "10:15", end_time: "10:45", is_break: true, label: "Short Break" },
        { period_number: 5, start_time: "10:45", end_time: "11:30", is_break: false, label: "Lesson 4" },
        { period_number: 6, start_time: "11:30", end_time: "12:15", is_break: false, label: "Lesson 5" },
        { period_number: 7, start_time: "12:15", end_time: "13:00", is_break: false, label: "Lesson 6" },
        { period_number: 8, start_time: "13:00", end_time: "14:00", is_break: true, label: "Lunch Break" },
        { period_number: 9, start_time: "14:00", end_time: "14:45", is_break: false, label: "Lesson 7" },
        { period_number: 10, start_time: "14:45", end_time: "15:30", is_break: false, label: "Lesson 8" }
      ],
      max_teacher_periods_per_day: 6,
      max_teacher_periods_per_week: 28,
      settings: {
        allow_double_periods: true,
        default_lesson_duration_minutes: 45
      }
    };

    res.json(defaultConfig);
  } catch (err) {
    console.error("Get timetable config error:", err);
    res.status(500).json({ error: err.message });
  }
}

/**
 * Save / Update Institution Timetable Configuration
 */
async function saveTimetableConfig(req, res) {
  try {
    const { userRole, institution_id } = req;
    if (!["admin", "master_admin"].includes(userRole)) {
      return res.status(403).json({ error: "Admin only." });
    }

    const {
      days,
      periods,
      max_teacher_periods_per_day,
      max_teacher_periods_per_week,
      settings
    } = req.body;

    if (!Array.isArray(days) || days.length === 0) {
      return res.status(400).json({ error: "At least one active school day must be selected." });
    }

    if (!Array.isArray(periods) || periods.length === 0) {
      return res.status(400).json({ error: "At least one teaching period must be configured." });
    }

    const payload = {
      institution_id,
      days,
      periods,
      max_teacher_periods_per_day: Number(max_teacher_periods_per_day) || 6,
      max_teacher_periods_per_week: Number(max_teacher_periods_per_week) || 28,
      settings: settings || { allow_double_periods: true },
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from("timetable_configs")
      .upsert(payload, { onConflict: "institution_id" })
      .select()
      .single();

    if (error) throw error;

    res.json({ message: "Timetable configuration saved successfully.", config: data });
  } catch (err) {
    console.error("Save timetable config error:", err);
    res.status(500).json({ error: err.message });
  }
}

/**
 * Timetable Readiness Verification Checklist
 */
async function getTimetableReadiness(req, res) {
  try {
    const { institution_id } = req;
    if (!institution_id) {
      return res.status(400).json({ error: "Missing institution context" });
    }

    const checks = [];
    const unmet = [];

    // 1. Active classes
    const { data: classes, error: classErr } = await supabase
      .from("classes")
      .select("id, name, display_name, grade_level, form_level, stream, class_type")
      .eq("institution_id", institution_id);

    if (classErr) throw classErr;
    const classCount = (classes || []).length;
    if (classCount === 0) {
      checks.push({
        key: "classes",
        title: "Active Classes",
        passed: false,
        details: "No active classes found in the institution. Add classes before generating a timetable."
      });
      unmet.push("No active classes exist.");
    } else {
      checks.push({
        key: "classes",
        title: "Active Classes",
        passed: true,
        details: `${classCount} active class(es) registered.`
      });
    }

    // 2. Active Subjects mapped to classes
    const { data: subjects, error: subjErr } = await supabase
      .from("subjects")
      .select("id, title, class_id, teacher_id, metadata")
      .eq("institution_id", institution_id);

    if (subjErr) throw subjErr;
    const { data: subjClasses } = await supabase
      .from("subject_classes")
      .select("subject_id, class_id")
      .eq("institution_id", institution_id);

    const classSubjectMap = new Map();
    (classes || []).forEach(c => classSubjectMap.set(c.id, []));

    (subjects || []).forEach(s => {
      if (s.class_id && classSubjectMap.has(s.class_id)) {
        classSubjectMap.get(s.class_id).push(s.id);
      }
      const metaClasses = Array.isArray(s.metadata?.class_ids) ? s.metadata.class_ids : [];
      metaClasses.forEach(cId => {
        if (classSubjectMap.has(cId) && !classSubjectMap.get(cId).includes(s.id)) {
          classSubjectMap.get(cId).push(s.id);
        }
      });
    });

    (subjClasses || []).forEach(sc => {
      if (classSubjectMap.has(sc.class_id) && !classSubjectMap.get(sc.class_id).includes(sc.subject_id)) {
        classSubjectMap.get(sc.class_id).push(sc.subject_id);
      }
    });

    const classesWithoutSubjects = (classes || []).filter(c => (classSubjectMap.get(c.id) || []).length === 0);

    if (classesWithoutSubjects.length > 0) {
      const names = classesWithoutSubjects.map(c => buildClassLabel(c)).slice(0, 3).join(", ");
      const more = classesWithoutSubjects.length > 3 ? ` and ${classesWithoutSubjects.length - 3} more` : '';
      checks.push({
        key: "subjects",
        title: "Subject-Class Mappings",
        passed: false,
        details: `${classesWithoutSubjects.length} class(es) (${names}${more}) have no mapped subjects.`
      });
      unmet.push(`${classesWithoutSubjects.length} class(es) lack subject mappings.`);
    } else {
      checks.push({
        key: "subjects",
        title: "Subject-Class Mappings",
        passed: true,
        details: `All ${classCount} class(es) have active subject allocations.`
      });
    }

    // 3. Teacher Allocations
    const { data: subjectTeachers } = await supabase
      .from("subject_teachers")
      .select("subject_id, teacher_id")
      .eq("institution_id", institution_id);

    const subjectTeachersSet = new Set((subjectTeachers || []).map(st => st.subject_id));
    const subjectsWithoutTeacher = (subjects || []).filter(s => !s.teacher_id && !subjectTeachersSet.has(s.id));

    if (subjectsWithoutTeacher.length > 0) {
      const sampleTitles = subjectsWithoutTeacher.map(s => s.title).slice(0, 3).join(", ");
      const more = subjectsWithoutTeacher.length > 3 ? ` and ${subjectsWithoutTeacher.length - 3} more` : '';
      checks.push({
        key: "teachers",
        title: "Teacher Allocations",
        passed: false,
        details: `${subjectsWithoutTeacher.length} subject(s) (${sampleTitles}${more}) have no assigned primary or assistant teacher.`
      });
      unmet.push(`${subjectsWithoutTeacher.length} subject(s) have no assigned teacher.`);
    } else {
      checks.push({
        key: "teachers",
        title: "Teacher Allocations",
        passed: true,
        details: `All subjects have designated eligible teachers.`
      });
    }

    // 4. Period Budget & Schedule Configuration
    const { data: config } = await supabase
      .from("timetable_configs")
      .select("*")
      .eq("institution_id", institution_id)
      .maybeSingle();

    const days = config?.days || ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
    const teachingPeriods = (config?.periods || []).filter(p => !p.is_break);
    const totalWeeklySlots = days.length * (teachingPeriods.length || 8);

    if (!config || teachingPeriods.length === 0) {
      checks.push({
        key: "period_budget",
        title: "Period Budget & Schedule Config",
        passed: false,
        details: "No timetable schedule or periods configured. Save a timetable configuration first."
      });
      unmet.push("Schedule periods have not been configured.");
    } else {
      checks.push({
        key: "period_budget",
        title: "Period Budget & Schedule Config",
        passed: true,
        details: `${days.length} days with ${teachingPeriods.length} teaching periods (${totalWeeklySlots} total slots/week).`
      });
    }

    // 5. Subject Categorization
    const categorizedSubjects = (subjects || []).filter(s => !!s.category);
    checks.push({
      key: "subject_categories",
      title: "Subject Categorization",
      passed: true,
      details: categorizedSubjects.length > 0
        ? `${categorizedSubjects.length} of ${subjects.length} subject(s) have assigned curriculum categories.`
        : `All ${subjects.length} subject(s) are ready for scheduling.`
    });

    const ready = unmet.length === 0;

    res.json({
      ready,
      checks,
      unmet_prerequisites: unmet
    });
  } catch (err) {
    console.error("Get timetable readiness error:", err);
    res.status(500).json({ error: err.message });
  }
}

/**
 * Automatic Timetable Generation Endpoint
 */
async function generateTimetable(req, res) {
  try {
    const { userRole, institution_id } = req;
    if (!["admin", "master_admin"].includes(userRole)) {
      return res.status(403).json({ error: "Admin only." });
    }

    const {
      save_as_draft = true,
      target_class_ids = null,
      replace_active = false
    } = req.body;

    const { data: config } = await supabase
      .from("timetable_configs")
      .select("*")
      .eq("institution_id", institution_id)
      .maybeSingle();

    const days = config?.days || ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
    const rawPeriods = config?.periods || [
      { period_number: 1, start_time: "08:00", end_time: "08:45", is_break: false },
      { period_number: 2, start_time: "08:45", end_time: "09:30", is_break: false },
      { period_number: 3, start_time: "09:30", end_time: "10:15", is_break: false },
      { period_number: 4, start_time: "10:15", end_time: "10:45", is_break: true },
      { period_number: 5, start_time: "10:45", end_time: "11:30", is_break: false },
      { period_number: 6, start_time: "11:30", end_time: "12:15", is_break: false },
      { period_number: 7, start_time: "12:15", end_time: "13:00", is_break: false },
      { period_number: 8, start_time: "13:00", end_time: "14:00", is_break: true },
      { period_number: 9, start_time: "14:00", end_time: "14:45", is_break: false },
      { period_number: 10, start_time: "14:45", end_time: "15:30", is_break: false }
    ];

    const teachingPeriods = rawPeriods.filter(p => !p.is_break);
    if (teachingPeriods.length === 0) {
      return res.status(400).json({ error: "No teaching periods configured." });
    }

    let classQuery = supabase
      .from("classes")
      .select("id, name, display_name, grade_level, form_level, stream, class_type")
      .eq("institution_id", institution_id);

    if (Array.isArray(target_class_ids) && target_class_ids.length > 0) {
      classQuery = classQuery.in("id", target_class_ids);
    }

    const { data: classesData, error: classErr } = await classQuery;
    if (classErr) throw classErr;
    if (!classesData || classesData.length === 0) {
      return res.status(400).json({ error: "No classes available for generation." });
    }

    const classes = classesData.map(c => ({
      id: c.id,
      name: buildClassLabel(c),
      level: c.grade_level || c.form_level
    }));

    const { data: teachersData } = await supabase
      .from("teachers")
      .select("id, full_name, user_id, users(full_name)")
      .eq("institution_id", institution_id);

    const teachers = (teachersData || []).map(t => ({
      id: t.id,
      name: t.full_name || t.users?.full_name || `Teacher ${t.id}`
    }));

    const { data: subjectsData } = await supabase
      .from("subjects")
      .select("id, title, class_id, teacher_id, metadata")
      .eq("institution_id", institution_id);

    const { data: subjectClassesData } = await supabase
      .from("subject_classes")
      .select("subject_id, class_id")
      .eq("institution_id", institution_id);

    const { data: subjectTeachersData } = await supabase
      .from("subject_teachers")
      .select("subject_id, teacher_id")
      .eq("institution_id", institution_id);

    const subjectTeachersMap = new Map();
    (subjectTeachersData || []).forEach(st => {
      if (!subjectTeachersMap.has(st.subject_id)) subjectTeachersMap.set(st.subject_id, new Set());
      subjectTeachersMap.get(st.subject_id).add(st.teacher_id);
    });

    const subjectRequirements = [];

    for (const cls of classes) {
      const classId = cls.id;
      const mappedSubjectIds = new Set();

      (subjectsData || []).forEach(s => {
        if (s.class_id === classId) mappedSubjectIds.add(s.id);
        const metaIds = Array.isArray(s.metadata?.class_ids) ? s.metadata.class_ids : [];
        if (metaIds.includes(classId)) mappedSubjectIds.add(s.id);
      });

      (subjectClassesData || []).forEach(sc => {
        if (sc.class_id === classId) mappedSubjectIds.add(sc.subject_id);
      });

      const totalSlotsForClass = days.length * teachingPeriods.length;
      const numSubjects = mappedSubjectIds.size;
      const defaultPeriodsPerSubj = numSubjects > 0 ? Math.max(2, Math.floor((totalSlotsForClass - 2) / numSubjects)) : 4;

      for (const subjId of mappedSubjectIds) {
        const subj = (subjectsData || []).find(s => s.id === subjId);
        if (!subj) continue;

        const eligible = new Set();
        if (subj.teacher_id) eligible.add(subj.teacher_id);
        const assoc = subjectTeachersMap.get(subjId);
        if (assoc) {
          assoc.forEach(tId => eligible.add(tId));
        }

        if (eligible.size === 0 && teachers.length > 0) {
          eligible.add(teachers[0].id);
        }

        const periodsBudget = Number(subj.metadata?.periods_per_week) || defaultPeriodsPerSubj;

        subjectRequirements.push({
          class_id: classId,
          subject_id: subjId,
          subject_name: subj.title,
          periods_per_week: periodsBudget,
          eligible_teachers: Array.from(eligible),
          category: subj.category || null,
          allow_double: subj.metadata?.allow_double !== false,
          max_per_day: 2
        });
      }
    }

    const solverPayload = {
      institution_id,
      days,
      periods: rawPeriods,
      classes,
      teachers,
      subject_requirements: subjectRequirements,
      senior_secondary_tracks: [],
      teacher_max_periods_per_day: Number(config?.max_teacher_periods_per_day) || 6,
      teacher_max_periods_per_week: Number(config?.max_teacher_periods_per_week) || 28
    };

    const solveResult = await solveTimetable(solverPayload);

    if (!solveResult.success) {
      return res.status(422).json({
        success: false,
        status: solveResult.status || "INFEASIBLE",
        diagnostics: solveResult.diagnostics || [solveResult.error || "Schedule constraint satisfaction failed."]
      });
    }

    const generatedEntries = solveResult.entries || [];

    if (save_as_draft) {
      const targetClassIdList = classes.map(c => c.id);

      await supabase
        .from("timetables")
        .delete()
        .eq("institution_id", institution_id)
        .eq("is_draft", true)
        .in("class_id", targetClassIdList);

      if (replace_active) {
        await supabase
          .from("timetables")
          .delete()
          .eq("institution_id", institution_id)
          .in("class_id", targetClassIdList);
      }

      const rowsToInsert = generatedEntries.map(e => ({
        institution_id,
        class_id: e.class_id,
        subject_id: e.subject_id,
        teacher_id: e.teacher_id,
        day_of_week: e.day_of_week,
        period_number: e.period_number,
        start_time: e.start_time,
        end_time: e.end_time,
        room_number: e.room_number,
        is_draft: !replace_active
      }));

      for (let i = 0; i < rowsToInsert.length; i += 50) {
        const chunk = rowsToInsert.slice(i, i + 50);
        const { error: insErr } = await supabase.from("timetables").insert(chunk);
        if (insErr) throw insErr;
      }
    }

    res.json({
      success: true,
      message: replace_active ? "Timetable generated and published directly." : "Timetable generated successfully as draft.",
      total_scheduled: generatedEntries.length,
      solver_engine: solveResult.solver_engine,
      entries: generatedEntries
    });
  } catch (err) {
    console.error("Generate timetable error:", err);
    res.status(500).json({ error: err.message });
  }
}

/**
 * Publish Timetable
 */
async function publishTimetable(req, res) {
  try {
    const { userRole, institution_id } = req;
    if (!["admin", "master_admin"].includes(userRole)) {
      return res.status(403).json({ error: "Admin only." });
    }

    const { class_ids = null } = req.body;

    let draftQuery = supabase
      .from("timetables")
      .select("id, class_id, day_of_week")
      .eq("institution_id", institution_id)
      .eq("is_draft", true);

    if (Array.isArray(class_ids) && class_ids.length > 0) {
      draftQuery = draftQuery.in("class_id", class_ids);
    }

    const { data: drafts, error: draftErr } = await draftQuery;
    if (draftErr) throw draftErr;

    if (!drafts || drafts.length === 0) {
      return res.status(400).json({ error: "No draft timetable entries found to publish." });
    }

    const affectedClassIds = [...new Set(drafts.map(d => d.class_id))];
    const affectedDays = [...new Set(drafts.map(d => d.day_of_week))];

    let deleteActiveQuery = supabase
      .from("timetables")
      .delete()
      .eq("institution_id", institution_id)
      .or("is_draft.is.null,is_draft.eq.false")
      .in("class_id", affectedClassIds);

    const { error: delErr } = await deleteActiveQuery;
    if (delErr) throw delErr;

    let updateQuery = supabase
      .from("timetables")
      .update({ is_draft: false })
      .eq("institution_id", institution_id)
      .eq("is_draft", true)
      .in("class_id", affectedClassIds);

    const { error: updateErr } = await updateQuery;
    if (updateErr) throw updateErr;

    for (const day of affectedDays) {
      try {
        await recomputeForTimetableDayMutation({ institution_id, day_name: day });
      } catch (hErr) {
        console.warn(`[Timetable] daily hours recompute warning for ${day}:`, hErr.message);
      }
    }

    res.json({
      message: "Timetable published successfully.",
      published_count: drafts.length,
      affected_classes: affectedClassIds.length
    });
  } catch (err) {
    console.error("Publish timetable error:", err);
    res.status(500).json({ error: err.message });
  }
}

/**
 * Create a new timetable entry — Admin only
 */
async function createTimetableEntry(req, res) {
  try {
    const { userRole, institution_id } = req;
    if (!["admin", "master_admin"].includes(userRole)) {
      return res.status(403).json({ error: "Admin only." });
    }

    const {
      class_id,
      subject_id,
      teacher_id,
      day_of_week,
      start_time,
      end_time,
      room_number,
      is_draft = false,
      is_elective = false,
      track_id = null
    } = req.body;

    if (!class_id || !subject_id || !day_of_week || !start_time || !end_time) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const classSubjectValidation = await validateClassAndSubject({
      class_id,
      subject_id,
      institution_id,
    });
    if (!classSubjectValidation.ok) {
      return res
        .status(classSubjectValidation.status)
        .json({ error: classSubjectValidation.error });
    }

    let finalTeacherId = teacher_id;
    if (!finalTeacherId) {
      finalTeacherId = classSubjectValidation.subjectObj?.teacher_id || null;
    }

    let finalRoomNumber = room_number;
    if (!finalRoomNumber || !finalRoomNumber.trim()) {
      finalRoomNumber = buildClassLabel(classSubjectValidation.classObj);
    }

    const issues = await checkConflicts(
      { class_id, subject_id, teacher_id: finalTeacherId, day_of_week, start_time, end_time, is_elective, track_id },
      institution_id,
    );
    if (issues.length > 0) {
      return res.status(409).json({ error: issues[0], conflicts: issues });
    }

    const { data, error } = await supabase
      .from("timetables")
      .insert([
        {
          class_id,
          subject_id,
          teacher_id: finalTeacherId,
          day_of_week,
          start_time,
          end_time,
          room_number: finalRoomNumber,
          is_draft: !!is_draft,
          is_elective: !!is_elective,
          track_id,
          institution_id,
        },
      ])
      .select()
      .single();

    if (error) throw error;

    if (!is_draft) {
      try {
        await recomputeForTimetableDayMutation({ institution_id, day_name: day_of_week });
      } catch (hoursError) {
        console.error('[Timetable] daily hours recompute failed after create:', hoursError?.message || hoursError);
      }
    }

    res.status(201).json({ message: "Timetable entry created", entry: data });
  } catch (err) {
    console.error("Create timetable error:", err);
    res.status(500).json({ error: err.message });
  }
}

/**
 * Get timetable for a class
 */
async function getClassTimetable(req, res) {
  try {
    const { class_id } = req.params;
    const { userRole, userId } = req;
    const institution_id =
      req.institution_id && req.institution_id !== "null"
        ? req.institution_id
        : null;

    if (!institution_id)
      return res.status(400).json({ error: "Missing institution context" });

    const allowed = await canAccessClassTimetable({
      userRole,
      userId,
      class_id,
      institution_id,
    });

    if (!allowed) {
      return res.status(403).json({ error: 'Access denied for this class timetable' });
    }

    let query = supabase
      .from("timetables")
      .select(
        `
        id, class_id, subject_id, teacher_id, institution_id, day_of_week, start_time, end_time, room_number,
        is_draft, is_elective, track_id,
        subjects ( id, title, category, teacher_id ),
        teachers ( id, full_name, user_id, users(full_name) )
      `,
      )
      .eq("class_id", class_id)
      .eq("institution_id", institution_id);

    const includeDrafts = req.query.include_drafts === "true" && ["admin", "master_admin"].includes(userRole);
    if (!includeDrafts) {
      query = query.or("is_draft.is.null,is_draft.eq.false");
    }

    const { data, error } = await query
      .order("start_time", { ascending: true });

    if (error) throw error;

    const { data: cls } = await supabase
      .from("classes")
      .select("id, name, display_name, grade_level, form_level, stream, class_type")
      .eq("id", class_id)
      .maybeSingle();

    const classLabel = cls ? buildClassLabel(cls) : null;

    // Resolve per-class subject teacher assignments if row.teacher_id is not directly set
    const subjectIds = [...new Set((data || []).map(r => r.subject_id).filter(Boolean))];
    const classTeacherMap = new Map();
    if (subjectIds.length > 0) {
      const { data: stRows } = await supabase
        .from("subject_teachers")
        .select("subject_id, teacher_id, teachers ( id, full_name, user_id, users(full_name) )")
        .eq("class_id", class_id)
        .in("subject_id", subjectIds);
      if (stRows) {
        stRows.forEach(st => {
          if (st.teachers) {
            classTeacherMap.set(st.subject_id, st.teachers);
          }
        });
      }
    }

    const normalized = (data || []).map(row => {
      const classTeacher = classTeacherMap.get(row.subject_id);
      const effectiveTeacher = row.teachers || classTeacher;
      return {
        ...row,
        teachers: effectiveTeacher || null,
        room_number: row.room_number || classLabel || "Main Classroom",
        teacher_name: effectiveTeacher?.full_name || effectiveTeacher?.users?.full_name || null
      };
    });

    res.json(normalized);
  } catch (err) {
    console.error("Get class timetable error:", err);
    res.status(500).json({ error: err.message });
  }
}

/**
 * Get teacher's timetable
 */
async function getTeacherTimetable(req, res) {
  try {
    const institution_id =
      req.institution_id && req.institution_id !== "null"
        ? req.institution_id
        : null;
    if (!institution_id)
      return res.status(400).json({ error: "Missing institution context" });

    let teacherId = req.params.teacher_id;

    if (!teacherId && req.userRole === "teacher") {
      const { data: t } = await supabase
        .from("teachers")
        .select("id")
        .eq("user_id", req.userId)
        .single();
      teacherId = t?.id;
    }

    if (!teacherId)
      return res.status(400).json({ error: "Teacher ID required" });

    const reqRoleMode = req.headers["x-teacher-role-mode"] || req.query.role_mode;

    let ctClassIds = [];
    const { data: ctClasses } = await supabase
      .from("classes")
      .select("id")
      .eq("teacher_id", teacherId)
      .eq("institution_id", institution_id);
    if (ctClasses && ctClasses.length > 0) {
      ctClassIds = ctClasses.map((c) => c.id);
    }

    let activeMode = "subject";
    if (reqRoleMode === "class" && ctClassIds.length > 0) {
      activeMode = "class";
    } else if (reqRoleMode === "subject") {
      activeMode = "subject";
    } else if (ctClassIds.length > 0) {
      const { data: ps } = await supabase
        .from("subjects")
        .select("id")
        .eq("teacher_id", teacherId)
        .eq("institution_id", institution_id)
        .limit(1);
      if (!ps || ps.length === 0) {
        activeMode = "class";
      }
    }

    let timetableQuery = supabase
      .from("timetables")
      .select(
        `
        id, day_of_week, start_time, end_time, room_number, class_id, subject_id, teacher_id, is_draft, is_elective, track_id,
        classes ( id, name, display_name, grade_level, form_level, stream, class_type ),
        subjects ( id, title, category )
        `,
      )
      .eq("institution_id", institution_id)
      .or("is_draft.is.null,is_draft.eq.false");

    if (activeMode === "class") {
      if (ctClassIds.length === 0) return res.json([]);
      timetableQuery = timetableQuery.in("class_id", ctClassIds);
    } else {
      const { data: primarySubjectRows } = await supabase
        .from("subjects")
        .select("id")
        .eq("teacher_id", teacherId)
        .eq("institution_id", institution_id);

      const { data: assocSubjectRows } = await supabase
        .from("subject_teachers")
        .select("subject_id, class_id")
        .eq("teacher_id", teacherId)
        .eq("institution_id", institution_id);

      const primarySubjectIds = (primarySubjectRows || []).map((s) => s.id);
      const assocSubjectIds = (assocSubjectRows || []).map((s) => s.subject_id);
      const subjectIds = [...new Set([...primarySubjectIds, ...assocSubjectIds])];

      if (subjectIds.length === 0) {
        timetableQuery = timetableQuery.eq("teacher_id", teacherId);
      } else {
        timetableQuery = timetableQuery.or(`teacher_id.eq.${teacherId},subject_id.in.(${subjectIds.join(',')})`);
      }
    }

    const { data, error } = await timetableQuery
      .order("day_of_week", { ascending: true })
      .order("start_time", { ascending: true });

    if (error) throw error;

    // Filter to ensure that if timetable row is assigned via subject_id, teacher is actually assigned to that class
    let filteredData = data || [];
    if (activeMode !== "class" && filteredData.length > 0) {
      const { data: allStForSubjs } = await supabase
        .from("subject_teachers")
        .select("subject_id, class_id, teacher_id")
        .eq("institution_id", institution_id);

      filteredData = filteredData.filter((row) => {
        if (row.teacher_id === teacherId) return true;
        // Check if there is an explicit per-class assignment for this subject and class
        const classAssignments = (allStForSubjs || []).filter(
          (st) => st.subject_id === row.subject_id && st.class_id === row.class_id
        );
        if (classAssignments.length > 0) {
          return classAssignments.some((st) => st.teacher_id === teacherId);
        }
        // Fall back to subject's generic assignment
        return (primarySubjectRows || []).some((s) => s.id === row.subject_id);
      });
    }

    const normalized = filteredData.map((row) => {
      const classLabel = row.classes ? buildClassLabel(row.classes) : null;
      return {
        ...row,
        room_number: row.room_number || classLabel || "Main Classroom",
        classes: row.classes ? { ...row.classes, name: classLabel } : row.classes,
      };
    });
    res.json(normalized);
  } catch (err) {
    console.error("Get teacher timetable error:", err);
    res.status(500).json({ error: err.message });
  }
}

/**
 * Update entry
 */
async function updateTimetableEntry(req, res) {
  try {
    const { id } = req.params;
    const { userRole, institution_id } = req;
    if (!["admin", "master_admin"].includes(userRole))
      return res.status(403).json({ error: "Admin only" });

    const updates = { ...req.body };
    delete updates.id;
    delete updates.created_at;

    const { data: current } = await supabase
      .from("timetables")
      .select(
        "id,class_id,subject_id,teacher_id,day_of_week,start_time,end_time,room_number,institution_id,is_elective,track_id,is_draft",
      )
      .eq("id", id)
      .eq("institution_id", institution_id)
      .single();

    if (!current) {
      return res.status(404).json({ error: "Timetable entry not found" });
    }

    const merged = { ...current, ...updates };

    const classSubjectValidation = await validateClassAndSubject({
      class_id: merged.class_id,
      subject_id: merged.subject_id,
      institution_id,
    });
    if (!classSubjectValidation.ok) {
      return res
        .status(classSubjectValidation.status)
        .json({ error: classSubjectValidation.error });
    }

    if (!merged.room_number || !merged.room_number.trim()) {
      updates.room_number = buildClassLabel(classSubjectValidation.classObj);
      merged.room_number = updates.room_number;
    }

    const needsCheck =
      updates.day_of_week ||
      updates.start_time ||
      updates.end_time ||
      updates.teacher_id ||
      updates.subject_id;

    if (needsCheck) {
      const issues = await checkConflicts(merged, institution_id, id);
      if (issues.length > 0) {
        return res.status(409).json({ error: issues[0], conflicts: issues });
      }
    }

    const { data, error } = await supabase
      .from("timetables")
      .update(updates)
      .eq("id", id)
      .eq("institution_id", institution_id)
      .select()
      .single();

    if (error) throw error;

    try {
      await recomputeForTimetableDayMutation({ institution_id, day_name: current.day_of_week });
      if (merged.day_of_week && merged.day_of_week !== current.day_of_week) {
        await recomputeForTimetableDayMutation({ institution_id, day_name: merged.day_of_week });
      }
    } catch (hoursError) {
      console.error('[Timetable] daily hours recompute failed after update:', hoursError?.message || hoursError);
    }

    res.json({ message: "Updated", entry: data });
  } catch (err) {
    console.error("Update timetable error:", err);
    res.status(500).json({ error: err.message });
  }
}

/**
 * Delete entry
 */
async function deleteTimetableEntry(req, res) {
  try {
    const { id } = req.params;
    const { userRole, institution_id } = req;
    if (!["admin", "master_admin"].includes(userRole))
      return res.status(403).json({ error: "Admin only" });

    const { data: existing } = await supabase
      .from('timetables')
      .select('day_of_week')
      .eq('id', id)
      .eq('institution_id', institution_id)
      .single();

    const { error } = await supabase
      .from("timetables")
      .delete()
      .eq("id", id)
      .eq("institution_id", institution_id);
    if (error) throw error;

    try {
      await recomputeForTimetableDayMutation({ institution_id, day_name: existing?.day_of_week });
    } catch (hoursError) {
      console.error('[Timetable] daily hours recompute failed after delete:', hoursError?.message || hoursError);
    }

    res.json({ message: "Deleted" });
  } catch (err) {
    console.error("Delete timetable error:", err);
    res.status(500).json({ error: err.message });
  }
}

module.exports = {
  checkConflicts,
  liveCheckConflict,
  getTimetableConfig,
  saveTimetableConfig,
  getTimetableReadiness,
  generateTimetable,
  publishTimetable,
  createTimetableEntry,
  getClassTimetable,
  getTeacherTimetable,
  updateTimetableEntry,
  deleteTimetableEntry
};
