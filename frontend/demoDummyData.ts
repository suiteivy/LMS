/**
 * demoDummyData.ts
 * ─────────────────────────────────────────────────────────────────
 * Single source of truth for ALL demo-mode mock data.
 * Import the relevant slice in each screen/hook instead of
 * scattering inline objects everywhere.
 *
 * Usage:
 *   import demoDummyData from '@/demoDummyData';
 *   if (isDemo) setGrades(demoDummyData.student.grades);
 * ─────────────────────────────────────────────────────────────────
 */

// ── Shared helpers ────────────────────────────────────────────────
const daysAgo = (n: number) =>
  new Date(Date.now() - n * 86_400_000).toISOString();

const daysFromNow = (n: number) =>
  new Date(Date.now() + n * 86_400_000).toISOString();

// ── Institution ───────────────────────────────────────────────────
const institution = {
  id: 'DEMO-INST-001',
  name: 'Cloudora Academy',
  location: 'Westlands, Nairobi',
  phone: '+254 712 345 678',
  email: 'admin@cloudoraacademy.ac.ke',
  type: 'secondary' as const,
  principal_name: 'Dr. Patricia Wambua',
  subscription_status: 'active' as const,
  subscription_plan: 'pro' as const,
  subscription_cycle: 'annually' as const,
  addon_library: true,
  addon_messaging: true,
  addon_finance: true,
  addon_analytics: true,
  addon_bursary: true,
  addon_attendance: true,
  addon_diary: true,
};

// ── Users (one per role) ──────────────────────────────────────────
const users = {
  admin: {
    id: 'DEMO-USR-ADM-001',
    full_name: 'Angela Muthoni',
    first_name: 'Angela',
    last_name: 'Muthoni',
    email: 'demo.admin@cloudora.lms',
    role: 'admin' as const,
    status: 'approved' as const,
    institution_id: 'DEMO-INST-001',
    phone: '+254 700 111 001',
    gender: 'female' as const,
    avatar_url: null,
    created_at: daysAgo(180),
    updated_at: daysAgo(2),
  },
  teacher: {
    id: 'DEMO-USR-TCH-001',
    full_name: 'Sarah Chemutai',
    first_name: 'Sarah',
    last_name: 'Chemutai',
    email: 'demo.teacher@cloudora.lms',
    role: 'teacher' as const,
    status: 'approved' as const,
    institution_id: 'DEMO-INST-001',
    phone: '+254 700 111 002',
    gender: 'female' as const,
    avatar_url: null,
    created_at: daysAgo(365),
    updated_at: daysAgo(5),
  },
  student: {
    id: 'DEMO-USR-STU-001',
    full_name: 'Kelson Otieno',
    first_name: 'Kelson',
    last_name: 'Otieno',
    email: 'demo.student@cloudora.lms',
    role: 'student' as const,
    status: 'approved' as const,
    institution_id: 'DEMO-INST-001',
    phone: '+254 700 111 003',
    gender: 'male' as const,
    avatar_url: null,
    created_at: daysAgo(400),
    updated_at: daysAgo(1),
  },
  parent: {
    id: 'DEMO-USR-PAR-001',
    full_name: 'James Mwangi',
    first_name: 'James',
    last_name: 'Mwangi',
    email: 'demo.parent@cloudora.lms',
    role: 'parent' as const,
    status: 'approved' as const,
    institution_id: 'DEMO-INST-001',
    phone: '+254 700 111 004',
    gender: 'male' as const,
    avatar_url: null,
    created_at: daysAgo(400),
    updated_at: daysAgo(10),
  },
};

// ── Role records ──────────────────────────────────────────────────
const roleRecords = {
  teacher: {
    id: 'TCH-DEMO-0001',
    user_id: users.teacher.id,
    department: 'Mathematics & Sciences',
    qualification: 'MEd Mathematics',
    specialization: 'Algebra, Statistics & Physics',
    position: 'class_teacher' as const,
    hire_date: '2021-01-10',
    created_at: daysAgo(365),
    updated_at: daysAgo(5),
  },
  teacher2: {
    id: 'TCH-DEMO-0002',
    user_id: 'DEMO-USR-TCH-002',
    department: 'Sciences',
    qualification: 'BSc Biology',
    specialization: 'Biology & Chemistry',
    position: 'teacher' as const,
    hire_date: '2022-03-01',
    created_at: daysAgo(300),
    updated_at: daysAgo(10),
  },
  student: {
    id: 'STU-DEMO-0001',
    user_id: users.student.id,
    grade_level: 10,
    form_level: 2,
    grade_level_legacy: 'Form 2',
    parent_contact: '+254 700 111 004',
    admission_date: daysAgo(400),
    academic_year: '2026',
    emergency_contact_name: 'James Mwangi',
    emergency_contact_phone: '+254 700 111 004',
    created_at: daysAgo(400),
    updated_at: daysAgo(1),
  },
  admin: {
    id: 'ADM-DEMO-0001',
    user_id: users.admin.id,
    is_main: true,
    created_at: daysAgo(180),
    updated_at: daysAgo(2),
  },
  parent: {
    id: 'PAR-DEMO-0001',
    user_id: users.parent.id,
    occupation: 'Financial Analyst',
    address: 'Westlands, Nairobi',
    created_at: daysAgo(400),
    updated_at: daysAgo(10),
  },
};

// ── Classes ───────────────────────────────────────────────────────
const classes = [
  {
    id: 'CLS-DEMO-001',
    name: 'Form 2 East',
    form_level: 2,
    stream: 'East',
    institution_id: 'DEMO-INST-001',
    teacher_id: 'TCH-DEMO-0001',
    capacity: 40,
    created_at: daysAgo(365),
    updated_at: daysAgo(30),
  },
  {
    id: 'CLS-DEMO-002',
    name: 'Form 1 North',
    form_level: 1,
    stream: 'North',
    institution_id: 'DEMO-INST-001',
    teacher_id: 'TCH-DEMO-0002',
    capacity: 40,
    created_at: daysAgo(365),
    updated_at: daysAgo(30),
  },
  {
    id: 'CLS-DEMO-003',
    name: 'Form 3 West',
    form_level: 3,
    stream: 'West',
    institution_id: 'DEMO-INST-001',
    teacher_id: 'TCH-DEMO-0001',
    capacity: 38,
    created_at: daysAgo(365),
    updated_at: daysAgo(30),
  },
];

