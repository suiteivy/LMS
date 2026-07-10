const supabase = require('../utils/supabaseClient.js');
const {
  PERSON_TYPE,
  recomputeDailyHoursForInstitutionDate,
  getHoursRollup,
} = require('../services/dailyHours.service.js');

const allowedRoles = ['admin', 'school_admin', 'platform_admin', 'bursary', 'master_admin', 'teacher', 'student', 'parent'];

const getTeacherByUserId = async (userId, institutionId) => {
  const { data } = await supabase
    .from('teachers')
    .select('id')
    .eq('user_id', userId)
    .eq('institution_id', institutionId)
    .maybeSingle();
  return data?.id || null;
};

const getStudentByUserId = async (userId, institutionId) => {
  const { data } = await supabase
    .from('students')
    .select('id')
    .eq('user_id', userId)
    .eq('institution_id', institutionId)
    .maybeSingle();
  return data?.id || null;
};

const ensureParentLinkedStudent = async (parentUserId, studentId, institutionId) => {
  const { data: parent } = await supabase
    .from('parents')
    .select('id')
    .eq('user_id', parentUserId)
    .eq('institution_id', institutionId)
    .maybeSingle();
  if (!parent?.id) return false;

  const { data: link } = await supabase
    .from('parent_students')
    .select('id')
    .eq('parent_id', parent.id)
    .eq('student_id', studentId)
    .eq('institution_id', institutionId)
    .maybeSingle();

  return !!link?.id;
};

exports.recomputeInstitutionDailyHours = async (req, res) => {
  try {
    const { userRole, institution_id } = req;
    if (!['admin', 'school_admin', 'platform_admin', 'bursary', 'master_admin'].includes(userRole)) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const date = String(req.body?.date || req.query?.date || '').trim();
    if (!date) return res.status(400).json({ error: 'date is required (YYYY-MM-DD)' });

    const result = await recomputeDailyHoursForInstitutionDate({ institution_id, date });
    return res.json(result);
  } catch (err) {
    console.error('recomputeInstitutionDailyHours error:', err);
    return res.status(500).json({ error: err.message });
  }
};

exports.getMyHours = async (req, res) => {
  try {
    const { userRole, userId, institution_id } = req;
    if (!allowedRoles.includes(userRole)) return res.status(403).json({ error: 'Unauthorized' });

    const start_date = req.query?.start_date ? String(req.query.start_date) : null;
    const end_date = req.query?.end_date ? String(req.query.end_date) : null;

    if (userRole === 'teacher') {
      const teacherId = await getTeacherByUserId(userId, institution_id);
      if (!teacherId) return res.status(404).json({ error: 'Teacher profile not found' });
      const rollup = await getHoursRollup({ institution_id, person_id: teacherId, person_type: PERSON_TYPE.TEACHER, start_date, end_date });
      return res.json({ person_type: PERSON_TYPE.TEACHER, person_id: teacherId, ...rollup });
    }

    if (userRole === 'student') {
      const studentId = await getStudentByUserId(userId, institution_id);
      if (!studentId) return res.status(404).json({ error: 'Student profile not found' });
      const rollup = await getHoursRollup({ institution_id, person_id: studentId, person_type: PERSON_TYPE.STUDENT, start_date, end_date });
      return res.json({ person_type: PERSON_TYPE.STUDENT, person_id: studentId, ...rollup });
    }

    return res.status(400).json({ error: 'Use scoped endpoint for this role' });
  } catch (err) {
    console.error('getMyHours error:', err);
    return res.status(500).json({ error: err.message });
  }
};

exports.getTeacherHours = async (req, res) => {
  try {
    const { userRole, institution_id } = req;
    if (!['admin', 'school_admin', 'platform_admin', 'bursary', 'master_admin', 'teacher'].includes(userRole)) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    let teacherId = String(req.params?.teacherId || '').trim();
    if (userRole === 'teacher') {
      teacherId = await getTeacherByUserId(req.userId, institution_id);
      if (!teacherId) return res.status(404).json({ error: 'Teacher profile not found' });
    }

    if (!teacherId) return res.status(400).json({ error: 'teacherId is required' });

    const start_date = req.query?.start_date ? String(req.query.start_date) : null;
    const end_date = req.query?.end_date ? String(req.query.end_date) : null;

    const rollup = await getHoursRollup({ institution_id, person_id: teacherId, person_type: PERSON_TYPE.TEACHER, start_date, end_date });
    return res.json({ person_type: PERSON_TYPE.TEACHER, person_id: teacherId, ...rollup });
  } catch (err) {
    console.error('getTeacherHours error:', err);
    return res.status(500).json({ error: err.message });
  }
};

exports.getStudentHours = async (req, res) => {
  try {
    const { userRole, userId, institution_id } = req;
    if (!allowedRoles.includes(userRole)) return res.status(403).json({ error: 'Unauthorized' });

    const studentId = String(req.params?.studentId || '').trim();
    if (!studentId) return res.status(400).json({ error: 'studentId is required' });

    if (userRole === 'parent') {
      const linked = await ensureParentLinkedStudent(userId, studentId, institution_id);
      if (!linked) return res.status(403).json({ error: 'Access denied: student not linked to parent' });
    }

    if (userRole === 'student') {
      const myStudentId = await getStudentByUserId(userId, institution_id);
      if (!myStudentId || myStudentId !== studentId) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    const start_date = req.query?.start_date ? String(req.query.start_date) : null;
    const end_date = req.query?.end_date ? String(req.query.end_date) : null;

    const rollup = await getHoursRollup({ institution_id, person_id: studentId, person_type: PERSON_TYPE.STUDENT, start_date, end_date });
    return res.json({ person_type: PERSON_TYPE.STUDENT, person_id: studentId, ...rollup });
  } catch (err) {
    console.error('getStudentHours error:', err);
    return res.status(500).json({ error: err.message });
  }
};
