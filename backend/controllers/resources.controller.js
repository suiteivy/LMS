const supabase = require("../utils/supabaseClient.js");
const { parsePagination, paginatedResponse } = require("../utils/pagination.js");

/**
 * Create a resource (status defaults to 'approved' for admin, 'approved' or 'pending' for teacher)
 * Academic Vault & Digital Resources with target_audience ('everyone' vs 'staff_only')
 */
exports.createResource = async (req, res) => {
    try {
        const { subject_id, class_id, title, url, type, size, target_audience = 'everyone', description } = req.body;
        const { userId, userRole } = req;

        if (!title || !url || !type) {
            return res.status(400).json({ error: "Title, url, and resource type are required" });
        }

        if (!['everyone', 'staff_only'].includes(target_audience)) {
            return res.status(400).json({ error: "target_audience must be 'everyone' or 'staff_only'" });
        }

        let teacherId = null;
        if (userRole === 'teacher') {
            const { data: teacher } = await supabase.from('teachers').select('id').eq('user_id', userId).single();
            if (!teacher) return res.status(403).json({ error: "Teacher profile not found" });
            teacherId = teacher.id;
        } else if (userRole === 'admin') {
            if (subject_id) {
                const { data: subject } = await supabase.from('subjects').select('teacher_id').eq('id', subject_id).single();
                if (subject) teacherId = subject.teacher_id;
            }
        } else {
            return res.status(403).json({ error: "Unauthorized" });
        }

        // Auto-resolve class_id from subject if not explicitly supplied
        let finalClassId = class_id || null;
        if (!finalClassId && subject_id) {
            const { data: subjectRow } = await supabase.from('subjects').select('class_id').eq('id', subject_id).single();
            if (subjectRow?.class_id) {
                finalClassId = subjectRow.class_id;
            }
        }

        const insertPayload = {
            title: title.trim(),
            url,
            type,
            size: size || null,
            institution_id: req.institution_id,
            target_audience,
            status: userRole === 'admin' ? 'approved' : 'approved' // Teachers upload approved or pending
        };

        if (subject_id) insertPayload.subject_id = subject_id;
        if (finalClassId) insertPayload.class_id = finalClassId;
        if (teacherId) insertPayload.teacher_id = teacherId;

        const { data, error } = await supabase
            .from("resources")
            .insert([insertPayload])
            .select(`*, subject:subjects(title), class:classes(display_name)`)
            .single();

        if (error) throw error;
        res.status(201).json(data);
    } catch (err) {
        console.error("createResource error:", err);
        res.status(500).json({ error: err.message });
    }
};

/**
 * Get resources (filtered by subject, class, status, audience and role)
 */
exports.getResources = async (req, res) => {
    try {
        const { subject_id, class_id, status, target_audience } = req.query;
        const { userId, userRole } = req;
        const { page, limit, from, to } = parsePagination(req.query, { defaultLimit: 25 });

        let query = supabase
            .from("resources")
            .select(`*, subject:subjects(title), class:classes(display_name)`, { count: 'exact' })
            .eq("institution_id", req.institution_id)
            .order('created_at', { ascending: false })
            .range(from, to);

        if (subject_id) query = query.eq("subject_id", subject_id);
        if (class_id) query = query.eq("class_id", class_id);
        if (status) query = query.eq("status", status);

        if (userRole === 'student') {
            // Strict audience control: students only see 'everyone' resources and approved status
            query = query.eq('target_audience', 'everyone').eq('status', 'approved');

            const { data: student } = await supabase.from('students').select('id, class_id').eq('user_id', userId).single();
            if (!student) return res.json(paginatedResponse([], 0, page, limit));

            const { data: enrollments } = await supabase.from('enrollments').select('subject_id').eq('student_id', student.id).eq('status', 'enrolled');
            const subjectIds = (enrollments || []).map(e => e.subject_id).filter(Boolean);

            if (student.class_id && subjectIds.length > 0) {
                query = query.or(`subject_id.in.(${subjectIds.join(',')}),class_id.eq.${student.class_id}`);
            } else if (student.class_id) {
                query = query.eq('class_id', student.class_id);
            } else if (subjectIds.length > 0) {
                query = query.in('subject_id', subjectIds);
            }
        } else if (userRole === 'parent') {
            // Parents only see 'everyone' resources
            query = query.eq('target_audience', 'everyone').eq('status', 'approved');
        } else if (userRole === 'teacher') {
            if (target_audience) {
                query = query.eq('target_audience', target_audience);
            }
        } else if (target_audience) {
            query = query.eq('target_audience', target_audience);
        }

        const { data, error, count } = await query;

        if (error) throw error;
        res.json(paginatedResponse(data || [], count, page, limit));
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
        const { page, limit, from, to } = parsePagination(req.query, { defaultLimit: 25 });
        const { data, error, count } = await supabase
            .from("resources")
            .select(`
                *,
                subject:subjects(title),
                class:classes(display_name),
                teacher:teachers(
                    user:users(full_name, email)
                )
            `, { count: 'exact' })
            .eq("institution_id", req.institution_id)
            .eq("status", "pending")
            .order('created_at', { ascending: false })
            .range(from, to);

        if (error) throw error;
        res.json(paginatedResponse(data || [], count, page, limit));
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
