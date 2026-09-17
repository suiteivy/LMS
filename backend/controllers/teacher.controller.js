const supabase = require("../utils/supabaseClient.js");
const { resolveTeacher } = require("../middleware/resolveTeacher.js");
const { buildClassLabel } = require('../utils/classLabel');
const { resolveTeacherScope, isTeacherAuthorizedForClass } = require("../middleware/teacherScope.js");
const { logRecordChange } = require('../utils/auditLogger.js');


exports.getDashboardStats = async (req, res) => {
    const startTime = Date.now();
    try {
        const { userId, userRole } = req;
        const institution_id = req.institution_id || null;
        
        if (userRole !== 'teacher') {
            return res.status(403).json({ error: "Unauthorized" });
        }
        
        // 1. Get Teacher ID
        // Note: We filter by user_id only — institution_id is not stored on the teachers
        // row created by the DB trigger (it lives on the users table).
        const { data: teacher, error: tError } = await supabase
        .from('teachers')
        .select(`
            id,
            department,
            qualification,
            position,
            users:user_id(full_name, email, avatar_url)
        `)
        .eq('user_id', userId)
        .single();

        if (tError || !teacher) {
            console.error(`[TeacherDashboard] Teacher profile not found for userId=${userId}, institution=${institution_id}:`, tError);
            return res.status(404).json({ error: "Teacher profile not found" });
        }
        const teacherId = teacher.id;

        // Fetch primary subjects
        let primaryQuery = supabase
            .from('subjects')
            .select('*, classes(id, grade_level, form_level, stream, class_type)')
            .eq('teacher_id', teacher.id);
        if (institution_id) primaryQuery = primaryQuery.eq('institution_id', institution_id);
        const { data: primarySubjects, error: psError } = await primaryQuery;
        if (psError) throw psError;

        // Fetch assistant subjects
        let assocQuery = supabase
            .from('subject_teachers')
            .select('subject_id, subject:subjects!inner(*, classes(id, grade_level, form_level, stream, class_type))')
            .eq('teacher_id', teacher.id);
        if (institution_id) assocQuery = assocQuery.eq('institution_id', institution_id);
        const { data: assocSubjects, error: asError } = await assocQuery;
        if (asError) throw asError;

        // Combine and deduplicate subjects
        const subjectsMap = new Map();
        (primarySubjects || []).forEach(s => subjectsMap.set(s.id, s));
        (assocSubjects || []).map(as => as.subject).filter(Boolean).forEach(s => subjectsMap.set(s.id, s));
        const allSubjects = Array.from(subjectsMap.values());
        const subjectIds = allSubjects.map(s => s.id);

        // Fetch classes where designated Class Teacher
        let ctQuery = supabase
            .from('classes')
            .select('id, grade_level, form_level, stream')
            .eq('teacher_id', teacher.id);
        if (institution_id) ctQuery = ctQuery.eq('institution_id', institution_id);
        const { data: classTeacherOf, error: ctError } = await ctQuery;
        if (ctError) throw ctError;

        // Fetch roles
        const { data: userRolesData } = await supabase
            .from('user_roles')
            .select('roles(name)')
            .eq('user_id', userId);
        const userRoles = (userRolesData || []).map(ur => ur.roles?.name).filter(Boolean);

        const roles = new Set(userRoles);
        if (allSubjects.length > 0) roles.add('Subject Teacher');
        if (classTeacherOf && classTeacherOf.length > 0) roles.add('Class Teacher');
        if (teacher.position) {
            const positionMapping = {
                'teacher': 'Teacher',
                'head_of_department': 'Head of Department',
                'assistant': 'Assistant Teacher',
                'class_teacher': 'Class Teacher',
                'dean': 'Dean',
                'headteacher': 'Head Teacher',
                'deputy_headteacher': 'Deputy Head Teacher',
                'subject_teacher': 'Subject Teacher'
            };
            const nicePosition = positionMapping[teacher.position];
            if (nicePosition) roles.add(nicePosition);
        }
        const rolesArray = Array.from(roles);

        // Fetch unread notifications count
        const { count: unreadNotifications, error: notifError } = await supabase
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('is_read', false);
        if (notifError) throw notifError;
        // Determine active role mode per Part B1/B6
        const reqRoleMode = req.headers['x-teacher-role-mode'] || req.query.role_mode;
        let activeMode = 'subject';
        const hasSubjectRole = allSubjects.length > 0;
        const hasClassRole = classTeacherOf && classTeacherOf.length > 0;
        if (reqRoleMode === 'class' && hasClassRole) {
            activeMode = 'class';
        } else if (reqRoleMode === 'subject' && hasSubjectRole) {
            activeMode = 'subject';
        } else if (hasClassRole && !hasSubjectRole) {
            activeMode = 'class';
        } else {
            activeMode = 'subject';
        }

        let timetable = [];
        let studentsCount = 0;
        let displayedSubjects = allSubjects;

        if (activeMode === 'class' && hasClassRole) {
            const ctClassIds = classTeacherOf.map(c => c.id);
            // In class mode, students count is strictly students in this class
            const { data: ctEnrollments } = await supabase
                .from('class_enrollments')
                .select('student_id')
                .in('class_id', ctClassIds);
            const ctStudentIds = new Set((ctEnrollments || []).map(e => e.student_id));
            studentsCount = ctStudentIds.size;

            // Fetch subjects taught in this class
            let ctSubjQuery = supabase
                .from('subjects')
                .select('*, classes(id, grade_level, form_level, stream, class_type)')
                .in('class_id', ctClassIds);
            if (institution_id) ctSubjQuery = ctSubjQuery.eq('institution_id', institution_id);
            const { data: ctSubjects } = await ctSubjQuery;
            displayedSubjects = ctSubjects || [];

            // Timetable for the class
            let ttQuery = supabase
                .from('timetables')
                .select(`
                    id, day_of_week, start_time, end_time, room_number, class_id, subject_id,
                    classes(grade_level, form_level, stream, class_type),
                    subjects(title)
                `)
                .in('class_id', ctClassIds);
            if (institution_id) ttQuery = ttQuery.eq('institution_id', institution_id);
            const { data: ttData, error: ttError } = await ttQuery;
            if (ttError) throw ttError;
            timetable = ttData || [];
        } else {
            // Subject mode: strictly taught subjects
            if (subjectIds.length > 0) {
                const { data: enrollments } = await supabase
                    .from('enrollments')
                    .select('student_id')
                    .in('subject_id', subjectIds)
                    .eq('status', 'enrolled');
                const subStudentIds = new Set((enrollments || []).map(e => e.student_id));
                studentsCount = subStudentIds.size;

                let ttQuery = supabase
                    .from('timetables')
                    .select(`
                        id, day_of_week, start_time, end_time, room_number, class_id, subject_id,
                        classes(grade_level, form_level, stream, class_type),
                        subjects(title)
                    `)
                    .in('subject_id', subjectIds);
                if (institution_id) ttQuery = ttQuery.eq('institution_id', institution_id);
                const { data: ttData, error: ttError } = await ttQuery;
                if (ttError) throw ttError;
                timetable = ttData || [];
            }
            displayedSubjects = allSubjects;
        }

        // Get today's schedule
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const today = days[new Date().getDay()];
        const schedule = timetable.filter(t => t.day_of_week === today).map(item => ({
            ...item,
            classes: {
                ...item.classes,
                name: buildClassLabel(item.classes)
            }
        }));

        res.json({
            activeMode,
            stats: {
                studentsCount,
                subjectsCount: displayedSubjects.length,
                unreadNotifications: unreadNotifications || 0
            },
            profile: {
                id: teacher.id,
                department: teacher.department,
                qualification: teacher.qualification,
                position: teacher.position,
                full_name: teacher.users?.full_name,
                email: teacher.users?.email,
                avatar_url: teacher.users?.avatar_url
            },
            roles: rolesArray,
            classTeacherOf: classTeacherOf || [],
            assignedSubjects: displayedSubjects.map(s => {
                const subjectTimetables = timetable.filter(tt => tt.subject_id === s.id);
                return {
                    id: s.id,
                    title: s.title,
                    description: s.description,
                    class: s.classes ? {
                        id: s.classes.id,
                        name: buildClassLabel(s.classes),
                        grade_level: s.classes.grade_level,
                        form_level: s.classes.form_level,
                        stream: s.classes.stream,
                        class_type: s.classes?.class_type,
                    } : null,
                    timetable: subjectTimetables.map(tt => ({
                        day_of_week: tt.day_of_week,
                        start_time: tt.start_time,
                        end_time: tt.end_time,
                        room_number: tt.room_number
                    }))
                };
            }),
            schedule
        });

    } catch (err) {
        const elapsed = Date.now() - startTime;
        console.error("[TeacherDashboard] Error after", elapsed, "ms:", {
            message: err?.message,
            code: err?.code,
            details: err?.details,
            hint: err?.hint,
        });
        const isTransient = err?.message?.includes('fetch failed')
            || err?.message?.includes('timeout')
            || err?.code === 'SUPABASE_CIRCUIT_OPEN';
        if (isTransient) {
            res.setHeader('Retry-After', '5');
            return res.status(503).json({ error: 'Service temporarily unavailable. Please try again.' });
        }
        res.status(500).json({ error: 'Failed to load dashboard data' });
    }
};

