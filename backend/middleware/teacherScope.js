const supabase = require('../utils/supabaseClient.js');

/**
 * Resolve teacher scope for a given user.
 * Returns an object containing teacherId, taught subject IDs, class teacher class IDs,
 * subject-linked class IDs, and the active role mode (strictly 'subject', 'class', or 'librarian').
 */
async function resolveTeacherScope(userId, institutionId, requestedMode = null) {
    if (!userId) return null;

    // 1. Fetch teacher record
    const { data: teacher, error } = await supabase
        .from('teachers')
        .select('id, user_id, department, qualification, position')
        .eq('user_id', userId)
        .single();

    if (error || !teacher) {
        return null;
    }

    const teacherId = teacher.id;

    // 2. Fetch primary subjects
    let primaryQuery = supabase
        .from('subjects')
        .select('id, class_id')
        .eq('teacher_id', teacherId);
    if (institutionId) primaryQuery = primaryQuery.eq('institution_id', institutionId);

    // Fetch assistant subjects
    let assocQuery = supabase
        .from('subject_teachers')
        .select('subject_id, subject:subjects(id, class_id)')
        .eq('teacher_id', teacherId);
    if (institutionId) assocQuery = assocQuery.eq('institution_id', institutionId);

    const [{ data: primarySubjects }, { data: assocSubjects }] = await Promise.all([
        primaryQuery,
        assocQuery,
    ]);

    const subjectsMap = new Map();
    (primarySubjects || []).forEach((s) => {
        if (s?.id) subjectsMap.set(s.id, s);
    });
    (assocSubjects || []).map((a) => a.subject).filter(Boolean).forEach((s) => {
        if (s?.id) subjectsMap.set(s.id, s);
    });

    const subjectIds = Array.from(subjectsMap.keys());
    const directClassIds = Array.from(subjectsMap.values()).map((s) => s.class_id).filter(Boolean);

    // Fetch classes linked via subject_classes table
    let linkedClassIds = [];
    if (subjectIds.length > 0) {
        try {
            const { data: scData, error: scErr } = await supabase
                .from('subject_classes')
                .select('class_id')
                .in('subject_id', subjectIds);
            if (!scErr && scData) {
                linkedClassIds = scData.map((r) => r.class_id).filter(Boolean);
            }
        } catch (e) {
            // Ignore if table unavailable
        }
    }
    const subjectClassIds = [...new Set([...directClassIds, ...linkedClassIds])];

    // 3. Fetch classes where user is assigned Class Teacher
    let ctQuery = supabase
        .from('classes')
        .select('id, grade_level, form_level, stream, class_type')
        .eq('teacher_id', teacherId);
    if (institutionId) ctQuery = ctQuery.eq('institution_id', institutionId);
    const { data: ctClasses } = await ctQuery;
    const classTeacherClassIds = (ctClasses || []).map((c) => c.id);

    // Fetch HOD subjects where this teacher is HOD
    let hodQuery = supabase
        .from('subjects')
        .select('id')
        .eq('hod_teacher_id', teacherId);
    if (institutionId) hodQuery = hodQuery.eq('institution_id', institutionId);

    let hodAssocQuery = supabase
        .from('subject_teachers')
        .select('subject_id')
        .eq('teacher_id', teacherId)
        .eq('is_hod', true);
    if (institutionId) hodAssocQuery = hodAssocQuery.eq('institution_id', institutionId);

    const [{ data: hodDirect }, { data: hodAssoc }] = await Promise.all([
        hodQuery,
        hodAssocQuery,
    ]);

    const hodSubjectIds = [
        ...new Set([
            ...(hodDirect || []).map((s) => s.id),
            ...(hodAssoc || []).map((a) => a.subject_id),
        ]),
    ];

    const isClassTeacher = classTeacherClassIds.length > 0;
    const isSubjectTeacher = subjectIds.length > 0;
    const isHOD = teacher.position === 'head_of_department' || hodSubjectIds.length > 0;

    // 4. Determine activeMode strictly per Part B6
    // If requestedMode is valid for this teacher, use it; otherwise fallback cleanly.
    let activeMode = 'subject';
    const normReqMode = String(requestedMode || '').toLowerCase().trim();

    if (normReqMode === 'class' && isClassTeacher) {
        activeMode = 'class';
    } else if (normReqMode === 'hod' && isHOD) {
        activeMode = 'hod';
    } else if (normReqMode === 'subject' && isSubjectTeacher) {
        activeMode = 'subject';
    } else if (normReqMode === 'librarian') {
        activeMode = 'librarian';
    } else if (isSubjectTeacher) {
        activeMode = 'subject';
    } else if (isClassTeacher) {
        activeMode = 'class';
    } else if (isHOD) {
        activeMode = 'hod';
    }

    return {
        teacherId,
        teacher,
        subjectIds,
        taughtSubjectIds: subjectIds,
        subjectClassIds,
        taughtClassIds: subjectClassIds,
        classTeacherClassIds,
        classTeacherClasses: ctClasses || [],
        isClassTeacher,
        isSubjectTeacher,
        isHOD,
        hodSubjectIds,
        activeMode,
    };
}

