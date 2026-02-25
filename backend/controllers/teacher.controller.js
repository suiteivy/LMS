const supabase = require("../utils/supabaseClient");

exports.getDashboardStats = async (req, res) => {
    const startTime = Date.now();
    try {
        const { userId, userRole } = req;
        const institution_id = req.institution_id || null;
        console.log(`[TeacherDashboard] Fetching stats for user: ${userId}, institution: ${institution_id}`);

        if (userRole !== 'teacher') {
            return res.status(403).json({ error: "Unauthorized" });
        }

        // 1. Get Teacher ID
        // Note: We filter by user_id only — institution_id is not stored on the teachers
        // row created by the DB trigger (it lives on the users table).
        const { data: teacher, error: tError } = await supabase
            .from('teachers')
            .select('id')
            .eq('user_id', userId)
            .single();

        if (tError || !teacher) {
            console.error(`[TeacherDashboard] Teacher profile not found for userId=${userId}, institution=${institution_id}:`, tError);
            return res.status(404).json({ error: "Teacher profile not found" });
        }
        const teacherId = teacher.id;

        // Fetch subjects first as others depend on it
        let subjectsQuery = supabase
            .from('subjects')
            .select('id')
            .eq('teacher_id', teacherId);
        if (institution_id) subjectsQuery = subjectsQuery.eq('institution_id', institution_id);
        const { data: mySubjects, error: msError } = await subjectsQuery;

        if (msError) throw msError;
        const subjectIds = (mySubjects || []).map(s => s.id);

        // Prepare concurrent queries
        let subjectsCountQuery = supabase
            .from('subjects')
            .select('*', { count: 'exact', head: true })
            .eq('teacher_id', teacherId);
        if (institution_id) subjectsCountQuery = subjectsCountQuery.eq('institution_id', institution_id);

        const queries = [
            // Count subjects
            subjectsCountQuery,

            // Count unread notifications
            supabase
                .from('notifications')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', userId)
                .eq('is_read', false),
        ];

        // Only add dependent queries if we have subjects
        if (subjectIds.length > 0) {
            // Distinct students from enrollments
            queries.push(
                supabase
                    .from('enrollments')
                    .select('student_id')
                    .in('subject_id', subjectIds)
                    .eq('status', 'enrolled')
            );

            // Today's schedule
            const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            const today = days[new Date().getDay()];
            queries.push(
                supabase
                    .from('timetables')
                    .select(`
                        *,
                        subjects(title),
                        classes(name)
                    `)
                    .eq('day_of_week', today)
                    .in('subject_id', subjectIds)
                    .order('start_time')
            );
        }

        const results = await Promise.all(queries);

        const subjectsCountResult = results[0];
        const notificationsResult = results[1];
        let studentsCount = 0;
        let schedule = [];

        if (subjectIds.length > 0) {
            const enrollmentsResult = results[2];
            const scheduleResult = results[3];

            if (enrollmentsResult.data) {
                const uniqueStudents = new Set(enrollmentsResult.data.map(e => e.student_id));
                studentsCount = uniqueStudents.size;
            }
            schedule = scheduleResult.data || [];
        }

        const duration = Date.now() - startTime;
        console.log(`[TeacherDashboard] Success in ${duration}ms`);

        res.json({
            stats: {
                studentsCount,
                subjectsCount: subjectsCountResult.count || 0,
                unreadNotifications: notificationsResult.count || 0
            },
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

        // 2. Get subjects taught by this teacher
        let subjectsQuery = supabase
            .from('subjects')
            .select('id, title, class_id, classes(name)')
            .eq('teacher_id', teacher.id);
        if (institution_id) subjectsQuery = subjectsQuery.eq('institution_id', institution_id);
        const { data: subjects } = await subjectsQuery;

        if (!subjects || subjects.length === 0) {
            return res.json({ subjects: [], students: [] });
        }

        const subjectIds = subjects.map(s => s.id);

        // 3. Get enrollments for those subjects
        const { data: enrollments } = await supabase
            .from('enrollments')
            .select(`
                id, student_id, subject_id,
                students ( id, user_id, grade_level, users(full_name, email, avatar_url) )
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
                    assignments!inner ( title, subject_id, total_marks )
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
                    email: enrollment.students?.users?.email || '',
                    avatar_url: enrollment.students?.users?.avatar_url || null,
                    grade_level: enrollment.students?.grade_level || null,
                    submissions_count: studentSubs.length,
                    graded_count: gradedSubs.length,
                    average_grade: avgGrade !== null ? Math.round(avgGrade * 100) / 100 : null,
                    submissions: studentSubs.map(s => ({
                        id: s.id,
                        assignment_title: s.assignments?.title || 'Unknown',
                        total_marks: s.assignments?.total_marks || 0,
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
                class_name: subject.classes?.name || 'N/A',
                students,
            };
        });

        res.json(performance);
    } catch (err) {
        console.error("[TeacherStudentPerformance] Error:", err);
        res.status(500).json({ error: err.message });
    }
};
