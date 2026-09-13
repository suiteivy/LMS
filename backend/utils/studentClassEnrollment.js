const defaultSupabase = require('./supabaseClient');

async function getStudentCurrentClassEnrollment(studentId, institutionId) {
  if (!studentId) return null;

  let query = defaultSupabase
    .from('class_enrollments')
    .select('id, student_id, class_id, enrolled_at, institution_id')
    .eq('student_id', studentId)
    .order('enrolled_at', { ascending: false })
    .limit(1);

  if (institutionId) {
    query = query.eq('institution_id', institutionId);
  }

  const { data, error } = await query;
  if (error) throw error;
  if (data && data.length > 0) return data[0];

  // Fallback: check students table for direct class_id assignment
  const { data: studentRow } = await defaultSupabase
    .from('students')
    .select('id, class_id, institution_id')
    .eq('id', studentId)
    .single();

  if (studentRow?.class_id) {
    return {
      student_id: studentId,
      class_id: studentRow.class_id,
      institution_id: studentRow.institution_id || institutionId,
    };
  }

  return null;
}

async function resolveAutoAssignClass(clientOrOptions, maybeOptions) {
  const client = (clientOrOptions && typeof clientOrOptions.from === 'function') ? clientOrOptions : defaultSupabase;
  const options = (clientOrOptions && typeof clientOrOptions.from === 'function') ? (maybeOptions || {}) : (clientOrOptions || {});
  const { institutionId, gradeLevel, formLevel } = options;

  let classQuery = client
    .from('classes')
    .select('id, institution_id, grade_level, form_level, stream, display_name, capacity');

  if (institutionId) {
    classQuery = classQuery.eq('institution_id', institutionId);
  }
  if (gradeLevel !== undefined && gradeLevel !== null && gradeLevel !== '') {
    classQuery = classQuery.eq('grade_level', Number(gradeLevel));
  }
  if (formLevel !== undefined && formLevel !== null && formLevel !== '') {
    classQuery = classQuery.eq('form_level', Number(formLevel));
  }

  const { data: classes, error: classErr } = await classQuery;
  if (classErr) throw classErr;
  if (!classes || classes.length === 0) return null;

  // Query enrollment counts for each class
  const classData = await Promise.all(
    classes.map(async (cls) => {
      const { count } = await client
        .from('class_enrollments')
        .select('id', { count: 'exact', head: true })
        .eq('class_id', cls.id);

      return {
        ...cls,
        current_count: count || 0,
      };
    })
  );

  // Filter by capacity
  const eligible = classData.filter(c => !c.capacity || c.current_count < c.capacity);
  if (eligible.length === 0) {
    // If all at capacity, fallback to the one with the lowest count
    classData.sort((a, b) => a.current_count - b.current_count);
    return classData[0];
  }

  // Sort ascending by headcount (lowest first for even distribution)
  eligible.sort((a, b) => a.current_count - b.current_count);
  return eligible[0];
}

