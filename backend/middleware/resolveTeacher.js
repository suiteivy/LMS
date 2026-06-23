const supabase = require("../utils/supabaseClient.js");

/**
 * Resolve the teacher profile for a given userId.
 * Returns { teacherId, teacher } or sends 404 and returns null.
 */
async function resolveTeacher(userId, res) {
    const { data: teacher, error } = await supabase
        .from('teachers')
        .select('id, user_id')
        .eq('user_id', userId)
        .single();

    if (error || !teacher) {
        if (res && !res.headersSent) {
            res.status(404).json({ error: "Teacher profile not found" });
        }
        return null;
    }
    return teacher;
}

/**
 * Check if a teacher is assigned to a specific subject (primary via subjects.teacher_id or assistant via subject_teachers).
 * Returns { isAssigned, subject } — subject always included for downstream class_id access.
 */
async function isTeacherAssignedToSubject(teacherId, subjectId) {
    const { data: subject, error: sError } = await supabase
        .from('subjects')
        .select('id, teacher_id, class_id')
        .eq('id', subjectId)
        .single();

    if (sError || !subject) {
        return { isAssigned: false, subject: null };
    }

    if (subject.teacher_id === teacherId) {
        return { isAssigned: true, subject };
    }

    const { data: assoc } = await supabase
        .from('subject_teachers')
        .select('id')
        .eq('subject_id', subjectId)
        .eq('teacher_id', teacherId)
        .maybeSingle();

    return { isAssigned: !!assoc, subject };
}

/**
 * Check if a student is enrolled in a specific class via class_enrollments.
 */
async function isStudentEnrolledInClass(studentId, classId) {
    const { data } = await supabase
        .from('class_enrollments')
        .select('id')
        .eq('student_id', studentId)
        .eq('class_id', classId)
        .maybeSingle();

    return !!data;
}

/**
 * Check if a student is enrolled in a specific subject (via enrollments with status='enrolled').
 */
async function isStudentEnrolledInSubject(studentId, subjectId) {
    const { data } = await supabase
        .from('enrollments')
        .select('id, status')
        .eq('student_id', studentId)
        .eq('subject_id', subjectId)
        .maybeSingle();

    return data && data.status === 'enrolled';
}

/**
 * Combined enrollment check: student must be enrolled in the subject OR in the subject's class.
 */
async function isStudentEnrolled(studentId, subjectId) {
    // Check direct subject enrollment
    const subjectEnrolled = await isStudentEnrolledInSubject(studentId, subjectId);
    if (subjectEnrolled) return true;

    // Check class-based enrollment
    const { data: subject } = await supabase
        .from('subjects')
        .select('class_id')
        .eq('id', subjectId)
        .single();

    if (subject?.class_id) {
        return await isStudentEnrolledInClass(studentId, subject.class_id);
    }

    return false;
}

/**
 * Full authorization middleware for teacher actions on a subject.
 * Checks: 1) teacher exists, 2) teacher is assigned to subject.
 * Returns { teacherId, subject } on success, or sends error and returns null.
 */
async function authorizeTeacherForSubject(userId, subjectId, res) {
    const teacher = await resolveTeacher(userId, res);
    if (!teacher) return null;

    const { isAssigned, subject } = await isTeacherAssignedToSubject(teacher.id, subjectId);
    if (!isAssigned) {
        if (res && !res.headersSent) {
            res.status(403).json({ error: "Access denied: You do not teach this subject" });
        }
        return null;
    }

    return { teacherId: teacher.id, subject };
}

module.exports = {
    resolveTeacher,
    isTeacherAssignedToSubject,
    isStudentEnrolledInClass,
    isStudentEnrolledInSubject,
    isStudentEnrolled,
    authorizeTeacherForSubject,
};
