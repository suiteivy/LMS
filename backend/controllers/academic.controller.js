const supabase = require("../utils/supabaseClient");

/**
 * Handle Learning Materials (Upload/Update)
 */
exports.updateMaterials = async (req, res) => {
    try {
        const { subject_id, materials } = req.body; // materials is an array of objects
        if (!subject_id || !materials) return res.status(400).json({ error: "Subject ID and Materials required" });

        const { data, error } = await supabase
            .from("subjects")
            .update({ materials })
            .eq("id", subject_id)
            .select()
            .single();

        if (error) throw error;
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * Assignments Logic
 */
exports.createAssignment = async (req, res) => {
    try {
        const { subject_id, teacher_id, title, description, due_date } = req.body;
        const { data, error } = await supabase
            .from("assignments")
            .insert([{ subject_id, teacher_id, title, description, due_date }])
            .select()
            .single();

        if (error) throw error;
        res.status(201).json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getAssignments = async (req, res) => {
    try {
        const { subject_id } = req.query;
        let query = supabase.from("assignments").select("*");
        if (subject_id) query = query.eq("subject_id", subject_id);

        const { data, error } = await query;
        if (error) throw error;
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * Submissions & Grading
 */
exports.submitAssignment = async (req, res) => {
    try {
        const { assignment_id, student_id, file_url, content } = req.body;
        const { data, error } = await supabase
            .from("submissions")
            .insert([{ assignment_id, student_id, file_url, content, status: 'submitted' }])
            .select()
            .single();

        if (error) throw error;
        res.status(201).json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.gradeSubmission = async (req, res) => {
    try {
        const { id } = req.params;
        const { grade, feedback } = req.body;

        const { data, error } = await supabase
            .from("submissions")
            .update({ grade, feedback, status: 'graded', updated_at: new Date().toISOString() })
            .eq("id", id)
            .select()
            .single();

        if (error) throw error;
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * Announcements
 */
exports.createAnnouncement = async (req, res) => {
    try {
        const { subject_id, teacher_id, title, message } = req.body;
        const { data, error } = await supabase
            .from("announcements")
            .insert([{ subject_id, teacher_id, title, message }])
            .select()
            .single();

        if (error) throw error;
        res.status(201).json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getAnnouncements = async (req, res) => {
    try {
        const { subject_id } = req.query;
        let query = supabase.from("announcements").select("*, teacher:teachers(user:users(full_name))");
        if (subject_id) query = query.eq("subject_id", subject_id);

        const { data, error } = await query;
        if (error) throw error;
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
