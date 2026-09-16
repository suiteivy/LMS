const supabase = require('../utils/supabaseClient.js');

/**
 * Resolves the category-level assessment weights (Exam vs Continuous Assessment)
 * for a given institution and optional subject. Defaults to 60/40 if not configured.
 */
async function resolveAssessmentWeights(institutionId, subjectId = null) {
  const defaultWeights = { exam_weight: 60, continuous_assessment_weight: 40 };
  if (!institutionId) return defaultWeights;

  try {
    // 1. Try per-subject override first if subjectId provided
    if (subjectId) {
      const { data: subjectRow, error: subjErr } = await supabase
        .from('institution_assessment_weights')
        .select('exam_weight, continuous_assessment_weight')
        .eq('institution_id', institutionId)
        .eq('subject_id', subjectId)
        .maybeSingle();

      if (!subjErr && subjectRow) {
        return {
          exam_weight: Number(subjectRow.exam_weight),
          continuous_assessment_weight: Number(subjectRow.continuous_assessment_weight),
        };
      }
    }

    // 2. Try institution default (where subject_id IS NULL)
    const { data: instRow, error: instErr } = await supabase
      .from('institution_assessment_weights')
      .select('exam_weight, continuous_assessment_weight')
      .eq('institution_id', institutionId)
      .is('subject_id', null)
      .maybeSingle();

    if (!instErr && instRow) {
      return {
        exam_weight: Number(instRow.exam_weight),
        continuous_assessment_weight: Number(instRow.continuous_assessment_weight),
      };
    }
  } catch (err) {
    console.warn('Failed to resolve assessment weights from DB, using defaults:', err.message);
  }

  return defaultWeights;
}

/**
 * Resolves all subjects linked to a class and/or enrolled for a student.
 */
async function getSubjectsForClassAndStudent(studentId, classId, institutionId) {
  try {
    // 1. Subjects directly linked to class_id
    const { data: directSubjects } = await supabase
      .from('subjects')
      .select('id, title, credit_hours')
      .eq('class_id', classId)
      .eq('institution_id', institutionId);

    // 2. Subjects linked via subject_classes join table
    let linkedSubjectIds = [];
    try {
      const { data: scData } = await supabase
        .from('subject_classes')
        .select('subject_id')
        .eq('class_id', classId)
        .eq('institution_id', institutionId);
      if (scData) {
        linkedSubjectIds = scData.map((s) => s.subject_id).filter(Boolean);
      }
    } catch (_e) {}

    // 3. Student subject enrollments
    let enrolledSubjectIds = [];
    try {
      const { data: enData } = await supabase
        .from('enrollments')
        .select('subject_id')
        .eq('student_id', studentId)
        .eq('institution_id', institutionId)
        .eq('status', 'enrolled');
      if (enData) {
        enrolledSubjectIds = enData.map((e) => e.subject_id).filter(Boolean);
      }
    } catch (_e) {}

    const allSubjectIds = Array.from(
      new Set([
        ...(directSubjects || []).map((s) => s.id),
        ...linkedSubjectIds,
        ...enrolledSubjectIds,
      ].filter(Boolean))
    );

    if (allSubjectIds.length === 0) {
      return directSubjects || [];
    }

    const { data: allSubjects } = await supabase
      .from('subjects')
      .select('id, title, credit_hours')
      .in('id', allSubjectIds)
      .eq('institution_id', institutionId);

    return allSubjects || directSubjects || [];
  } catch (err) {
    console.error('getSubjectsForClassAndStudent error:', err);
    return [];
  }
}

/**
 * Calculates a single subject grade for a student in a class and term.
 * Incorporates:
 * - Mandatory Exam results from `exams` and `exam_results`
 * - Subject Teacher selected Continuous Assessments from `assignments`/`submissions` and `grade_entries`
 * - Configurable category weighting (default 60/40)
 * - Dynamic institution grading scales
 */
