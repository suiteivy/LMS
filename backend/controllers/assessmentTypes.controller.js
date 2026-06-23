const supabase = require('../utils/supabaseClient.js');

const VALID_CATEGORIES = ['continuous_assessment', 'examination'];

const getAssessmentTypes = async (req, res) => {
  try {
    const institutionId = req.user?.institution_id || req.user?.id;

    if (!institutionId) {
      return res.status(400).json({ success: false, error: 'Institution ID not found' });
    }

    const { data, error } = await supabase
      .from('assessment_types')
      .select('*')
      .eq('institution_id', institutionId)
      .eq('is_active', true)
      .order('display_order', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      return res.status(500).json({ success: false, error: error.message });
    }

    return res.status(200).json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

const createAssessmentTypes = async (req, res) => {
  try {
    const institutionId = req.user?.institution_id || req.user?.id;

    if (!institutionId) {
      return res.status(400).json({ success: false, error: 'Institution ID not found' });
    }

    const body = req.body;
    const items = Array.isArray(body) ? body : [body];

    const invalid = items.find((item) => !VALID_CATEGORIES.includes(item.category));
    if (invalid) {
      return res.status(400).json({
        success: false,
        error: `Invalid category "${invalid.category}". Must be one of: ${VALID_CATEGORIES.join(', ')}`,
      });
    }

    const records = items.map((item) => ({
      name: item.name,
      code: item.code,
      category: item.category,
      default_weight: item.default_weight,
      display_order: item.display_order,
      institution_id: institutionId,
    }));

    const { data, error } = await supabase
      .from('assessment_types')
      .insert(records)
      .select();

    if (error) {
      return res.status(500).json({ success: false, error: error.message });
    }

    return res.status(201).json({ success: true, data: records.length === 1 ? data[0] : data });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

const updateAssessmentType = async (req, res) => {
  try {
    const institutionId = req.user?.institution_id || req.user?.id;

    if (!institutionId) {
      return res.status(400).json({ success: false, error: 'Institution ID not found' });
    }

    const { id } = req.params;
    const body = req.body;

    if (body.category && !VALID_CATEGORIES.includes(body.category)) {
      return res.status(400).json({
        success: false,
        error: `Invalid category "${body.category}". Must be one of: ${VALID_CATEGORIES.join(', ')}`,
      });
    }

    const { data, error } = await supabase
      .from('assessment_types')
      .update(body)
      .eq('id', id)
      .eq('institution_id', institutionId)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ success: false, error: error.message });
    }

    if (!data) {
      return res.status(404).json({ success: false, error: 'Assessment type not found' });
    }

    return res.status(200).json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

const deleteAssessmentType = async (req, res) => {
  try {
    const institutionId = req.user?.institution_id || req.user?.id;

    if (!institutionId) {
      return res.status(400).json({ success: false, error: 'Institution ID not found' });
    }

    const { id } = req.params;

    const { data, error } = await supabase
      .from('assessment_types')
      .update({ is_active: false })
      .eq('id', id)
      .eq('institution_id', institutionId)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ success: false, error: error.message });
    }

    if (!data) {
      return res.status(404).json({ success: false, error: 'Assessment type not found' });
    }

    return res.status(200).json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

const reorderAssessmentTypes = async (req, res) => {
  try {
    const institutionId = req.user?.institution_id || req.user?.id;

    if (!institutionId) {
      return res.status(400).json({ success: false, error: 'Institution ID not found' });
    }

    const { items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, error: 'items array is required' });
    }

    const updates = items.map((item) =>
      supabase
        .from('assessment_types')
        .update({ display_order: item.display_order })
        .eq('id', item.id)
        .eq('institution_id', institutionId)
    );

    const results = await Promise.all(updates);

    const failed = results.find((r) => r.error);
    if (failed) {
      return res.status(500).json({ success: false, error: failed.error.message });
    }

    return res.status(200).json({ success: true, data: items });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

module.exports = {
  getAssessmentTypes,
  createAssessmentTypes,
  updateAssessmentType,
  deleteAssessmentType,
  reorderAssessmentTypes,
};
