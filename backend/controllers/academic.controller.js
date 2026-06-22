const supabase = require("../utils/supabaseClient.js");

/**
 * Handle Learning Materials (Upload/Update)
 */
exports.updateMaterials = async (req, res) => {
    try {
        const { subject_id, materials } = req.body;
        const { userId, userRole } = req;

        if (!subject_id || !materials) return res.status(400).json({ error: "Subject ID and Materials required" });

        // 1. If teacher, verify they teach this subject
        if (userRole === 'teacher') {
            const { data: teacher } = await supabase
                .from('teachers')
                .select('id')
                .eq('user_id', userId)
                .single();
            if (!teacher) return res.status(403).json({ error: "Teacher profile not found" });

            const { data: subject } = await supabase
                .from('subjects')
                .select('id, teacher_id')
                .eq('id', subject_id)
                .single();

            if (!subject) return res.status(404).json({ error: "Subject not found" });

            let isAssigned = (subject.teacher_id === teacher.id);
            if (!isAssigned) {
                const { data: assoc } = await supabase
                    .from('subject_teachers')
                    .select('id')
                    .eq('subject_id', subject_id)
                    .eq('teacher_id', teacher.id)
                    .maybeSingle();
                if (assoc) isAssigned = true;
            }

            if (!isAssigned) {
                return res.status(403).json({ error: "Access denied: You do not teach this subject" });
            }
        } else if (userRole !== 'admin') {
            return res.status(403).json({ error: "Unauthorized" });
        }

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
        const { subject_id, teacher_id: bodyTeacherId, title, description, due_date, weight, term, is_published, student_id } = req.body;
        const { userId, userRole, institution_id } = req;

        let effectiveTeacherId = bodyTeacherId;

        // Verify authorization
        if (userRole === 'teacher') {
            const { data: teacher } = await supabase.from('teachers').select('id').eq('user_id', userId).single();
            if (!teacher) return res.status(404).json({ error: "Teacher profile not found" });
            
            // Ensure teacher teaches this subject (primary or assistant)
            const { data: subject } = await supabase.from('subjects').select('id, teacher_id').eq('id', subject_id).single();
            if (!subject) return res.status(404).json({ error: "Subject not found" });

            let isAssigned = (subject.teacher_id === teacher.id);
            if (!isAssigned) {
                const { data: assoc } = await supabase
                    .from('subject_teachers')
                    .select('id')
                    .eq('subject_id', subject_id)
                    .eq('teacher_id', teacher.id)
                    .maybeSingle();
                if (assoc) isAssigned = true;
            }

            if (!isAssigned) return res.status(403).json({ error: "Access denied: You do not teach this subject" });
            
            effectiveTeacherId = teacher.id;
        } else if (userRole !== 'admin') {
            return res.status(403).json({ error: "Unauthorized" });
        }

        const { data, error } = await supabase
            .from("assignments")
            .insert([{
                subject_id,
                teacher_id: effectiveTeacherId,
                title,
                description,
                due_date,
                institution_id,
                weight: weight || 0,
                term,
                is_published: is_published !== undefined ? is_published : true,
                student_id: student_id || null
            }])
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
        const { institution_id , userId, userRole} = req;
        let query = supabase.from("assignments").select("*").eq("institution_id", institution_id);
        
        if (userRole === 'student'){
            const { data: student } = await supabase 
                .from('students')
                .select('id, class_id')
                .eq('user_id', userId)
                .single();
            
            if (student) {
                if (subject_id) {
                    query = query.eq("subject_id", subject_id);
                } else if (student.class_id) {
                    query = query.eq('class_id', student.class_id);
                }
                query = query.or(`student_id.is.null,student_id.eq.${student.id}`);
            }
        } else {
            if (subject_id) {
                query = query.eq("subject_id", subject_id);
            }
        }

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
        const { assignment_id, student_id: bodyStudentId, file_url, content } = req.body;
        const { userId, userRole, institution_id } = req;

        let effectiveStudentId = bodyStudentId;

        // 1. Authorization
        if (userRole === 'student') {
            const { data: student } = await supabase.from('students').select('id').eq('user_id', userId).single();
            if (!student) return res.status(404).json({ error: "Student profile not found" });
            effectiveStudentId = student.id;
        } else if (userRole !== 'admin') {
            return res.status(403).json({ error: "Unauthorized" });
        }

        // 2. Verify enrollment in the subject for this assignment
        const { data: assignment } = await supabase.from('assignments').select('subject_id').eq('id', assignment_id).single();
        if (!assignment) return res.status(404).json({ error: "Assignment not found" });

        const { data: enrollment } = await supabase
            .from('enrollments')
            .select('id')
            .eq('student_id', effectiveStudentId)
            .eq('subject_id', assignment.subject_id)
            .single();

        if (!enrollment) return res.status(403).json({ error: "Access denied: Not enrolled in this subject" });

        const { data, error } = await supabase
            .from("submissions")
            .insert([{ assignment_id, student_id: effectiveStudentId, file_url, content, status: 'submitted', institution_id }])
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
        const { userId, userRole } = req;

        // 1. Authorization & Ownership
        if (userRole === 'teacher') {
            const { data: teacher } = await supabase.from('teachers').select('id').eq('user_id', userId).single();
            if (!teacher) return res.status(404).json({ error: "Teacher profile not found" });

            // Get the submission and its subject
            const { data: submission } = await supabase
                .from('submissions')
                .select('assignment:assignments(subject_id)')
                .eq('id', id)
                .single();

            if (!submission || !submission.assignment?.subject_id) {
                return res.status(404).json({ error: "Submission or assignment not found" });
            }

            const subjectId = submission.assignment.subject_id;
            const { data: subject } = await supabase
                .from('subjects')
                .select('teacher_id')
                .eq('id', subjectId)
                .single();

            let isAssigned = (subject?.teacher_id === teacher.id);
            if (!isAssigned) {
                const { data: assoc } = await supabase
                    .from('subject_teachers')
                    .select('id')
                    .eq('subject_id', subjectId)
                    .eq('teacher_id', teacher.id)
                    .maybeSingle();
                if (assoc) isAssigned = true;
            }

            if (!isAssigned) {
                return res.status(403).json({ error: "Access denied: You do not teach this subject" });
            }
        } else if (userRole !== 'admin') {
            return res.status(403).json({ error: "Unauthorized" });
        }

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
        const { institution_id } = req;
        const { data, error } = await supabase
            .from("announcements")
            .insert([{ subject_id, teacher_id, title, message, institution_id }])
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
        const { institution_id } = req;
        let query = supabase.from("announcements")
            .select("*, teacher:teachers(user:users(first_name, last_name, full_name))")
            .eq("institution_id", institution_id);
        if (subject_id) query = query.eq("subject_id", subject_id);

        const { data, error } = await query;
        if (error) throw error;
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.deleteAnnouncement = async (req, res) => {
    try {
        const { id } = req.params;
        const { institution_id, userRole } = req;

        let query = supabase
            .from("announcements")
            .delete()
            .eq("id", id);

        // Enforce institution boundary unless master_admin
        if (userRole !== 'master_admin') {
            query = query.eq("institution_id", institution_id);
        }

        const { error } = await query;

        if (error) throw error;
        res.status(200).json({ message: "Announcement deleted successfully" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
