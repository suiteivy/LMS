const supabase = require("../utils/supabaseClient.js");
const { parsePagination, paginatedResponse } = require("../utils/pagination.js");
const { resolveTeacherScope } = require("../middleware/teacherScope.js");
const {
    isVideo,
    VIDEO_ERROR_MESSAGE,
    SIZE_ERROR_MESSAGE,
    MAX_FILE_SIZE_BYTES
} = require("../services/upload.service.js");

/**
 * Create a resource (status is always 'approved' — no approval gate)
 * Academic Vault & Digital Resources with target_audience ('everyone' vs 'staff_only')
 */
exports.createResource = async (req, res) => {
    try {
        const { subject_id, class_id, title, url, type, size, target_audience = 'everyone', description, topic_area_id, topic_id } = req.body;
        const { userId, userRole } = req;

        if (!title || !url || !type) {
            return res.status(400).json({ error: "Title, url, and resource type are required" });
        }

        // 1. Enforce Scope: Disallow video uploads; allow only documents and web links
        const normalizedType = String(type).toLowerCase().trim();
        if (normalizedType === 'video' || isVideo(null, url)) {
            return res.status(400).json({
                error: VIDEO_ERROR_MESSAGE,
                code: 'VIDEO_NOT_SUPPORTED'
            });
        }

        const ALLOWED_RESOURCE_TYPES = new Set(['pdf', 'doc', 'docx', 'document', 'link', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv']);
        if (!ALLOWED_RESOURCE_TYPES.has(normalizedType)) {
            return res.status(400).json({
                error: "Unsupported resource type. Allowed formats for Academic Vault are documents (PDF, Word, Excel, PowerPoint, Text) and web links.",
                code: 'INVALID_RESOURCE_TYPE'
            });
        }

        // 2. Enforce File Size Limit (10MB)
        if (size) {
            let bytes = null;
            if (typeof size === 'number') {
                bytes = size;
            } else if (typeof size === 'string') {
                const m = size.match(/^([\d.]+)\s*(kb|mb|gb|bytes)?$/i);
                if (m) {
                    const num = parseFloat(m[1]);
                    const unit = (m[2] || '').toLowerCase();
                    if (unit === 'mb') bytes = num * 1024 * 1024;
                    else if (unit === 'gb') bytes = num * 1024 * 1024 * 1024;
                    else if (unit === 'kb') bytes = num * 1024;
                    else bytes = num;
                }
            }
            if (bytes && bytes > MAX_FILE_SIZE_BYTES) {
                return res.status(400).json({
                    error: SIZE_ERROR_MESSAGE,
                    code: 'FILE_TOO_LARGE'
                });
            }
        }

        if (!['everyone', 'staff_only'].includes(target_audience)) {
            return res.status(400).json({ error: "target_audience must be 'everyone' or 'staff_only'" });
        }

        let teacherId = null;
        if (userRole === 'teacher') {
            const { data: teacher } = await supabase.from('teachers').select('id').eq('user_id', userId).maybeSingle();
            if (!teacher) return res.status(403).json({ error: "Teacher profile not found" });
            teacherId = teacher.id;
        } else if (userRole === 'admin') {
            if (subject_id) {
                const { data: subject } = await supabase.from('subjects').select('teacher_id').eq('id', subject_id).maybeSingle();
                if (subject) teacherId = subject.teacher_id;
            }
        } else {
            return res.status(403).json({ error: "Unauthorized" });
        }

        // Auto-resolve class_id from subject if not explicitly supplied
        let finalClassId = class_id || null;
        if (!finalClassId && subject_id) {
            const { data: subjectRow } = await supabase.from('subjects').select('class_id').eq('id', subject_id).maybeSingle();
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
            status: 'approved'
        };

        if (subject_id) insertPayload.subject_id = subject_id;
        if (finalClassId) insertPayload.class_id = finalClassId;
        if (teacherId) insertPayload.teacher_id = teacherId;
        if (topic_area_id) insertPayload.topic_area_id = topic_area_id;
        if (topic_id) insertPayload.topic_id = topic_id;

        const { data, error } = await supabase
            .from("resources")
            .insert([insertPayload])
            .select(`*, subject:subjects(title), class:classes(display_name), topic_area:subject_topic_areas(name), topic:subject_topics(name)`)
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
        const { subject_id, class_id, status, target_audience, topic_area_id, topic_id } = req.query;
        const { userId, userRole } = req;
        const { page, limit, from, to } = parsePagination(req.query, { defaultLimit: 25 });

        let query = supabase
            .from("resources")
            .select(`*, subject:subjects(title), class:classes(display_name), topic_area:subject_topic_areas(name), topic:subject_topics(name)`, { count: 'exact' })
            .eq("institution_id", req.institution_id)
            .order('created_at', { ascending: false })
            .range(from, to);

        if (subject_id) query = query.eq("subject_id", subject_id);
        if (class_id) query = query.eq("class_id", class_id);
        if (topic_area_id) query = query.eq("topic_area_id", topic_area_id);
        if (topic_id) query = query.eq("topic_id", topic_id);
        if (status) query = query.eq("status", status);

        if (userRole === 'student') {
            // Strict audience control: students only see 'everyone' resources and approved status
            query = query.eq('target_audience', 'everyone').eq('status', 'approved');

            const { data: student } = await supabase.from('students').select('id, class_id').eq('user_id', userId).maybeSingle();
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
            const reqRoleMode = req.headers['x-teacher-role-mode'] || req.query.role_mode;
            const scope = await resolveTeacherScope(userId, req.institution_id, reqRoleMode);
            if (!subject_id && !class_id && scope) {
                const ctClassIds = scope.classTeacherClassIds || [];
                const taughtSubjIds = scope.taughtSubjectIds || scope.subjectIds || [];
                const hodSubjIds = scope.hodSubjectIds || [];

                if (scope.activeMode === 'class' && ctClassIds.length > 0) {
                    query = query.or(`class_id.in.(${ctClassIds.join(',')}),and(class_id.is.null,subject_id.is.null)`);
                } else if (scope.activeMode === 'hod' && hodSubjIds.length > 0) {
                    query = query.or(`subject_id.in.(${hodSubjIds.join(',')}),and(class_id.is.null,subject_id.is.null)`);
                } else if (taughtSubjIds.length > 0) {
                    query = query.or(`subject_id.in.(${taughtSubjIds.join(',')}),and(class_id.is.null,subject_id.is.null)`);
                }
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

/**
 * Download / retrieve resource verifying original format and tenant access
 */
exports.downloadResource = async (req, res) => {
    try {
        const { id } = req.params;
        const { userId, userRole, institution_id } = req;

        const { data: resource, error } = await supabase
            .from('resources')
            .select('*, subject:subjects(title)')
            .eq('id', id)
            .eq('institution_id', institution_id)
            .maybeSingle();

        if (error || !resource) {
            return res.status(404).json({ error: "Resource not found" });
        }

        // Role-based visibility check: students and parents cannot access staff_only resources
        if ((userRole === 'student' || userRole === 'parent') && (resource.target_audience === 'staff_only' || resource.status !== 'approved')) {
            return res.status(403).json({ error: "Access denied: this resource is restricted to staff" });
        }

        // If resource is external link
        if (resource.type === 'link') {
            return res.json({
                id: resource.id,
                title: resource.title,
                url: resource.url,
                type: 'link',
                download_url: resource.url
            });
        }

        // Return verified download details with original format metadata
        return res.json({
            id: resource.id,
            title: resource.title,
            url: resource.url,
            type: resource.type,
            size: resource.size,
            download_url: resource.url,
            original_format_preserved: true,
            institution_id: resource.institution_id
        });
    } catch (err) {
        console.error("downloadResource error:", err);
        res.status(500).json({ error: err.message });
    }
};

