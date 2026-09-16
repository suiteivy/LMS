import { useTheme } from '@/contexts/ThemeContext';
import type { SubscriptionTierInfo } from '@/hooks/useSubscriptionTier';
import { ChevronDown, ChevronUp } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { LayoutChangeEvent, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { hasFeatureAccess, type AccessFeatureKey, type SettingsRole } from './access';
import { SETTINGS_TOOLTIPS, type TooltipTargetId } from './tooltips.config';

type ManualSectionId =
  | 'promotion-engine'
  | 'grading-ops'
  | 'attendance-ops'
  | 'reports-ops'
  | 'billing-ops'
  | 'student-workflow'
  | 'parent-workflow'
  | 'librarian-ops'
  | 'finance-admin-role'
  | 'hod-role'
  | 'coverage-planner'
  | 'exams-module'
  | 'school-calendar'
  | 'custom-roles'
  | 'academic-vault'
  | 'timetable-builder';

interface ManualSection {
  id: ManualSectionId;
  title: string;
  feature?: AccessFeatureKey;
  roles?: SettingsRole[];
  shortBlurb: string;
  whatItDoes: string;
  whatChanges: string;
  crossLinks: string[];
  deepDive?: {
    title: string;
    steps: string[];
    workedExample: string[];
    edgeCases: string[];
  };
}

const MODULES: ManualSection[] = [
  {
    id: 'promotion-engine',
    title: 'Promotion Engine',
    feature: 'promotion',
    roles: ['admin', 'teacher'],
    shortBlurb: SETTINGS_TOOLTIPS['promotion.preview'].text,
    whatItDoes:
      'Automates class progression by evaluating average performance and attendance against cycle thresholds, then records auditable decisions.',
    whatChanges:
      'Changing thresholds or source/target classes immediately changes who is retained or promoted when you preview/execute a cycle.',
    crossLinks: ['Results → Promotions', 'Settings → Notifications', 'Management → Subjects'],
    deepDive: {
      title: 'Decision logic walkthrough',
      steps: [
        '1) Build candidate pool from the selected From Class and Term scope.',
        '2) Evaluate score gate: average >= minimum average threshold.',
        '3) Evaluate attendance gate: attendance >= minimum attendance threshold.',
        '4) Resolve eligibility: both gates pass => eligible, otherwise retained.',
        '5) Apply overrides (if configured in cycle workflow) before final status persist.',
        '6) Preview writes decision rows; Execute moves eligible students and marks final statuses.',
      ],
      workedExample: [
        'Cycle: Grade 7 → Grade 8, Min Avg 50, Min Attendance 75.',
        'Student A: Avg 63, Attendance 82 => Eligible (promoted on execute).',
        'Student B: Avg 71, Attendance 69 => Retained unless explicitly overridden.',
        'Student C: Avg 48, Attendance 90 => Retained due to score gate failure.',
      ],
      edgeCases: [
        'Locked term blocks execution by policy; preview may still be inspectable.',
        'From/To class cannot be identical.',
        'Missing grades or attendance are treated as failing relevant gate unless policy override exists.',
      ],
    },
  },
  {
    id: 'grading-ops',
    title: 'Grading & Academic Rankings',
    feature: 'grading',
    roles: ['admin', 'teacher'],
    shortBlurb: 'Controls score capture, assessment weighting ratios, grading scales, and academic rankings.',
    whatItDoes:
      'Defines how raw scores become reportable grades, student rankings, and term-level academic evaluations according to the institution’s configured grading scale.',
    whatChanges:
      'Configured assessment category weights (Exam vs. Continuous Assessment ratio) and scale thresholds directly alter student scores, ranks, and performance classifications.',
    crossLinks: ['Management → Subjects', 'Academic Setup → Grading Scales', 'Results → Report Cards'],
    deepDive: {
      title: 'Grading and weighting mechanics',
      steps: [
        '1) Admin configures grading scales (numeric ranges and letter grades) and assessment types in Academic Setup.',
        '2) Admin sets the institutional assessment weighting ratio (e.g., 60% Exam / 40% Continuous Assessment).',
        '3) Teachers input raw assessment marks for coursework and scheduled exams.',
        '4) System scales raw marks against assessment maximums, weights categories, and resolves the final letter grade.',
        '5) Academic rankings compute class and subject leaderboards based on composite weighted performance.',
      ],
      workedExample: [
        'Student scores 45/50 in Assignment (90%) and 80/100 in Final Exam (80%).',
        'Under 60/40 weighting: Continuous Assessment (40%) = 36 pts; Exam (60%) = 48 pts. Composite = 84%.',
        'System assigns Grade A and updates student standing in class rankings.',
      ],
      edgeCases: [
        'Missing assessments default to excluded or failing per institution policy.',
        'When only exams exist with no coursework, exams contribute 100% of the calculated score.',
        'Editing a grading scale recalibrates unfinalized grade distributions upon recalculation.',
      ],
    },
  },
  {
    id: 'attendance-ops',
    title: 'Attendance',
    feature: 'attendance',
    roles: ['admin', 'teacher'],
    shortBlurb: 'Tracks daily presence and lateness signals used in progression and risk monitoring.',
    whatItDoes: 'Stores attendance records per student/teacher and exposes trend summaries.',
    whatChanges: 'Attendance thresholds influence promotions and engagement indicators.',
    crossLinks: ['Attendance → Students', 'Analytics → Student Performance Overview'],
  },
  {
    id: 'reports-ops',
    title: 'Reports & Report Cards',
    feature: 'reports',
    roles: ['admin', 'teacher'],
    shortBlurb: 'Aggregates institution and classroom outputs for operational and academic review.',
    whatItDoes:
      'Provides printable snapshots of grades, attendance, and compiled report cards. Class Teachers compile class-wide drafts, while Subject Teachers select which assessments contribute alongside mandatory exams.',
    whatChanges:
      'Assessment selection and the institution assessment weighting ratio (e.g. 60% Exam / 40% Continuous Assessment) directly govern compiled student grades.',
    crossLinks: ['Results → Report Cards', 'Management → Analytics', 'Academic Setup → Grading Scales'],
    deepDive: {
      title: 'Report card compilation & assessment selection lifecycle',
      steps: [
        '1) Subject Teachers open Subject Assessment Contribution to select which coursework assessments count towards the term score (exams are mandatory and locked).',
        '2) System computes composite subject scores using the institution-configured weighting ratio (default 60% Exam / 40% Continuous Assessment).',
        '3) Class Teachers generate and review report card drafts for their designated class only (Admins have universal class access).',
        '4) Teachers record personalized conduct and academic remarks for each student.',
        '5) Report cards are published and released to student and parent portals, with cross-term student history preserved.',
      ],
      workedExample: [
        'Subject: Grade 8 Science. Exam score: 80% (weighted 60% = 48 pts). Selected Continuous Assessment: 70% (weighted 40% = 28 pts).',
        'Composite score: 76% (Grade B on a standard scale).',
        'Class Teacher compiles class batch and exports official PDF report cards.',
      ],
      edgeCases: [
        'If a subject has no continuous assessments or none are selected, the mandatory exam contributes 100% of the grade.',
        'Class Teachers only see dropdowns and students for classes they are officially designated to teach.',
        'Historical cross-term performance is inspectable across all enrolled terms via the student history modal.',
      ],
    },
  },
  {
    id: 'student-workflow',
    title: 'Student Workflow',
    roles: ['student', 'parent', 'admin', 'teacher'],
    shortBlurb: 'How students track grades, assignments, attendance, and reports in one flow.',
    whatItDoes:
      'Guides students through daily learning visibility: announcements, timetable, assignments, grades, and report-cards.',
    whatChanges:
      'Changes in teacher grading cadence, attendance capture, or report release immediately affect student-facing summaries.',
    crossLinks: ['Student → Assignments', 'Student → Grades', 'Student → Report Cards', 'Student → Notifications'],
  },
  {
    id: 'parent-workflow',
    title: 'Parent Workflow',
    roles: ['parent'],
    shortBlurb: 'How guardians monitor linked students across academics, attendance, and school communication.',
    whatItDoes:
      'Consolidates linked-student visibility for progress monitoring and communication with school staff.',
    whatChanges:
      'Linked student selection, report publication, and announcement targeting alter what a parent sees at any time.',
    crossLinks: ['Parent → Dashboard', 'Parent → Attendance', 'Parent → Announcements', 'Parent → Report Cards'],
  },
  {
    id: 'billing-ops',
    title: 'Finance',
    feature: 'billing',
    roles: ['admin'],
    shortBlurb: 'Manages school fee operations including payments, bursaries, and fee structures.',
    whatItDoes:
      'Coordinates student billing records, bursary allocations, and fee policy configuration for each academic cycle.',
    whatChanges:
      'Any update to fee structures, payment records, or bursary rules immediately changes dashboard totals, outstanding balances, and downstream finance reports.',
    crossLinks: ['Finance → Payments', 'Finance → Fee Structures', 'Finance → Bursaries', 'Finance → Reports'],
    deepDive: {
      title: 'Finance operational flow',
      steps: [
        '1) Configure fee structures by class/term and academic year before recording payments.',
        '2) Capture incoming payments with method/reference so reconciliation remains auditable.',
        '3) Apply bursary decisions to reduce liabilities for approved students.',
        '4) Review finance cards and exports to verify balances before period close.',
      ],
      workedExample: [
        'Term starts with fee structure update for Grade 8 tuition.',
        'Student payment posts against the updated rule and reduces outstanding balance.',
        'Approved bursary adjusts the same account before final arrears reporting.',
      ],
      edgeCases: [
        'Editing fee structures after payments requires reconciliation review to avoid mismatched balances.',
        'Partial payments can leave accounts outstanding even when status appears updated in one card.',
        'Bursary reversals should be logged before generating final term finance exports.',
      ],
    },
  },
  {
    id: 'librarian-ops',
    title: 'Library & Resource Center',
    feature: 'library',
    roles: ['admin', 'teacher', 'student'],
    shortBlurb: 'Manages physical book inventory, borrowing transactions, returns, and digital library resources.',
    whatItDoes:
      'Tracks catalog items, copies, loans, returns, and overdue fines or restrictions. Enables designated staff (Librarians) to manage the school library without granting them general administrative permissions.',
    whatChanges:
      'Issuing or returning books immediately updates available shelf copies, borrower circulation records, and overdue alerts across student and teacher profiles.',
    crossLinks: ['Management → Library', 'Management → Roles (Librarian Designation)', 'Users → Staff Roles'],
    deepDive: {
      title: 'Librarian circulation workflow',
      steps: [
        '1) Admin designates a staff member as Librarian in User Management or Roles.',
        '2) Add books to the catalog with ISBN/Identifier, author, publisher, and total copy quantity.',
        '3) Issue a book to a student or teacher by selecting the borrower and specifying the loan duration.',
        '4) System computes the expected return date and flags loans exceeding the loan period as overdue.',
        '5) When the borrower brings the book back, mark it returned; if damaged or missing, mark condition accordingly.',
      ],
      workedExample: [
        'Student borrows "Introduction to General Science" for a 14-day checkout window.',
        'Available shelf copies drop from 5 to 4 immediately.',
        'If returned on day 12, copy returns to 5 and the borrower status remains clean.',
        'If not returned by day 15, the loan turns red as overdue and appears on the Librarian dashboard.',
      ],
      edgeCases: [
        'Librarian designation can be assigned to existing teachers without overwriting their classroom teaching schedule.',
        'Deleting a book title is blocked if active loans are currently checked out.',
        'Withdrawn or damaged copies must be logged to keep shelf inventory counts synchronized.',
      ],
    },
  },
  {
    id: 'finance-admin-role',
    title: 'Finance Administrator Designation',
    feature: 'billing',
    roles: ['admin'],
    shortBlurb: 'Grants operational bursar capabilities to manage fees, payments, and invoices without full admin access.',
    whatItDoes:
      'Allows designated staff to record student fee payments, create transactions, configure fee structures, and approve bursaries, while restricting access to institution settings, user deletion, or system reconfiguration.',
    whatChanges:
      'Toggling the Finance Admin switch on a staff member immediately updates their available navigation tabs and permits financial write operations.',
    crossLinks: ['Finance → Finance Admins', 'Finance → Payments', 'Finance → Fee Structures', 'Finance → Bursaries'],
    deepDive: {
      title: 'Finance Administrator permission flow',
      steps: [
        '1) Main Admin opens Finance → Finance Admins tab.',
        '2) Select any staff member and toggle "Designate as Finance Admin".',
        '3) The staff member receives financial management capabilities on their next login or refresh.',
        '4) All payment records, invoice releases, and balance adjustments log the specific Finance Admin user ID for audit compliance.',
        '5) Main Admin can revoke the designation at any time, instantly removing financial write permissions.',
      ],
      workedExample: [
        'School Bursar Jane is a staff member. Main Admin grants Finance Admin designation.',
        'Jane can now record cash, bank, or mobile money payments and generate student fee receipts.',
        'Jane cannot delete classes, modify academic terms, or alter system user credentials.',
      ],
      edgeCases: [
        'Only Institution Admins and Master Admins can toggle the Finance Admin designation.',
        'Every financial transaction records both the payer and the staff recorder for internal accounting transparency.',
        'Revoking the role retains historical audit logs showing past payments recorded by that user.',
      ],
    },
  },
  {
    id: 'hod-role',
    title: 'Head of Department (HOD) Designation',
    roles: ['admin', 'teacher'],
    shortBlurb: 'Assigns subject leadership for curriculum pacing, Record of Work review, and exam approvals.',
    whatItDoes:
      'Empowers a designated teacher as Head of Department for a specific subject. Grants department-wide visibility across all streams and classes teaching that subject, allowing the HOD to monitor curriculum coverage and review assessment records.',
    whatChanges:
      'Assigning a teacher as HOD for a subject expands their teacher dashboard with department oversight views and authorizes them to review other teachers\' records of work.',
    crossLinks: ['Management → Subjects (Edit Subject)', 'Teacher → Department Coverage', 'Academic Setup → Assessments'],
    deepDive: {
      title: 'Department oversight workflow',
      steps: [
        '1) Admin navigates to Management → Subjects and selects a subject (e.g., Mathematics).',
        '2) Choose the designated teacher in the "Head of Department (HOD)" selector and save.',
        '3) The teacher now has HOD status for that subject across all grade levels and streams.',
        '4) The HOD views planned vs. completed curriculum milestones submitted by all teachers teaching that subject.',
        '5) HOD reviews and approves examination schemes and term score sheets before report card generation.',
      ],
      workedExample: [
        'Teacher Mwangi is assigned as HOD for Chemistry.',
        'Teachers A, B, and C teach Form 1, Form 2, and Form 3 Chemistry.',
        'HOD Mwangi can see all 3 teachers\' pacing charts, verify their weekly records of work, and sign off on exam tests.',
      ],
      edgeCases: [
        'A subject can have at most one designated HOD at a time; selecting a new HOD replaces the previous assignment.',
        'HOD permissions are scoped strictly to the assigned subject; HODs cannot approve other subjects\' records.',
        'If an HOD departs or is unassigned, subject data remains intact and reverts to Admin-only approval.',
      ],
    },
  },
  {
    id: 'coverage-planner',
    title: 'Coverage Planner & Record of Work',
    roles: ['admin', 'teacher'],
    shortBlurb: 'Syllabus pacing plans, milestone tracking, and weekly teaching logs to prevent curriculum delays.',
    whatItDoes:
      'Enables teachers to map out curriculum topics by week for each term. As lessons occur, teachers log verified "Record of Work" entries with actual dates, remarks, and student comprehension status.',
    whatChanges:
      'Logging completed topics updates the visual pacing meter (On Track, Behind, Ahead) for teachers, HODs, and administrators.',
    crossLinks: ['Teacher → Coverage Planner', 'Teacher → Record of Work', 'Management → Subjects'],
    deepDive: {
      title: 'Curriculum pacing lifecycle',
      steps: [
        '1) At term start, teacher creates a coverage plan by adding topics, subtopics, and expected target weeks.',
        '2) System generates a planned pacing curve across the academic term duration.',
        '3) After teaching a lesson, teacher opens Record of Work and marks the topic completed with date and reflections.',
        '4) System compares completed topics against the current calendar week to calculate progress percentage.',
        '5) If milestones fall behind schedule, automated alerts prompt teacher and HOD to adjust pacing.',
      ],
      workedExample: [
        'Term 1 has 12 weeks with 15 planned Physics topics.',
        'By Week 6, 8 topics should be complete. Teacher logs 5 topics completed.',
        'The dashboard flags the subject as "Behind Schedule by 3 topics" and recommends makeup periods.',
      ],
      edgeCases: [
        'School event cancellations automatically shift expected week milestones forward.',
        'Topics marked incomplete or needing revision can be flagged for revision periods.',
        'Admins and HODs can export the complete Record of Work log for ministry/board inspections.',
      ],
    },
  },
  {
    id: 'exams-module',
    title: 'Exams & Terminal Assessment Gating',
    feature: 'grading',
    roles: ['admin', 'teacher'],
    shortBlurb: 'Admin-configured assessment cycles, grading scales, score capture rules, and report card releases.',
    whatItDoes:
      'Standardizes the examination cycle. Protects academic integrity by requiring administrators to configure active terms, grading scales, and assessment weightings before teachers can input test scores.',
    whatChanges:
      'Activating an assessment cycle opens score entry forms for assigned teachers; locking a term closes score entry to prevent unauthorized post-exam tampering.',
    crossLinks: ['Academic Setup → Grading Scales', 'Academic Setup → Assessment Types', 'Results → Grade Management'],
    deepDive: {
      title: 'Assessment cycle workflow',
      steps: [
        '1) Admin defines Grading Scales (e.g. A to F) and Assessment Types (e.g. Midterm 30%, Final 70%) in Academic Setup.',
        '2) Admin creates or selects the active Term and unlocks it for score capture.',
        '3) Teachers enter raw scores for their assigned classes and subjects.',
        '4) HOD and Admin inspect the Completeness Matrix to identify missing student marks.',
        '5) When 100% complete, Admin locks score entry and releases generated report cards to student and parent portals.',
      ],
      workedExample: [
        'Grade 10 English: Term 2 Midterm exam is weighted at 40%, End-of-Term at 60%.',
        'Teacher inputs raw scores out of 100.',
        'System computes composite term score, matches letter grade from the scale, and locks editing once published.',
      ],
      edgeCases: [
        'Score entry is blocked if the current term is locked or if no grading scale is attached.',
        'Missing scores highlight with amber alerts on the Completeness tab before batch release is allowed.',
        'Re-opening a locked assessment requires explicit Institution Admin override with audit record.',
      ],
    },
  },
  {
    id: 'school-calendar',
    title: 'School Calendar & Class Cancellations',
    roles: ['admin', 'teacher', 'student', 'parent'],
    shortBlurb: 'Term dates, holidays, exam periods, and automatic class cancellation broadcasts.',
    whatItDoes:
      'Central schedule for the entire school community. When an event is scheduled with the "Cancels Classes" flag (e.g., Public Holiday, Sports Day, Weather Closure), the system automatically updates the timetable and notifies affected users.',
    whatChanges:
      'Events with class cancellation suppress attendance requirements for that date and post an automated announcement to students, parents, and teachers.',
    crossLinks: ['Calendar → Events', 'Communication → Announcements', 'Timetable → Schedule'],
    deepDive: {
      title: 'Event scheduling and cancellation automation',
      steps: [
        '1) Admin or authorized staff clicks "Add Event" in School Calendar.',
        '2) Enter event title, date range, time, and select category (Holiday, Exam, Meeting, Sports).',
        '3) If classes will not take place, toggle "Cancels Classes" to active.',
        '4) System automatically broadcasts an urgent in-app announcement to parents, students, and teachers.',
        '5) Timetable and attendance engines recognize the cancellation and mark the day as non-instructional.',
      ],
      workedExample: [
        'Admin creates "National Heroes Day" on October 20th with "Cancels Classes" checked.',
        'Parents receive an announcement: "Classes cancelled on Oct 20 for National Heroes Day".',
        'Teachers are not prompted for daily attendance rolls on that date.',
      ],
      edgeCases: [
        'Partial-day events can specify start and end times without canceling full-day classes.',
        'Deleting a cancellation event automatically re-enables expected lessons on the master timetable.',
        'Holidays spanning multiple days apply cancellation rules across all included dates.',
      ],
    },
  },
  {
    id: 'custom-roles',
    title: 'Custom Roles & Granular Permissions',
    roles: ['admin'],
    shortBlurb: 'Fine-grained permission matrices to grant tailored access rights to staff members.',
    whatItDoes:
      'Allows institution administrators to create specialized roles beyond default profiles. Admins configure specific Read, Write, and Publish permissions across modules (Academics, Finance, Attendance, Library, Timetable, Communication).',
    whatChanges:
      'Creating and assigning a custom role gives the user exact access to permitted screens and buttons while hiding unauthorized navigation items.',
    crossLinks: ['Management → Roles', 'Users → User Management', 'Settings → Security'],
    deepDive: {
      title: 'Custom role builder lifecycle',
      steps: [
        '1) Navigate to Management → Roles and click "Create Custom Role".',
        '2) Enter a descriptive role title (e.g., "Discipline Master" or "Exam Officer") and description.',
        '3) Optionally pick a starter template (e.g. Academic Coordinator, Assistant Bursar) to prefill checkboxes.',
        '4) Check or uncheck permissions per module: Read (viewing), Write (editing/saving), and Special Actions (publishing).',
        '5) Save the role, then assign it to one or more staff members in User Management.',
      ],
      workedExample: [
        'An "Activities Coordinator" needs to manage the calendar and message parents, but must not see financial or grading data.',
        'Admin creates the role, checks Communication (Read/Write) and Calendar (Read/Write), and unchecks Finance and Academics.',
        'The assigned coordinator sees only Calendar and Communication tabs.',
      ],
      edgeCases: [
        'Built-in system roles (Admin, Teacher, Student, Parent) cannot be deleted to preserve core stability.',
        'A custom role cannot grant superuser or database-level permissions outside institution tenant boundaries.',
        'Users assigned multiple roles receive the union of all granted permissions.',
      ],
    },
  },
  {
    id: 'academic-vault',
    title: 'Digital Resources & Academic Vault',
    roles: ['admin', 'teacher', 'student', 'parent'],
    shortBlurb: 'Secure digital repository for lesson plans, past papers, syllabus notes, and study media.',
    whatItDoes:
      'Provides cloud storage for curriculum resources with granular audience visibility. Staff can upload documents, links, and videos while specifying whether materials are private to teachers, class-restricted, or student-facing.',
    whatChanges:
      'Uploading a resource with audience filters immediately makes it available in the target students\' or teachers\' resource library.',
    crossLinks: ['Management → Resources', 'Teacher → Materials', 'Student → Learning Vault'],
    deepDive: {
      title: 'Resource publishing and audience scoping',
      steps: [
        '1) Staff member clicks "Upload Resource" in Resources or Materials.',
        '2) Attach the file (PDF, slide deck, document, or image) or provide an external web/video link.',
        '3) Choose the Subject and Class level associated with the material.',
        '4) Set Audience Visibility: "All Students", "Teachers Only" (confidential), or "Specific Class".',
        '5) Save resource; authorized viewers can preview or download it instantly.',
      ],
      workedExample: [
        'Teacher uploads "Term 2 Mock Exam Marking Scheme" and marks it "Teachers Only".',
        'Other teachers can view and download the scheme, while student portals cannot see or access the file.',
        'Teacher uploads "Form 4 Revision Notes" as "Public / All Students" for open student revision.',
      ],
      edgeCases: [
        'Files exceeding maximum upload size must be linked via external cloud links (Google Drive, YouTube).',
        'Archived or deleted resources are immediately removed from student access.',
        'Audience visibility can be updated at any time (e.g., changing from Teachers Only to Students after exam completion).',
      ],
    },
  },
  {
    id: 'timetable-builder',
    title: 'Timetable & Conflict-Free Scheduling',
    roles: ['admin', 'teacher'],
    shortBlurb: 'Automated scheduling engine and manual period grid with real-time clash detection.',
    whatItDoes:
      'Builds master class timetables. Features an automated generator respecting teacher availability, room capacity, and subject weekly period requirements, along with a manual editor that flags teacher or room double-booking.',
    whatChanges:
      'Publishing a timetable activates the daily lesson schedule across all teacher dashboards, student views, and classroom displays.',
    crossLinks: ['Timetable → Timetable Builder', 'Calendar → Daily Schedule', 'Classes → Streams'],
    deepDive: {
      title: 'Timetable generation and clash prevention',
      steps: [
        '1) Admin verifies subjects, teacher assignments, and class streams in Academic Setup and Management.',
        '2) In Timetable Builder, set school day hours, period duration, break intervals, and active days.',
        '3) Click "Auto-Generate Timetable" to run the clash-free scheduling engine.',
        '4) Inspect the timetable grid; any conflict (teacher in two rooms, or class double-booked) is highlighted with amber/red alert badges.',
        '5) Fine-tune periods using manual drag/edit, then click "Publish Timetable" and export printable PDF schedules.',
      ],
      workedExample: [
        'Teacher Otieno is assigned to teach Mathematics to 7A and 8B.',
        'The engine ensures 7A Math and 8B Math are placed in different periods so Teacher Otieno is never double-booked.',
        'If an admin manually moves 8B Math into Period 2 where Otieno already teaches 7A, the conflict engine triggers an instant clash warning.',
      ],
      edgeCases: [
        'Auto-generator requires that total weekly periods required do not exceed available timetable slots.',
        'Draft timetables are visible only to Admins until formally published.',
        'Teachers assigned to multiple schools or part-time schedules can have specific unavailable periods locked.',
      ],
    },
  },
];

interface ReferenceManualProps {
  role: SettingsRole;
  tier: SubscriptionTierInfo;
  initialAnchor?: string;
}

export function ReferenceManual({ role, tier, initialAnchor }: ReferenceManualProps) {
  const { isDark } = useTheme();
  const [open, setOpen] = useState<Record<string, boolean>>({ [initialAnchor || 'promotion-engine']: true });
  const [anchorY, setAnchorY] = useState<Record<string, number>>({});
  const [scrollRef, setScrollRef] = useState<ScrollView | null>(null);

  const openAndScrollToAnchor = (anchor?: string) => {
    if (!anchor) return;
    setOpen((prev) => ({ ...prev, [anchor]: true }));
    const y = anchorY[anchor];
    if (scrollRef && typeof y === 'number') {
      setTimeout(() => {
        scrollRef.scrollTo({ y: Math.max(0, y - 12), animated: true });
      }, 120);
    }
  };

  React.useEffect(() => {
    if (initialAnchor) {
      openAndScrollToAnchor(initialAnchor);
    }
  }, [initialAnchor, scrollRef, anchorY]);

  const bg = isDark ? '#0D1117' : '#F9FAFB';
  const card = isDark ? '#10161f' : '#FFFFFF';
  const text = isDark ? '#F9FAFB' : '#111827';
  const muted = isDark ? '#9CA3AF' : '#6B7280';
  const border = isDark ? '#30363d' : '#E5E7EB';

  const visibleModules = useMemo(
    () =>
      MODULES.filter((m) => (!m.roles || m.roles.includes(role)) && hasFeatureAccess(tier, m.feature)),
    [role, tier],
  );

  return (
    <ScrollView
      ref={(r) => setScrollRef(r)}
      style={{ flex: 1, backgroundColor: bg }}
      contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
    >
      {visibleModules.map((m) => {
        const isOpen = !!open[m.id];
        return (
          <View
            key={m.id}
            onLayout={(e: LayoutChangeEvent) => {
              const y = e.nativeEvent.layout.y;
              setAnchorY((prev) => (prev[m.id] === y ? prev : { ...prev, [m.id]: y }));
            }}
            style={{ backgroundColor: card, borderColor: border, borderWidth: 1, borderRadius: 14, marginBottom: 10, overflow: 'hidden' }}
          >
            <TouchableOpacity
              onPress={() => setOpen((prev) => ({ ...prev, [m.id]: !prev[m.id] }))}
              style={{ padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
              accessibilityRole="button"
              accessibilityLabel={`${m.title} section`}
            >
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={{ color: text, fontWeight: '800', fontSize: 14 }}>{m.title}</Text>
                <Text style={{ color: muted, fontSize: 12, marginTop: 2 }}>{m.shortBlurb}</Text>
              </View>
              {isOpen ? <ChevronUp size={16} color={muted} /> : <ChevronDown size={16} color={muted} />}
            </TouchableOpacity>

            {isOpen ? (
              <View style={{ borderTopColor: border, borderTopWidth: 1, padding: 12 }}>
                <Text style={{ color: text, fontSize: 13, fontWeight: '700', marginBottom: 4 }}>What it does</Text>
                <Text style={{ color: muted, fontSize: 12, marginBottom: 10 }}>{m.whatItDoes}</Text>

                <Text style={{ color: text, fontSize: 13, fontWeight: '700', marginBottom: 4 }}>What changes when you touch it</Text>
                <Text style={{ color: muted, fontSize: 12, marginBottom: 10 }}>{m.whatChanges}</Text>

                <Text style={{ color: text, fontSize: 13, fontWeight: '700', marginBottom: 4 }}>Related settings</Text>
                {m.crossLinks.map((l) => (
                  <Text key={l} style={{ color: '#FF6B00', fontSize: 12, marginBottom: 2 }}>• {l}</Text>
                ))}

                {m.deepDive ? (
                  <View style={{ marginTop: 10 }}>
                    <Text style={{ color: text, fontSize: 13, fontWeight: '800', marginBottom: 6 }}>{m.deepDive.title}</Text>
                    {m.deepDive.steps.map((s) => (
                      <Text key={s} style={{ color: muted, fontSize: 12, marginBottom: 4 }}>{s}</Text>
                    ))}
                    <Text style={{ color: text, fontSize: 13, fontWeight: '700', marginTop: 6, marginBottom: 4 }}>Worked example</Text>
                    {m.deepDive.workedExample.map((s) => (
                      <Text key={s} style={{ color: muted, fontSize: 12, marginBottom: 4 }}>{s}</Text>
                    ))}
                    <Text style={{ color: text, fontSize: 13, fontWeight: '700', marginTop: 6, marginBottom: 4 }}>Edge cases</Text>
                    {m.deepDive.edgeCases.map((s) => (
                      <Text key={s} style={{ color: muted, fontSize: 12, marginBottom: 4 }}>{s}</Text>
                    ))}
                  </View>
                ) : null}
              </View>
            ) : null}
          </View>
        );
      })}

      {visibleModules.length === 0 ? (
        <View style={{ backgroundColor: card, borderColor: border, borderWidth: 1, borderRadius: 14, padding: 14 }}>
          <Text style={{ color: muted, fontSize: 12 }}>No manual sections available for your current role/tier.</Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

export function getManualAnchorFromTooltip(id: TooltipTargetId): string | undefined {
  return SETTINGS_TOOLTIPS[id]?.learnMoreAnchor;
}
