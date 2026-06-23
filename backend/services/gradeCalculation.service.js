const supabase = require('../utils/supabaseClient.js');

async function calculateSubjectGrade(studentId, subjectId, classId, termId, institutionId) {
  const { data: gradeEntries, error: gradeError } = await supabase
    .from('grade_entries')
    .select('id, assessment_type_id, score, max_score, percentage')
    .eq('student_id', studentId)
    .eq('subject_id', subjectId)
    .eq('class_id', classId)
    .eq('term_id', termId)
    .eq('institution_id', institutionId);

  if (gradeError) throw new Error(`Failed to fetch grade entries: ${gradeError.message}`);

  const { data: subjectWeights, error: weightError } = await supabase
    .from('subject_weights')
    .select('id, assessment_type_id, weight')
    .eq('subject_id', subjectId)
    .eq('class_id', classId)
    .eq('term_id', termId)
    .eq('institution_id', institutionId);

  if (weightError) throw new Error(`Failed to fetch subject weights: ${weightError.message}`);

  if (!gradeEntries || gradeEntries.length === 0) {
    return { percentage: 0, letter_grade: 'N/A', gpa_points: 0, breakdown: [] };
  }

  const grouped = {};
  for (const entry of gradeEntries) {
    if (!grouped[entry.assessment_type_id]) {
      grouped[entry.assessment_type_id] = [];
    }
    grouped[entry.assessment_type_id].push(entry);
  }

  const weightMap = {};
  for (const sw of subjectWeights || []) {
    weightMap[sw.assessment_type_id] = sw.weight;
  }

  const breakdown = [];
  let totalSubjectPercentage = 0;

  for (const [assessmentTypeId, entries] of Object.entries(grouped)) {
    const avg = entries.reduce((sum, e) => sum + (e.percentage || 0), 0) / entries.length;
    const weight = weightMap[assessmentTypeId] || 0;
    const weightedContribution = (avg * weight) / 100;

    totalSubjectPercentage += weightedContribution;

    breakdown.push({
      assessment_type: assessmentTypeId,
      count: entries.length,
      average: Math.round(avg * 100) / 100,
      weight,
      weighted_contribution: Math.round(weightedContribution * 100) / 100,
    });
  }

  totalSubjectPercentage = Math.round(totalSubjectPercentage * 100) / 100;

  let letterGrade = 'N/A';
  let gpaPoints = 0;

  try {
    const { data: lgData, error: lgError } = await supabase.rpc('get_letter_grade', {
      p_percentage: totalSubjectPercentage,
      p_institution_id: institutionId,
    });
    if (!lgError && lgData) letterGrade = lgData;
  } catch (e) {
    letterGrade = 'N/A';
  }

  try {
    const { data: gpaData, error: gpaError } = await supabase.rpc('get_gpa_points', {
      p_percentage: totalSubjectPercentage,
      p_institution_id: institutionId,
    });
    if (!gpaError && gpaData !== null) gpaPoints = gpaData;
  } catch (e) {
    gpaPoints = 0;
  }

  return {
    percentage: totalSubjectPercentage,
    letter_grade: letterGrade,
    gpa_points: gpaPoints,
    breakdown,
  };
}

