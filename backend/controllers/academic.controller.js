const supabase = require("../utils/supabaseClient.js");
const { resolveTeacher, authorizeTeacherForSubject } = require("../middleware/resolveTeacher.js");

/**
 * Handle Learning Materials (Upload/Update)
 */
exports.updateMaterials = async (req, res) => {
    try {
        const { subject_id, materials } = req.body;
        const { userId, userRole } = req;

        if (!subject_id || !materials) return res.status(400).json({ error: "Subject ID and Materials required" });

        if (userRole === 'teacher') {
            const result = await authorizeTeacherForSubject(userId, subject_id, res);
            if (!result) return;
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

        if (userRole === 'teacher') {
            const result = await authorizeTeacherForSubject(userId, subject_id, res);
            if (!result) return;
            effectiveTeacherId = result.teacherId;
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
        const { institution_id, userId, userRole } = req;
        let query = supabase.from("assignments").select("*").eq("institution_id", institution_id);

        if (userRole === 'student') {
            const { data: student } = await supabase
                .from('students')
                .select('id', 'class_id')
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
        } else if (userRole === 'teacher') {
            // Teachers only see assignments they created
            const { data: teacher } = await supabase.from('teachers').select('id').eq('user_id', userId).single();
            if (teacher) {
                query = query.eq("teacher_id", teacher.id);
            } else {
                // No teacher profile = no assignments
                return res.json([]);
            }
            if (subject_id) {
                query = query.eq("subject_id", subject_id);
            }
        } else {
            // Admin and other roles see all assignments in institution
            if (subject_id) {
                query = query.eq("subject_id", subject_id);
            }
            if(req.query.class_id){
                query = query.eq("class_id", req.query.class_id);
            }
            if(req.query.student_id){
                const {data: student, error: studentAssignmentErr} = await supabase
                    .from('assignments')
                    .select('id')
                    .eq('student_id', req.query.student_id)
                    .eq('institution_id', institution_id)
                    .single();
                
                if(student?.class_id){
                    query = query.eq("class_id", student.class_id);
                }   
                
                if(studentAssignmentErr){
                    res.status(404).json({ error: "Student assignment not found" });
                    console.error("Error fetching students assigments", studentAssignmentErr);
                    return;
                }
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
        const { data: assignment } = await supabase
            .from('assignments')
            .select('subject_id, subject:subjects(id, class_id)')
            .eq('id', assignment_id)
            .single();
        if (!assignment) return res.status(404).json({ error: "Assignment not found" });

        // Check BOTH enrollment tables
        let isEnrolled = false;

        // 1. Direct subject enrollment
        const { data: enrollment } = await supabase
            .from('enrollments')
            .select('id, status')
            .eq('student_id', effectiveStudentId)
            .eq('subject_id', assignment.subject_id)
            .single();

        if (enrollment && enrollment.status === 'enrolled') {
            isEnrolled = true;
        }

        // 2. Class-based enrollment (student → class → subject)
        if (!isEnrolled && assignment.subject?.class_id) {
            const { data: classEnrollment } = await supabase
                .from('class_enrollments')
                .select('id')
                .eq('student_id', effectiveStudentId)
                .eq('class_id', assignment.subject.class_id)
                .single();

            if (classEnrollment) {
                isEnrolled = true;
            }
        }

        if (!isEnrolled) return res.status(403).json({ error: "Access denied: Not enrolled in this subject" });

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

        if (userRole === 'teacher') {
            // Get the submission and its subject
            const { data: submission } = await supabase
                .from('submissions')
                .select('assignment:assignments(subject_id)')
                .eq('id', id)
                .single();

            if (!submission || !submission.assignment?.subject_id) {
                return res.status(404).json({ error: "Submission or assignment not found" });
            }

            const result = await authorizeTeacherForSubject(userId, submission.assignment.subject_id, res);
            if (!result) return;
        } else if (userRole !== 'admin') {
            return res.status(403).json({ error: "Unauthorized" });
        }

        // Grade integrity: clamp to 0..total_points
        let clampedGrade = grade;
        let integrityWarning = null;
        if (typeof grade === 'number') {
            const { data: sub } = await supabase
                .from('submissions')
                .select('assignment_id')
                .eq('id', id)
                .single();
            if (sub?.assignment_id) {
                const { data: assignment } = await supabase
                    .from('assignments')
                    .select('total_points')
                    .eq('id', sub.assignment_id)
                    .single();
                const maxPoints = assignment?.total_points ?? 100;
                if (grade < 0) {
                    clampedGrade = 0;
                    integrityWarning = `Grade clamped from ${grade} to 0 (minimum is 0)`;
                } else if (grade > maxPoints) {
                    clampedGrade = maxPoints;
                    integrityWarning = `Grade clamped from ${grade} to ${maxPoints} (assignment total_points)`;
                }
            }
        }

        const { data, error } = await supabase
            .from("submissions")
            .update({ grade: clampedGrade, feedback, status: 'graded', updated_at: new Date().toISOString() })
            .eq("id", id)
            .select()
            .single();

        if (error) throw error;

        if (integrityWarning) {
            data._integrityWarning = integrityWarning;
        }
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
