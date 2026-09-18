const supabase = require('../utils/supabaseClient.js');
const pdfCompilerService = require('../services/pdfCompiler.service');

const ViolationsController = {
  /**
   * Record a new student violation
   * POST /api/violations
   * Role: admin, teacher
   */
  async createViolation(req, res) {
    try {
      const {
        student_id,
        title,
        description,
        severity = 'minor',
        action_taken = 'verbal_warning',
        action_details = {},
        suspension_start_date = null,
        suspension_end_date = null,
      } = req.body;

      const institutionId = req.user.institution_id;
      const recordedBy = req.user.id;

      if (!student_id || !title) {
        return res.status(400).json({
          success: false,
          error: 'student_id and title are required.',
        });
      }

      // Verify student belongs to this institution
      const { data: student, error: studentError } = await supabase
        .from('students')
        .select('id, user_id, class_id, enrollment_status, users(id, full_name, email)')
        .eq('id', student_id)
        .eq('institution_id', institutionId)
        .single();

      if (studentError || !student) {
        return res.status(404).json({
          success: false,
          error: 'Student record not found in this institution.',
        });
      }

      // Insert violation record
      const { data: violation, error: insertError } = await supabase
        .from('student_violations')
        .insert({
          institution_id: institutionId,
          student_id,
          title,
          description: description || null,
          severity,
          action_taken,
          action_details,
          suspension_start_date: suspension_start_date || null,
          suspension_end_date: suspension_end_date || null,
          recorded_by: recordedBy,
          status: 'active',
        })
        .select(`
          *,
          recorded_by_user:users!student_violations_recorded_by_fkey(id, full_name, email, role)
        `)
        .single();

      if (insertError) {
        return res.status(500).json({
          success: false,
          error: insertError.message,
        });
      }

      // AUTO-ACTION: If action_taken is expulsion, update enrollment_status to 'expelled'
      if (action_taken === 'expulsion') {
        const { error: enrollError } = await supabase
          .from('students')
          .update({ enrollment_status: 'expelled' })
          .eq('id', student_id);

        if (enrollError) {
          console.error('Failed to auto-update student enrollment_status to expelled:', enrollError);
        }

        // Deactivate student user login if applicable (parents still retain view)
        if (student.user_id) {
          await supabase
            .from('users')
            .update({ is_active: false })
            .eq('id', student.user_id);
        }
      }

      return res.status(201).json({
        success: true,
        message: 'Student violation recorded successfully.',
        data: violation,
      });
    } catch (err) {
      console.error('Error in createViolation:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  },

  /**
   * List violations for a specific student
   * GET /api/violations/student/:studentId
   */
  async getStudentViolations(req, res) {
    try {
      const { studentId } = req.params;
      const institutionId = req.user.institution_id;

      // Verify student
      const { data: student, error: studentError } = await supabase
        .from('students')
        .select('id, user_id, class_id, enrollment_status, users(id, full_name, email)')
        .eq('id', studentId)
        .eq('institution_id', institutionId)
        .single();

      if (studentError || !student) {
        return res.status(404).json({
          success: false,
          error: 'Student record not found.',
        });
      }

      // Security check: if student role, can only view own
      if (req.user.role === 'student' && student.user_id !== req.user.id) {
        return res.status(403).json({ success: false, error: 'Forbidden. You may only view your own records.' });
      }

      // If parent role, verify linked student
      if (req.user.role === 'parent') {
        const { data: link } = await supabase
          .from('parent_student_links')
          .select('id')
          .eq('parent_id', req.user.id)
          .eq('student_id', studentId)
          .maybeSingle();

        if (!link) {
          return res.status(403).json({ success: false, error: 'Forbidden. This student is not linked to your account.' });
        }
      }

      // Query violations
      const { data: violations, error: violError } = await supabase
        .from('student_violations')
        .select(`
          *,
          recorded_by_user:users!student_violations_recorded_by_fkey(id, full_name, email, role),
          resolved_by_user:users!student_violations_resolved_by_fkey(id, full_name, email, role)
        `)
        .eq('student_id', studentId)
        .eq('institution_id', institutionId)
        .order('created_at', { ascending: false });

      if (violError) {
        return res.status(500).json({ success: false, error: violError.message });
      }

      return res.json({
        success: true,
        data: violations || [],
        student: {
          id: student.id,
          full_name: student.users?.full_name,
          enrollment_status: student.enrollment_status,
        },
      });
    } catch (err) {
      console.error('Error in getStudentViolations:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  },

  /**
   * Get violations for authenticated student
   * GET /api/violations/my
   */
  async getMyViolations(req, res) {
    try {
      const institutionId = req.user.institution_id;
      const userId = req.user.id;

      const { data: student, error: studentError } = await supabase
        .from('students')
        .select('id')
        .eq('user_id', userId)
        .eq('institution_id', institutionId)
        .maybeSingle();

      if (studentError || !student) {
        return res.json({ success: true, data: [] });
      }

      const { data: violations, error: violError } = await supabase
        .from('student_violations')
        .select(`
          *,
          recorded_by_user:users!student_violations_recorded_by_fkey(id, full_name, email, role),
          resolved_by_user:users!student_violations_resolved_by_fkey(id, full_name, email, role)
        `)
        .eq('student_id', student.id)
        .eq('institution_id', institutionId)
        .order('created_at', { ascending: false });

      if (violError) {
        return res.status(500).json({ success: false, error: violError.message });
      }

      return res.json({
        success: true,
        data: violations || [],
      });
    } catch (err) {
      console.error('Error in getMyViolations:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  },

  /**
   * Resolve or update violation status
   * PATCH /api/violations/:id/resolve
   * Role: admin, teacher (only the recording teacher can resolve, or any admin)
   */
  async resolveViolation(req, res) {
    try {
      const { id } = req.params;
      const { status = 'resolved', resolution_notes = '' } = req.body;
      const institutionId = req.user.institution_id;
      const userId = req.user.id;
      const userRole = req.user.role;

      // Get violation
      const { data: violation, error: vError } = await supabase
        .from('student_violations')
        .select('*, students(id, enrollment_status)')
        .eq('id', id)
        .eq('institution_id', institutionId)
        .single();

      if (vError || !violation) {
        return res.status(404).json({ success: false, error: 'Violation record not found.' });
      }

      // Only admin or the original recorder can resolve
      if (userRole !== 'admin' && violation.recorded_by !== userId) {
        return res.status(403).json({
          success: false,
          error: 'Only an administrator or the recording teacher may resolve this violation.',
        });
      }

      const { data: updated, error: uError } = await supabase
        .from('student_violations')
        .update({
          status,
          resolution_notes,
          resolved_at: new Date().toISOString(),
          resolved_by: userId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select(`
          *,
          recorded_by_user:users!student_violations_recorded_by_fkey(id, full_name, email, role),
          resolved_by_user:users!student_violations_resolved_by_fkey(id, full_name, email, role)
        `)
        .single();

      if (uError) {
        return res.status(500).json({ success: false, error: uError.message });
      }

      // If expunged and was expelled, revert enrollment_status to active
      if (status === 'expunged' && violation.action_taken === 'expulsion') {
        await supabase
          .from('students')
          .update({ enrollment_status: 'active' })
          .eq('id', violation.student_id);
      }

      return res.json({
        success: true,
        message: `Violation marked as ${status}.`,
        data: updated,
      });
    } catch (err) {
      console.error('Error in resolveViolation:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  },

  /**
   * Generate Violation Summary PDF
   * GET /api/violations/:id/pdf or GET /api/violations/student/:studentId/summary-pdf
   */
  async getViolationSummaryPdf(req, res) {
    try {
      const { id, studentId } = req.params;
      const institutionId = req.user.institution_id;

      let targetStudentId = studentId;
      let violationRecord = null;

      if (id) {
        const { data: viol, error: vErr } = await supabase
          .from('student_violations')
          .select('*, students(id, user_id, admission_number, class_id, users(full_name, email))')
          .eq('id', id)
          .eq('institution_id', institutionId)
          .single();

        if (vErr || !viol) {
          return res.status(404).json({ success: false, error: 'Violation record not found.' });
        }
        violationRecord = viol;
        targetStudentId = viol.student_id;
      }

      // Fetch student details
      const { data: student } = await supabase
        .from('students')
        .select('*, users(full_name, email), classes(name)')
        .eq('id', targetStudentId)
        .single();

      // Fetch all violations for this student
      const { data: allViolations } = await supabase
        .from('student_violations')
        .select('*, recorded_by_user:users!student_violations_recorded_by_fkey(full_name)')
        .eq('student_id', targetStudentId)
        .eq('institution_id', institutionId)
        .order('created_at', { ascending: false });

      // Fetch institution info
      const { data: inst } = await supabase
        .from('institutions')
        .select('name, address, email, phone')
        .eq('id', institutionId)
        .single();

      const pdfData = {
        institution_name: inst?.name || 'Academic Institution',
        institution_address: inst?.address || '',
        student_id: student?.id,
        student_name: student?.users?.full_name || 'Student',
        admission_number: student?.admission_number || 'N/A',
        class_name: student?.classes?.name || 'Class',
        generated_date: new Date().toLocaleDateString(),
        violations: (allViolations || []).map((v) => ({
          date: new Date(v.created_at).toLocaleDateString(),
          title: v.title,
          severity: v.severity,
          action_taken: v.action_taken,
          status: v.status,
          recorded_by: v.recorded_by_user?.full_name || 'Staff',
          description: v.description || '',
          resolution_notes: v.resolution_notes || '',
        })),
        highlighted_violation: violationRecord ? {
          title: violationRecord.title,
          severity: violationRecord.severity,
          action_taken: violationRecord.action_taken,
          description: violationRecord.description,
          date: new Date(violationRecord.created_at).toLocaleDateString(),
        } : null,
      };

      const pdfBuffer = await pdfCompilerService.compile('violation_summary', pdfData);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="violation-summary-${targetStudentId}.pdf"`);
      return res.send(pdfBuffer);
    } catch (err) {
      console.error('Error generating violation summary PDF:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  },
};

module.exports = ViolationsController;