// ── Subjects ──────────────────────────────────────────────────────
const subjects = [
  {
    id: 'SUB-DEMO-MATH',
    title: 'Mathematics',
    description: 'Algebra, Geometry & Statistics for Form 2 students.',
    fee_amount: 500,
    teacher_id: 'TCH-DEMO-0001',
    institution_id: 'DEMO-INST-001',
    class_id: 'CLS-DEMO-001',
    credits: 4,
    progress_percent: 68,
    category: 'Sciences',
    level: 'Standard',
    rating: 4.6,
    reviews_count: 22,
    created_at: daysAgo(360),
  },
  {
    id: 'SUB-DEMO-ENG',
    title: 'English Language & Literature',
    description: 'Grammar, Composition, Comprehension & Set Books.',
    fee_amount: 400,
    teacher_id: 'TCH-DEMO-0001',
    institution_id: 'DEMO-INST-001',
    class_id: 'CLS-DEMO-001',
    credits: 3,
    progress_percent: 74,
    category: 'Languages',
    level: 'Standard',
    rating: 4.3,
    reviews_count: 18,
    created_at: daysAgo(360),
  },
  {
    id: 'SUB-DEMO-SCI',
    title: 'Integrated Science',
    description: 'Physics, Chemistry & Biology fundamentals.',
    fee_amount: 550,
    teacher_id: 'TCH-DEMO-0002',
    institution_id: 'DEMO-INST-001',
    class_id: 'CLS-DEMO-001',
    credits: 4,
    progress_percent: 55,
    category: 'Sciences',
    level: 'Standard',
    rating: 4.1,
    reviews_count: 14,
    created_at: daysAgo(360),
  },
  {
    id: 'SUB-DEMO-BIO',
    title: 'Biology',
    description: 'Cell biology, ecology & human anatomy.',
    fee_amount: 550,
    teacher_id: 'TCH-DEMO-0002',
    institution_id: 'DEMO-INST-001',
    class_id: 'CLS-DEMO-001',
    credits: 4,
    progress_percent: 61,
    category: 'Sciences',
    level: 'Advanced',
    rating: 4.7,
    reviews_count: 20,
    created_at: daysAgo(360),
  },
  {
    id: 'SUB-DEMO-HIST',
    title: 'History & CRE',
    description: 'African history, governance & religious education.',
    fee_amount: 350,
    teacher_id: 'TCH-DEMO-0001',
    institution_id: 'DEMO-INST-001',
    class_id: 'CLS-DEMO-001',
    credits: 3,
    progress_percent: 80,
    category: 'Humanities',
    level: 'Standard',
    rating: 3.9,
    reviews_count: 12,
    created_at: daysAgo(360),
  },
  {
    id: 'SUB-DEMO-CHEM',
    title: 'Chemistry',
    description: 'Periodic table, chemical reactions & lab work.',
    fee_amount: 550,
    teacher_id: 'TCH-DEMO-0002',
    institution_id: 'DEMO-INST-001',
    class_id: 'CLS-DEMO-001',
    credits: 4,
    progress_percent: 47,
    category: 'Sciences',
    level: 'Advanced',
    rating: 4.2,
    reviews_count: 16,
    created_at: daysAgo(360),
  },
];

// ── Timetable / Today's Schedule ──────────────────────────────────
const todaysSchedule = [
  {
    id: 'TT-DEMO-001',
    start_time: '07:30:00',
    end_time: '09:00:00',
    day_of_week: 'Monday',
    room_number: 'Room 101',
    class_id: 'CLS-DEMO-001',
    subject_id: 'SUB-DEMO-MATH',
    institution_id: 'DEMO-INST-001',
    subjects: {
      title: 'Mathematics',
      teachers: { users: { full_name: 'Sarah Chemutai' } },
    },
    classes: { name: 'Form 2 East' },
  },
  {
    id: 'TT-DEMO-002',
    start_time: '09:30:00',
    end_time: '11:00:00',
    day_of_week: 'Monday',
    room_number: 'Science Lab A',
    class_id: 'CLS-DEMO-001',
    subject_id: 'SUB-DEMO-SCI',
    institution_id: 'DEMO-INST-001',
    subjects: {
      title: 'Integrated Science',
      teachers: { users: { full_name: 'Brian Ochieng' } },
    },
    classes: { name: 'Form 2 East' },
  },
  {
    id: 'TT-DEMO-003',
    start_time: '12:00:00',
    end_time: '13:00:00',
    day_of_week: 'Monday',
    room_number: 'Room 204',
    class_id: 'CLS-DEMO-001',
    subject_id: 'SUB-DEMO-ENG',
    institution_id: 'DEMO-INST-001',
    subjects: {
      title: 'English Language & Literature',
      teachers: { users: { full_name: 'Sarah Chemutai' } },
    },
    classes: { name: 'Form 2 East' },
  },
  {
    id: 'TT-DEMO-004',
    start_time: '14:00:00',
    end_time: '15:30:00',
    day_of_week: 'Monday',
    room_number: 'Bio Lab B',
    class_id: 'CLS-DEMO-001',
    subject_id: 'SUB-DEMO-BIO',
    institution_id: 'DEMO-INST-001',
    subjects: {
      title: 'Biology',
      teachers: { users: { full_name: 'Brian Ochieng' } },
    },
    classes: { name: 'Form 2 East' },
  },
];

// Full weekly timetable (for timetable screen)
const fullTimetable = [
  ...todaysSchedule,
  {
    id: 'TT-DEMO-005',
    start_time: '07:30:00',
    end_time: '09:00:00',
    day_of_week: 'Tuesday',
    room_number: 'Chem Lab C',
    class_id: 'CLS-DEMO-001',
    subject_id: 'SUB-DEMO-CHEM',
    institution_id: 'DEMO-INST-001',
    subjects: { title: 'Chemistry', teachers: { users: { full_name: 'Brian Ochieng' } } },
    classes: { name: 'Form 2 East' },
  },
  {
    id: 'TT-DEMO-006',
    start_time: '10:00:00',
    end_time: '11:00:00',
    day_of_week: 'Tuesday',
    room_number: 'Room 303',
    class_id: 'CLS-DEMO-001',
    subject_id: 'SUB-DEMO-HIST',
    institution_id: 'DEMO-INST-001',
    subjects: { title: 'History & CRE', teachers: { users: { full_name: 'Sarah Chemutai' } } },
    classes: { name: 'Form 2 East' },
  },
  {
    id: 'TT-DEMO-007',
    start_time: '07:30:00',
    end_time: '09:00:00',
    day_of_week: 'Wednesday',
    room_number: 'Room 101',
    class_id: 'CLS-DEMO-001',
    subject_id: 'SUB-DEMO-MATH',
    institution_id: 'DEMO-INST-001',
    subjects: { title: 'Mathematics', teachers: { users: { full_name: 'Sarah Chemutai' } } },
    classes: { name: 'Form 2 East' },
  },
  {
    id: 'TT-DEMO-008',
    start_time: '10:00:00',
    end_time: '11:30:00',
    day_of_week: 'Wednesday',
    room_number: 'Science Lab A',
    class_id: 'CLS-DEMO-001',
    subject_id: 'SUB-DEMO-SCI',
    institution_id: 'DEMO-INST-001',
    subjects: { title: 'Integrated Science', teachers: { users: { full_name: 'Brian Ochieng' } } },
    classes: { name: 'Form 2 East' },
  },
  {
    id: 'TT-DEMO-009',
    start_time: '07:30:00',
    end_time: '09:00:00',
    day_of_week: 'Thursday',
    room_number: 'Room 204',
    class_id: 'CLS-DEMO-001',
    subject_id: 'SUB-DEMO-ENG',
    institution_id: 'DEMO-INST-001',
    subjects: { title: 'English Language & Literature', teachers: { users: { full_name: 'Sarah Chemutai' } } },
    classes: { name: 'Form 2 East' },
  },
  {
    id: 'TT-DEMO-010',
    start_time: '10:00:00',
    end_time: '11:30:00',
    day_of_week: 'Thursday',
    room_number: 'Bio Lab B',
    class_id: 'CLS-DEMO-001',
    subject_id: 'SUB-DEMO-BIO',
    institution_id: 'DEMO-INST-001',
    subjects: { title: 'Biology', teachers: { users: { full_name: 'Brian Ochieng' } } },
    classes: { name: 'Form 2 East' },
  },
  {
    id: 'TT-DEMO-011',
    start_time: '07:30:00',
    end_time: '09:00:00',
    day_of_week: 'Friday',
    room_number: 'Chem Lab C',
    class_id: 'CLS-DEMO-001',
    subject_id: 'SUB-DEMO-CHEM',
    institution_id: 'DEMO-INST-001',
    subjects: { title: 'Chemistry', teachers: { users: { full_name: 'Brian Ochieng' } } },
    classes: { name: 'Form 2 East' },
  },
  {
    id: 'TT-DEMO-012',
    start_time: '10:00:00',
    end_time: '11:00:00',
    day_of_week: 'Friday',
    room_number: 'Room 303',
    class_id: 'CLS-DEMO-001',
    subject_id: 'SUB-DEMO-HIST',
    institution_id: 'DEMO-INST-001',
    subjects: { title: 'History & CRE', teachers: { users: { full_name: 'Sarah Chemutai' } } },
    classes: { name: 'Form 2 East' },
  },
];

