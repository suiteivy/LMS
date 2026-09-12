// controllers/track.controller.js
const supabase = require('../utils/supabaseClient.js');

const DEFAULT_CBC_TRACKS = [
  {
    name: 'STEM',
    code: 'STEM',
    description: 'Science, Technology, Engineering, and Mathematics pathway focusing on pure sciences, applied sciences, and technical studies.',
  },
  {
    name: 'Social Sciences',
    code: 'SOC_SCI',
    description: 'Humanities, Business Studies, Languages, and Literature pathway preparing learners for legal, administrative, and social disciplines.',
  },
  {
    name: 'Arts & Sports Science',
    code: 'ARTS_SPORTS',
    description: 'Creative Arts, Performing Arts, Music, and Sports Science pathway nurturing talent and physical education excellence.',
  },
];

/**
 * Check if an institution has configured coverage for Grade 10–12 (Senior Secondary).
 * Senior Secondary tracks must be completely hidden for institutions without Grade 10–12.
 */
async function checkSeniorSecondaryCoverage(institutionId) {
  const { data: seniorClasses, error } = await supabase
    .from('classes')
    .select('id, grade_level, education_level, cbc_band')
    .eq('institution_id', institutionId)
    .or('education_level.eq.senior_secondary,cbc_band.eq.senior_secondary,grade_level.gte.10');

  if (error) {
    console.error('Error checking senior secondary coverage:', error);
    return false;
  }

  return (seniorClasses && seniorClasses.length > 0);
}

/**
 * GET /api/tracks
 * Lists Senior Secondary tracks for the institution.
 * Returns empty / has_senior_secondary: false if institution does not offer Grade 10-12.
 * Auto-seeds STEM, Social Sciences, Arts & Sports Science if coverage exists and tracks are empty.
 */
