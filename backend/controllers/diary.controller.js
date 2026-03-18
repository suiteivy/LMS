const supabase = require("../utils/supabaseClient");

/**
 * Create a new diary entry (Teacher only or Admin)
 */
exports.createEntry = async (req, res) => {
    try {
        const { class_id, title, content, entry_date } = req.body;
        const { userId, userRole, institution_id } = req;

        if (!class_id || !title || !content) {
            return res.status(400).json({ error: "Class ID, Title, and Content are required." });
        }

        let effectiveTeacherId = null;

        // 1. Authorization
        if (userRole === 'teacher') {
            const { data: teacher } = await supabase.from('teachers').select('id').eq('user_id', userId).single();
            if (!teacher) return res.status(404).json({ error: "Teacher profile not found" });

            // Verify teacher is assigned to this class
            const { data: cls } = await supabase.from('classes').select('id').eq('id', class_id).eq('teacher_id', teacher.id).single();
            if (!cls) {
                // Also check if they teach any subject in this class
                const { data: sub } = await supabase.from('subjects').select('id').eq('class_id', class_id).eq('teacher_id', teacher.id).single();
                if (!sub) return res.status(403).json({ error: "Access denied: You are not assigned to this class" });
            }

            effectiveTeacherId = teacher.id;
        } else if (!['admin', 'master_admin'].includes(userRole)) {
            return res.status(403).json({ error: "Unauthorized" });
        }

        const { data, error } = await supabase
            .from("diary_entries")
            .insert([{
                institution_id,
                class_id,
                teacher_id: effectiveTeacherId,
                title,
                content,
                entry_date: entry_date || new Date().toISOString().split('T')[0]
            }])
            .select()
            .single();

        if (error) throw error;
        res.status(201).json(data);
    } catch (err) {
        console.error("Error creating diary entry:", err);
        res.status(500).json({ error: err.message });
    }
};

/**
 * Get diary entries for a class
 */
exports.getEntries = async (req, res) => {
    try {
        const { class_id, student_id } = req.query;
        const { userId, userRole, institution_id } = req;

        let targetClassId = class_id;

        // If student or parent, we might need to resolve the class_id
        if (userRole === 'student') {
            const { data: student } = await supabase.from('students').select('id').eq('user_id', userId).single();
            if (!student) return res.status(404).json({ error: "Student profile not found" });

            const { data: enrollment } = await supabase.from('class_enrollments').select('class_id').eq('student_id', student.id).single();
            if (!enrollment) return res.status(404).json({ error: "Student not enrolled in any class" });
            targetClassId = enrollment.class_id;
        } else if (userRole === 'parent') {
            if (!student_id) return res.status(400).json({ error: "Student ID required for parents" });

            // Verify parent-student linkage
            const { data: parent } = await supabase.from('parents').select('id').eq('user_id', userId).single();
            const { data: linkage } = await supabase.from('parent_students').select('id').eq('parent_id', parent.id).eq('student_id', student_id).single();
            if (!linkage) return res.status(403).json({ error: "Access denied: Not linked to this student" });

            const { data: enrollment } = await supabase.from('class_enrollments').select('class_id').eq('student_id', student_id).single();
            if (!enrollment) return res.status(404).json({ error: "Student not enrolled in any class" });
            targetClassId = enrollment.class_id;
        }

        if (!targetClassId) return res.status(400).json({ error: "Class ID is required" });

        const { data, error } = await supabase
            .from("diary_entries")
            .select(`
                *,
                teacher:teachers(id, users(first_name, last_name, full_name))
            `)
            .eq("class_id", targetClassId)
            .eq("institution_id", institution_id)
            .order("entry_date", { ascending: false });

        if (error) throw error;
        res.json(data);
    } catch (err) {
        console.error("Error fetching diary entries:", err);
        res.status(500).json({ error: err.message });
    }
};

/**
 * Update a diary entry
 */
exports.updateEntry = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, content, entry_date } = req.body;
        const { userId, userRole } = req;

        // Verify ownership/authorization
        if (userRole === 'teacher') {
            const { data: teacher } = await supabase.from('teachers').select('id').eq('user_id', userId).single();
            const { data: entry } = await supabase.from('diary_entries').select('teacher_id').eq('id', id).single();
            if (!entry || entry.teacher_id !== teacher.id) {
                return res.status(403).json({ error: "Access denied: You did not create this entry" });
            }
        } else if (!['admin', 'master_admin'].includes(userRole)) {
            return res.status(403).json({ error: "Unauthorized" });
        }

        const { data, error } = await supabase
            .from("diary_entries")
            .update({ title, content, entry_date, updated_at: new Date().toISOString() })
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
 * Delete a diary entry
 */
exports.deleteEntry = async (req, res) => {
    try {
        const { id } = req.params;
        const { userId, userRole } = req;

        if (userRole === 'teacher') {
            const { data: teacher } = await supabase.from('teachers').select('id').eq('user_id', userId).single();
            const { data: entry } = await supabase.from('diary_entries').select('teacher_id').eq('id', id).single();
            if (!entry || entry.teacher_id !== teacher.id) {
                return res.status(403).json({ error: "Access denied: You did not create this entry" });
            }
        } else if (!['admin', 'master_admin'].includes(userRole)) {
            return res.status(403).json({ error: "Unauthorized" });
        }

        const { error } = await supabase.from("diary_entries").delete().eq("id", id);
        if (error) throw error;
        res.json({ message: "Entry deleted successfully" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
