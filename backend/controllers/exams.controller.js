const supabase = require("../utils/supabaseClient.js");
const { authorizeTeacherForSubject, resolveTeacher } = require("../middleware/resolveTeacher.js");

const fetchSubjectClassLinkSource = async (subjectId, institutionId) => {
    const { data: subjectWithMetadata, error: subjectWithMetadataError } = await supabase
        .from('subjects')
        .select('class_id, metadata')
        .eq('id', subjectId)
        .eq('institution_id', institutionId)
        .single();

    if (!subjectWithMetadataError) {
        return subjectWithMetadata;
    }

    // Backward compatibility: some deployments do not have subjects.metadata yet.
    if (subjectWithMetadataError.code !== '42703') {
        throw subjectWithMetadataError;
    }

    const { data: fallbackSubject, error: fallbackSubjectError } = await supabase
        .from('subjects')
        .select('class_id')
        .eq('id', subjectId)
        .eq('institution_id', institutionId)
        .single();

    if (fallbackSubjectError) {
        throw fallbackSubjectError;
    }

    return { class_id: fallbackSubject?.class_id || null, metadata: null };
};

const getSubjectLinkedClassIds = async (subjectId, institutionId, cachedSubject = null) => {
    const classIds = new Set();
    let subjectRow = cachedSubject;

    if (!subjectRow) {
        subjectRow = await fetchSubjectClassLinkSource(subjectId, institutionId);
    }

    if (subjectRow?.class_id) classIds.add(subjectRow.class_id);
    if (Array.isArray(subjectRow?.metadata?.class_ids)) {
        subjectRow.metadata.class_ids.filter(Boolean).forEach((id) => classIds.add(id));
    }

    let linkRows = [];
    const { data: scopedLinkRows, error: linkErr } = await supabase
        .from('subject_classes')
        .select('class_id')
        .eq('subject_id', subjectId)
        .eq('institution_id', institutionId);

    if (!linkErr) {
        linkRows = scopedLinkRows || [];
    } else if (linkErr.code === '42P01') {
        linkRows = [];
    } else if (linkErr.code === '42703') {
        const { data: fallbackLinkRows, error: fallbackLinkErr } = await supabase
            .from('subject_classes')
            .select('class_id')
            .eq('subject_id', subjectId);

        if (fallbackLinkErr && fallbackLinkErr.code !== '42P01') throw fallbackLinkErr;
        linkRows = fallbackLinkRows || [];
    } else {
        throw linkErr;
    }

    (linkRows || []).forEach((row) => {
        if (row.class_id) classIds.add(row.class_id);
    });

    return Array.from(classIds);
};

const getTeacherSubjectIds = async (userId, institutionId) => {
    const teacher = await resolveTeacher(userId);
    if (!teacher) return [];

    const teacherId = teacher.id;

    let primaryQuery = supabase
        .from('subjects')
        .select('id')
        .eq('teacher_id', teacherId);
    if (institutionId) primaryQuery = primaryQuery.eq('institution_id', institutionId);

    let assocQuery = supabase
        .from('subject_teachers')
        .select('subject_id')
        .eq('teacher_id', teacherId);
    if (institutionId) assocQuery = assocQuery.eq('institution_id', institutionId);

    const [
        { data: primarySubjects, error: primaryError },
        { data: assocSubjects, error: assocError },
    ] = await Promise.all([
        primaryQuery,
        assocQuery,
    ]);

    if (primaryError) throw primaryError;
    if (assocError && assocError.code !== '42P01') throw assocError;

    return Array.from(
        new Set([
            ...(primarySubjects || []).map((s) => s.id),
            ...(assocSubjects || []).map((s) => s.subject_id),
        ].filter(Boolean))
    );
};

/**
 * Exams Management
 */
