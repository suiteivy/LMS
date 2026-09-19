const supabase = require('../utils/supabaseClient.js');
const {
  getReportConfiguration,
  compileTermTranscript,
  compileYearTranscript,
  compileOverallTranscript,
} = require('../services/transcriptCalculation.service.js');
const { compilePdfBuffer } = require('../services/pdfCompiler.service.js');
const { resolveTeacherScope } = require('../middleware/teacherScope.js');

/**
 * Validates and resolves authorized student_id for the requesting user.
 */
async function resolveAuthorizedStudentId(req, requestedStudentId) {
  const { role, id: user_id, institution_id } = req.user || {};

  if (role === 'student') {
    const { data: stud } = await supabase
      .from('students')
      .select('id')
      .eq('user_id', user_id)
      .eq('institution_id', institution_id)
      .maybeSingle();

    if (!stud) throw { status: 404, message: 'Student profile not found' };
    if (requestedStudentId && requestedStudentId !== stud.id) {
      throw { status: 403, message: 'Access denied: You can only view your own academic records' };
    }
    return stud.id;
  }

  if (role === 'parent') {
    const { data: parent } = await supabase
      .from('parents')
      .select('id')
      .eq('user_id', user_id)
      .eq('institution_id', institution_id)
      .maybeSingle();

    if (!parent) throw { status: 404, message: 'Parent profile not found' };

    const { data: links } = await supabase
      .from('parent_students')
      .select('student_id')
      .eq('parent_id', parent.id);

    const childIds = (links || []).map((l) => l.student_id);
    if (childIds.length === 0) {
      throw { status: 403, message: 'No linked children found for this account' };
    }

    if (!requestedStudentId) {
      return childIds[0]; // default to first child
    }

    if (!childIds.includes(requestedStudentId)) {
      throw { status: 403, message: 'Access denied: Selected student is not linked to your parent account' };
    }

    return requestedStudentId;
  }

  if (role === 'teacher') {
    if (!requestedStudentId) throw { status: 400, message: 'student_id is required for teacher lookup' };

    const reqRoleMode = req.headers['x-teacher-role-mode'] || req.query?.role_mode;
    const scope = await resolveTeacherScope(user_id, institution_id, reqRoleMode);

    if (!scope) throw { status: 403, message: 'Teacher scope not resolved' };

    // Check class teacher or subject teacher association
    const { data: student } = await supabase
      .from('students')
      .select('id, class_id')
      .eq('id', requestedStudentId)
      .eq('institution_id', institution_id)
      .maybeSingle();

    if (!student) throw { status: 404, message: 'Student not found in this institution' };

    const isClassTeacher = student.class_id && scope.classTeacherClassIds?.includes(student.class_id);
    if (isClassTeacher) return requestedStudentId;

    // Check subject teacher enrollment
    const { data: enroll } = await supabase
      .from('enrollments')
      .select('id')
      .eq('student_id', requestedStudentId)
      .in('subject_id', scope.taughtSubjectIds || [])
      .eq('status', 'enrolled')
      .maybeSingle();

    if (!enroll) {
      throw { status: 403, message: 'Access denied: You do not teach this student' };
    }

    return requestedStudentId;
  }

  if (role === 'admin' || role === 'master_admin') {
    if (!requestedStudentId) throw { status: 400, message: 'student_id is required' };

    const { data: student } = await supabase
      .from('students')
      .select('id')
      .eq('id', requestedStudentId)
      .eq('institution_id', institution_id)
      .maybeSingle();

    if (!student) throw { status: 404, message: 'Student not found in your institution' };
    return requestedStudentId;
  }

  throw { status: 403, message: 'Unauthorized role' };
}

/**
 * GET /api/transcripts/configurations
 * Gets configuration for term, year, and overall reports.
 */
