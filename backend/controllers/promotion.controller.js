const supabase = require('../utils/supabaseClient.js');
const { toNumber, buildPromotionDecisions } = require('../services/promotionEligibility.service.js');

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

    const { data: targetClass } = await supabase
      .from('classes')
      .select('id, grade_level, form_level')
      .eq('id', cycle.to_class_id)
      .eq('institution_id', institution_id)
      .single();

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
      // eslint-disable-next-line no-await-in-loop
      const { error: moveError } = await supabase
        .from('class_enrollments')
        .update({ class_id: cycle.to_class_id })
        .eq('student_id', decision.student_id)
        .eq('class_id', cycle.from_class_id)
        .eq('institution_id', institution_id);

      if (moveError) {
        const duplicate = /duplicate key value|unique constraint/i.test(moveError.message || '');
        if (duplicate) {
          // eslint-disable-next-line no-await-in-loop
          await supabase
            .from('class_enrollments')
            .delete()
            .eq('student_id', decision.student_id)
            .eq('class_id', cycle.from_class_id)
            .eq('institution_id', institution_id);
        } else {
          failed += 1;
          // eslint-disable-next-line no-await-in-loop
          await supabase
            .from('promotion_decisions')
            .update({ status: 'failed', reason: moveError.message, updated_at: new Date().toISOString() })
            .eq('id', decision.id);
          // eslint-disable-next-line no-continue
          continue;
        }
      }

      if (targetClass) {
        // eslint-disable-next-line no-await-in-loop
        await supabase
          .from('students')
          .update({
            grade_level: targetClass.grade_level,
            form_level: targetClass.form_level,
            updated_at: new Date().toISOString(),
          })
          .eq('id', decision.student_id)
          .eq('institution_id', institution_id);
      }

      // eslint-disable-next-line no-await-in-loop
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

module.exports = {
  getPromotionCycles,
  createPromotionCycle,
  getCycleDecisions,
  previewPromotionCycle,
  executePromotionCycle,
};
