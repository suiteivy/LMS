const supabase = require('../utils/supabaseClient.js');
const { isTermLocked } = require('../utils/resolveActiveTerm');
const { buildClassLabel } = require('../utils/classLabel');

// ─── Helpers ───────────────────────────────────────────────────────────────────

function sendError(res, statusCode, message) {
  return res.status(statusCode).json({ success: false, error: message });
}

function sendSuccess(res, data, statusCode = 200) {
  return res.status(statusCode).json({ success: true, data });
}

function getLetterGrade(percentage) {
  if (percentage >= 90) return 'A+';
  if (percentage >= 80) return 'A';
  if (percentage >= 70) return 'B+';
  if (percentage >= 60) return 'B';
  if (percentage >= 50) return 'C+';
  if (percentage >= 40) return 'C';
  if (percentage >= 30) return 'D';
  return 'F';
}

// Look up letter grade from a student's linked grading scale.
// Falls back to the hardcoded function if no custom scale is linked.
function getLetterGradeFromScale(percentage, scaleRows) {
  if (!scaleRows || scaleRows.length === 0) {
    return { letter_grade: getLetterGrade(percentage), gpa_points: 0 };
  }
  const sorted = [...scaleRows].sort((a, b) => b.min_score - a.min_score);
  for (const s of sorted) {
    if (percentage >= s.min_score && percentage <= s.max_score) {
      return { letter_grade: s.letter_grade, gpa_points: s.gpa_points || 0 };
    }
  }
  // If percentage is below all ranges, use lowest scale entry
  const lowest = sorted[sorted.length - 1];
  return { letter_grade: lowest?.letter_grade || getLetterGrade(percentage), gpa_points: lowest?.gpa_points || 0 };
}

async function assertTermWritable(res, institution_id, term_id) {
  if (!term_id) return true;
  try {
    const locked = await isTermLocked(institution_id, term_id);
    if (locked) {
      sendError(res, 409, 'This term is locked. Grade modifications are not allowed.');
      return false;
    }
    return true;
  } catch (error) {
    sendError(res, 500, 'Unable to verify term lock state');
    return false;
  }
}

// ─── 1. getGradeEntries ───────────────────────────────────────────────────────

async function getGradeEntries(req, res) {
  try {
    const institution_id = req.user?.institution_id;
    const user_id = req.user?.id;
    const user_role = req.user?.role;

    if (!institution_id) return sendError(res, 401, 'Institution not found');

    const {
      subject_id,
      class_id,
      term_id,
      assessment_type_id,
      student_id,
    } = req.query;

    let query = supabase
      .from('grade_entries')
      .select(`
        *,
        assessment_types ( name, code, category ),
        subjects ( title ),
        classes ( grade_level, form_level, stream )
      `)
      .eq('institution_id', institution_id);

    if (subject_id) query = query.eq('subject_id', subject_id);
    if (class_id) query = query.eq('class_id', class_id);
    if (term_id) query = query.eq('term_id', term_id);
    if (assessment_type_id) query = query.eq('assessment_type_id', assessment_type_id);

    // Role-based filtering
    if (user_role === 'student') {
      const { data: profile } = await supabase
        .from('student_profiles')
        .select('id')
        .eq('user_id', user_id)
        .eq('institution_id', institution_id)
        .single();

      if (!profile) return sendError(res, 404, 'Student profile not found');
      query = query.eq('student_id', profile.id);
    } else if (user_role === 'parent') {
      const { data: parent } = await supabase
        .from('parents')
        .select('id')
        .eq('user_id', user_id)
        .eq('institution_id', institution_id)
        .maybeSingle();

      if (!parent?.id) {
        return sendSuccess(res, []);
      }

      const { data: children } = await supabase
        .from('parent_students')
        .select('student_id')
        .eq('parent_id', parent.id);

      if (!children || children.length === 0) {
        return sendSuccess(res, []);
      }
      query = query.in('student_id', children.map((c) => c.student_id));
    } else if (student_id) {
      // admin/teacher can filter by specific student
      query = query.eq('student_id', student_id);
    }

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;
    if (error) throw error;

    const normalized = (data || []).map((row) => ({
      ...row,
      class_name: buildClassLabel(row.classes),
      classes: row.classes ? { ...row.classes, name: buildClassLabel(row.classes) } : row.classes,
    }));

    return sendSuccess(res, normalized);
  } catch (err) {
    return sendError(res, 500, err.message);
  }
}

// ─── 2. createGradeEntry ──────────────────────────────────────────────────────