async function calculateSubjectGrade(studentId, subjectId, classId, termId, institutionId) {
  // 1. Resolve category weights
  const weights = await resolveAssessmentWeights(institutionId, subjectId);
  const examWeightRatio = weights.exam_weight;
  const caWeightRatio = weights.continuous_assessment_weight;

  // 2. Fetch Term info to scope by dates/names if needed
  let termInfo = null;
  if (termId) {
    const { data: tData } = await supabase
      .from('terms')
      .select('id, name, start_date, end_date')
      .eq('id', termId)
      .maybeSingle();
    termInfo = tData;
  }

  const breakdown = [];

  // -------------------------------------------------------------------------
  // A. MANDATORY EXAM RESULTS
  // -------------------------------------------------------------------------
  let examScore = null;
  let examMaxScore = 100;
  let examPercentage = null;
  let examCompetencyBand = null;
  let hasExam = false;

  try {
    let examQuery = supabase
      .from('exams')
      .select('id, title, max_score, weight, term_id, term, date')
      .eq('subject_id', subjectId)
      .eq('institution_id', institutionId);

    const { data: examsList } = await examQuery;

    // Filter exams by matching term_id, term name, or date in term range
    const matchedExams = (examsList || []).filter((e) => {
      if (termId && e.term_id === termId) return true;
      if (termInfo?.name && e.term && e.term.toLowerCase() === termInfo.name.toLowerCase()) return true;
      if (termInfo?.start_date && termInfo?.end_date && e.date) {
        return e.date >= termInfo.start_date && e.date <= termInfo.end_date;
      }
      return false;
    });

    if (matchedExams.length > 0) {
      const examIds = matchedExams.map((e) => e.id);
      const { data: results } = await supabase
        .from('exam_results')
        .select('exam_id, score, competency_band')
        .in('exam_id', examIds)
        .eq('student_id', studentId)
        .eq('institution_id', institutionId);

      if (results && results.length > 0) {
        // Average if multiple exams, or take the primary exam
        let totalPct = 0;
        let validCount = 0;
        for (const res of results) {
          const matchedExam = matchedExams.find((e) => e.id === res.exam_id);
          const max = Number(matchedExam?.max_score) || 100;
          const sc = Number(res.score);
          if (!isNaN(sc)) {
            const pct = max > 0 ? (sc / max) * 100 : 0;
            totalPct += pct;
            validCount++;
            examScore = sc;
            examMaxScore = max;
            examCompetencyBand = res.competency_band || examCompetencyBand;

            breakdown.push({
              assessment_type: 'exam',
              title: matchedExam?.title ? `${matchedExam.title} (Exam - Mandatory)` : 'Examination (Mandatory)',
              score: sc,
              max_score: max,
              percentage: Math.round(pct * 100) / 100,
              is_mandatory: true,
              weight: examWeightRatio,
            });
          }
        }
        if (validCount > 0) {
          examPercentage = totalPct / validCount;
          hasExam = true;
        }
      }
    }
  } catch (err) {
    console.warn('Error fetching exam results in calculateSubjectGrade:', err.message);
  }

  // -------------------------------------------------------------------------
  // B. CONTINUOUS ASSESSMENTS (Teacher Selected)
  // -------------------------------------------------------------------------
  let caTotalPercentage = 0;
  let caItemsCount = 0;
  let hasCA = false;

  try {
    // 1. Check if teacher has explicitly chosen assessments for this class/subject/term
    const { data: selectionRows } = await supabase
      .from('subject_report_card_assessments')
      .select('assessment_id, is_included')
      .eq('institution_id', institutionId)
      .eq('subject_id', subjectId)
      .eq('class_id', classId)
      .eq('term_id', termId);

    const hasExplicitSelection = Array.isArray(selectionRows) && selectionRows.length > 0;
    const includedAssessmentIds = new Set(
      (selectionRows || []).filter((r) => r.is_included).map((r) => r.assessment_id)
    );

    // 2. Fetch Assignments for this subject/class
    let assignmentQuery = supabase
      .from('assignments')
      .select('id, title, total_points, weight, term_id, term')
      .eq('subject_id', subjectId)
      .eq('institution_id', institutionId);

    if (classId) assignmentQuery = assignmentQuery.eq('class_id', classId);
    const { data: allAssignments } = await assignmentQuery;

    const termAssignments = (allAssignments || []).filter((a) => {
      if (termId && a.term_id === termId) return true;
      if (termInfo?.name && a.term && a.term.toLowerCase() === termInfo.name.toLowerCase()) return true;
      return true; // include if no explicit term tag to not lose data
    });

    // Determine which assignments to include:
    // If teacher made explicit selections, use only included. If not yet customized, include all.
    const eligibleAssignments = termAssignments.filter((a) => {
      if (hasExplicitSelection) {
        return includedAssessmentIds.has(a.id);
      }
      return true;
    });

    if (eligibleAssignments.length > 0) {
      const eligibleIds = eligibleAssignments.map((a) => a.id);
      const { data: submissions } = await supabase
        .from('submissions')
        .select('assignment_id, grade')
        .in('assignment_id', eligibleIds)
        .eq('student_id', studentId)
        .not('grade', 'is', null);

      for (const sub of (submissions || [])) {
        const assign = eligibleAssignments.find((a) => a.id === sub.assignment_id);
        const maxPts = Number(assign?.total_points) || 100;
        const score = Number(sub.grade);
        if (!isNaN(score)) {
          const pct = maxPts > 0 ? (score / maxPts) * 100 : 0;
          caTotalPercentage += pct;
          caItemsCount++;
          hasCA = true;

          breakdown.push({
            assessment_type: 'assignment',
            title: assign?.title || 'Continuous Assessment',
            score,
            max_score: maxPts,
            percentage: Math.round(pct * 100) / 100,
            is_mandatory: false,
            weight: assign?.weight || null,
          });
        }
      }
    }

    // 3. Also check legacy grade_entries if any exist
    const { data: gradeEntries } = await supabase
      .from('grade_entries')
      .select('id, score, max_score, percentage, assessment_types(name)')
      .eq('student_id', studentId)
      .eq('subject_id', subjectId)
      .eq('class_id', classId)
      .eq('term_id', termId)
      .eq('institution_id', institutionId);

    for (const ge of (gradeEntries || [])) {
      if (hasExplicitSelection && !includedAssessmentIds.has(ge.id)) {
        continue; // Teacher explicitly unselected
      }
      const pct = Number(ge.percentage) || (ge.max_score > 0 ? (Number(ge.score) / Number(ge.max_score)) * 100 : 0);
      caTotalPercentage += pct;
      caItemsCount++;
      hasCA = true;

      breakdown.push({
        assessment_type: 'grade_entry',
        title: ge.assessment_types?.name || 'Grade Assessment',
        score: Number(ge.score),
        max_score: Number(ge.max_score) || 100,
        percentage: Math.round(pct * 100) / 100,
        is_mandatory: false,
      });
    }
  } catch (err) {
    console.warn('Error fetching CA in calculateSubjectGrade:', err.message);
  }

  // -------------------------------------------------------------------------
  // C. COMBINE EXAM AND CA ACCORDING TO CONFIGURABLE CATEGORY SPLIT
  // -------------------------------------------------------------------------
  let finalPercentage = 0;
  const caAveragePct = caItemsCount > 0 ? caTotalPercentage / caItemsCount : null;

  if (hasExam && hasCA && caAveragePct !== null) {
    // Both exam and CA present: apply configured split
    finalPercentage = (examPercentage * (examWeightRatio / 100)) + (caAveragePct * (caWeightRatio / 100));
  } else if (hasExam && (!hasCA || caAveragePct === null)) {
    // Only exam present: exam accounts for 100%
    finalPercentage = examPercentage;
  } else if (!hasExam && hasCA && caAveragePct !== null) {
    // Only CA present: CA accounts for 100%
    finalPercentage = caAveragePct;
  } else {
    // Neither recorded: score remains 0 / N/A
    finalPercentage = 0;
  }

  finalPercentage = Math.round(finalPercentage * 100) / 100;

  // -------------------------------------------------------------------------
  // D. RESOLVE LETTER GRADE & GPA POINTS FROM INSTITUTION GRADING SCALES
  // -------------------------------------------------------------------------
  let letterGrade = 'N/A';
  let gpaPoints = 0;

  if (hasExam || hasCA) {
    try {
      const { data: scales } = await supabase
        .from('grading_scales')
        .select('*')
        .eq('institution_id', institutionId)
        .eq('is_active', true)
        .order('min_score', { ascending: false });

      if (scales && scales.length > 0) {
        const match = scales.find(
          (s) => finalPercentage >= Number(s.min_score) && finalPercentage <= Number(s.max_score)
        );
        if (match) {
          letterGrade = match.letter_grade || match.name || 'N/A';
          gpaPoints = match.gpa_points !== null && match.gpa_points !== undefined ? Number(match.gpa_points) : 0;
        } else if (finalPercentage >= Number(scales[0].max_score)) {
          letterGrade = scales[0].letter_grade || scales[0].name || 'A';
          gpaPoints = Number(scales[0].gpa_points || 4.0);
        } else {
          const lowest = scales[scales.length - 1];
          letterGrade = lowest.letter_grade || lowest.name || 'F';
          gpaPoints = Number(lowest.gpa_points || 0);
        }
      } else {
        // Standard default thresholds
        if (finalPercentage >= 80) { letterGrade = 'A'; gpaPoints = 4.0; }
        else if (finalPercentage >= 70) { letterGrade = 'B'; gpaPoints = 3.0; }
        else if (finalPercentage >= 60) { letterGrade = 'C'; gpaPoints = 2.0; }
        else if (finalPercentage >= 50) { letterGrade = 'D'; gpaPoints = 1.0; }
        else { letterGrade = 'E'; gpaPoints = 0; }
      }
    } catch (_e) {
      letterGrade = 'N/A';
      gpaPoints = 0;
    }
  }

  return {
    percentage: hasExam || hasCA ? finalPercentage : 0,
    has_data: hasExam || hasCA,
    exam_percentage: examPercentage,
    ca_average: caAveragePct,
    letter_grade: letterGrade,
    gpa_points: gpaPoints,
    breakdown,
    weights_used: {
      exam_weight: examWeightRatio,
      continuous_assessment_weight: caWeightRatio,
    },
  };
}

