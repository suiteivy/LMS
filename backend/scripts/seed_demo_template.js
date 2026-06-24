/**
 * seed_demo_template.js
 * -----------------------------------------------
 * Populates the demo TEMPLATE institution with rich, realistic data.
 * This template is cloned every time someone starts a demo session.
 *
 * Usage:  node backend/scripts/seed_demo_template.js
 *         (run from the project root or backend/ directory)
 *
 * Safe to re-run – existing data is deleted first for a clean slate.
 */

const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');
const crypto = require('crypto');

dotenv.config({ path: path.join(__dirname, '../.env') });

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌  Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// ── The template institution that gets cloned for every demo session ──────────
const TEMPLATE_ID = 'b5bd788c-8297-4a96-b8b3-157814504fba';

// ── Helpers ───────────────────────────────────────────────────────────────────
const uid  = () => crypto.randomUUID();
const log  = (msg) => console.log(msg);
const warn = (label, err) => console.warn(`⚠️  ${label}:`, err?.message || err);

async function deleteAll(table, column = 'institution_id') {
  const { error } = await supabase.from(table).delete().eq(column, TEMPLATE_ID);
  if (error) warn(`cleanup ${table}`, error);
}

async function insert(table, rows) {
  const payload = Array.isArray(rows) ? rows : [rows];
  const { data, error } = await supabase.from(table).insert(payload).select();
  if (error) { warn(`insert ${table}`, error); return []; }
  return data;
}