async function createGradeEntry(req, res) {
  try {
    const institution_id = req.user?.institution_id;
    const user_id = req.user?.id;
    const user_role = req.user?.role;

    if (!institution_id) return sendError(res, 401, 'Institution not found');

    const {
      student_id,
      subject_id,
      class_id,
      term_id,
      assessment_type_id,
      score,
      max_score,
      feedback,
      source,
      source_id,
    } = req.body;

    // Validate required fields
    if (
      !student_id ||
      !subject_id ||
      !class_id ||
      !term_id ||
      !assessment_type_id ||
      score == null ||
      max_score == null
    ) {
      return sendError(res, 400, 'Missing required fields: student_id, subject_id, class_id, term_id, assessment_type_id, score, max_score');
    }

    // Validate score <= max_score
    if (Number(score) > Number(max_score)) {
      return sendError(res, 400, 'Score cannot exceed max_score');
    }

    const writable = await assertTermWritable(res, institution_id, term_id);
    if (!writable) return;

    // Validate assessment_type belongs to institution
    const { data: assessmentType, error: atErr } = await supabase
      .from('assessment_types')
      .select('id')
      .eq('id', assessment_type_id)
      .eq('institution_id', institution_id)
      .single();

    if (atErr || !assessmentType) {
      return sendError(res, 400, 'Invalid assessment type');
    }

    // Check duplicate (same student+subject+assessment+class+term+source_id)
    let duplicateQuery = supabase
      .from('grade_entries')
      .select('id')
      .eq('student_id', student_id)
      .eq('subject_id', subject_id)
      .eq('assessment_type_id', assessment_type_id)
      .eq('class_id', class_id)
      .eq('term_id', term_id)
      .eq('institution_id', institution_id);

    if (source_id) {
      duplicateQuery = duplicateQuery.eq('source_id', source_id);
    }

    const { data: existing } = await duplicateQuery.limit(1);

    if (existing && existing.length > 0) {
      return sendError(res, 409, 'Grade entry already exists for this student, subject, assessment, class, term, and source');
    }

    // Auto-set graded_by if teacher
    let graded_by = null;
    if (user_role === 'teacher') {
      const { data: teacherProfile } = await supabase
        .from('teacher_profiles')
        .select('id')
        .eq('user_id', user_id)
        .eq('institution_id', institution_id)
        .single();

      if (teacherProfile) graded_by = teacherProfile.id;
    }

    const insertPayload = {
      student_id,
      subject_id,
      class_id,
      term_id,
      assessment_type_id,
      score: Number(score),
      max_score: Number(max_score),
      feedback: feedback || null,
      source: source || 'manual',
      source_id: source_id || null,
      graded_by,
      institution_id,
    };

    const { data: created, error: insertErr } = await supabase
      .from('grade_entries')
      .insert(insertPayload)
      .select(`
        *,
        assessment_types ( name, code, category ),
        subjects ( title ),
        classes ( grade_level, form_level, stream )
      `)
      .single();

    if (insertErr) throw insertErr;

    const normalizedCreated = {
      ...created,
      class_name: buildClassLabel(created?.classes),
      classes: created?.classes ? { ...created.classes, name: buildClassLabel(created.classes) } : created?.classes,
    };

    return sendSuccess(res, normalizedCreated, 201);
  } catch (err) {
    return sendError(res, 500, err.message);
  }
}

// ─── 3. updateGradeEntry ──────────────────────────────────────────────────────