/**
 * Calculates overall GPA, average percentage, and per-subject breakdown for a student.
 */
async function calculateStudentGPA(studentId, classId, termId, institutionId) {
  const subjects = await getSubjectsForClassAndStudent(studentId, classId, institutionId);

  if (!subjects || subjects.length === 0) {
    return {
      gpa: 0,
      percentage_average: 0,
      letter_grade: 'N/A',
      subject_grades: [],
    };
  }

  const subjectGrades = [];
  let totalGpaPoints = 0;
  let totalPercentage = 0;
  let gpaCount = 0;
  let percentageCount = 0;

  for (const subject of subjects) {
    const subjectGrade = await calculateSubjectGrade(studentId, subject.id, classId, termId, institutionId);

    subjectGrades.push({
      subject_id: subject.id,
      subject_name: subject.title || 'Unknown Subject',
      percentage: subjectGrade.percentage,
      total_score: subjectGrade.percentage,
      letter_grade: subjectGrade.letter_grade,
      gpa_points: subjectGrade.gpa_points,
      credit_hours: subject.credit_hours || 1,
      breakdown: subjectGrade.breakdown,
      has_data: subjectGrade.has_data,
    });

    if (subjectGrade.has_data) {
      if (subjectGrade.gpa_points >= 0) {
        totalGpaPoints += subjectGrade.gpa_points * (subject.credit_hours || 1);
        gpaCount += (subject.credit_hours || 1);
      }
      totalPercentage += subjectGrade.percentage;
      percentageCount++;
    }
  }

  const gpa = gpaCount > 0 ? Math.round((totalGpaPoints / gpaCount) * 100) / 100 : 0;
  const percentageAverage = percentageCount > 0 ? Math.round((totalPercentage / percentageCount) * 100) / 100 : 0;

  // Determine overall letter grade from active scale
  let overallLetter = 'N/A';
  try {
    const { data: scales } = await supabase
      .from('grading_scales')
      .select('*')
      .eq('institution_id', institutionId)
      .eq('is_active', true)
      .order('min_score', { ascending: false });

    if (scales && scales.length > 0) {
      const match = scales.find(
        (s) => percentageAverage >= Number(s.min_score) && percentageAverage <= Number(s.max_score)
      );
      if (match) overallLetter = match.letter_grade || match.name || 'N/A';
    }
  } catch (_e) {}

  return {
    gpa,
    percentage_average: percentageAverage,
    letter_grade: overallLetter,
    subject_grades: subjectGrades,
  };
}

