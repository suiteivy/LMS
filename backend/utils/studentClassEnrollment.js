const supabase = require('./supabaseClient');

async function getStudentCurrentClassEnrollment(studentId, institutionId) {
  if (!studentId) return null;

  let query = supabase
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
  return (data || [])[0] || null;
}

async function assignStudentToSingleClass({ studentId, classId, institutionId, syncStudentLevel = true }) {
  if (!studentId) {
    throw new Error('studentId is required');
  }

  // Clear old class links first so each student has only one class row.
  let deleteQuery = supabase.from('class_enrollments').delete().eq('student_id', studentId);
  if (institutionId) {
    deleteQuery = deleteQuery.eq('institution_id', institutionId);
  }

  const { error: deleteError } = await deleteQuery;
  if (deleteError) throw deleteError;

  if (!classId) {
    return null;
  }

  let classQuery = supabase
    .from('classes')
    .select('id, institution_id, grade_level, form_level')
    .eq('id', classId)
    .single();

  if (institutionId) {
    classQuery = classQuery.eq('institution_id', institutionId);
  }

  const { data: classRow, error: classError } = await classQuery;
  if (classError || !classRow) {
    throw new Error('Class not found');
  }

  const insertPayload = {
    student_id: studentId,
    class_id: classId,
    institution_id: institutionId || classRow.institution_id || null,
  };

  const { data: inserted, error: insertError } = await supabase
    .from('class_enrollments')
    .insert(insertPayload)
    .select('*')
    .single();

  if (insertError) throw insertError;

  if (syncStudentLevel) {
    const studentUpdates = {
      grade_level: classRow.grade_level ?? null,
      form_level: classRow.form_level ?? null,
      updated_at: new Date().toISOString(),
    };

    let updateStudentQuery = supabase
      .from('students')
      .update(studentUpdates)
      .eq('id', studentId);

    if (institutionId) {
      updateStudentQuery = updateStudentQuery.eq('institution_id', institutionId);
    }

    const { error: studentUpdateError } = await updateStudentQuery;
    if (studentUpdateError) throw studentUpdateError;
  }

  return inserted;
}

module.exports = {
  getStudentCurrentClassEnrollment,
  assignStudentToSingleClass,
};