exports.getAnalytics = async (req, res) => {
    try {
        const { userId, userRole } = req;
        if (userRole !== 'teacher') return res.status(403).json({ error: "Unauthorized" });

        const { data: teacher, error: tError } = await supabase.from('teachers').select('id').eq('user_id', userId).single();
        if (tError || !teacher) {
            console.error(`[TeacherAnalytics] Teacher profile not found for userId=${userId}:`, tError);
            return res.status(404).json({ error: "Teacher profile not found" });
        }
        const teacherId = teacher.id;

        const reqRoleMode = req.headers['x-teacher-role-mode'] || req.query.role_mode;
        const scope = await resolveTeacherScope(userId, req.institution_id, reqRoleMode);

        // 1. Get subjects from both ownership models:
        //    - primary owner: subjects.teacher_id
        //    - assistant/linked: subject_teachers.teacher_id
        const { data: primarySubjects } = await supabase
            .from('subjects')
            .select('id, title, class_id')
            .eq('teacher_id', teacherId);

        const { data: assocSubjects } = await supabase
            .from('subject_teachers')
            .select('subject_id, subject:subjects!inner(id, title, class_id)')
            .eq('teacher_id', teacherId);

        const subjectsMap = new Map();
        (primarySubjects || []).forEach((s) => {
            if (s?.id) subjectsMap.set(s.id, s);
        });
        (assocSubjects || [])
            .map((row) => row.subject)
            .filter(Boolean)
            .forEach((s) => {
                if (s?.id) subjectsMap.set(s.id, s);
            });

        let subjects = [];
        if (scope && scope.activeMode === 'class' && scope.classTeacherClassIds.length > 0) {
            let classSubjQuery = supabase
                .from('subjects')
                .select('id, title, class_id')
                .in('class_id', scope.classTeacherClassIds);
            if (req.institution_id) classSubjQuery = classSubjQuery.eq('institution_id', req.institution_id);
            const { data: ctSubjects, error: ctSubjErr } = await classSubjQuery;
            if (ctSubjErr) throw ctSubjErr;
            subjects = ctSubjects || [];
        } else {
            subjects = Array.from(subjectsMap.values());
        }
        if (subjects.length === 0) return res.json([]);

        // 2. Batch-fetch analytics data for ALL subjects at once (N+1 → 3 queries)
        const subjectIds = subjects.map(s => s.id);

        const [enrollmentResult, assignmentResult] = await Promise.all([
            // A. All enrollments for these subjects
            supabase
                .from('enrollments')
                .select('subject_id')
                .in('subject_id', subjectIds)
                .eq('status', 'enrolled'),
            // B. All assignments for these subjects
            supabase
                .from('assignments')
                .select('id, subject_id')
                .in('subject_id', subjectIds),
        ]);

        const allEnrollments = enrollmentResult.data || [];
        const allAssignments = assignmentResult.data || [];
        const allAssignmentIds = allAssignments.map(a => a.id);

        // C. All submissions for those assignments (single query)
        let allSubmissions = [];
        if (allAssignmentIds.length > 0) {
            const { data: subs } = await supabase
                .from('submissions')
                .select('assignment_id, grade, status')
                .in('assignment_id', allAssignmentIds);
            allSubmissions = subs || [];
        }

        // Build lookup maps
        const enrollCountBySubject = new Map();
        for (const e of allEnrollments) {
            enrollCountBySubject.set(e.subject_id, (enrollCountBySubject.get(e.subject_id) || 0) + 1);
        }

        const assignmentsBySubject = new Map();
        for (const a of allAssignments) {
            if (!assignmentsBySubject.has(a.subject_id)) assignmentsBySubject.set(a.subject_id, []);
            assignmentsBySubject.get(a.subject_id).push(a.id);
        }

        const submissionsByAssignment = new Map();
        for (const s of allSubmissions) {
            if (!submissionsByAssignment.has(s.assignment_id)) submissionsByAssignment.set(s.assignment_id, []);
            submissionsByAssignment.get(s.assignment_id).push(s);
        }

        // Aggregate per subject in memory
        const analytics = subjects.map((subject) => {
            const studentCount = enrollCountBySubject.get(subject.id) || 0;
            const assignmentIds = assignmentsBySubject.get(subject.id) || [];

            let avgGrade = 0;
            let submissionRate = 0;
            let gradingRate = 0;
            let totalSubsCount = 0;
            let gradedSubsCount = 0;

            if (assignmentIds.length > 0) {
                const submissions = assignmentIds.flatMap(aid => submissionsByAssignment.get(aid) || []);
                totalSubsCount = submissions.length;
                if (submissions.length > 0) {
                    const gradedSubs = submissions.filter(s => s.grade !== null);
                    gradedSubsCount = gradedSubs.length;
                    if (gradedSubs.length > 0) {
                        const totalScore = gradedSubs.reduce((sum, s) => sum + (s.grade || 0), 0);
                        avgGrade = Math.round(totalScore / gradedSubs.length);
                    }

                    // Grading rate: % of received submissions that have been marked
                    gradingRate = Math.round((gradedSubs.length / submissions.length) * 100);

                    // Submission rate: % of expected student assignments turned in
                    const expectedSubmissions = assignmentIds.length * studentCount;
                    if (expectedSubmissions > 0) {
                        submissionRate = Math.round((submissions.length / expectedSubmissions) * 100);
                    }
                }
            }

            return {
                id: subject.id,
                name: subject.title,
                students: studentCount,
                avgGrade,
                gradingRate,
                submissionRate,
                totalSubmissions: totalSubsCount,
                gradedSubmissions: gradedSubsCount,
                pendingGrading: totalSubsCount - gradedSubsCount,
                completionRate: submissionRate // backward-compatibility alias
            };
        });

        res.json(analytics);
    } catch (err) {
        console.error("[TeacherAnalytics] Error:", { message: err?.message, code: err?.code });
        res.status(500).json({ error: 'Failed to load analytics data' });
    }
};

/**
 * Get student performance data for teacher's subjects
 * Shows grades and submissions per student per subject
 */
exports.getStudentPerformance = async (req, res) => {
    try {
        const { userId, userRole } = req;
        const institution_id = req.institution_id || null;
        if (userRole !== 'teacher') return res.status(403).json({ error: "Unauthorized" });

        // 1. Get teacher ID
        const { data: teacher, error: tError } = await supabase.from('teachers').select('id').eq('user_id', userId).single();
        if (tError || !teacher) {
            console.error(`[TeacherStudentPerf] Teacher profile not found for userId=${userId}:`, tError);
            return res.status(404).json({ error: "Teacher profile not found" });
        }

        const reqRoleMode = req.headers['x-teacher-role-mode'] || req.query.role_mode;
        const scope = await resolveTeacherScope(userId, institution_id, reqRoleMode);

        let subjects = [];
        if (scope && scope.activeMode === 'class' && scope.classTeacherClassIds.length > 0) {
            let classSubjQuery = supabase
                .from('subjects')
                .select('id, title, class_id, classes(grade_level, form_level, stream, class_type)')
                .in('class_id', scope.classTeacherClassIds);
            if (institution_id) classSubjQuery = classSubjQuery.eq('institution_id', institution_id);
            const { data: ctSubjects, error: ctSubjErr } = await classSubjQuery;
            if (ctSubjErr) throw ctSubjErr;
            subjects = ctSubjects || [];
        } else {
            // 2. Get subjects taught by this teacher (primary or assistant)
            let primaryQuery = supabase
                .from('subjects')
                .select('id, title, class_id, classes(grade_level, form_level, stream, class_type)')
                .eq('teacher_id', teacher.id);
            if (institution_id) primaryQuery = primaryQuery.eq('institution_id', institution_id);
            const { data: primarySubjects } = await primaryQuery;

            let assocQuery = supabase
                .from('subject_teachers')
                .select('subject_id, subject:subjects!inner(id, title, class_id, classes(grade_level, form_level, stream, class_type))')
                .eq('teacher_id', teacher.id);
            if (institution_id) assocQuery = assocQuery.eq('institution_id', institution_id);
            const { data: assocSubjects } = await assocQuery;

            const primaryList = primarySubjects || [];
            const assocList = (assocSubjects || []).map(as => as.subject).filter(Boolean);

            // Deduplicate
            const subjectsMap = new Map();
            [...primaryList, ...assocList].forEach(s => subjectsMap.set(s.id, s));
            subjects = Array.from(subjectsMap.values());
        }

        if (subjects.length === 0) {
            return res.json({ subjects: [], students: [] });
        }

        const subjectIds = subjects.map(s => s.id);

        // 3. Get enrollments for those subjects (active only)
        const { data: enrollments } = await supabase
            .from('enrollments')
            .select(`
                id, student_id, subject_id,
                students ( id, user_id, grade_level, users(first_name, last_name, full_name, email, avatar_url) )
            `)
            .in('subject_id', subjectIds)
            .eq('status', 'enrolled');

        // Also get students from class_enrollments for the same subjects
        const classIds = [...new Set(subjects.map(s => s.class_id).filter(Boolean))];
        let classEnrolledStudents = [];
        if (classIds.length > 0) {
            const { data: ceData } = await supabase
                .from('class_enrollments')
                .select(`
                    student_id, class_id,
                    students ( id, user_id, grade_level, users(first_name, last_name, full_name, email, avatar_url) )
                `)
                .in('class_id', classIds);

            // Map class enrollments to subjects in that class so they aren't lost
            const directEnrollmentKeys = new Set((enrollments || []).map(e => `${e.student_id}:${e.subject_id}`));
            const subjectsByClass = new Map();
            subjects.forEach(s => {
                if (s.class_id) {
                    if (!subjectsByClass.has(s.class_id)) subjectsByClass.set(s.class_id, []);
                    subjectsByClass.get(s.class_id).push(s.id);
                }
            });

            (ceData || []).forEach(ce => {
                const subIds = subjectsByClass.get(ce.class_id) || [];
                subIds.forEach(subId => {
                    if (!directEnrollmentKeys.has(`${ce.student_id}:${subId}`)) {
                        classEnrolledStudents.push({
                            id: `${ce.student_id}:${subId}`,
                            student_id: ce.student_id,
                            subject_id: subId,
                            students: ce.students
                        });
                    }
                });
            });
        }

        const allEnrollments = [...(enrollments || []), ...classEnrolledStudents];

        // 4. Get submissions/grades for those students in those subjects
        const studentIds = [...new Set(allEnrollments.map(e => e.student_id).filter(Boolean))];

        let submissions = [];
        if (studentIds.length > 0) {
            const { data: subs } = await supabase
                .from('submissions')
                .select(`
                    id, student_id, assignment_id, grade, status, submitted_at, feedback,
                    assignments!inner ( title, subject_id, total_points )
                `)
                .in('student_id', studentIds)
                .in('assignments.subject_id', subjectIds);
            submissions = subs || [];
        }

        // 5. Build response grouped by subject
        const performance = subjects.map(subject => {
            const subjectEnrollments = allEnrollments.filter(e => e.subject_id === subject.id);
            const students = subjectEnrollments.map(enrollment => {
                const studentSubs = submissions.filter(
                    s => s.student_id === enrollment.student_id && s.assignments?.subject_id === subject.id
                );
                const gradedSubs = studentSubs.filter(s => s.grade !== null && s.grade !== undefined);
                const avgGrade = gradedSubs.length > 0
                    ? gradedSubs.reduce((sum, s) => sum + Number(s.grade), 0) / gradedSubs.length
                    : null;

                return {
                    student_id: enrollment.student_id,
                    full_name: enrollment.students?.users?.full_name || 'Unknown',
                    first_name: enrollment.students?.users?.first_name || '',
                    last_name: enrollment.students?.users?.last_name || '',
                    email: enrollment.students?.users?.email || '',
                    avatar_url: enrollment.students?.users?.avatar_url || null,
                    grade_level: enrollment.students?.grade_level || null,
                    submissions_count: studentSubs.length,
                    graded_count: gradedSubs.length,
                    average_grade: avgGrade !== null ? Math.round(avgGrade * 100) / 100 : null,
                    submissions: studentSubs.map(s => ({
                        id: s.id,
                        assignment_title: s.assignments?.title || 'Unknown',
                        total_marks: s.assignments?.total_points || 0,
                        grade: s.grade,
                        status: s.status,
                        submitted_at: s.submitted_at,
                        feedback: s.feedback,
                    })),
                };
            });

            return {
                subject_id: subject.id,
                subject_title: subject.title,
                class_name: buildClassLabel(subject.classes) || 'N/A',
                students,
            };
        });

        res.json(performance);
    } catch (err) {
        console.error("[TeacherStudentPerformance] Error:", { message: err?.message, code: err?.code });
        res.status(500).json({ error: 'Failed to load student performance data' });
    }
};