/**
 * Calculates rankings for all students in a class for a given term.
 */
async function calculateClassRankings(classId, termId, institutionId) {
  // Fetch enrolled students for class
  const { data: classEnrollments } = await supabase
    .from('class_enrollments')
    .select('student_id')
    .eq('class_id', classId)
    .eq('institution_id', institutionId);

  let studentIds = (classEnrollments || []).map((e) => e.student_id).filter(Boolean);

  // Fallback: check students table if class_enrollments is empty
  if (studentIds.length === 0) {
    const { data: students } = await supabase
      .from('students')
      .select('id')
      .eq('class_id', classId)
      .eq('institution_id', institutionId);
    studentIds = (students || []).map((s) => s.id).filter(Boolean);
  }

  if (studentIds.length === 0) return [];

  const rankings = [];
  for (const sId of studentIds) {
    const studentGpa = await calculateStudentGPA(sId, classId, termId, institutionId);
    rankings.push({
      student_id: sId,
      gpa: studentGpa.gpa,
      percentage: studentGpa.percentage_average,
      rank: 0,
    });
  }

  rankings.sort((a, b) => {
    if (b.percentage !== a.percentage) return b.percentage - a.percentage;
    return b.gpa - a.gpa;
  });

  let currentRank = 1;
  for (let i = 0; i < rankings.length; i++) {
    if (i > 0 && rankings[i].percentage === rankings[i - 1].percentage) {
      rankings[i].rank = rankings[i - 1].rank;
    } else {
      rankings[i].rank = currentRank;
    }
    currentRank++;
  }

  return rankings;
}