// ── Main seeder ───────────────────────────────────────────────────────────────
async function seed() {
  log('\n🌱  Starting Demo Template Seeder…');
  log(`    Template institution: ${TEMPLATE_ID}\n`);

  // ── 0. Verify template institution exists ─────────────────────────────────
  const { data: inst, error: instErr } = await supabase
    .from('institutions').select('id, name').eq('id', TEMPLATE_ID).single();
  if (instErr || !inst) {
    console.error('❌  Template institution not found. Please create it first.');
    process.exit(1);
  }
  log(`✅  Template institution: "${inst.name}"`);

  // ── 1. Clean up old template data (order matters for FK constraints) ──────
  log('\n🧹  Cleaning up existing template data…');
  await deleteAll('academic_reports');
  await deleteAll('class_enrollments');
  await deleteAll('timetables');
  await deleteAll('attendance');
  await deleteAll('submissions');
  await deleteAll('exam_results');
  await deleteAll('assignments');
  await deleteAll('exams');
  await deleteAll('subjects');
  await deleteAll('enrollments');
  await deleteAll('classes');
  await deleteAll('bursary_applications');
  await deleteAll('bursaries');
  await deleteAll('fee_structures');
  await deleteAll('financial_transactions');
  await deleteAll('books');
  await deleteAll('diary_entries');
  await deleteAll('announcements');
  // Clean users linked to this template (they are fake placeholder users)
  const { data: templateUsers } = await supabase.from('users').select('id').eq('institution_id', TEMPLATE_ID);
  if (templateUsers && templateUsers.length > 0) {
    for (const u of templateUsers) {
      await supabase.from('teachers').delete().eq('user_id', u.id);
      await supabase.from('students').delete().eq('user_id', u.id);
      await supabase.from('parents').delete().eq('user_id', u.id);
      await supabase.from('admins').delete().eq('user_id', u.id);
    }
    await supabase.from('users').delete().eq('institution_id', TEMPLATE_ID);
  }
  log('    Done.\n');

  // ── 2. Seed placeholder Users (non-auth; cloner replaces IDs) ────────────
  log('👤  Seeding users…');

  const teacherUserId  = uid();
  const teacher2UserId = uid();
  const adminUserId    = uid();
  const student1UserId = uid();
  const student2UserId = uid();
  const student3UserId = uid();
  const student4UserId = uid();
  const student5UserId = uid();
  const parent1UserId  = uid();
  const parent2UserId  = uid();

  const userRows = [
    { id: teacherUserId,  email: `tpl.teacher@demo.lms`,  full_name: 'Sarah Chemutai',     first_name: 'Sarah',   last_name: 'Chemutai',   role: 'teacher', institution_id: TEMPLATE_ID },
    { id: teacher2UserId, email: `tpl.teacher2@demo.lms`, full_name: 'Brian Ochieng',      first_name: 'Brian',   last_name: 'Ochieng',    role: 'teacher', institution_id: TEMPLATE_ID },
    { id: adminUserId,    email: `tpl.admin@demo.lms`,    full_name: 'Cloudora Admin',      first_name: 'Cloudora',last_name: 'Admin',      role: 'admin',   institution_id: TEMPLATE_ID },
    { id: student1UserId, email: `tpl.stu1@demo.lms`,     full_name: 'Kelson Otieno',      first_name: 'Kelson',  last_name: 'Otieno',     role: 'student', institution_id: TEMPLATE_ID },
    { id: student2UserId, email: `tpl.stu2@demo.lms`,     full_name: 'Amina Hassan',       first_name: 'Amina',   last_name: 'Hassan',     role: 'student', institution_id: TEMPLATE_ID },
    { id: student3UserId, email: `tpl.stu3@demo.lms`,     full_name: 'Peter Kamau',        first_name: 'Peter',   last_name: 'Kamau',      role: 'student', institution_id: TEMPLATE_ID },
    { id: student4UserId, email: `tpl.stu4@demo.lms`,     full_name: 'Grace Wanjiku',      first_name: 'Grace',   last_name: 'Wanjiku',    role: 'student', institution_id: TEMPLATE_ID },
    { id: student5UserId, email: `tpl.stu5@demo.lms`,     full_name: 'David Mutuku',       first_name: 'David',   last_name: 'Mutuku',     role: 'student', institution_id: TEMPLATE_ID },
    { id: parent1UserId,  email: `tpl.par1@demo.lms`,     full_name: 'James Mwangi',       first_name: 'James',   last_name: 'Mwangi',     role: 'parent',  institution_id: TEMPLATE_ID },
    { id: parent2UserId,  email: `tpl.par2@demo.lms`,     full_name: 'Mary Njeri',         first_name: 'Mary',    last_name: 'Njeri',      role: 'parent',  institution_id: TEMPLATE_ID },
  ];
  await insert('users', userRows);
  log(`    ${userRows.length} users seeded.`);

  // ── 3. Teachers ───────────────────────────────────────────────────────────
  log('🧑‍🏫  Seeding teachers…');
  const teacherId  = `TCH-TPL-0001`;
  const teacher2Id = `TCH-TPL-0002`;
  await insert('teachers', [
    { id: teacherId,  user_id: teacherUserId,  institution_id: TEMPLATE_ID, department: 'Mathematics', qualification: 'MEd', position: 'class_teacher', specialization: 'Algebra & Statistics' },
    { id: teacher2Id, user_id: teacher2UserId, institution_id: TEMPLATE_ID, department: 'Sciences',    qualification: 'BSc', position: 'teacher',       specialization: 'Biology & Chemistry' },
  ]);

  // ── 4. Admin ──────────────────────────────────────────────────────────────
  log('🛡️   Seeding admins…');
  await insert('admins', [
    { id: `ADM-TPL-0001`, user_id: adminUserId, institution_id: TEMPLATE_ID, is_main: true },
  ]);

  // ── 5. Classes ────────────────────────────────────────────────────────────
  log('🏫  Seeding classes…');
  const class1Id = uid(); // Form 1 East
  const class2Id = uid(); // Form 2 North
  await insert('classes', [
    { id: class1Id, form_level: 1, stream: 'East',  display_name: 'Form 1 East',  capacity: 40, institution_id: TEMPLATE_ID, teacher_id: teacherId },
    { id: class2Id, form_level: 2, stream: 'North', display_name: 'Form 2 North', capacity: 40, institution_id: TEMPLATE_ID, teacher_id: teacher2Id },
  ]);

  // ── 6. Students ───────────────────────────────────────────────────────────
  log('🎒  Seeding students…');
  const stu1Id = `STU-TPL-0001`;
  const stu2Id = `STU-TPL-0002`;
  const stu3Id = `STU-TPL-0003`;
  const stu4Id = `STU-TPL-0004`;
  const stu5Id = `STU-TPL-0005`;
  await insert('students', [
    { id: stu1Id, user_id: student1UserId, institution_id: TEMPLATE_ID, form_level: 1, academic_year: '2026', admission_date: '2024-01-15', fee_balance: 5000 },
    { id: stu2Id, user_id: student2UserId, institution_id: TEMPLATE_ID, form_level: 1, academic_year: '2026', admission_date: '2024-01-15', fee_balance: 0 },
    { id: stu3Id, user_id: student3UserId, institution_id: TEMPLATE_ID, form_level: 2, academic_year: '2026', admission_date: '2023-01-10', fee_balance: 12000 },
    { id: stu4Id, user_id: student4UserId, institution_id: TEMPLATE_ID, form_level: 1, academic_year: '2026', admission_date: '2024-01-15', fee_balance: 2500 },
    { id: stu5Id, user_id: student5UserId, institution_id: TEMPLATE_ID, form_level: 2, academic_year: '2026', admission_date: '2023-01-10', fee_balance: 0 },
  ]);

  // ── 7. Parents ────────────────────────────────────────────────────────────
  log('👨‍👩‍👧  Seeding parents…');
  const par1Id = `PAR-TPL-0001`;
  const par2Id = `PAR-TPL-0002`;
  await insert('parents', [
    { id: par1Id, user_id: parent1UserId, institution_id: TEMPLATE_ID, occupation: 'Financial Analyst', address: 'Westlands, Nairobi' },
    { id: par2Id, user_id: parent2UserId, institution_id: TEMPLATE_ID, occupation: 'Nurse',             address: 'Karen, Nairobi' },
  ]);

  // ── 8. Parent-Student links ───────────────────────────────────────────────
  await insert('parent_students', [
    { parent_id: par1Id, student_id: stu1Id, relationship: 'Father', institution_id: TEMPLATE_ID },
    { parent_id: par2Id, student_id: stu2Id, relationship: 'Mother', institution_id: TEMPLATE_ID },
  ]);

  // ── 9. Class Enrollments ──────────────────────────────────────────────────
  log('📋  Seeding class enrollments…');
  await insert('class_enrollments', [
    { student_id: stu1Id, class_id: class1Id, institution_id: TEMPLATE_ID },
    { student_id: stu2Id, class_id: class1Id, institution_id: TEMPLATE_ID },
    { student_id: stu4Id, class_id: class1Id, institution_id: TEMPLATE_ID },
    { student_id: stu3Id, class_id: class2Id, institution_id: TEMPLATE_ID },
    { student_id: stu5Id, class_id: class2Id, institution_id: TEMPLATE_ID },
  ]);

  // ── 10. Subjects ──────────────────────────────────────────────────────────
  log('📚  Seeding subjects…');
  const mathId    = uid();
  const engId     = uid();
  const sciId     = uid();
  const bioId     = uid();
  const chemId    = uid();
  const histId    = uid();

  await insert('subjects', [
    { id: mathId, title: 'Mathematics',        description: 'Algebra, Geometry & Statistics',   teacher_id: teacherId,  class_id: class1Id, institution_id: TEMPLATE_ID, fee_amount: 500, category: 'Sciences',    level: 'Standard', rating: 4.5, reviews_count: 18, credits: 4 },
    { id: engId,  title: 'English',            description: 'Grammar, Composition & Literature', teacher_id: teacherId,  class_id: class1Id, institution_id: TEMPLATE_ID, fee_amount: 400, category: 'Languages',   level: 'Standard', rating: 4.2, reviews_count: 15, credits: 3 },
    { id: sciId,  title: 'Integrated Science', description: 'Physics concepts for Form 1',       teacher_id: teacher2Id, class_id: class1Id, institution_id: TEMPLATE_ID, fee_amount: 500, category: 'Sciences',    level: 'Standard', rating: 4.0, reviews_count: 12, credits: 3 },
    { id: bioId,  title: 'Biology',            description: 'Cell biology & ecology',            teacher_id: teacher2Id, class_id: class2Id, institution_id: TEMPLATE_ID, fee_amount: 550, category: 'Sciences',    level: 'Advanced', rating: 4.7, reviews_count: 20, credits: 4 },
    { id: chemId, title: 'Chemistry',          description: 'Periodic table & reactions',        teacher_id: teacher2Id, class_id: class2Id, institution_id: TEMPLATE_ID, fee_amount: 550, category: 'Sciences',    level: 'Advanced', rating: 4.3, reviews_count: 14, credits: 4 },
    { id: histId, title: 'History & CRE',      description: 'African history & religious education', teacher_id: teacherId, class_id: class2Id, institution_id: TEMPLATE_ID, fee_amount: 350, category: 'Humanities', level: 'Standard', rating: 3.9, reviews_count: 10, credits: 3 },
  ]);

  // ── 11. Assignments ───────────────────────────────────────────────────────
  log('📝  Seeding assignments…');
  const ass1Id = uid(); const ass2Id = uid(); const ass3Id = uid();
  const ass4Id = uid(); const ass5Id = uid(); const ass6Id = uid();
  await insert('assignments', [
    { id: ass1Id, subject_id: mathId, teacher_id: teacherId,  institution_id: TEMPLATE_ID, title: 'Quadratic Equations – Set A',     description: 'Solve 20 quadratic equations using the formula method.',    due_date: '2026-06-10T23:59:00Z', total_points: 100, status: 'active', is_published: true,  weight: 15, term: 'Term 2' },
    { id: ass2Id, subject_id: engId,  teacher_id: teacherId,  institution_id: TEMPLATE_ID, title: 'Composition – My Hometown',        description: 'Write a 500-word essay describing your hometown.',           due_date: '2026-06-05T23:59:00Z', total_points: 50,  status: 'active', is_published: true,  weight: 10, term: 'Term 2' },
    { id: ass3Id, subject_id: sciId,  teacher_id: teacher2Id, institution_id: TEMPLATE_ID, title: 'Physics Lab Report – Pendulum',    description: 'Document findings from the simple pendulum experiment.',     due_date: '2026-06-15T23:59:00Z', total_points: 80,  status: 'active', is_published: true,  weight: 20, term: 'Term 2' },
    { id: ass4Id, subject_id: bioId,  teacher_id: teacher2Id, institution_id: TEMPLATE_ID, title: 'Cell Diagram – Annotated Sketch',  description: 'Draw and annotate a plant cell and an animal cell.',         due_date: '2026-06-12T23:59:00Z', total_points: 60,  status: 'active', is_published: true,  weight: 15, term: 'Term 2' },
    { id: ass5Id, subject_id: chemId, teacher_id: teacher2Id, institution_id: TEMPLATE_ID, title: 'Periodic Table Quiz',              description: 'Identify 30 elements and their symbols.',                   due_date: '2026-06-08T23:59:00Z', total_points: 30,  status: 'closed', is_published: true,  weight: 5,  term: 'Term 1' },
    { id: ass6Id, subject_id: histId, teacher_id: teacherId,  institution_id: TEMPLATE_ID, title: 'Pre-Colonial Kenya – Research',    description: 'Research report (400 words) on a pre-colonial community.', due_date: '2026-06-20T23:59:00Z', total_points: 100, status: 'active', is_published: false, weight: 20, term: 'Term 2' },
  ]);

  // ── 12. Submissions ───────────────────────────────────────────────────────
  log('📤  Seeding submissions…');
  await insert('submissions', [
    { assignment_id: ass1Id, student_id: stu1Id, content: 'x = (−b ± √(b²−4ac)) / 2a …',    grade: 78,  feedback: 'Good work, check signs in Q15.',  status: 'graded',    institution_id: TEMPLATE_ID },
    { assignment_id: ass1Id, student_id: stu2Id, content: 'Solutions attached.',               grade: 92,  feedback: 'Excellent! Perfect score on Q1-18.', status: 'graded', institution_id: TEMPLATE_ID },
    { assignment_id: ass2Id, student_id: stu1Id, content: 'My hometown is Kisumu...',          grade: 44,  feedback: 'Good vocabulary, improve structure.', status: 'graded', institution_id: TEMPLATE_ID },
    { assignment_id: ass3Id, student_id: stu3Id, content: 'Pendulum experiment report…',       grade: null, feedback: null, status: 'submitted', institution_id: TEMPLATE_ID },
    { assignment_id: ass5Id, student_id: stu3Id, content: 'H=Hydrogen, He=Helium ...',        grade: 28,  feedback: 'Very good.',                       status: 'graded',    institution_id: TEMPLATE_ID },
    { assignment_id: ass4Id, student_id: stu5Id, content: 'Diagram uploaded.',                 grade: null, feedback: null, status: 'submitted', institution_id: TEMPLATE_ID },
  ]);

  // ── 13. Exams ─────────────────────────────────────────────────────────────
  log('📖  Seeding exams…');
  const exam1Id = uid(); const exam2Id = uid(); const exam3Id = uid();
  await insert('exams', [
    { id: exam1Id, subject_id: mathId, teacher_id: teacherId,  institution_id: TEMPLATE_ID, title: 'Mathematics – End of Term 1', date: '2026-03-28', max_score: 100, is_published: true,  weight: 40, term: 'Term 1' },
    { id: exam2Id, subject_id: bioId,  teacher_id: teacher2Id, institution_id: TEMPLATE_ID, title: 'Biology – Mid-Term',          date: '2026-05-14', max_score: 100, is_published: true,  weight: 30, term: 'Term 2' },
    { id: exam3Id, subject_id: engId,  teacher_id: teacherId,  institution_id: TEMPLATE_ID, title: 'English – CAT 1',            date: '2026-04-10', max_score: 50,  is_published: true,  weight: 20, term: 'Term 2' },
  ]);

  // ── 14. Exam Results ──────────────────────────────────────────────────────
  log('🏅  Seeding exam results…');
  await insert('exam_results', [
    { exam_id: exam1Id, student_id: stu1Id, score: 74, feedback: 'Good effort.',          graded_by: teacherId,  institution_id: TEMPLATE_ID },
    { exam_id: exam1Id, student_id: stu2Id, score: 89, feedback: 'Outstanding!',          graded_by: teacherId,  institution_id: TEMPLATE_ID },
    { exam_id: exam1Id, student_id: stu4Id, score: 61, feedback: 'Needs improvement.',    graded_by: teacherId,  institution_id: TEMPLATE_ID },
    { exam_id: exam2Id, student_id: stu3Id, score: 82, feedback: 'Great lab knowledge.',  graded_by: teacher2Id, institution_id: TEMPLATE_ID },
    { exam_id: exam2Id, student_id: stu5Id, score: 77, feedback: 'Well done.',            graded_by: teacher2Id, institution_id: TEMPLATE_ID },
    { exam_id: exam3Id, student_id: stu1Id, score: 41, feedback: 'Improve comprehension.', graded_by: teacherId, institution_id: TEMPLATE_ID },
    { exam_id: exam3Id, student_id: stu2Id, score: 48, feedback: 'Near perfect.',         graded_by: teacherId,  institution_id: TEMPLATE_ID },
  ]);

  // ── 15. Timetable ─────────────────────────────────────────────────────────
  log('📅  Seeding timetable…');
  await insert('timetables', [
    { class_id: class1Id, subject_id: mathId, day_of_week: 'Monday',    start_time: '07:30', end_time: '08:30', room_number: 'Room 101', institution_id: TEMPLATE_ID },
    { class_id: class1Id, subject_id: engId,  day_of_week: 'Monday',    start_time: '08:30', end_time: '09:30', room_number: 'Room 101', institution_id: TEMPLATE_ID },
    { class_id: class1Id, subject_id: sciId,  day_of_week: 'Tuesday',   start_time: '07:30', end_time: '09:00', room_number: 'Lab A',    institution_id: TEMPLATE_ID },
    { class_id: class1Id, subject_id: mathId, day_of_week: 'Wednesday',  start_time: '07:30', end_time: '08:30', room_number: 'Room 101', institution_id: TEMPLATE_ID },
    { class_id: class1Id, subject_id: engId,  day_of_week: 'Thursday',  start_time: '08:30', end_time: '09:30', room_number: 'Room 101', institution_id: TEMPLATE_ID },
    { class_id: class1Id, subject_id: sciId,  day_of_week: 'Friday',    start_time: '07:30', end_time: '09:00', room_number: 'Lab A',    institution_id: TEMPLATE_ID },
    { class_id: class2Id, subject_id: bioId,  day_of_week: 'Monday',    start_time: '07:30', end_time: '09:00', room_number: 'Lab B',    institution_id: TEMPLATE_ID },
    { class_id: class2Id, subject_id: chemId, day_of_week: 'Tuesday',   start_time: '07:30', end_time: '09:00', room_number: 'Lab B',    institution_id: TEMPLATE_ID },
    { class_id: class2Id, subject_id: histId, day_of_week: 'Wednesday', start_time: '09:30', end_time: '10:30', room_number: 'Room 202', institution_id: TEMPLATE_ID },
    { class_id: class2Id, subject_id: bioId,  day_of_week: 'Thursday',  start_time: '07:30', end_time: '09:00', room_number: 'Lab B',    institution_id: TEMPLATE_ID },
    { class_id: class2Id, subject_id: chemId, day_of_week: 'Friday',    start_time: '07:30', end_time: '09:00', room_number: 'Lab B',    institution_id: TEMPLATE_ID },
  ]);

  // ── 16. Attendance ────────────────────────────────────────────────────────
  log('✅  Seeding attendance…');
  const attendanceDays = ['2026-05-12', '2026-05-13', '2026-05-14', '2026-05-15', '2026-05-16'];
  const attendanceRows = [];
  for (const date of attendanceDays) {
    for (const [stuId, clsId, subId] of [
      [stu1Id, class1Id, mathId], [stu2Id, class1Id, mathId], [stu4Id, class1Id, mathId],
      [stu3Id, class2Id, bioId],  [stu5Id, class2Id, bioId],
    ]) {
      const statuses = ['present', 'present', 'present', 'present', 'absent'];
      attendanceRows.push({
        class_id: clsId, subject_id: subId, student_id: stuId, date,
        status: statuses[Math.floor(Math.random() * statuses.length)],
        institution_id: TEMPLATE_ID
      });
    }
  }
  await insert('attendance', attendanceRows);

  // ── 17. Academic Reports ──────────────────────────────────────────────────
  log('📊  Seeding academic reports…');
  await insert('academic_reports', [
    {
      student_id: stu1Id, institution_id: TEMPLATE_ID, term: 'Term 1', academic_year: '2026',
      report_type: 'end-of-term', status: 'published',
      data: { subjects: [{ name: 'Mathematics', score: 74, grade: 'B' }, { name: 'English', score: 41, grade: 'D+' }], average: 57.5, rank: 3, total_students: 5, remarks: 'Must improve in English.' }
    },
    {
      student_id: stu2Id, institution_id: TEMPLATE_ID, term: 'Term 1', academic_year: '2026',
      report_type: 'end-of-term', status: 'published',
      data: { subjects: [{ name: 'Mathematics', score: 89, grade: 'A' }, { name: 'English', score: 48, grade: 'A' }], average: 68.5, rank: 1, total_students: 5, remarks: 'Excellent performance!' }
    },
    {
      student_id: stu3Id, institution_id: TEMPLATE_ID, term: 'Term 1', academic_year: '2026',
      report_type: 'end-of-term', status: 'published',
      data: { subjects: [{ name: 'Biology', score: 82, grade: 'A-' }, { name: 'Chemistry', score: 28, grade: 'D' }], average: 55.0, rank: 2, total_students: 5, remarks: 'Chemistry needs attention.' }
    },
  ]);

  // ── 18. Fee Structures ────────────────────────────────────────────────────
  log('💰  Seeding fee structures…');
  const fee1Id = uid(); const fee2Id = uid(); const fee3Id = uid();
  await insert('fee_structures', [
    { id: fee1Id, title: 'Tuition Fee – Term 2 2026',  amount: 25000, academic_year: '2026', term: 'Term 2', institution_id: TEMPLATE_ID, is_active: true },
    { id: fee2Id, title: 'Activity & Uniform Fee',      amount: 4500,  academic_year: '2026', term: 'Term 2', institution_id: TEMPLATE_ID, is_active: true },
    { id: fee3Id, title: 'Library & Resource Fee',      amount: 2000,  academic_year: '2026', term: 'Term 2', institution_id: TEMPLATE_ID, is_active: true },
  ]);

  // ── 19. Payments ──────────────────────────────────────────────────────────
  log('💳  Seeding payments…');
  await insert('payments', [
    { student_id: stu2Id, fee_structure_id: fee1Id, amount: 25000, payment_method: 'mobile_money', reference_number: 'MPD20261001', payment_date: '2026-05-01', status: 'completed', institution_id: TEMPLATE_ID },
    { student_id: stu2Id, fee_structure_id: fee2Id, amount: 4500,  payment_method: 'mobile_money', reference_number: 'MPD20261002', payment_date: '2026-05-01', status: 'completed', institution_id: TEMPLATE_ID },
    { student_id: stu1Id, fee_structure_id: fee1Id, amount: 20000, payment_method: 'bank_transfer', reference_number: 'KCB2026051X', payment_date: '2026-05-03', status: 'completed', institution_id: TEMPLATE_ID },
  ]);

  // ── 20. Financial Transactions ────────────────────────────────────────────
  log('💹  Seeding financial transactions…');
  await insert('financial_transactions', [
    { institution_id: TEMPLATE_ID, type: 'fee_payment',   direction: 'inflow',  amount: 25000, date: '2026-05-01', method: 'mobile_money', status: 'completed', reference_id: 'MPD20261001', meta: { student: 'Amina Hassan' } },
    { institution_id: TEMPLATE_ID, type: 'fee_payment',   direction: 'inflow',  amount: 20000, date: '2026-05-03', method: 'bank_transfer', status: 'completed', reference_id: 'KCB2026051X', meta: { student: 'Kelson Otieno' } },
    { institution_id: TEMPLATE_ID, type: 'salary_payout', direction: 'outflow', amount: 45000, date: '2026-04-30', method: 'bank_transfer', status: 'completed', reference_id: 'SAL-APR-001',  meta: { teacher: 'Sarah Chemutai' } },
    { institution_id: TEMPLATE_ID, type: 'expense',       direction: 'outflow', amount: 8500,  date: '2026-05-10', method: 'cash',          status: 'completed', reference_id: 'EXP-001',       meta: { description: 'Lab supplies' } },
    { institution_id: TEMPLATE_ID, type: 'fee_payment',   direction: 'inflow',  amount: 4500,  date: '2026-05-01', method: 'mobile_money', status: 'completed', reference_id: 'MPD20261002', meta: { student: 'Amina Hassan' } },
  ]);

  // ── 21. Bursaries ─────────────────────────────────────────────────────────
  log('🎓  Seeding bursaries…');
  const bur1Id = uid(); const bur2Id = uid();
  await insert('bursaries', [
    { id: bur1Id, title: 'Excellence Scholarship',   description: 'For students with overall average above 80%.', amount: 15000, deadline: '2026-07-31', requirements: 'Latest report card required.', status: 'open', institution_id: TEMPLATE_ID },
    { id: bur2Id, title: 'Need-Based Support Grant', description: 'Financial aid for students facing hardship.',   amount: 10000, deadline: '2026-07-15', requirements: 'Letter from parent/guardian.',   status: 'open', institution_id: TEMPLATE_ID },
  ]);

  // ── 22. Bursary Applications ──────────────────────────────────────────────
  await insert('bursary_applications', [
    { bursary_id: bur1Id, student_id: stu2Id, status: 'approved', justification: 'Top student in class.', institution_id: TEMPLATE_ID },
    { bursary_id: bur2Id, student_id: stu1Id, status: 'pending',  justification: 'Single-parent household.', institution_id: TEMPLATE_ID },
  ]);

  // ── 23. Library Books ─────────────────────────────────────────────────────
  log('📖  Seeding library books…');
  await insert('books', [
    { title: 'Form 1 Mathematics Textbook',     author: 'Kenya MoE',          isbn: '978-9966-01-001-1', category: 'Mathematics', total_quantity: 20, available_quantity: 18, institution_id: TEMPLATE_ID },
    { title: 'Form 2 Biology Guide',            author: 'Longhorn Publishers', isbn: '978-9966-01-002-8', category: 'Science',     total_quantity: 15, available_quantity: 14, institution_id: TEMPLATE_ID },
    { title: 'English Grammar & Composition',   author: 'Oxford Press EA',     isbn: '978-9966-01-003-5', category: 'Languages',   total_quantity: 25, available_quantity: 25, institution_id: TEMPLATE_ID },
    { title: 'History of East Africa',          author: 'East African Edu',    isbn: '978-9966-01-004-2', category: 'History',     total_quantity: 10, available_quantity: 9,  institution_id: TEMPLATE_ID },
    { title: 'Chemistry for Secondary Schools', author: 'Jomo Kenyatta Found.', isbn: '978-9966-01-005-9', category: 'Science',    total_quantity: 12, available_quantity: 11, institution_id: TEMPLATE_ID },
    { title: 'Atlas of Africa',                 author: 'National Geographic', isbn: '978-9966-01-006-6', category: 'Geography',   total_quantity: 5,  available_quantity: 5,  institution_id: TEMPLATE_ID },
  ]);

  // ── 24. Announcements ─────────────────────────────────────────────────────
  log('📢  Seeding announcements…');
  await insert('announcements', [
    { subject_id: mathId, teacher_id: teacherId,  title: 'Assignment Deadline Reminder',     message: 'Please submit Quadratic Equations Set A by June 10th. No late submissions.',             institution_id: TEMPLATE_ID },
    { subject_id: bioId,  teacher_id: teacher2Id, title: 'Lab Sessions – Week of June 2',    message: 'Lab sessions will be held Tuesday & Thursday in Lab B. Bring protective gear.',          institution_id: TEMPLATE_ID },
    { subject_id: engId,  teacher_id: teacherId,  title: 'New Reading Material Available',   message: 'The novel "Things Fall Apart" has been added to the library. All Form 1 students must read Chapters 1–5 by next week.', institution_id: TEMPLATE_ID },
  ]);

  // ── 25. Diary Entries ─────────────────────────────────────────────────────
  log('📓  Seeding diary entries…');
  await insert('diary_entries', [
    { institution_id: TEMPLATE_ID, class_id: class1Id, teacher_id: teacherId,  title: 'Lesson: Introduction to Quadratics', content: 'Introduced quadratic expressions. Students practised factoring (a+b)(a-b). Homework: Exercise 3B.', entry_date: '2026-05-12' },
    { institution_id: TEMPLATE_ID, class_id: class1Id, teacher_id: teacherId,  title: 'Lesson: Comprehension – Newspaper Extract', content: 'Students read and answered questions on a newspaper extract. Discussed vocabulary in context.', entry_date: '2026-05-13' },
    { institution_id: TEMPLATE_ID, class_id: class2Id, teacher_id: teacher2Id, title: 'Lesson: Cell Division – Mitosis',       content: 'Covered the stages of mitosis. Drew and labelled diagrams in notebooks. Quiz next lesson.', entry_date: '2026-05-14' },
  ]);

  log('\n🎉  Demo template seeding COMPLETE!');
  log(`    Template ID: ${TEMPLATE_ID}`);
  log('    Every new demo session will now clone this rich dataset.\n');
}

seed().catch((err) => {
  console.error('\n❌  Fatal seeder error:', err);
  process.exit(1);
});
