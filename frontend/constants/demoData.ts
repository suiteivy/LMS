// Student module mock data
export const GUEST_USER = {
  id: "guest-uuid-12345",
  full_name: "Alex Rivera",
  email: "alex.demo@university.edu",
  displayId: "STU-2026-0482",
  gpa: "3.82",
  attendance: "92%",
  avatar: "https://ui-avatars.com/api/?name=Alex+Rivera&background=FF6B00&color=fff"
};

export const MOCK_ASSIGNMENTS = [
  {
    id: "asgn-1",
    title: "React Native Layouts",
    subject: "Advanced Mobile Dev",
    dueDate: "2026-02-20T23:59:59Z",
    status: "pending",
    description: "Build a responsive dashboard using NativeWind and Lucide icons."
  },
  {
    id: "asgn-2",
    title: "SQL Schema Design",
    subject: "Database Systems",
    dueDate: "2026-02-15T23:59:59Z",
    status: "submitted",
    description: "Design a normalized database for a library management system."
  }
];

export const MOCK_MESSAGES = {
  inbox: [
    {
      id: "msg-1",
      sender: { full_name: "Dr. Sarah Miller", role: "teacher" },
      content: "Hi Alex, I've reviewed your project proposal. Excellent work on the architecture!",
      created_at: new Date().toISOString(),
      is_read: false,
      subject: "Project Feedback"
    },
    {
      id: "msg-2",
      sender: { full_name: "Library Admin", role: "staff" },
      content: "Your requested book 'Clean Code' is now ready for pickup at the front desk.",
      created_at: new Date(Date.now() - 86400000).toISOString(),
      is_read: true,
      subject: "Book Pickup"
    }
  ],
  sent: [
    {
      id: "msg-3",
      receiver: { full_name: "Prof. James Wilson", role: "teacher" },
      content: "Could you please clarify the requirements for the final exam?",
      created_at: new Date(Date.now() - 172800000).toISOString(),
      is_read: true
    }
  ]
};

export const MOCK_LIBRARY = {
  activity: [
    {
      id: "borrow-1",
      bookTitle: "Pragmatic Programmer",
      status: "ready_for_pickup",
      dueDate: "2026-03-01",
    },
    {
      id: "borrow-2",
      bookTitle: "Understanding SQL",
      status: "borrowed",
      dueDate: "2026-02-25",
    }
  ],
  catalog: [
    {
      id: "book-1",
      title: "Fullstack React Native",
      author: "Newline.co",
      category: "Programming",
      available: 5,
      isbn: "978-1-234567-89-0"
    },
    {
      id: "book-2",
      title: "Design Patterns",
      author: "Erich Gamma",
      category: "Software Engineering",
      available: 0,
      isbn: "978-0-201633-61-0"
    }
  ]
};

export const MOCK_FINANCE = {
  balance: 1250.00,
  transactions: [
    { id: 't1', title: 'Tuition Fee - Semester 2', amount: -2500.00, date: '2026-01-10' },
    { id: 't2', title: 'Scholarship Credit', amount: 1500.00, date: '2026-01-15' },
    { id: 't3', title: 'Library Fine', amount: -10.00, date: '2026-02-01' }
  ]
};

export const MOCK_SUBJECTS = [
  {
    id: "sub-1",
    title: "Introduction to React Native",
    instructor: { name: "Dr. Sarah Miller" },
    category: "Programming",
    level: "Beginner",
    isEnrolled: false,
    image: "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=400",
    description: "Learn to build cross-platform apps with React Native.",
    shortDescription: "Build mobile apps with React.",
    fee_amount: 0
  },
  // ... more subjects
];