// ── Assignments ───────────────────────────────────────────────────
const assignments = [
  {
    id: 'ASS-DEMO-001',
    subject_id: 'SUB-DEMO-MATH',
    teacher_id: 'TCH-DEMO-0001',
    institution_id: 'DEMO-INST-001',
    title: 'Quadratic Equations – Set A',
    description: 'Solve 20 quadratic equations using the formula method and factorisation.',
    due_date: daysFromNow(12),
    total_points: 100,
    status: 'active' as const,
    is_published: true,
    weight: 15,
    term: 'Term 2',
    created_at: daysAgo(10),
    updated_at: daysAgo(2),
    subjects: { title: 'Mathematics' },
  },
  {
    id: 'ASS-DEMO-002',
    subject_id: 'SUB-DEMO-ENG',
    teacher_id: 'TCH-DEMO-0001',
    institution_id: 'DEMO-INST-001',
    title: 'Composition – "A Day I Will Never Forget"',
    description: 'Write a 600-word descriptive essay. Focus on sensory details and narrative flow.',
    due_date: daysFromNow(7),
    total_points: 50,
    status: 'active' as const,
    is_published: true,
    weight: 10,
    term: 'Term 2',
    created_at: daysAgo(8),
    updated_at: daysAgo(1),
    subjects: { title: 'English Language & Literature' },
  },
  {
    id: 'ASS-DEMO-003',
    subject_id: 'SUB-DEMO-SCI',
    teacher_id: 'TCH-DEMO-0002',
    institution_id: 'DEMO-INST-001',
    title: 'Lab Report – Simple Pendulum',
    description: 'Document your experimental findings from the pendulum lab. Include data tables, graphs and sources of error.',
    due_date: daysFromNow(18),
    total_points: 80,
    status: 'active' as const,
    is_published: true,
    weight: 20,
    term: 'Term 2',
    created_at: daysAgo(5),
    updated_at: daysAgo(1),
    subjects: { title: 'Integrated Science' },
  },
  {
    id: 'ASS-DEMO-004',
    subject_id: 'SUB-DEMO-BIO',
    teacher_id: 'TCH-DEMO-0002',
    institution_id: 'DEMO-INST-001',
    title: 'Annotated Cell Diagram',
    description: 'Draw and fully annotate both a plant cell and an animal cell. Highlight organelles and their functions.',
    due_date: daysFromNow(14),
    total_points: 60,
    status: 'active' as const,
    is_published: true,
    weight: 15,
    term: 'Term 2',
    created_at: daysAgo(7),
    updated_at: daysAgo(2),
    subjects: { title: 'Biology' },
  },
  {
    id: 'ASS-DEMO-005',
    subject_id: 'SUB-DEMO-CHEM',
    teacher_id: 'TCH-DEMO-0002',
    institution_id: 'DEMO-INST-001',
    title: 'Periodic Table Elements Quiz',
    description: 'Identify 30 elements with their symbols, atomic numbers and group classifications.',
    due_date: daysAgo(5),
    total_points: 30,
    status: 'closed' as const,
    is_published: true,
    weight: 5,
    term: 'Term 1',
    created_at: daysAgo(25),
    updated_at: daysAgo(5),
    subjects: { title: 'Chemistry' },
  },
  {
    id: 'ASS-DEMO-006',
    subject_id: 'SUB-DEMO-HIST',
    teacher_id: 'TCH-DEMO-0001',
    institution_id: 'DEMO-INST-001',
    title: 'Pre-Colonial Kenya Research Report',
    description: 'Write a 500-word report on one pre-colonial community. Cover their governance, trade and culture.',
    due_date: daysFromNow(21),
    total_points: 100,
    status: 'active' as const,
    is_published: false,
    weight: 20,
    term: 'Term 2',
    created_at: daysAgo(3),
    updated_at: daysAgo(1),
    subjects: { title: 'History & CRE' },
  },
];

// ── Submissions ───────────────────────────────────────────────────
const submissions = [
  {
    id: 'SUB-DEMO-001',
    assignment_id: 'ASS-DEMO-001',
    student_id: 'STU-DEMO-0001',
    institution_id: 'DEMO-INST-001',
    content: 'x = (−b ± √(b²−4ac)) / 2a … [full workings attached]',
    grade: 84,
    feedback: 'Excellent application of the formula. Check signs in Q14–Q15.',
    status: 'graded' as const,
    submitted_at: daysAgo(3),
    updated_at: daysAgo(1),
    assignment: {
      title: 'Quadratic Equations – Set A',
      is_published: true,
      subject: { title: 'Mathematics', id: 'SUB-DEMO-MATH', credits: 4 },
    },
  },
  {
    id: 'SUB-DEMO-002',
    assignment_id: 'ASS-DEMO-002',
    student_id: 'STU-DEMO-0001',
    institution_id: 'DEMO-INST-001',
    content: 'The day I will never forget was the morning of my first national debate competition…',
    grade: 46,
    feedback: 'Strong opening paragraph. Improve conclusion and vary sentence structure.',
    status: 'graded' as const,
    submitted_at: daysAgo(6),
    updated_at: daysAgo(4),
    assignment: {
      title: 'Composition – "A Day I Will Never Forget"',
      is_published: true,
      subject: { title: 'English Language & Literature', id: 'SUB-DEMO-ENG', credits: 3 },
    },
  },
  {
    id: 'SUB-DEMO-003',
    assignment_id: 'ASS-DEMO-005',
    student_id: 'STU-DEMO-0001',
    institution_id: 'DEMO-INST-001',
    content: 'H=Hydrogen(1), He=Helium(2), Li=Lithium(3)… [all 30 elements listed]',
    grade: 27,
    feedback: 'Good recall. Note: Argon atomic number is 18, not 19.',
    status: 'graded' as const,
    submitted_at: daysAgo(10),
    updated_at: daysAgo(6),
    assignment: {
      title: 'Periodic Table Elements Quiz',
      is_published: true,
      subject: { title: 'Chemistry', id: 'SUB-DEMO-CHEM', credits: 4 },
    },
  },
  {
    id: 'SUB-DEMO-004',
    assignment_id: 'ASS-DEMO-003',
    student_id: 'STU-DEMO-0001',
    institution_id: 'DEMO-INST-001',
    content: 'Pendulum experiment report with data table and graph included.',
    grade: null,
    feedback: null,
    status: 'submitted' as const,
    submitted_at: daysAgo(1),
    updated_at: daysAgo(1),
    assignment: {
      title: 'Lab Report – Simple Pendulum',
      is_published: true,
      subject: { title: 'Integrated Science', id: 'SUB-DEMO-SCI', credits: 4 },
    },
  },
];

