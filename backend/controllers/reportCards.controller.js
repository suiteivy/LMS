const supabase = require('../utils/supabaseClient.js');
const { isTermLocked } = require('../utils/resolveActiveTerm');
const { buildClassLabel } = require('../utils/classLabel');
const {
  calculateStudentGPA,
  calculateClassRankings,
  generateReportCard,
  generateAllReportCards,
  checkGradeCompleteness,
} = require('../services/gradeCalculation.service');

const isMissingColumnError = (error, columnName) => {
  const message = error?.message || '';
  return /column/i.test(message) && message.includes(columnName);
};

const mapReportCardForClient = (rc, studentInfo, classInfo, termInfo, items) => {
  const firstName = studentInfo?.users?.first_name || '';
  const lastName = studentInfo?.users?.last_name || '';
  const studentName = `${firstName} ${lastName}`.trim() || rc.student_id || 'Unknown Student';
  const isCBC = (rc.curriculum_type || 'cbc') === 'cbc' || Boolean(classInfo?.cbc_band);

  return {
    id: rc.id,
    student_id: rc.student_id,
    student_name: studentName,
    admission_number: studentInfo?.id || null,
    class_id: rc.class_id,
    class_name: buildClassLabel(classInfo) || 'Class',
    term_id: rc.term_id,
    term_name: termInfo?.name || null,
    status: rc.status,
    curriculum_type: isCBC ? 'cbc' : (rc.curriculum_type || 'standard'),
    learner_development: rc.learner_development || [],
    overall_average: rc.average_percentage ?? null,
    gpa: isCBC ? null : (rc.gpa ?? null),
    class_rank: isCBC ? null : (rc.rank_in_class ?? null),
    total_students: rc.total_students_in_class ?? null,
    teacher_remarks: rc.teacher_remarks || null,
    admin_remarks: rc.admin_remarks || null,
    subject_breakdown: (items || []).map((item) => ({
      subject_name: item.subject_name || item.subjects?.title || 'Subject',
      score: item.total_score ?? null,
      max_score: 100,
      grade: item.letter_grade || null,
    })),
    created_at: rc.created_at,
    updated_at: rc.updated_at,
  };
};

const assertTermWritable = async (res, institution_id, term_id) => {
  if (!term_id) return true;
  try {
    const locked = await isTermLocked(institution_id, term_id);
    if (locked) {
      res.status(409).json({ success: false, error: 'This term is locked. Report card modifications are not allowed.' });
      return false;
    }
    return true;
  } catch (_error) {
    res.status(500).json({ success: false, error: 'Unable to verify term lock state' });
    return false;
  }
};