/**
 * Get student details scoped by Class Teacher vs Subject Teacher role permissions
 */
exports.getStudentDetails = async (req, res) => {
    try {
        const { studentId } = req.params;
        const { userId, userRole } = req;

        if (userRole !== 'teacher') {
            return res.status(403).json({ error: "Unauthorized" });
        }

        // 1. Resolve Teacher ID
        const { data: teacher, error: tError } = await supabase
            .from('teachers')
            .select('id')
            .eq('user_id', userId)
            .single();

        if (tError || !teacher) {
            return res.status(404).json({ error: "Teacher profile not found" });
        }
        const teacherId = teacher.id;

        const reqRoleMode = req.headers['x-teacher-role-mode'] || req.query.role_mode;
        const scope = await resolveTeacherScope(userId, req.institution_id, reqRoleMode);

        // 2. Fetch Student details
        const { data: student, error: sError } = await supabase
            .from('students')
            .select('*, users!inner(*)')
            .eq('id', studentId)
            .single();

        if (sError || !student) {
            return res.status(404).json({ error: "Student not found" });
        }

        // 3. Determine if teacher is Class Teacher for this student's class
        const { data: classEnrollment } = await supabase
            .from('class_enrollments')
            .select('class_id, classes!inner(teacher_id)')
            .eq('student_id', studentId)
            .maybeSingle();

        const isDesignatedClassTeacher = !!(classEnrollment && classEnrollment.classes?.teacher_id === teacherId);

        // 4. Determine if teacher is Subject Teacher for this student
        const teacherSubjectIds = scope ? scope.taughtSubjectIds : [];
        let studentSubjectIds = [];
        if (teacherSubjectIds.length > 0) {
            const { data: enrollData } = await supabase
                .from('enrollments')
                .select('subject_id')
                .eq('student_id', studentId)
                .in('subject_id', teacherSubjectIds)
                .eq('status', 'enrolled');

            studentSubjectIds = (enrollData || []).map(e => e.subject_id);
        }
        const teachesStudent = studentSubjectIds.length > 0;

        // 5. Gate Access based on active role mode
        let isClassTeacher = false;
        let isSubjectTeacher = false;

        if (scope && scope.activeMode === 'class') {
            if (!isDesignatedClassTeacher) {
                return res.status(403).json({ error: "Access denied: You are not the designated class teacher for this student" });
            }
            isClassTeacher = true;
        } else {
            // Subject mode
            if (!teachesStudent) {
                return res.status(403).json({ error: "Access denied: You do not teach this student" });
            }
            isSubjectTeacher = true;
        }

        // 6. Fetch Scoped Data
        let guardians = [];
        let attendance = [];
        let submissions = [];
        let examResults = [];

        if (isClassTeacher) {
            // Class Teacher gets full access
            const { data: parentStudents } = await supabase
                .from('parent_students')
                .select('relationship, parent:parents(occupation, address, user:users(full_name, email, phone, avatar_url))')
                .eq('student_id', studentId);
            guardians = parentStudents || [];

            // Fetch all attendance for this student in their class
            const { data: att } = await supabase
                .from('attendance')
                .select('date, status, notes, subject:subjects(title)')
                .eq('student_id', studentId)
                .eq('class_id', classEnrollment?.class_id);
            attendance = att || [];

            // Fetch all submissions
            const { data: subs } = await supabase
                .from('submissions')
                .select('grade, status, feedback, assignment:assignments(title, total_points, subject:subjects(title))')
                .eq('student_id', studentId);
            submissions = subs || [];

            // Fetch all exam results
            const { data: exams } = await supabase
                .from('exam_results')
                .select('score, feedback, exam:exams(title, max_score, subject:subjects(title))')
                .eq('student_id', studentId);
            examResults = exams || [];
        } else {
            // Subject Teacher gets subject-restricted access
            const { data: att } = await supabase
                .from('attendance')
                .select('date, status, notes, subject:subjects(title)')
                .eq('student_id', studentId)
                .in('subject_id', studentSubjectIds);
            attendance = att || [];

            // Fetch subject-specific submissions
            const { data: subs } = await supabase
                .from('submissions')
                .select('grade, status, feedback, assignment:assignments!inner(title, total_points, subject_id, subject:subjects(title))')
                .eq('student_id', studentId)
                .in('assignment.subject_id', studentSubjectIds);
            submissions = subs || [];

            // Fetch subject-specific exam results
            const { data: exams } = await supabase
                .from('exam_results')
                .select('score, feedback, exam:exams!inner(title, max_score, subject_id, subject:subjects(title))')
                .eq('student_id', studentId)
                .in('exam.subject_id', studentSubjectIds);
            examResults = exams || [];
        }

        res.json({
            isClassTeacher,
            isSubjectTeacher,
            profile: {
                id: student.id,
                full_name: student.users?.full_name,
                first_name: student.users?.first_name,
                last_name: student.users?.last_name,
                email: student.users?.email,
                avatar_url: student.users?.avatar_url,
                gender: student.users?.gender,
                date_of_birth: student.users?.date_of_birth,
                address: student.users?.address,
                grade_level: student.grade_level,
                form_level: student.form_level,
                academic_year: student.academic_year,
                admission_date: student.admission_date,
                status: student.users?.status,
                ...(isClassTeacher ? {
                    parent_contact: student.parent_contact,
                    emergency_contact_name: student.emergency_contact_name,
                    emergency_contact_phone: student.emergency_contact_phone,
                    fee_balance: student.fee_balance,
                    guardians
                } : {})
            },
            attendance,
            performance: {
                submissions,
                examResults
            }
        });

    } catch (err) {
        console.error("[TeacherStudentDetails] Error:", { message: err?.message, code: err?.code });
        res.status(500).json({ error: 'Failed to load student details' });
    }
};