exports.createExam = async (req, res) => {
    try {
        const { institution_id, userId, userRole } = req;
        const { subject_id, teacher_id, title, description, date, max_score, weight, term, is_published } = req.body;

        let effectiveTeacherId = teacher_id;
        if (userRole === 'teacher') {
            const result = await authorizeTeacherForSubject(userId, subject_id, res);
            if (!result) return;
            effectiveTeacherId = result.teacherId;
        } else if (userRole !== 'admin') {
            return res.status(403).json({ error: "Unauthorized" });
        }

        const { data, error } = await supabase
            .from("exams")
            .insert([{
                institution_id,
                subject_id,
                teacher_id: effectiveTeacherId,
                title,
                description,
                date,
                max_score,
                weight: weight || 0,
                term,
                is_published: is_published !== undefined ? is_published : true
            }])
            .select()
            .single();

        if (error) throw error;
        res.status(201).json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getExams = async (req, res) => {
    try {
        const { subject_id } = req.query;
        const { institution_id, userRole, userId } = req;
        let query = supabase.from("exams").select("*").eq("institution_id", institution_id);
        if (subject_id) query = query.eq("subject_id", subject_id);

        if (userRole === 'teacher') {
            const allowedSubjectIds = await getTeacherSubjectIds(userId, institution_id);
            if (allowedSubjectIds.length === 0) return res.json([]);
            query = query.in('subject_id', allowedSubjectIds);
        }

        const { data, error } = await query;
        if (error) throw error;
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * Exam Results (Grading)
 */
exports.recordExamResult = async (req, res) => {
    try {
        const { exam_id, student_id, score, feedback, graded_by } = req.body;
        const { institution_id, userId, userRole } = req;

        // Fetch the exam to find its subject
        const { data: exam } = await supabase.from('exams').select('subject_id').eq('id', exam_id).single();
        if (!exam) return res.status(404).json({ error: "Exam not found" });
        const subjectId = exam.subject_id;

        // Fetch subject details (teacher and class)
        const { data: subject } = await supabase.from('subjects').select('class_id, teacher_id').eq('id', subjectId).single();
        if (!subject) return res.status(404).json({ error: "Subject not found" });

        let effectiveTeacherId = graded_by;
        if (userRole === 'teacher') {
            const result = await authorizeTeacherForSubject(userId, subjectId, res);
            if (!result) return;
            effectiveTeacherId = result.teacherId;
        } else if (userRole !== 'admin') {
            return res.status(403).json({ error: "Unauthorized" });
        }

        const { data: directEnrollment } = await supabase
            .from('enrollments')
            .select('id')
            .eq('student_id', student_id)
            .eq('subject_id', subjectId)
            .eq('institution_id', institution_id)
            .eq('status', 'enrolled')
            .maybeSingle();

        if (!directEnrollment) {
            const linkedClassIds = await getSubjectLinkedClassIds(subjectId, institution_id, subject);
            let enrolledInClass = false;

            if (linkedClassIds.length > 0) {
                const { data: classEnrollments, error: classEnrollmentError } = await supabase
                    .from('class_enrollments')
                    .select('id')
                    .eq('student_id', student_id)
                    .eq('institution_id', institution_id)
                    .in('class_id', linkedClassIds)
                    .eq('status', 'enrolled')
                    .limit(1);

                if (classEnrollmentError) throw classEnrollmentError;

                enrolledInClass = Array.isArray(classEnrollments) && classEnrollments.length > 0;
            }

            if (!enrolledInClass) {
                return res.status(400).json({ error: "Access denied: Student is not enrolled for this subject" });
            }
        }

        const { data, error } = await supabase
            .from("exam_results")
            .upsert({ exam_id, student_id, score, feedback, graded_by: effectiveTeacherId, institution_id }, { onConflict: "exam_id, student_id" })
            .select();

        if (error) throw error;
        res.json(data[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getExamResults = async (req, res) => {
    try {
        const { exam_id, student_id } = req.query;
        const { institution_id, userRole, userId } = req;
        let query = supabase.from("exam_results")
            .select("*, student:students(user:users(full_name))")
            .eq("institution_id", institution_id);

        if (exam_id) query = query.eq("exam_id", exam_id);
        if (student_id) query = query.eq("student_id", student_id);

        if (userRole === 'teacher') {
            const allowedSubjectIds = await getTeacherSubjectIds(userId, institution_id);
            if (allowedSubjectIds.length === 0) return res.json([]);

            const { data: allowedExams, error: allowedExamsError } = await supabase
                .from('exams')
                .select('id')
                .eq('institution_id', institution_id)
                .in('subject_id', allowedSubjectIds);

            if (allowedExamsError) throw allowedExamsError;

            const allowedExamIds = (allowedExams || []).map((e) => e.id).filter(Boolean);
            if (allowedExamIds.length === 0) return res.json([]);

            query = query.in('exam_id', allowedExamIds);
        }

        const { data, error } = await query;
        if (error) throw error;
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getExamById = async (req, res) => {
    try {
        const { examId } = req.params;
        const { institution_id, userRole, userId } = req;

        const { data: exam, error } = await supabase
            .from('exams')
            .select('*')
            .eq('id', examId)
            .eq('institution_id', institution_id)
            .single();

        if (error || !exam) {
            return res.status(404).json({ error: 'Exam not found' });
        }

        if (userRole === 'teacher') {
            const result = await authorizeTeacherForSubject(userId, exam.subject_id, res);
            if (!result) return;
        } else if (userRole !== 'admin') {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        return res.json(exam);
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
};

exports.getExamRoster = async (req, res) => {
    try {
        const { examId } = req.params;
        const { institution_id, userRole, userId } = req;

        const { data: exam, error: examError } = await supabase
            .from('exams')
            .select('id, subject_id')
            .eq('id', examId)
            .eq('institution_id', institution_id)
            .single();

        if (examError || !exam) {
            return res.status(404).json({ error: 'Exam not found' });
        }

        if (userRole === 'teacher') {
            const result = await authorizeTeacherForSubject(userId, exam.subject_id, res);
            if (!result) return;
        } else if (userRole !== 'admin') {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const { data: subject, error: subjectError } = await supabase
            .from('subjects')
            .select('id, class_id')
            .eq('id', exam.subject_id)
            .eq('institution_id', institution_id)
            .single();

        if (subjectError || !subject) {
            return res.status(404).json({ error: 'Subject not found' });
        }

        const studentIds = new Set();

        const { data: subjectEnrollments, error: subjectEnrollmentError } = await supabase
            .from('enrollments')
            .select('student_id')
            .eq('institution_id', institution_id)
            .eq('subject_id', exam.subject_id)
            .eq('status', 'enrolled');

        if (subjectEnrollmentError) throw subjectEnrollmentError;
        (subjectEnrollments || []).forEach((row) => {
            if (row.student_id) studentIds.add(row.student_id);
        });

        const linkedClassIds = await getSubjectLinkedClassIds(exam.subject_id, institution_id, subject);
        if (linkedClassIds.length > 0) {
            const { data: classEnrollments, error: classEnrollmentError } = await supabase
                .from('class_enrollments')
                .select('student_id')
                .eq('institution_id', institution_id)
                .in('class_id', linkedClassIds)
                .eq('status', 'enrolled');

            if (classEnrollmentError) throw classEnrollmentError;
            (classEnrollments || []).forEach((row) => {
                if (row.student_id) studentIds.add(row.student_id);
            });
        }

        const uniqueStudentIds = Array.from(studentIds);
        if (uniqueStudentIds.length === 0) return res.json([]);

        const { data: students, error: studentsError } = await supabase
            .from('students')
            .select('id, id_number, admission_number, users!inner(full_name, first_name, last_name)')
            .eq('institution_id', institution_id)
            .in('id', uniqueStudentIds);

        if (studentsError) throw studentsError;

        const roster = (students || [])
            .map((student) => {
                const fallbackName = [student.users?.first_name, student.users?.last_name].filter(Boolean).join(' ').trim();
                const name = student.users?.full_name || fallbackName || 'Unknown Student';
                return {
                    student_id: student.id,
                    student_display_id: student.id_number || student.admission_number || student.id,
                    name,
                    full_name: name,
                };
            })
            .sort((a, b) => a.name.localeCompare(b.name));

        return res.json(roster);
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
};