/**
 * Generates or regenerates a report card for a single student.
 */
async function generateReportCard(studentId, classId, termId, institutionId) {
  const studentGpa = await calculateStudentGPA(studentId, classId, termId, institutionId);
  const rankings = await calculateClassRankings(classId, termId, institutionId);
  const studentRanking = rankings.find((r) => r.student_id === studentId);

  // Term date bounds for attendance
  let totalSchoolDays = 0;
  let daysAttended = 0;

  try {
    const { data: term } = await supabase
      .from('terms')
      .select('start_date, end_date')
      .eq('id', termId)
      .eq('institution_id', institutionId)
      .single();

    if (term?.start_date && term?.end_date) {
      const { data: attendanceData } = await supabase
        .from('attendance')
        .select('id, date')
        .eq('student_id', studentId)
        .eq('class_id', classId)
        .eq('institution_id', institutionId)
        .gte('date', term.start_date)
        .lte('date', term.end_date)
        .eq('status', 'present');

      const { data: allAttendanceDates } = await supabase
        .from('attendance')
        .select('date')
        .eq('class_id', classId)
        .eq('institution_id', institutionId)
        .gte('date', term.start_date)
        .lte('date', term.end_date);

      totalSchoolDays = new Set((allAttendanceDates || []).map((a) => a.date)).size;
      daysAttended = (attendanceData || []).length;
    }
  } catch (_e) {}

  const reportCardData = {
    student_id: studentId,
    class_id: classId,
    term_id: termId,
    institution_id: institutionId,
    gpa: studentGpa.gpa,
    average_percentage: studentGpa.percentage_average,
    letter_grade: studentGpa.letter_grade,
    rank_in_class: studentRanking?.rank || 0,
    total_students_in_class: rankings.length,
    attendance_count: daysAttended,
    total_school_days: totalSchoolDays,
    status: 'draft',
    updated_at: new Date().toISOString(),
  };

  const { data: existingCard } = await supabase
    .from('report_cards')
    .select('id, status, teacher_remarks, admin_remarks')
    .eq('student_id', studentId)
    .eq('class_id', classId)
    .eq('term_id', termId)
    .eq('institution_id', institutionId)
    .maybeSingle();

  let reportCard;
  if (existingCard) {
    // Preserve existing remarks and status if already advanced
    const updatePayload = {
      ...reportCardData,
      status: existingCard.status || 'draft',
    };
    const { data, error } = await supabase
      .from('report_cards')
      .update(updatePayload)
      .eq('id', existingCard.id)
      .select()
      .single();

    if (error) throw new Error(`Failed to update report card: ${error.message}`);
    reportCard = data;
  } else {
    const { data, error } = await supabase
      .from('report_cards')
      .insert(reportCardData)
      .select()
      .single();

    if (error) throw new Error(`Failed to create report card: ${error.message}`);
    reportCard = data;
  }

  // Clear existing items and insert refreshed subject items
  await supabase
    .from('report_card_items')
    .delete()
    .eq('report_card_id', reportCard.id);

  const reportCardItems = studentGpa.subject_grades.map((sg) => ({
    report_card_id: reportCard.id,
    subject_id: sg.subject_id,
    subject_name: sg.subject_name,
    total_score: sg.percentage,
    average_percentage: sg.percentage,
    letter_grade: sg.letter_grade,
    gpa_points: sg.gpa_points,
  }));

  if (reportCardItems.length > 0) {
    const { error: itemError } = await supabase
      .from('report_card_items')
      .insert(reportCardItems);
    if (itemError) throw new Error(`Failed to create report card items: ${itemError.message}`);
  }

  return {
    ...reportCard,
    subject_grades: studentGpa.subject_grades,
  };
}