// ── Grades (student performance summary) ──────────────────────────
const grades = [
  {
    SubjectName: 'Mathematics',
    SubjectCode: 'MATH-F2',
    grade: 'B+',
    score: 84,
    credits: 4,
  },
  {
    SubjectName: 'English Language & Literature',
    SubjectCode: 'ENG-F2',
    grade: 'B',
    score: 78,
    credits: 3,
  },
  {
    SubjectName: 'Integrated Science',
    SubjectCode: 'SCI-F2',
    grade: 'A-',
    score: 88,
    credits: 4,
  },
  {
    SubjectName: 'Biology',
    SubjectCode: 'BIO-F2',
    grade: 'A',
    score: 91,
    credits: 4,
  },
  {
    SubjectName: 'Chemistry',
    SubjectCode: 'CHEM-F2',
    grade: 'B',
    score: 79,
    credits: 4,
  },
  {
    SubjectName: 'History & CRE',
    SubjectCode: 'HIST-F2',
    grade: 'B+',
    score: 82,
    credits: 3,
  },
];

const gradeStats = {
  gpa: 3.62,
  credits: 22,
  totalMarks: 502,
  avgMark: 83.67,
  rank: 4,
  totalStudents: 38,
};

// ── Exams ─────────────────────────────────────────────────────────
const exams = [
  {
    id: 'EXAM-DEMO-001',
    subject_id: 'SUB-DEMO-MATH',
    teacher_id: 'TCH-DEMO-0001',
    institution_id: 'DEMO-INST-001',
    title: 'Mathematics – End of Term 1',
    date: daysAgo(55),
    max_score: 100,
    is_published: true,
    weight: 40,
    term: 'Term 1',
  },
  {
    id: 'EXAM-DEMO-002',
    subject_id: 'SUB-DEMO-BIO',
    teacher_id: 'TCH-DEMO-0002',
    institution_id: 'DEMO-INST-001',
    title: 'Biology – Mid-Term Assessment',
    date: daysAgo(15),
    max_score: 100,
    is_published: true,
    weight: 30,
    term: 'Term 2',
  },
  {
    id: 'EXAM-DEMO-003',
    subject_id: 'SUB-DEMO-ENG',
    teacher_id: 'TCH-DEMO-0001',
    institution_id: 'DEMO-INST-001',
    title: 'English – CAT 1 (Comprehension)',
    date: daysAgo(40),
    max_score: 50,
    is_published: true,
    weight: 20,
    term: 'Term 1',
  },
  {
    id: 'EXAM-DEMO-004',
    subject_id: 'SUB-DEMO-CHEM',
    teacher_id: 'TCH-DEMO-0002',
    institution_id: 'DEMO-INST-001',
    title: 'Chemistry – End of Term 1',
    date: daysAgo(60),
    max_score: 100,
    is_published: true,
    weight: 40,
    term: 'Term 1',
  },
];

const examResults = [
  { exam_id: 'EXAM-DEMO-001', student_id: 'STU-DEMO-0001', score: 78, feedback: 'Good effort – revise simultaneous equations.', graded_by: 'TCH-DEMO-0001', exam: { title: 'Mathematics – End of Term 1', max_score: 100, weight: 40 } },
  { exam_id: 'EXAM-DEMO-002', student_id: 'STU-DEMO-0001', score: 85, feedback: 'Excellent lab knowledge!', graded_by: 'TCH-DEMO-0002', exam: { title: 'Biology – Mid-Term Assessment', max_score: 100, weight: 30 } },
  { exam_id: 'EXAM-DEMO-003', student_id: 'STU-DEMO-0001', score: 44, feedback: 'Improve reading pace and vocabulary.', graded_by: 'TCH-DEMO-0001', exam: { title: 'English – CAT 1 (Comprehension)', max_score: 50, weight: 20 } },
  { exam_id: 'EXAM-DEMO-004', student_id: 'STU-DEMO-0001', score: 71, feedback: 'Solid understanding. Work on balancing equations.', graded_by: 'TCH-DEMO-0002', exam: { title: 'Chemistry – End of Term 1', max_score: 100, weight: 40 } },
];

// ── Attendance ────────────────────────────────────────────────────
const attendanceSummary = {
  gpa: '3.62',
  attendancePct: '91%',
  presentDays: 41,
  absentDays: 4,
  lateDays: 2,
  totalDays: 47,
};

const attendanceRecords = [
  { id: 'ATT-001', student_id: 'STU-DEMO-0001', class_id: 'CLS-DEMO-001', subject_id: 'SUB-DEMO-MATH', date: daysAgo(1), status: 'present', institution_id: 'DEMO-INST-001' },
  { id: 'ATT-002', student_id: 'STU-DEMO-0001', class_id: 'CLS-DEMO-001', subject_id: 'SUB-DEMO-SCI',  date: daysAgo(1), status: 'present', institution_id: 'DEMO-INST-001' },
  { id: 'ATT-003', student_id: 'STU-DEMO-0001', class_id: 'CLS-DEMO-001', subject_id: 'SUB-DEMO-ENG',  date: daysAgo(2), status: 'present', institution_id: 'DEMO-INST-001' },
  { id: 'ATT-004', student_id: 'STU-DEMO-0001', class_id: 'CLS-DEMO-001', subject_id: 'SUB-DEMO-MATH', date: daysAgo(3), status: 'absent',  institution_id: 'DEMO-INST-001' },
  { id: 'ATT-005', student_id: 'STU-DEMO-0001', class_id: 'CLS-DEMO-001', subject_id: 'SUB-DEMO-BIO',  date: daysAgo(4), status: 'present', institution_id: 'DEMO-INST-001' },
  { id: 'ATT-006', student_id: 'STU-DEMO-0001', class_id: 'CLS-DEMO-001', subject_id: 'SUB-DEMO-CHEM', date: daysAgo(5), status: 'late',    institution_id: 'DEMO-INST-001' },
  { id: 'ATT-007', student_id: 'STU-DEMO-0001', class_id: 'CLS-DEMO-001', subject_id: 'SUB-DEMO-HIST', date: daysAgo(6), status: 'present', institution_id: 'DEMO-INST-001' },
  { id: 'ATT-008', student_id: 'STU-DEMO-0001', class_id: 'CLS-DEMO-001', subject_id: 'SUB-DEMO-MATH', date: daysAgo(7), status: 'present', institution_id: 'DEMO-INST-001' },
];

// ── Finance (Student) ─────────────────────────────────────────────
const studentFinance = {
  balance: 8_750.00,       // outstanding in USD
  total_fees: 32_500.00,
  paid_amount: 23_750.00,
  transactions: [
    { id: 'TX-001', type: 'fee_payment',    direction: 'inflow',  amount: 12_500.00, date: daysAgo(30),  method: 'mobile_money',  reference: 'MPD20260501', status: 'completed' },
    { id: 'TX-002', type: 'tuition_charge', direction: 'outflow', amount: 32_500.00, date: daysAgo(90),  method: 'system',        reference: 'CHG-T2-2026', status: 'completed' },
    { id: 'TX-003', type: 'fee_payment',    direction: 'inflow',  amount: 11_250.00, date: daysAgo(65),  method: 'bank_transfer', reference: 'KCB2026043X', status: 'completed' },
    { id: 'TX-004', type: 'grant',          direction: 'inflow',  amount: 5_000.00,  date: daysAgo(45),  method: 'direct_credit', reference: 'BUR-EXCL-01', status: 'completed' },
  ],
};

