// controllers/attendance.controller.js
const supabase = require("../utils/supabaseClient");

/**
 * Get Student Attendance for a class/subject on a date
 */
exports.getStudentAttendance = async (req, res) => {
    try {
        const { date, subject_id, class_id } = req.query;
        const { userId, userRole, institution_id } = req;
        
        if (!date || !subject_id) return res.status(400).json({ error: "Date and Subject ID required" });

        // Authorization: If teacher, verify they teach this subject
        if (userRole === 'teacher') {
            const { data: teacher } = await supabase.from('teachers').select('id').eq('user_id', userId).single();
            if (!teacher) return res.status(404).json({ error: "Teacher profile not found" });
            
            const { data: subject } = await supabase.from('subjects').select('id').eq('id', subject_id).eq('teacher_id', teacher.id).single();
            if (!subject) return res.status(403).json({ error: "Access denied: You do not teach this subject" });
        } else if (!['admin', 'bursary'].includes(userRole)) {
            return res.status(403).json({ error: "Unauthorized" });
        }

        // 1. Get all students enrolled in this subject
        const { data: enrollments, error: eError } = await supabase
            .from("students")
            .select("id, users!inner(full_name, avatar_url), enrollments!inner(subject_id)")
            .eq("institution_id", institution_id)
            .eq("enrollments.subject_id", subject_id);

        if (eError) throw eError;

        // 2. Get attendance records for date and subject
        const { data: attendance, error: aError } = await supabase
            .from("attendance")
            .select("*")
            .eq("date", date)
            .eq("subject_id", subject_id);

        if (aError) throw aError;

        // Merge logic
        const result = enrollments.map(s => {
            const record = attendance?.find(a => a.student_id === s.id);
            return {
                student_id: s.id,
                name: s.users.full_name,
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

        // Authorization helper
        if (userRole === 'teacher') {
            const { data: teacher } = await supabase.from('teachers').select('id').eq('user_id', userId).single();
            if (!teacher) return res.status(404).json({ error: "Teacher profile not found" });
            
            // Ensure teacher teaches this subject
            const { data: subject } = await supabase.from('subjects').select('id').eq('id', subject_id).eq('teacher_id', teacher.id).single();
            if (!subject) return res.status(403).json({ error: "Access denied: You do not teach this subject" });
        } else if (!['admin', 'bursary'].includes(userRole)) {
            return res.status(403).json({ error: "Unauthorized" });
        }

        if (!student_id || !subject_id || !status) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        // Upsert
        const { data, error } = await supabase
            .from("attendance")
            .upsert({
                student_id,
                subject_id,
                class_id,
                date: date || new Date().toISOString().split('T')[0],
                status,
                notes,
                institution_id
            }, { onConflict: "student_id, subject_id, date" })
            .select();

        if (error) throw error;
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
            .select("id, users!inner(full_name, avatar_url)")
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
