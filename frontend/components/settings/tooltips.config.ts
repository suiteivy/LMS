import type { AccessFeatureKey, SettingsRole } from './access';

export type TooltipTargetId =
  | 'settings.profile.full_name'
  | 'settings.profile.phone'
  | 'settings.profile.email'
  | 'promotion.cycle_name'
  | 'promotion.cycle_select'
  | 'promotion.term'
  | 'promotion.from_class'
  | 'promotion.to_class'
  | 'promotion.min_average'
  | 'promotion.min_attendance'
  | 'promotion.preview'
  | 'promotion.execute'
  | 'promotion.reload'
  | 'admin.manage.analytics'
  | 'admin.manage.library'
  | 'admin.manage.subjects'
  | 'admin.manage.roles'
  | 'admin.manage.reports'
  | 'admin.manage.attendance'
  | 'admin.manage.classes'
  | 'admin.manage.timetable'
  | 'admin.manage.resources'
  | 'admin.manage.academic_setup'
  | 'admin.manage.results'
  | 'teacher.manage.performance'
  | 'teacher.manage.coursework'
  | 'teacher.manage.registrar'
  | 'teacher.manage.announcements'
  | 'teacher.manage.insights'
  | 'teacher.manage.finance'
  | 'teacher.manage.resources'
  | 'teacher.manage.grade_entry'
  | 'teacher.manage.report_cards'
  | 'teacher.manage.messages'
  | 'teacher.manage.diary'
  | 'student.dashboard.metrics'
  | 'student.dashboard.schedule'
  | 'student.dashboard.tools'
  | 'student.assignments.filters'
  | 'student.assignments.submission'
  | 'student.attendance.summary'
  | 'student.attendance.logs'
  | 'parent.dashboard.child_profile'
  | 'parent.dashboard.oversight'
  | 'parent.dashboard.updates'
  | 'parent.attendance.summary'
  | 'parent.attendance.logs'
  | 'student.grades.summary'
  | 'student.grades.transcript'
  | 'student.announcements.feed'
  | 'parent.grades.summary'
  | 'parent.grades.transcript'
  | 'parent.announcements.feed'
  | 'settings.notifications.general'
  | 'settings.notifications.general.admin'
  | 'settings.notifications.general.teacher'
  | 'settings.notifications.general.student'
  | 'settings.notifications.general.parent'
  | 'settings.notifications.submission'
  | 'settings.notifications.priority'
  | 'admin.finance.payments'
  | 'admin.finance.payouts'
  | 'admin.finance.fee_structures'
  | 'admin.finance.bursaries'
  | 'settings.language'
  | 'settings.language.admin'
  | 'settings.language.teacher'
  | 'settings.language.student'
  | 'settings.language.parent'
  | 'settings.password'
  | 'settings.password.admin'
  | 'settings.password.teacher'
  | 'settings.password.student'
  | 'settings.password.parent';

export interface TooltipEntry {
  id: TooltipTargetId;
  title: string;
  text: string;
  learnMoreAnchor?: string;
  feature?: AccessFeatureKey;
  roles?: SettingsRole[];
}

const ROLE_DEFAULT: SettingsRole[] = ['admin', 'teacher'];
const EXTENDED_SETTINGS_ROLES: SettingsRole[] = ['admin', 'teacher', 'student', 'parent'];