// 1. List report cards with filters
const getReportCards = async (req, res) => {
  try {
    const { class_id, term_id, student_id, status } = req.query;
    const user_id = req.user?.id;
    const institution_id = req.user?.institution_id;
    const role = req.user?.role;

    // Use simple select first — complex nested JOINs can silently drop rows
    let query = supabase
      .from('report_cards')
      .select('*')
      .eq('institution_id', institution_id);

    if (class_id) query = query.eq('class_id', class_id);
    if (term_id) query = query.eq('term_id', term_id);
    if (status) query = query.eq('status', status);

    if (role === 'student') {
      const { data: student } = await supabase
        .from('students')
        .select('id')
        .eq('user_id', user_id)
        .eq('institution_id', institution_id)
        .single();

      if (!student) {
        return res.json({ success: true, data: [] });
      }
      query = query.eq('student_id', student.id);
    } else if (role === 'parent') {
      const { data: parent } = await supabase
        .from('parents')
        .select('id')
        .eq('user_id', user_id)
        .eq('institution_id', institution_id)
        .maybeSingle();

      if (!parent?.id) {
        return res.json({ success: true, data: [] });
      }

      const { data: children } = await supabase
        .from('parent_students')
        .select('student_id')
        .eq('parent_id', parent.id);

      const childIds = children?.map((c) => c.student_id) || [];
      if (childIds.length === 0) {
        return res.json({ success: true, data: [] });
      }
      query = query.in('student_id', childIds);
      // Parents only see records intentionally released to guardians
      query = query.eq('status', 'released');
    } else if (student_id) {
      query = query.eq('student_id', student_id);
    }

    // Students only see records intentionally released to learners
    if (role === 'student') {
      query = query.eq('status', 'released');
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;

    // Enrich with related data using separate queries
    const enriched = [];
    for (const rc of (data || [])) {
      let studentInfo = null;
      let classInfo = null;
      let termInfo = null;
      let items = [];

      if (rc.student_id) {
        const { data: s } = await supabase
          .from('students')
          .select('id, user_id, users(first_name, last_name)')
          .eq('id', rc.student_id)
          .single();
        studentInfo = s;
      }

      if (rc.class_id) {
        const { data: c } = await supabase
          .from('classes')
          .select('grade_level, form_level, stream')
          .eq('id', rc.class_id)
          .single();
        classInfo = c;
      }

      if (rc.term_id) {
        const { data: t } = await supabase
          .from('terms')
          .select('name')
          .eq('id', rc.term_id)
          .single();
        termInfo = t;
      }

      const { data: rcItems } = await supabase
        .from('report_card_items')
        .select('*, subjects(title)')
        .eq('report_card_id', rc.id);
      items = rcItems || [];

      enriched.push(mapReportCardForClient(rc, studentInfo, classInfo, termInfo, items));
    }

    const sorted = enriched.sort((a, b) => {
      return (a.student_name || '').localeCompare(b.student_name || '');
    });

    return res.json({ success: true, data: sorted });
  } catch (error) {
    console.error('getReportCards error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// 2. Get single report card
const getReportCard = async (req, res) => {
  try {
    const { id } = req.params;
    const institution_id = req.user?.institution_id;

    const { data, error } = await supabase
      .from('report_cards')
      .select(`
        *,
        students (id, user_id, users (first_name, last_name, date_of_birth, gender)),
        classes (grade_level, form_level, stream),
        terms (name, academic_year, start_date, end_date),
        report_card_items (
          *,
          subjects (title)
        )
      `)
      .eq('id', id)
      .eq('institution_id', institution_id)
      .single();

    if (error || !data) {
      return res.status(404).json({ success: false, error: 'Report card not found' });
    }

    const { data: rankings, error: rankError } = await supabase
      .from('class_rankings')
      .select('*')
      .eq('report_card_id', id)
      .maybeSingle();

    if (rankError) console.error('Rankings fetch error:', rankError);

    if (req.user?.role === 'student' && data.status !== 'released') {
      return res.status(403).json({ success: false, error: 'Report card is not yet released' });
    }

    if (req.user?.role === 'parent') {
      const { data: parent } = await supabase
        .from('parents')
        .select('id')
        .eq('user_id', req.user?.id)
        .eq('institution_id', institution_id)
        .maybeSingle();

      if (!parent?.id) {
        return res.status(403).json({ success: false, error: 'Parent profile not found' });
      }

      const { data: link } = await supabase
        .from('parent_students')
        .select('id')
        .eq('parent_id', parent.id)
        .eq('student_id', data.student_id)
        .maybeSingle();

      if (!link) {
        return res.status(403).json({ success: false, error: 'Access denied for this student' });
      }

      if (data.status !== 'released') {
        return res.status(403).json({ success: false, error: 'Report card is not yet released' });
      }
    }

    const result = { ...data, class_rankings: rankings || null };

    return res.json({ success: true, data: result });
  } catch (error) {
    console.error('getReportCard error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// 3. Generate/regenerate a student report card
const generateStudentReportCard = async (req, res) => {
  try {
    const { student_id, class_id, term_id } = req.body;
    const institution_id = req.user?.institution_id;

    if (!student_id || !class_id || !term_id) {
      return res.status(400).json({ success: false, error: 'student_id, class_id, and term_id are required' });
    }

    const writable = await assertTermWritable(res, institution_id, term_id);
    if (!writable) return;

    const reportCard = await generateReportCard(student_id, class_id, term_id, institution_id);

    return res.json({ success: true, data: reportCard });
  } catch (error) {
    console.error('generateStudentReportCard error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// 4. Generate report cards for all students in a class
const generateClassReportCards = async (req, res) => {
  try {
    const { class_id, term_id } = req.body;
    const institution_id = req.user?.institution_id;
    const role = req.user?.role;

    if (!['admin', 'master_admin'].includes(role)) {
      return res.status(403).json({ success: false, error: 'Only admin can generate class report cards' });
    }

    if (!class_id || !term_id) {
      return res.status(400).json({ success: false, error: 'class_id and term_id are required' });
    }

    const writable = await assertTermWritable(res, institution_id, term_id);
    if (!writable) return;

    const result = await generateAllReportCards(class_id, term_id, institution_id);

    return res.json({ success: true, data: result });
  } catch (error) {
    console.error('generateClassReportCards error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// 5. Update report card remarks
const updateReportCardRemarks = async (req, res) => {
  try {
    const { id } = req.params;
    const { teacher_remarks, admin_remarks } = req.body;
    const user_id = req.user?.id;
    const role = req.user?.role;
    const institution_id = req.user?.institution_id;

    const { data: existing, error: fetchError } = await supabase
      .from('report_cards')
      .select('*, classes (teacher_id)')
      .eq('id', id)
      .eq('institution_id', institution_id)
      .single();

    if (fetchError || !existing) {
      return res.status(404).json({ success: false, error: 'Report card not found' });
    }

    const writable = await assertTermWritable(res, institution_id, existing.term_id);
    if (!writable) return;

    const updatePayload = {};

    if (admin_remarks !== undefined) {
      if (role !== 'admin') {
        return res.status(403).json({ success: false, error: 'Only admin can update admin remarks' });
      }
      updatePayload.admin_remarks = admin_remarks;
    }

    if (teacher_remarks !== undefined) {
      const classTeacherId = existing.classes?.teacher_id;
      if (role !== 'admin' && classTeacherId !== user_id) {
        return res.status(403).json({ success: false, error: 'Only the class teacher can update teacher remarks' });
      }
      updatePayload.teacher_remarks = teacher_remarks;
    }

    if (req.body.learner_development !== undefined) {
      const classTeacherId = existing.classes?.teacher_id;
      if (role !== 'admin' && classTeacherId !== user_id) {
        return res.status(403).json({ success: false, error: 'Only the class teacher or admin can update learner development competencies' });
      }
      updatePayload.learner_development = req.body.learner_development;
    }

    if (Object.keys(updatePayload).length === 0) {
      return res.status(400).json({ success: false, error: 'No fields to update' });
    }

    updatePayload.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('report_cards')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return res.json({ success: true, data });
  } catch (error) {
    console.error('updateReportCardRemarks error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// 6. Publish a report card
const publishReportCard = async (req, res) => {
  try {
    const { id } = req.params;
    const user_id = req.user?.id;
    const role = req.user?.role;
    const institution_id = req.user?.institution_id;

    if (!['admin', 'master_admin'].includes(role)) {
      return res.status(403).json({ success: false, error: 'Only admin can publish report cards' });
    }

    const { data: existing, error: fetchError } = await supabase
      .from('report_cards')
      .select('*')
      .eq('id', id)
      .eq('institution_id', institution_id)
      .single();

    if (fetchError || !existing) {
      return res.status(404).json({ success: false, error: 'Report card not found' });
    }

    const writable = await assertTermWritable(res, institution_id, existing.term_id);
    if (!writable) return;

    const completeness = await checkGradeCompleteness(existing.class_id, existing.term_id, institution_id);
    const missingGrades = completeness?.missing_grades || completeness?.missing || [];
    const incomplete =
      completeness?.incomplete === true ||
      completeness?.complete === false ||
      missingGrades.length > 0;

    if (incomplete) {
      return res.status(400).json({
        success: false,
        error: 'Cannot publish: grades are incomplete',
        data: {
          missing_grades: missingGrades,
        },
      });
    }

    let { data, error } = await supabase
      .from('report_cards')
      .update({
        status: 'published',
        published_at: new Date().toISOString(),
        published_by: user_id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error && (isMissingColumnError(error, 'published_at') || isMissingColumnError(error, 'published_by'))) {
      const fallback = await supabase
        .from('report_cards')
        .update({
          status: 'published',
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();
      data = fallback.data;
      error = fallback.error;
    }

    if (error) throw error;

    await supabase.from('grade_audit_log').insert({
      action: 'publish',
      entity_type: 'report_card',
      entity_id: id,
      user_id,
      institution_id,
      details: JSON.stringify({ class_id: existing.class_id, term_id: existing.term_id }),
      created_at: new Date().toISOString(),
    });

    return res.json({ success: true, data });
  } catch (error) {
    console.error('publishReportCard error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// 7. Release a report card
const releaseReportCard = async (req, res) => {
  try {
    const { id } = req.params;
    const user_id = req.user?.id;
    const role = req.user?.role;
    const institution_id = req.user?.institution_id;

    if (!['admin', 'master_admin'].includes(role)) {
      return res.status(403).json({ success: false, error: 'Only admin can release report cards' });
    }

    const { data: existing, error: fetchError } = await supabase
      .from('report_cards')
      .select('*')
      .eq('id', id)
      .eq('institution_id', institution_id)
      .single();

    if (fetchError || !existing) {
      return res.status(404).json({ success: false, error: 'Report card not found' });
    }

    const writable = await assertTermWritable(res, institution_id, existing.term_id);
    if (!writable) return;

    if (existing.status !== 'published') {
      return res.status(400).json({ success: false, error: 'Report card must be published before releasing' });
    }

    let { data, error } = await supabase
      .from('report_cards')
      .update({
        status: 'released',
        released_at: new Date().toISOString(),
        released_by: user_id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error && (isMissingColumnError(error, 'released_at') || isMissingColumnError(error, 'released_by'))) {
      const fallback = await supabase
        .from('report_cards')
        .update({
          status: 'released',
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();
      data = fallback.data;
      error = fallback.error;
    }

    if (error) throw error;

    await supabase.from('grade_audit_log').insert({
      action: 'release',
      entity_type: 'report_card',
      entity_id: id,
      user_id,
      institution_id,
      details: JSON.stringify({ class_id: existing.class_id, term_id: existing.term_id }),
      created_at: new Date().toISOString(),
    });

    return res.json({ success: true, data });
  } catch (error) {
    console.error('releaseReportCard error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// 8. Bulk release all published report cards for a class+term
const bulkReleaseReportCards = async (req, res) => {
  try {
    const { class_id, term_id } = req.body;
    const user_id = req.user?.id;
    const role = req.user?.role;
    const institution_id = req.user?.institution_id;

    if (!['admin', 'master_admin'].includes(role)) {
      return res.status(403).json({ success: false, error: 'Only admin can bulk release report cards' });
    }

    if (!class_id || !term_id) {
      return res.status(400).json({ success: false, error: 'class_id and term_id are required' });
    }

    const writable = await assertTermWritable(res, institution_id, term_id);
    if (!writable) return;

    const { data: published, error: fetchError } = await supabase
      .from('report_cards')
      .select('id')
      .eq('class_id', class_id)
      .eq('term_id', term_id)
      .eq('institution_id', institution_id)
      .in('status', ['published', 'pending_review']);

    if (fetchError) throw fetchError;

    if (!published || published.length === 0) {
      return res.json({ success: true, data: { released: 0 } });
    }

    const ids = published.map((rc) => rc.id);
    const now = new Date().toISOString();

    let { error: updateError } = await supabase
      .from('report_cards')
      .update({
        status: 'released',
        released_at: now,
        released_by: user_id,
        updated_at: now,
      })
      .in('id', ids);

    if (updateError && (isMissingColumnError(updateError, 'released_at') || isMissingColumnError(updateError, 'released_by'))) {
      const fallback = await supabase
        .from('report_cards')
        .update({
          status: 'released',
          updated_at: now,
        })
        .in('id', ids);
      updateError = fallback.error;
    }

    if (updateError) throw updateError;

    const auditEntries = ids.map((report_card_id) => ({
      action: 'bulk_release',
      entity_type: 'report_card',
      entity_id: report_card_id,
      user_id,
      institution_id,
      details: JSON.stringify({ class_id, term_id }),
      created_at: now,
    }));

    await supabase.from('grade_audit_log').insert(auditEntries);

    return res.json({ success: true, data: { released: ids.length } });
  } catch (error) {
    console.error('bulkReleaseReportCards error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// 8b. Bulk publish all draft/pending report cards for a class+term
const bulkPublishReportCards = async (req, res) => {
  try {
    const { class_id, term_id } = req.body;
    const user_id = req.user?.id;
    const role = req.user?.role;
    const institution_id = req.user?.institution_id;

    if (!['admin', 'master_admin'].includes(role)) {
      return res.status(403).json({ success: false, error: 'Only admin can bulk publish report cards' });
    }

    if (!class_id || !term_id) {
      return res.status(400).json({ success: false, error: 'class_id and term_id are required' });
    }

    const writable = await assertTermWritable(res, institution_id, term_id);
    if (!writable) return;

    const completeness = await checkGradeCompleteness(class_id, term_id, institution_id);
    const missing = completeness?.missing || [];
    if (missing.length > 0 || completeness?.complete === false) {
      return res.status(400).json({
        success: false,
        error: 'Cannot bulk publish: grades are incomplete',
        data: { missing_grades: missing },
      });
    }

    const { data: publishable, error: fetchError } = await supabase
      .from('report_cards')
      .select('id')
      .eq('class_id', class_id)
      .eq('term_id', term_id)
      .eq('institution_id', institution_id)
      .in('status', ['draft', 'pending_review']);

    if (fetchError) throw fetchError;

    if (!publishable || publishable.length === 0) {
      return res.json({ success: true, data: { published: 0 } });
    }

    const ids = publishable.map((rc) => rc.id);
    const now = new Date().toISOString();

    let { error: updateError } = await supabase
      .from('report_cards')
      .update({
        status: 'published',
        published_at: now,
        published_by: user_id,
        updated_at: now,
      })
      .in('id', ids);

    if (updateError && (isMissingColumnError(updateError, 'published_at') || isMissingColumnError(updateError, 'published_by'))) {
      const fallback = await supabase
        .from('report_cards')
        .update({
          status: 'published',
          updated_at: now,
        })
        .in('id', ids);
      updateError = fallback.error;
    }

    if (updateError) throw updateError;

    const auditEntries = ids.map((report_card_id) => ({
      action: 'publish',
      entity_type: 'report_card',
      entity_id: report_card_id,
      user_id,
      institution_id,
      details: JSON.stringify({ class_id, term_id, bulk: true }),
      created_at: now,
    }));

    await supabase.from('grade_audit_log').insert(auditEntries);

    return res.json({ success: true, data: { published: ids.length } });
  } catch (error) {
    console.error('bulkPublishReportCards error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// 9. Check grade completeness for a class+term
const checkCompleteness = async (req, res) => {
  try {
    const { class_id, term_id } = req.query;
    const institution_id = req.user?.institution_id;

    if (!class_id || !term_id) {
      return res.status(400).json({ success: false, error: 'class_id and term_id are required' });
    }

    const result = await checkGradeCompleteness(class_id, term_id, institution_id);

    return res.json({ success: true, data: result });
  } catch (error) {
    console.error('checkCompleteness error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// 10. Get class-level report card summary
const getReportCardSummary = async (req, res) => {
  try {
    const { class_id, term_id } = req.query;
    const institution_id = req.user?.institution_id;

    if (!class_id || !term_id) {
      return res.status(400).json({ success: false, error: 'class_id and term_id are required' });
    }

    // Count enrolled students for completeness percentage
    const { data: students } = await supabase
      .from('class_enrollments')
      .select('student_id')
      .eq('class_id', class_id)
      .eq('institution_id', institution_id);

    const total_students = students?.length || 0;

    // Count actual report cards from report_cards table
    const { data: reportCards } = await supabase
      .from('report_cards')
      .select('id, status, gpa')
      .eq('class_id', class_id)
      .eq('term_id', term_id)
      .eq('institution_id', institution_id);

    const generated = reportCards?.length || 0;
    const published = reportCards?.filter((rc) => rc.status === 'published').length || 0;
    const released = reportCards?.filter((rc) => rc.status === 'released').length || 0;

    const gpas = (reportCards || [])
      .map((rc) => rc.gpa)
      .filter((gpa) => gpa !== null && gpa !== undefined);

    const average_gpa = gpas.length > 0 ? +(gpas.reduce((sum, g) => sum + g, 0) / gpas.length).toFixed(2) : null;
    const highest_gpa = gpas.length > 0 ? +Math.max(...gpas).toFixed(2) : null;
    const lowest_gpa = gpas.length > 0 ? +Math.min(...gpas).toFixed(2) : null;

    const completeness_percentage = total_students > 0
      ? +((generated / total_students) * 100).toFixed(1)
      : 0;

    return res.json({
      success: true,
      data: {
        total_students,
        generated,
        published,
        released,
        average_gpa,
        highest_gpa,
        lowest_gpa,
        completeness_percentage,
      },
    });
  } catch (error) {
    console.error('getReportCardSummary error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// 11. Export report card as HTML for PDF rendering
const exportReportCardPDF = async (req, res) => {
  try {
    const { report_card_id, student_id, class_id, term_id } = req.query;
    const institution_id = req.user?.institution_id;
    const role = req.user?.role;
    const user_id = req.user?.id;

    let query = supabase
      .from('report_cards')
      .select(`
        *,
        students (id, user_id, users (first_name, last_name, date_of_birth, gender)),
        classes (grade_level, form_level, stream),
        terms (name, academic_year, start_date, end_date),
        report_card_items (
          *,
          subjects (title)
        )
      `)
      .eq('institution_id', institution_id);

    if (report_card_id) {
      query = query.eq('id', report_card_id);
    } else if (student_id && class_id && term_id) {
      query = query
        .eq('student_id', student_id)
        .eq('class_id', class_id)
        .eq('term_id', term_id);
    } else {
      return res.status(400).json({ success: false, error: 'report_card_id OR student_id+class_id+term_id is required' });
    }

    const { data: reportCard, error: rcError } = await query.single();

    if (rcError || !reportCard) {
      return res.status(404).json({ success: false, error: 'Report card not found' });
    }

    if ((role === 'student' || role === 'parent') && reportCard.status !== 'released') {
      return res.status(403).json({ success: false, error: 'Report card is not yet released' });
    }

    if (role === 'student') {
      const { data: me } = await supabase
        .from('students')
        .select('id')
        .eq('user_id', user_id)
        .eq('institution_id', institution_id)
        .maybeSingle();
      if (!me?.id || me.id !== reportCard.student_id) {
        return res.status(403).json({ success: false, error: 'Access denied' });
      }
    }

    if (role === 'parent') {
      const { data: parent } = await supabase
        .from('parents')
        .select('id')
        .eq('user_id', user_id)
        .eq('institution_id', institution_id)
        .maybeSingle();
      if (!parent?.id) {
        return res.status(403).json({ success: false, error: 'Parent profile not found' });
      }
      const { data: link } = await supabase
        .from('parent_students')
        .select('id')
        .eq('parent_id', parent.id)
        .eq('student_id', reportCard.student_id)
        .maybeSingle();
      if (!link) {
        return res.status(403).json({ success: false, error: 'Access denied for this student' });
      }
    }

    const { data: institution } = await supabase
      .from('institutions')
      .select('name, location, phone, email, logo_url')
      .eq('id', institution_id)
      .maybeSingle();

    const items = reportCard.report_card_items || [];
    const student = reportCard.students?.users || reportCard.students || {};
    const classInfo = reportCard.classes || {};
    const className = buildClassLabel(classInfo) || 'N/A';
    const term = reportCard.terms || {};
    const isCBC = (reportCard.curriculum_type || 'cbc') === 'cbc' || Boolean(classInfo?.cbc_band);

    // Fetch CBC Topic-Area assessments if CBC
    let topicEvidenceBySubject = {};
    if (isCBC) {
      try {
        const { data: evidence } = await supabase
          .from('content_evidence_entries')
          .select(`
            subject_id,
            topic_area_id,
            descriptor,
            subject_topic_areas (title)
          `)
          .eq('student_id', reportCard.student_id)
          .eq('institution_id', institution_id);

        if (evidence && evidence.length > 0) {
          const DESCRIPTOR_VALS = { below_expectation: 1, approaching_expectation: 2, meeting_expectation: 3, exceeding_expectation: 4 };
          const DESCRIPTOR_NAMES = { below_expectation: 'Below Expectation', approaching_expectation: 'Approaching Expectation', meeting_expectation: 'Meeting Expectation', exceeding_expectation: 'Exceeding Expectation' };

          // Group by subject and topic area
          const grouped = {};
          evidence.forEach(e => {
            if (!grouped[e.subject_id]) grouped[e.subject_id] = {};
            if (!grouped[e.subject_id][e.topic_area_id]) {
              grouped[e.subject_id][e.topic_area_id] = {
                title: e.subject_topic_areas?.title || 'Topic Area',
                scores: []
              };
            }
            if (DESCRIPTOR_VALS[e.descriptor]) {
              grouped[e.subject_id][e.topic_area_id].scores.push(DESCRIPTOR_VALS[e.descriptor]);
            }
          });

          for (const subId of Object.keys(grouped)) {
            topicEvidenceBySubject[subId] = [];
            for (const areaId of Object.keys(grouped[subId])) {
              const area = grouped[subId][areaId];
              const avg = area.scores.reduce((a, b) => a + b, 0) / area.scores.length;
              let desc = 'Below Expectation';
              let badgeColor = '#EF4444';
              if (avg >= 3.5) { desc = 'Exceeding Expectation'; badgeColor = '#10B981'; }
              else if (avg >= 2.5) { desc = 'Meeting Expectation'; badgeColor = '#3B82F6'; }
              else if (avg >= 1.5) { desc = 'Approaching Expectation'; badgeColor = '#F59E0B'; }
              topicEvidenceBySubject[subId].push({ title: area.title, descriptor: desc, color: badgeColor });
            }
          }
        }
      } catch (evErr) {
        console.error('Error fetching evidence entries for report card:', evErr);
      }
    }

    // Calculate attendance summary for student in this term
    let attendanceSummary = {
      total_days: 0,
      days_present: 0,
      days_absent: 0,
      days_late: 0,
    };

    let attQuery = supabase
      .from('attendance')
      .select('status')
      .eq('student_id', reportCard.student_id)
      .eq('institution_id', institution_id);

    if (term.start_date && term.end_date) {
      attQuery = attQuery.gte('date', term.start_date).lte('date', term.end_date);
    } else if (reportCard.class_id) {
      attQuery = attQuery.eq('class_id', reportCard.class_id);
    }

    const { data: attRows } = await attQuery;
    if (attRows && attRows.length > 0) {
      attendanceSummary.total_days = attRows.length;
      attRows.forEach((r) => {
        if (r.status === 'present') attendanceSummary.days_present++;
        else if (r.status === 'absent') attendanceSummary.days_absent++;
        else if (r.status === 'late') attendanceSummary.days_late++;
      });
    }

    // Fetch dynamic grading scales for the institution
    const { data: dbScales } = await supabase
      .from('grading_scales')
      .select('*')
      .eq('institution_id', institution_id)
      .eq('is_active', true)
      .order('min_score', { ascending: false });

    const gradingScale = (dbScales && dbScales.length > 0)
      ? dbScales.map((s) => ({
          grade: s.letter_grade,
          min: Number(s.min_score),
          max: Number(s.max_score),
          gpa: Number(s.gpa_points || 0),
          desc: s.description || '',
        }))
      : [
          { grade: 'A', min: 80, max: 100, gpa: 4.0, desc: 'Excellent' },
          { grade: 'B', min: 65, max: 79, gpa: 3.0, desc: 'Good' },
          { grade: 'C', min: 50, max: 64, gpa: 2.0, desc: 'Average' },
          { grade: 'D', min: 40, max: 49, gpa: 1.0, desc: 'Pass' },
          { grade: 'E', min: 0, max: 39, gpa: 0.0, desc: 'Fail' },
        ];

    const maxScalePoints = Math.max(...gradingScale.map((g) => g.gpa), 0);
    const pointsColName = maxScalePoints > 5 ? 'Points' : 'GPA Points';

    const subjectRows = items
      .map((item) => {
        const subject = item.subjects || {};
        const subId = item.subject_id || subject.id;
        const topicAreas = (isCBC && subId && topicEvidenceBySubject[subId]) ? topicEvidenceBySubject[subId] : [];

        let rowHtml = `
          <tr style="${isCBC && topicAreas.length > 0 ? 'background:#f0f4f8;font-weight:600;' : ''}">
            <td style="padding:8px 12px;border:1px solid #ddd;font-weight:600;">${item.subject_name || subject.name || 'N/A'}</td>
            <td style="padding:8px 12px;border:1px solid #ddd;text-align:center;">${item.average_percentage != null ? item.average_percentage.toFixed(1) + '%' : (item.total_score != null ? item.total_score : '-')}</td>
            <td style="padding:8px 12px;border:1px solid #ddd;text-align:center;font-weight:600;">${item.letter_grade || '-'}</td>
            <td style="padding:8px 12px;border:1px solid #ddd;text-align:center;">${item.gpa_points != null ? Number(item.gpa_points).toFixed(maxScalePoints > 5 ? 0 : 1) : '-'}</td>
            <td style="padding:8px 12px;border:1px solid #ddd;text-align:center;">${item.teacher_remarks || '-'}</td>
          </tr>`;

        if (isCBC && topicAreas.length > 0) {
          topicAreas.forEach(ta => {
            rowHtml += `
              <tr style="background:#ffffff;">
                <td style="padding:6px 12px 6px 28px;border:1px solid #eee;font-size:12px;color:#444;">&bull; ${ta.title}</td>
                <td colspan="3" style="padding:6px 12px;border:1px solid #eee;text-align:center;">
                  <span style="font-weight:700;color:${ta.color};font-size:12px;">${ta.descriptor}</span>
                </td>
                <td style="padding:6px 12px;border:1px solid #eee;text-align:center;font-size:11px;color:#777;">Competency Verified</td>
              </tr>`;
          });
        }

        return rowHtml;
      })
      .join('');

    const gradingScaleRows = gradingScale
      .map(
        (g) => `
        <tr>
          <td style="padding:4px 8px;border:1px solid #ddd;text-align:center;font-weight:600;">${g.grade}</td>
          <td style="padding:4px 8px;border:1px solid #ddd;text-align:center;">${g.min}% - ${g.max}%</td>
          <td style="padding:4px 8px;border:1px solid #ddd;text-align:center;">${g.gpa.toFixed(maxScalePoints > 5 ? 0 : 1)}</td>
          <td style="padding:4px 8px;border:1px solid #ddd;text-align:center;color:#555;">${g.desc || '-'}</td>
        </tr>`
      )
      .join('');

    const fullName = `${student.first_name || ''} ${student.last_name || ''}`.trim();
    const attendanceRate = attendanceSummary.total_days > 0
      ? ((attendanceSummary.days_present / attendanceSummary.total_days) * 100).toFixed(1)
      : null;

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Report Card - ${fullName}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #333; line-height: 1.5; padding: 20px; }
    .header { text-align: center; border-bottom: 3px solid #1a5276; padding-bottom: 15px; margin-bottom: 20px; }
    .school-name { font-size: 24px; font-weight: 700; color: #1a5276; }
    .school-info { font-size: 12px; color: #666; margin-top: 4px; }
    .report-title { font-size: 18px; font-weight: 600; color: #2c3e50; margin-top: 12px; text-transform: uppercase; letter-spacing: 1px; }
    .student-info { display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 20px; padding: 12px; background: #f8f9fa; border-radius: 6px; border: 1px solid #e9ecef; }
    .info-item { flex: 1 1 200px; }
    .info-label { font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: 0.5px; }
    .info-value { font-size: 14px; font-weight: 600; color: #2c3e50; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px; }
    th { background: #1a5276; color: #fff; padding: 10px 12px; text-align: left; font-weight: 600; }
    td { padding: 8px 12px; border: 1px solid #ddd; }
    tr:nth-child(even) { background: #f8f9fa; }
    .section-title { font-size: 16px; font-weight: 600; color: #1a5276; margin: 20px 0 10px 0; padding-bottom: 4px; border-bottom: 2px solid #e9ecef; }
    .summary-grid { display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 20px; }
    .summary-card { flex: 1 1 140px; padding: 12px; background: #f0f4f8; border-radius: 6px; text-align: center; border: 1px solid #d5dde5; }
    .summary-card .label { font-size: 11px; color: #888; text-transform: uppercase; }
    .summary-card .value { font-size: 20px; font-weight: 700; color: #1a5276; }
    .remarks-box { padding: 12px; background: #fefefe; border: 1px solid #e9ecef; border-radius: 6px; margin-bottom: 12px; }
    .remarks-label { font-size: 12px; font-weight: 600; color: #555; text-transform: uppercase; margin-bottom: 4px; }
    .remarks-text { font-size: 13px; color: #333; }
    .footer { margin-top: 30px; border-top: 2px solid #e9ecef; padding-top: 12px; font-size: 11px; color: #888; text-align: center; }
    .signatures { display: flex; justify-content: space-between; margin-top: 40px; padding-top: 20px; }
    .signature-block { text-align: center; width: 200px; }
    .signature-line { border-top: 1px solid #333; margin-top: 50px; padding-top: 4px; font-size: 12px; font-weight: 600; }
        @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <div class="header">
    ${institution?.logo_url ? `<img src="${institution.logo_url}" alt="School Logo" style="max-height:60px;margin-bottom:8px;" />` : ''}
    <div class="school-name">${institution?.name || 'School Name'}</div>
    <div class="school-info">
      ${institution?.location || institution?.address ? `${institution.location || institution.address}<br/>` : ''}
      ${institution?.phone ? `Phone: ${institution.phone}` : ''}
      ${institution?.phone && institution?.email ? ' | ' : ''}
      ${institution?.email ? `Email: ${institution.email}` : ''}
    </div>
    <div class="report-title">Student Report Card</div>
  </div>

  <div class="student-info">
    <div class="info-item">
      <div class="info-label">Student Name</div>
      <div class="info-value">${fullName}</div>
    </div>
    <div class="info-item">
      <div class="info-label">Admission No.</div>
      <div class="info-value">${reportCard.students?.id || 'N/A'}</div>
    </div>
    <div class="info-item">
      <div class="info-label">Class</div>
      <div class="info-value">${className}</div>
    </div>
    <div class="info-item">
      <div class="info-label">Term</div>
      <div class="info-value">${term.name || 'N/A'} (${term.academic_year || ''})</div>
    </div>
    <div class="info-item">
      <div class="info-label">Date of Birth</div>
      <div class="info-value">${student.date_of_birth ? new Date(student.date_of_birth).toLocaleDateString() : 'N/A'}</div>
    </div>
    <div class="info-item">
      <div class="info-label">Gender</div>
      <div class="info-value">${student.gender || 'N/A'}</div>
    </div>
  </div>

  <div class="section-title">Academic Performance</div>
  <table>
    <thead>
      <tr>
        <th>Subject</th>
        <th style="text-align:center;">Score</th>
        <th style="text-align:center;">Grade</th>
        <th style="text-align:center;">${pointsColName}</th>
        <th>Remarks</th>
      </tr>
    </thead>
    <tbody>
      ${subjectRows || '<tr><td colspan="5" style="text-align:center;padding:12px;">No subject data available</td></tr>'}
    </tbody>
  </table>

  <div class="summary-grid">
    ${isCBC ? `
    <div class="summary-card">
      <div class="label">Curriculum</div>
      <div class="value" style="font-size:15px;color:#10B981;">CBC Native</div>
    </div>
    ` : `
    <div class="summary-card">
      <div class="label">${maxScalePoints > 5 ? 'Mean Grade / Points' : 'Total GPA'}</div>
      <div class="value">${reportCard.mean_grade ? `${reportCard.mean_grade} (${reportCard.gpa != null ? Number(reportCard.gpa).toFixed(maxScalePoints > 5 ? 0 : 2) : '-'})` : (reportCard.gpa != null ? Number(reportCard.gpa).toFixed(2) : 'N/A')}</div>
    </div>
    <div class="summary-card">
      <div class="label">Class Rank</div>
      <div class="value">${reportCard.rank_in_class || 'N/A'}${reportCard.total_students_in_class ? ` / ${reportCard.total_students_in_class}` : ''}</div>
    </div>
    `}
    <div class="summary-card">
      <div class="label">Attendance</div>
      <div class="value">${attendanceRate ? `${attendanceRate}%` : 'N/A'}</div>
    </div>
    <div class="summary-card">
      <div class="label">Days Present</div>
      <div class="value">${attendanceSummary.days_present}</div>
    </div>
    <div class="summary-card">
      <div class="label">Days Absent</div>
      <div class="value">${attendanceSummary.days_absent}</div>
    </div>
  </div>

  ${isCBC ? `
  <div class="section-title">Personal & Social Competencies</div>
  <table>
    <thead>
      <tr>
        <th style="width:40%;">Core Competency Area</th>
        <th style="width:30%;text-align:center;">Evaluation Level</th>
        <th style="width:30%;">Teacher Remarks</th>
      </tr>
    </thead>
    <tbody>
      ${(() => {
        const DEFAULT_COMPETENCIES = [
          { competency: 'Self-Awareness & Self-Management', descriptor: 'meeting_expectation', remarks: 'Shows good responsibility and punctuality.' },
          { competency: 'Social Skills & Communication', descriptor: 'meeting_expectation', remarks: 'Communicates clearly and listens to peers.' },
          { competency: 'Respect & Collaboration', descriptor: 'exceeding_expectation', remarks: 'Exceptional team player and supportive classmate.' },
          { competency: 'Critical Thinking & Problem Solving', descriptor: 'meeting_expectation', remarks: 'Applies concepts logically to new problems.' },
          { competency: 'Citizenship & Community Values', descriptor: 'meeting_expectation', remarks: 'Upholds school values and positive ethics.' },
        ];
        const DESCRIPTOR_MAP = {
          exceeding_expectation: { label: 'Exceeding Expectation', color: '#10B981' },
          meeting_expectation: { label: 'Meeting Expectation', color: '#3B82F6' },
          approaching_expectation: { label: 'Approaching Expectation', color: '#F59E0B' },
          below_expectation: { label: 'Below Expectation', color: '#EF4444' },
        };
        const list = (Array.isArray(reportCard.learner_development) && reportCard.learner_development.length > 0)
          ? reportCard.learner_development
          : DEFAULT_COMPETENCIES;

        return list.map(item => {
          const descInfo = DESCRIPTOR_MAP[item.descriptor] || { label: item.descriptor || 'Meeting Expectation', color: '#3B82F6' };
          return `
            <tr>
              <td style="padding:8px 12px;border:1px solid #ddd;font-weight:600;">${item.competency}</td>
              <td style="padding:8px 12px;border:1px solid #ddd;text-align:center;">
                <span style="font-weight:700;color:${descInfo.color};">${descInfo.label}</span>
              </td>
              <td style="padding:8px 12px;border:1px solid #ddd;font-size:12px;color:#555;">${item.remarks || '-'}</td>
            </tr>`;
        }).join('');
      })()}
    </tbody>
  </table>
  ` : ''}

  ${reportCard.teacher_remarks ? `
  <div class="remarks-box">
    <div class="remarks-label">Class Teacher Remarks</div>
    <div class="remarks-text">${reportCard.teacher_remarks}</div>
  </div>` : ''}

  ${reportCard.admin_remarks ? `
  <div class="remarks-box">
    <div class="remarks-label">Principal / Admin Remarks</div>
    <div class="remarks-text">${reportCard.admin_remarks}</div>
  </div>` : ''}

  <div class="section-title">${isCBC ? 'CBC Competency Descriptors' : 'Grading Scale'}</div>
  ${isCBC ? `
  <table style="width:85%;margin:0 auto;">
    <thead>
      <tr>
        <th style="text-align:left;">Competency Level</th>
        <th style="text-align:center;">Score Range</th>
        <th style="text-align:left;">Assessment Descriptor</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td style="padding:6px 10px;border:1px solid #ddd;font-weight:700;color:#10B981;">Exceeding Expectation</td>
        <td style="padding:6px 10px;border:1px solid #ddd;text-align:center;font-weight:600;">80% – 100%</td>
        <td style="padding:6px 10px;border:1px solid #ddd;color:#555;">Consistently exceeds expected competency indicators with high autonomy.</td>
      </tr>
      <tr>
        <td style="padding:6px 10px;border:1px solid #ddd;font-weight:700;color:#3B82F6;">Meeting Expectation</td>
        <td style="padding:6px 10px;border:1px solid #ddd;text-align:center;font-weight:600;">60% – 79%</td>
        <td style="padding:6px 10px;border:1px solid #ddd;color:#555;">Accurately and independently meets the required curriculum standards.</td>
      </tr>
      <tr>
        <td style="padding:6px 10px;border:1px solid #ddd;font-weight:700;color:#F59E0B;">Approaching Expectation</td>
        <td style="padding:6px 10px;border:1px solid #ddd;text-align:center;font-weight:600;">40% – 59%</td>
        <td style="padding:6px 10px;border:1px solid #ddd;color:#555;">Demonstrates foundational understanding with occasional guidance.</td>
      </tr>
      <tr>
        <td style="padding:6px 10px;border:1px solid #ddd;font-weight:700;color:#EF4444;">Below Expectation</td>
        <td style="padding:6px 10px;border:1px solid #ddd;text-align:center;font-weight:600;">Below 40%</td>
        <td style="padding:6px 10px;border:1px solid #ddd;color:#555;">Requires targeted individualized support and structured remedial intervention.</td>
      </tr>
    </tbody>
  </table>
  ` : `
  <table style="width:75%;margin:0 auto;">
    <thead>
      <tr>
        <th style="text-align:center;">Grade</th>
        <th style="text-align:center;">Percentage Range</th>
        <th style="text-align:center;">${pointsColName}</th>
        <th style="text-align:center;">Standing</th>
      </tr>
    </thead>
    <tbody>
      ${gradingScaleRows}
    </tbody>
  </table>
  `}

  <div class="signatures">
    <div class="signature-block">
      <div class="signature-line">Class Teacher</div>
    </div>
    <div class="signature-block">
      <div class="signature-line">Principal / Admin</div>
    </div>
  </div>

  <div class="footer">
    Generated on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
    &mdash; ${institution?.name || 'School Name'}
  </div>
</body>
</html>`;

    return res.json({
      success: true,
      data: {
        html,
        report_card_id: reportCard.id,
      },
    });
  } catch (error) {
    console.error('exportReportCardPDF error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  getReportCards,
  getReportCard,
  generateStudentReportCard,
  generateClassReportCards,
  updateReportCardRemarks,
  publishReportCard,
  releaseReportCard,
  bulkPublishReportCards,
  bulkReleaseReportCards,
  checkCompleteness,
  getReportCardSummary,
  exportReportCardPDF,
};