// GET subject-class combinations for a teacher (grade-entry dropdown)
exports.getSubjectClasses = async (req, res) => {
    try {
        const { userId, institution_id } = req;
        const { subject_id } = req.query;

        const { data: teacher, error: tErr } = await supabase
            .from("teachers")
            .select("id")
            .eq("user_id", userId)
            .single();
        if (tErr || !teacher) return res.status(404).json({ error: "Teacher profile not found" });

        const reqRoleMode = req.headers['x-teacher-role-mode'] || req.query.role_mode;
        const scope = await resolveTeacherScope(userId, institution_id, reqRoleMode);

        let query = supabase
            .from("subjects")
            .select("id, title, class_id, classes(id, display_name, grade_level, form_level, stream, class_type)");

        if (institution_id) query = query.eq("institution_id", institution_id);
        if (subject_id) query = query.eq("id", subject_id);

        if (scope && scope.activeMode === 'class' && scope.classTeacherClassIds.length > 0) {
            query = query.in("class_id", scope.classTeacherClassIds);
            const { data: classSubjects, error: csErr } = await query;
            if (csErr) throw csErr;

            const resultsMap = new Map();

            (classSubjects || [])
                .filter((s) => s && s.class_id && s.classes)
                .forEach((s) => {
                    const key = `${s.id}_${s.class_id}`;
                    resultsMap.set(key, {
                        subject_id: s.id,
                        subject_title: s.title || 'Untitled Subject',
                        class_id: s.class_id,
                        class_name: buildClassLabel(s.classes) || s.classes?.name || s.classes?.display_name || 'Class',
                        grade_level: s.classes?.grade_level,
                        form_level: s.classes?.form_level,
                        stream: s.classes?.stream,
                    });
                });

            // Also check junction table for subjects assigned to these classes
            try {
                const { data: junctionRows } = await supabase
                    .from("subject_classes")
                    .select("subject_id, class_id, subject:subjects(id, title), classes:classes(id, display_name, grade_level, form_level, stream, class_type)")
                    .in("class_id", scope.classTeacherClassIds)
                    .eq("institution_id", institution_id);

                (junctionRows || []).forEach((jr) => {
                    if (jr.subject && jr.classes) {
                        const key = `${jr.subject_id}_${jr.class_id}`;
                        if (!resultsMap.has(key)) {
                            resultsMap.set(key, {
                                subject_id: jr.subject.id,
                                subject_title: jr.subject.title || 'Untitled Subject',
                                class_id: jr.class_id,
                                class_name: buildClassLabel(jr.classes) || jr.classes?.name || jr.classes?.display_name || 'Class',
                                grade_level: jr.classes?.grade_level,
                                form_level: jr.classes?.form_level,
                                stream: jr.classes?.stream,
                            });
                        }
                    }
                });
            } catch (_err) {
                // Ignore junction table query if table doesn't exist
            }

            return res.json({ success: true, data: Array.from(resultsMap.values()) });
        } else {
            // Subject mode: primary + assigned subjects
            query = query.eq("teacher_id", teacher.id);
            const { data: primary, error: pErr } = await query;
            if (pErr) throw pErr;

            const { data: assoc } = await supabase
                .from("subject_teachers")
                .select("subject_id, subject:subjects(id, title, class_id, classes(id, display_name, grade_level, form_level, stream, class_type))")
                .eq("teacher_id", teacher.id);

            const map = new Map();
            (primary || []).forEach((s) => map.set(s.id, s));
            (assoc || []).map((a) => a.subject).filter(Boolean).forEach((s) => map.set(s.id, s));

            const resultsMap = new Map();

            Array.from(map.values())
                .filter((s) => s && s.class_id && s.classes)
                .forEach((s) => {
                    const key = `${s.id}_${s.class_id}`;
                    resultsMap.set(key, {
                        subject_id: s.id,
                        subject_title: s.title || 'Untitled Subject',
                        class_id: s.class_id,
                        class_name: buildClassLabel(s.classes) || s.classes?.name || s.classes?.display_name || 'Class',
                        grade_level: s.classes?.grade_level,
                        form_level: s.classes?.form_level,
                        stream: s.classes?.stream,
                    });
                });

            // Also check junction table for subjects assigned to this teacher without direct class_id
            try {
                const allSubjectIds = Array.from(map.keys());
                if (allSubjectIds.length > 0) {
                    const { data: junctionRows } = await supabase
                        .from("subject_classes")
                        .select("subject_id, class_id, classes:classes(id, display_name, grade_level, form_level, stream, class_type)")
                        .in("subject_id", allSubjectIds)
                        .eq("institution_id", institution_id);

                    (junctionRows || []).forEach((jr) => {
                        const subj = map.get(jr.subject_id);
                        if (subj && jr.class_id && jr.classes) {
                            const key = `${jr.subject_id}_${jr.class_id}`;
                            if (!resultsMap.has(key)) {
                                resultsMap.set(key, {
                                    subject_id: subj.id,
                                    subject_title: subj.title || 'Untitled Subject',
                                    class_id: jr.class_id,
                                    class_name: buildClassLabel(jr.classes) || jr.classes?.name || jr.classes?.display_name || 'Class',
                                    grade_level: jr.classes?.grade_level,
                                    form_level: jr.classes?.form_level,
                                    stream: jr.classes?.stream,
                                });
                            }
                        }
                    });
                }
            } catch (_err) {
                // Ignore junction table query if table doesn't exist
            }

            return res.json({ success: true, data: Array.from(resultsMap.values()) });
        }
    } catch (err) {
        console.error("getSubjectClasses error:", err);
        res.status(500).json({ error: "Server error" });
    }
};

// GET students enrolled in a class (grade-entry student list)
exports.listClassStudents = async (req, res) => {
    try {
        const { class_id } = req.query;
        const { userId, userRole, institution_id } = req;

        if (!class_id) return res.status(400).json({ error: "class_id is required" });

        if (userRole === 'teacher') {
            const { data: teacher } = await supabase
                .from('teachers')
                .select('id')
                .eq('user_id', userId)
                .single();
            if (!teacher) return res.status(404).json({ error: "Teacher profile not found" });

            const authorized = await isTeacherAuthorizedForClass(teacher.id, class_id, institution_id);
            if (!authorized) {
                return res.status(403).json({ error: "Access denied: You are not authorized for this class" });
            }
        }

        const { data: enrollments, error: eErr } = await supabase
            .from("class_enrollments")
            .select("student_id, students(id, user_id, users(first_name, last_name, full_name), id_number, admission_number)")
            .eq("class_id", class_id)
            .eq("institution_id", institution_id);

        if (eErr) throw eErr;

        const students = (enrollments || [])
            .map((e) => {
                const s = e.students;
                if (!s) return null;
                const user = s.users;
                const fullName = user?.full_name || `${user?.first_name || ""} ${user?.last_name || ""}`.trim() || "Unknown";
                return {
                    id: s.id,
                    student_id: s.id,
                    full_name: fullName,
                    name: fullName,
                    student_name: fullName,
                    display_id: s.id_number || s.admission_number || s.id,
                    student_display_id: s.id_number || s.admission_number || s.id,
                };
            })
            .filter(Boolean);

        return res.json({ success: true, data: students });
    } catch (err) {
        console.error("listClassStudents error:", err);
        res.status(500).json({ error: "Server error" });
    }
};

// GET teacher profile (personal, professional, subjects, classes, role modes, pending requests)
exports.getMyProfile = async (req, res) => {
    try {
        const { userId, institution_id } = req;

        const { data: teacher, error: tErr } = await supabase
            .from("teachers")
            .select("*, users!inner(*)")
            .eq("user_id", userId)
            .single();

        if (tErr || !teacher) {
            return res.status(404).json({ error: "Teacher profile not found" });
        }

        const scope = await resolveTeacherScope(userId, institution_id);

        // 1. Assigned subjects (primary + assistant)
        const { data: primarySubjects } = await supabase
            .from("subjects")
            .select("id, title, class_id, classes(id, display_name, grade_level, form_level, stream, class_type)")
            .eq("teacher_id", teacher.id)
            .eq("institution_id", institution_id);

        const { data: assocSubjects } = await supabase
            .from("subject_teachers")
            .select("subject_id, subject:subjects(id, title, class_id, classes(id, display_name, grade_level, form_level, stream, class_type))")
            .eq("teacher_id", teacher.id);

        const subjectsMap = new Map();
        (primarySubjects || []).forEach((s) => {
            subjectsMap.set(s.id, {
                id: s.id,
                title: s.title,
                class_id: s.class_id,
                class_name: buildClassLabel(s.classes) || s.classes?.name || s.classes?.display_name || "Class",
                stream: s.classes?.stream || "",
            });
        });

        (assocSubjects || []).map((a) => a.subject).filter(Boolean).forEach((s) => {
            if (!subjectsMap.has(s.id)) {
                subjectsMap.set(s.id, {
                    id: s.id,
                    title: s.title,
                    class_id: s.class_id,
                    class_name: buildClassLabel(s.classes) || s.classes?.name || s.classes?.display_name || "Class",
                    stream: s.classes?.stream || "",
                });
            }
        });

        // 2. Designated classes where this teacher is Class Teacher
        const { data: designatedClasses } = await supabase
            .from("classes")
            .select("id, name, display_name, grade_level, form_level, stream, class_type")
            .eq("teacher_id", teacher.id)
            .eq("institution_id", institution_id);

        const formattedClasses = (designatedClasses || []).map((c) => ({
            id: c.id,
            name: buildClassLabel(c) || c.name || c.display_name || "Class",
            stream: c.stream || "",
            grade_level: c.grade_level,
        }));

        // 3. Pending name change request
        let pendingRequest = null;
        try {
            const { data: reqData } = await supabase
                .from("profile_change_requests")
                .select("*")
                .eq("user_id", userId)
                .eq("status", "pending")
                .order("created_at", { ascending: false })
                .limit(1)
                .maybeSingle();
            pendingRequest = reqData || null;
        } catch {
            pendingRequest = null;
        }

        const user = teacher.users || {};
        const fullName = user.full_name || `${user.first_name || ""} ${user.last_name || ""}`.trim() || "Teacher";

        return res.json({
            success: true,
            data: {
                personal: {
                    id: teacher.id,
                    user_id: user.id,
                    full_name: fullName,
                    first_name: user.first_name,
                    last_name: user.last_name,
                    email: user.email,
                    phone: user.phone || null,
                    avatar_url: user.avatar_url || null,
                    employee_id: teacher.id,
                    address: user.address || null,
                    gender: user.gender || null,
                    date_of_birth: user.date_of_birth || null,
                },
                professional: {
                    position: teacher.position || "Teacher",
                    department: teacher.department || "Academic",
                    qualification: teacher.qualification || "Bachelor of Education",
                    date_joined: teacher.created_at || user.created_at || null,
                },
                assigned_subjects: Array.from(subjectsMap.values()),
                designated_classes: formattedClasses,
                role_modes: scope?.availableModes || ["subject"],
                active_role_mode: scope?.activeMode || "subject",
                pending_name_change: pendingRequest,
            },
        });
    } catch (err) {
        console.error("getMyProfile error:", err);
        res.status(500).json({ error: "Server error retrieving profile" });
    }
};