export const SETTINGS_TOOLTIPS: Record<TooltipTargetId, TooltipEntry> = {
  'settings.profile.full_name': {
    id: 'settings.profile.full_name',
    title: 'Full name',
    text: 'Shown in dashboards, reports, and notifications. Keep it consistent with official records.',
    learnMoreAnchor: 'reports-ops',
    roles: ROLE_DEFAULT,
  },
  'settings.profile.phone': {
    id: 'settings.profile.phone',
    title: 'Phone number',
    text: 'Used for account recovery and urgent contact flows where enabled by your institution.',
    learnMoreAnchor: 'reports-ops',
    roles: ROLE_DEFAULT,
  },
  'settings.profile.email': {
    id: 'settings.profile.email',
    title: 'Email (read-only)',
    text: 'Primary login identity. Contact an administrator to change this safely.',
    learnMoreAnchor: 'reports-ops',
    roles: ROLE_DEFAULT,
  },
  'promotion.cycle_name': {
    id: 'promotion.cycle_name',
    title: 'Cycle name',
    text: 'Name this run clearly so audits can trace decisions and promotion outcomes later.',
    learnMoreAnchor: 'promotion-engine',
    feature: 'promotion',
    roles: ROLE_DEFAULT,
  },
  'promotion.cycle_select': {
    id: 'promotion.cycle_select',
    title: 'Cycle selector',
    text: 'Pick the cycle whose preview, decisions, and execution actions you want to run.',
    learnMoreAnchor: 'promotion-engine',
    feature: 'promotion',
    roles: ROLE_DEFAULT,
  },
  'promotion.term': {
    id: 'promotion.term',
    title: 'Promotion term',
    text: 'Promotion evaluates grades and attendance for this term only, then locks decisions to it.',
    learnMoreAnchor: 'promotion-engine',
    feature: 'promotion',
    roles: ROLE_DEFAULT,
  },
  'promotion.from_class': {
    id: 'promotion.from_class',
    title: 'From class',
    text: 'Only students currently in this class are evaluated in this promotion cycle.',
    learnMoreAnchor: 'promotion-engine',
    feature: 'promotion',
    roles: ROLE_DEFAULT,
  },
  'promotion.to_class': {
    id: 'promotion.to_class',
    title: 'To class',
    text: 'Eligible students move here when the cycle executes. This cannot match the source class.',
    learnMoreAnchor: 'promotion-engine',
    feature: 'promotion',
    roles: ROLE_DEFAULT,
  },
  'promotion.min_average': {
    id: 'promotion.min_average',
    title: 'Minimum average',
    text: 'Student average must meet this threshold before any manual override is considered.',
    learnMoreAnchor: 'promotion-engine',
    feature: 'promotion',
    roles: ROLE_DEFAULT,
  },
  'promotion.min_attendance': {
    id: 'promotion.min_attendance',
    title: 'Minimum attendance',
    text: 'Attendance percentage gate. If below threshold, student is retained unless explicitly overridden.',
    learnMoreAnchor: 'promotion-engine',
    feature: 'promotion',
    roles: ROLE_DEFAULT,
  },
  'promotion.preview': {
    id: 'promotion.preview',
    title: 'Preview decisions',
    text: 'Runs decision logic without moving students so you can validate outcomes before execution.',
    learnMoreAnchor: 'promotion-engine',
    feature: 'promotion',
    roles: ROLE_DEFAULT,
  },
  'promotion.execute': {
    id: 'promotion.execute',
    title: 'Execute cycle',
    text: 'Moves only eligible students and records final statuses. Use after preview is reviewed.',
    learnMoreAnchor: 'promotion-engine',
    feature: 'promotion',
    roles: ROLE_DEFAULT,
  },
  'promotion.reload': {
    id: 'promotion.reload',
    title: 'Reload cycles',
    text: 'Refreshes cycle and decision state from the server after external edits or execution.',
    learnMoreAnchor: 'promotion-engine',
    feature: 'promotion',
    roles: ROLE_DEFAULT,
  },
  'admin.manage.analytics': {
    id: 'admin.manage.analytics',
    title: 'System Analytics',
    text: 'Institution-level trends for academics, engagement, and operations over time.',
    learnMoreAnchor: 'promotion-engine',
    feature: 'analytics',
    roles: ['admin'],
  },
  'admin.manage.library': {
    id: 'admin.manage.library',
    title: 'Library Management',
    text: 'Catalog and control learning resources, circulation, and availability rules.',
    learnMoreAnchor: 'reports-ops',
    feature: 'library',
    roles: ['admin'],
  },
  'admin.manage.subjects': {
    id: 'admin.manage.subjects',
    title: 'Subjects & Curricula',
    text: 'Defines subject structure used by grading, timetables, and report card pipelines.',
    learnMoreAnchor: 'grading-ops',
    feature: 'grading',
    roles: ['admin'],
  },
  'admin.manage.roles': {
    id: 'admin.manage.roles',
    title: 'Roles & Permissions',
    text: 'Controls who can access sensitive workflows and institution-level operations.',
    learnMoreAnchor: 'reports-ops',
    roles: ['admin'],
  },
  'admin.manage.reports': {
    id: 'admin.manage.reports',
    title: 'Reports & Logs',
    text: 'Audit history and operational reports for accountability and follow-up actions.',
    learnMoreAnchor: 'reports-ops',
    feature: 'reports',
    roles: ['admin'],
  },
  'admin.manage.attendance': {
    id: 'admin.manage.attendance',
    title: 'Attendance Management',
    text: 'Monitors participation signals used in risk alerts and promotion eligibility.',
    learnMoreAnchor: 'attendance-ops',
    feature: 'attendance',
    roles: ['admin'],
  },
  'admin.manage.classes': {
    id: 'admin.manage.classes',
    title: 'Class Management',
    text: 'Class structure determines enrollment scope for grading, attendance, and promotions.',
    learnMoreAnchor: 'promotion-engine',
    roles: ['admin'],
  },
  'admin.manage.timetable': {
    id: 'admin.manage.timetable',
    title: 'Timetable Builder',
    text: 'Schedules classes and avoids conflicts across teachers, rooms, and subjects.',
    learnMoreAnchor: 'reports-ops',
    roles: ['admin'],
  },
  'admin.manage.resources': {
    id: 'admin.manage.resources',
    title: 'Resource Approvals',
    text: 'Moderates uploaded content before it becomes visible to learners and staff.',
    learnMoreAnchor: 'reports-ops',
    roles: ['admin'],
  },
  'admin.manage.academic_setup': {
    id: 'admin.manage.academic_setup',
    title: 'Academic Setup',
    text: 'Sets years, terms, grading scales, and assessments used by promotion decisions.',
    learnMoreAnchor: 'grading-ops',
    roles: ['admin'],
  },
  'admin.manage.results': {
    id: 'admin.manage.results',
    title: 'Results & Report Cards',
    text: 'Publishes outcomes, completeness states, and parent/student release visibility.',
    learnMoreAnchor: 'reports-ops',
    feature: 'reports',
    roles: ['admin'],
  },
  'teacher.manage.performance': {
    id: 'teacher.manage.performance',
    title: 'Performance',
    text: 'Tracks class outcomes, grading quality, and readiness for report publishing.',
    learnMoreAnchor: 'grading-ops',
    feature: 'grading',
    roles: ['teacher'],
  },
  'teacher.manage.coursework': {
    id: 'teacher.manage.coursework',
    title: 'Coursework',
    text: 'Controls assignment lifecycle from creation to submission and grading status.',
    learnMoreAnchor: 'grading-ops',
    roles: ['teacher'],
  },
  'teacher.manage.registrar': {
    id: 'teacher.manage.registrar',
    title: 'Registrar',
    text: 'Daily attendance entry affects student engagement and downstream promotion checks.',
    learnMoreAnchor: 'attendance-ops',
    feature: 'attendance',
    roles: ['teacher'],
  },
  'teacher.manage.announcements': {
    id: 'teacher.manage.announcements',
    title: 'Announcements',
    text: 'Institution broadcast feed for policy updates, reminders, and urgent notices.',
    learnMoreAnchor: 'reports-ops',
    roles: ['teacher'],
  },
  'teacher.manage.insights': {
    id: 'teacher.manage.insights',
    title: 'Insights',
    text: 'Performance analytics for trends, intervention timing, and class-level risk patterns.',
    learnMoreAnchor: 'promotion-engine',
    feature: 'analytics',
    roles: ['teacher'],
  },
  'teacher.manage.finance': {
    id: 'teacher.manage.finance',
    title: 'Finance',
    text: 'Displays teacher-linked financial records where institution finance visibility is enabled.',
    learnMoreAnchor: 'billing-ops',
    feature: 'billing',
    roles: ['teacher'],
  },
  'teacher.manage.resources': {
    id: 'teacher.manage.resources',
    title: 'Academic Vault',
    text: 'Store and version teaching resources with institution moderation controls.',
    learnMoreAnchor: 'reports-ops',
    roles: ['teacher'],
  },
  'teacher.manage.grade_entry': {
    id: 'teacher.manage.grade_entry',
    title: 'Grade Entry',
    text: 'Direct score input path that feeds weighted grade calculations and report cards.',
    learnMoreAnchor: 'grading-ops',
    roles: ['teacher'],
  },
  'teacher.manage.report_cards': {
    id: 'teacher.manage.report_cards',
    title: 'Report Cards',
    text: 'Validate term completeness before parent/student release and archival.',
    learnMoreAnchor: 'reports-ops',
    feature: 'reports',
    roles: ['teacher'],
  },
  'teacher.manage.messages': {
    id: 'teacher.manage.messages',
    title: 'Direct Connect',
    text: 'Role-based communication channel with students and guardians for interventions.',
    learnMoreAnchor: 'reports-ops',
    feature: 'messaging',
    roles: ['teacher'],
  },
  'teacher.manage.diary': {
    id: 'teacher.manage.diary',
    title: 'Virtual Diary',
    text: 'Daily instructional log for continuity, handoffs, and classroom evidence trails.',
    learnMoreAnchor: 'reports-ops',
    roles: ['teacher'],
  },
  'student.dashboard.metrics': {
    id: 'student.dashboard.metrics',
    title: 'Academic metrics',
    text: 'Shows GPA and attendance signals based on your latest graded and attendance records.',
    learnMoreAnchor: 'student-workflow',
    roles: ['student'],
  },
  'student.dashboard.schedule': {
    id: 'student.dashboard.schedule',
    title: 'Today\'s lectures',
    text: 'Displays your timetable for today from active class enrollment and subject assignments.',
    learnMoreAnchor: 'student-workflow',
    roles: ['student'],
  },
  'student.dashboard.tools': {
    id: 'student.dashboard.tools',
    title: 'Academic tools',
    text: 'Quick links to the core student modules used daily for coursework and tracking progress.',
    learnMoreAnchor: 'student-workflow',
    roles: ['student'],
  },
  'student.assignments.filters': {
    id: 'student.assignments.filters',
    title: 'Assignment filters',
    text: 'Current shows pending or overdue items. History shows already submitted work.',
    learnMoreAnchor: 'student-workflow',
    roles: ['student'],
  },
  'student.assignments.submission': {
    id: 'student.assignments.submission',
    title: 'Submission flow',
    text: 'Upload your assignment file to submit. Status updates after successful upload and record creation.',
    learnMoreAnchor: 'student-workflow',
    roles: ['student'],
  },
  'student.attendance.summary': {
    id: 'student.attendance.summary',
    title: 'Attendance summary',
    text: 'Your attendance percentage is calculated from present/late sessions over total tracked sessions.',
    learnMoreAnchor: 'student-workflow',
    roles: ['student'],
  },
  'student.attendance.logs': {
    id: 'student.attendance.logs',
    title: 'Session logs',
    text: 'Detailed attendance entries by date and subject help explain your summary trend.',
    learnMoreAnchor: 'student-workflow',
    roles: ['student'],
  },
  'parent.dashboard.child_profile': {
    id: 'parent.dashboard.child_profile',
    title: 'Child profile',
    text: 'Shows the currently selected linked child. Switching child updates all dashboard cards and modules.',
    learnMoreAnchor: 'parent-workflow',
    roles: ['parent'],
  },
  'parent.dashboard.oversight': {
    id: 'parent.dashboard.oversight',
    title: 'Academic oversight',
    text: 'Quick actions open student-specific parent views using the selected child context.',
    learnMoreAnchor: 'parent-workflow',
    roles: ['parent'],
  },
  'parent.dashboard.updates': {
    id: 'parent.dashboard.updates',
    title: 'Institutional updates',
    text: 'Announcements are scoped to your linked child and filtered by current visibility/expiry rules.',
    learnMoreAnchor: 'parent-workflow',
    roles: ['parent'],
  },
  'parent.attendance.summary': {
    id: 'parent.attendance.summary',
    title: 'Attendance summary',
    text: 'Provides a parent view of attendance rate and counts for the selected child.',
    learnMoreAnchor: 'parent-workflow',
    roles: ['parent'],
  },
  'parent.attendance.logs': {
    id: 'parent.attendance.logs',
    title: 'Daily log entry',
    text: 'Chronological attendance details for each recorded session and subject.',
    learnMoreAnchor: 'parent-workflow',
    roles: ['parent'],
  },
  'student.grades.summary': {
    id: 'student.grades.summary',
    title: 'Grade summary',
    text: 'Shows your GPA, rank context, and weighted performance from published grading records.',
    learnMoreAnchor: 'student-workflow',
    roles: ['student'],
  },
  'student.grades.transcript': {
    id: 'student.grades.transcript',
    title: 'Transcript records',
    text: 'Per-subject grade rows with score context and detailed breakdown available by selection.',
    learnMoreAnchor: 'student-workflow',
    roles: ['student'],
  },
  'student.announcements.feed': {
    id: 'student.announcements.feed',
    title: 'Announcements feed',
    text: 'Displays active school and subject announcements relevant to your enrollment context.',
    learnMoreAnchor: 'student-workflow',
    roles: ['student'],
  },
  'parent.grades.summary': {
    id: 'parent.grades.summary',
    title: 'Academic report summary',
    text: 'Highlights your child\'s cumulative standing, attendance context, and institution ranking signal.',
    learnMoreAnchor: 'parent-workflow',
    roles: ['parent'],
  },
  'parent.grades.transcript': {
    id: 'parent.grades.transcript',
    title: 'Academic transcript',
    text: 'Detailed subject performance records used for parent-side academic monitoring.',
    learnMoreAnchor: 'parent-workflow',
    roles: ['parent'],
  },
  'parent.announcements.feed': {
    id: 'parent.announcements.feed',
    title: 'Announcements archive',
    text: 'Shows active announcements tied to the selected linked student and current institution scope.',
    learnMoreAnchor: 'parent-workflow',
    roles: ['parent'],
  },
  'settings.notifications.general': {
    id: 'settings.notifications.general',
    title: 'General notifications',
    text: 'Controls routine app alerts for your role and daily workflow events.',
    learnMoreAnchor: 'student-workflow',
    roles: EXTENDED_SETTINGS_ROLES,
  },
  'settings.notifications.general.admin': {
    id: 'settings.notifications.general.admin',
    title: 'System notifications',
    text: 'Alerts for platform operations, institution-level changes, and urgent admin actions.',
    learnMoreAnchor: 'reports-ops',
    roles: ['admin'],
  },
  'settings.notifications.general.teacher': {
    id: 'settings.notifications.general.teacher',
    title: 'Teaching notifications',
    text: 'Classroom and learner alerts tied to submissions, attendance activity, and grading flow.',
    learnMoreAnchor: 'grading-ops',
    roles: ['teacher'],
  },
  'settings.notifications.general.student': {
    id: 'settings.notifications.general.student',
    title: 'Learning notifications',
    text: 'Assignment deadlines, grade releases, and schedule reminders for your active classes.',
    learnMoreAnchor: 'student-workflow',
    roles: ['student'],
  },
  'settings.notifications.general.parent': {
    id: 'settings.notifications.general.parent',
    title: 'Guardian notifications',
    text: 'Linked-child updates for attendance, announcements, and academic progress visibility.',
    learnMoreAnchor: 'parent-workflow',
    roles: ['parent'],
  },
  'settings.notifications.submission': {
    id: 'settings.notifications.submission',
    title: 'Submission alerts',
    text: 'Notifies when coursework submissions are created, updated, or require grading action.',
    learnMoreAnchor: 'grading-ops',
    roles: ['teacher'],
  },
  'settings.notifications.priority': {
    id: 'settings.notifications.priority',
    title: 'Priority alerts',
    text: 'Critical notices like system incidents and urgent operational warnings.',
    learnMoreAnchor: 'reports-ops',
    roles: ['admin'],
  },
  'admin.finance.payments': {
    id: 'admin.finance.payments',
    title: 'Payments ledger',
    text: 'Records completed and pending student payments including method, reference, and timestamp.',
    learnMoreAnchor: 'billing-ops',
    feature: 'billing',
    roles: ['admin'],
  },
  'admin.finance.payouts': {
    id: 'admin.finance.payouts',
    title: 'Teacher payouts',
    text: 'Tracks pending, processing, and paid teacher payouts for each period and workload.',
    learnMoreAnchor: 'billing-ops',
    feature: 'billing',
    roles: ['admin'],
  },
  'admin.finance.fee_structures': {
    id: 'admin.finance.fee_structures',
    title: 'Fee structure',
    text: 'Defines annual and term fee rules by academic year, level scope, and effective amounts.',
    learnMoreAnchor: 'billing-ops',
    feature: 'billing',
    roles: ['admin'],
  },
  'admin.finance.bursaries': {
    id: 'admin.finance.bursaries',
    title: 'Bursary management',
    text: 'Manages bursary allocations, approvals, and adjustments that affect outstanding balances.',
    learnMoreAnchor: 'billing-ops',
    feature: 'billing',
    roles: ['admin'],
  },
  'settings.language': {
    id: 'settings.language',
    title: 'Language',
    text: 'Changes text language where translations are available across supported modules.',
    learnMoreAnchor: 'student-workflow',
    roles: EXTENDED_SETTINGS_ROLES,
  },
  'settings.language.admin': {
    id: 'settings.language.admin',
    title: 'Admin language',
    text: 'Applies to management labels, reports, and institution administration screens.',
    learnMoreAnchor: 'reports-ops',
    roles: ['admin'],
  },
  'settings.language.teacher': {
    id: 'settings.language.teacher',
    title: 'Teacher language',
    text: 'Applies to instructional workflows such as attendance, grading, and classroom tools.',
    learnMoreAnchor: 'grading-ops',
    roles: ['teacher'],
  },
  'settings.language.student': {
    id: 'settings.language.student',
    title: 'Student language',
    text: 'Applies to learning-facing screens like assignments, timetable, and grade views.',
    learnMoreAnchor: 'student-workflow',
    roles: ['student'],
  },
  'settings.language.parent': {
    id: 'settings.language.parent',
    title: 'Parent language',
    text: 'Applies to guardian dashboards and linked-child monitoring modules.',
    learnMoreAnchor: 'parent-workflow',
    roles: ['parent'],
  },
  'settings.password': {
    id: 'settings.password',
    title: 'Password',
    text: 'Update login credentials. This signs out other sessions depending on security policy.',
    learnMoreAnchor: 'student-workflow',
    roles: EXTENDED_SETTINGS_ROLES,
  },
  'settings.password.admin': {
    id: 'settings.password.admin',
    title: 'Admin password',
    text: 'Protects elevated operations. Rotation signs out stale sessions based on security policy.',
    learnMoreAnchor: 'reports-ops',
    roles: ['admin'],
  },
  'settings.password.teacher': {
    id: 'settings.password.teacher',
    title: 'Teacher password',
    text: 'Protects instructional records and grading actions linked to your classroom scope.',
    learnMoreAnchor: 'grading-ops',
    roles: ['teacher'],
  },
  'settings.password.student': {
    id: 'settings.password.student',
    title: 'Student password',
    text: 'Protects your personal learning records, submissions, and account access.',
    learnMoreAnchor: 'student-workflow',
    roles: ['student'],
  },
  'settings.password.parent': {
    id: 'settings.password.parent',
    title: 'Parent password',
    text: 'Protects guardian access to linked-child records and communication history.',
    learnMoreAnchor: 'parent-workflow',
    roles: ['parent'],
  },
};
