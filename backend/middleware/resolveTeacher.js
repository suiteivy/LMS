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
 * Check if a teacher is assigned to a specific subject (primary via subjects.teacher_id, HOD, or assistant via subject_teachers).
 * When classId is supplied, validates that this teacher is assigned to this subject FOR this specific class (or is HOD).
 * Returns { isAssigned, subject, isHod } — subject always included for downstream class_id access.
 */
async function isTeacherAssignedToSubject(teacherId, subjectId, classId = null) {
    const { data: subject, error: sError } = await supabase
        .from('subjects')
        .select('id, teacher_id, class_id, hod_teacher_id')
        .eq('id', subjectId)
        .single();

    if (sError || !subject) {
        return { isAssigned: false, subject: null, isHod: false };
    }

    const isHodDirect = subject.hod_teacher_id === teacherId;
    if (isHodDirect) {
        return { isAssigned: true, subject, isHod: true };
    }

    // Check if teacher is HOD via subject_teachers
    const { data: hodAssoc } = await supabase
        .from('subject_teachers')
        .select('id')
        .eq('subject_id', subjectId)
        .eq('teacher_id', teacherId)
        .eq('is_hod', true)
        .maybeSingle();

    if (hodAssoc) {
        return { isAssigned: true, subject, isHod: true };
    }

    // If classId is specified, check class-specific assignment
    if (classId) {
        const { data: classAssoc } = await supabase
            .from('subject_teachers')
            .select('id, teacher_id')
            .eq('subject_id', subjectId)
            .eq('class_id', classId)
            .maybeSingle();

        if (classAssoc) {
            // There is an explicit teacher assignment for this class!
            return { isAssigned: classAssoc.teacher_id === teacherId, subject, isHod: false };
        }
    }

    // Fallback: check general subject assignment
    if (subject.teacher_id === teacherId) {
        return { isAssigned: true, subject, isHod: false };
    }

    const { data: assoc } = await supabase
        .from('subject_teachers')
        .select('id, class_id')
        .eq('subject_id', subjectId)
        .eq('teacher_id', teacherId)
        .limit(1);

    if (assoc && assoc.length > 0) {
        if (classId && assoc[0].class_id && assoc[0].class_id !== classId) {
            return { isAssigned: false, subject, isHod: false };
        }
        return { isAssigned: true, subject, isHod: false };
    }

    return { isAssigned: false, subject, isHod: false };
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
async function authorizeTeacherForSubject(userId, subjectId, res, classId = null) {
    const teacher = await resolveTeacher(userId, res);
    if (!teacher) return null;

    const { isAssigned, subject } = await isTeacherAssignedToSubject(teacher.id, subjectId, classId);
    if (!isAssigned) {
        if (res && !res.headersSent) {
            res.status(403).json({ error: "Access denied: You do not teach this subject" });
        }
        return null;
    }

    return { teacherId: teacher.id, subject };
}

/**
 * Authorization for Class Teacher actions on a class.
 * Checks: 1) teacher exists, 2) teacher is designated class teacher for classId.
 * Returns { teacherId, classData } on success, or sends error and returns null.
 */
async function authorizeClassTeacher(userId, classId, res) {
    const teacher = await resolveTeacher(userId, res);
    if (!teacher) return null;

    const { data: classData, error } = await supabase
        .from('classes')
        .select('id, teacher_id, grade_level, form_level, stream, class_type')
        .eq('id', classId)
        .single();

    if (error || !classData || classData.teacher_id !== teacher.id) {
        if (res && !res.headersSent) {
            res.status(403).json({ error: "Access denied: You are not the designated Class Teacher for this class" });
        }
        return null;
    }

    return { teacherId: teacher.id, classData };
}

module.exports = {
    resolveTeacher,
    isTeacherAssignedToSubject,
    isStudentEnrolledInClass,
    isStudentEnrolledInSubject,
    isStudentEnrolled,
    authorizeTeacherForSubject,
    authorizeClassTeacher,
};