async function updateGradeEntry(req, res) {
  try {
    const institution_id = req.user?.institution_id;
    const user_id = req.user?.id;
    const user_role = req.user?.role;
    const { id } = req.params;

    if (!institution_id) return sendError(res, 401, 'Institution not found');

    // Fetch existing entry
    const { data: existing, error: fetchErr } = await supabase
      .from('grade_entries')
      .select('*')
      .eq('id', id)
      .eq('institution_id', institution_id)
      .single();

    if (fetchErr || !existing) {
      return sendError(res, 404, 'Grade entry not found');
    }

    // Only the original grader or admin can update
    if (user_role === 'admin') {
      // allowed
    } else {
      const { data: teacherProfile } = await supabase
        .from('teacher_profiles')
        .select('id')
        .eq('user_id', user_id)
        .eq('institution_id', institution_id)
        .single();

      if (!teacherProfile || existing.graded_by !== teacherProfile.id) {
        return sendError(res, 403, 'Only the original grader or an admin can update this entry');
      }
    }

    const allowedFields = [
      'score', 'max_score', 'feedback', 'assessment_type_id',
      'subject_id', 'class_id', 'term_id', 'student_id',
    ];

    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return sendError(res, 400, 'No valid fields to update');
    }

    const targetTermId = updates.term_id || existing.term_id;
    const writable = await assertTermWritable(res, institution_id, targetTermId);
    if (!writable) return;

    if (updates.score !== undefined && updates.max_score !== undefined) {
      if (Number(updates.score) > Number(updates.max_score)) {
        return sendError(res, 400, 'Score cannot exceed max_score');
      }
    } else if (updates.score !== undefined && updates.max_score === undefined) {
      if (Number(updates.score) > Number(existing.max_score)) {
        return sendError(res, 400, 'Score cannot exceed max_score');
      }
    } else if (updates.max_score !== undefined && updates.score === undefined) {
      if (Number(existing.score) > Number(updates.max_score)) {
        return sendError(res, 400, 'Score cannot exceed max_score');
      }
    }

    // Log old values in grade_audit_log
    const { error: auditErr } = await supabase
      .from('grade_audit_log')
      .insert({
        grade_entry_id: id,
        old_values: existing,
        changed_by: user_id,
        institution_id,
        action: 'update',
      });

    if (auditErr) throw auditErr;

    // Update entry
    const { data: updated, error: updateErr } = await supabase
      .from('grade_entries')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('institution_id', institution_id)
      .select(`
        *,
        assessment_types ( name, code, category ),
        subjects ( title ),
        classes ( grade_level, form_level, stream )
      `)
      .single();

    if (updateErr) throw updateErr;

    const normalizedUpdated = {
      ...updated,
      class_name: buildClassLabel(updated?.classes),
      classes: updated?.classes ? { ...updated.classes, name: buildClassLabel(updated.classes) } : updated?.classes,
    };

    return sendSuccess(res, normalizedUpdated);
  } catch (err) {
    return sendError(res, 500, err.message);
  }
}

// ─── 4. deleteGradeEntry ──────────────────────────────────────────────────────

async function deleteGradeEntry(req, res) {
  try {
    const institution_id = req.user?.institution_id;
    const user_id = req.user?.id;
    const user_role = req.user?.role;
    const { id } = req.params;

    if (!institution_id) return sendError(res, 401, 'Institution not found');

    if (user_role !== 'admin') {
      return sendError(res, 403, 'Only admins can delete grade entries');
    }

    const { data: existing, error: fetchErr } = await supabase
      .from('grade_entries')
      .select('*')
      .eq('id', id)
      .eq('institution_id', institution_id)
      .single();

    if (fetchErr || !existing) {
      return sendError(res, 404, 'Grade entry not found');
    }

    const writable = await assertTermWritable(res, institution_id, existing.term_id);
    if (!writable) return;

    // Log in grade_audit_log
    const { error: auditErr } = await supabase
      .from('grade_audit_log')
      .insert({
        grade_entry_id: id,
        old_values: existing,
        changed_by: user_id,
        institution_id,
        action: 'delete',
      });

    if (auditErr) throw auditErr;

    const { error: deleteErr } = await supabase
      .from('grade_entries')
      .delete()
      .eq('id', id)
      .eq('institution_id', institution_id);

    if (deleteErr) throw deleteErr;

    return sendSuccess(res, { message: 'Grade entry deleted', id });
  } catch (err) {
    return sendError(res, 500, err.message);
  }
}

// ─── 5. bulkCreateGradeEntries ────────────────────────────────────────────────

async function bulkCreateGradeEntries(req, res) {
  try {
    const institution_id = req.user?.institution_id;
    const user_id = req.user?.id;
    const user_role = req.user?.role;

    if (!institution_id) return sendError(res, 401, 'Institution not found');

    const { entries } = req.body;

    if (!Array.isArray(entries) || entries.length === 0) {
      return sendError(res, 400, 'entries must be a non-empty array');
    }

    // Resolve graded_by if teacher
    let graded_by = null;
    if (user_role === 'teacher') {
      const { data: teacherProfile } = await supabase
        .from('teacher_profiles')
        .select('id')
        .eq('user_id', user_id)
        .eq('institution_id', institution_id)
        .single();
      if (teacherProfile) graded_by = teacherProfile.id;
    }

    let created = 0;
    let skipped = 0;
    const errors = [];

    const lockCache = new Map();

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      const {
        student_id,
        subject_id,
        class_id,
        term_id,
        assessment_type_id,
        score,
        max_score,
        feedback,
        source,
        source_id,
      } = entry;

      // Validate required fields
      if (
        !student_id ||
        !subject_id ||
        !class_id ||
        !term_id ||
        !assessment_type_id ||
        score == null ||
        max_score == null
      ) {
        errors.push({ index: i, error: 'Missing required fields' });
        continue;
      }

      if (Number(score) > Number(max_score)) {
        errors.push({ index: i, error: 'Score exceeds max_score' });
        continue;
      }

      let locked = lockCache.get(term_id);
      if (typeof locked === 'undefined') {
        try {
          locked = await isTermLocked(institution_id, term_id);
          lockCache.set(term_id, locked);
        } catch (_e) {
          errors.push({ index: i, error: 'Unable to verify term lock state' });
          continue;
        }
      }
      if (locked) {
        errors.push({ index: i, error: 'Term is locked' });
        continue;
      }

      // Check duplicate
      let dupQuery = supabase
        .from('grade_entries')
        .select('id')
        .eq('student_id', student_id)
        .eq('subject_id', subject_id)
        .eq('assessment_type_id', assessment_type_id)
        .eq('class_id', class_id)
        .eq('term_id', term_id)
        .eq('institution_id', institution_id);

      if (source_id) {
        dupQuery = dupQuery.eq('source_id', source_id);
      }

      const { data: existing } = await dupQuery.limit(1);
      if (existing && existing.length > 0) {
        skipped++;
        continue;
      }

      const { error: insertErr } = await supabase
        .from('grade_entries')
        .insert({
          student_id,
          subject_id,
          class_id,
          term_id,
          assessment_type_id,
          score: Number(score),
          max_score: Number(max_score),
          feedback: feedback || null,
          source: source || 'manual',
          source_id: source_id || null,
          graded_by,
          institution_id,
        });

      if (insertErr) {
        errors.push({ index: i, error: insertErr.message });
      } else {
        created++;
      }
    }

    return sendSuccess(res, { created, skipped, errors });
  } catch (err) {
    return sendError(res, 500, err.message);
  }
}

