const supabase = require('../utils/supabaseClient.js');

const getGradingScales = async (req, res) => {
  try {
    const institution_id = req.user?.institution_id;
    if (!institution_id) {
      return res.status(400).json({ success: false, error: 'institution_id is required' });
    }

    const { name } = req.query;

    let query = supabase
      .from('grading_scales')
      .select('*')
      .eq('institution_id', institution_id)
      .eq('is_active', true)
      .order('min_score', { ascending: false });

    if (name) {
      query = query.ilike('name', `%${name}%`);
    }

    const { data, error } = await query;

    if (error) {
      return res.status(500).json({ success: false, error: error.message });
    }

    return res.status(200).json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

const hasOverlap = async (institution_id, name, min_score, max_score, excludeId = null) => {
  let query = supabase
    .from('grading_scales')
    .select('id')
    .eq('institution_id', institution_id)
    .eq('name', name)
    .eq('is_active', true)
    .or(`min_score.lte.${max_score},max_score.gte.${min_score}`);

  if (excludeId) {
    query = query.neq('id', excludeId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return data && data.length > 0;
};

const createGradingScale = async (req, res) => {
  try {
    const institution_id = req.user?.institution_id;
    if (!institution_id) {
      return res.status(400).json({ success: false, error: 'institution_id is required' });
    }

    const { name, min_score, max_score, letter_grade, gpa_points, description } = req.body;

    if (min_score === undefined || max_score === undefined || !name || !letter_grade) {
      return res.status(400).json({
        success: false,
        error: 'name, min_score, max_score, and letter_grade are required'
      });
    }

    if (min_score >= max_score) {
      return res.status(400).json({
        success: false,
        error: 'min_score must be less than max_score'
      });
    }

    const overlap = await hasOverlap(institution_id, name, min_score, max_score);
    if (overlap) {
      return res.status(400).json({
        success: false,
        error: 'Score range overlaps with an existing grading scale'
      });
    }

    const { data, error } = await supabase
      .from('grading_scales')
      .insert({
        institution_id,
        name,
        min_score,
        max_score,
        letter_grade,
        gpa_points: gpa_points ?? null,
        description: description ?? null,
        is_active: true
      })
      .select()
      .single();

    if (error) {
      return res.status(500).json({ success: false, error: error.message });
    }

    return res.status(201).json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

const updateGradingScale = async (req, res) => {
  try {
    const institution_id = req.user?.institution_id;
    if (!institution_id) {
      return res.status(400).json({ success: false, error: 'institution_id is required' });
    }

    const { id } = req.params;
    const { name, min_score, max_score, letter_grade, gpa_points, description } = req.body;

    const { data: existing, error: fetchError } = await supabase
      .from('grading_scales')
      .select('*')
      .eq('id', id)
      .eq('institution_id', institution_id)
      .eq('is_active', true)
      .single();

    if (fetchError || !existing) {
      return res.status(404).json({ success: false, error: 'Grading scale not found' });
    }

    const updatedName = name ?? existing.name;
    const updatedMin = min_score ?? existing.min_score;
    const updatedMax = max_score ?? existing.max_score;

    if (updatedMin >= updatedMax) {
      return res.status(400).json({
        success: false,
        error: 'min_score must be less than max_score'
      });
    }

    if (
      (min_score !== undefined || max_score !== undefined || name !== undefined) &&
      (min_score !== existing.min_score || max_score !== existing.max_score || name !== existing.name)
    ) {
      const overlap = await hasOverlap(institution_id, updatedName, updatedMin, updatedMax, id);
      if (overlap) {
        return res.status(400).json({
          success: false,
          error: 'Score range overlaps with an existing grading scale'
        });
      }
    }

    const updates = {};
    if (name !== undefined) updates.name = name;
    if (min_score !== undefined) updates.min_score = min_score;
    if (max_score !== undefined) updates.max_score = max_score;
    if (letter_grade !== undefined) updates.letter_grade = letter_grade;
    if (gpa_points !== undefined) updates.gpa_points = gpa_points;
    if (description !== undefined) updates.description = description;

    const { data, error } = await supabase
      .from('grading_scales')
      .update(updates)
      .eq('id', id)
      .eq('institution_id', institution_id)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ success: false, error: error.message });
    }

    return res.status(200).json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

const deleteGradingScale = async (req, res) => {
  try {
    const institution_id = req.user?.institution_id;
    if (!institution_id) {
      return res.status(400).json({ success: false, error: 'institution_id is required' });
    }

    const { id } = req.params;

    const { data: existing, error: fetchError } = await supabase
      .from('grading_scales')
      .select('id')
      .eq('id', id)
      .eq('institution_id', institution_id)
      .eq('is_active', true)
      .single();

    if (fetchError || !existing) {
      return res.status(404).json({ success: false, error: 'Grading scale not found' });
    }

    const { error } = await supabase
      .from('grading_scales')
      .update({ is_active: false })
      .eq('id', id)
      .eq('institution_id', institution_id);

    if (error) {
      return res.status(500).json({ success: false, error: error.message });
    }

    return res.status(200).json({ success: true, data: { message: 'Grading scale deleted' } });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

const bulkCreateGradingScale = async (req, res) => {
  try {
    const institution_id = req.user?.institution_id;
    if (!institution_id) {
      return res.status(400).json({ success: false, error: 'institution_id is required' });
    }

    const { name, scales } = req.body;

    if (!name || !Array.isArray(scales) || scales.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'name and a non-empty scales array are required'
      });
    }

    for (const scale of scales) {
      if (scale.min_score === undefined || scale.max_score === undefined || !scale.letter_grade) {
        return res.status(400).json({
          success: false,
          error: 'Each scale entry requires min_score, max_score, and letter_grade'
        });
      }
      if (scale.min_score >= scale.max_score) {
        return res.status(400).json({
          success: false,
          error: `min_score (${scale.min_score}) must be less than max_score (${scale.max_score}) for grade ${scale.letter_grade}`
        });
      }
    }

    for (const scale of scales) {
      const overlap = await hasOverlap(institution_id, name, scale.min_score, scale.max_score);
      if (overlap) {
        return res.status(400).json({
          success: false,
          error: `Score range ${scale.min_score}-${scale.max_score} overlaps with an existing grading scale`
        });
      }
    }

    const rows = scales.map((scale) => ({
      institution_id,
      name,
      min_score: scale.min_score,
      max_score: scale.max_score,
      letter_grade: scale.letter_grade,
      gpa_points: scale.gpa_points ?? null,
      description: scale.description ?? null,
      is_active: true
    }));

    const { data, error } = await supabase
      .from('grading_scales')
      .insert(rows)
      .select();

    if (error) {
      return res.status(500).json({ success: false, error: error.message });
    }

    return res.status(201).json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

const getDefaultScale = async (req, res) => {
  try {
    const defaultScale = [
      { min_score: 93, max_score: 100, letter_grade: 'A', gpa_points: 4.0, description: 'Excellent' },
      { min_score: 90, max_score: 92.99, letter_grade: 'A-', gpa_points: 3.7, description: 'Very Good' },
      { min_score: 87, max_score: 89.99, letter_grade: 'B+', gpa_points: 3.3, description: 'Good Plus' },
      { min_score: 83, max_score: 86.99, letter_grade: 'B', gpa_points: 3.0, description: 'Good' },
      { min_score: 80, max_score: 82.99, letter_grade: 'B-', gpa_points: 2.7, description: 'Above Average' },
      { min_score: 77, max_score: 79.99, letter_grade: 'C+', gpa_points: 2.3, description: 'Average Plus' },
      { min_score: 73, max_score: 76.99, letter_grade: 'C', gpa_points: 2.0, description: 'Average' },
      { min_score: 70, max_score: 72.99, letter_grade: 'C-', gpa_points: 1.7, description: 'Below Average' },
      { min_score: 67, max_score: 69.99, letter_grade: 'D+', gpa_points: 1.3, description: 'Poor Plus' },
      { min_score: 63, max_score: 66.99, letter_grade: 'D', gpa_points: 1.0, description: 'Poor' },
      { min_score: 60, max_score: 62.99, letter_grade: 'D-', gpa_points: 0.7, description: 'Minimal Passing' },
      { min_score: 0, max_score: 59.99, letter_grade: 'F', gpa_points: 0.0, description: 'Failing' }
    ];

    return res.status(200).json({
      success: true,
      data: {
        name: 'Standard 7-Point Scale',
        scales: defaultScale
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

module.exports = {
  getGradingScales,
  createGradingScale,
  updateGradingScale,
  deleteGradingScale,
  bulkCreateGradingScale,
  getDefaultScale
};
