// controllers/nationalCheckpoint.controller.js
const supabase = require('../utils/supabaseClient.js');

const VALID_DESCRIPTORS = [
  'below_expectation',
  'approaching_expectation',
  'meeting_expectation',
  'exceeding_expectation',
];

/**
 * Determine which national checkpoints are applicable for the institution based on its configured classes.
 * KPSEA -> Requires Grade 6 / Primary
 * KJSEA -> Requires Grade 9 / Junior Secondary
 * KSCE / Senior -> Requires Grade 12 / Senior Secondary
 */
async function getInstitutionAllowedCheckpoints(institutionId) {
  const { data: classes, error } = await supabase
    .from('classes')
    .select('grade_level, education_level, cbc_band')
    .eq('institution_id', institutionId);

  if (error || !classes) return [];

  const gradeLevels = new Set(classes.map(c => c.grade_level).filter(Boolean));
  const schoolLevels = new Set(classes.map(c => c.education_level || c.cbc_band).filter(Boolean));

  const allowed = [];

  // Grade 6 / Primary coverage allows KPSEA
  if (gradeLevels.has(6) || schoolLevels.has('primary')) {
    allowed.push({
      checkpoint_name: 'KPSEA',
      target_grade: 6,
      education_level: 'primary',
      band: 'primary',
      description: 'Kenya Primary School Education Assessment (Grade 6 National Checkpoint)',
    });
  }

  // Grade 9 / Junior Secondary coverage allows KJSEA
  if (gradeLevels.has(9) || schoolLevels.has('junior_secondary')) {
    allowed.push({
      checkpoint_name: 'KJSEA',
      target_grade: 9,
      education_level: 'junior_secondary',
      band: 'junior_secondary',
      description: 'Kenya Junior School Education Assessment (Grade 9 National Transition Checkpoint)',
    });
  }

  // Grade 12 / Senior Secondary coverage allows Senior Secondary Exit Checkpoint
  if (gradeLevels.has(12) || schoolLevels.has('senior_secondary')) {
    allowed.push({
      checkpoint_name: 'Senior Secondary Exit Checkpoint',
      target_grade: 12,
      education_level: 'senior_secondary',
      band: 'senior_secondary',
      description: 'Grade 12 Senior Secondary National Exit Evaluation',
    });
  }

  return allowed;
}

/**
 * GET /api/checkpoints/available
 * Returns the list of checkpoints this institution covers
 */
exports.getAvailableCheckpoints = async (req, res) => {
  try {
    const institution_id = req.user?.institution_id;
    const allowed = await getInstitutionAllowedCheckpoints(institution_id);
    return res.json({ success: true, data: allowed });
  } catch (error) {
    console.error('getAvailableCheckpoints error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * GET /api/checkpoints/student/:studentId
 * Returns national assessment records for a student, filtered to checkpoints the institution covers.
 */
exports.getStudentCheckpoints = async (req, res) => {
  try {
    const { studentId } = req.params;
    const institution_id = req.user?.institution_id;

    const allowed = await getInstitutionAllowedCheckpoints(institution_id);
    const allowedNames = allowed.map(a => a.checkpoint_name);

    if (allowedNames.length === 0) {
      return res.json({ success: true, data: [], allowed_checkpoints: [] });
    }

    const { data: records, error } = await supabase
      .from('national_assessment_records')
      .select('*')
      .eq('student_id', studentId)
      .eq('institution_id', institution_id)
      .in('checkpoint_name', allowedNames)
      .order('assessment_year', { ascending: false });

    if (error) throw error;

    return res.json({
      success: true,
      data: records || [],
      allowed_checkpoints: allowed,
    });
  } catch (error) {
    console.error('getStudentCheckpoints error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * POST /api/checkpoints
 * Record or update a national assessment checkpoint for a learner
 */
exports.recordCheckpoint = async (req, res) => {
  try {
    const institution_id = req.user?.institution_id;
    const {
      student_id,
      checkpoint_name,
      assessment_year,
      overall_descriptor,
      placement_notes,
    } = req.body;

    if (!student_id || !checkpoint_name || !assessment_year || !overall_descriptor) {
      return res.status(400).json({
        success: false,
        error: 'student_id, checkpoint_name, assessment_year, and overall_descriptor are required',
      });
    }

    if (!VALID_DESCRIPTORS.includes(overall_descriptor)) {
      return res.status(400).json({
        success: false,
        error: `overall_descriptor must be one of: ${VALID_DESCRIPTORS.join(', ')}`,
      });
    }

    // Verify institution has coverage for this checkpoint
    const allowed = await getInstitutionAllowedCheckpoints(institution_id);
    const isAllowed = allowed.some(a => a.checkpoint_name === checkpoint_name);

    if (!isAllowed) {
      return res.status(403).json({
        success: false,
        error: `Checkpoint "${checkpoint_name}" is not available for this institution based on configured grade levels.`,
      });
    }

    const { data, error } = await supabase
      .from('national_assessment_records')
      .upsert(
        {
          institution_id,
          student_id,
          checkpoint_name,
          assessment_year: parseInt(assessment_year, 10),
          overall_descriptor,
          placement_notes: placement_notes?.trim() || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'student_id,checkpoint_name' }
      )
      .select()
      .single();

    if (error) throw error;

    return res.status(201).json({ success: true, data });
  } catch (error) {
    console.error('recordCheckpoint error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * DELETE /api/checkpoints/:id
 */
exports.deleteCheckpoint = async (req, res) => {
  try {
    const { id } = req.params;
    const institution_id = req.user?.institution_id;

    const { error } = await supabase
      .from('national_assessment_records')
      .delete()
      .eq('id', id)
      .eq('institution_id', institution_id);

    if (error) throw error;

    return res.json({ success: true, message: 'Assessment record deleted' });
  } catch (error) {
    console.error('deleteCheckpoint error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};