// ─── 6. bulkImportGrades ──────────────────────────────────────────────────────

async function bulkImportGrades(req, res) {
  try {
    const institution_id = req.user?.institution_id;
    const user_id = req.user?.id;
    const user_role = req.user?.role;

    if (!institution_id) return sendError(res, 401, 'Institution not found');

    const {
      class_id,
      subject_id,
      term_id,
      assessment_type_id,
      grades,
    } = req.body;

    if (!class_id || !subject_id || !term_id || !assessment_type_id) {
      return sendError(res, 400, 'class_id, subject_id, term_id, and assessment_type_id are required');
    }

    const writable = await assertTermWritable(res, institution_id, term_id);
    if (!writable) return;

    if (!Array.isArray(grades) || grades.length === 0) {
      return sendError(res, 400, 'grades must be a non-empty array');
    }

    // Validate assessment_type belongs to institution
    const { data: at, error: atErr } = await supabase
      .from('assessment_types')
      .select('id')
      .eq('id', assessment_type_id)
      .eq('institution_id', institution_id)
      .single();

    if (atErr || !at) {
      return sendError(res, 400, 'Invalid assessment type');
    }

    // Fetch enrolled students for the class
    const { data: enrollments, error: enrollErr } = await supabase
      .from('class_enrollments')
      .select('student_id')
      .eq('class_id', class_id)
      .eq('institution_id', institution_id)
      .eq('status', 'active');

    if (enrollErr) throw enrollErr;

    const enrolledStudentIds = new Set((enrollments || []).map((e) => e.student_id));

    // Resolve graded_by if teacher
    let graded_by = null;
    if (user_role === 'teacher') {
      const { data: tp } = await supabase
        .from('teacher_profiles')
        .select('id')
        .eq('user_id', user_id)
        .eq('institution_id', institution_id)
        .single();
      if (tp) graded_by = tp.id;
    }

    let created = 0;
    let skipped = 0;
    const errors = [];

    for (let i = 0; i < grades.length; i++) {
      const { student_id, score, max_score } = grades[i];

      if (!student_id || score == null || max_score == null) {
        errors.push({ index: i, error: 'Missing student_id, score, or max_score' });
        continue;
      }

      if (!enrolledStudentIds.has(student_id)) {
        errors.push({ index: i, student_id, error: 'Student not enrolled in this class' });
        continue;
      }

      if (Number(score) > Number(max_score)) {
        errors.push({ index: i, student_id, error: 'Score exceeds max_score' });
        continue;
      }

      // Check duplicate
      const { data: existing } = await supabase
        .from('grade_entries')
        .select('id')
        .eq('student_id', student_id)
        .eq('subject_id', subject_id)
        .eq('assessment_type_id', assessment_type_id)
        .eq('class_id', class_id)
        .eq('term_id', term_id)
        .eq('institution_id', institution_id)
        .limit(1);

      if (existing && existing.length > 0) {
        skipped++;
        continue;
      }

      const { error: insertErr } = await supabase
        .from('grade_entries')
        .insert({
          student_id,
          subject_id,
          class_id,
          term_id,
          assessment_type_id,
          score: Number(score),
          max_score: Number(max_score),
          source: 'import',
          graded_by,
          institution_id,
        });

      if (insertErr) {
        errors.push({ index: i, student_id, error: insertErr.message });
      } else {
        created++;
      }
    }

    return sendSuccess(res, { created, skipped, errors });
  } catch (err) {
    return sendError(res, 500, err.message);
  }
}