// ── Bursaries ─────────────────────────────────────────────────────
const bursaries = [
  {
    id: 'BUR-DEMO-001',
    title: 'Academic Excellence Scholarship',
    description: 'Awarded to students maintaining an overall average above 80% for the academic year.',
    amount: 15_000,
    deadline: daysFromNow(45),
    requirements: 'Latest end-of-term report card with 80%+ average required.',
    status: 'open' as const,
    institution_id: 'DEMO-INST-001',
    created_at: daysAgo(60),
  },
  {
    id: 'BUR-DEMO-002',
    title: 'Need-Based Support Grant',
    description: 'Financial assistance for students facing genuine economic hardship.',
    amount: 10_000,
    deadline: daysFromNow(30),
    requirements: 'Signed letter from parent/guardian explaining financial situation.',
    status: 'open' as const,
    institution_id: 'DEMO-INST-001',
    created_at: daysAgo(45),
  },
];

const bursaryApplications = [
  {
    id: 'BAPP-DEMO-001',
    bursary_id: 'BUR-DEMO-001',
    student_id: 'STU-DEMO-0001',
    status: 'approved' as const,
    justification: 'Student achieved 84% average – top performer in Form 2 East.',
    amount_awarded: 15_000,
    notes: 'Excellence award',
    created_at: daysAgo(20),
    institution_id: 'DEMO-INST-001',
    bursary: {
      title: 'Academic Excellence Scholarship',
      description: 'Awarded to students maintaining an overall average above 80% for the academic year.',
      amount: 15_000,
      deadline: daysFromNow(45),
      status: 'open',
    },
  },
];

// ── Library ───────────────────────────────────────────────────────
const libraryItems = [
  { id: 'LIB-001', title: 'Form 2 Mathematics Textbook',       author: 'Kenya Institute of Curriculum Development', isbn: '978-9966-01-101-8', category: 'Mathematics', total_quantity: 20, available_quantity: 17, location: 'Shelf A-1', institution_id: 'DEMO-INST-001', created_at: daysAgo(365), updated_at: daysAgo(5) },
  { id: 'LIB-002', title: 'Biology for Secondary Schools',     author: 'Longhorn Publishers',                       isbn: '978-9966-01-202-2', category: 'Science',     total_quantity: 15, available_quantity: 13, location: 'Shelf B-2', institution_id: 'DEMO-INST-001', created_at: daysAgo(365), updated_at: daysAgo(10) },
  { id: 'LIB-003', title: 'English Grammar & Composition F2',  author: 'Oxford University Press EA',                isbn: '978-9966-01-303-6', category: 'Languages',   total_quantity: 25, available_quantity: 22, location: 'Shelf C-1', institution_id: 'DEMO-INST-001', created_at: daysAgo(365), updated_at: daysAgo(2) },
  { id: 'LIB-004', title: 'Chemistry for Secondary Schools',   author: 'Jomo Kenyatta Foundation',                 isbn: '978-9966-01-404-9', category: 'Science',     total_quantity: 18, available_quantity: 14, location: 'Shelf B-3', institution_id: 'DEMO-INST-001', created_at: daysAgo(365), updated_at: daysAgo(8) },
  { id: 'LIB-005', title: 'History of East Africa',           author: 'East African Educational Publishers',      isbn: '978-9966-01-505-3', category: 'History',     total_quantity: 12, available_quantity: 10, location: 'Shelf D-1', institution_id: 'DEMO-INST-001', created_at: daysAgo(365), updated_at: daysAgo(14) },
  { id: 'LIB-006', title: 'Things Fall Apart',                author: 'Chinua Achebe',                            isbn: '978-0-435-90536-4', category: 'Literature',  total_quantity: 30, available_quantity: 26, location: 'Shelf C-2', institution_id: 'DEMO-INST-001', created_at: daysAgo(300), updated_at: daysAgo(3) },
  { id: 'LIB-007', title: 'A Grain of Wheat',                 author: 'Ngũgĩ wa Thiong\'o',                       isbn: '978-0-141-18695-0', category: 'Literature',  total_quantity: 22, available_quantity: 19, location: 'Shelf C-3', institution_id: 'DEMO-INST-001', created_at: daysAgo(300), updated_at: daysAgo(7) },
  { id: 'LIB-008', title: 'Atlas of Africa',                  author: 'National Geographic Society',              isbn: '978-9966-01-606-5', category: 'Geography',   total_quantity: 6,  available_quantity: 6,  location: 'Shelf D-2', institution_id: 'DEMO-INST-001', created_at: daysAgo(365), updated_at: daysAgo(30) },
];

const libraryLoans = [
  {
    id: 'LOAN-001',
    item_id: 'LIB-001',
    user_id: users.student.id,
    borrow_date: daysAgo(10),
    due_date: daysFromNow(4),
    return_date: null,
    status: 'borrowed' as const,
    notes: null,
    institution_id: 'DEMO-INST-001',
    library_items: { title: 'Form 2 Mathematics Textbook', author: 'Kenya Institute of Curriculum Development' },
  },
  {
    id: 'LOAN-002',
    item_id: 'LIB-006',
    user_id: users.student.id,
    borrow_date: daysAgo(20),
    due_date: daysAgo(6),
    return_date: daysAgo(5),
    status: 'returned' as const,
    notes: 'Returned in good condition.',
    institution_id: 'DEMO-INST-001',
    library_items: { title: 'Things Fall Apart', author: 'Chinua Achebe' },
  },
];

// ── Announcements ─────────────────────────────────────────────────
const announcements = [
  {
    id: 'ANN-DEMO-001',
    subject_id: 'SUB-DEMO-MATH',
    teacher_id: 'TCH-DEMO-0001',
    institution_id: 'DEMO-INST-001',
    title: 'Assignment Deadline Reminder',
    message: 'Please submit "Quadratic Equations – Set A" by the due date. Late submissions will attract a 10% penalty per day.',
    created_at: daysAgo(2),
    updated_at: daysAgo(2),
    subjects: { title: 'Mathematics' },
    teachers: { users: { full_name: 'Sarah Chemutai' } },
  },
  {
    id: 'ANN-DEMO-002',
    subject_id: 'SUB-DEMO-BIO',
    teacher_id: 'TCH-DEMO-0002',
    institution_id: 'DEMO-INST-001',
    title: 'Lab Sessions – Week of June 9',
    message: 'Biology lab sessions for cell division will be held Tuesday and Thursday in Bio Lab B. Please bring your lab coat and goggles.',
    created_at: daysAgo(3),
    updated_at: daysAgo(3),
    subjects: { title: 'Biology' },
    teachers: { users: { full_name: 'Brian Ochieng' } },
  },
  {
    id: 'ANN-DEMO-003',
    subject_id: 'SUB-DEMO-ENG',
    teacher_id: 'TCH-DEMO-0001',
    institution_id: 'DEMO-INST-001',
    title: 'Set Book: "Things Fall Apart" – Reading Schedule',
    message: 'All Form 2 students must complete Chapters 1–8 of "Things Fall Apart" before next week\'s class. Discussion questions will be shared on Thursday.',
    created_at: daysAgo(5),
    updated_at: daysAgo(5),
    subjects: { title: 'English Language & Literature' },
    teachers: { users: { full_name: 'Sarah Chemutai' } },
  },
  {
    id: 'ANN-DEMO-004',
    subject_id: 'SUB-DEMO-CHEM',
    teacher_id: 'TCH-DEMO-0002',
    institution_id: 'DEMO-INST-001',
    title: 'Chemistry Exam Results Published',
    message: 'End-of-Term 1 Chemistry results are now available. Please review your feedback carefully. Re-marking requests must be submitted within 5 days.',
    created_at: daysAgo(7),
    updated_at: daysAgo(7),
    subjects: { title: 'Chemistry' },
    teachers: { users: { full_name: 'Brian Ochieng' } },
  },
];

