// controllers/evidenceAssessment.controller.js
const supabase = require("../utils/supabaseClient.js");
const { isTermLocked } = require("../utils/resolveActiveTerm");

const DESCRIPTOR_POINTS = {
  below_expectation: 1,
  approaching_expectation: 2,
  meeting_expectation: 3,
  exceeding_expectation: 4,
};

const DESCRIPTOR_LABELS = {
  below_expectation: "Below Expectation",
  approaching_expectation: "Approaching Expectation",
  meeting_expectation: "Meeting Expectation",
  exceeding_expectation: "Exceeding Expectation",
};

function scoreToDescriptor(avgScore) {
  if (avgScore >= 3.5) return 'exceeding_expectation';
  if (avgScore >= 2.5) return 'meeting_expectation';
  if (avgScore >= 1.5) return 'approaching_expectation';
  return 'below_expectation';
}

/**
 * Record a single evidence entry (observation, project, or task)
 */
exports.recordEvidenceEntry = async (req, res) => {
  try {
    const institution_id = req.institution_id;
    const {
      student_id,
      subject_id,
      topic_area_id,
      topic_id,
      assignment_id,
      term_id,
      evidence_type,
      descriptor,
      teacher_notes,
    } = req.body;

    if (!student_id || !subject_id || !topic_area_id || !evidence_type || !descriptor) {
      return res.status(400).json({
        error: "student_id, subject_id, topic_area_id, evidence_type, and descriptor are required",
      });
    }

    if (!['observation', 'project', 'task'].includes(evidence_type)) {
      return res.status(400).json({ error: "evidence_type must be 'observation', 'project', or 'task'" });
    }

    if (!Object.keys(DESCRIPTOR_POINTS).includes(descriptor)) {
      return res.status(400).json({ error: "Invalid descriptor value" });
    }

    if (term_id) {
      const locked = await isTermLocked(institution_id, term_id);
      if (locked) {
        return res.status(409).json({ error: "Term is locked. Assessment entries cannot be added." });
      }
    }

    let evaluatedBy = null;
    if (req.userRole === 'teacher') {
      const { data: teacher } = await supabase
        .from('teachers')
        .select('id')
        .eq('user_id', req.userId)
        .single();
      evaluatedBy = teacher?.id || null;
    }

    const { data, error } = await supabase
      .from('content_evidence_entries')
      .insert([
        {
          institution_id,
          student_id,
          subject_id,
          topic_area_id,
          topic_id: topic_id || null,
          assignment_id: assignment_id || null,
          term_id: term_id || null,
          evidence_type,
          descriptor,
          teacher_notes: teacher_notes || null,
          evaluated_by: evaluatedBy,
        },
      ])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({
      message: "Evidence recorded successfully",
      data: {
        ...data,
        descriptor_label: DESCRIPTOR_LABELS[data.descriptor],
      },
    });
  } catch (err) {
    console.error("recordEvidenceEntry error:", err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Bulk record evidence entries for multiple students (e.g. grading an assignment or topic)
 */
exports.bulkRecordEvidenceEntries = async (req, res) => {
  try {
    const institution_id = req.institution_id;
    const { entries, term_id } = req.body;

    if (!Array.isArray(entries) || entries.length === 0) {
      return res.status(400).json({ error: "entries array is required" });
    }

    if (term_id) {
      const locked = await isTermLocked(institution_id, term_id);
      if (locked) {
        return res.status(409).json({ error: "Term is locked. Assessment entries cannot be added." });
      }
    }

    let evaluatedBy = null;
    if (req.userRole === 'teacher') {
      const { data: teacher } = await supabase
        .from('teachers')
        .select('id')
        .eq('user_id', req.userId)
        .single();
      evaluatedBy = teacher?.id || null;
    }

    const payload = entries.map((e) => ({
      institution_id,
      student_id: e.student_id,
      subject_id: e.subject_id,
      topic_area_id: e.topic_area_id,
      topic_id: e.topic_id || null,
      assignment_id: e.assignment_id || null,
      term_id: term_id || e.term_id || null,
      evidence_type: e.evidence_type || 'task',
      descriptor: e.descriptor,
      teacher_notes: e.teacher_notes || null,
      evaluated_by: evaluatedBy,
    }));

    const { data, error } = await supabase
      .from('content_evidence_entries')
      .insert(payload)
      .select();

    if (error) throw error;
    res.status(201).json({
      message: `Recorded ${data.length} evidence entries`,
      data: data.map((d) => ({
        ...d,
        descriptor_label: DESCRIPTOR_LABELS[d.descriptor],
      })),
    });
  } catch (err) {
    console.error("bulkRecordEvidenceEntries error:", err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Get all assessments and rolled-up descriptor per Topic Area for a student
 */
exports.getStudentSubjectTopicAssessments = async (req, res) => {
  try {
    const institution_id = req.institution_id;
    const { studentId, subjectId } = req.params;
    const { term_id } = req.query;

    if (!studentId || !subjectId) {
      return res.status(400).json({ error: "studentId and subjectId are required" });
    }

    // 1. Fetch all Topic Areas for this subject
    const { data: topicAreas, error: taError } = await supabase
      .from('subject_topic_areas')
      .select('id, name, description, sort_order')
      .eq('subject_id', subjectId)
      .eq('institution_id', institution_id)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true });

    if (taError) throw taError;

    // 2. Fetch all evidence entries for this student in this subject
    let query = supabase
      .from('content_evidence_entries')
      .select('*')
      .eq('institution_id', institution_id)
      .eq('student_id', studentId)
      .eq('subject_id', subjectId);

    if (term_id) {
      query = query.eq('term_id', term_id);
    }

    const { data: evidenceEntries, error: evError } = await query.order('evaluated_at', { ascending: false });
    if (evError) throw evError;

    // 3. Roll up evidence per topic area
    const topicAreaResults = (topicAreas || []).map((area) => {
      const areaEntries = (evidenceEntries || []).filter((e) => e.topic_area_id === area.id);

      if (areaEntries.length === 0) {
        return {
          topic_area_id: area.id,
          topic_area_name: area.name,
          evidence_count: 0,
          current_descriptor: null,
          current_descriptor_label: "Not Assessed",
          evidence: [],
        };
      }

      const totalScore = areaEntries.reduce((sum, e) => sum + (DESCRIPTOR_POINTS[e.descriptor] || 2), 0);
      const avgScore = totalScore / areaEntries.length;
      const computedDescriptor = scoreToDescriptor(avgScore);

      return {
        topic_area_id: area.id,
        topic_area_name: area.name,
        evidence_count: areaEntries.length,
        current_descriptor: computedDescriptor,
        current_descriptor_label: DESCRIPTOR_LABELS[computedDescriptor],
        evidence: areaEntries.map((e) => ({
          id: e.id,
          evidence_type: e.evidence_type,
          descriptor: e.descriptor,
          descriptor_label: DESCRIPTOR_LABELS[e.descriptor],
          teacher_notes: e.teacher_notes,
          evaluated_at: e.evaluated_at,
        })),
      };
    });

    // 4. Derived overall subject descriptor
    const assessedAreas = topicAreaResults.filter((a) => a.current_descriptor !== null);
    let overallDescriptor = null;
    if (assessedAreas.length > 0) {
      const totalAreaScores = assessedAreas.reduce((sum, a) => sum + DESCRIPTOR_POINTS[a.current_descriptor], 0);
      overallDescriptor = scoreToDescriptor(totalAreaScores / assessedAreas.length);
    }

    res.json({
      student_id: studentId,
      subject_id: subjectId,
      overall_descriptor: overallDescriptor,
      overall_descriptor_label: overallDescriptor ? DESCRIPTOR_LABELS[overallDescriptor] : "Not Assessed",
      topic_areas: topicAreaResults,
    });
  } catch (err) {
    console.error("getStudentSubjectTopicAssessments error:", err);
    res.status(500).json({ error: err.message });
  }
};