// ─── 7. syncAssignmentGrades ──────────────────────────────────────────────────

async function syncAssignmentGrades(req, res) {
  try {
    const institution_id = req.user?.institution_id;
    const user_id = req.user?.id;
    const user_role = req.user?.role;

    if (!institution_id) return sendError(res, 401, 'Institution not found');

    const { assignment_id, class_id, term_id } = req.body;

    if (!assignment_id || !class_id || !term_id) {
      return sendError(res, 400, 'assignment_id, class_id, and term_id are required');
    }

    const writable = await assertTermWritable(res, institution_id, term_id);
    if (!writable) return;

    // Fetch the assignment to get subject_id
    const { data: assignment, error: assignErr } = await supabase
      .from('assignments')
      .select('id, subject_id')
      .eq('id', assignment_id)
      .eq('institution_id', institution_id)
      .single();

    if (assignErr || !assignment) {
      return sendError(res, 404, 'Assignment not found');
    }

    // Get the assessment_type for 'assignment'
    const { data: at } = await supabase
      .from('assessment_types')
      .select('id')
      .eq('code', 'assignment')
      .eq('institution_id', institution_id)
      .limit(1)
      .single();

    const assessment_type_id = at ? at.id : null;

    // Fetch all graded submissions for this assignment
    const { data: submissions, error: subErr } = await supabase
      .from('submissions')
      .select('id, student_id, score, max_score')
      .eq('assignment_id', assignment_id)
      .eq('institution_id', institution_id)
      .not('score', 'is', null);

    if (subErr) throw subErr;

    if (!submissions || submissions.length === 0) {
      return sendSuccess(res, { synced: 0, created: 0 });
    }

    // Resolve graded_by if teacher
    let graded_by = null;
    if (user_role === 'teacher') {
      const { data: tp } = await supabase
        .from('teacher_profiles')
        .select('id')
        .eq('user_id', user_id)
        .eq('institution_id', institution_id)
        .single();
      if (tp) graded_by = tp.id;
    }

    let created = 0;
    let updated = 0;

    for (const sub of submissions) {
      if (!assessment_type_id) continue;

      // Check if a grade_entry already exists with this source
      const { data: existing } = await supabase
        .from('grade_entries')
        .select('id, score')
        .eq('student_id', sub.student_id)
        .eq('subject_id', assignment.subject_id)
        .eq('class_id', class_id)
        .eq('term_id', term_id)
        .eq('assessment_type_id', assessment_type_id)
        .eq('institution_id', institution_id)
        .eq('source', 'assignment')
        .eq('source_id', sub.id)
        .limit(1);

      if (existing && existing.length > 0) {
        // Update if score changed
        if (existing[0].score !== sub.score) {
          await supabase
            .from('grade_entries')
            .update({
              score: sub.score,
              max_score: sub.max_score,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existing[0].id)
            .eq('institution_id', institution_id);
          updated++;
        }
      } else {
        // Create new
        const { error: insertErr } = await supabase
          .from('grade_entries')
          .insert({
            student_id: sub.student_id,
            subject_id: assignment.subject_id,
            class_id,
            term_id,
            assessment_type_id,
            score: sub.score,
            max_score: sub.max_score,
            source: 'assignment',
            source_id: sub.id,
            graded_by,
            institution_id,
          });

        if (!insertErr) created++;
      }
    }

    return sendSuccess(res, { synced: created + updated, created, updated });
  } catch (err) {
    return sendError(res, 500, err.message);
  }
}

// ─── 8. syncExamGrades ────────────────────────────────────────────────────────

async function syncExamGrades(req, res) {
  try {
    const institution_id = req.user?.institution_id;
    const user_id = req.user?.id;
    const user_role = req.user?.role;

    if (!institution_id) return sendError(res, 401, 'Institution not found');

    const { exam_id, class_id, term_id } = req.body;

    if (!exam_id || !class_id || !term_id) {
      return sendError(res, 400, 'exam_id, class_id, and term_id are required');
    }

    const writable = await assertTermWritable(res, institution_id, term_id);
    if (!writable) return;

    // Fetch the exam to get subject_id
    const { data: exam, error: examErr } = await supabase
      .from('exams')
      .select('id, subject_id')
      .eq('id', exam_id)
      .eq('institution_id', institution_id)
      .single();

    if (examErr || !exam) {
      return sendError(res, 404, 'Exam not found');
    }

    // Get the assessment_type for 'exam'
    const { data: at } = await supabase
      .from('assessment_types')
      .select('id')
      .eq('code', 'exam')
      .eq('institution_id', institution_id)
      .limit(1)
      .single();

    const assessment_type_id = at ? at.id : null;

    // Fetch all exam results
    const { data: examResults, error: resErr } = await supabase
      .from('exam_results')
      .select('id, student_id, score, max_score')
      .eq('exam_id', exam_id)
      .eq('institution_id', institution_id)
      .not('score', 'is', null);

    if (resErr) throw resErr;

    if (!examResults || examResults.length === 0) {
      return sendSuccess(res, { synced: 0, created: 0 });
    }

    // Resolve graded_by if teacher
    let graded_by = null;
    if (user_role === 'teacher') {
      const { data: tp } = await supabase
        .from('teacher_profiles')
        .select('id')
        .eq('user_id', user_id)
        .eq('institution_id', institution_id)
        .single();
      if (tp) graded_by = tp.id;
    }

    let created = 0;
    let updated = 0;

    for (const result of examResults) {
      if (!assessment_type_id) continue;

      // Check if a grade_entry already exists with this source
      const { data: existing } = await supabase
        .from('grade_entries')
        .select('id, score')
        .eq('student_id', result.student_id)
        .eq('subject_id', exam.subject_id)
        .eq('class_id', class_id)
        .eq('term_id', term_id)
        .eq('assessment_type_id', assessment_type_id)
        .eq('institution_id', institution_id)
        .eq('source', 'exam')
        .eq('source_id', result.id)
        .limit(1);

      if (existing && existing.length > 0) {
        // Update if score changed
        if (existing[0].score !== result.score) {
          await supabase
            .from('grade_entries')
            .update({
              score: result.score,
              max_score: result.max_score,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existing[0].id)
            .eq('institution_id', institution_id);
          updated++;
        }
      } else {
        const { error: insertErr } = await supabase
          .from('grade_entries')
          .insert({
            student_id: result.student_id,
            subject_id: exam.subject_id,
            class_id,
            term_id,
            assessment_type_id,
            score: result.score,
            max_score: result.max_score,
            source: 'exam',
            source_id: result.id,
            graded_by,
            institution_id,
          });

        if (!insertErr) created++;
      }
    }

    return sendSuccess(res, { synced: created + updated, created, updated });
  } catch (err) {
    return sendError(res, 500, err.message);
  }
}

// ─── 9. getGradeSummary ───────────────────────────────────────────────────────

async function getGradeSummary(req, res) {
  try {
    const institution_id = req.user?.institution_id;

    if (!institution_id) return sendError(res, 401, 'Institution not found');

    const { class_id, term_id, subject_id, student_id } = req.query;

    if (!class_id || !term_id) {
      return sendError(res, 400, 'class_id and term_id are required');
    }

    // Fetch grade entries with joins
    let query = supabase
      .from('grade_entries')
      .select(`
        *,
        assessment_types ( name, code, category, weight ),
        subjects ( id, title, subject_weights )
      `)
      .eq('class_id', class_id)
      .eq('term_id', term_id)
      .eq('institution_id', institution_id);

    if (subject_id) {
      query = query.eq('subject_id', subject_id);
    }
    if (student_id) {
      query = query.eq('student_id', student_id);
    }

    const { data: gradeEntries, error: fetchErr } = await query;
    if (fetchErr) throw fetchErr;

    if (!gradeEntries || gradeEntries.length === 0) {
      return sendSuccess(res, []);
    }

    // Fetch student profiles for names + linked grading_scale_id
    const uniqueStudentIds = [...new Set(gradeEntries.map((g) => g.student_id))];
    const { data: students } = await supabase
      .from('students')
      .select('id, user_id, grading_scale_id, users ( first_name, last_name )')
      .in('id', uniqueStudentIds)
      .eq('institution_id', institution_id);

    const studentMap = {};
    for (const s of students || []) {
      studentMap[s.id] = {
        user: s.users,
        grading_scale_id: s.grading_scale_id,
      };
    }

    // Fetch all unique grading scales used by students in this class
    const uniqueScaleIds = [...new Set(
      Object.values(studentMap).map(s => s.grading_scale_id).filter(Boolean)
    )];

    let gradingScaleMap = {};
    if (uniqueScaleIds.length > 0) {
      const { data: scales } = await supabase
        .from('grading_scales')
        .select('*')
        .in('id', uniqueScaleIds)
        .eq('institution_id', institution_id);

      for (const s of scales || []) {
        if (!gradingScaleMap[s.id]) gradingScaleMap[s.id] = [];
        gradingScaleMap[s.id].push(s);
      }
    }

    // Also fetch institution default scale (for students without a linked scale)
    const { data: defaultScales } = await supabase
      .from('grading_scales')
      .select('*')
      .eq('institution_id', institution_id)
      .eq('is_active', true)
      .order('min_score', { ascending: true });

    // Group by student, then by subject
    const studentGroups = {};

    for (const entry of gradeEntries) {
      if (!studentGroups[entry.student_id]) {
        studentGroups[entry.student_id] = {};
      }
      if (!studentGroups[entry.student_id][entry.subject_id]) {
        studentGroups[entry.student_id][entry.subject_id] = {
          subject_id: entry.subject_id,
          subject_name: entry.subjects?.title || 'Unknown',
          subject_weights: entry.subjects?.subject_weights || {},
          entries: [],
        };
      }
      studentGroups[entry.student_id][entry.subject_id].entries.push(entry);
    }

    // Calculate summaries
    const summary = [];

    for (const [sid, subjects] of Object.entries(studentGroups)) {
      const studentInfo = studentMap[sid];
      const user = studentInfo?.user;
      const studentName = user
        ? `${user.first_name || ''} ${user.last_name || ''}`.trim()
        : 'Unknown';

      // Resolve grading scale for this student
      const linkedScaleId = studentInfo?.grading_scale_id;
      const studentScale = linkedScaleId ? gradingScaleMap[linkedScaleId] : null;
      const activeScale = studentScale && studentScale.length > 0
        ? studentScale
        : (defaultScales && defaultScales.length > 0 ? defaultScales : null);

      const subjectSummaries = [];

      for (const [subjId, subjData] of Object.entries(subjects)) {
        const { entries, subject_weights } = subjData;

        // Group entries by assessment category
        const categoryMap = {};
        for (const e of entries) {
          const category = e.assessment_types?.category || 'uncategorized';
          if (!categoryMap[category]) {
            categoryMap[category] = {
              category,
              total_score: 0,
              total_max: 0,
              entries: [],
              weight: subject_weights?.[category] || 1,
            };
          }
          categoryMap[category].total_score += Number(e.score);
          categoryMap[category].total_max += Number(e.max_score);
          categoryMap[category].entries.push({
            id: e.id,
            score: e.score,
            max_score: e.max_score,
            assessment_type_name: e.assessment_types?.name,
            assessment_type_code: e.assessment_types?.code,
            source: e.source,
          });
        }

        // Calculate average percentage per category and overall
        const breakdown = [];
        let weightedTotal = 0;
        let totalWeight = 0;

        for (const cat of Object.values(categoryMap)) {
          const percentage = cat.total_max > 0
            ? (cat.total_score / cat.total_max) * 100
            : 0;

          breakdown.push({
            category: cat.category,
            average_percentage: Math.round(percentage * 100) / 100,
            weight: cat.weight,
            total_score: cat.total_score,
            total_max: cat.total_max,
            entry_count: cat.entries.length,
            entries: cat.entries,
          });

          weightedTotal += percentage * cat.weight;
          totalWeight += cat.weight;
        }

        const overallPercentage = totalWeight > 0
          ? weightedTotal / totalWeight
          : 0;

        // Use student's linked scale (or institution default) for letter grade
        const { letter_grade, gpa_points } = getLetterGradeFromScale(overallPercentage, activeScale);

        subjectSummaries.push({
          subject_id: subjData.subject_id,
          subject_name: subjData.subject_name,
          average_percentage: Math.round(overallPercentage * 100) / 100,
          letter_grade,
          gpa_points,
          weighted_score: Math.round(weightedTotal * 100) / 100,
          breakdown,
        });
      }

      summary.push({
        student_id: sid,
        student_name: studentName,
        grading_scale_id: linkedScaleId || null,
        subjects: subjectSummaries,
      });
    }

    return sendSuccess(res, summary);
  } catch (err) {
    return sendError(res, 500, err.message);
  }
}

// ─── 10. getStudentGradingScale ─────────────────────────────────────────────

async function getStudentGradingScale(req, res) {
  try {
    const institution_id = req.user?.institution_id;
    if (!institution_id) return sendError(res, 401, 'Institution not found');

    const { student_id } = req.query;
    if (!student_id) return sendError(res, 400, 'student_id is required');

    // Fetch student's linked grading_scale_id
    const { data: student, error: studentErr } = await supabase
      .from('students')
      .select('id, grading_scale_id')
      .eq('id', student_id)
      .eq('institution_id', institution_id)
      .single();

    if (studentErr || !student) {
      return sendError(res, 404, 'Student not found');
    }

    // If student has a linked scale, fetch it
    if (student.grading_scale_id) {
      const { data: scale, error: scaleErr } = await supabase
        .from('grading_scales')
        .select('*')
        .eq('id', student.grading_scale_id)
        .eq('institution_id', institution_id);

      if (!scaleErr && scale && scale.length > 0) {
        return sendSuccess(res, {
          grading_scale_id: student.grading_scale_id,
          grading_scale: scale.sort((a, b) => b.min_score - a.min_score),
          source: 'student_linked',
        });
      }
    }

    // Fallback: institution default scales (all active scales sorted)
    const { data: defaultScales, error: defErr } = await supabase
      .from('grading_scales')
      .select('*')
      .eq('institution_id', institution_id)
      .eq('is_active', true)
      .order('min_score', { ascending: true });

    if (defErr) throw defErr;

    return sendSuccess(res, {
      grading_scale_id: null,
      grading_scale: defaultScales || [],
      source: 'institution_default',
    });
  } catch (err) {
    return sendError(res, 500, err.message);
  }
}

// ─── Performance Trends ────────────────────────────────────────────────────────
// GET /grade-entries/performance-trends?student_id=X (or class_id=X)
// Returns term-over-term average scores per subject for a student,
// or class averages per subject per term.

async function getPerformanceTrends(req, res) {
  try {
    const { student_id, class_id, subject_id } = req.query;
    const institution_id = req.user?.institution_id;
    const role = req.user?.role;

    if (!student_id && !class_id) {
      return sendError(res, 400, 'student_id or class_id is required');
    }

    // 1. Get all terms for this institution
    const { data: terms } = await supabase
      .from('terms')
      .select('id, name')
      .eq('institution_id', institution_id)
      .order('start_date', { ascending: true });

    if (!terms || terms.length === 0) {
      return sendSuccess(res, { terms: [], subjects: [] });
    }

    const termIds = terms.map((t) => t.id);
    const termMap = Object.fromEntries(terms.map((t) => [t.id, t.name]));

    // 2. Build grade_entries query
    let gradeQuery = supabase
      .from('grade_entries')
      .select('term_id, subject_id, percentage, letter_grade, subjects(title)')
      .in('term_id', termIds);

    if (student_id) {
      gradeQuery = gradeQuery.eq('student_id', student_id);
    } else if (class_id) {
      gradeQuery = gradeQuery.eq('class_id', class_id);
    }
    if (subject_id) {
      gradeQuery = gradeQuery.eq('subject_id', subject_id);
    }

    const { data: gradeEntries, error: gErr } = await gradeQuery;
    if (gErr) throw gErr;

    // 3. Also pull from submissions (assignment grades) for fuller picture
    let submissionQuery = supabase
      .from('submissions')
      .select('id, grade, student_id, assignment:assignments!inner(subject_id, subject:subjects!inner(title), is_published, subject:class_id)')
      .eq('status', 'graded');

    if (student_id) {
      submissionQuery = submissionQuery.eq('student_id', student_id);
    }

    const { data: submissions } = await submissionQuery;

    // 4. Aggregate by term → subject → average percentage
    const trendsByTerm = {};
    const subjectNames = {};

    (gradeEntries || []).forEach((entry) => {
      const tid = entry.term_id;
      const sid = entry.subject_id;
      const pct = entry.percentage;
      const title = entry.subjects?.title || sid;

      subjectNames[sid] = title;
      if (!trendsByTerm[tid]) trendsByTerm[tid] = {};
      if (!trendsByTerm[tid][sid]) trendsByTerm[tid][sid] = { total: 0, count: 0 };
      if (pct !== null && pct !== undefined) {
        trendsByTerm[tid][sid].total += pct;
        trendsByTerm[tid][sid].count += 1;
      }
    });

    // 5. Build subject list and term data
    const allSubjectIds = Object.keys(subjectNames);
    const resultTerms = termIds
      .filter((tid) => trendsByTerm[tid])
      .map((tid) => ({
        term_id: tid,
        term_name: termMap[tid],
        subjects: allSubjectIds.map((sid) => {
          const agg = trendsByTerm[tid]?.[sid];
          return {
            subject_id: sid,
            subject_name: subjectNames[sid],
            average: agg && agg.count > 0 ? Math.round(agg.total / agg.count * 10) / 10 : null,
            entries: agg?.count || 0,
          };
        }),
      }));

    const subjectList = allSubjectIds.map((sid) => ({
      subject_id: sid,
      subject_name: subjectNames[sid],
    }));

    return sendSuccess(res, { terms: resultTerms, subjects: subjectList });
  } catch (err) {
    return sendError(res, 500, err.message);
  }
}

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  getGradeEntries,
  createGradeEntry,
  updateGradeEntry,
  deleteGradeEntry,
  bulkCreateGradeEntries,
  bulkImportGrades,
  syncAssignmentGrades,
  syncExamGrades,
  getGradeSummary,
  getStudentGradingScale,
  getPerformanceTrends,
};
