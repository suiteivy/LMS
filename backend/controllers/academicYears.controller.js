const supabase = require('../utils/supabaseClient.js');
const {
  resolveActiveTerm,
  resolveNextUpcomingTerm,
  validateTermOverlap,
  compareDates,
  getCurrentDateInTimezone,
  isTermLocked,
} = require('../utils/resolveActiveTerm');

const syncCurrentTermFlags = async (institution_id) => {
  const { data: institution } = await supabase
    .from('institutions')
    .select('timezone')
    .eq('id', institution_id)
    .single();

  const timezone = institution?.timezone || null;
  const today = getCurrentDateInTimezone(timezone);
  const todayStr = today.toISOString().split('T')[0];

  const { data: terms, error } = await supabase
    .from('terms')
    .select('id, start_date, end_date, is_current, institution_id')
    .eq('institution_id', institution_id);

  if (error || !terms || terms.length === 0) {
    return null;
  }

  const activeTerms = terms.filter((term) =>
    compareDates(todayStr, term.start_date) >= 0 && compareDates(todayStr, term.end_date) <= 0
  );

  activeTerms.sort((a, b) => compareDates(b.start_date, a.start_date));
  const desiredActive = activeTerms.length > 0 ? activeTerms[0] : null;
  const currentFlags = terms.filter((term) => term.is_current).map((term) => term.id);

  const alreadySynced =
    (desiredActive && currentFlags.length === 1 && currentFlags[0] === desiredActive.id) ||
    (!desiredActive && currentFlags.length === 0);

  if (alreadySynced) {
    return desiredActive;
  }

  await supabase
    .from('terms')
    .update({ is_current: false })
    .eq('institution_id', institution_id)
    .eq('is_current', true);

  if (desiredActive) {
    await supabase
      .from('terms')
      .update({ is_current: true })
      .eq('id', desiredActive.id)
      .eq('institution_id', institution_id);
  }

  return desiredActive;
};