// ── Diary Entries ─────────────────────────────────────────────────
const diaryEntries = [
  {
    id: 'DIARY-001',
    institution_id: 'DEMO-INST-001',
    class_id: 'CLS-DEMO-001',
    teacher_id: 'TCH-DEMO-0001',
    title: 'Lesson: Introduction to Quadratic Equations',
    content: 'Introduced quadratic expressions and their standard form ax²+bx+c=0. Students practised factoring and the discriminant. Homework: Exercise 5B, questions 1–15.',
    entry_date: daysAgo(2),
    teachers: { users: { full_name: 'Sarah Chemutai' } },
    classes: { name: 'Form 2 East' },
  },
  {
    id: 'DIARY-002',
    institution_id: 'DEMO-INST-001',
    class_id: 'CLS-DEMO-001',
    teacher_id: 'TCH-DEMO-0001',
    title: 'Lesson: Comprehension – Newspaper Extract',
    content: 'Students read a newspaper opinion piece and answered comprehension questions. Focused on inference, vocabulary in context, and writer\'s intent. Class discussion was lively.',
    entry_date: daysAgo(3),
    teachers: { users: { full_name: 'Sarah Chemutai' } },
    classes: { name: 'Form 2 East' },
  },
  {
    id: 'DIARY-003',
    institution_id: 'DEMO-INST-001',
    class_id: 'CLS-DEMO-001',
    teacher_id: 'TCH-DEMO-0002',
    title: 'Lab: Cell Division – Stages of Mitosis',
    content: 'Covered the four stages of mitosis (prophase, metaphase, anaphase, telophase) with microscope slides. Students drew and labelled diagrams. Short quiz scheduled for next lesson.',
    entry_date: daysAgo(4),
    teachers: { users: { full_name: 'Brian Ochieng' } },
    classes: { name: 'Form 2 East' },
  },
  {
    id: 'DIARY-004',
    institution_id: 'DEMO-INST-001',
    class_id: 'CLS-DEMO-001',
    teacher_id: 'TCH-DEMO-0002',
    title: 'Lesson: Periodic Table Trends',
    content: 'Discussed trends across periods and down groups (atomic radius, electronegativity, ionisation energy). Students completed the group activity on element properties. Homework: Revision sheet 4.',
    entry_date: daysAgo(6),
    teachers: { users: { full_name: 'Brian Ochieng' } },
    classes: { name: 'Form 2 East' },
  },
];

// ── Admin Dashboard Stats ─────────────────────────────────────────
const dashboardStats = [
  { label: 'Total Students', value: '1,248', icon: 'users',    color: 'blue'   },
  { label: 'Teachers',       value: '87',    icon: 'school',   color: 'green'  },
  { label: 'Subjects',       value: '44',    icon: 'book',     color: 'purple' },
  {
    label: 'Attendance',
    value: '88%',
    subValue: '1,099 present today',
    icon: 'calendar',
    color: 'orange',
  },
  {
    label: 'Revenue',
    value: 'KES 3,185,000',
    subValue: '$24,688',
    icon: 'wallet',
    color: 'yellow',
  },
];

// 7-day revenue chart data
const revenueData = (() => {
  const baseAmounts = [58000, 72000, 49000, 85000, 63000, 94000, 77000];
  return baseAmounts.map((amount, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return {
      day: `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`,
      amount,
    };
  });
})();

// ── Recent Users (Admin dashboard) ───────────────────────────────
const recentUsers = [
  { id: 'u1', displayId: 'STU-DEMO-1031', name: 'Amina Hassan',     first_name: 'Amina',   last_name: 'Hassan',    email: 'amina.hassan@cloudoraacademy.ac.ke',   role: 'student', joinDate: daysAgo(1)  },
  { id: 'u2', displayId: 'TCH-DEMO-0088', name: 'Dr. Felix Ndung\'u', first_name: 'Felix',  last_name: 'Ndungu',   email: 'f.ndungu@cloudoraacademy.ac.ke',        role: 'teacher', joinDate: daysAgo(2)  },
  { id: 'u3', displayId: 'STU-DEMO-1032', name: 'Peter Kamau',      first_name: 'Peter',   last_name: 'Kamau',     email: 'peter.kamau@cloudoraacademy.ac.ke',     role: 'student', joinDate: daysAgo(3)  },
  { id: 'u4', displayId: 'PAR-DEMO-0044', name: 'Mary Njeri',       first_name: 'Mary',    last_name: 'Njeri',     email: 'mary.njeri@cloudoraacademy.ac.ke',      role: 'parent',  joinDate: daysAgo(4)  },
  { id: 'u5', displayId: 'STU-DEMO-1033', name: 'Grace Wanjiku',    first_name: 'Grace',   last_name: 'Wanjiku',   email: 'grace.wanjiku@cloudoraacademy.ac.ke',   role: 'student', joinDate: daysAgo(5)  },
  { id: 'u6', displayId: 'TCH-DEMO-0089', name: 'James Abuor',      first_name: 'James',   last_name: 'Abuor',     email: 'j.abuor@cloudoraacademy.ac.ke',         role: 'teacher', joinDate: daysAgo(6)  },
  { id: 'u7', displayId: 'STU-DEMO-1034', name: 'David Mutuku',     first_name: 'David',   last_name: 'Mutuku',    email: 'david.mutuku@cloudoraacademy.ac.ke',    role: 'student', joinDate: daysAgo(7)  },
];

// ── Admin – Student list (for classes/users screens) ──────────────
const studentList = [
  { id: 'STU-DEMO-0001', full_name: 'Kelson Otieno',  form_level: 2, fee_balance: 8_750,  academic_year: '2026', class: 'Form 2 East' },
  { id: 'STU-DEMO-0002', full_name: 'Amina Hassan',   form_level: 1, fee_balance: 0,       academic_year: '2026', class: 'Form 1 North' },
  { id: 'STU-DEMO-0003', full_name: 'Peter Kamau',    form_level: 2, fee_balance: 15_200,  academic_year: '2026', class: 'Form 2 East' },
  { id: 'STU-DEMO-0004', full_name: 'Grace Wanjiku',  form_level: 1, fee_balance: 3_000,   academic_year: '2026', class: 'Form 1 North' },
  { id: 'STU-DEMO-0005', full_name: 'David Mutuku',   form_level: 2, fee_balance: 0,       academic_year: '2026', class: 'Form 2 East' },
  { id: 'STU-DEMO-0006', full_name: 'Faith Akinyi',   form_level: 3, fee_balance: 5_500,   academic_year: '2026', class: 'Form 3 West' },
  { id: 'STU-DEMO-0007', full_name: 'Samuel Kipchoge',form_level: 3, fee_balance: 0,       academic_year: '2026', class: 'Form 3 West' },
];