exports.getTracks = async (req, res) => {
  try {
    const institution_id = req.user?.institution_id;
    if (!institution_id) {
      return res.status(400).json({ success: false, error: 'Institution ID required' });
    }

    const hasSeniorSecondary = await checkSeniorSecondaryCoverage(institution_id);
    if (!hasSeniorSecondary) {
      return res.json({
        success: true,
        has_senior_secondary: false,
        message: 'Senior Secondary (Grade 10–12) is not configured for this institution.',
        data: [],
      });
    }

    // Check existing tracks
    let { data: tracks, error } = await supabase
      .from('institution_tracks')
      .select(`
        id,
        name,
        code,
        description,
        is_active,
        track_subjects (
          id,
          subject_id,
          is_compulsory,
          subjects (id, title, grade_level)
        )
      `)
      .eq('institution_id', institution_id)
      .order('name');

    if (error) throw error;

    // Auto-seed default 3 CBC tracks if none exist yet
    if (!tracks || tracks.length === 0) {
      const inserts = DEFAULT_CBC_TRACKS.map(t => ({
        institution_id,
        name: t.name,
        code: t.code,
        description: t.description,
        is_active: true,
      }));

      const { data: seeded, error: seedError } = await supabase
        .from('institution_tracks')
        .insert(inserts)
        .select(`
          id,
          name,
          code,
          description,
          is_active
        `);

      if (seedError) {
        console.error('Error seeding CBC tracks:', seedError);
      } else {
        tracks = (seeded || []).map(s => ({ ...s, track_subjects: [] }));
      }
    }

    return res.json({
      success: true,
      has_senior_secondary: true,
      data: tracks || [],
    });
  } catch (error) {
    console.error('getTracks error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * POST /api/tracks
 * Creates a custom or modified track for Senior Secondary
 */
exports.createTrack = async (req, res) => {
  try {
    const institution_id = req.user?.institution_id;
    const { name, code, description } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, error: 'Track name is required' });
    }

    const hasSeniorSecondary = await checkSeniorSecondaryCoverage(institution_id);
    if (!hasSeniorSecondary) {
      return res.status(403).json({
        success: false,
        error: 'Cannot create tracks: Institution does not have Grade 10–12 configured.',
      });
    }

    const { data, error } = await supabase
      .from('institution_tracks')
      .insert({
        institution_id,
        name: name.trim(),
        code: (code || name).toUpperCase().replace(/\s+/g, '_'),
        description: description?.trim() || null,
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;

    return res.status(201).json({ success: true, data });
  } catch (error) {
    console.error('createTrack error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * PUT /api/tracks/:id
 */
exports.updateTrack = async (req, res) => {
  try {
    const { id } = req.params;
    const institution_id = req.user?.institution_id;
    const { name, description, is_active } = req.body;

    const updates = {};
    if (name !== undefined) updates.name = name.trim();
    if (description !== undefined) updates.description = description?.trim() || null;
    if (is_active !== undefined) updates.is_active = Boolean(is_active);

    const { data, error } = await supabase
      .from('institution_tracks')
      .update(updates)
      .eq('id', id)
      .eq('institution_id', institution_id)
      .select()
      .single();

    if (error) throw error;

    return res.json({ success: true, data });
  } catch (error) {
    console.error('updateTrack error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * POST /api/tracks/:id/subjects
 * Assigns a subject to a track as compulsory or elective
 */
exports.assignSubjectToTrack = async (req, res) => {
  try {
    const { id: track_id } = req.params;
    const institution_id = req.user?.institution_id;
    const { subject_id, is_compulsory } = req.body;

    if (!subject_id) {
      return res.status(400).json({ success: false, error: 'subject_id is required' });
    }

    // Verify track belongs to institution
    const { data: track } = await supabase
      .from('institution_tracks')
      .select('id')
      .eq('id', track_id)
      .eq('institution_id', institution_id)
      .single();

    if (!track) {
      return res.status(404).json({ success: false, error: 'Track not found' });
    }

    const { data, error } = await supabase
      .from('track_subjects')
      .upsert(
        {
          track_id,
          subject_id,
          is_compulsory: is_compulsory !== false,
        },
        { onConflict: 'track_id,subject_id' }
      )
      .select(`
        id,
        track_id,
        subject_id,
        is_compulsory,
        subjects (id, title, grade_level)
      `)
      .single();

    if (error) throw error;

    return res.status(201).json({ success: true, data });
  } catch (error) {
    console.error('assignSubjectToTrack error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * DELETE /api/tracks/:id/subjects/:subjectId
 */
exports.removeSubjectFromTrack = async (req, res) => {
  try {
    const { id: track_id, subjectId } = req.params;

    const { error } = await supabase
      .from('track_subjects')
      .delete()
      .eq('track_id', track_id)
      .eq('subject_id', subjectId);

    if (error) throw error;

    return res.json({ success: true, message: 'Subject removed from track' });
  } catch (error) {
    console.error('removeSubjectFromTrack error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * POST /api/tracks/enroll
 * Enrolls a learner into a Senior Secondary Track
 */
exports.enrollStudentInTrack = async (req, res) => {
  try {
    const institution_id = req.user?.institution_id;
    const { student_id, track_id, elective_subject_ids } = req.body;

    if (!student_id || !track_id) {
      return res.status(400).json({ success: false, error: 'student_id and track_id are required' });
    }

    const { data, error } = await supabase
      .from('student_track_enrollments')
      .upsert(
        {
          institution_id,
          student_id,
          track_id,
          elective_subject_ids: Array.isArray(elective_subject_ids) ? elective_subject_ids : [],
          enrolled_at: new Date().toISOString(),
        },
        { onConflict: 'student_id' }
      )
      .select(`
        id,
        student_id,
        track_id,
        elective_subject_ids,
        enrolled_at,
        institution_tracks (id, name, code)
      `)
      .single();

    if (error) throw error;

    return res.json({ success: true, data });
  } catch (error) {
    console.error('enrollStudentInTrack error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * GET /api/tracks/student/:studentId
 */
exports.getStudentTrack = async (req, res) => {
  try {
    const { studentId } = req.params;
    const institution_id = req.user?.institution_id;

    const { data, error } = await supabase
      .from('student_track_enrollments')
      .select(`
        id,
        student_id,
        track_id,
        elective_subject_ids,
        enrolled_at,
        institution_tracks (
          id,
          name,
          code,
          description,
          track_subjects (
            id,
            subject_id,
            is_compulsory,
            subjects (id, title, grade_level)
          )
        )
      `)
      .eq('student_id', studentId)
      .eq('institution_id', institution_id)
      .maybeSingle();

    if (error) throw error;

    return res.json({ success: true, data });
  } catch (error) {
    console.error('getStudentTrack error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};
