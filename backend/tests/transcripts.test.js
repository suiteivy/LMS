const test = require('node:test');
const assert = require('node:assert/strict');
const {
  isDescriptorScale,
  calculateScaleSummary,
  mapScoreToScale,
} = require('../services/transcriptCalculation.service.js');
const { compilePdfBuffer } = require('../services/pdfCompiler.service.js');

test('Scale Detection: isDescriptorScale distinguishes descriptor-based from standard percentage scale', () => {
  const numericScale = [
    { letter_grade: 'A', min_score: 80, max_score: 100, description: 'Excellent' },
    { letter_grade: 'B', min_score: 65, max_score: 79, description: 'Good' },
  ];

  const descriptorScale = [
    { letter_grade: 'Exceeding Expectation', min_score: 80, max_score: 100, description: 'Exceeding Expectation' },
    { letter_grade: 'Meeting Expectation', min_score: 60, max_score: 79.99, description: 'Meeting Expectation' },
    { letter_grade: 'Approaching Expectation', min_score: 40, max_score: 59.99, description: 'Approaching Expectation' },
    { letter_grade: 'Below Expectation', min_score: 0, max_score: 39.99, description: 'Below Expectation' },
  ];

  assert.equal(isDescriptorScale(numericScale), false, 'Numeric scale should not be detected as descriptor');
  assert.equal(isDescriptorScale(descriptorScale), true, 'Descriptor scale must be detected as descriptor');
});

test('Scale Summary: Numeric scale produces percentage average, mean grade, and GPA points', () => {
  const scales = [
    { letter_grade: 'A', min_score: 80, max_score: 100, gpa_points: 4.0 },
    { letter_grade: 'B', min_score: 70, max_score: 79.99, gpa_points: 3.0 },
    { letter_grade: 'C', min_score: 60, max_score: 69.99, gpa_points: 2.0 },
    { letter_grade: 'D', min_score: 50, max_score: 59.99, gpa_points: 1.0 },
    { letter_grade: 'E', min_score: 0, max_score: 49.99, gpa_points: 0.0 },
  ];

  const subjectResults = [
    { subject_name: 'Mathematics', percentage: 85, gpa_points: 4.0, credit_hours: 1, has_data: true },
    { subject_name: 'English', percentage: 75, gpa_points: 3.0, credit_hours: 1, has_data: true },
    { subject_name: 'Chemistry', percentage: 65, gpa_points: 2.0, credit_hours: 1, has_data: true },
    { subject_name: 'History', percentage: 55, gpa_points: 1.0, credit_hours: 1, has_data: true },
  ];

  const summary = calculateScaleSummary(subjectResults, scales, 'numeric');

  assert.equal(summary.scale_type, 'numeric');
  assert.equal(summary.total_evaluated, 4);
  assert.equal(summary.average_percentage, 70); // (85 + 75 + 65 + 55) / 4 = 70
  assert.equal(summary.mean_grade, 'B');
  assert.equal(summary.gpa, 2.5); // (4 + 3 + 2 + 1) / 4 = 2.5
});

test('Scale Summary: Descriptor scale produces distribution and NO fabricated average percentage', () => {
  const descriptorScales = [
    { letter_grade: 'Exceeding Expectation', min_score: 80, max_score: 100, description: 'Exceeding Expectation' },
    { letter_grade: 'Meeting Expectation', min_score: 60, max_score: 79.99, description: 'Meeting Expectation' },
    { letter_grade: 'Approaching Expectation', min_score: 40, max_score: 59.99, description: 'Approaching Expectation' },
    { letter_grade: 'Below Expectation', min_score: 0, max_score: 39.99, description: 'Below Expectation' },
  ];

  const subjectResults = [
    { subject_name: 'Mathematics', letter_grade: 'Exceeding Expectation', percentage: 88, has_data: true },
    { subject_name: 'English', letter_grade: 'Meeting Expectation', percentage: 72, has_data: true },
    { subject_name: 'Integrated Science', letter_grade: 'Meeting Expectation', percentage: 68, has_data: true },
    { subject_name: 'Social Studies', letter_grade: 'Meeting Expectation', percentage: 65, has_data: true },
    { subject_name: 'Creative Arts', letter_grade: 'Exceeding Expectation', percentage: 92, has_data: true },
    { subject_name: 'Pre-Technical', letter_grade: 'Meeting Expectation', percentage: 70, has_data: true },
  ];

  const summary = calculateScaleSummary(subjectResults, descriptorScales, 'auto');

  assert.equal(summary.scale_type, 'descriptor');
  assert.equal(summary.total_evaluated, 6);
  assert.equal(summary.average_percentage, null, 'Descriptor scale must not produce a fabricated numeric average');
  assert.equal(summary.dominant_standing, 'Meeting Expectation');

  const ee = summary.descriptor_distribution.find((d) => d.short_code === 'EE');
  const me = summary.descriptor_distribution.find((d) => d.short_code === 'ME');
  const ae = summary.descriptor_distribution.find((d) => d.short_code === 'AE');

  assert.equal(ee.count, 2);
  assert.equal(me.count, 4);
  assert.equal(ae.count, 0);
  assert.equal(summary.meeting_or_above_count, 6);
});