// ── Admin – Teacher list ──────────────────────────────────────────
const teacherList = [
  { id: 'TCH-DEMO-0001', full_name: 'Sarah Chemutai',  department: 'Mathematics & Sciences', qualification: 'MEd', position: 'class_teacher', specialization: 'Algebra & Statistics' },
  { id: 'TCH-DEMO-0002', full_name: 'Brian Ochieng',   department: 'Sciences',               qualification: 'BSc', position: 'teacher',       specialization: 'Biology & Chemistry'  },
  { id: 'TCH-DEMO-0003', full_name: 'Dr. Felix Ndung\'u', department: 'Languages',           qualification: 'PhD', position: 'head_of_department', specialization: 'English Literature' },
  { id: 'TCH-DEMO-0004', full_name: 'Christine Odhiambo', department: 'Humanities',          qualification: 'BEd', position: 'teacher',       specialization: 'History & Geography' },
];

// ── Fee Structures ────────────────────────────────────────────────
const feeStructures = [
  { id: 'FEE-001', title: 'Tuition Fee – Term 2 2026',   amount: 25_000, academic_year: '2026', term: 'Term 2', institution_id: 'DEMO-INST-001', is_active: true },
  { id: 'FEE-002', title: 'Activity & Uniform Fee',       amount:  4_500, academic_year: '2026', term: 'Term 2', institution_id: 'DEMO-INST-001', is_active: true },
  { id: 'FEE-003', title: 'Library & Resource Fee',       amount:  2_000, academic_year: '2026', term: 'Term 2', institution_id: 'DEMO-INST-001', is_active: true },
  { id: 'FEE-004', title: 'Technology & ICT Levy',        amount:  1_000, academic_year: '2026', term: 'Term 2', institution_id: 'DEMO-INST-001', is_active: true },
];

// ── Financial Transactions (Admin Finance) ────────────────────────
const financialTransactions = [
  { id: 'FTX-001', type: 'fee_payment',   direction: 'inflow',  amount: 25_000, date: daysAgo(2),  method: 'mobile_money',  status: 'completed', reference_id: 'MPD20260601', meta: { student: 'Amina Hassan',   class: 'Form 1 North' } },
  { id: 'FTX-002', type: 'fee_payment',   direction: 'inflow',  amount: 29_500, date: daysAgo(3),  method: 'bank_transfer', status: 'completed', reference_id: 'KCB2026060X', meta: { student: 'David Mutuku',   class: 'Form 2 East'  } },
  { id: 'FTX-003', type: 'fee_payment',   direction: 'inflow',  amount: 32_500, date: daysAgo(5),  method: 'mobile_money',  status: 'completed', reference_id: 'MPD20260599', meta: { student: 'Samuel Kipchoge',class: 'Form 3 West'  } },
  { id: 'FTX-004', type: 'salary_payout', direction: 'outflow', amount: 48_000, date: daysAgo(7),  method: 'bank_transfer', status: 'completed', reference_id: 'SAL-MAY-001', meta: { teacher: 'Sarah Chemutai'  } },
  { id: 'FTX-005', type: 'salary_payout', direction: 'outflow', amount: 42_000, date: daysAgo(7),  method: 'bank_transfer', status: 'completed', reference_id: 'SAL-MAY-002', meta: { teacher: 'Brian Ochieng'   } },
  { id: 'FTX-006', type: 'expense',       direction: 'outflow', amount:  9_200, date: daysAgo(10), method: 'cash',          status: 'completed', reference_id: 'EXP-LAB-001', meta: { description: 'Science lab supplies & reagents' } },
  { id: 'FTX-007', type: 'grant',         direction: 'inflow',  amount: 15_000, date: daysAgo(14), method: 'direct_credit', status: 'completed', reference_id: 'BUR-EXCL-01', meta: { description: 'Excellence bursary – Kelson Otieno' } },
  { id: 'FTX-008', type: 'fee_payment',   direction: 'inflow',  amount: 4_500,  date: daysAgo(15), method: 'mobile_money',  status: 'completed', reference_id: 'MPD20260580', meta: { student: 'Grace Wanjiku',  class: 'Form 1 North' } },
  { id: 'FTX-009', type: 'expense',       direction: 'outflow', amount: 15_000, date: daysAgo(20), method: 'bank_transfer', status: 'completed', reference_id: 'EXP-LIB-001', meta: { description: 'New library books acquisition' } },
  { id: 'FTX-010', type: 'fee_payment',   direction: 'inflow',  amount: 21_000, date: daysAgo(22), method: 'bank_transfer', status: 'completed', reference_id: 'KCB2026051X', meta: { student: 'Faith Akinyi',   class: 'Form 3 West'  } },
];

// ── Academic Reports ──────────────────────────────────────────────
const academicReports = [
  {
    student_id: 'STU-DEMO-0001',
    institution_id: 'DEMO-INST-001',
    term: 'Term 1',
    academic_year: '2026',
    report_type: 'end-of-term',
    status: 'published',
    data: {
      subjects: [
        { name: 'Mathematics',                   score: 78, grade: 'B+' },
        { name: 'English Language & Literature', score: 74, grade: 'B'  },
        { name: 'Integrated Science',            score: 88, grade: 'A-' },
        { name: 'Biology',                       score: 85, grade: 'A-' },
        { name: 'Chemistry',                     score: 71, grade: 'B'  },
        { name: 'History & CRE',                 score: 80, grade: 'B+' },
      ],
      average: 79.3,
      rank: 5,
      total_students: 38,
      remarks: 'Commendable performance. Science subjects particularly strong. Focus on English essay structure.',
    },
  },
];

// ── Parent – Children overview ────────────────────────────────────
const parentChildren = [
  {
    student: {
      id: 'STU-DEMO-0001',
      full_name: 'Kelson Otieno',
      form_level: 2,
      class: 'Form 2 East',
      academic_year: '2026',
    },
    relationship: 'Father',
    gpa: '3.62',
    attendancePct: '91%',
    feeBalance: 8_750,
    recentGrade: 'B+',
    lastReportRank: 5,
  },
];

// ── Messages (Demo conversations) ────────────────────────────────
const messages = [
  {
    id: 'MSG-001',
    sender_id: 'TCH-DEMO-0001',
    recipient_id: users.student.id,
    subject: 'Mathematics Assignment Feedback',
    body: 'Hi Kelson, great work on the quadratic equations assignment! Your methodology was clear and well-presented. For improvement, revisit Q14 and Q15 – you made a sign error in the discriminant calculation. Keep it up!',
    is_read: false,
    created_at: daysAgo(1),
    sender: { full_name: 'Sarah Chemutai', role: 'teacher' },
  },
  {
    id: 'MSG-002',
    sender_id: users.student.id,
    recipient_id: 'TCH-DEMO-0001',
    subject: 'Re: Mathematics Assignment Feedback',
    body: 'Thank you, Ms. Chemutai! I will review those questions carefully and resubmit the corrected working.',
    is_read: true,
    created_at: daysAgo(1),
    sender: { full_name: 'Kelson Otieno', role: 'student' },
  },
  {
    id: 'MSG-003',
    sender_id: 'ADM-DEMO-0001',
    recipient_id: users.student.id,
    subject: 'Term 2 Fee Reminder',
    body: 'Dear Kelson, this is a reminder that Term 2 tuition fees are due by June 30, 2026. Please ensure full payment is made to avoid late-payment charges. Contact the bursary office for payment plans.',
    is_read: false,
    created_at: daysAgo(3),
    sender: { full_name: 'Angela Muthoni (Admin)', role: 'admin' },
  },
];

