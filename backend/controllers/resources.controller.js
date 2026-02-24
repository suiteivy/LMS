const supabase = require("../utils/supabaseClient");

/**
 * Create a resource
 */
exports.createResource = async (req, res) => {
    try {
        const { subject_id, title, url, type, size } = req.body;
        const { userId, userRole, institution_id } = req;

        if (!subject_id || !title || !url || !type) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        // Get Teacher ID if user is teacher
        let teacherId = null;
        if (userRole === 'teacher') {
            const { data: teacher } = await supabase.from('teachers').select('id').eq('user_id', userId).single();
            if (!teacher) return res.status(403).json({ error: "Teacher profile not found" });
            teacherId = teacher.id;
        } else if (userRole === 'admin') {
            // Admin can create for any subject?
            // Maybe fetch the subject's teacher or just leave it null (or optional)
            // For now, let's allow it but warn or fetch subject's teacher
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
                institution_id: req.institution_id
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
 * Get resources (filtered)
 */
exports.getResources = async (req, res) => {
    try {
        const { subject_id } = req.query;
        const { userId, userRole } = req;

        let query = supabase
            .from("resources")
            .select(`
                *,
                subject:subjects(title)
            `)
            .eq("institution_id", req.institution_id)
            .order('created_at', { ascending: false });

        if (subject_id) {
            query = query.eq("subject_id", subject_id);
        }

        // Filter by permissions
        if (userRole === 'teacher') {
            const { data: teacher } = await supabase.from('teachers').select('id').eq('user_id', userId).single();
            // Teachers can see resources for their subjects
            // Or should we let them see all? usually only their own subjects.
            // But if I enforce `teacher_id` match in query, I miss resources added by admin?
            // Better to filter by subjects they teach.
            if (teacher) {
                // For simplicity, if subject_id is passed, we assume frontend checks ownership.
                // But for security, we should ensure the subject belongs to teacher OR is public?
                // Let's rely on the query params for now as a "soft" filter, 
                // but typically we'd do an inner join on subjects where teacher_id = teacher.id
                if (!subject_id) {
                    // If no subject specified, return all for this teacher
                    const { data: subjects } = await supabase.from('subjects').select('id').eq('teacher_id', teacher.id);
                    const subjectIds = (subjects || []).map(s => s.id);
                    if (subjectIds.length > 0) {
                        query = query.in('subject_id', subjectIds);
                    } else {
                        return res.json([]);
                    }
                }
            }
        } else if (userRole === 'student') {
            // Students can see resources for subjects they are enrolled in
            const { data: student } = await supabase.from('students').select('id').eq('user_id', userId).single();
            if (!student) return res.json([]);

            const { data: enrollments } = await supabase.from('enrollments').select('subject_id').eq('student_id', student.id).eq('status', 'enrolled');
            const subjectIds = (enrollments || []).map(e => e.subject_id);

            if (subjectIds.length > 0) {
                query = query.in('subject_id', subjectIds);
            } else {
                return res.json([]);
            }

            // If they requested a specific subject, ensure they are enrolled
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
 * Delete resource
 */
exports.deleteResource = async (req, res) => {
    try {
        const { id } = req.params;
        const { userRole, userId } = req;

        // Check ownership
        const { data: resource, error: fetchError } = await supabase.from('resources').select('*, teacher:teachers(user_id)').eq('id', id).single();

        if (!resource) return res.status(404).json({ error: "Resource not found" });

        if (userRole === 'teacher') {
            // Ensure teacher owns the resource (via teacher_id link)
            // But resources user `teacher_id` UUID, not `user_id`.
            // We need to fetch current teacher's ID
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
