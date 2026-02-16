// controllers/attendance.controller.js
const supabase = require("../utils/supabaseClient");

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