test('Vector PDF: compilePdfBuffer successfully compiles academic_transcript document type', async () => {
  const samplePayload = {
    classification: 'term',
    period_title: 'Term 2, 2026',
    generated_at: new Date().toISOString(),
    branding: {
      name: 'St. Teresa Academy',
      location: 'Nairobi, Kenya',
      phone: '+254 700 000 000',
    },
    student: {
      id: 'stu-101',
      admission_number: 'ADM-2026-001',
      full_name: 'Grace Wanjiku',
      class_name: 'Grade 8 Blue',
      fee_balance: {
        amount: 0,
        formatted: 'KES 0.00',
        is_cleared: true,
      },
    },
    config: {
      show_fee_balance: true,
      show_pending_section: true,
      show_compulsory_elective: true,
      show_summary_averages: true,
      show_key_legend: true,
    },
    summary: {
      scale_type: 'descriptor',
      total_subjects: 8,
      total_evaluated: 7,
      descriptor_distribution: [
        { level: 'Exceeding Expectation', short_code: 'EE', count: 3, percentage: 43, color: '#1A7F37' },
        { level: 'Meeting Expectation', short_code: 'ME', count: 4, percentage: 57, color: '#0969DA' },
        { level: 'Approaching Expectation', short_code: 'AE', count: 0, percentage: 0, color: '#9A6700' },
        { level: 'Below Expectation', short_code: 'BE', count: 0, percentage: 0, color: '#CF222E' },
      ],
      dominant_standing: 'Meeting Expectation',
      headline: 'Meeting Expectation in 4 of 7 evaluated subjects (7/7 Meeting or Exceeding)',
    },
    subjects: [
      { subject_name: 'Mathematics', classification_type: 'Compulsory', percentage: 86, letter_grade: 'Exceeding Expectation', gpa_points: 4 },
      { subject_name: 'English Language', classification_type: 'Compulsory', percentage: 74, letter_grade: 'Meeting Expectation', gpa_points: 3 },
      { subject_name: 'Kiswahili', classification_type: 'Compulsory', percentage: 70, letter_grade: 'Meeting Expectation', gpa_points: 3 },
      { subject_name: 'Integrated Science', classification_type: 'Compulsory', percentage: 88, letter_grade: 'Exceeding Expectation', gpa_points: 4 },
      { subject_name: 'Social Studies', classification_type: 'Compulsory', percentage: 68, letter_grade: 'Meeting Expectation', gpa_points: 3 },
      { subject_name: 'French', classification_type: 'Elective', percentage: 82, letter_grade: 'Exceeding Expectation', gpa_points: 4 },
      { subject_name: 'Computer Studies', classification_type: 'Elective', percentage: 78, letter_grade: 'Meeting Expectation', gpa_points: 3 },
    ],
    pending_subjects: [
      { subject_name: 'Agriculture & Nutrition', classification_type: 'Compulsory', status: 'Practical Assessment Scheduled' },
    ],
  };

  const pdfBuffer = await compilePdfBuffer({
    document_type: 'academic_transcript',
    data: samplePayload,
  });

  assert.ok(Buffer.isBuffer(pdfBuffer), 'Expected buffer output');
  assert.ok(pdfBuffer.length > 1000, 'PDF buffer should be non-trivial size');
  assert.equal(pdfBuffer.subarray(0, 4).toString(), '%PDF', 'PDF buffer header must be %PDF');
});

test('Vector PDF: compilePdfBuffer handles year and overall transcript classifications', async () => {
  const yearPayload = {
    classification: 'year',
    period_title: 'Academic Year 2026',
    generated_at: new Date().toISOString(),
    branding: { name: 'Hillside High' },
    student: {
      id: 'stu-202',
      admission_number: 'ADM-2026-002',
      full_name: 'David Kiprono',
      class_name: 'Grade 10 STEM',
      fee_balance: { amount: 3500, formatted: 'KES 3,500.00', is_cleared: false },
    },
    config: {
      show_fee_balance: true,
      show_pending_section: true,
      show_compulsory_elective: true,
      show_summary_averages: true,
      show_key_legend: true,
    },
    summary: {
      scale_type: 'numeric',
      total_subjects: 6,
      total_evaluated: 6,
      average_percentage: 76.5,
      mean_grade: 'B+',
      gpa: 3.5,
      gpa_scale: 4.0,
      headline: 'Overall Average: 76.5% (Grade B+, GPA 3.50)',
    },
    annual_subject_summaries: [
      { subject_name: 'Pure Mathematics', classification_type: 'Compulsory', terms_evaluated: 3, average_percentage: 84.0, letter_grade: 'A', gpa_points: 4.0 },
      { subject_name: 'Physics', classification_type: 'Compulsory', terms_evaluated: 3, average_percentage: 78.0, letter_grade: 'B+', gpa_points: 3.5 },
      { subject_name: 'Computer Programming', classification_type: 'Elective', terms_evaluated: 3, average_percentage: 92.0, letter_grade: 'A', gpa_points: 4.0 },
    ],
    term_groups: [
      {
        term_name: 'Term 1',
        subjects: [
          { subject_name: 'Pure Mathematics', percentage: 82, letter_grade: 'A' },
          { subject_name: 'Physics', percentage: 76, letter_grade: 'B' },
        ],
      },
      {
        term_name: 'Term 2',
        subjects: [
          { subject_name: 'Pure Mathematics', percentage: 86, letter_grade: 'A' },
          { subject_name: 'Physics', percentage: 80, letter_grade: 'A' },
        ],
      },
    ],
  };

  const pdfBuffer = await compilePdfBuffer({
    document_type: 'academic_transcript',
    data: yearPayload,
  });

  assert.ok(Buffer.isBuffer(pdfBuffer));
  assert.equal(pdfBuffer.subarray(0, 4).toString(), '%PDF');
});
