// controllers/timetable.controller.js
const supabase = require("../utils/supabaseClient");
const { startOfWeek, endOfWeek, format } = require("date-fns");

/**
 * Create a new timetable entry
 * Admin only
 */
exports.createTimetableEntry = async (req, res) => {
    try {
        const { userRole, institution_id } = req;
        if (userRole !== "admin") {
            return res.status(403).json({ error: "Admin only." });
        }

        const {
            class_id,
            subject_id,
            day_of_week,
            start_time,
            end_time,
            room_number,
        } = req.body;

        if (!class_id || !subject_id || !day_of_week || !start_time || !end_time) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        // prevent double booking for same class at same time
        // This is also handled by DB constraint, but good for validation
        const { data: existing } = await supabase
            .from("timetables")
            .select("id")
            .eq("class_id", class_id)
            .eq("day_of_week", day_of_week)
            .eq("start_time", start_time)
            .single();

        if (existing) {
            return res
                .status(409)
                .json({ error: "Time slot already occupied for this class" });
        }

        const { data, error } = await supabase
            .from("timetables")
            .insert([
                {
                    class_id,
                    subject_id,
                    day_of_week,
                    start_time,
                    end_time,
                    room_number,
                    institution_id,
                },
            ])
            .select()
            .single();

        if (error) throw error;

        res.status(201).json({ message: "Timetable entry created", entry: data });
    } catch (err) {
        console.error("Create timetable error:", err);
        res.status(500).json({ error: err.message });
    }
};

/**
 * Get timetable for a class
 */
exports.getClassTimetable = async (req, res) => {
    try {
        const { class_id } = req.params;
        const { institution_id } = req;

        const { data, error } = await supabase
            .from("timetables")
            .select(`
        id, day_of_week, start_time, end_time, room_number,
        subjects ( title, teacher_id, teachers(users(full_name)) )
      `)
            .eq("class_id", class_id)
            .eq("institution_id", institution_id)
            .order("start_time", { ascending: true }); // Need custom sort for days normally, but this sorts time

        if (error) throw error;

        res.json(data);
    } catch (err) {
        console.error("Get class timetable error:", err);
        res.status(500).json({ error: err.message });
    }
};

/**
 * Get teacher's timetable
 */
exports.getTeacherTimetable = async (req, res) => {
    try {
        const { institution_id } = req;
        // If admin is viewing, they pass teacher_id. If teacher, use their own.
        let teacherId = req.params.teacher_id;

        if (!teacherId && req.userRole === 'teacher') {
            // Fetch teacher profile
            const { data: t } = await supabase.from('teachers').select('id').eq('user_id', req.userId).single();
            teacherId = t?.id;
        }

        if (!teacherId) return res.status(400).json({ error: "Teacher ID required" });

        // We have to join twice to filter by subject's teacher
        const { data, error } = await supabase
            .from("timetables")
            .select(`
        id, day_of_week, start_time, end_time, room_number,
        classes(name),
        subjects!inner(title)
      `)
            .eq("subjects.teacher_id", teacherId)
            .eq("institution_id", institution_id);

        if (error) throw error;
        res.json(data);
    } catch (err) {
        console.error("Get teacher timetable error:", err);
        res.status(500).json({ error: err.message });
    }
};

/**
 * Update entry
 */
exports.updateTimetableEntry = async (req, res) => {
    try {
        const { id } = req.params;
        const { userRole, institution_id } = req;
        if (userRole !== 'admin') return res.status(403).json({ error: 'Admin only' });

        const updates = req.body;
        delete updates.id;
        delete updates.created_at;

        const { data, error } = await supabase
            .from('timetables')
            .update(updates)
            .eq('id', id)
            .eq('institution_id', institution_id)
            .select()
            .single();

        if (error) throw error;
        res.json({ message: "Updated", entry: data });
    } catch (err) {
        console.error("Update timetable error:", err);
        res.status(500).json({ error: err.message });
    }
}

/**
 * Delete entry
 */
exports.deleteTimetableEntry = async (req, res) => {
    try {
        const { id } = req.params;
        const { userRole, institution_id } = req;
        if (userRole !== 'admin') return res.status(403).json({ error: 'Admin only' });

        const { error } = await supabase.from('timetables').delete().eq('id', id).eq('institution_id', institution_id);
        if (error) throw error;
        res.json({ message: "Deleted" });
    } catch (err) {
        console.error("Delete timetable error:", err);
        res.status(500).json({ error: err.message });
    }
}