async function assignStudentToSingleClass(clientOrOptions, maybeOptions) {
  const client = (clientOrOptions && typeof clientOrOptions.from === 'function') ? clientOrOptions : defaultSupabase;
  const options = (clientOrOptions && typeof clientOrOptions.from === 'function') ? (maybeOptions || {}) : (clientOrOptions || {});
  const {
    studentId,
    classId,
    institutionId,
    syncStudentLevel = true,
    trackId = null,
    electiveSubjectIds = [],
  } = options;

  if (!studentId) {
    throw new Error('studentId is required');
  }

  // Clear old class links first so each student has only one class row.
  let deleteQuery = client.from('class_enrollments').delete().eq('student_id', studentId);
  if (institutionId) {
    deleteQuery = deleteQuery.eq('institution_id', institutionId);
  }

  const { error: deleteError } = await deleteQuery;
  if (deleteError) throw deleteError;

  if (!classId) {
    // If unassigned from class, retire all active subject enrollments to completed
    await client
      .from('enrollments')
      .update({ status: 'completed' })
      .eq('student_id', studentId)
      .eq('status', 'enrolled');

    await client
      .from('students')
      .update({ class_id: null, updated_at: new Date().toISOString() })
      .eq('id', studentId);

    return null;
  }

  let classQuery = client
    .from('classes')
    .select('id, institution_id, grade_level, form_level')
    .eq('id', classId);

  if (institutionId) {
    classQuery = classQuery.eq('institution_id', institutionId);
  }

  const { data: classRow, error: classError } = await classQuery.single();
  if (classError || !classRow) {
    throw new Error('Class not found');
  }

  const effectiveInstId = institutionId || classRow.institution_id || null;

  const insertPayload = {
    student_id: studentId,
    class_id: classId,
    institution_id: effectiveInstId,
  };

  const { data: inserted, error: insertError } = await client
    .from('class_enrollments')
    .insert(insertPayload)
    .select('*')
    .single();

  if (insertError) throw insertError;

  if (syncStudentLevel) {
    const studentUpdates = {
      class_id: classId,
      grade_level: classRow.grade_level ?? null,
      form_level: classRow.form_level ?? null,
      updated_at: new Date().toISOString(),
    };

    let updateStudentQuery = client
      .from('students')
      .update(studentUpdates)
      .eq('id', studentId);

    if (effectiveInstId) {
      updateStudentQuery = updateStudentQuery.eq('institution_id', effectiveInstId);
    }

    const { error: studentUpdateError } = await updateStudentQuery;
    if (studentUpdateError) throw studentUpdateError;
  }

  let enrolledSubjectsCount = 0;
  let retiredSubjectsCount = 0;

  // --- CLASS PROPERTY INHERITANCE (SUBJECT ROSTER & TRACKS) ---
  try {
    // 1. If trackId provided and level is Senior Secondary (Grade 10+), update student track enrollment
    const isSenior = (classRow.grade_level && classRow.grade_level >= 10);
    if (isSenior && trackId && effectiveInstId) {
      await client
        .from('student_track_enrollments')
        .upsert({
          institution_id: effectiveInstId,
          student_id: studentId,
          track_id: trackId,
          elective_subject_ids: Array.isArray(electiveSubjectIds) ? electiveSubjectIds : [],
          enrolled_at: new Date().toISOString(),
        }, { onConflict: 'student_id' });
    }

    // 2. Resolve all subjects linked to this class
    const targetSubjectIds = new Set();

    // From subject_classes join table
    let scQuery = client
      .from('subject_classes')
      .select('subject_id')
      .eq('class_id', classId);
    if (effectiveInstId) scQuery = scQuery.eq('institution_id', effectiveInstId);
    const { data: scRows } = await scQuery;
    (scRows || []).forEach(r => { if (r.subject_id) targetSubjectIds.add(r.subject_id); });

    // From direct subjects.class_id
    let sQuery = client
      .from('subjects')
      .select('id')
      .eq('class_id', classId);
    if (effectiveInstId) sQuery = sQuery.eq('institution_id', effectiveInstId);
    const { data: sRows } = await sQuery;
    (sRows || []).forEach(r => { if (r.id) targetSubjectIds.add(r.id); });

    // If Senior Secondary, also inherit track subjects
    if (isSenior && effectiveInstId) {
      const effectiveTrackId = trackId;
      let activeTrackId = effectiveTrackId;
      let activeElectives = Array.isArray(electiveSubjectIds) ? electiveSubjectIds : [];

      if (!activeTrackId) {
        const { data: trackRow } = await client
          .from('student_track_enrollments')
          .select('track_id, elective_subject_ids')
          .eq('student_id', studentId)
          .maybeSingle();

        if (trackRow) {
          activeTrackId = trackRow.track_id;
          activeElectives = trackRow.elective_subject_ids || [];
        }
      }

      if (activeTrackId) {
        const { data: trackSubjRows } = await client
          .from('track_subjects')
          .select('subject_id, is_compulsory')
          .eq('track_id', activeTrackId);

        (trackSubjRows || []).forEach(ts => {
          if (ts.is_compulsory && ts.subject_id) targetSubjectIds.add(ts.subject_id);
        });

        activeElectives.forEach(id => { if (id) targetSubjectIds.add(id); });
      }
    }

    const newSubjectIdList = Array.from(targetSubjectIds);

    // 3. Mark previous active enrollments not in new roster as 'completed' (preserves historical record)
    const { data: currentEnrollments } = await client
      .from('enrollments')
      .select('id, subject_id, status')
      .eq('student_id', studentId);

    const subjectsToRetire = (currentEnrollments || [])
      .filter(e => e.status === 'enrolled' && !newSubjectIdList.includes(e.subject_id))
      .map(e => e.subject_id);

    if (subjectsToRetire.length > 0) {
      let retireQuery = client
        .from('enrollments')
        .update({ status: 'completed' })
        .eq('student_id', studentId)
        .in('subject_id', subjectsToRetire);

      if (effectiveInstId) {
        retireQuery = retireQuery.eq('institution_id', effectiveInstId);
      }
      await retireQuery;
      retiredSubjectsCount = subjectsToRetire.length;
    }

    // 4. Enroll into new subjects
    for (const subjId of newSubjectIdList) {
      await client
        .from('enrollments')
        .upsert({
          student_id: studentId,
          subject_id: subjId,
          status: 'enrolled',
          institution_id: effectiveInstId,
          enrollment_date: new Date().toISOString(),
        }, { onConflict: 'student_id,subject_id' });
    }
    enrolledSubjectsCount = newSubjectIdList.length;
  } catch (inheritanceErr) {
    console.error('Class property inheritance error:', inheritanceErr);
  }

  return {
    ...inserted,
    enrolledSubjectsCount,
    retiredSubjectsCount,
  };
}

module.exports = {
  getStudentCurrentClassEnrollment,
  assignStudentToSingleClass,
  resolveAutoAssignClass,
};
