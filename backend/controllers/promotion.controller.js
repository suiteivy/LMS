const supabase = require('../utils/supabaseClient.js');
const { toNumber, buildPromotionDecisions } = require('../services/promotionEligibility.service.js');
const { assignStudentToSingleClass } = require('../utils/studentClassEnrollment');
const { buildClassLabel } = require('../utils/classLabel');

const getPromotionCycles = async (req, res) => {
  try {
    const institution_id = req.user?.institution_id;
    const { status } = req.query;

    let query = supabase
      .from('promotion_cycles')
      .select('*')
      .eq('institution_id', institution_id)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) throw error;

    return res.json({ success: true, data: data || [] });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

const createPromotionCycle = async (req, res) => {
  try {
    const institution_id = req.user?.institution_id;
    const created_by = req.user?.id;
    const {
      name,
      term_id,
      from_class_id,
      to_class_id,
      min_average_percentage = 50,
      min_attendance_percentage = 0,
    } = req.body;

    if (!name || !term_id || !from_class_id || !to_class_id) {
      return res.status(400).json({ success: false, error: 'name, term_id, from_class_id and to_class_id are required' });
    }

    if (from_class_id === to_class_id) {
      return res.status(400).json({ success: false, error: 'from_class_id and to_class_id must be different' });
    }

    const { data: cycle, error } = await supabase
      .from('promotion_cycles')
      .insert({
        name,
        term_id,
        from_class_id,
        to_class_id,
        min_average_percentage: toNumber(min_average_percentage, 50),
        min_attendance_percentage: toNumber(min_attendance_percentage, 0),
        status: 'draft',
        created_by,
        institution_id,
      })
      .select('*')
      .single();

    if (error) throw error;

    return res.status(201).json({ success: true, data: cycle });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

const getCycleDecisions = async (req, res) => {
  try {
    const { id } = req.params;
    const institution_id = req.user?.institution_id;

    const { data, error } = await supabase
      .from('promotion_decisions')
      .select('*')
      .eq('cycle_id', id)
      .eq('institution_id', institution_id)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return res.json({ success: true, data: data || [] });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

const previewPromotionCycle = async (req, res) => {
  try {
    const { id } = req.params;
    const institution_id = req.user?.institution_id;
    const { save_decisions = true } = req.body || {};

    const { data: cycle, error: cycleError } = await supabase
      .from('promotion_cycles')
      .select('*')
      .eq('id', id)
      .eq('institution_id', institution_id)
      .single();

    if (cycleError || !cycle) {
      return res.status(404).json({ success: false, error: 'Promotion cycle not found' });
    }

    const { data: enrollments, error: enrollmentError } = await supabase
      .from('class_enrollments')
      .select('id, student_id, students(id, users(first_name, last_name, full_name))')
      .eq('class_id', cycle.from_class_id)
      .eq('institution_id', institution_id);

    if (enrollmentError) throw enrollmentError;

    const studentIds = (enrollments || []).map((e) => e.student_id);
    let reportCards = [];

    if (studentIds.length > 0) {
      const { data: cards, error: cardsError } = await supabase
        .from('report_cards')
        .select('id, student_id, average_percentage, attendance_count, total_school_days, status')
        .eq('class_id', cycle.from_class_id)
        .eq('term_id', cycle.term_id)
        .eq('institution_id', institution_id)
        .in('student_id', studentIds);

      if (cardsError) throw cardsError;
      reportCards = cards || [];
    }

    const decisions = buildPromotionDecisions({
      enrollments,
      reportCards,
      cycleConfig: cycle,
    });

    if (save_decisions) {
      await supabase.from('promotion_decisions').delete().eq('cycle_id', cycle.id).eq('institution_id', institution_id);

      if (decisions.length > 0) {
        const rows = decisions.map((d) => ({
          cycle_id: cycle.id,
          student_id: d.student_id,
          from_class_id: cycle.from_class_id,
          to_class_id: cycle.to_class_id,
          term_id: cycle.term_id,
          report_card_id: d.report_card_id,
          average_percentage: d.average_percentage,
          attendance_percentage: d.attendance_percentage,
          eligible: d.eligible,
          status: d.status,
          reason: d.reason,
          institution_id,
        }));

        const { error: insertError } = await supabase.from('promotion_decisions').insert(rows);
        if (insertError) throw insertError;
      }

      await supabase
        .from('promotion_cycles')
        .update({
          status: 'reviewed',
          previewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', cycle.id)
        .eq('institution_id', institution_id);
    }

    const eligibleCount = decisions.filter((d) => d.eligible).length;
    return res.json({
      success: true,
      data: {
        cycle_id: cycle.id,
        total_students: decisions.length,
        eligible_students: eligibleCount,
        retained_students: decisions.length - eligibleCount,
        decisions,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

const executePromotionCycle = async (req, res) => {
  try {
    const { id } = req.params;
    const institution_id = req.user?.institution_id;
    const executed_by = req.user?.id;

    const { data: cycle, error: cycleError } = await supabase
      .from('promotion_cycles')
      .select('*')
      .eq('id', id)
      .eq('institution_id', institution_id)
      .single();

    if (cycleError || !cycle) {
      return res.status(404).json({ success: false, error: 'Promotion cycle not found' });
    }

    let { data: decisions, error: decisionsError } = await supabase
      .from('promotion_decisions')
      .select('*')
      .eq('cycle_id', cycle.id)
      .eq('institution_id', institution_id)
      .order('created_at', { ascending: true });

    if (decisionsError) throw decisionsError;

    if (!decisions || decisions.length === 0) {
      return res.status(400).json({ success: false, error: 'No decisions found. Preview cycle first.' });
    }

    const eligible = decisions.filter((d) => d.eligible);
    let promoted = 0;
    let failed = 0;

    for (const decision of eligible) {
      try {
        await assignStudentToSingleClass(supabase, {
          studentId: decision.student_id,
          classId: cycle.to_class_id,
          institutionId: institution_id,
          syncStudentLevel: true,
        });

        await supabase
          .from('promotion_decisions')
          .update({
            status: 'promoted',
            promoted_at: new Date().toISOString(),
            promoted_by: executed_by,
            updated_at: new Date().toISOString(),
          })
          .eq('id', decision.id)
          .eq('institution_id', institution_id);

        promoted += 1;
      } catch (err) {
        failed += 1;
        await supabase
          .from('promotion_decisions')
          .update({ status: 'failed', reason: err.message, updated_at: new Date().toISOString() })
          .eq('id', decision.id);
      }
    }

    await supabase
      .from('promotion_cycles')
      .update({
        status: failed > 0 ? 'completed_with_errors' : 'completed',
        executed_at: new Date().toISOString(),
        executed_by,
        updated_at: new Date().toISOString(),
      })
      .eq('id', cycle.id)
      .eq('institution_id', institution_id);

    const retained = decisions.filter((d) => !d.eligible).length;
    return res.json({
      success: true,
      data: {
        cycle_id: cycle.id,
        promoted,
        retained,
        failed,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

const getTargetClassesForLevel = async (req, res) => {
  try {
    const institution_id = req.user?.institution_id;
    let { grade_level, form_level, source_class_id } = req.query;

    if (!grade_level && !form_level && source_class_id) {
      const { data: srcClass } = await supabase
        .from('classes')
        .select('grade_level, form_level')
        .eq('id', source_class_id)
        .eq('institution_id', institution_id)
        .maybeSingle();

      if (srcClass) {
        if (srcClass.grade_level !== null && srcClass.grade_level !== undefined) {
          grade_level = Number(srcClass.grade_level) + 1;
        } else if (srcClass.form_level !== null && srcClass.form_level !== undefined) {
          form_level = Number(srcClass.form_level) + 1;
        }
      }
    }

    let classQuery = supabase
      .from('classes')
      .select('id, grade_level, form_level, stream, capacity, display_name, class_type')
      .eq('institution_id', institution_id);

    if (grade_level !== undefined && grade_level !== null && grade_level !== '') {
      classQuery = classQuery.eq('grade_level', Number(grade_level));
    }
    if (form_level !== undefined && form_level !== null && form_level !== '') {
      classQuery = classQuery.eq('form_level', Number(form_level));
    }

    const { data: classes, error: classErr } = await classQuery;
    if (classErr) throw classErr;

    // Get current enrollment counts
    const enrichedClasses = await Promise.all(
      (classes || []).map(async (cls) => {
        const { count } = await supabase
          .from('class_enrollments')
          .select('id', { count: 'exact', head: true })
          .eq('class_id', cls.id);

        return {
          ...cls,
          name: buildClassLabel(cls),
          current_enrollment: count || 0,
        };
      })
    );

    const isSeniorSecondary = (Number(grade_level) >= 10 || Number(form_level) >= 3);
    let tracks = [];
    if (isSeniorSecondary) {
      const { data: trackData } = await supabase
        .from('academic_tracks')
        .select('*')
        .eq('institution_id', institution_id);
      tracks = trackData || [];
    }

    return res.json({
      success: true,
      data: {
        classes: enrichedClasses,
        has_multiple_classes: enrichedClasses.length > 1,
        is_senior_secondary: isSeniorSecondary,
        tracks,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

const promoteIndividualStudent = async (req, res) => {
  try {
    const institution_id = req.user?.institution_id;
    const executed_by = req.user?.id;
    const {
      student_id,
      to_class_id,
      track_id,
      elective_subject_ids,
      cycle_id,
      reason,
    } = req.body;

    if (!student_id || !to_class_id) {
      return res.status(400).json({ success: false, error: 'student_id and to_class_id are required' });
    }

    // Verify target class
    const { data: targetClass, error: tcErr } = await supabase
      .from('classes')
      .select('id, grade_level, form_level, stream')
      .eq('id', to_class_id)
      .eq('institution_id', institution_id)
      .single();

    if (tcErr || !targetClass) {
      return res.status(404).json({ success: false, error: 'Target class not found' });
    }

    // Assign student with full property inheritance
    const result = await assignStudentToSingleClass(supabase, {
      studentId: student_id,
      classId: to_class_id,
      institutionId: institution_id,
      syncStudentLevel: true,
      trackId: track_id,
      electiveSubjectIds: elective_subject_ids,
    });

    // Record decision if cycle_id provided
    if (cycle_id) {
      await supabase
        .from('promotion_decisions')
        .insert({
          cycle_id,
          student_id,
          to_class_id,
          eligible: true,
          status: 'promoted',
          promoted_at: new Date().toISOString(),
          promoted_by: executed_by,
          reason: reason || 'Individual promotion',
          institution_id,
        });
    }

    return res.json({
      success: true,
      data: {
        student_id,
        to_class_id,
        enrolled_subjects_count: result.enrolledSubjectsCount,
        retired_subjects_count: result.retiredSubjectsCount,
        message: 'Student promoted successfully with all class properties inherited',
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

const promoteClass = async (req, res) => {
  try {
    const institution_id = req.user?.institution_id;
    const {
      from_class_id,
      to_class_id,
      reshuffle = false,
      student_ids,
      track_id,
      elective_subject_ids,
      student_tracks,
    } = req.body;

    if (!from_class_id) {
      return res.status(400).json({ success: false, error: 'from_class_id is required' });
    }

    // 1. Get source class details
    const { data: srcClass, error: srcErr } = await supabase
      .from('classes')
      .select('id, grade_level, form_level, stream')
      .eq('id', from_class_id)
      .eq('institution_id', institution_id)
      .single();

    if (srcErr || !srcClass) {
      return res.status(404).json({ success: false, error: 'Source class not found' });
    }

    // 2. Resolve students to promote
    let candidateStudentIds = student_ids;
    if (!candidateStudentIds || candidateStudentIds.length === 0) {
      const { data: enrollments } = await supabase
        .from('class_enrollments')
        .select('student_id')
        .eq('class_id', from_class_id)
        .eq('institution_id', institution_id);
      candidateStudentIds = (enrollments || []).map((e) => e.student_id);
    }

    if (!candidateStudentIds || candidateStudentIds.length === 0) {
      return res.json({ success: true, promoted: 0, message: 'No students to promote in source class' });
    }

    // 3. Handle reshuffle vs single target class
    const assignments = [];

    if (reshuffle) {
      const targetGrade = srcClass.grade_level !== null && srcClass.grade_level !== undefined ? Number(srcClass.grade_level) + 1 : undefined;
      const targetForm = srcClass.form_level !== null && srcClass.form_level !== undefined ? Number(srcClass.form_level) + 1 : undefined;

      let targetClassQuery = supabase
        .from('classes')
        .select('id, grade_level, form_level, stream, capacity, display_name, class_type')
        .eq('institution_id', institution_id);

      if (targetGrade !== undefined) targetClassQuery = targetClassQuery.eq('grade_level', targetGrade);
      if (targetForm !== undefined) targetClassQuery = targetClassQuery.eq('form_level', targetForm);

      const { data: targetClasses, error: tcErr } = await targetClassQuery;
      if (tcErr) throw tcErr;

      if (!targetClasses || targetClasses.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No target classes exist at the next level for reshuffling',
        });
      }

      if (targetClasses.length === 1) {
        return res.status(400).json({
          success: false,
          error: 'Only one class exists at the target level. Even reshuffling requires multiple destination classes.',
          has_multiple_classes: false,
          single_target_class_id: targetClasses[0].id,
        });
      }

      const classHeadcounts = await Promise.all(
        targetClasses.map(async (cls) => {
          const { count } = await supabase
            .from('class_enrollments')
            .select('id', { count: 'exact', head: true })
            .eq('class_id', cls.id);
          return {
            ...cls,
            current_count: count || 0,
          };
        })
      );

      classHeadcounts.sort((a, b) => a.current_count - b.current_count);

      let cIdx = 0;
      for (const stId of candidateStudentIds) {
        let attempts = 0;
        let assignedClass = null;
        while (attempts < classHeadcounts.length) {
          const cls = classHeadcounts[cIdx % classHeadcounts.length];
          const hasCap = !cls.capacity || cls.current_count < cls.capacity;
          if (hasCap) {
            assignedClass = cls;
            cls.current_count++;
            cIdx++;
            break;
          }
          cIdx++;
          attempts++;
        }

        if (!assignedClass) {
          classHeadcounts.sort((a, b) => a.current_count - b.current_count);
          assignedClass = classHeadcounts[0];
          assignedClass.current_count++;
        }

        assignments.push({
          student_id: stId,
          target_class_id: assignedClass.id,
        });
      }
    } else {
      if (!to_class_id) {
        return res.status(400).json({ success: false, error: 'to_class_id is required when reshuffle is false' });
      }
      for (const stId of candidateStudentIds) {
        assignments.push({
          student_id: stId,
          target_class_id: to_class_id,
        });
      }
    }

    let promoted = 0;
    const errors = [];

    for (const item of assignments) {
      try {
        const studentTrackConfig = (student_tracks && student_tracks[item.student_id]) || {};
        const effectiveTrackId = studentTrackConfig.track_id || track_id;
        const effectiveElectives = studentTrackConfig.elective_subject_ids || elective_subject_ids;

        await assignStudentToSingleClass(supabase, {
          studentId: item.student_id,
          classId: item.target_class_id,
          institutionId: institution_id,
          syncStudentLevel: true,
          trackId: effectiveTrackId,
          electiveSubjectIds: effectiveElectives,
        });
        promoted++;
      } catch (err) {
        errors.push({ student_id: item.student_id, error: err.message });
      }
    }

    return res.json({
      success: true,
      data: {
        promoted_count: promoted,
        failed_count: errors.length,
        errors: errors.length > 0 ? errors : undefined,
        message: `Successfully promoted ${promoted} students with full property inheritance`,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  getPromotionCycles,
  createPromotionCycle,
  getCycleDecisions,
  previewPromotionCycle,
  executePromotionCycle,
  getTargetClassesForLevel,
  promoteIndividualStudent,
  promoteClass,
};