/**
 * Generates report cards for all students in a class.
 */
async function generateAllReportCards(classId, termId, institutionId) {
  // Fetch enrolled students
  const { data: classEnrollments } = await supabase
    .from('class_enrollments')
    .select('student_id')
    .eq('class_id', classId)
    .eq('institution_id', institutionId);

  let studentIds = (classEnrollments || []).map((e) => e.student_id).filter(Boolean);

  if (studentIds.length === 0) {
    const { data: students } = await supabase
      .from('students')
      .select('id')
      .eq('class_id', classId)
      .eq('institution_id', institutionId);
    studentIds = (students || []).map((s) => s.id).filter(Boolean);
  }

  let generated = 0;
  let failed = 0;

  for (const sId of studentIds) {
    try {
      await generateReportCard(sId, classId, termId, institutionId);
      generated++;
    } catch (e) {
      console.error(`Failed to generate report card for student ${sId}:`, e.message);
      failed++;
    }
  }

  return {
    total: studentIds.length,
    generated,
    failed,
  };
}

/**
 * Checks grade completeness across subjects in a class.
 */
async function checkGradeCompleteness(classId, termId, institutionId) {
  const subjects = await getSubjectsForClassAndStudent(null, classId, institutionId);
  const missing = [];

  // Check enrolled students
  const { data: classEnrollments } = await supabase
    .from('class_enrollments')
    .select('student_id')
    .eq('class_id', classId)
    .eq('institution_id', institutionId);

  let studentIds = (classEnrollments || []).map((e) => e.student_id).filter(Boolean);

  if (studentIds.length === 0) {
    const { data: students } = await supabase
      .from('students')
      .select('id')
      .eq('class_id', classId)
      .eq('institution_id', institutionId);
    studentIds = (students || []).map((s) => s.id).filter(Boolean);
  }

  for (const sId of studentIds) {
    for (const subj of subjects) {
      const subjectGrade = await calculateSubjectGrade(sId, subj.id, classId, termId, institutionId);
      if (!subjectGrade.has_data) {
        missing.push({
          student_id: sId,
          student_name: 'Student ID ' + sId,
          subject_id: subj.id,
          subject_name: subj.title || 'Subject',
          assessment_type_name: 'Exam or Coursework',
        });
      }
    }
  }

  return {
    complete: missing.length === 0,
    missing,
  };
}

module.exports = {
  resolveAssessmentWeights,
  getSubjectsForClassAndStudent,
  calculateSubjectGrade,
  calculateStudentGPA,
  calculateClassRankings,
  generateReportCard,
  generateAllReportCards,
  checkGradeCompleteness,
};
