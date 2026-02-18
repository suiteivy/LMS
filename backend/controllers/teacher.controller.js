const supabase = require("../utils/supabaseClient");

exports.getDashboardStats = async (req, res) => {
    try {
        const { userId, userRole, institution_id } = req;

        if (userRole !== 'teacher') {
            return res.status(403).json({ error: "Unauthorized" });
        }

        // 1. Get Teacher ID
        const { data: teacher, error: tError } = await supabase
            .from('teachers')
            .select('id')
            .eq('user_id', userId)
            .single();

        if (tError || !teacher) return res.status(404).json({ error: "Teacher profile not found" });
        const teacherId = teacher.id;

        // 2. Get Subjects Count
        const { count: subjectsCount, error: sError } = await supabase
            .from('subjects')
            .select('*', { count: 'exact', head: true })
            .eq('teacher_id', teacherId);

        // 3. Get Distinct Students Count
        // We fetch all subjects first
        const { data: mySubjects } = await supabase.from('subjects').select('id').eq('teacher_id', teacherId);
        const subjectIds = (mySubjects || []).map(s => s.id);

        let studentsCount = 0;
        if (subjectIds.length > 0) {
            const { data: enrollments, error: eError } = await supabase
                .from('enrollments')
                .select('student_id')
                .in('subject_id', subjectIds)
                .eq('status', 'enrolled');

            if (enrollments) {
                // Distinct student IDs
                const uniqueStudents = new Set(enrollments.map(e => e.student_id));
                studentsCount = uniqueStudents.size;
            }
        }

        // 4. Get Today's Schedule
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const today = days[new Date().getDay()];

        const { data: schedule, error: schError } = await supabase
            .from('timetables')
            .select(`
                *,
                subjects(title),
                classes(name)
            `)
            .eq('day_of_week', today)
            .in('subject_id', subjectIds)
            .order('start_time');

        // 5. Unread Notifications
        const { count: unreadNotifications, error: nError } = await supabase
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('is_read', false);

        res.json({
            stats: {
                studentsCount,
                subjectsCount: subjectsCount || 0,
                unreadNotifications: unreadNotifications || 0
            },
            schedule: schedule || []
        });

    } catch (err) {
        console.error("[TeacherDashboard] Error:", err);
        res.status(500).json({ error: err.message });
    }
};

exports.getAnalytics = async (req, res) => {
    try {
        const { userId, userRole } = req;
        if (userRole !== 'teacher') return res.status(403).json({ error: "Unauthorized" });

        const { data: teacher } = await supabase.from('teachers').select('id').eq('user_id', userId).single();
        if (!teacher) return res.status(404).json({ error: "Teacher profile not found" });
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

        const { data: teacher } = await supabase.from('teachers').select('id').eq('user_id', userId).single();
        if (!teacher) return res.status(404).json({ error: "Teacher profile not found" });
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

