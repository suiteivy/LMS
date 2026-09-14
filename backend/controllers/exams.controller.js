const supabase = require("../utils/supabaseClient.js");
const { authorizeTeacherForSubject, resolveTeacher } = require("../middleware/resolveTeacher.js");
const { logRecordChange } = require("../utils/auditLogger.js");

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
    } else if (linkErr.code === '42P01' || linkErr.code === 'PGRST205') {
        // Table does not exist (Postgres 42P01) or PostgREST can't find it (PGRST205)
        linkRows = [];
    } else if (linkErr.code === '42703') {
        const { data: fallbackLinkRows, error: fallbackLinkErr } = await supabase
            .from('subject_classes')
            .select('class_id')
            .eq('subject_id', subjectId);

        if (fallbackLinkErr && fallbackLinkErr.code !== '42P01' && fallbackLinkErr.code !== 'PGRST205') throw fallbackLinkErr;
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
        const { subject_id, teacher_id, title, description, date, max_score, weight, term, is_published, submission_deadline } = req.body;

        if (!subject_id || !title || !date) {
            return res.status(400).json({ error: "subject_id, title, and date are required" });
        }

        // Part F1: Gate scheduling behind completed Admin setup (active term/academic year)
        const { resolveActiveTerm } = require("../utils/resolveActiveTerm.js");
        const activeTerm = await resolveActiveTerm(institution_id);
        if (!activeTerm) {
            return res.status(400).json({
                error: "Exam scheduling is disabled: An active academic year and term must first be configured by Admin."
            });
        }

        // Part F2: Scheduling & paper creation restricted strictly to Admin and HOD for this subject
        let effectiveTeacherId = teacher_id;
        if (userRole === 'teacher') {
            const { resolveTeacherScope } = require("../middleware/teacherScope.js");
            const scope = await resolveTeacherScope(userId, institution_id);
            const isHODForSubject = scope?.isHOD && (scope.hodSubjectIds || []).includes(subject_id);
            if (!isHODForSubject) {
                return res.status(403).json({
                    error: "Access denied: Only the Head of Department (HOD) for this subject or an Admin can schedule exams."
                });
            }
            effectiveTeacherId = scope.teacherId;
        } else if (userRole !== 'admin') {
            return res.status(403).json({ error: "Unauthorized" });
        }

        const effectiveTerm = term || activeTerm.name || "Term 1";

        const { data, error } = await supabase
            .from("exams")
            .insert([{
                institution_id,
                subject_id,
                teacher_id: effectiveTeacherId,
                title,
                description,
                date,
                max_score: max_score || 100,
                weight: weight || 0,
                term: effectiveTerm,
                is_published: is_published !== undefined ? is_published : true,
                submission_deadline: submission_deadline || null
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
        const { subject_id, student_id } = req.query;
        const { institution_id, userRole, userId } = req;
        let query = supabase.from("exams").select("*, subjects(id, title, class_id)").eq("institution_id", institution_id);
        if (subject_id) query = query.eq("subject_id", subject_id);

        if (userRole === 'teacher') {
            const allowedSubjectIds = await getTeacherSubjectIds(userId, institution_id);
            if (allowedSubjectIds.length === 0) return res.json([]);
            query = query.in('subject_id', allowedSubjectIds);
        } else if (userRole === 'student') {
            const { data: student } = await supabase.from('students').select('id').eq('user_id', userId).maybeSingle();
            if (!student) return res.json([]);

            const { data: enrollments } = await supabase.from('enrollments').select('subject_id').eq('student_id', student.id).eq('status', 'enrolled');
            const { data: classEnrollments } = await supabase.from('class_enrollments').select('class_id').eq('student_id', student.id);
            const classIds = (classEnrollments || []).map(c => c.class_id).filter(Boolean);
            let classSubjectIds = [];
            if (classIds.length > 0) {
                const { data: classSubs } = await supabase.from('subjects').select('id').in('class_id', classIds).eq('institution_id', institution_id);
                classSubjectIds = (classSubs || []).map(s => s.id);
            }
            const studentSubjectIds = [...new Set([...(enrollments || []).map(e => e.subject_id), ...classSubjectIds])];
            if (studentSubjectIds.length === 0) return res.json([]);
            query = query.in('subject_id', studentSubjectIds).eq('is_published', true);
        } else if (userRole === 'parent') {
            const { data: parent } = await supabase.from('parents').select('id').eq('user_id', userId).maybeSingle();
            if (!parent) return res.json([]);

            const { data: parentStudents } = await supabase.from('parent_students').select('student_id').eq('parent_id', parent.id);
            const childIds = (parentStudents || []).map(ps => ps.student_id);
            const targetChildId = student_id && childIds.includes(student_id) ? student_id : null;
            const relevantChildIds = targetChildId ? [targetChildId] : childIds;
            if (relevantChildIds.length === 0) return res.json([]);

            const { data: enrollments } = await supabase.from('enrollments').select('subject_id').in('student_id', relevantChildIds).eq('status', 'enrolled');
            const { data: classEnrollments } = await supabase.from('class_enrollments').select('class_id').in('student_id', relevantChildIds);
            const classIds = (classEnrollments || []).map(c => c.class_id).filter(Boolean);
            let classSubjectIds = [];
            if (classIds.length > 0) {
                const { data: classSubs } = await supabase.from('subjects').select('id').in('class_id', classIds).eq('institution_id', institution_id);
                classSubjectIds = (classSubs || []).map(s => s.id);
            }
            const parentSubjectIds = [...new Set([...(enrollments || []).map(e => e.subject_id), ...classSubjectIds])];
            if (parentSubjectIds.length === 0) return res.json([]);
            query = query.in('subject_id', parentSubjectIds).eq('is_published', true);
        }

        const { data, error } = await query.order('date', { ascending: false });
        if (error) throw error;
        res.json(data || []);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * Exam Results (Grading)
 */
exports.recordExamResult = async (req, res) => {
    try {
        const { exam_id, student_id, score, feedback, graded_by, competency_band } = req.body;
        const { institution_id, userId, userRole } = req;

        // Fetch the exam to find its subject & deadline
        const { data: exam } = await supabase
            .from('exams')
            .select('subject_id, submission_deadline, date, max_score')
            .eq('id', exam_id)
            .single();
        if (!exam) return res.status(404).json({ error: "Exam not found" });
        const subjectId = exam.subject_id;

        // Submission deadline check: regular teachers are locked after deadline; HOD/Admin retain override access
        if (userRole === 'teacher' && exam.submission_deadline) {
            const now = new Date();
            const deadline = new Date(exam.submission_deadline);
            if (now > deadline) {
                const { resolveTeacherScope } = require("../middleware/teacherScope.js");
                const scope = await resolveTeacherScope(userId, institution_id);
                const isHOD = scope?.isHOD && (scope.hodSubjectIds || []).includes(subjectId);
                if (!isHOD) {
                    return res.status(403).json({
                        error: "Submission deadline has passed. Exam results are now locked for teachers."
                    });
                }
            }
        }

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

        // Part G: Dynamic competency / grading band based on configured grading scales
        let calculatedBand = competency_band;
        if (!calculatedBand && score !== undefined && score !== null) {
            const maxScore = Number(exam.max_score) || 100;
            const percentage = (Number(score) / maxScore) * 100;

            let activeScales = [];
            if (institution_id) {
                const { data: scalesData } = await supabase
                    .from('grading_scales')
                    .select('*')
                    .eq('institution_id', institution_id)
                    .eq('is_active', true)
                    .order('min_score', { ascending: false });
                activeScales = scalesData || [];
            }

            if (activeScales.length > 0) {
                const match = activeScales.find(s => percentage >= s.min_score && percentage <= s.max_score);
                if (match) {
                    calculatedBand = match.letter_grade || match.name;
                } else if (percentage < activeScales[activeScales.length - 1].min_score) {
                    calculatedBand = activeScales[activeScales.length - 1].letter_grade || activeScales[activeScales.length - 1].name;
                } else {
                    calculatedBand = activeScales[0].letter_grade || activeScales[0].name;
                }
            } else {
                if (percentage >= 80) calculatedBand = 'EE';
                else if (percentage >= 60) calculatedBand = 'ME';
                else if (percentage >= 40) calculatedBand = 'AE';
                else calculatedBand = 'BE';
            }
        }

        // Fetch existing result for audit logging
        const { data: existingResult } = await supabase
            .from('exam_results')
            .select('*')
            .eq('exam_id', exam_id)
            .eq('student_id', student_id)
            .maybeSingle();

        const upsertPayload = {
            exam_id,
            student_id,
            score,
            feedback,
            graded_by: effectiveTeacherId,
            institution_id
        };
        if (calculatedBand) {
            upsertPayload.competency_band = calculatedBand;
        }

        const { data, error } = await supabase
            .from("exam_results")
            .upsert(upsertPayload, { onConflict: "exam_id, student_id" })
            .select();

        if (error) throw error;

        // Audit log modifications
        await logRecordChange({
            institution_id,
            table_name: 'exam_results',
            record_id: data[0]?.id || `${exam_id}_${student_id}`,
            changed_by: userId,
            change_type: existingResult ? 'UPDATE' : 'CREATE',
            old_values: existingResult ? { score: existingResult.score, feedback: existingResult.feedback, competency_band: existingResult.competency_band } : null,
            new_values: { score, feedback, competency_band: calculatedBand },
            reason: 'Exam result recording/modification'
        });

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
        } else if (userRole === 'student') {
            const { data: student } = await supabase.from('students').select('id').eq('user_id', userId).single();
            if (!student) return res.json([]);
            query = query.eq('student_id', student.id);
        } else if (userRole === 'parent') {
            const { data: parent } = await supabase.from('parents').select('id').eq('user_id', userId).single();
            if (!parent) return res.json([]);

            const { data: parentStudents } = await supabase.from('parent_students').select('student_id').eq('parent_id', parent.id);
            const childIds = (parentStudents || []).map(ps => ps.student_id);
            if (childIds.length === 0) return res.json([]);

            const targetChildId = req.query.student_id;
            if (targetChildId) {
                if (!childIds.includes(targetChildId)) {
                    return res.status(403).json({ error: "Access denied: student is not your linked child" });
                }
                query = query.eq('student_id', targetChildId);
            } else {
                query = query.in('student_id', childIds);
            }
        }

        const { data, error } = await query;
        if (error) throw error;

        // If student or parent, only return results whose exams are published
        let results = data || [];
        if (userRole === 'student' || userRole === 'parent') {
            results = results.filter(r => r.exams?.is_published !== false);
        }
        res.json(results);
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
        } else if (userRole === 'student' || userRole === 'parent') {
            if (!exam.is_published) {
                return res.status(403).json({ error: 'Exam is not published' });
            }
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
