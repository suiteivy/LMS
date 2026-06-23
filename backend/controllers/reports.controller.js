const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');
const { isTeacherAssignedToSubject, resolveTeacher } = require('../middleware/resolveTeacher.js');

dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Get all reports for the institution or a specific student.
 */
exports.getReports = async (req, res) => {
    try {
        const { studentId, term, academicYear } = req.query;
        const user = req.user;

        let query = supabase
            .from('academic_reports')
            .select(`
                *,
                students (
                    id,
                    user_id,
                    users (full_name)
                )
            `)
            .order('created_at', { ascending: false });

        // Institutional Isolation
        if (user.role !== 'master_admin') {
            query = query.eq('institution_id', user.institution_id);
        }

        // Parent Logic: If role is parent, ensure they can only fetch linked students
        if (user.role === 'parent') {
            // 1. Get Parent ID
            const { data: parent } = await supabase.from('parents').select('id').eq('user_id', user.id).single();
            if (!parent) return res.status(404).json({ success: false, message: "Parent profile not found" });

            // 2. Get all linked student IDs for this parent
            const { data: links } = await supabase.from('parent_students').select('student_id').eq('parent_id', parent.id);
            const linkedIds = (links || []).map(l => l.student_id);

            if (studentId) {
                if (!linkedIds.includes(studentId)) {
                    return res.status(403).json({ success: false, message: "Access denied: Student not linked to this parent" });
                }
                query = query.eq('student_id', studentId).eq('status', 'published');
            } else {
                // Return all reports for all linked students
                query = query.in('student_id', linkedIds).eq('status', 'published');
            }
        } else if (user.role === 'student') {
            // Get student ID
            const { data: student } = await supabase.from('students').select('id').eq('user_id', user.id).single();
            if (!student) return res.status(404).json({ success: false, message: "Student profile not found" });

            if (studentId && studentId !== student.id) {
                return res.status(403).json({ success: false, message: "Access denied: You can only view your own reports" });
            }
            query = query.eq('student_id', student.id).eq('status', 'published');
        } else if (studentId) {
            // Non-parent/student role (admin/teacher) requesting studentId
            query = query.eq('student_id', studentId);
        }

        if (term) query = query.eq('term', term);
        if (academicYear) query = query.eq('academic_year', academicYear);

        const { data, error } = await query;
        if (error) throw error;

        res.json({ success: true, data });
    } catch (error) {
        console.error('Error in getReports:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Get a single report by ID.
 */
exports.getReportById = async (req, res) => {
    try {
        const { id } = req.params;
        const user = req.user;

        const { data, error } = await supabase
            .from('academic_reports')
            .select('*')
            .eq('id', id)
            .eq('institution_id', user.institution_id)
            .single();

        if (error) throw error;
        if (!data) return res.status(404).json({ success: false, message: "Report not found" });

        // Scoping checks for Student and Parent
        if (user.role === 'student') {
            const { data: student } = await supabase.from('students').select('id').eq('user_id', user.id).single();
            if (!student || data.student_id !== student.id) {
                return res.status(403).json({ success: false, message: "Access denied" });
            }
            if (data.status !== 'published') {
                return res.status(403).json({ success: false, message: "Report is not yet published" });
            }
        } else if (user.role === 'parent') {
            const { data: parent } = await supabase.from('parents').select('id').eq('user_id', user.id).single();
            if (!parent) return res.status(404).json({ success: false, message: "Parent profile not found" });

            const { data: link } = await supabase
                .from('parent_students')
                .select('id')
                .eq('parent_id', parent.id)
                .eq('student_id', data.student_id)
                .maybeSingle();

            if (!link) {
                return res.status(403).json({ success: false, message: "Access denied: Student not linked to parent" });
            }
            if (data.status !== 'published') {
                return res.status(403).json({ success: false, message: "Report is not yet published" });
            }
        }

        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Create a new report (Admin/Teacher only).
 */
exports.createReport = async (req, res) => {
    try {
        const { studentId, term, academicYear, reportType, data, status } = req.body;
        const user = req.user;

        if (!['admin', 'teacher', 'master_admin'].includes(user.role)) {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }

        // Teachers: scope to their assigned class+subject
        if (user.role === 'teacher') {
            const teacher = await resolveTeacher(user.id, user.institution_id);
            if (!teacher) {
                return res.status(403).json({ success: false, message: 'Teacher profile not found' });
            }

            // Get student's class from class_enrollments
            const { data: studentEnrollment } = await supabase
                .from('class_enrollments')
                .select('class_id')
                .eq('student_id', studentId)
                .maybeSingle();

            if (!studentEnrollment) {
                return res.status(404).json({ success: false, message: 'Student not enrolled in any class' });
            }

            // Check teacher is assigned to at least one subject in that class
            const { data: teacherSubjects } = await supabase
                .from('teacher_subjects')
                .select('id')
                .eq('teacher_id', teacher.id);

            const teacherSubjectIds = (teacherSubjects || []).map(ts => ts.id);
            if (teacherSubjectIds.length === 0) {
                return res.status(403).json({ success: false, message: 'No subject assignments found' });
            }

            const { data: classSubjects } = await supabase
                .from('subjects')
                .select('id')
                .eq('class_id', studentEnrollment.class_id)
                .in('id', teacherSubjectIds);

            if (!classSubjects || classSubjects.length === 0) {
                return res.status(403).json({ success: false, message: 'Not authorized to create reports for students in this class' });
            }
        }

        const { data: report, error } = await supabase
            .from('academic_reports')
            .insert({
                student_id: studentId,
                institution_id: user.institution_id,
                term,
                academic_year: academicYear,
                report_type: reportType,
                data: data || {},
                status: status || 'draft',
                created_by: user.id
            })
            .select()
            .single();

        if (error) throw error;
        res.json({ success: true, data: report });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Update an existing report.
 */
exports.updateReport = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;
        const user = req.user;

        if (!['admin', 'teacher', 'master_admin'].includes(user.role)) {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }

        // Teachers: scope to their assigned class+subject
        if (user.role === 'teacher') {
            const teacher = await resolveTeacher(user.id, user.institution_id);
            if (!teacher) {
                return res.status(403).json({ success: false, message: 'Teacher profile not found' });
            }

            // Fetch the report to get student_id
            const { data: report } = await supabase
                .from('academic_reports')
                .select('student_id')
                .eq('id', id)
                .eq('institution_id', user.institution_id)
                .maybeSingle();

            if (!report) {
                return res.status(404).json({ success: false, message: 'Report not found' });
            }

            // Get student's class from class_enrollments
            const { data: studentEnrollment } = await supabase
                .from('class_enrollments')
                .select('class_id')
                .eq('student_id', report.student_id)
                .maybeSingle();

            if (!studentEnrollment) {
                return res.status(404).json({ success: false, message: 'Student not enrolled in any class' });
            }

            // Check teacher is assigned to at least one subject in that class
            const { data: teacherSubjects } = await supabase
                .from('teacher_subjects')
                .select('id')
                .eq('teacher_id', teacher.id);

            const teacherSubjectIds = (teacherSubjects || []).map(ts => ts.id);
            if (teacherSubjectIds.length === 0) {
                return res.status(403).json({ success: false, message: 'No subject assignments found' });
            }

            const { data: classSubjects } = await supabase
                .from('subjects')
                .select('id')
                .eq('class_id', studentEnrollment.class_id)
                .in('id', teacherSubjectIds);

            if (!classSubjects || classSubjects.length === 0) {
                return res.status(403).json({ success: false, message: 'Not authorized to update reports for students in this class' });
            }
        }

        const { data, error } = await supabase
            .from('academic_reports')
            .update({
                ...updateData,
                updated_at: new Date()
            })
            .eq('id', id)
            .eq('institution_id', user.institution_id)
            .select()
            .single();

        if (error) throw error;
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Delete a report.
 */
exports.deleteReport = async (req, res) => {
    try {
        const { id } = req.params;
        const user = req.user;

        if (!['admin', 'teacher', 'master_admin'].includes(user.role)) {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }

        // Teachers: scope to their assigned class+subject
        if (user.role === 'teacher') {
            const teacher = await resolveTeacher(user.id, user.institution_id);
            if (!teacher) {
                return res.status(403).json({ success: false, message: 'Teacher profile not found' });
            }

            const { data: report } = await supabase
                .from('academic_reports')
                .select('student_id')
                .eq('id', id)
                .eq('institution_id', user.institution_id)
                .maybeSingle();

            if (!report) {
                return res.status(404).json({ success: false, message: 'Report not found' });
            }

            const { data: studentEnrollment } = await supabase
                .from('class_enrollments')
                .select('class_id')
                .eq('student_id', report.student_id)
                .maybeSingle();

            if (!studentEnrollment) {
                return res.status(404).json({ success: false, message: 'Student not enrolled in any class' });
            }

            const { data: teacherSubjects } = await supabase
                .from('teacher_subjects')
                .select('id')
                .eq('teacher_id', teacher.id);

            const teacherSubjectIds = (teacherSubjects || []).map(ts => ts.id);
            if (teacherSubjectIds.length === 0) {
                return res.status(403).json({ success: false, message: 'No subject assignments found' });
            }

            const { data: classSubjects } = await supabase
                .from('subjects')
                .select('id')
                .eq('class_id', studentEnrollment.class_id)
                .in('id', teacherSubjectIds);

            if (!classSubjects || classSubjects.length === 0) {
                return res.status(403).json({ success: false, message: 'Not authorized to delete reports for students in this class' });
            }
        }

        const { error } = await supabase
            .from('academic_reports')
            .delete()
            .eq('id', id)
            .eq('institution_id', user.institution_id);

        if (error) throw error;
        res.json({ success: true, message: 'Report deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