// POST request name change (routes to admin for approval)
exports.requestNameChange = async (req, res) => {
    try {
        const { userId, institution_id } = req;
        const { requested_name, reason, document_url } = req.body;

        if (!requested_name || !requested_name.trim()) {
            return res.status(400).json({ error: "Requested name is required" });
        }
        if (!reason || !reason.trim()) {
            return res.status(400).json({ error: "Reason for name change is required" });
        }

        const { data: user } = await supabase
            .from("users")
            .select("first_name, last_name, full_name")
            .eq("id", userId)
            .single();

        const currentName = user?.full_name || `${user?.first_name || ""} ${user?.last_name || ""}`.trim() || "Current Name";

        // Check if pending request already exists
        try {
            const { data: existing } = await supabase
                .from("profile_change_requests")
                .select("id")
                .eq("user_id", userId)
                .eq("status", "pending")
                .maybeSingle();

            if (existing) {
                return res.status(400).json({ error: "You already have a pending name change request undergoing administrative review." });
            }

            const { data: newReq, error: insertErr } = await supabase
                .from("profile_change_requests")
                .insert({
                    user_id: userId,
                    institution_id,
                    current_name: currentName,
                    requested_name: requested_name.trim(),
                    reason: reason.trim(),
                    document_url: document_url || null,
                    status: "pending",
                })
                .select()
                .single();

            if (insertErr) throw insertErr;

            await logRecordChange({
                institution_id,
                table_name: "profile_change_requests",
                record_id: newReq.id,
                action: "NAME_CHANGE_REQUESTED",
                old_data: { current_name: currentName },
                new_data: { requested_name: requested_name.trim(), reason: reason.trim() },
                changed_by: userId,
                reason: reason.trim(),
            });

            return res.json({
                success: true,
                message: "Name change request submitted for administrative approval.",
                data: newReq,
            });
        } catch (dbErr) {
            console.warn("profile_change_requests insert failed, fallback to audit log:", dbErr.message);
            await logRecordChange({
                institution_id,
                table_name: "users",
                record_id: userId,
                action: "NAME_CHANGE_REQUESTED",
                old_data: { current_name: currentName },
                new_data: { requested_name: requested_name.trim(), reason: reason.trim() },
                changed_by: userId,
                reason: reason.trim(),
            });

            return res.json({
                success: true,
                message: "Name change request recorded for administrative review.",
                data: {
                    user_id: userId,
                    current_name: currentName,
                    requested_name: requested_name.trim(),
                    reason: reason.trim(),
                    status: "pending",
                    created_at: new Date().toISOString(),
                },
            });
        }
    } catch (err) {
        console.error("requestNameChange error:", err);
        res.status(500).json({ error: "Failed to submit name change request" });
    }
};

/**
 * PART I: Student Rankings & Performance Distribution
 * Strictly role-scoped: Subject Teacher sees subject rank, Class Teacher sees class rank
 */
exports.getStudentRankings = async (req, res) => {
    try {
        const { userId, userRole } = req;
        const institution_id = req.institution_id || null;
        if (userRole !== 'teacher' && userRole !== 'admin') {
            return res.status(403).json({ error: "Unauthorized" });
        }

        const { subject_id, class_id, grade_level } = req.query;
        const reqRoleMode = req.headers['x-teacher-role-mode'] || req.query.role_mode;
        const scope = userRole === 'teacher' ? await resolveTeacherScope(userId, institution_id, reqRoleMode) : null;

        // Resolve teacher's accessible subjects and classes
        let allowedSubjectIds = [];
        let allowedClassIds = [];

        if (userRole === 'admin') {
            // Admin sees all
        } else if (scope?.activeMode === 'class') {
            allowedClassIds = scope.classTeacherClassIds || [];
        } else {
            allowedSubjectIds = scope?.subjectIds || [];
        }

        // 1. Get teacher record if teacher
        let teacherId = null;
        if (userRole === 'teacher') {
            const { data: teacher } = await supabase.from('teachers').select('id').eq('user_id', userId).single();
            teacherId = teacher?.id || null;
        }

        // Query subjects
        let subjectsQuery = supabase
            .from('subjects')
            .select('id, title, class_id, classes(id, display_name, grade_level, form_level, stream, class_type)');
        if (institution_id) subjectsQuery = subjectsQuery.eq('institution_id', institution_id);
        if (subject_id) subjectsQuery = subjectsQuery.eq('id', subject_id);
        if (class_id) subjectsQuery = subjectsQuery.eq('class_id', class_id);

        if (userRole === 'teacher') {
            if (scope?.activeMode === 'class' && allowedClassIds.length > 0) {
                subjectsQuery = subjectsQuery.in('class_id', allowedClassIds);
            } else if (allowedSubjectIds.length > 0) {
                subjectsQuery = subjectsQuery.in('id', allowedSubjectIds);
            } else if (teacherId) {
                subjectsQuery = subjectsQuery.eq('teacher_id', teacherId);
            }
        }

        const { data: subjects, error: subjErr } = await subjectsQuery;
        if (subjErr) throw subjErr;

        if (!subjects || subjects.length === 0) {
            return res.json({ rankings: [], cbc_distribution: { EE: 0, ME: 0, AE: 0, BE: 0 }, total_students: 0 });
        }

        const targetSubjectIds = subjects.map(s => s.id);
        const targetClassIds = [...new Set(subjects.map(s => s.class_id).filter(Boolean))];
        if (class_id && !targetClassIds.includes(class_id)) {
            targetClassIds.push(class_id);
        }

        // 2. Query student enrollments
        let enrollmentsQuery = supabase
            .from('enrollments')
            .select(`
                student_id, subject_id,
                students ( id, user_id, grade_level, id_number, admission_number, class_id, users ( first_name, last_name, full_name, email, avatar_url ) )
            `)
            .in('subject_id', targetSubjectIds)
            .eq('status', 'enrolled');

        const { data: enrollments } = await enrollmentsQuery;

        // Class enrollments
        let classEnrollments = [];
        if (targetClassIds.length > 0) {
            const { data: ceData } = await supabase
                .from('class_enrollments')
                .select(`
                    student_id, class_id,
                    students ( id, user_id, grade_level, id_number, admission_number, class_id, users ( first_name, last_name, full_name, email, avatar_url ) )
                `)
                .in('class_id', targetClassIds);
            classEnrollments = ceData || [];
        }

        // Map students
        const studentsMap = new Map();
        (enrollments || []).forEach(e => {
            if (e.student_id && e.students) {
                studentsMap.set(e.student_id, e.students);
            }
        });
        classEnrollments.forEach(ce => {
            if (ce.student_id && ce.students && !studentsMap.has(ce.student_id)) {
                studentsMap.set(ce.student_id, ce.students);
            }
        });

        let studentIds = Array.from(studentsMap.keys());
        if (grade_level) {
            studentIds = studentIds.filter(sId => {
                const st = studentsMap.get(sId);
                return String(st?.grade_level || '').toLowerCase() === String(grade_level).toLowerCase();
            });
        }

        if (studentIds.length === 0) {
            return res.json({ rankings: [], cbc_distribution: { EE: 0, ME: 0, AE: 0, BE: 0 }, total_students: 0 });
        }

        // 3. Fetch submissions/grades
        const { data: submissions } = await supabase
            .from('submissions')
            .select(`
                id, student_id, assignment_id, grade, status,
                assignments!inner ( title, subject_id, total_points )
            `)
            .in('student_id', studentIds)
            .in('assignments.subject_id', targetSubjectIds);

        // 4. Fetch institution's configured grading scale
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

        // Initialize dynamic distribution map
        const gradeDistribution = {};
        if (activeScales.length > 0) {
            activeScales.forEach(s => {
                const key = s.letter_grade || s.name;
                gradeDistribution[key] = 0;
            });
        } else {
            // Standard letter grade bands if no institution scale is configured
            ['A', 'B', 'C', 'D', 'E'].forEach(k => { gradeDistribution[k] = 0; });
        }

        const studentRankings = studentIds.map(sId => {
            const stObj = studentsMap.get(sId);
            const userObj = stObj?.users || {};
            const fullName = userObj.full_name || `${userObj.first_name || ""} ${userObj.last_name || ""}`.trim() || "Student";

            const stSubs = (submissions || []).filter(s => s.student_id === sId && s.grade !== null && s.grade !== undefined);
            const validGrades = stSubs.map(s => Number(s.grade)).filter(g => !isNaN(g));

            const avgScore = validGrades.length > 0
                ? Math.round(validGrades.reduce((a, b) => a + b, 0) / validGrades.length)
                : 0;

            let assignedGrade = "E";
            let assignedLabel = "Grade E";

            if (activeScales.length > 0) {
                const match = activeScales.find(s => avgScore >= s.min_score && avgScore <= s.max_score);
                if (match) {
                    assignedGrade = match.letter_grade || match.name;
                    assignedLabel = match.description || match.name || assignedGrade;
                } else if (avgScore < activeScales[activeScales.length - 1].min_score) {
                    const lowest = activeScales[activeScales.length - 1];
                    assignedGrade = lowest.letter_grade || lowest.name;
                    assignedLabel = lowest.description || lowest.name || assignedGrade;
                } else {
                    const highest = activeScales[0];
                    assignedGrade = highest.letter_grade || highest.name;
                    assignedLabel = highest.description || highest.name || assignedGrade;
                }
            } else {
                if (avgScore >= 80) {
                    assignedGrade = "A";
                    assignedLabel = "Grade A (80-100%)";
                } else if (avgScore >= 70) {
                    assignedGrade = "B";
                    assignedLabel = "Grade B (70-79%)";
                } else if (avgScore >= 60) {
                    assignedGrade = "C";
                    assignedLabel = "Grade C (60-69%)";
                } else if (avgScore >= 50) {
                    assignedGrade = "D";
                    assignedLabel = "Grade D (50-59%)";
                } else {
                    assignedGrade = "E";
                    assignedLabel = "Grade E (Below 50%)";
                }
            }

            gradeDistribution[assignedGrade] = (gradeDistribution[assignedGrade] || 0) + 1;

            return {
                student_id: sId,
                full_name: fullName,
                admission_number: stObj?.admission_number || stObj?.id_number || "",
                email: userObj.email || "",
                avatar_url: userObj.avatar_url || null,
                grade_level: stObj?.grade_level || null,
                class_id: stObj?.class_id || null,
                graded_tasks: validGrades.length,
                average_score: avgScore,
                cbc_band: assignedGrade,
                cbc_label: assignedLabel,
                grade: assignedGrade,
                grade_label: assignedLabel,
            };
        });

        // Sort descending by score
        studentRankings.sort((a, b) => b.average_score - a.average_score);

        // Assign ordinal rank (handling ties)
        let currentRank = 1;
        for (let i = 0; i < studentRankings.length; i++) {
            if (i > 0 && studentRankings[i].average_score < studentRankings[i - 1].average_score) {
                currentRank = i + 1;
            }
            studentRankings[i].rank = currentRank;
        }

        res.json({
            scope_mode: scope?.activeMode || (userRole === 'admin' ? 'admin' : 'subject'),
            total_students: studentRankings.length,
            cbc_distribution: gradeDistribution,
            grade_distribution: gradeDistribution,
            grading_scale: activeScales,
            rankings: studentRankings,
        });
    } catch (err) {
        console.error("getStudentRankings error:", err);
        res.status(500).json({ error: "Failed to compute student rankings" });
    }
};