async function calculateStudentGPA(studentId, classId, termId, institutionId) {
  const { data: subjects, error: subjectError } = await supabase
    .from('grade_entries')
    .select('subject_id')
    .eq('student_id', studentId)
    .eq('class_id', classId)
    .eq('term_id', termId)
    .eq('institution_id', institutionId);

  if (subjectError) throw new Error(`Failed to fetch subjects: ${subjectError.message}`);

  const uniqueSubjectIds = [...new Set((subjects || []).map((s) => s.subject_id))];

  if (uniqueSubjectIds.length === 0) {
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

  for (const subjectId of uniqueSubjectIds) {
    const subjectGrade = await calculateSubjectGrade(studentId, subjectId, classId, termId, institutionId);

    const { data: subjectInfo } = await supabase
      .from('subjects')
      .select('id, title, credit_hours')
      .eq('id', subjectId)
      .single();

    subjectGrades.push({
      subject_id: subjectId,
      subject_name: subjectInfo?.title || 'Unknown',
      percentage: subjectGrade.percentage,
      letter_grade: subjectGrade.letter_grade,
      gpa_points: subjectGrade.gpa_points,
      credit_hours: subjectInfo?.credit_hours || 1,
    });

    if (subjectGrade.gpa_points > 0) {
      totalGpaPoints += subjectGrade.gpa_points;
      gpaCount++;
    }
    if (subjectGrade.percentage > 0) {
      totalPercentage += subjectGrade.percentage;
      percentageCount++;
    }
  }

  let gpa = 0;
  if (gpaCount > 0) {
    let totalWeightedGpa = 0;
    let totalCreditHours = 0;
    for (const sg of subjectGrades) {
      if (sg.gpa_points > 0) {
        totalWeightedGpa += sg.gpa_points * sg.credit_hours;
        totalCreditHours += sg.credit_hours;
      }
    }
    gpa = totalCreditHours > 0 ? Math.round((totalWeightedGpa / totalCreditHours) * 100) / 100 : 0;
  }

  const percentageAverage = percentageCount > 0 ? Math.round((totalPercentage / percentageCount) * 100) / 100 : 0;

  let letterGrade = 'N/A';
  try {
    const { data: lgData, error: lgError } = await supabase.rpc('get_letter_grade', {
      p_percentage: percentageAverage,
      p_institution_id: institutionId,
    });
    if (!lgError && lgData) letterGrade = lgData;
  } catch (e) {
    letterGrade = 'N/A';
  }

  return {
    gpa,
    percentage_average: percentageAverage,
    letter_grade: letterGrade,
    subject_grades: subjectGrades,
  };
}

async function calculateClassRankings(classId, termId, institutionId) {
  const { data: classEnrollments, error: enrollError } = await supabase
    .from('class_enrollments')
    .select('student_id')
    .eq('class_id', classId)
    .eq('institution_id', institutionId);

  if (enrollError) throw new Error(`Failed to fetch class enrollments: ${enrollError.message}`);

  if (!classEnrollments || classEnrollments.length === 0) return [];

  const rankings = [];

  for (const enrollment of classEnrollments) {
    const studentGpa = await calculateStudentGPA(enrollment.student_id, classId, termId, institutionId);
    rankings.push({
      student_id: enrollment.student_id,
      gpa: studentGpa.gpa,
      percentage: studentGpa.percentage_average,
      rank: 0,
    });
  }

  rankings.sort((a, b) => {
    if (b.gpa !== a.gpa) return b.gpa - a.gpa;
    return b.percentage - a.percentage;
  });

  let currentRank = 1;
  for (let i = 0; i < rankings.length; i++) {
    if (i > 0 && rankings[i].gpa === rankings[i - 1].gpa && rankings[i].percentage === rankings[i - 1].percentage) {
      rankings[i].rank = rankings[i - 1].rank;
    } else {
      rankings[i].rank = currentRank;
    }
    currentRank++;
  }

  return rankings;
}

async function generateReportCard(studentId, classId, termId, institutionId) {
  const studentGpa = await calculateStudentGPA(studentId, classId, termId, institutionId);
  const rankings = await calculateClassRankings(classId, termId, institutionId);
  const studentRanking = rankings.find((r) => r.student_id === studentId);

  const { data: term, error: termError } = await supabase
    .from('terms')
    .select('start_date, end_date')
    .eq('id', termId)
    .eq('institution_id', institutionId)
    .single();

  if (termError || !term) {
    throw new Error(`Failed to resolve term date range: ${termError?.message || 'term not found'}`);
  }

  const { data: attendanceData, error: attendanceError } = await supabase
    .from('attendance')
    .select('id, date')
    .eq('student_id', studentId)
    .eq('class_id', classId)
    .eq('institution_id', institutionId)
    .gte('date', term.start_date)
    .lte('date', term.end_date)
    .eq('status', 'present');

  if (attendanceError) throw new Error(`Failed to fetch attendance: ${attendanceError.message}`);

  const { data: allAttendanceDates, error: dateError } = await supabase
    .from('attendance')
    .select('date')
    .eq('class_id', classId)
    .eq('institution_id', institutionId)
    .gte('date', term.start_date)
    .lte('date', term.end_date);

  if (dateError) throw new Error(`Failed to fetch attendance dates: ${dateError.message}`);

  const totalSchoolDays = new Set((allAttendanceDates || []).map((a) => a.date)).size;
  const daysAttended = (attendanceData || []).length;

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
    updated_at: new Date().toISOString(),
  };

  const legacyReportCardData = {
    student_id: studentId,
    class_id: classId,
    term_id: termId,
    institution_id: institutionId,
    total_gpa: studentGpa.gpa,
    overall_average: studentGpa.percentage_average,
    class_rank: studentRanking?.rank || 0,
    total_students: rankings.length,
    days_attended: daysAttended,
    total_school_days: totalSchoolDays,
    generated_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { data: existingCard } = await supabase
    .from('report_cards')
    .select('id')
    .eq('student_id', studentId)
    .eq('class_id', classId)
    .eq('term_id', termId)
    .eq('institution_id', institutionId)
    .maybeSingle();

  let reportCard;
  if (existingCard) {
    let { data, error } = await supabase
      .from('report_cards')
      .update(reportCardData)
      .eq('id', existingCard.id)
      .select()
      .single();

    if (error && /column .* does not exist/i.test(error.message || '')) {
      const fallback = await supabase
        .from('report_cards')
        .update(legacyReportCardData)
        .eq('id', existingCard.id)
        .select()
        .single();
      data = fallback.data;
      error = fallback.error;
    }

    if (error) throw new Error(`Failed to update report card: ${error.message}`);
    reportCard = data;
  } else {
    let { data, error } = await supabase
      .from('report_cards')
      .insert(reportCardData)
      .select()
      .single();

    if (error && /column .* does not exist/i.test(error.message || '')) {
      const fallback = await supabase
        .from('report_cards')
        .insert(legacyReportCardData)
        .select()
        .single();
      data = fallback.data;
      error = fallback.error;
    }

    if (error) throw new Error(`Failed to create report card: ${error.message}`);
    reportCard = data;
  }

  await supabase
    .from('report_card_items')
    .delete()
    .eq('report_card_id', reportCard.id);

  const reportCardItems = studentGpa.subject_grades.map((sg) => ({
    report_card_id: reportCard.id,
    subject_id: sg.subject_id,
    subject_name: sg.subject_name,
    total_score: sg.total_score || sg.percentage,
    average_percentage: sg.percentage,
    letter_grade: sg.letter_grade,
    gpa_points: sg.gpa_points,
    class_average: sg.class_average || null,
    rank_in_subject: sg.rank_in_subject || null,
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

async function generateAllReportCards(classId, termId, institutionId) {
  const { data: classEnrollments, error: enrollError } = await supabase
    .from('class_enrollments')
    .select('student_id')
    .eq('class_id', classId)
    .eq('institution_id', institutionId);

  if (enrollError) throw new Error(`Failed to fetch class enrollments: ${enrollError.message}`);

  const students = classEnrollments || [];
  let generated = 0;
  let failed = 0;

  for (const student of students) {
    try {
      await generateReportCard(student.student_id, classId, termId, institutionId);
      generated++;
    } catch (e) {
      failed++;
    }
  }

  return {
    total: students.length,
    generated,
    failed,
  };
}

async function checkGradeCompleteness(classId, termId, institutionId) {
  const { data: classEnrollments, error: enrollError } = await supabase
    .from('class_enrollments')
    .select('student_id')
    .eq('class_id', classId)
    .eq('institution_id', institutionId);

  if (enrollError) throw new Error(`Failed to fetch class enrollments: ${enrollError.message}`);

  const { data: subjects, error: subjectError } = await supabase
    .from('subjects')
    .select('id, title')
    .eq('class_id', classId)
    .eq('institution_id', institutionId);

  if (subjectError) throw new Error(`Failed to fetch class subjects: ${subjectError.message}`);

  const missing = [];

  for (const enrollment of classEnrollments || []) {
    for (const subject of subjects || []) {
      const subjectId = subject.id;
      const subjectName = subject.title || 'Unknown';

      const { data: requiredWeights } = await supabase
        .from('subject_weights')
        .select('assessment_type_id, assessment_types(id, name)')
        .eq('subject_id', subjectId)
        .eq('class_id', classId)
        .eq('term_id', termId)
        .eq('institution_id', institutionId);

      for (const weight of requiredWeights || []) {
        const { count, error: countError } = await supabase
          .from('grade_entries')
          .select('id', { count: 'exact', head: true })
          .eq('student_id', enrollment.student_id)
          .eq('subject_id', subjectId)
          .eq('class_id', classId)
          .eq('term_id', termId)
          .eq('assessment_type_id', weight.assessment_type_id)
          .eq('institution_id', institutionId);

        if (!countError && (!count || count === 0)) {
          missing.push({
            student_id: enrollment.student_id,
            student_name: 'Student ' + enrollment.student_id,
            subject_id: subjectId,
            subject_name: subjectName,
            assessment_type_id: weight.assessment_type_id,
            assessment_type_name: weight.assessment_types?.name || 'Unknown',
          });
        }
      }
    }
  }

  return {
    complete: missing.length === 0,
    missing,
  };
}

module.exports = {
  calculateSubjectGrade,
  calculateStudentGPA,
  calculateClassRankings,
  generateReportCard,
  generateAllReportCards,
  checkGradeCompleteness,
};