/**
 * Express middleware that attaches req.teacherScope if the user is a teacher.
 */
async function teacherScopeMiddleware(req, res, next) {
    const userRole = req.userRole || req.user?.role;
    if (userRole !== 'teacher') {
        return next();
    }

    const userId = req.userId || req.user?.id;
    const institutionId = req.institution_id || req.user?.institution_id;
    const requestedMode = req.headers['x-teacher-role-mode'] || req.query.role_mode;

    try {
        const scope = await resolveTeacherScope(userId, institutionId, requestedMode);
        req.teacherScope = scope;
        next();
    } catch (err) {
        console.error('[teacherScopeMiddleware] Error resolving scope:', err);
        next();
    }
}

/**
 * Validates whether a teacher is authorized to access a specific class.
 * In 'class' mode: must be designated Class Teacher of that class.
 * In 'subject' mode: must teach at least one subject in that class.
 * If mode is not specified: true if either condition holds.
 */
async function isTeacherAuthorizedForClass(teacherId, classId, institutionId, mode = null) {
    if (!teacherId || !classId) return false;

    // Check Class Teacher designation
    let ctQuery = supabase
        .from('classes')
        .select('id')
        .eq('id', classId)
        .eq('teacher_id', teacherId);
    if (institutionId) ctQuery = ctQuery.eq('institution_id', institutionId);
    const { data: ctData } = await ctQuery.maybeSingle();
    const isCT = !!ctData;

    if (mode === 'class') return isCT;

    // Check Subject Teacher link: direct or via subject_classes
    const { data: directSubj } = await supabase
        .from('subjects')
        .select('id')
        .eq('class_id', classId)
        .eq('teacher_id', teacherId)
        .limit(1);
    if (directSubj && directSubj.length > 0) return true;

    const { data: assocSubj } = await supabase
        .from('subject_teachers')
        .select('subject:subjects!inner(id, class_id)')
        .eq('teacher_id', teacherId)
        .eq('subject.class_id', classId)
        .limit(1);
    if (assocSubj && assocSubj.length > 0) return true;

    // Check subject_classes table
    try {
        const { data: scData } = await supabase
            .from('subject_classes')
            .select('subject_id, subject:subjects!inner(teacher_id)')
            .eq('class_id', classId)
            .eq('subject.teacher_id', teacherId)
            .limit(1);
        if (scData && scData.length > 0) return true;
    } catch (e) {
        // Ignore
    }

    if (mode === 'subject') return false;
    return isCT;
}

/**
 * Validates whether a teacher is authorized for a specific subject.
 */
async function isTeacherAuthorizedForSubject(teacherId, subjectId) {
    if (!teacherId || !subjectId) return false;

    const { data: direct } = await supabase
        .from('subjects')
        .select('id')
        .eq('id', subjectId)
        .eq('teacher_id', teacherId)
        .maybeSingle();
    if (direct) return true;

    const { data: assoc } = await supabase
        .from('subject_teachers')
        .select('id')
        .eq('subject_id', subjectId)
        .eq('teacher_id', teacherId)
        .maybeSingle();
    return !!assoc;
}

module.exports = {
    resolveTeacherScope,
    teacherScopeMiddleware,
    isTeacherAuthorizedForClass,
    isTeacherAuthorizedForSubject,
};