exports.getConfigurations = async (req, res) => {
  try {
    const institutionId = req.user?.institution_id;
    if (!institutionId) return res.status(400).json({ success: false, error: 'Institution not found' });

    const classifications = ['term', 'year', 'overall'];
    const configs = await Promise.all(
      classifications.map((c) => getReportConfiguration(institutionId, c))
    );

    return res.json({
      success: true,
      data: {
        term: configs[0],
        year: configs[1],
        overall: configs[2],
      },
    });
  } catch (error) {
    console.error('getConfigurations error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * PUT /api/transcripts/configurations/:classification
 * Updates configuration for a classification. Admin only.
 */
exports.updateConfiguration = async (req, res) => {
  try {
    const institutionId = req.user?.institution_id;
    const role = req.user?.role;
    const { classification } = req.params;

    if (!['admin', 'master_admin'].includes(role)) {
      return res.status(403).json({ success: false, error: 'Only administrators can modify transcript configurations' });
    }

    if (!['term', 'year', 'overall'].includes(classification)) {
      return res.status(400).json({ success: false, error: 'Invalid classification. Must be term, year, or overall' });
    }

    const {
      show_fee_balance,
      show_pending_section,
      show_compulsory_elective,
      show_summary_averages,
      summary_format,
      show_key_legend,
      show_teacher_remarks,
      show_attendance,
      overall_layout_mode,
    } = req.body;

    const payload = {
      institution_id: institutionId,
      report_classification: classification,
      updated_at: new Date().toISOString(),
    };

    if (show_fee_balance !== undefined) payload.show_fee_balance = Boolean(show_fee_balance);
    if (show_pending_section !== undefined) payload.show_pending_section = Boolean(show_pending_section);
    if (show_compulsory_elective !== undefined) payload.show_compulsory_elective = Boolean(show_compulsory_elective);
    if (show_summary_averages !== undefined) payload.show_summary_averages = Boolean(show_summary_averages);
    if (summary_format !== undefined) payload.summary_format = summary_format;
    if (show_key_legend !== undefined) payload.show_key_legend = Boolean(show_key_legend);
    if (show_teacher_remarks !== undefined) payload.show_teacher_remarks = Boolean(show_teacher_remarks);
    if (show_attendance !== undefined) payload.show_attendance = Boolean(show_attendance);
    if (overall_layout_mode !== undefined) payload.overall_layout_mode = overall_layout_mode;

    const { data, error } = await supabase
      .from('academic_report_configurations')
      .upsert(payload, { onConflict: 'institution_id,report_classification' })
      .select()
      .single();

    if (error) throw error;

    return res.json({
      success: true,
      message: `${classification.toUpperCase()} report configuration updated successfully`,
      data,
    });
  } catch (error) {
    console.error('updateConfiguration error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * GET /api/transcripts/periods
 * Returns available academic years and terms for a student.
 */
exports.getAvailablePeriods = async (req, res) => {
  try {
    const institutionId = req.user?.institution_id;
    const requestedStudentId = req.query.student_id;
    const studentId = await resolveAuthorizedStudentId(req, requestedStudentId);

    // Fetch all academic years with terms
    const { data: years, error: yErr } = await supabase
      .from('academic_years')
      .select(`
        id,
        name,
        start_date,
        end_date,
        is_current,
        terms (id, name, start_date, end_date, is_current)
      `)
      .eq('institution_id', institutionId)
      .order('start_date', { ascending: false });

    if (yErr) throw yErr;

    // Sort terms within each year
    const structuredYears = (years || []).map((y) => ({
      ...y,
      terms: (y.terms || []).sort((a, b) => new Date(a.start_date || 0) - new Date(b.start_date || 0)),
    }));

    return res.json({
      success: true,
      data: {
        student_id: studentId,
        academic_years: structuredYears,
      },
    });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({ success: false, error: error.message || String(error) });
  }
};

/**
 * GET /api/transcripts/data
 * Generates and returns structured transcript data.
 */
exports.getTranscriptData = async (req, res) => {
  try {
    const institutionId = req.user?.institution_id;
    const { classification = 'term', period_id, class_id } = req.query;
    const requestedStudentId = req.query.student_id;

    const studentId = await resolveAuthorizedStudentId(req, requestedStudentId);

    let payload;
    if (classification === 'term') {
      if (!period_id) return res.status(400).json({ success: false, error: 'period_id (term_id) is required for term classification' });
      payload = await compileTermTranscript(studentId, period_id, institutionId, class_id);
    } else if (classification === 'year') {
      if (!period_id) return res.status(400).json({ success: false, error: 'period_id (academic_year_id) is required for year classification' });
      payload = await compileYearTranscript(studentId, period_id, institutionId, class_id);
    } else if (classification === 'overall') {
      payload = await compileOverallTranscript(studentId, institutionId, class_id);
    } else {
      return res.status(400).json({ success: false, error: 'Invalid classification. Must be term, year, or overall' });
    }

    return res.json({ success: true, data: payload });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({ success: false, error: error.message || String(error) });
  }
};

/**
 * POST /api/transcripts/compile-pdf
 * Compiles high-fidelity vector PDF for the transcript.
 */
exports.compileTranscriptPdf = async (req, res) => {
  try {
    const institutionId = req.user?.institution_id;
    const { classification = 'term', period_id, class_id, student_id } = req.body;
    const studentId = await resolveAuthorizedStudentId(req, student_id);

    let data;
    if (classification === 'term') {
      if (!period_id) return res.status(400).json({ success: false, error: 'period_id (term_id) is required' });
      data = await compileTermTranscript(studentId, period_id, institutionId, class_id);
    } else if (classification === 'year') {
      if (!period_id) return res.status(400).json({ success: false, error: 'period_id (academic_year_id) is required' });
      data = await compileYearTranscript(studentId, period_id, institutionId, class_id);
    } else if (classification === 'overall') {
      data = await compileOverallTranscript(studentId, institutionId, class_id);
    } else {
      return res.status(400).json({ success: false, error: 'Invalid classification' });
    }

    // Compile vector PDF buffer
    const pdfBuffer = await compilePdfBuffer({
      document_type: 'academic_transcript',
      data,
    });

    // Log download audit entry asynchronously
    supabase
      .from('academic_report_downloads')
      .insert({
        institution_id: institutionId,
        student_id: studentId,
        user_id: req.user?.id || null,
        classification,
        period_identifier: period_id || 'overall-current',
      })
      .then(() => {})
      .catch((e) => console.warn('Audit download log failed:', e.message));

    const cleanTitle = (data.period_title || `${classification}-report`)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-');
    const filename = `transcript-${classification}-${cleanTitle}-${studentId}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    return res.end(pdfBuffer);
  } catch (error) {
    console.error('compileTranscriptPdf error:', error);
    const status = error.status || 500;
    return res.status(status).json({ success: false, error: error.message || String(error) });
  }
};

/**
 * POST /api/transcripts/compile-base64
 * Compiles vector PDF and returns base64 string for in-app preview modal.
 */
exports.compileTranscriptPdfBase64 = async (req, res) => {
  try {
    const institutionId = req.user?.institution_id;
    const { classification = 'term', period_id, class_id, student_id } = req.body;
    const studentId = await resolveAuthorizedStudentId(req, student_id);

    let data;
    if (classification === 'term') {
      if (!period_id) return res.status(400).json({ success: false, error: 'period_id (term_id) is required' });
      data = await compileTermTranscript(studentId, period_id, institutionId, class_id);
    } else if (classification === 'year') {
      if (!period_id) return res.status(400).json({ success: false, error: 'period_id (academic_year_id) is required' });
      data = await compileYearTranscript(studentId, period_id, institutionId, class_id);
    } else if (classification === 'overall') {
      data = await compileOverallTranscript(studentId, institutionId, class_id);
    } else {
      return res.status(400).json({ success: false, error: 'Invalid classification' });
    }

    const pdfBuffer = await compilePdfBuffer({
      document_type: 'academic_transcript',
      data,
    });

    const b64 = pdfBuffer.toString('base64');
    return res.json({
      success: true,
      data: {
        base64: b64,
        size_bytes: pdfBuffer.length,
        mime_type: 'application/pdf',
        transcript_data: data,
      },
    });
  } catch (error) {
    console.error('compileTranscriptPdfBase64 error:', error);
    const status = error.status || 500;
    return res.status(status).json({ success: false, error: error.message || String(error) });
  }
};