const getAcademicYears = async (req, res) => {
  try {
    const institution_id = req.user?.institution_id;
    if (!institution_id) {
      return res.status(400).json({ success: false, message: 'institution_id is required' });
    }

    const { data, error } = await supabase
      .from('academic_years')
      .select('*, terms(*)')
      .eq('institution_id', institution_id)
      .order('start_date', { ascending: false });

    if (error) throw error;

    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const createAcademicYear = async (req, res) => {
  try {
    const institution_id = req.user?.institution_id;
    if (!institution_id) {
      return res.status(400).json({ success: false, message: 'institution_id is required' });
    }

    const { name, start_date, end_date, is_current, terms } = req.body;

    if (!name || !start_date || !end_date) {
      return res.status(400).json({ success: false, message: 'name, start_date, and end_date are required' });
    }

    if (start_date >= end_date) {
      return res.status(400).json({ success: false, message: 'start_date must be before end_date' });
    }

    if (is_current) {
      await supabase
        .from('academic_years')
        .update({ is_current: false })
        .eq('institution_id', institution_id)
        .eq('is_current', true);
    }

    const { data: year, error: yearError } = await supabase
      .from('academic_years')
      .insert({ name, start_date, end_date, is_current: !!is_current, institution_id })
      .select()
      .single();

    if (yearError) throw yearError;

    if (terms && terms.length > 0) {
      // Validate each term's dates are within the academic year range
      for (const t of terms) {
        if (t.start_date >= t.end_date) {
          return res.status(400).json({
            success: false,
            message: `Term "${t.name}" start_date must be before end_date`,
          });
        }
        if (compareDates(t.start_date, start_date) < 0 || compareDates(t.end_date, end_date) > 0) {
          return res.status(400).json({
            success: false,
            message: `Term "${t.name}" dates must fall within the academic year range`,
          });
        }
      }

      // Validate no overlaps between terms within this year
      for (const t of terms) {
        const overlap = await validateTermOverlap(year.id, t.start_date, t.end_date, null, institution_id);
        if (!overlap.valid) {
          return res.status(400).json({
            success: false,
            message: `Term "${t.name}" overlaps with existing term "${overlap.conflict.term_name}"`,
            conflict: overlap.conflict,
          });
        }
      }

      const termsToInsert = terms.map((t) => ({
        academic_year_id: year.id,
        name: t.name,
        start_date: t.start_date,
        end_date: t.end_date,
        institution_id,
      }));

      const { error: termsError } = await supabase
        .from('terms')
        .insert(termsToInsert);

      if (termsError) throw termsError;
    }

    const { data: result, error: fetchError } = await supabase
      .from('academic_years')
      .select('*, terms(*)')
      .eq('id', year.id)
      .single();

    if (fetchError) throw fetchError;

    return res.status(201).json({ success: true, data: result });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const updateAcademicYear = async (req, res) => {
  try {
    const { id } = req.params;
    const institution_id = req.user?.institution_id;
    if (!institution_id) {
      return res.status(400).json({ success: false, message: 'institution_id is required' });
    }

    const { name, start_date, end_date, is_current } = req.body;

    if (start_date && end_date && start_date >= end_date) {
      return res.status(400).json({ success: false, message: 'start_date must be before end_date' });
    }

    if (is_current) {
      await supabase
        .from('academic_years')
        .update({ is_current: false })
        .eq('institution_id', institution_id)
        .eq('is_current', true)
        .neq('id', id);
    }

    const { data, error } = await supabase
      .from('academic_years')
      .update({ name, start_date, end_date, is_current: !!is_current })
      .eq('id', id)
      .eq('institution_id', institution_id)
      .select('*, terms(*)')
      .single();

    if (error) throw error;

    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const deleteAcademicYear = async (req, res) => {
  try {
    const { id } = req.params;
    const institution_id = req.user?.institution_id;
    if (!institution_id) {
      return res.status(400).json({ success: false, message: 'institution_id is required' });
    }

    const { data, error } = await supabase
      .from('academic_years')
      .delete()
      .eq('id', id)
      .eq('institution_id', institution_id)
      .select()
      .single();

    if (error || !data) {
      return res.status(404).json({ success: false, message: 'Academic year not found' });
    }

    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const getTerms = async (req, res) => {
  try {
    const institution_id = req.user?.institution_id;
    if (!institution_id) {
      return res.status(400).json({ success: false, message: 'institution_id is required' });
    }

    await syncCurrentTermFlags(institution_id);

    let query = supabase
      .from('terms')
      .select('*, academic_years(name)')
      .eq('institution_id', institution_id);

    if (req.query.academic_year_id) {
      query = query.eq('academic_year_id', req.query.academic_year_id);
    }

    const { data, error } = await query.order('start_date', { ascending: false });

    if (error) throw error;

    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const getActiveTerm = async (req, res) => {
  try {
    const institution_id = req.user?.institution_id;
    if (!institution_id) {
      return res.status(400).json({ success: false, message: 'institution_id is required' });
    }

    await syncCurrentTermFlags(institution_id);
    const activeTerm = await resolveActiveTerm(institution_id);
    const nextTerm = activeTerm ? null : await resolveNextUpcomingTerm(institution_id);

    return res.status(200).json({
      success: true,
      data: {
        active_term: activeTerm,
        next_upcoming_term: nextTerm,
        has_active_term: activeTerm !== null,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const createTerm = async (req, res) => {
  try {
    const institution_id = req.user?.institution_id;
    if (!institution_id) {
      return res.status(400).json({ success: false, message: 'institution_id is required' });
    }

    const { academic_year_id, name, start_date, end_date } = req.body;

    if (!academic_year_id || !name || !start_date || !end_date) {
      return res.status(400).json({ success: false, message: 'academic_year_id, name, start_date, and end_date are required' });
    }

    if (start_date >= end_date) {
      return res.status(400).json({ success: false, message: 'start_date must be before end_date' });
    }

    const { data: year, error: yearError } = await supabase
      .from('academic_years')
      .select('id, start_date, end_date')
      .eq('id', academic_year_id)
      .eq('institution_id', institution_id)
      .single();

    if (yearError || !year) {
      return res.status(404).json({ success: false, message: 'Academic year not found' });
    }

    // Validate term dates fall within academic year
    if (compareDates(start_date, year.start_date) < 0 || compareDates(end_date, year.end_date) > 0) {
      return res.status(400).json({
        success: false,
        message: `Term dates must fall within the academic year (${year.start_date} to ${year.end_date})`,
      });
    }

    // Validate no overlap with existing terms in same year
    const overlap = await validateTermOverlap(academic_year_id, start_date, end_date, null, institution_id);
    if (!overlap.valid) {
      return res.status(400).json({
        success: false,
        message: `Term overlaps with existing term "${overlap.conflict.term_name}"`,
        conflict: overlap.conflict,
      });
    }

    const { data, error } = await supabase
      .from('terms')
      .insert({ academic_year_id, name, start_date, end_date, institution_id })
      .select('*, academic_years(name)')
      .single();

    if (error) throw error;

    // Re-evaluate active term after creation and synchronize flags
    await syncCurrentTermFlags(institution_id);
    const activeTerm = await resolveActiveTerm(institution_id);

    return res.status(201).json({
      success: true,
      data,
      active_term: activeTerm,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const updateTerm = async (req, res) => {
  try {
    const { id } = req.params;
    const institution_id = req.user?.institution_id;
    if (!institution_id) {
      return res.status(400).json({ success: false, message: 'institution_id is required' });
    }

    const { name, start_date, end_date } = req.body;

    if (start_date && end_date && start_date >= end_date) {
      return res.status(400).json({ success: false, message: 'start_date must be before end_date' });
    }

    // Fetch current term to get its academic_year_id
    const { data: existing, error: fetchError } = await supabase
      .from('terms')
      .select('id, academic_year_id, start_date, end_date')
      .eq('id', id)
      .eq('institution_id', institution_id)
      .single();

    if (fetchError || !existing) {
      return res.status(404).json({ success: false, message: 'Term not found' });
    }

    try {
      const locked = await isTermLocked(institution_id, id);
      if (locked) {
        return res.status(409).json({ success: false, message: 'Term is locked and cannot be edited' });
      }
    } catch (lockError) {
      return res.status(500).json({ success: false, message: lockError.message || 'Unable to verify term lock state' });
    }

    // Validate updated term remains inside academic year boundaries
    const { data: year, error: yearError } = await supabase
      .from('academic_years')
      .select('start_date, end_date')
      .eq('id', existing.academic_year_id)
      .eq('institution_id', institution_id)
      .single();

    if (yearError || !year) {
      return res.status(404).json({ success: false, message: 'Academic year not found for term' });
    }

    const checkStartBound = start_date || existing.start_date;
    const checkEndBound = end_date || existing.end_date;
    if (
      compareDates(checkStartBound, year.start_date) < 0 ||
      compareDates(checkEndBound, year.end_date) > 0
    ) {
      return res.status(400).json({
        success: false,
        message: `Term dates must fall within the academic year (${year.start_date} to ${year.end_date})`,
      });
    }

    // If dates changed, validate overlap
    if (start_date || end_date) {
      const checkStart = start_date || existing.start_date;
      const checkEnd = end_date || existing.end_date;

      const overlap = await validateTermOverlap(
        existing.academic_year_id, checkStart, checkEnd, id, institution_id
      );
      if (!overlap.valid) {
        return res.status(400).json({
          success: false,
          message: `Term overlaps with existing term "${overlap.conflict.term_name}"`,
          conflict: overlap.conflict,
        });
      }
    }

    const updateFields = {};
    if (name !== undefined) updateFields.name = name;
    if (start_date !== undefined) updateFields.start_date = start_date;
    if (end_date !== undefined) updateFields.end_date = end_date;

    const { data, error } = await supabase
      .from('terms')
      .update(updateFields)
      .eq('id', id)
      .eq('institution_id', institution_id)
      .select('*, academic_years(name)')
      .single();

    if (error) throw error;

    // Re-evaluate active term after update and synchronize flags
    await syncCurrentTermFlags(institution_id);
    const activeTerm = await resolveActiveTerm(institution_id);

    return res.status(200).json({
      success: true,
      data,
      active_term: activeTerm,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const deleteTerm = async (req, res) => {
  try {
    const { id } = req.params;
    const institution_id = req.user?.institution_id;
    if (!institution_id) {
      return res.status(400).json({ success: false, message: 'institution_id is required' });
    }

    try {
      const locked = await isTermLocked(institution_id, id);
      if (locked) {
        return res.status(409).json({ success: false, message: 'Term is locked and cannot be deleted' });
      }
    } catch (lockError) {
      return res.status(500).json({ success: false, message: lockError.message || 'Unable to verify term lock state' });
    }

    const { data, error } = await supabase
      .from('terms')
      .delete()
      .eq('id', id)
      .eq('institution_id', institution_id)
      .select()
      .single();

    if (error || !data) {
      return res.status(404).json({ success: false, message: 'Term not found' });
    }

    // Re-evaluate active term after deletion and synchronize flags
    await syncCurrentTermFlags(institution_id);
    const activeTerm = await resolveActiveTerm(institution_id);

    return res.status(200).json({
      success: true,
      data,
      active_term: activeTerm,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const setCurrentTerm = async (req, res) => {
  try {
    const institution_id = req.user?.institution_id;
    if (!institution_id) {
      return res.status(400).json({ success: false, message: 'institution_id is required' });
    }

    const { term_id } = req.body;

    const { data: term, error: termError } = await supabase
      .from('terms')
      .select('id, academic_year_id, start_date, end_date')
      .eq('id', term_id)
      .eq('institution_id', institution_id)
      .single();

    if (termError || !term) {
      return res.status(404).json({ success: false, message: 'Term not found' });
    }

    try {
      const locked = await isTermLocked(institution_id, term_id);
      if (locked) {
        return res.status(409).json({ success: false, message: 'Locked term cannot be marked current' });
      }
    } catch (lockError) {
      return res.status(500).json({ success: false, message: lockError.message || 'Unable to verify term lock state' });
    }

    const { data: institution } = await supabase
      .from('institutions')
      .select('timezone')
      .eq('id', institution_id)
      .single();
    const today = getCurrentDateInTimezone(institution?.timezone || null);
    const todayStr = today.toISOString().split('T')[0];

    const termIsActiveToday =
      compareDates(todayStr, term.start_date) >= 0 && compareDates(todayStr, term.end_date) <= 0;

    if (!termIsActiveToday) {
      return res.status(400).json({
        success: false,
        message: 'Selected term is outside today\'s date range and cannot be marked current',
      });
    }

    await supabase
      .from('terms')
      .update({ is_current: false })
      .eq('academic_year_id', term.academic_year_id)
      .eq('institution_id', institution_id)
      .eq('is_current', true);

    const { data, error } = await supabase
      .from('terms')
      .update({ is_current: true })
      .eq('id', term_id)
      .select('*, academic_years(name)')
      .single();

    if (error) throw error;

    await syncCurrentTermFlags(institution_id);

    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const setTermLockState = async (req, res) => {
  try {
    const { id } = req.params;
    const institution_id = req.user?.institution_id;
    if (!institution_id) {
      return res.status(400).json({ success: false, message: 'institution_id is required' });
    }

    const { locked } = req.body;
    if (typeof locked !== 'boolean') {
      return res.status(400).json({ success: false, message: 'locked (boolean) is required' });
    }

    const lockValue = locked ? new Date().toISOString() : null;

    const { data, error } = await supabase
      .from('terms')
      .update({ locked_at: lockValue })
      .eq('id', id)
      .eq('institution_id', institution_id)
      .select('*, academic_years(name)')
      .single();

    if (error || !data) {
      return res.status(404).json({ success: false, message: 'Term not found or lock column unavailable' });
    }

    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getAcademicYears,
  createAcademicYear,
  updateAcademicYear,
  deleteAcademicYear,
  getTerms,
  getActiveTerm,
  createTerm,
  updateTerm,
  deleteTerm,
  setCurrentTerm,
  setTermLockState,
};
