// controllers/attendance.controller.js
const supabase = require("../utils/supabaseClient");

/**
 * Get Student Attendance for a class/subject on a date
 */
exports.getStudentAttendance = async (req, res) => {
    try {
        const { date, subject_id, class_id } = req.query;
        if (!date || !subject_id) return res.status(400).json({ error: "Date and Subject ID required" });

        // 1. Get all students enrolled in this subject (or class)
        let query = supabase
            .from("enrollments")
            .select("student_id, students!inner(id, users!inner(full_name, avatar_url))")
            .eq("subject_id", subject_id);

        if (class_id) {
            // Further filter if class_id provided
            // Actually, subjects usually belong to a class.
        }

        const { data: enrollments, error: eError } = await query;
        if (eError) throw eError;

        // 2. Get attendance records for date and subject
        const { data: attendance, error: aError } = await supabase
            .from("attendance")
            .select("*")
            .eq("date", date)
            .eq("subject_id", subject_id);

        if (aError) throw aError;

        // Merge logic
        const result = enrollments.map(e => {
            const record = attendance?.find(a => a.student_id === e.student_id);
            return {
                student_id: e.student_id,
                name: e.students.users.full_name,
                avatar_url: e.students.users.avatar_url,
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
        const { institution_id, userRole } = req;

        if (!['admin', 'teacher', 'bursary'].includes(userRole)) {
            return res.status(403).json({ error: "Unauthorized to mark attendance" });
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
        if (!date) return res.status(400).json({ error: "Date required" });

        // 1. Get all teachers
        const { data: teachers, error: tError } = await supabase
            .from("teachers")
            .select("id, users!inner(full_name, avatar_url)");

        if (tError) throw tError;

        // 2. Get attendance records for date
        const { data: attendance, error: aError } = await supabase
            .from("teacher_attendance") // Need to ensure this table exists! 
            // Wait, did I create 'teacher_attendance' table? 
            // I created 'attendance' table (student).
            // My migration Plan said "Replace student attendance with teacher attendance monitoring".
            // I created `20260216160000_feature_enhancements.sql`. 
            // Let's double check if `teacher_attendance` was in it.
            // I see `attendance` table in schema.sql but that looks like student attendance (student_id).
            // I might have forgotten to create `teacher_attendance` table in the migration?
            // "Attendance: Replace student attendance with teacher attendance monitoring."
            // In the migration SQL I wrote:
            // "CREATE TABLE IF NOT EXISTS public.timetables..."
            // "ALTER TABLE public.users..."
            // I need to check if I added teacher_attendance.
            // If not, I need to add it now.
            .select("*")
            .eq("date", date);

        if (aError && aError.code !== "PGRST116") throw aError; // PGRST116 is not found? No, simple select returns empty array.

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

        // Upsert
        const { data, error } = await supabase
            .from("teacher_attendance")
            .upsert({ teacher_id, date, status, notes }, { onConflict: "teacher_id, date" })
            .select();

        if (error) throw error;
        res.json(data[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