/**
 * =========================================================================
 * PHASE 6 / PART J: Content Coverage Planner (J1) & Record of Work (J2)
 * =========================================================================
 */

// Helper to check if teacher is HOD or assigned to subject
const checkTeacherSubjectAuth = async (teacherId, subjectId, institutionId) => {
    if (!teacherId || !subjectId) return { isAuthorized: false, isHOD: false };

    const { data: subj } = await supabase
        .from('subjects')
        .select('id, teacher_id, hod_teacher_id')
        .eq('id', subjectId)
        .eq('institution_id', institutionId)
        .maybeSingle();

    const isDirectTeacher = subj?.teacher_id === teacherId;
    const isDirectHOD = subj?.hod_teacher_id === teacherId;

    const { data: st } = await supabase
        .from('subject_teachers')
        .select('id, is_hod')
        .eq('subject_id', subjectId)
        .eq('teacher_id', teacherId)
        .maybeSingle();

    const isAssocTeacher = Boolean(st);
    const isAssocHOD = Boolean(st?.is_hod);

    const isHOD = isDirectHOD || isAssocHOD;
    const isAuthorized = isDirectTeacher || isAssocTeacher || isHOD;

    return { isAuthorized, isHOD, subject: subj };
};

// GET /teacher/hod-subjects - List subjects where the teacher is designated as HOD
exports.getHODSubjects = async (req, res) => {
    try {
        const { userId, institution_id, userRole } = req;
        const { data: teacher } = await supabase
            .from("teachers")
            .select("id")
            .eq("user_id", userId)
            .single();

        if (!teacher && userRole !== 'admin') {
            return res.status(404).json({ error: "Teacher profile not found" });
        }

        const teacherId = teacher?.id;

        // If admin, return all subjects
        if (userRole === 'admin') {
            const { data: allSubjects, error: aErr } = await supabase
                .from('subjects')
                .select('id, title, category, level, hod_teacher_id')
                .eq('institution_id', institution_id);
            if (aErr) throw aErr;
            return res.json((allSubjects || []).map(s => ({ ...s, is_hod: true })));
        }

        // Subjects where teacher is direct HOD
        const { data: directHOD } = await supabase
            .from('subjects')
            .select('id, title, category, level, hod_teacher_id')
            .eq('institution_id', institution_id)
            .eq('hod_teacher_id', teacherId);

        // Subjects where subject_teachers has is_hod = true
        const { data: assocHOD } = await supabase
            .from('subject_teachers')
            .select('subject_id, is_hod, subjects(id, title, category, level, hod_teacher_id)')
            .eq('teacher_id', teacherId)
            .eq('is_hod', true);

        const hodSubjectsMap = new Map();
        (directHOD || []).forEach(s => hodSubjectsMap.set(s.id, { ...s, is_hod: true }));
        (assocHOD || []).forEach(item => {
            if (item.subjects) {
                hodSubjectsMap.set(item.subjects.id, { ...item.subjects, is_hod: true });
            }
        });

        res.json(Array.from(hodSubjectsMap.values()));
    } catch (err) {
        console.error("getHODSubjects error:", err);
        res.status(500).json({ error: "Failed to fetch HOD subjects" });
    }
};

// GET /teacher/coverage-plans - Termly/Yearly Coverage Plans (J1)
exports.getCoveragePlans = async (req, res) => {
    try {
        const { institution_id, userRole, userId } = req;
        const { subject_id, term, academic_year } = req.query;

        if (!subject_id) {
            return res.status(400).json({ error: "subject_id is required" });
        }

        let query = supabase
            .from('subject_coverage_plans')
            .select('*')
            .eq('institution_id', institution_id)
            .eq('subject_id', subject_id);

        if (term) query = query.eq('term', term);
        if (academic_year) query = query.eq('academic_year', academic_year);

        query = query.order('week_start', { ascending: true }).order('order_index', { ascending: true });

        const { data: plans, error: pErr } = await query;
        if (pErr) {
            if (pErr.code === '42P01' || pErr.code === 'PGRST205') {
                return res.json([]);
            }
            throw pErr;
        }

        // Check if viewing teacher is HOD for this subject
        let isHOD = false;
        if (userRole === 'admin') {
            isHOD = true;
        } else {
            const { data: teacher } = await supabase
                .from("teachers")
                .select("id")
                .eq("user_id", userId)
                .single();
            if (teacher) {
                const auth = await checkTeacherSubjectAuth(teacher.id, subject_id, institution_id);
                isHOD = auth.isHOD;
            }
        }

        res.json({
            subject_id,
            term: term || null,
            academic_year: academic_year || null,
            is_hod: isHOD,
            plans: plans || []
        });
    } catch (err) {
        console.error("getCoveragePlans error:", err);
        res.status(500).json({ error: "Failed to load coverage plans" });
    }
};

// POST /teacher/coverage-plans - Create a Coverage Plan Item (J1)
exports.createCoveragePlan = async (req, res) => {
    try {
        const { institution_id, userRole, userId } = req;
        const {
            subject_id,
            term,
            academic_year,
            title,
            description,
            strand,
            sub_strand,
            week_start,
            week_end,
            duration_weeks,
            target_completion_date,
            status,
            order_index
        } = req.body;

        if (!subject_id || !title || !term || !academic_year) {
            return res.status(400).json({ error: "subject_id, title, term, and academic_year are required" });
        }

        // Check authorization: Admin, or HOD for this specific subject
        let creatorId = userId;
        if (userRole !== 'admin') {
            const { data: teacher } = await supabase
                .from("teachers")
                .select("id")
                .eq("user_id", userId)
                .single();
            if (!teacher) return res.status(403).json({ error: "Unauthorized teacher" });

            const auth = await checkTeacherSubjectAuth(teacher.id, subject_id, institution_id);
            if (!auth.isHOD) {
                return res.status(403).json({ error: "Access denied: Only Admin and the Head of Department (HOD) for this subject can create coverage plans" });
            }
            creatorId = teacher.id;
        }

        const { data: created, error: cErr } = await supabase
            .from('subject_coverage_plans')
            .insert([{
                institution_id,
                subject_id,
                term,
                academic_year,
                title: title.trim(),
                description: description?.trim() || null,
                strand: strand?.trim() || null,
                sub_strand: sub_strand?.trim() || null,
                week_start: week_start ? parseInt(week_start) : null,
                week_end: week_end ? parseInt(week_end) : null,
                duration_weeks: duration_weeks ? parseInt(duration_weeks) : (week_start && week_end ? (parseInt(week_end) - parseInt(week_start) + 1) : 1),
                target_completion_date: target_completion_date || null,
                status: status || 'active',
                order_index: order_index || 0,
                created_by: creatorId,
            }])
            .select()
            .single();

        if (cErr) throw cErr;
        res.status(201).json(created);
    } catch (err) {
        console.error("createCoveragePlan error:", err);
        res.status(500).json({ error: "Failed to create coverage plan item" });
    }
};

// PUT /teacher/coverage-plans/:id - Update Coverage Plan Item (J1)
exports.updateCoveragePlan = async (req, res) => {
    try {
        const { id } = req.params;
        const { institution_id, userRole, userId } = req;
        const updates = req.body;

        const { data: existing, error: eErr } = await supabase
            .from('subject_coverage_plans')
            .select('*')
            .eq('id', id)
            .eq('institution_id', institution_id)
            .single();

        if (eErr || !existing) {
            return res.status(404).json({ error: "Coverage plan item not found" });
        }

        let isHOD = userRole === 'admin';
        if (userRole !== 'admin') {
            const { data: teacher } = await supabase
                .from("teachers")
                .select("id")
                .eq("user_id", userId)
                .single();
            if (!teacher) return res.status(403).json({ error: "Unauthorized teacher" });

            const auth = await checkTeacherSubjectAuth(teacher.id, existing.subject_id, institution_id);
            if (!auth.isAuthorized) {
                return res.status(403).json({ error: "Access denied: Unauthorized for this subject" });
            }
            isHOD = auth.isHOD;

            // If not HOD, regular subject teachers can only update 'status' (e.g. check off covered lesson)
            const attemptedStructuralUpdate = Object.keys(updates).some(k =>
                ['title', 'description', 'strand', 'sub_strand', 'week_start', 'week_end', 'duration_weeks', 'target_completion_date'].includes(k)
            );
            if (!isHOD && attemptedStructuralUpdate) {
                return res.status(403).json({ error: "Access denied: Only Admin and the HOD for this subject can modify plan structure. Teachers may only check off lesson status." });
            }
        }

        const allowedFields = [
            'title', 'description', 'strand', 'sub_strand', 'week_start',
            'week_end', 'duration_weeks', 'target_completion_date', 'status', 'order_index'
        ];
        const sanitizedUpdates = {};
        for (const f of allowedFields) {
            if (updates[f] !== undefined) sanitizedUpdates[f] = updates[f];
        }
        sanitizedUpdates.updated_at = new Date().toISOString();

        const { data: updated, error: uErr } = await supabase
            .from('subject_coverage_plans')
            .update(sanitizedUpdates)
            .eq('id', id)
            .eq('institution_id', institution_id)
            .select()
            .single();

        if (uErr) throw uErr;
        res.json(updated);
    } catch (err) {
        console.error("updateCoveragePlan error:", err);
        res.status(500).json({ error: "Failed to update coverage plan item" });
    }
};

