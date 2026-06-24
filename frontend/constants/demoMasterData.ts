/**
 * Demo Master Data (Mock Database)
 * This acts as the source of truth for all "Demo Mode" sessions.
 */

export const DEMO_MASTER_DATA: Record<string, any> = {
  // --- Teacher Mode ---
  '/teacher/dashboard/stats': {
    stats: { studentsCount: 542, subjectsCount: 8, unreadNotifications: 12 },
    schedule: [
      { id: '1', subjects: { title: 'Mathematics' }, classes: { display_name: 'Form 1 Alpha' }, start_time: '08:00', end_time: '09:00', room_number: 'Room 101' },
      { id: '2', subjects: { title: 'Physics' }, classes: { display_name: 'Form 2 Beta' }, start_time: '10:00', end_time: '11:00', room_number: 'Lab 3' },
      { id: '3', subjects: { title: 'Advanced Math' }, classes: { display_name: 'Form 4 Alpha' }, start_time: '12:00', end_time: '13:00', room_number: 'Room 204' }
    ]
  },
  '/teacher/dashboard': {
    stats: { studentsCount: 542, subjectsCount: 8, unreadNotifications: 12 },
    schedule: [
      { id: '1', subjects: { title: 'Mathematics' }, classes: { display_name: 'Form 1 Alpha' }, start_time: '08:00', end_time: '09:00', room_number: 'Room 101' },
      { id: '2', subjects: { title: 'Physics' }, classes: { display_name: 'Form 2 Beta' }, start_time: '10:00', end_time: '11:00', room_number: 'Lab 3' },
      { id: '3', subjects: { title: 'Advanced Math' }, classes: { display_name: 'Form 4 Alpha' }, start_time: '12:00', end_time: '13:00', room_number: 'Room 204' }
    ]
  },

  '/teacher/classes': [
    { id: '1', display_name: 'Form 1 Alpha', student_count: 45, stream: 'Alpha', form_level: 1 },
    { id: '2', display_name: 'Form 2 Beta', student_count: 38, stream: 'Beta', form_level: 2 }
  ],

  '/teacher/subjects': [
    { id: '1', title: 'Mathematics', class_id: '1', class: { display_name: 'Form 1 Alpha' } },
    { id: '2', title: 'Physics', class_id: '2', class: { display_name: 'Form 2 Beta' } }
  ],

  '/academic/assignments': [
    { id: '1', title: 'Calculus Basics', due_date: '2026-05-20', status: 'active', submissions_count: 24, subject: { title: 'Mathematics' } },
    { id: '2', title: 'Newtonian Laws', due_date: '2026-05-22', status: 'active', submissions_count: 18, subject: { title: 'Physics' } }
  ],

  '/academic/announcements': [
    { id: '1', title: 'Term 2 Opening', message: 'Welcome back! Term 2 starts Monday.', created_at: '2026-05-01' },
    { id: '2', title: 'Inter-School Sports', message: 'Join the basketball team for the finals.', created_at: '2026-05-05' }
  ],

  '/resources': [
    { id: '1', title: 'Algebra Guide', type: 'PDF', category: 'Math', created_at: '2026-05-01', subject: { title: 'Math' } },
    { id: '2', title: 'Physics Experiment', type: 'Video', category: 'Science', created_at: '2026-05-05', subject: { title: 'Physics' } }
  ],

  '/diary': [
    { id: '1', title: 'Integration by Parts', content: 'The students performed well on today\'s lab.', entry_date: '2026-05-12', teacher: { users: { full_name: 'Sarah Lead' } } }
  ],

  // --- Student Mode ---
  '/student/me/finance': { 
    balance: 2500, total_fees: 15000, paid_amount: 12500, 
    fee_structure: [
      { 
        id: 'FS-001', 
        Subject_id: 'SUB-101', 
        Subject_name: 'Grade 12 Tuition', 
        base_fee: 45000, 
        registration_fee: 5000, 
        material_fee: 2000, 
        teacher_rate: 1500, 
        bursary_percentage: 10, 
        effective_date: '2024-01-01', 
        is_active: true 
      }
    ],
    transactions: [
      { 
        id: 'TX-001', 
        amount: 12500, 
        date: '2026-01-10', 
        status: 'completed', 
        reference_id: 'PAY-1',
        user_id: 'USER-GEN-0',
        student: { id: 'STU-GEN-0', user: { full_name: 'Alex Zulu' } },
        users: { full_name: 'Alex Zulu', first_name: 'Alex' }
      },
      { 
        id: 'TX-002', 
        amount: 8000, 
        date: '2026-03-05', 
        status: 'completed', 
        reference_id: 'PAY-2',
        user_id: 'USER-GEN-1',
        student: { id: 'STU-GEN-1', user: { full_name: 'Sarah Zulu' } },
        users: { full_name: 'Sarah Zulu', first_name: 'Sarah' }
      }
    ]
  },

  '/student/me/timetable': [
    { id: '1', subject: { title: 'Math' }, start_time: '08:00', end_time: '09:00', day_of_week: 1 },
    { id: '2', subject: { title: 'Physics' }, start_time: '10:00', end_time: '11:00', day_of_week: 1 }
  ],

  '/student/performance': {
    stats: { avgGrade: 84, rank: 5, attendance: 98 },
    grades: [{ id: '1', subject: { title: 'Math' }, total_grade: 88, date: '2026-05-01' }],
    submissions: [{ id: '1', assignment: { title: 'Calculus' }, status: 'graded', score: 88 }]
  },
  '/student/dashboard/stats': {
    gpa: "3.85",
    attendancePct: "94%",
    todaysSchedule: [
      {
        id: 'demo-1',
        start_time: '08:00:00',
        end_time: '09:30:00',
        subjects: { title: 'Advanced Mathematics', teachers: { users: { full_name: 'Sarah Chemutai' } } },
        room_number: 'Lecture Hall A'
      },
      {
        id: 'demo-2',
        start_time: '10:00:00',
        end_time: '11:30:00',
        subjects: { title: 'Theoretical Physics', teachers: { users: { full_name: 'Sarah Chemutai' } } },
        room_number: 'Science Lab 2'
      },
      {
        id: 'demo-3',
        start_time: '13:30:00',
        end_time: '15:00:00',
        subjects: { title: 'Software Engineering', teachers: { users: { full_name: 'Sarah Chemutai' } } },
        room_number: 'CS Lab 101'
      }
    ]
  },

  // --- Parent Mode ---
  '/parent/students': [
    {
      id: 'STU-GEN-0',
      student_id: 'STU-GEN-0',
      users: { full_name: 'Alex Zulu', avatar_url: null, email: 'alex@demo.test' },
      students: {
        id: 'STU-GEN-0',
        users: { full_name: 'Alex Zulu' }
      },
      classes: { display_name: 'Form 1 Alpha' },
      fee_balance: 2500,
      grade_level: 1
    },
    {
      id: 'STU-GEN-1',
      student_id: 'STU-GEN-1',
      users: { full_name: 'Sarah Zulu', avatar_url: null, email: 'sarah@demo.test' },
      students: {
        id: 'STU-GEN-1',
        users: { full_name: 'Sarah Zulu' }
      },
      classes: { display_name: 'Form 2 Beta' },
      fee_balance: 0,
      grade_level: 2
    }
  ],
  '/parent/student/performance': {
    grades: [
      { id: '1', grade: 92, letter_grade: 'A', subject: { title: 'Mathematics' }, title: 'End of Term Exam', date: '2026-05-01' },
      { id: '2', grade: 88, letter_grade: 'A', subject: { title: 'Physics' }, title: 'Mid-Term Test', date: '2026-04-15' },
      { id: '3', grade: 76, letter_grade: 'B', subject: { title: 'English' }, title: 'Essay Assignment', date: '2026-03-20' }
    ],
    attendance: { overall_percentage: '94%' }
  },
  '/parent/student/attendance': [
    { id: '1', date: '2026-05-12', status: 'present', subject: 'Mathematics' },
    { id: '2', date: '2026-05-11', status: 'present', subject: 'Physics' }
  ],
  '/parent/student/finance': {
    balance: 2500, total_fees: 15000, paid_amount: 12500,
    transactions: [{ id: '1', amount: 12500, date: '2026-01-10', status: 'completed', type: 'Fee Payment', direction: 'inflow' }]
  },
  '/admin/bursaries': [
    { 
      id: 'B-001', 
      title: 'Academic Excellence 2026', 
      description: 'Awarded to the top 5% of students in each class based on end-of-year results.', 
      amount: 15000, 
      deadline: '2026-06-30', 
      status: 'open',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    { 
      id: 'B-002', 
      title: 'Need-Based Support', 
      description: 'Financial assistance for students from low-income backgrounds.', 
      amount: 25000, 
      deadline: '2026-05-15', 
      status: 'open',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ],
  '/parent/student/bursaries': [
    { id: '1', amount_awarded: 5000, bursary: { title: 'Academic Excellence', description: 'Awarded for top performance' }, notes: 'Approved by board' }
  ],

  // --- Admin / Finance Mode ---
  '/finance/fees/pending': [
    {
      id: 'PEND-1',
      amount: 15000,
      payment_method: 'mpesa',
      reference_number: 'QY82910XX',
      created_at: new Date().toISOString(),
      proof_url: 'https://example.com/receipt.pdf',
      students: { users: { full_name: 'John Doe (Demo)' } }
    }
  ],
  '/reports': [
    { 
      id: '1', 
      report_type: 'End-of-Term', 
      term: 'Term 1', 
      academic_year: '2026', 
      created_at: '2026-04-15',
      data: { gpa: '3.8', position: '4', total_students: '45', attendance: '98%', comments: 'Excellent progress across all core subjects. Keep it up!' }
    },
    { 
      id: '2', 
      report_type: 'Mid-Term', 
      term: 'Term 1', 
      academic_year: '2026', 
      created_at: '2026-03-20',
      data: { gpa: '3.6', position: '8', total_students: '45', attendance: '94%', comments: 'Strong performance in Mathematics and Science.' }
    }
  ],

  // --- Global ---
  '/notifications': [
    { id: '1', title: 'New Grade', message: 'Math grade is out.', created_at: new Date().toISOString() }
  ],
  '/messages': [
    { id: '1', sender: { full_name: 'Principal' }, content: 'Welcome!', created_at: new Date().toISOString() }
  ],
  '/announcements': [
    { id: '1', title: 'Welcome', message: 'Success this term!', created_at: new Date().toISOString() }
  ]
};

// 500 Students Generator
const BULK_STUDENTS = Array.from({ length: 500 }).map((_, i) => ({
  id: `STU-GEN-${i}`, user_id: `USER-GEN-${i}`,
  full_name: `Student Name #${i + 1}`,
  classes: { display_name: `Form ${(i % 4) + 1} Stream ${i % 2 === 0 ? 'A' : 'B'}` },
  users: { full_name: `Student Name #${i + 1}`, avatar_url: null, email: `stu.${i}@demo.lms` }
}));

/**
 * Mock Engine
 */
export const getMockResponse = (url: string) => {
  let path = url.split('?')[0];
  if (!path.startsWith('/')) path = '/' + path; // Normalize

  // Bulk overrides
  if (path.includes('/students') || path === '/student/list') {
      if (path.startsWith('/parent/')) return DEMO_MASTER_DATA['/parent/students'];
      return BULK_STUDENTS;
  }
  
  // Direct matches
  if (DEMO_MASTER_DATA[path]) return DEMO_MASTER_DATA[path];

  // Pattern matches
  if (path.includes('/finance')) {
      if (path.includes('/pending')) return DEMO_MASTER_DATA['/finance/fees/pending'];
      
      const financeData = DEMO_MASTER_DATA['/student/me/finance'] || DEMO_MASTER_DATA['/parent/student/finance'];
      
      // Return specific arrays if requested
      if (path.includes('/transactions')) return financeData.transactions || [];
      if (path.includes('/fee-structures')) return financeData.fee_structure || [];
      
      return financeData;
  }
  if (path.includes('/performance') || path.includes('/grades')) {
      if (path.startsWith('/parent/')) return DEMO_MASTER_DATA['/parent/student/performance'];
      return DEMO_MASTER_DATA['/student/performance'];
  }
  if (path.includes('/attendance')) {
      if (path.startsWith('/parent/')) return DEMO_MASTER_DATA['/parent/student/attendance'];
      return Array.from({ length: 10 }).map((_, i) => ({
          id: `${i}`, date: new Date(Date.now() - i * 86400000).toISOString().split('T')[0],
          status: 'present', subject: { title: 'Class Session' }
      }));
  }
  if (path.includes('/bursary')) {
      if (path.includes('/my/approved')) return DEMO_MASTER_DATA['/parent/student/bursaries'];
      return DEMO_MASTER_DATA['/admin/bursaries'];
  }
  if (path.includes('/reports')) return DEMO_MASTER_DATA['/reports'];
  if (path.includes('/assignments')) return DEMO_MASTER_DATA['/academic/assignments'];
  if (path.includes('/announcements')) return DEMO_MASTER_DATA['/academic/announcements'];
  if (path.includes('/resources')) return DEMO_MASTER_DATA['/resources'];
  if (path.includes('/diary')) return DEMO_MASTER_DATA['/diary'];
  if (path.includes('/messages')) return DEMO_MASTER_DATA['/messages'];
  if (path.includes('/notifications')) return DEMO_MASTER_DATA['/notifications'];

  return null;
};
