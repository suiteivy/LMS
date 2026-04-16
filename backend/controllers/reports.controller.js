const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

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
        } else if (studentId) {
            // Non-parent role (admin/teacher) requesting studentId
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