// DELETE /teacher/coverage-plans/:id - Delete Coverage Plan Item (J1)
exports.deleteCoveragePlan = async (req, res) => {
    try {
        const { id } = req.params;
        const { institution_id, userRole, userId } = req;

        const { data: existing, error: eErr } = await supabase
            .from('subject_coverage_plans')
            .select('*')
            .eq('id', id)
            .eq('institution_id', institution_id)
            .single();

        if (eErr || !existing) {
            return res.status(404).json({ error: "Coverage plan item not found" });
        }

        if (userRole !== 'admin') {
            const { data: teacher } = await supabase
                .from("teachers")
                .select("id")
                .eq("user_id", userId)
                .single();
            if (!teacher) return res.status(403).json({ error: "Unauthorized teacher" });

            const auth = await checkTeacherSubjectAuth(teacher.id, existing.subject_id, institution_id);
            if (!auth.isHOD) {
                return res.status(403).json({ error: "Access denied: Only Head of Department (HOD) or Admin can delete plan items" });
            }
        }

        const { error: dErr } = await supabase
            .from('subject_coverage_plans')
            .delete()
            .eq('id', id)
            .eq('institution_id', institution_id);

        if (dErr) throw dErr;
        res.json({ message: "Coverage plan item deleted successfully" });
    } catch (err) {
        console.error("deleteCoveragePlan error:", err);
        res.status(500).json({ error: "Failed to delete coverage plan item" });
    }
};

// GET /teacher/coverage-plans/oversight - Institutional Departmental Coverage Oversight (Admin / HOD)
exports.getCoverageOversight = async (req, res) => {
    try {
        const { institution_id, userRole } = req;
        const { term, academic_year } = req.query;

        // Fetch all subjects in the institution with their assigned HOD and class details
        const { data: subjects, error: subErr } = await supabase
            .from('subjects')
            .select(`
                id, title, class_id, hod_teacher_id,
                classes ( id, display_name, grade_level, form_level, stream, class_type ),
                teachers:hod_teacher_id ( id, user_id, users:user_id ( full_name, email, avatar_url ) )
            `)
            .eq('institution_id', institution_id);

        if (subErr) {
            if (subErr.code === '42P01' || subErr.code === 'PGRST205') {
                return res.json({
                    total_subjects: 0,
                    subjects_with_plans: 0,
                    total_topics_planned: 0,
                    total_completed: 0,
                    overall_coverage_rate: 0,
                    subjects: []
                });
            }
            throw subErr;
        }

        if (!subjects || subjects.length === 0) {
            return res.json({
                total_subjects: 0,
                subjects_with_plans: 0,
                total_topics_planned: 0,
                total_completed: 0,
                overall_coverage_rate: 0,
                subjects: []
            });
        }

        const subjectIds = subjects.map(s => s.id);

        // Fetch coverage plans for all subjects
        let plansQuery = supabase
            .from('subject_coverage_plans')
            .select('id, subject_id, term, academic_year, title, week_start, week_end, status')
            .eq('institution_id', institution_id)
            .in('subject_id', subjectIds);

        if (term) plansQuery = plansQuery.eq('term', term);
        if (academic_year) plansQuery = plansQuery.eq('academic_year', academic_year);

        const { data: plansData, error: plansErr } = await plansQuery;
        const plans = (!plansErr && plansData) ? plansData : [];

        // Fetch completed records of work
        let rowQuery = supabase
            .from('record_of_work')
            .select('id, subject_id, coverage_plan_id, is_completed, status, created_at')
            .eq('institution_id', institution_id)
            .in('subject_id', subjectIds);

        const { data: rowData, error: rowErr } = await rowQuery;
        const recordsOfWork = (!rowErr && rowData) ? rowData : [];

        // Map plans by subject
        const plansBySubject = new Map();
        plans.forEach(p => {
            if (!plansBySubject.has(p.subject_id)) plansBySubject.set(p.subject_id, []);
            plansBySubject.get(p.subject_id).push(p);
        });

        // Map records by subject
        const rowsBySubject = new Map();
        recordsOfWork.forEach(r => {
            if (!rowsBySubject.has(r.subject_id)) rowsBySubject.set(r.subject_id, []);
            rowsBySubject.get(r.subject_id).push(r);
        });

        let totalPlannedAcrossSchool = 0;
        let totalCompletedAcrossSchool = 0;
        let subjectsWithPlansCount = 0;

        const subjectSummaries = subjects.map(s => {
            const sPlans = plansBySubject.get(s.id) || [];
            const sRows = rowsBySubject.get(s.id) || [];

            const plannedTopicsCount = sPlans.length;
            if (plannedTopicsCount > 0) subjectsWithPlansCount++;
            totalPlannedAcrossSchool += plannedTopicsCount;

            // Completed topics (items marked completed in record_of_work)
            const completedRows = sRows.filter(r => r.is_completed === true || r.status === 'completed');
            const completedCount = completedRows.length;
            totalCompletedAcrossSchool += completedCount;

            const completionRate = plannedTopicsCount > 0
                ? Math.min(100, Math.round((completedCount / plannedTopicsCount) * 100))
                : 0;

            const hodUser = s.teachers?.users;
            const hodName = hodUser?.full_name || null;

            return {
                subject_id: s.id,
                subject_title: s.title,
                class_id: s.class_id,
                class_name: s.classes?.display_name || (s.classes?.grade_level ? `Grade ${s.classes.grade_level}` : null),
                grade_level: s.classes?.grade_level || s.classes?.form_level || null,
                stream: s.classes?.stream || null,
                hod: hodName ? {
                    teacher_id: s.hod_teacher_id,
                    name: hodName,
                    email: hodUser?.email,
                    avatar_url: hodUser?.avatar_url
                } : null,
                has_plan: plannedTopicsCount > 0,
                total_topics: plannedTopicsCount,
                completed_topics: completedCount,
                completion_rate: completionRate,
                latest_activity: sRows.length > 0 ? sRows[sRows.length - 1].created_at : null
            };
        });

        const overallRate = totalPlannedAcrossSchool > 0
            ? Math.min(100, Math.round((totalCompletedAcrossSchool / totalPlannedAcrossSchool) * 100))
            : 0;

        res.json({
            total_subjects: subjects.length,
            subjects_with_plans: subjectsWithPlansCount,
            total_topics_planned: totalPlannedAcrossSchool,
            total_completed: totalCompletedAcrossSchool,
            overall_coverage_rate: overallRate,
            subjects: subjectSummaries
        });
    } catch (err) {
        console.error("getCoverageOversight error:", err);
        res.status(500).json({ error: "Failed to compute coverage oversight" });
    }
};

// GET /teacher/record-of-work - Teacher's Personal Lesson Plan & Record of Work (J2)
exports.getRecordOfWork = async (req, res) => {
    try {
        const { institution_id, userRole, userId } = req;
        const { subject_id, class_id, week_number, teacher_id: requestedTeacherId } = req.query;

        let targetTeacherId = null;

        if (userRole === 'admin') {
            targetTeacherId = requestedTeacherId || null;
        } else {
            const { data: teacher } = await supabase
                .from("teachers")
                .select("id")
                .eq("user_id", userId)
                .single();
            if (!teacher) return res.status(404).json({ error: "Teacher profile not found" });

            // If teacher is HOD for this subject, they can view records of other teachers in this subject
            if (requestedTeacherId && requestedTeacherId !== teacher.id && subject_id) {
                const auth = await checkTeacherSubjectAuth(teacher.id, subject_id, institution_id);
                if (auth.isHOD) {
                    targetTeacherId = requestedTeacherId;
                } else {
                    targetTeacherId = teacher.id;
                }
            } else {
                targetTeacherId = teacher.id;
            }
        }

        let query = supabase
            .from('record_of_work')
            .select(`
                *,
                coverage_plan:subject_coverage_plans(id, title, strand, sub_strand, week_start, week_end),
                class:classes(id, display_name, grade_level, form_level, stream),
                teacher:teachers(id, users(full_name))
            `)
            .eq('institution_id', institution_id);

        if (targetTeacherId) query = query.eq('teacher_id', targetTeacherId);
        if (subject_id) query = query.eq('subject_id', subject_id);
        if (class_id) query = query.eq('class_id', class_id);
        if (week_number) query = query.eq('week_number', parseInt(week_number));

        query = query.order('week_number', { ascending: true }).order('lesson_number', { ascending: true });

        const { data: records, error: rErr } = await query;
        if (rErr) {
            if (rErr.code === '42P01' || rErr.code === 'PGRST205') {
                return res.json([]);
            }
            throw rErr;
        }

        res.json(records || []);
    } catch (err) {
        console.error("getRecordOfWork error:", err);
        res.status(500).json({ error: "Failed to load record of work" });
    }
};