// ── Notifications ─────────────────────────────────────────────────
const notifications = [
  { id: 'NOTIF-001', title: 'Assignment Due Soon',    body: '"Quadratic Equations – Set A" is due in 12 days.',              type: 'assignment', is_read: false, created_at: daysAgo(0) },
  { id: 'NOTIF-002', title: 'Exam Result Available',  body: 'Your Biology Mid-Term result (85/100) has been published.',     type: 'exam',       is_read: false, created_at: daysAgo(1) },
  { id: 'NOTIF-003', title: 'Bursary Approved!',      body: 'Your Excellence Scholarship application has been approved.',    type: 'bursary',    is_read: true,  created_at: daysAgo(2) },
  { id: 'NOTIF-004', title: 'New Announcement',       body: 'Ms. Chemutai posted a reading schedule for "Things Fall Apart".', type: 'announcement', is_read: true, created_at: daysAgo(5) },
  { id: 'NOTIF-005', title: 'Library Book Due',       body: 'Your borrowed book "Form 2 Mathematics Textbook" is due in 4 days.', type: 'library', is_read: false, created_at: daysAgo(1) },
];

// ─────────────────────────────────────────────────────────────────
// Master export – organized by consumer
// ─────────────────────────────────────────────────────────────────
const demoDummyData = {
  /** Core metadata */
  institution,
  users,
  roleRecords,

  /** Shared academic structure */
  classes,
  subjects,

  /** Student-facing data */
  student: {
    profile: users.student,
    roleRecord: roleRecords.student,
    gpa: '3.62',
    attendancePct: '91%',
    todaysSchedule,
    fullTimetable,
    grades,
    gradeStats,
    assignments,
    submissions,
    attendanceSummary,
    attendanceRecords,
    finance: studentFinance,
    bursaries: bursaryApplications,
    libraryLoans,
    announcements,
    diaryEntries,
    messages,
    notifications,
    academicReports,
  },

  /** Teacher-facing data */
  teacher: {
    profile: users.teacher,
    roleRecord: roleRecords.teacher,
    classes,
    subjects,
    assignments,
    submissions,
    exams,
    examResults,
    announcements,
    diaryEntries,
    studentList,
    fullTimetable,
    students: studentList,
    dashboardStats: { studentsCount: 42, subjectsCount: 4 },
    schedule: todaysSchedule,
    subjectAnalytics: [
        { id: '1', name: "Advanced Mathematics", students: 12, avgProgress: 88, avgGrade: 84, completionRate: 88 },
        { id: '2', name: "Theoretical Physics", students: 10, avgProgress: 75, avgGrade: 78, completionRate: 75 },
        { id: '3', name: "Software Engineering", students: 15, avgProgress: 92, avgGrade: 89, completionRate: 92 },
        { id: '4', name: "Database Systems", students: 5, avgProgress: 100, avgGrade: 92, completionRate: 100 }
    ],
    topPerformers: [
        { name: "Sarah J.", initials: "SJ", score: 98 },
        { name: "Michael C.", initials: "MC", score: 95 },
        { name: "Grace W.", initials: "GW", score: 94 },
    ],
    earnings: [
        { id: 'demo-1', description: "Performance Bonus - Jan", amount: 500.00, date: 'Jan 28, 2024', status: 'completed' },
        { id: 'demo-2', description: "Monthly Salary - Jan", amount: 1950.00, date: 'Jan 25, 2024', status: 'completed' },
        { id: 'demo-3', description: "Subject Bonus - Feb", amount: 450.00, date: 'Feb 12, 2024', status: 'pending' },
    ],
  },

  /** Admin-facing data */
  admin: {
    profile: users.admin,
    roleRecord: roleRecords.admin,
    dashboardStats,
    revenueData,
    recentUsers,
    studentList,
    teacherList,
    classes,
    subjects,
    feeStructures,
    financialTransactions,
    bursaries,
    bursaryApplications,
    libraryItems,
    announcements,
    exams,
    examResults,

    /** Finance screen – Payment[] */
    payments: [
      { id: 'PAY-001', student_id: 'STU-DEMO-0001', student_name: 'Kelson Otieno',   student_display_id: 'STU-DEMO-0001', amount: 25_000, payment_date: daysAgo(2),  payment_method: 'mobile_money'  as const, status: 'completed' as const, reference_number: 'MPD20260601' },
      { id: 'PAY-002', student_id: 'STU-DEMO-0002', student_name: 'Amina Hassan',    student_display_id: 'STU-DEMO-0002', amount: 29_500, payment_date: daysAgo(3),  payment_method: 'bank_transfer' as const, status: 'completed' as const, reference_number: 'KCB2026060X' },
      { id: 'PAY-003', student_id: 'STU-DEMO-0003', student_name: 'Samuel Kipchoge', student_display_id: 'STU-DEMO-0003', amount: 32_500, payment_date: daysAgo(5),  payment_method: 'mobile_money'  as const, status: 'completed' as const, reference_number: 'MPD20260599' },
      { id: 'PAY-004', student_id: 'STU-DEMO-0004', student_name: 'Grace Wanjiku',   student_display_id: 'STU-DEMO-0004', amount:  4_500, payment_date: daysAgo(15), payment_method: 'mobile_money'  as const, status: 'completed' as const, reference_number: 'MPD20260580' },
      { id: 'PAY-005', student_id: 'STU-DEMO-0005', student_name: 'Faith Akinyi',    student_display_id: 'STU-DEMO-0005', amount: 21_000, payment_date: daysAgo(22), payment_method: 'bank_transfer' as const, status: 'completed' as const, reference_number: 'KCB2026051X' },
      { id: 'PAY-006', student_id: 'STU-DEMO-0006', student_name: 'David Mutuku',    student_display_id: 'STU-DEMO-0006', amount: 15_000, payment_date: daysAgo(30), payment_method: 'cash'          as const, status: 'pending'   as const, reference_number: 'CSH20260501' },
    ],

    /** Finance screen – TeacherPayout[] */
    earnings: [
      { id: 'PAY-TCH-001', teacher_id: 'TCH-DEMO-0001', teacher_name: 'Sarah Chemutai', teacher_display_id: 'TCH-DEMO-0001', amount: 48_000, hours_taught: 80, rate_per_hour: 600, period_start: daysAgo(37), period_end: daysAgo(7),  status: 'paid'       as const, payment_date: daysAgo(7),  reference_number: 'SAL-MAY-001' },
      { id: 'PAY-TCH-002', teacher_id: 'TCH-DEMO-0002', teacher_name: 'Brian Ochieng',  teacher_display_id: 'TCH-DEMO-0002', amount: 42_000, hours_taught: 70, rate_per_hour: 600, period_start: daysAgo(37), period_end: daysAgo(7),  status: 'paid'       as const, payment_date: daysAgo(7),  reference_number: 'SAL-MAY-002' },
      { id: 'PAY-TCH-003', teacher_id: 'TCH-DEMO-0003', teacher_name: 'Janet Njoroge',  teacher_display_id: 'TCH-DEMO-0003', amount: 45_000, hours_taught: 75, rate_per_hour: 600, period_start: daysAgo(67), period_end: daysAgo(37), status: 'paid'       as const, payment_date: daysAgo(37), reference_number: 'SAL-APR-001' },
      { id: 'PAY-TCH-004', teacher_id: 'TCH-DEMO-0001', teacher_name: 'Sarah Chemutai', teacher_display_id: 'TCH-DEMO-0001', amount: 48_000, hours_taught: 80, rate_per_hour: 600, period_start: daysAgo(7),  period_end: daysAgo(0),  status: 'pending'    as const },
    ],
  },

  /** Parent-facing data */
  parent: {
    profile: users.parent,
    roleRecord: roleRecords.parent,
    children: parentChildren,
    announcements,
    notifications,
  },
};

export default demoDummyData;