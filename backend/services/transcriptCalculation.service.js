const supabase = require('../utils/supabaseClient.js');
const { formatCurrencyAmount } = require('../utils/currency.js');
const {
  getSubjectsForClassAndStudent,
  calculateSubjectGrade,
} = require('./gradeCalculation.service.js');

/**
 * Normalizes string or number to fixed float
 */
function toNum(val, fallback = 0) {
  const n = Number(val);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Resolves active grading scales for an institution and student.
 */
async function resolveGradingScale(institutionId, studentId = null) {
  let studentScaleId = null;

  if (studentId) {
    const { data: student } = await supabase
      .from('students')
      .select('grading_scale_id')
      .eq('id', studentId)
      .maybeSingle();
    studentScaleId = student?.grading_scale_id || null;
  }

  if (studentScaleId) {
    const { data: studentScales } = await supabase
      .from('grading_scales')
      .select('*')
      .eq('id', studentScaleId)
      .eq('institution_id', institutionId);

    if (studentScales && studentScales.length > 0) {
      return studentScales.sort((a, b) => b.min_score - a.min_score);
    }
  }

  const { data: instScales } = await supabase
    .from('grading_scales')
    .select('*')
    .eq('institution_id', institutionId)
    .eq('is_active', true)
    .order('min_score', { ascending: false });

  if (instScales && instScales.length > 0) {
    return instScales;
  }

  // Sensible default percentage scale
  return [
    { letter_grade: 'A', min_score: 80, max_score: 100, gpa_points: 4.0, description: 'Excellent' },
    { letter_grade: 'B', min_score: 65, max_score: 79.99, gpa_points: 3.0, description: 'Good' },
    { letter_grade: 'C', min_score: 50, max_score: 64.99, gpa_points: 2.0, description: 'Average' },
    { letter_grade: 'D', min_score: 40, max_score: 49.99, gpa_points: 1.0, description: 'Pass' },
    { letter_grade: 'E', min_score: 0, max_score: 39.99, gpa_points: 0.0, description: 'Fail' },
  ];
}

/**
 * Determines if a scale is descriptor-based (CBC) vs numeric/letter.
 */
function isDescriptorScale(scales) {
  if (!Array.isArray(scales) || scales.length === 0) return false;
  return scales.some((s) => {
    const text = `${s.letter_grade || ''} ${s.description || ''} ${s.name || ''}`.toLowerCase();
    return text.includes('expectation') || text.includes('competency');
  });
}

/**
 * Maps a score or descriptor to the appropriate scale entry.
 */
function mapScoreToScale(score, scales) {
  if (!scales || scales.length === 0) {
    return { letter_grade: 'N/A', gpa_points: 0, description: '' };
  }

  const num = toNum(score, 0);
  const match = scales.find(
    (s) => num >= Number(s.min_score) && num <= Number(s.max_score)
  );

  if (match) {
    return {
      letter_grade: match.letter_grade || match.name || 'N/A',
      gpa_points: match.gpa_points != null ? Number(match.gpa_points) : 0,
      description: match.description || '',
    };
  }

  if (num >= Number(scales[0].max_score)) {
    return {
      letter_grade: scales[0].letter_grade || scales[0].name || 'A',
      gpa_points: scales[0].gpa_points != null ? Number(scales[0].gpa_points) : 4.0,
      description: scales[0].description || '',
    };
  }

  const lowest = scales[scales.length - 1];
  return {
    letter_grade: lowest.letter_grade || lowest.name || 'E',
    gpa_points: lowest.gpa_points != null ? Number(lowest.gpa_points) : 0,
    description: lowest.description || '',
  };
}

/**
 * Calculates scale-appropriate summary (numeric averages OR descriptor distribution).
 */
function calculateScaleSummary(subjectResults, scales, configSummaryFormat = 'auto') {
  const isDesc = configSummaryFormat === 'descriptor_distribution' || 
    (configSummaryFormat === 'auto' && isDescriptorScale(scales));

  const validSubjects = subjectResults.filter((s) => s.has_data);
  const totalEvaluated = validSubjects.length;

  if (totalEvaluated === 0) {
    return {
      scale_type: isDesc ? 'descriptor' : 'numeric',
      total_subjects: subjectResults.length,
      total_evaluated: 0,
      average_percentage: null,
      mean_grade: 'N/A',
      gpa: 0,
      descriptor_distribution: [],
      dominant_standing: 'No Evaluations Yet',
      headline: 'No evaluations recorded for this period',
    };
  }

  if (isDesc) {
    // CBC / Descriptor Distribution
    const counts = {
      'Exceeding Expectation': 0,
      'Meeting Expectation': 0,
      'Approaching Expectation': 0,
      'Below Expectation': 0,
    };

    validSubjects.forEach((s) => {
      const g = (s.letter_grade || '').trim().toLowerCase();
      if (g.includes('exceeding') || g === 'ee') {
        counts['Exceeding Expectation']++;
      } else if (g.includes('meeting') || g === 'me') {
        counts['Meeting Expectation']++;
      } else if (g.includes('approaching') || g === 'ae') {
        counts['Approaching Expectation']++;
      } else if (g.includes('below') || g === 'be') {
        counts['Below Expectation']++;
      } else {
        // Fallback by percentage if letter_grade was not preset as descriptor
        const pct = toNum(s.percentage, 0);
        if (pct >= 80) counts['Exceeding Expectation']++;
        else if (pct >= 60) counts['Meeting Expectation']++;
        else if (pct >= 40) counts['Approaching Expectation']++;
        else counts['Below Expectation']++;
      }
    });

    const distribution = [
      {
        level: 'Exceeding Expectation',
        short_code: 'EE',
        count: counts['Exceeding Expectation'],
        percentage: Math.round((counts['Exceeding Expectation'] / totalEvaluated) * 100),
        color: '#1A7F37',
      },
      {
        level: 'Meeting Expectation',
        short_code: 'ME',
        count: counts['Meeting Expectation'],
        percentage: Math.round((counts['Meeting Expectation'] / totalEvaluated) * 100),
        color: '#0969DA',
      },
      {
        level: 'Approaching Expectation',
        short_code: 'AE',
        count: counts['Approaching Expectation'],
        percentage: Math.round((counts['Approaching Expectation'] / totalEvaluated) * 100),
        color: '#9A6700',
      },
      {
        level: 'Below Expectation',
        short_code: 'BE',
        count: counts['Below Expectation'],
        percentage: Math.round((counts['Below Expectation'] / totalEvaluated) * 100),
        color: '#CF222E',
      },
    ];

    // Identify dominant level
    let highestCount = -1;
    let dominantLevel = 'Meeting Expectation';
    distribution.forEach((d) => {
      if (d.count > highestCount) {
        highestCount = d.count;
        dominantLevel = d.level;
      }
    });

    const meetingOrAbove = counts['Exceeding Expectation'] + counts['Meeting Expectation'];
    const headline = `${dominantLevel} in ${highestCount} of ${totalEvaluated} evaluated subjects (${meetingOrAbove}/${totalEvaluated} Meeting or Exceeding Expectation)`;

    return {
      scale_type: 'descriptor',
      total_subjects: subjectResults.length,
      total_evaluated: totalEvaluated,
      descriptor_distribution: distribution,
      dominant_standing: dominantLevel,
      meeting_or_above_count: meetingOrAbove,
      headline,
      average_percentage: null, // intentionally null for pure descriptor evaluation
      mean_grade: dominantLevel,
      gpa: null,
    };
  }

  // Standard Numeric / Percentage Scale
  let totalPct = 0;
  let totalGpaPoints = 0;
  let totalCredits = 0;

  validSubjects.forEach((s) => {
    const pct = toNum(s.percentage, 0);
    const credits = toNum(s.credit_hours, 1);
    const pts = toNum(s.gpa_points, 0);

    totalPct += pct;
    totalGpaPoints += pts * credits;
    totalCredits += credits;
  });

  const averagePercentage = Math.round((totalPct / totalEvaluated) * 100) / 100;
  const gpa = totalCredits > 0 ? Math.round((totalGpaPoints / totalCredits) * 100) / 100 : 0;
  const gradeBand = mapScoreToScale(averagePercentage, scales);

  return {
    scale_type: 'numeric',
    total_subjects: subjectResults.length,
    total_evaluated: totalEvaluated,
    average_percentage: averagePercentage,
    mean_grade: gradeBand.letter_grade,
    gpa: gpa,
    gpa_scale: Math.max(...scales.map((s) => toNum(s.gpa_points, 0)), 4.0),
    headline: `Overall Average: ${averagePercentage}% (Grade ${gradeBand.letter_grade}, GPA ${gpa.toFixed(2)})`,
  };
}

/**
 * Resolves compulsory vs elective status for subjects.
 */
async function resolveSubjectCompulsoryStatus(studentId, classId, subjectIds, institutionId) {
  const result = new Map();
  subjectIds.forEach((id) => result.set(id, 'Compulsory'));

  try {
    // 1. Check student's track enrollment
    const { data: studentTrack } = await supabase
      .from('student_tracks')
      .select('track_id, elective_subject_ids')
      .eq('student_id', studentId)
      .eq('institution_id', institutionId)
      .maybeSingle();

    const electiveSet = new Set(
      Array.isArray(studentTrack?.elective_subject_ids) ? studentTrack.elective_subject_ids : []
    );

    // 2. Check track_subjects for explicit is_compulsory flag
    if (studentTrack?.track_id) {
      const { data: trackSubjects } = await supabase
        .from('track_subjects')
        .select('subject_id, is_compulsory')
        .eq('track_id', studentTrack.track_id)
        .in('subject_id', subjectIds);

      (trackSubjects || []).forEach((ts) => {
        if (ts.is_compulsory === false || electiveSet.has(ts.subject_id)) {
          result.set(ts.subject_id, 'Elective');
        } else {
          result.set(ts.subject_id, 'Compulsory');
        }
      });
    }

    electiveSet.forEach((id) => {
      if (result.has(id)) result.set(id, 'Elective');
    });
  } catch (err) {
    console.warn('resolveSubjectCompulsoryStatus error:', err.message);
  }

  return result;
}

/**
 * Resolves student fee balance with institution currency.
 */
async function resolveStudentFeeBalance(studentId, institutionId) {
  try {
    const { data: student } = await supabase
      .from('students')
      .select('fee_balance')
      .eq('id', studentId)
      .eq('institution_id', institutionId)
      .maybeSingle();

    const { data: inst } = await supabase
      .from('institutions')
      .select('currency_id, currencies(id, code, symbol, decimal_places)')
      .eq('id', institutionId)
      .maybeSingle();

    const feeAmount = toNum(student?.fee_balance, 0);
    const currencyObj = inst?.currencies || { code: 'KES', symbol: 'KSh', decimal_places: 2 };
    const formatted = formatCurrencyAmount(feeAmount, currencyObj);

    return {
      amount: feeAmount,
      formatted,
      currency_code: currencyObj.code || 'KES',
      is_cleared: feeAmount <= 0,
    };
  } catch (err) {
    console.warn('resolveStudentFeeBalance error:', err.message);
    return {
      amount: 0,
      formatted: 'KES 0.00',
      currency_code: 'KES',
      is_cleared: true,
    };
  }
}

/**
 * Resolves institution branding information.
 */
async function resolveInstitutionBranding(institutionId) {
  try {
    const { data: inst } = await supabase
      .from('institutions')
      .select('id, name, logo_url, location, phone, email, type, principal_name')
      .eq('id', institutionId)
      .maybeSingle();

    return {
      id: institutionId,
      name: inst?.name || 'Academic Institution',
      logo_url: inst?.logo_url || null,
      location: inst?.location || 'Campus Address',
      phone: inst?.phone || null,
      email: inst?.email || null,
      principal_name: inst?.principal_name || 'Head of Institution',
    };
  } catch (err) {
    console.warn('resolveInstitutionBranding error:', err.message);
    return {
      id: institutionId,
      name: 'Academic Institution',
      logo_url: null,
      location: '',
      phone: null,
      email: null,
      principal_name: 'Principal',
    };
  }
}

/**
 * Resolves admin configuration for a specific classification (or defaults).
 */
async function getReportConfiguration(institutionId, classification) {
  const valid = ['term', 'year', 'overall'].includes(classification) ? classification : 'term';
  try {
    const { data, error } = await supabase
      .from('academic_report_configurations')
      .select('*')
      .eq('institution_id', institutionId)
      .eq('report_classification', valid)
      .maybeSingle();

    if (!error && data) {
      return data;
    }
  } catch (_e) {}

  // Standard defaults
  return {
    institution_id: institutionId,
    report_classification: valid,
    show_fee_balance: true,
    show_pending_section: true,
    show_compulsory_elective: true,
    show_summary_averages: true,
    summary_format: 'auto',
    show_key_legend: true,
    show_teacher_remarks: false,
    show_attendance: valid !== 'overall',
    overall_layout_mode: 'period_grouped',
  };
}

/**
 * Compiles a Term Report payload for a specific student and term.
 */
async function compileTermTranscript(studentId, termId, institutionId, classId = null) {
  const [scales, config, branding, feeBalance] = await Promise.all([
    resolveGradingScale(institutionId, studentId),
    getReportConfiguration(institutionId, 'term'),
    resolveInstitutionBranding(institutionId),
    resolveStudentFeeBalance(studentId, institutionId),
  ]);

  // Student info
  const { data: student } = await supabase
    .from('students')
    .select('id, user_id, class_id, admission_date, users(first_name, last_name, email, avatar_url), classes(id, display_name, grade_level, form_level, stream)')
    .eq('id', studentId)
    .eq('institution_id', institutionId)
    .single();

  if (!student) throw new Error('Student record not found');

  const resolvedClassId = classId || student.class_id;

  // Term info
  const { data: term } = await supabase
    .from('terms')
    .select('id, name, start_date, end_date, academic_year_id, academic_years(id, name)')
    .eq('id', termId)
    .maybeSingle();

  if (!term) throw new Error('Term record not found');

  // Subjects for class/student
  const subjects = await getSubjectsForClassAndStudent(studentId, resolvedClassId, institutionId);
  const subjectIds = subjects.map((s) => s.id);
  const compulsoryMap = await resolveSubjectCompulsoryStatus(studentId, resolvedClassId, subjectIds, institutionId);

  // Calculate subject grades
  const completedSubjects = [];
  const pendingSubjects = [];

  for (const subj of subjects) {
    const grade = await calculateSubjectGrade(studentId, subj.id, resolvedClassId, termId, institutionId);
    const compulsoryType = compulsoryMap.get(subj.id) || 'Compulsory';

    if (grade.has_data) {
      completedSubjects.push({
        subject_id: subj.id,
        subject_name: subj.title || 'Subject',
        credit_hours: subj.credit_hours || 1,
        classification_type: compulsoryType,
        percentage: grade.percentage,
        letter_grade: grade.letter_grade,
        gpa_points: grade.gpa_points,
        exam_percentage: grade.exam_percentage,
        ca_average: grade.ca_average,
        has_data: true,
      });
    } else {
      pendingSubjects.push({
        subject_id: subj.id,
        subject_name: subj.title || 'Subject',
        credit_hours: subj.credit_hours || 1,
        classification_type: compulsoryType,
        status: 'Coursework In Progress / Pending Examination',
        has_data: false,
      });
    }
  }

  // Attendance in term
  let attendance = { total_days: 0, days_present: 0, days_absent: 0, rate_percentage: 100 };
  if (term.start_date && term.end_date) {
    const { data: attRows } = await supabase
      .from('attendance')
      .select('status')
      .eq('student_id', studentId)
      .eq('institution_id', institutionId)
      .gte('date', term.start_date)
      .lte('date', term.end_date);

    if (attRows && attRows.length > 0) {
      const present = attRows.filter((r) => r.status === 'present').length;
      attendance = {
        total_days: attRows.length,
        days_present: present,
        days_absent: attRows.length - present,
        rate_percentage: Math.round((present / attRows.length) * 100),
      };
    }
  }

  const summary = calculateScaleSummary(completedSubjects, scales, config.summary_format);

  const studentFullName = `${student.users?.first_name || ''} ${student.users?.last_name || ''}`.trim() || student.id;
  const className = student.classes?.display_name || (student.classes?.grade_level ? `Grade ${student.classes.grade_level}` : 'Class');

  return {
    classification: 'term',
    period_title: `${term.name || 'Term'} ${term.academic_years?.name || ''}`.trim(),
    period_identifier: term.id,
    academic_year: term.academic_years?.name || '',
    generated_at: new Date().toISOString(),
    config,
    branding,
    student: {
      id: student.id,
      admission_number: student.id,
      full_name: studentFullName,
      class_name: className,
      admission_date: student.admission_date,
      fee_balance: feeBalance,
    },
    summary,
    subjects: completedSubjects,
    pending_subjects: pendingSubjects,
    attendance,
    scales,
  };
}

/**
 * Compiles an Academic Year Report aggregating all terms within a year.
 */
async function compileYearTranscript(studentId, academicYearId, institutionId, classId = null) {
  const [scales, config, branding, feeBalance] = await Promise.all([
    resolveGradingScale(institutionId, studentId),
    getReportConfiguration(institutionId, 'year'),
    resolveInstitutionBranding(institutionId),
    resolveStudentFeeBalance(studentId, institutionId),
  ]);

  const { data: student } = await supabase
    .from('students')
    .select('id, user_id, class_id, admission_date, users(first_name, last_name, email), classes(id, display_name, grade_level, form_level, stream)')
    .eq('id', studentId)
    .eq('institution_id', institutionId)
    .single();

  if (!student) throw new Error('Student record not found');

  const resolvedClassId = classId || student.class_id;

  // Year info
  const { data: year } = await supabase
    .from('academic_years')
    .select('id, name, start_date, end_date')
    .eq('id', academicYearId)
    .maybeSingle();

  if (!year) throw new Error('Academic year record not found');

  // Terms in year
  const { data: terms } = await supabase
    .from('terms')
    .select('id, name, start_date, end_date')
    .eq('academic_year_id', academicYearId)
    .order('start_date', { ascending: true });

  const yearTerms = terms || [];

  const subjects = await getSubjectsForClassAndStudent(studentId, resolvedClassId, institutionId);
  const subjectIds = subjects.map((s) => s.id);
  const compulsoryMap = await resolveSubjectCompulsoryStatus(studentId, resolvedClassId, subjectIds, institutionId);

  // Group performance by term
  const termGroups = [];
  const subjectAggregates = new Map();
  const allPendingSubjects = new Map();

  for (const t of yearTerms) {
    const termCompleted = [];
    const termPending = [];

    for (const subj of subjects) {
      const grade = await calculateSubjectGrade(studentId, subj.id, resolvedClassId, t.id, institutionId);
      const compulsoryType = compulsoryMap.get(subj.id) || 'Compulsory';

      if (grade.has_data) {
        const item = {
          subject_id: subj.id,
          subject_name: subj.title || 'Subject',
          credit_hours: subj.credit_hours || 1,
          classification_type: compulsoryType,
          percentage: grade.percentage,
          letter_grade: grade.letter_grade,
          gpa_points: grade.gpa_points,
          has_data: true,
        };
        termCompleted.push(item);

        if (!subjectAggregates.has(subj.id)) {
          subjectAggregates.set(subj.id, {
            subject_id: subj.id,
            subject_name: subj.title || 'Subject',
            classification_type: compulsoryType,
            credit_hours: subj.credit_hours || 1,
            total_percentage: 0,
            term_count: 0,
            letter_grades: [],
          });
        }
        const agg = subjectAggregates.get(subj.id);
        agg.total_percentage += grade.percentage;
        agg.term_count++;
        agg.letter_grades.push(grade.letter_grade);
      } else {
        const pItem = {
          subject_id: subj.id,
          subject_name: subj.title || 'Subject',
          classification_type: compulsoryType,
          term_name: t.name,
          status: 'Not Completed in ' + t.name,
          has_data: false,
        };
        termPending.push(pItem);
        allPendingSubjects.set(`${subj.id}-${t.id}`, pItem);
      }
    }

    termGroups.push({
      term_id: t.id,
      term_name: t.name,
      subjects: termCompleted,
      pending: termPending,
      summary: calculateScaleSummary(termCompleted, scales, config.summary_format),
    });
  }

  // Calculate annual cumulative subject averages
  const annualSubjectSummaries = [];
  for (const [sId, agg] of subjectAggregates.entries()) {
    const avgPct = Math.round((agg.total_percentage / agg.term_count) * 100) / 100;
    const mapped = mapScoreToScale(avgPct, scales);
    annualSubjectSummaries.push({
      subject_id: sId,
      subject_name: agg.subject_name,
      classification_type: agg.classification_type,
      credit_hours: agg.credit_hours,
      terms_evaluated: agg.term_count,
      average_percentage: avgPct,
      letter_grade: mapped.letter_grade,
      gpa_points: mapped.gpa_points,
      has_data: true,
    });
  }

  const overallAnnualSummary = calculateScaleSummary(annualSubjectSummaries, scales, config.summary_format);

  const studentFullName = `${student.users?.first_name || ''} ${student.users?.last_name || ''}`.trim() || student.id;
  const className = student.classes?.display_name || (student.classes?.grade_level ? `Grade ${student.classes.grade_level}` : 'Class');

  return {
    classification: 'year',
    period_title: `Academic Year ${year.name}`,
    period_identifier: year.id,
    academic_year: year.name,
    generated_at: new Date().toISOString(),
    config,
    branding,
    student: {
      id: student.id,
      admission_number: student.id,
      full_name: studentFullName,
      class_name: className,
      admission_date: student.admission_date,
      fee_balance: feeBalance,
    },
    summary: overallAnnualSummary,
    term_groups: termGroups,
    annual_subject_summaries: annualSubjectSummaries,
    pending_subjects: Array.from(allPendingSubjects.values()),
    scales,
  };
}

/**
 * Compiles an Overall Cumulative Transcript across the student's entire tenure to date.
 */
async function compileOverallTranscript(studentId, institutionId, classId = null) {
  const [scales, config, branding, feeBalance] = await Promise.all([
    resolveGradingScale(institutionId, studentId),
    getReportConfiguration(institutionId, 'overall'),
    resolveInstitutionBranding(institutionId),
    resolveStudentFeeBalance(studentId, institutionId),
  ]);

  const { data: student } = await supabase
    .from('students')
    .select('id, user_id, class_id, admission_date, users(first_name, last_name, email), classes(id, display_name, grade_level, form_level, stream)')
    .eq('id', studentId)
    .eq('institution_id', institutionId)
    .single();

  if (!student) throw new Error('Student record not found');

  const resolvedClassId = classId || student.class_id;

  // Fetch all academic years for this institution
  const { data: years } = await supabase
    .from('academic_years')
    .select('id, name, start_date, end_date')
    .eq('institution_id', institutionId)
    .order('start_date', { ascending: true });

  const allYears = years || [];
  const yearTimelines = [];
  const cumulativeSubjectMap = new Map();
  const allPending = [];

  for (const y of allYears) {
    const { data: terms } = await supabase
      .from('terms')
      .select('id, name, start_date, end_date')
      .eq('academic_year_id', y.id)
      .order('start_date', { ascending: true });

    if (!terms || terms.length === 0) continue;

    const termGroupList = [];

    for (const t of terms) {
      const subjects = await getSubjectsForClassAndStudent(studentId, resolvedClassId, institutionId);
      const subjectIds = subjects.map((s) => s.id);
      const compulsoryMap = await resolveSubjectCompulsoryStatus(studentId, resolvedClassId, subjectIds, institutionId);

      const termCompleted = [];

      for (const subj of subjects) {
        const grade = await calculateSubjectGrade(studentId, subj.id, resolvedClassId, t.id, institutionId);
        const compulsoryType = compulsoryMap.get(subj.id) || 'Compulsory';

        if (grade.has_data) {
          const item = {
            subject_id: subj.id,
            subject_name: subj.title || 'Subject',
            classification_type: compulsoryType,
            percentage: grade.percentage,
            letter_grade: grade.letter_grade,
            gpa_points: grade.gpa_points,
            term_name: t.name,
            academic_year: y.name,
            has_data: true,
          };
          termCompleted.push(item);

          if (!cumulativeSubjectMap.has(subj.id)) {
            cumulativeSubjectMap.set(subj.id, {
              subject_id: subj.id,
              subject_name: subj.title || 'Subject',
              classification_type: compulsoryType,
              credit_hours: subj.credit_hours || 1,
              total_percentage: 0,
              eval_count: 0,
              latest_grade: grade.letter_grade,
              latest_term: t.name,
            });
          }
          const cum = cumulativeSubjectMap.get(subj.id);
          cum.total_percentage += grade.percentage;
          cum.eval_count++;
          cum.latest_grade = grade.letter_grade;
          cum.latest_term = `${t.name}, ${y.name}`;
        }
      }

      if (termCompleted.length > 0) {
        termGroupList.push({
          term_id: t.id,
          term_name: t.name,
          subjects: termCompleted,
          summary: calculateScaleSummary(termCompleted, scales, config.summary_format),
        });
      }
    }

    if (termGroupList.length > 0) {
      yearTimelines.push({
        academic_year_id: y.id,
        academic_year_name: y.name,
        terms: termGroupList,
      });
    }
  }

  // Consolidated cumulative subject summaries
  const consolidatedSubjects = [];
  for (const [sId, cum] of cumulativeSubjectMap.entries()) {
    const cumPct = Math.round((cum.total_percentage / cum.eval_count) * 100) / 100;
    const mapped = mapScoreToScale(cumPct, scales);
    consolidatedSubjects.push({
      subject_id: sId,
      subject_name: cum.subject_name,
      classification_type: cum.classification_type,
      credit_hours: cum.credit_hours,
      eval_count: cum.eval_count,
      cumulative_percentage: cumPct,
      cumulative_grade: mapped.letter_grade,
      gpa_points: mapped.gpa_points,
      latest_standing: cum.latest_grade,
      last_evaluated_period: cum.latest_term,
      has_data: true,
    });
  }

  const overallSummary = calculateScaleSummary(
    consolidatedSubjects.map((cs) => ({
      ...cs,
      percentage: cs.cumulative_percentage,
      letter_grade: cs.cumulative_grade,
    })),
    scales,
    config.summary_format
  );

  const studentFullName = `${student.users?.first_name || ''} ${student.users?.last_name || ''}`.trim() || student.id;
  const className = student.classes?.display_name || (student.classes?.grade_level ? `Grade ${student.classes.grade_level}` : 'Class');

  const currentDateStr = new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return {
    classification: 'overall',
    period_title: `Overall Academic Record — As of ${currentDateStr}`,
    period_identifier: 'overall-current',
    generated_at: new Date().toISOString(),
    config,
    branding,
    student: {
      id: student.id,
      admission_number: student.id,
      full_name: studentFullName,
      class_name: className,
      admission_date: student.admission_date,
      fee_balance: feeBalance,
    },
    summary: overallSummary,
    layout_mode: config.overall_layout_mode || 'period_grouped',
    year_timelines: yearTimelines,
    consolidated_subjects: consolidatedSubjects,
    pending_subjects: allPending,
    scales,
  };
}

module.exports = {
  resolveGradingScale,
  isDescriptorScale,
  mapScoreToScale,
  calculateScaleSummary,
  resolveSubjectCompulsoryStatus,
  resolveStudentFeeBalance,
  resolveInstitutionBranding,
  getReportConfiguration,
  compileTermTranscript,
  compileYearTranscript,
  compileOverallTranscript,
};