// POST /teacher/record-of-work - Create Record of Work entry (J2)
exports.createRecordOfWork = async (req, res) => {
    try {
        const { institution_id, userRole, userId } = req;
        const {
            subject_id,
            class_id,
            coverage_plan_id,
            lesson_number,
            date,
            topic,
            sub_topic,
            learning_objectives,
            activities_references,
            status,
            remarks
        } = req.body;
        let { week_number } = req.body;

        const effectiveDate = date || new Date().toISOString().split('T')[0];

        // Part D4: Automatic week detection if not supplied
        if (!week_number && effectiveDate) {
            try {
                const { resolveActiveTerm } = require('../utils/resolveActiveTerm.js');
                const activeTerm = await resolveActiveTerm(institution_id);
                if (activeTerm?.start_date) {
                    const diffDays = Math.floor((new Date(effectiveDate) - new Date(activeTerm.start_date)) / (1000 * 60 * 60 * 24));
                    week_number = Math.max(1, Math.floor(diffDays / 7) + 1);
                } else {
                    week_number = 1;
                }
            } catch (e) {
                week_number = 1;
            }
        }

        if (!subject_id || !week_number || !topic) {
            return res.status(400).json({ error: "subject_id, week_number, and topic are required" });
        }

        const { data: teacher } = await supabase
            .from("teachers")
            .select("id")
            .eq("user_id", userId)
            .single();

        let effectiveTeacherId = teacher?.id;
        if (userRole === 'admin' && req.body.teacher_id) {
            effectiveTeacherId = req.body.teacher_id;
        } else if (!effectiveTeacherId) {
            return res.status(403).json({ error: "Unauthorized teacher" });
        }

        // Part D3: Automatic holiday/cancellation detection via calendar_events
        let finalRemarks = remarks?.trim() || null;
        try {
            let { data: eventData } = await supabase
                .from('calendar_events')
                .select('title, cancel_classes, start_date, end_date, event_date')
                .eq('institution_id', institution_id)
                .lte('start_date', effectiveDate)
                .gte('end_date', effectiveDate)
                .limit(1)
                .maybeSingle();

            if (!eventData) {
                const { data: legacyEvent } = await supabase
                    .from('calendar_events')
                    .select('title, cancel_classes')
                    .eq('institution_id', institution_id)
                    .eq('event_date', effectiveDate)
                    .maybeSingle();
                eventData = legacyEvent;
            }

            if (eventData && eventData.cancel_classes) {
                const notice = `[Notice: ${eventData.title} (Classes Cancelled)]`;
                finalRemarks = finalRemarks ? `${notice} ${finalRemarks}` : notice;
            }
        } catch (e) {
            // Non-blocking if table or event lookup fails
        }

        const { data: created, error: cErr } = await supabase
            .from('record_of_work')
            .insert([{
                institution_id,
                subject_id,
                class_id: class_id || null,
                teacher_id: effectiveTeacherId,
                coverage_plan_id: coverage_plan_id || null,
                week_number: parseInt(week_number),
                lesson_number: lesson_number ? parseInt(lesson_number) : 1,
                date: effectiveDate,
                duration_minutes: req.body.duration_minutes ? parseInt(req.body.duration_minutes) : 40,
                topic: topic.trim(),
                sub_topic: sub_topic?.trim() || null,
                learning_objectives: learning_objectives?.trim() || null,
                activities_references: activities_references?.trim() || null,
                status: status || 'planned',
                is_completed: status === 'completed',
                completed_at: status === 'completed' ? new Date().toISOString() : null,
                remarks: finalRemarks,
            }])
            .select(`
                *,
                coverage_plan:subject_coverage_plans(id, title, strand, sub_strand)
            `)
            .single();

        if (cErr) throw cErr;
        res.status(201).json(created);
    } catch (err) {
        console.error("createRecordOfWork error:", err);
        res.status(500).json({ error: "Failed to create record of work entry" });
    }
};

// PUT /teacher/record-of-work/:id - Update Record of Work entry (J2)
exports.updateRecordOfWork = async (req, res) => {
    try {
        const { id } = req.params;
        const { institution_id, userRole, userId } = req;
        const updates = req.body;

        const { data: existing, error: eErr } = await supabase
            .from('record_of_work')
            .select('*')
            .eq('id', id)
            .eq('institution_id', institution_id)
            .single();

        if (eErr || !existing) {
            return res.status(404).json({ error: "Record of work entry not found" });
        }

        // Authorization check: entry owner, HOD, or Admin
        if (userRole !== 'admin') {
            const { data: teacher } = await supabase
                .from("teachers")
                .select("id")
                .eq("user_id", userId)
                .single();
            if (!teacher) return res.status(403).json({ error: "Unauthorized" });

            if (existing.teacher_id !== teacher.id) {
                const auth = await checkTeacherSubjectAuth(teacher.id, existing.subject_id, institution_id);
                if (!auth.isHOD) {
                    return res.status(403).json({ error: "Access denied: You can only edit your own record of work" });
                }
            }
        }

        const allowedFields = [
            'class_id', 'coverage_plan_id', 'week_number', 'lesson_number',
            'date', 'duration_minutes', 'topic', 'sub_topic', 'learning_objectives',
            'activities_references', 'status', 'is_completed', 'remarks', 'admin_notes'
        ];

        const sanitizedUpdates = {};
        for (const f of allowedFields) {
            if (updates[f] !== undefined) sanitizedUpdates[f] = updates[f];
        }

        // Auto-manage is_completed & completed_at
        if (updates.is_completed !== undefined) {
            sanitizedUpdates.is_completed = Boolean(updates.is_completed);
            sanitizedUpdates.completed_at = sanitizedUpdates.is_completed ? (existing.completed_at || new Date().toISOString()) : null;
            if (sanitizedUpdates.is_completed && !sanitizedUpdates.status) {
                sanitizedUpdates.status = 'completed';
            }
        } else if (updates.status === 'completed' && !existing.is_completed) {
            sanitizedUpdates.is_completed = true;
            sanitizedUpdates.completed_at = new Date().toISOString();
        }

        sanitizedUpdates.updated_at = new Date().toISOString();

        const { data: updated, error: uErr } = await supabase
            .from('record_of_work')
            .update(sanitizedUpdates)
            .eq('id', id)
            .eq('institution_id', institution_id)
            .select(`
                *,
                coverage_plan:subject_coverage_plans(id, title, strand, sub_strand)
            `)
            .single();

        if (uErr) throw uErr;
        res.json(updated);
    } catch (err) {
        console.error("updateRecordOfWork error:", err);
        res.status(500).json({ error: "Failed to update record of work entry" });
    }
};

// DELETE /teacher/record-of-work/:id - Delete Record of Work entry (J2)
exports.deleteRecordOfWork = async (req, res) => {
    try {
        const { id } = req.params;
        const { institution_id, userRole, userId } = req;

        const { data: existing, error: eErr } = await supabase
            .from('record_of_work')
            .select('*')
            .eq('id', id)
            .eq('institution_id', institution_id)
            .single();

        if (eErr || !existing) {
            return res.status(404).json({ error: "Record of work entry not found" });
        }

        if (userRole !== 'admin') {
            const { data: teacher } = await supabase
                .from("teachers")
                .select("id")
                .eq("user_id", userId)
                .single();
            if (!teacher || existing.teacher_id !== teacher.id) {
                return res.status(403).json({ error: "Access denied: You can only delete your own records" });
            }
        }

        const { error: dErr } = await supabase
            .from('record_of_work')
            .delete()
            .eq('id', id)
            .eq('institution_id', institution_id);

        if (dErr) throw dErr;
        res.json({ message: "Record of work entry deleted successfully" });
    } catch (err) {
        console.error("deleteRecordOfWork error:", err);
        res.status(500).json({ error: "Failed to delete record of work entry" });
    }
};

// GET /teacher/record-of-work/detect-date - Auto-detect week and check for holiday/cancelled classes (D3, D4)
exports.detectLessonDateInfo = async (req, res) => {
    try {
        const { date } = req.query;
        const institution_id = req.institution_id;
        if (!date) return res.status(400).json({ error: "date query parameter is required" });

        let week_number = 1;
        let term_name = null;
        let term_id = null;

        try {
            const { resolveActiveTerm } = require('../utils/resolveActiveTerm.js');
            const activeTerm = await resolveActiveTerm(institution_id);
            if (activeTerm) {
                term_name = activeTerm.name || null;
                term_id = activeTerm.id || null;
                if (activeTerm.start_date) {
                    const diffDays = Math.floor((new Date(date) - new Date(activeTerm.start_date)) / (1000 * 60 * 60 * 24));
                    week_number = Math.max(1, Math.floor(diffDays / 7) + 1);
                }
            }
        } catch (e) {
            // Term resolution fallback
        }

        let is_cancelled = false;
        let cancellation_event = null;

        try {
            let { data: eventData } = await supabase
                .from('calendar_events')
                .select('title, description, cancel_classes, event_type, start_date, end_date, event_date')
                .eq('institution_id', institution_id)
                .lte('start_date', date)
                .gte('end_date', date)
                .limit(1)
                .maybeSingle();

            if (!eventData) {
                const { data: legacyEvent } = await supabase
                    .from('calendar_events')
                    .select('title, description, cancel_classes, event_type')
                    .eq('institution_id', institution_id)
                    .eq('event_date', date)
                    .maybeSingle();
                eventData = legacyEvent;
            }

            if (eventData && eventData.cancel_classes) {
                is_cancelled = true;
                cancellation_event = eventData.title;
            }
        } catch (e) {
            // Calendar event lookup fallback
        }

        res.json({
            date,
            week_number,
            term: term_name,
            term_id,
            is_cancelled,
            cancellation_event
        });
    } catch (err) {
        console.error("detectLessonDateInfo error:", err);
        res.status(500).json({ error: "Failed to detect lesson date info" });
    }
};



