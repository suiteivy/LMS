const supabase = require("../utils/supabaseClient.js");

exports.getDashboardStats = async (req, res) => {
    const startTime = Date.now();
    try {
        const { userId, userRole } = req;
        const institution_id = req.institution_id || null;

        if (userRole !== 'teacher') {
            return res.status(403).json({ error: "Unauthorized" });
        }

        // 1. Get Teacher ID and full details
        const { data: teacher, error: tError } = await supabase
            .from('teachers')
            .select('*, users!inner(*)')
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
            .select('*, classes(id, display_name)')
            .eq('teacher_id', teacher.id);
        if (institution_id) primaryQuery = primaryQuery.eq('institution_id', institution_id);
        const { data: primarySubjects, error: psError } = await primaryQuery;
        if (psError) throw psError;

        // Fetch assistant subjects
        let assocQuery = supabase
            .from('subject_teachers')
            .select('subject_id, subject:subjects!inner(*, classes(id, display_name))')
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
            .select('id, display_name, grade_level, form_level, stream')
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

        // Fetch timetable slots
        let timetable = [];
        if (subjectIds.length > 0) {
            let ttQuery = supabase
                .from('timetables')
                .select(`
                    id, day_of_week, start_time, end_time, room_number, class_id, subject_id,
                    classes(display_name),
                    subjects(title)
                `)
                .in('subject_id', subjectIds);
            if (institution_id) ttQuery = ttQuery.eq('institution_id', institution_id);
            const { data: ttData, error: ttError } = await ttQuery;
            if (ttError) throw ttError;
            timetable = ttData || [];
        }

        // Calculate students count (union of taught subjects and Class Teacher students)
        const uniqueStudentIds = new Set();
        if (subjectIds.length > 0) {
            const { data: enrollments } = await supabase
                .from('enrollments')
                .select('student_id')
                .in('subject_id', subjectIds)
                .eq('status', 'enrolled');
            (enrollments || []).forEach(e => uniqueStudentIds.add(e.student_id));
        }
        if (classTeacherOf && classTeacherOf.length > 0) {
            const { data: ctEnrollments } = await supabase
                .from('class_enrollments')
                .select('student_id')
                .in('class_id', classTeacherOf.map(c => c.id));
            (ctEnrollments || []).forEach(e => uniqueStudentIds.add(e.student_id));
        }
        const studentsCount = uniqueStudentIds.size;

        // Get today's schedule
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const today = days[new Date().getDay()];
        const schedule = timetable.filter(t => t.day_of_week === today).map(item => ({
            ...item,
            classes: {
                ...item.classes,
                name: item.classes?.display_name
            }
        }));

        res.json({
            stats: {
                studentsCount,
                subjectsCount: allSubjects.length,
                unreadNotifications: unreadNotifications || 0
            },
            profile: {
                id: teacher.id,
                department: teacher.department,
                qualification: teacher.qualification,
                position: teacher.position,
                specialization: teacher.specialization,
                hire_date: teacher.hire_date,
                full_name: teacher.users?.full_name,
                email: teacher.users?.email,
                avatar_url: teacher.users?.avatar_url
            },
            roles: rolesArray,
            classTeacherOf: classTeacherOf || [],
            assignedSubjects: allSubjects.map(s => {
                const subjectTimetables = timetable.filter(tt => tt.subject_id === s.id);
                return {
                    id: s.id,
                    title: s.title,
                    description: s.description,
                    class: s.classes ? {
                        id: s.classes.id,
                        display_name: s.classes.display_name
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
        console.error("[TeacherDashboard] Error after", Date.now() - startTime, "ms:", err);
        res.status(500).json({ error: err.message });
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

        // 1. Get Subjects
        const { data: subjects } = await supabase
            .from('subjects')
            .select('id, title, class_id')
            .eq('teacher_id', teacherId);

        if (!subjects) return res.json([]);

        // 2. Fetch Analytics for each subject
        const analytics = await Promise.all(subjects.map(async (subject) => {
            // A. Student Count
            const { count: studentCount } = await supabase
                .from('enrollments')
                .select('*', { count: 'exact', head: true })
                .eq('subject_id', subject.id)
                .eq('status', 'enrolled');

            // B. Assignments
            const { data: assignments } = await supabase
                .from('assignments')
                .select('id')
                .eq('subject_id', subject.id);

            const assignmentIds = (assignments || []).map(a => a.id);

            // C. Stats
            let avgGrade = 0;
            let completionRate = 0;

            if (assignmentIds.length > 0) {
                const { data: submissions } = await supabase
                    .from('submissions')
                    .select('grade, status')
                    .in('assignment_id', assignmentIds);

                if (submissions && submissions.length > 0) {
                    const gradedSubs = submissions.filter(s => s.grade !== null);
                    if (gradedSubs.length > 0) {
                        const totalScore = gradedSubs.reduce((sum, s) => sum + (s.grade || 0), 0);
                        avgGrade = Math.round(totalScore / gradedSubs.length);
                    }

                    const expectedSubmissions = assignmentIds.length * (studentCount || 0);
                    if (expectedSubmissions > 0) {
                        completionRate = Math.round((submissions.length / expectedSubmissions) * 100);
                    }
                }
            }

            return {
                id: subject.id,
                name: subject.title,
                students: studentCount || 0,
                avgGrade,
                completionRate
            };
        }));

        res.json(analytics);
    } catch (err) {
        console.error("[TeacherAnalytics] Error:", err);
        res.status(500).json({ error: err.message });
    }
};

exports.getEarnings = async (req, res) => {
    try {
        const { userId, userRole } = req;
        if (userRole !== 'teacher') return res.status(403).json({ error: "Unauthorized" });

        const { data: teacher, error: tError } = await supabase.from('teachers').select('id').eq('user_id', userId).single();
        if (tError || !teacher) {
            console.error(`[TeacherEarnings] Teacher profile not found for userId=${userId}:`, tError);
            return res.status(404).json({ error: "Teacher profile not found" });
        }
        const teacherId = teacher.id;

        const { data: payouts, error } = await supabase
            .from('teacher_payouts')
            .select('*')
            .eq('teacher_id', teacherId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        res.json(payouts || []);
    } catch (err) {
        console.error("[TeacherEarnings] Error:", err);
        res.status(500).json({ error: err.message });
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
        // 2. Get subjects taught by this teacher (primary or assistant)
        const { data: primarySubjects } = await supabase
            .from('subjects')
            .select('id, title, class_id, classes(display_name)')
            .eq('teacher_id', teacher.id);
            
        const { data: assocSubjects } = await supabase
            .from('subject_teachers')
            .select('subject_id, subject:subjects!inner(id, title, class_id, classes(display_name))')
            .eq('teacher_id', teacher.id);

        const primaryList = primarySubjects || [];
        const assocList = (assocSubjects || []).map(as => as.subject).filter(Boolean);
        
        // Deduplicate
        const subjectsMap = new Map();
        [...primaryList, ...assocList].forEach(s => subjectsMap.set(s.id, s));
        const subjects = Array.from(subjectsMap.values());

        if (subjects.length === 0) {
            return res.json({ subjects: [], students: [] });
        }

        const subjectIds = subjects.map(s => s.id);

        // 3. Get enrollments for those subjects
        const { data: enrollments } = await supabase
            .from('enrollments')
            .select(`
                id, student_id, subject_id,
                students ( id, user_id, grade_level, users(first_name, last_name, full_name, email, avatar_url) )
            `)
            .in('subject_id', subjectIds);

        // 4. Get submissions/grades for those students in those subjects
        const studentIds = [...new Set((enrollments || []).map(e => e.student_id).filter(Boolean))];

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
            const subjectEnrollments = (enrollments || []).filter(e => e.subject_id === subject.id);
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
                class_name: subject.classes?.display_name || 'N/A',
                students,
            };
        });

        res.json(performance);
    } catch (err) {
        console.error("[TeacherStudentPerformance] Error:", err);
        res.status(500).json({ error: err.message });
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

        const isClassTeacher = !!(classEnrollment && classEnrollment.classes?.teacher_id === teacherId);

        // 4. Determine if teacher is Subject Teacher for this student
        // Get all subject IDs taught by this teacher
        const { data: primarySubjects } = await supabase
            .from('subjects')
            .select('id')
            .eq('teacher_id', teacherId);
        const primarySubjectIds = (primarySubjects || []).map(s => s.id);

        const { data: assocSubjects } = await supabase
            .from('subject_teachers')
            .select('subject_id')
            .eq('teacher_id', teacherId);
        const assocSubjectIds = (assocSubjects || []).map(s => s.subject_id);

        const teacherSubjectIds = [...new Set([...primarySubjectIds, ...assocSubjectIds])];

        let isSubjectTeacher = false;
        let studentSubjectIds = [];
        if (teacherSubjectIds.length > 0) {
            const { data: enrollData } = await supabase
                .from('enrollments')
                .select('subject_id')
                .eq('student_id', studentId)
                .in('subject_id', teacherSubjectIds)
                .eq('status', 'enrolled');
            
            studentSubjectIds = (enrollData || []).map(e => e.subject_id);
            isSubjectTeacher = studentSubjectIds.length > 0;
        }

        // 5. Gate Access
        if (!isClassTeacher && !isSubjectTeacher) {
            return res.status(403).json({ error: "Access denied: You do not teach or manage this student" });
        }

        // 6. Fetch Scoped Data
        let guardians = [];
        let attendance = [];
        let submissions = [];
        let examResults = [];

        if (isClassTeacher) {
            // Class Teacher gets full access
            // Fetch guardians
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
            // Fetch subject-specific attendance
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
        console.error("[TeacherStudentDetails] Error:", err);
        res.status(500).json({ error: err.message });
    }
};
