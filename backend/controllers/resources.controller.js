const supabase = require("../utils/supabaseClient.js");

/**
 * Create a resource (status defaults to 'pending' for teacher uploads)
 */
exports.createResource = async (req, res) => {
    try {
        const { subject_id, title, url, type, size } = req.body;
        const { userId, userRole } = req;

        if (!subject_id || !title || !url || !type) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        let teacherId = null;
        if (userRole === 'teacher') {
            const { data: teacher } = await supabase.from('teachers').select('id').eq('user_id', userId).single();
            if (!teacher) return res.status(403).json({ error: "Teacher profile not found" });
            teacherId = teacher.id;
        } else if (userRole === 'admin') {
            const { data: subject } = await supabase.from('subjects').select('teacher_id').eq('id', subject_id).single();
            if (subject) teacherId = subject.teacher_id;
        } else {
            return res.status(403).json({ error: "Unauthorized" });
        }

        const { data, error } = await supabase
            .from("resources")
            .insert([{
                subject_id,
                teacher_id: teacherId,
                title,
                url,
                type,
                size,
                institution_id: req.institution_id,
                // Teachers submit for approval; admins auto-approve
                status: userRole === 'admin' ? 'approved' : 'pending'
            }])
            .select()
            .single();

        if (error) throw error;
        res.status(201).json(data);
    } catch (err) {
        console.error("createResource error:", err);
        res.status(500).json({ error: err.message });
    }
};

/**
 * Get resources (filtered by subject, status, and role)
 */
exports.getResources = async (req, res) => {
    try {
        const { subject_id, status } = req.query;
        const { userId, userRole } = req;

        let query = supabase
            .from("resources")
            .select(`*, subject:subjects(title)`)
            .eq("institution_id", req.institution_id)
            .order('created_at', { ascending: false });

        if (subject_id) query = query.eq("subject_id", subject_id);
        if (status) query = query.eq("status", status);

        if (userRole === 'teacher') {
            const { data: teacher } = await supabase.from('teachers').select('id').eq('user_id', userId).single();
            if (teacher && !subject_id) {
                const { data: subjects } = await supabase.from('subjects').select('id').eq('teacher_id', teacher.id);
                const subjectIds = (subjects || []).map(s => s.id);
                if (subjectIds.length > 0) {
                    query = query.in('subject_id', subjectIds);
                } else {
                    return res.json([]);
                }
            }
        } else if (userRole === 'student') {
            const { data: student } = await supabase.from('students').select('id').eq('user_id', userId).single();
            if (!student) return res.json([]);

            const { data: enrollments } = await supabase.from('enrollments').select('subject_id').eq('student_id', student.id).eq('status', 'enrolled');
            const subjectIds = (enrollments || []).map(e => e.subject_id);

            if (subjectIds.length > 0) {
                query = query.in('subject_id', subjectIds).eq('status', 'approved');
            } else {
                return res.json([]);
            }

            if (subject_id && !subjectIds.includes(subject_id)) {
                return res.status(403).json({ error: "Not enrolled in this subject" });
            }
        }

        const { data, error } = await query;
        if (error) throw error;
        res.json(data);
    } catch (err) {
        console.error("getResources error:", err);
        res.status(500).json({ error: err.message });
    }
};

/**
 * Get pending resources for admin approval
 */
exports.getPendingResources = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from("resources")
            .select(`
                *,
                subject:subjects(title),
                teacher:teachers(
                    user:users(full_name, email)
                )
            `)
            .eq("institution_id", req.institution_id)
            .eq("status", "pending")
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json(data || []);
    } catch (err) {
        console.error("getPendingResources error:", err);
        res.status(500).json({ error: err.message });
    }
};

/**
 * Approve or reject a resource (admin only)
 */
exports.approveResource = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, feedback } = req.body;

        if (!['approved', 'rejected'].includes(status)) {
            return res.status(400).json({ error: "Status must be 'approved' or 'rejected'" });
        }

        const updateData = { status };
        if (feedback) updateData.feedback = feedback;

        const { error } = await supabase
            .from("resources")
            .update(updateData)
            .eq("id", id)
            .eq("institution_id", req.institution_id);

        if (error) throw error;
        res.json({ message: `Resource ${status} successfully` });
    } catch (err) {
        console.error("approveResource error:", err);
        res.status(500).json({ error: err.message });
    }
};

/**
 * Delete resource
 */
exports.deleteResource = async (req, res) => {
    try {
        const { id } = req.params;
        const { userRole, userId } = req;

        const { data: resource } = await supabase
            .from('resources')
            .select('teacher_id')
            .eq('id', id)
            .single();

        if (!resource) return res.status(404).json({ error: "Resource not found" });

        if (userRole === 'teacher') {
            const { data: teacher } = await supabase.from('teachers').select('id').eq('user_id', userId).single();
            if (!teacher || resource.teacher_id !== teacher.id) {
                return res.status(403).json({ error: "Unauthorized" });
            }
        } else if (userRole !== 'admin') {
            return res.status(403).json({ error: "Unauthorized" });
        }

        const { error } = await supabase.from('resources').delete().eq('id', id);
        if (error) throw error;

        res.json({ message: "Deleted successfully" });
    } catch (err) {
        console.error("deleteResource error:", err);
        res.status(500).json({ error: err.message });
    }
};
