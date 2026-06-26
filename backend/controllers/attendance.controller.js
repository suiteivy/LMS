// controllers/attendance.controller.js
const supabase = require("../utils/supabaseClient.js");
const { createNotificationInternal } = require("./notification.controller.js");
const { authorizeTeacherForSubject } = require("../middleware/resolveTeacher.js");

/**
 * Get Student Attendance for a class/subject on a date
 */
exports.getStudentAttendance = async (req, res) => {
    try {
        const { date, subject_id, class_id: _class_id } = req.query;
        const { userId, userRole, institution_id } = req;
        
        if (!date || !subject_id) return res.status(400).json({ error: "Date and Subject ID required" });

        // Authorization: If teacher, verify they teach this subject
        if (userRole === 'teacher') {
            const result = await authorizeTeacherForSubject(userId, subject_id, res);
            if (!result) return;
        } else if (!['admin', 'bursary'].includes(userRole)) {
            return res.status(403).json({ error: "Unauthorized" });
        }

        // 1. Get all students enrolled in this subject (via enrollments)
        const { data: enrollments, error: eError } = await supabase
            .from("students")
            .select("id, users!inner(first_name, last_name, full_name, avatar_url), enrollments!inner(subject_id)")
            .eq("institution_id", institution_id)
            .eq("enrollments.subject_id", subject_id);

        if (eError) throw eError;

        // Also get students enrolled via class_enrollments (class → subject link)
        let classEnrolledStudents = [];
        const { data: subjectRow } = await supabase
            .from('subjects')
            .select('class_id')
            .eq('id', subject_id)
            .single();

        if (subjectRow?.class_id) {
            const { data: classEnrolls } = await supabase
                .from('class_enrollments')
                .select('student_id')
                .eq('class_id', subjectRow.class_id);
            classEnrolledStudents = (classEnrolls || []).map(e => e.student_id);
        }

        // Merge student IDs from both enrollment sources
        const enrollmentStudentIds = new Set((enrollments || []).map(s => s.id));
        (classEnrolledStudents || []).forEach(id => enrollmentStudentIds.add(id));

        // Fetch student details for class-enrolled students not already in enrollments
        let allStudents = [...(enrollments || [])];
        const newIds = [...enrollmentStudentIds].filter(id => !enrollmentStudentIds.has(id) || !allStudents.find(s => s.id === id));
        if (newIds.length > 0) {
            const { data: extraStudents } = await supabase
                .from('students')
                .select('id, users!inner(first_name, last_name, full_name, avatar_url)')
                .in('id', newIds);
            if (extraStudents) allStudents = [...allStudents, ...extraStudents];
        }

        // 2. Get attendance records for date and subject
        const { data: attendance, error: aError } = await supabase
            .from("attendance")
            .select("*")
            .eq("date", date)
            .eq("subject_id", subject_id);

        if (aError) throw aError;

        // Merge logic — use unified student list
        const result = allStudents.map(s => {
            const record = attendance?.find(a => a.student_id === s.id);
            return {
                student_id: s.id,
                student_display_id: s.id,
                name: s.users.full_name,
                first_name: s.users.first_name,
                last_name: s.users.last_name,
                avatar_url: s.users.avatar_url,
                status: record ? record.status : "pending",
                id: record ? record.id : null,
                notes: record ? record.notes : ""
            };
        });

        res.json(result);
    } catch (err) {
        console.error("[Attendance] getStudentAttendance error:", err);
        res.status(500).json({ error: err.message });
    }
};

/**
 * Mark Student Attendance
 */
exports.markStudentAttendance = async (req, res) => {
    try {
        const { student_id, subject_id, class_id, date, status, notes } = req.body;
        const { userId, userRole, institution_id } = req;

        if (userRole === 'teacher') {
            const result = await authorizeTeacherForSubject(userId, subject_id, res);
            if (!result) return;
        } else if (!['admin', 'bursary'].includes(userRole)) {
            return res.status(403).json({ error: "Unauthorized" });
        }

        if (!student_id || !subject_id || !status) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        const markDate = date || new Date().toISOString().split('T')[0];

        let targetClassId = class_id;
        if (!targetClassId) {
            const { data: subjectRow } = await supabase
                .from("subjects")
                .select("class_id")
                .eq("id", subject_id)
                .single();
            targetClassId = subjectRow?.class_id || null;
        }

        // Upsert
        const { data, error } = await supabase
            .from("attendance")
            .upsert({
                student_id,
                subject_id,
                class_id: targetClassId,
                date: markDate,
                status,
                notes,
                institution_id
            }, { onConflict: "student_id, subject_id, date" })
            .select();

        if (error) throw error;

        // Real-time Notification for Parents on Absence
        if (status === 'absent') {
            // Find student's name
            const { data: student } = await supabase
                .from('students')
                .select('users(full_name)')
                .eq('id', student_id)
                .single();

            // Find all parents linked to this student
            const { data: parentRelations } = await supabase
                .from('parent_students')
                .select('parent_id, parents(user_id)')
                .eq('student_id', student_id);

            if (parentRelations && parentRelations.length > 0) {
                const studentName = student?.users?.full_name || 'Your child';
                for (const relation of parentRelations) {
                    if (relation.parents && relation.parents.user_id) {
                        await createNotificationInternal({
                            userId: relation.parents.user_id,
                            title: 'Attendance Alert',
                            message: `${studentName} was marked ABSENT today (${markDate}).`,
                            type: 'warning',
                            data: { student_id, date: markDate, type: 'attendance_absence' }
                        });
                    }
                }
            }
        }

        res.json(data[0]);
    } catch (err) {
        console.error("[Attendance] markStudentAttendance error:", err);
        res.status(500).json({ error: err.message });
    }
};

/**
 * Get Teacher Attendance for a date
 */
exports.getTeacherAttendance = async (req, res) => {
    try {
        const { date } = req.query;
        const { userRole, institution_id } = req;

        if (userRole !== 'admin') {
            return res.status(403).json({ error: "Unauthorized" });
        }

        if (!date) return res.status(400).json({ error: "Date required" });

        // 1. Get all teachers
        const { data: teachers, error: tError } = await supabase
            .from("teachers")
            .select("id, users!inner(first_name, last_name, full_name, avatar_url)")
            .eq("institution_id", institution_id);

        if (tError) throw tError;

        // 2. Get attendance records for date
        const { data: attendance, error: aError } = await supabase
            .from("teacher_attendance")
            .select("*")
            .eq("date", date)
            .eq("institution_id", institution_id);

        if (aError) throw aError;

        // Merge logic
        const result = teachers.map(t => {
            const record = attendance?.find(a => a.teacher_id === t.id);
            return {
                teacher_id: t.id,
                name: t.users.full_name,
                first_name: t.users.first_name,
                last_name: t.users.last_name,
                avatar_url: t.users.avatar_url,
                status: record ? record.status : "pending",
                id: record ? record.id : null,
                notes: record ? record.notes : ""
            };
        });

        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.markTeacherAttendance = async (req, res) => {
    try {
        const { teacher_id, date, status, notes } = req.body;
        const { institution_id, userRole } = req;

        if (userRole !== 'admin') {
            return res.status(403).json({ error: "Unauthorized" });
        }

        // Upsert
        const { data, error } = await supabase
            .from("teacher_attendance")
            .upsert({ teacher_id, date, status, notes, institution_id }, { onConflict: "teacher_id, date" })
            .select();

        if (error) throw error;
        res.json(data[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
