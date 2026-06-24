require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { faker } = require('@faker-js/faker');
const crypto = require('crypto');

const supabase = createClient(
    process.env.EXPO_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);
console.log('URL:', process.env.EXPO_PUBLIC_SUPABASE_URL ? 'found' : 'MISSING');
console.log('KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'found' : 'MISSING');

// ── Template IDs (fixed so re-runs are idempotent) ───────────────────────────
const INSTITUTION_ID       = 'b5bd788c-8297-4a96-b8b3-157814504fba';
const TEACHER_ID           = 'TCH-MOMENTUM-001';
const TEACHER_USER_ID      = 'a9270c4b-0f35-4d3b-87b8-4dc3da990587';
const ADMIN_USER_ID        = 'b14cbc73-e3bf-4c0f-962a-b754a5979a84';
const PARENT_USER_ID       = '5392d979-e70a-4017-a340-502ea5706d41';
const PRIMARY_STUDENT_ID   = 'c6306d7b-ad5e-4f5b-8118-47fcd462bd25'; // TEXT (STU-...)
const PRIMARY_STUDENT_USER_ID = 'c6306d7b-ad5e-4f5b-8118-47fcd462bd25';
const PARENT_ID            = 'PAR-MOMENTUM-001';
const ADMIN_ID             = 'ADM-MOMENTUM-001';

const CLASS_MATH_ID        = '417561a5-48c5-4c45-b736-97d49e74bd35';
const CLASS_ENGLISH_ID     = 'dfe26cde-0bdc-4c14-98f2-093a71199a26';
const SUBJECT_MATH_ID      = 'a9aca035-bf32-4876-85ec-ea0b7bc972fb';
const SUBJECT_ENGLISH_ID   = 'db224c36-093b-4d92-9bed-61b720a991c8';
const FEE_STRUCTURE_ID     = 'f3be7c5a-2cb3-4b68-b765-cb3f5a2f5f1a';

// Fixed assignment/exam IDs so upserts are idempotent
const ASSIGNMENT_MATH_ID   = 'asgn0000-0000-4000-8000-000000000001';
const ASSIGNMENT_ENG_ID    = 'asgn0000-0000-4000-8000-000000000002';
const EXAM_MATH_ID         = 'exam0000-0000-4000-8000-000000000001';
const EXAM_ENG_ID          = 'exam0000-0000-4000-8000-000000000002';

const PAST_DATES = Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (i + 1));
    return d.toISOString().split('T')[0];
});

// ── Helpers ──────────────────────────────────────────────────────────────────
async function getAssignmentIds() {
    const { data } = await supabase
        .from('assignments')
        .select('id, subject_id')
        .eq('institution_id', INSTITUTION_ID);
    return data || [];
}

async function getStudentIds() {
    const { data } = await supabase
        .from('students')
        .select('id')
        .eq('institution_id', INSTITUTION_ID);
    return (data || []).map(s => s.id);
}

async function getExamIds() {
    const { data } = await supabase
        .from('exams')
        .select('id, subject_id')
        .eq('institution_id', INSTITUTION_ID);
    return data || [];
}

async function getFeeStructureIds() {
    const { data } = await supabase
        .from('fee_structures')
        .select('id')
        .eq('institution_id', INSTITUTION_ID);
    return (data || []).map(f => f.id);
}

// ── 1. Submissions ───────────────────────────────────────────────────────────
// Live cols: id(req), assignment_id, student_id(req), institution_id, status,
//            grade, feedback, submitted_at, subject_id, class_id, content, file_url
async function seedSubmissions(assignments, studentIds) {
    console.log('Seeding submissions...');
    const records = [];

    for (const assignment of assignments) {
        const subjectId = assignment.subject_id;
        const classId = subjectId === SUBJECT_MATH_ID ? CLASS_MATH_ID : CLASS_ENGLISH_ID;

        for (const studentId of studentIds) {
            const status = faker.helpers.arrayElement(['submitted', 'graded', 'graded', 'graded', 'late']);
            const grade = status === 'graded' ? faker.number.int({ min: 40, max: 100 }) : null;

            records.push({
                id: crypto.randomUUID(),
                student_id: studentId,
                assignment_id: assignment.id,
                subject_id: subjectId,
                class_id: classId,
                institution_id: INSTITUTION_ID,
                status,
                grade,
                feedback: grade ? faker.helpers.arrayElement([
                    'Good work, keep it up!',
                    'Needs improvement in key areas.',
                    'Excellent understanding of the topic.',
                    'Please review the concepts again.',
                    'Well structured and clearly explained.',
                ]) : null,
                submitted_at: faker.date.recent({ days: 14 }).toISOString(),
            });
        }
    }

    const { error } = await supabase.from('submissions').insert(records);
    if (error) console.error('Submissions error:', error.message);
    else console.log(`✓ ${records.length} submissions seeded`);
}

// ── 2. Attendance ────────────────────────────────────────────────────────────
// Live cols: id(req), institution_id, class_id, subject_id, student_id,
//            date(req), status(req), notes, recorded_at
async function seedAttendance(studentIds) {
    console.log('Seeding attendance...');
    const records = [];

    for (const date of PAST_DATES.slice(0, 20)) {
        for (const studentId of studentIds) {
            records.push({
                id: crypto.randomUUID(),
                student_id: studentId,
                class_id: CLASS_MATH_ID,
                subject_id: SUBJECT_MATH_ID,
                institution_id: INSTITUTION_ID,
                date,
                status: faker.helpers.arrayElement(['present', 'present', 'present', 'absent', 'late']),
            });
            records.push({
                id: crypto.randomUUID(),
                student_id: studentId,
                class_id: CLASS_ENGLISH_ID,
                subject_id: SUBJECT_ENGLISH_ID,
                institution_id: INSTITUTION_ID,
                date,
                status: faker.helpers.arrayElement(['present', 'present', 'present', 'absent', 'late']),
            });
        }
    }

    for (let i = 0; i < records.length; i += 500) {
        const { error } = await supabase.from('attendance').insert(records.slice(i, i + 500));
        if (error) console.error('Attendance error:', error.message);
    }
    console.log(`✓ ${records.length} attendance records seeded`);
}

// ── 3. Exam Results ──────────────────────────────────────────────────────────
// Live cols: id(req), exam_id, student_id, score, feedback, graded_by,
//            institution_id, created_at, updated_at
async function seedExamResults(exams, studentIds) {
    console.log('Seeding exam results...');
    const records = [];

    for (const exam of exams) {
        for (const studentId of studentIds) {
            records.push({
                id: crypto.randomUUID(),
                student_id: studentId,
                exam_id: exam.id,
                institution_id: INSTITUTION_ID,
                score: faker.number.int({ min: 35, max: 100 }),
                graded_by: TEACHER_ID,
                feedback: faker.helpers.arrayElement([
                    'Satisfactory', 'Excellent', 'Needs improvement',
                    'Good effort', 'Outstanding performance'
                ])
            });
        }
    }

    const { error } = await supabase.from('exam_results').insert(records);
    if (error) console.error('Exam results error:', error.message);
    else console.log(`✓ ${records.length} exam results seeded`);
}

// ── 4. Payments ──────────────────────────────────────────────────────────────
// Live cols: id(req), student_id, fee_structure_id, amount(req), payment_method,
//            reference_number, payment_date, status, institution_id,
//            proof_url, is_evidence_confirmed, admin_notes, reviewed_by, reviewed_at
async function seedPayments(feeIds, studentIds) {
    console.log('Seeding payments...');
    if (feeIds.length === 0) {
        console.log('No fee structures found, skipping payments');
        return;
    }

    const records = studentIds.map(studentId => ({
        id: crypto.randomUUID(),
        student_id: studentId,
        fee_structure_id: faker.helpers.arrayElement(feeIds),
        institution_id: INSTITUTION_ID,
        amount: faker.number.int({ min: 5000, max: 50000 }),
        status: faker.helpers.arrayElement(['completed', 'pending', 'failed']),
        payment_date: faker.date.recent({ days: 60 }).toISOString(),
        reference_number: `REF-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
        payment_method: faker.helpers.arrayElement(['mobile_money', 'bank_transfer', 'cash']),
    }));

    const { error } = await supabase.from('payments').insert(records);
    if (error) console.error('Payments error:', error.message);
    else console.log(`✓ ${records.length} payments seeded`);
}

// ── 5. Announcements ─────────────────────────────────────────────────────────
// Live cols: id(req), subject_id, teacher_id, title(req), message(req),
//            institution_id, created_at, updated_at
async function seedAnnouncements() {
    console.log('Seeding announcements...');
    const records = [
        {
            id: crypto.randomUUID(),
            institution_id: INSTITUTION_ID,
            teacher_id: TEACHER_ID,
            subject_id: SUBJECT_MATH_ID,
            title: 'End of Term Exam Schedule',
            message: 'The end of term mathematics examination will be held on Friday. Please ensure all assignments are submitted before then.',
        },
        {
            id: crypto.randomUUID(),
            institution_id: INSTITUTION_ID,
            teacher_id: TEACHER_ID,
            subject_id: SUBJECT_ENGLISH_ID,
            title: 'Essay Submission Deadline Extended',
            message: 'The deadline for the literature essay has been extended by 3 days. Submit your work via the assignments portal.',
        },
        {
            id: crypto.randomUUID(),
            institution_id: INSTITUTION_ID,
            teacher_id: TEACHER_ID,
            subject_id: null,
            title: 'Parent-Teacher Meeting',
            message: 'A parent-teacher meeting is scheduled for next week. Parents are encouraged to attend to discuss student progress.',
        },
        {
            id: crypto.randomUUID(),
            institution_id: INSTITUTION_ID,
            teacher_id: TEACHER_ID,
            subject_id: SUBJECT_MATH_ID,
            title: 'Mathematics Revision Materials',
            message: 'Revision materials for the upcoming exam have been uploaded to the Resource Bank. Please review chapters 4-7.',
        },
        {
            id: crypto.randomUUID(),
            institution_id: INSTITUTION_ID,
            teacher_id: TEACHER_ID,
            subject_id: null,
            title: 'School Sports Day',
            message: 'Annual sports day is coming up. Students are encouraged to sign up for their preferred events at the administration office.',
        },
    ];

    const { error } = await supabase.from('announcements').insert(records);
    if (error) console.error('Announcements error:', error.message);
    else console.log(`✓ ${records.length} announcements seeded`);
}

// ── 6. Messages ──────────────────────────────────────────────────────────────
// Live cols: id(req), sender_id(req), receiver_id(req), subject, content(req),
//            is_read, institution_id, created_at
async function seedMessages() {
    console.log('Seeding messages...');
    const records = [
        {
            id: crypto.randomUUID(),
            sender_id: TEACHER_USER_ID,
            receiver_id: PRIMARY_STUDENT_USER_ID,
            institution_id: INSTITUTION_ID,
            subject: 'Assignment Feedback',
            content: 'Hi Kelson, great work on your last assignment. Your analysis was thorough and well-structured.',
            is_read: false,
        },
        {
            id: crypto.randomUUID(),
            sender_id: TEACHER_USER_ID,
            receiver_id: PARENT_USER_ID,
            institution_id: INSTITUTION_ID,
            subject: 'Student Progress Update',
            content: 'Good afternoon, I wanted to update you on your child\'s progress. They have shown significant improvement this term.',
            is_read: false,
        },
        {
            id: crypto.randomUUID(),
            sender_id: PRIMARY_STUDENT_USER_ID,
            receiver_id: TEACHER_USER_ID,
            institution_id: INSTITUTION_ID,
            subject: 'Question about Assignment 2',
            content: 'Good morning, I had a question about the second assignment. Could you clarify what format the report should be in?',
            is_read: true,
        },
        {
            id: crypto.randomUUID(),
            sender_id: ADMIN_USER_ID,
            receiver_id: TEACHER_USER_ID,
            institution_id: INSTITUTION_ID,
            subject: 'Staff Meeting Reminder',
            content: 'This is a reminder that the staff meeting is scheduled for Thursday at 3pm in the main hall.',
            is_read: false,
        },
        {
            id: crypto.randomUUID(),
            sender_id: PARENT_USER_ID,
            receiver_id: TEACHER_USER_ID,
            institution_id: INSTITUTION_ID,
            subject: 'Absence Notification',
            content: 'Good morning, Kelson will be absent tomorrow due to a medical appointment. Please excuse the absence.',
            is_read: true,
        },
    ];

    const { error } = await supabase.from('messages').insert(records);
    if (error) console.error('Messages error:', error.message);
    else console.log(`✓ ${records.length} messages seeded`);
}

// ── 7. Notifications ─────────────────────────────────────────────────────────
// Live cols: id(req), user_id(req), title(req), message(req), type,
//            is_read, data, institution_id, created_at, expires_at
async function seedNotifications() {
    console.log('Seeding notifications...');
    const userNotifPairs = [
        { userId: TEACHER_USER_ID, messages: [
            { title: 'New Submission', body: 'Kelson Otieno submitted Assignment 2', type: 'info' },
            { title: 'Parent Message', body: 'James Mwangi sent you a message', type: 'info' },
            { title: 'Exam Reminder', body: 'End of term exam is in 3 days', type: 'warning' },
        ]},
        { userId: PRIMARY_STUDENT_USER_ID, messages: [
            { title: 'Assignment Graded', body: 'Your Math assignment has been graded', type: 'success' },
            { title: 'New Announcement', body: 'End of Term Exam Schedule posted', type: 'info' },
            { title: 'Message from Teacher', body: 'Sarah Chemutai sent you a message', type: 'info' },
        ]},
        { userId: PARENT_USER_ID, messages: [
            { title: 'Attendance Alert', body: 'Your child was marked late today', type: 'warning' },
            { title: 'Fee Reminder', body: 'Term 2 fees are due in 7 days', type: 'warning' },
            { title: 'Teacher Message', body: 'Sarah Chemutai sent you a progress update', type: 'info' },
        ]},
        { userId: ADMIN_USER_ID, messages: [
            { title: 'New Student Registered', body: 'A new student has been added to Form 2', type: 'info' },
            { title: 'Fee Payment Received', body: 'Payment of KES 15,000 received from Kelson Otieno', type: 'success' },
            { title: 'System Report Ready', body: 'Monthly attendance report is ready for review', type: 'info' },
        ]},
    ];

    const records = [];
    for (const { userId, messages } of userNotifPairs) {
        for (const msg of messages) {
            records.push({
                id: crypto.randomUUID(),
                user_id: userId,
                institution_id: INSTITUTION_ID,
                title: msg.title,
                message: msg.body,
                type: msg.type,
                is_read: false,
                data: {},
                created_at: faker.date.recent({ days: 5 }).toISOString(),
            });
        }
    }

    const { error } = await supabase.from('notifications').insert(records);
    if (error) console.error('Notifications error:', error.message);
    else console.log(`✓ ${records.length} notifications seeded`);
}

// ── 8. Diary Entries ─────────────────────────────────────────────────────────
// Live cols: id(req), institution_id, class_id, teacher_id, title(req),
//            content(req), entry_date(req), is_signed, status, student_id, assignment_id
async function seedDiaryEntries() {
    console.log('Seeding diary entries...');
    const entries = [
        {
            class_id: CLASS_MATH_ID,
            title: 'Introduction to Quadratic Equations',
            content: 'Covered the basics of quadratic equations. Students were engaged and participation was high. Will move to factorisation next lesson.',
            entry_date: PAST_DATES[1],
        },
        {
            class_id: CLASS_MATH_ID,
            title: 'Factorisation Practice',
            content: 'Students practiced factorisation with worked examples. 3 students struggled with negative coefficients — will provide additional support.',
            entry_date: PAST_DATES[3],
        },
        {
            class_id: CLASS_ENGLISH_ID,
            title: 'Essay Writing Techniques',
            content: 'Focused on essay structure — introduction, body paragraphs and conclusion. Students wrote practice introductions in class.',
            entry_date: PAST_DATES[2],
        },
        {
            class_id: CLASS_ENGLISH_ID,
            title: 'Literature Review: Animal Farm',
            content: 'Discussed themes of power and corruption in Animal Farm. Good class discussion with students showing strong comprehension.',
            entry_date: PAST_DATES[5],
        },
        {
            class_id: CLASS_MATH_ID,
            title: 'Mid-term Revision',
            content: 'Revision session covering all topics from the first half of term. Most students are on track. Identified 4 students who need extra attention.',
            entry_date: PAST_DATES[7],
        },
    ];

    const records = entries.map(e => ({
        id: crypto.randomUUID(),
        institution_id: INSTITUTION_ID,
        teacher_id: TEACHER_ID,
        status: 'approved',
        is_signed: true,
        ...e,
    }));

    const { error } = await supabase.from('diary_entries').insert(records);
    if (error) console.error('Diary entries error:', error.message);
    else console.log(`✓ ${records.length} diary entries seeded`);
}

// ── 9. Resources ─────────────────────────────────────────────────────────────
// Live cols: id(req), subject_id, teacher_id, title(req), url(req), type(req),
//            size, institution_id, status, created_at, updated_at
async function seedResources() {
    console.log('Seeding resources...');
    const records = [
        {
            id: crypto.randomUUID(),
            institution_id: INSTITUTION_ID,
            teacher_id: TEACHER_ID,
            subject_id: SUBJECT_MATH_ID,
            title: 'Quadratic Equations — Study Notes',
            url: 'https://example.com/resources/math-notes.pdf',
            type: 'pdf',
            size: '1.2 MB',
            status: 'approved',
        },
        {
            id: crypto.randomUUID(),
            institution_id: INSTITUTION_ID,
            teacher_id: TEACHER_ID,
            subject_id: SUBJECT_MATH_ID,
            title: 'Past Paper 2024 — Mathematics',
            url: 'https://example.com/resources/math-past-paper.pdf',
            type: 'pdf',
            size: '850 KB',
            status: 'approved',
        },
        {
            id: crypto.randomUUID(),
            institution_id: INSTITUTION_ID,
            teacher_id: TEACHER_ID,
            subject_id: SUBJECT_ENGLISH_ID,
            title: 'Animal Farm — Chapter Summaries',
            url: 'https://example.com/resources/animal-farm-summary.pdf',
            type: 'pdf',
            size: '640 KB',
            status: 'approved',
        },
        {
            id: crypto.randomUUID(),
            institution_id: INSTITUTION_ID,
            teacher_id: TEACHER_ID,
            subject_id: SUBJECT_ENGLISH_ID,
            title: 'Essay Writing Guide',
            url: 'https://example.com/resources/essay-guide.pdf',
            type: 'pdf',
            size: '410 KB',
            status: 'approved',
        },
    ];

    const { error } = await supabase.from('resources').insert(records);
    if (error) console.error('Resources error:', error.message);
    else console.log(`✓ ${records.length} resources seeded`);
}

// ── 10. Academic Reports ─────────────────────────────────────────────────────
// Live cols: id(req), student_id, institution_id, term(req), academic_year(req),
//            report_type(req), data, file_url, status, created_by
async function seedAcademicReports(studentIds) {
    console.log('Seeding academic reports...');
    const records = studentIds.map(studentId => {
        const totalMarks = faker.number.int({ min: 200, max: 400 });
        const averageGrade = faker.number.float({ min: 50, max: 95, fractionDigits: 1 });
        return {
            id: crypto.randomUUID(),
            student_id: studentId,
            institution_id: INSTITUTION_ID,
            term: 'Term 1',
            academic_year: '2026',
            report_type: 'end-of-term',
            status: 'published',
            data: {
                total_marks: totalMarks,
                average_grade: averageGrade,
                position: faker.number.int({ min: 1, max: studentIds.length }),
                teacher_remarks: faker.helpers.arrayElement([
                    'Excellent performance. Keep it up.',
                    'Good progress this term. Work on consistency.',
                    'Satisfactory. Can do better with more effort.',
                    'Outstanding student. A pleasure to teach.',
                    'Shows improvement. Continue working hard.',
                ]),
            },
            created_by: TEACHER_USER_ID,
        };
    });

    const { error } = await supabase.from('academic_reports').insert(records);
    if (error) console.error('Academic reports error:', error.message);
    else console.log(`✓ ${records.length} academic reports seeded`);
}

// ── 11. Core Entities ────────────────────────────────────────────────────────
async function seedCoreEntities() {
    console.log('Seeding core entities...\n');

    // 1. Institution
    // Required: id, name, addon_bursary, addon_diary, addon_attendance
    const { error: instErr } = await supabase.from('institutions').upsert({
        id: INSTITUTION_ID,
        name: 'Cloudora School',
        subscription_status: 'active',
        subscription_plan: 'pro',
        addon_bursary: true,
        addon_diary: true,
        addon_attendance: true,
        addon_library: true,
        addon_messaging: true,
        addon_finance: true,
        addon_analytics: true,
    });
    if (instErr) console.error('Institution seed error:', instErr.message);
    else console.log('✓ Institution upserted');

    // 2. Auth Users (must exist in auth.users before public.users can reference them)
    const authUsers = [
        { id: TEACHER_USER_ID,          email: 'teacher@cloudora.demo',  role: 'teacher' },
        { id: PRIMARY_STUDENT_USER_ID,  email: 'student@cloudora.demo',  role: 'student' },
        { id: PARENT_USER_ID,           email: 'parent@cloudora.demo',   role: 'parent'  },
        { id: ADMIN_USER_ID,            email: 'admin@cloudora.demo',    role: 'admin'   },
    ];
    for (const u of authUsers) {
        const { error } = await supabase.auth.admin.createUser({
            id: u.id,
            email: u.email,
            password: 'CloudoraDemo1!',
            email_confirm: true,
        });
        if (error && !error.message.toLowerCase().includes('already') && !error.message.includes('unique')) {
            console.error(`Auth user error (${u.email}):`, error.message);
        }
    }
    console.log('✓ Auth users ensured');

    // 3. Public users
    // Required: id, full_name, email, role, status
    const { error: userErr } = await supabase.from('users').upsert([
        { id: TEACHER_USER_ID,         full_name: 'Sarah Chemutai', role: 'teacher', email: 'teacher@cloudora.demo', institution_id: INSTITUTION_ID, status: 'approved', is_demo: true },
        { id: PRIMARY_STUDENT_USER_ID, full_name: 'Kelson Otieno',  role: 'student', email: 'student@cloudora.demo', institution_id: INSTITUTION_ID, status: 'approved', is_demo: true },
        { id: PARENT_USER_ID,          full_name: 'James Mwangi',   role: 'parent',  email: 'parent@cloudora.demo',  institution_id: INSTITUTION_ID, status: 'approved', is_demo: true },
        { id: ADMIN_USER_ID,           full_name: 'Admin User',     role: 'admin',   email: 'admin@cloudora.demo',   institution_id: INSTITUTION_ID, status: 'approved', is_demo: true },
    ]);
    if (userErr) console.error('Users seed error:', userErr.message);
    else console.log('✓ Public users upserted');

    // 4. Teacher profile
    const { error: tchErr } = await supabase.from('teachers').upsert({
        id: TEACHER_ID,
        user_id: TEACHER_USER_ID,
        institution_id: INSTITUTION_ID,
        position: 'teacher',
        department: 'Mathematics & English',
    }, { onConflict: 'user_id' });
    if (tchErr) console.error('Teacher profile error:', tchErr.message);
    else console.log('✓ Teacher profile upserted');

    // 5. Student profile
    // Live: id(req), user_id(req), institution_id, class_id, form_level, grade_level
    const { error: stdErr } = await supabase.from('students').upsert({
        id: PRIMARY_STUDENT_ID,
        user_id: PRIMARY_STUDENT_USER_ID,
        institution_id: INSTITUTION_ID,
        class_id: CLASS_MATH_ID,
        form_level: 3,
        academic_year: '2026',
    }, { onConflict: 'user_id' });
    if (stdErr) console.error('Student profile error:', stdErr.message);
    else console.log('✓ Student profile upserted');

    // 6. Parent profile
    const { error: prntErr } = await supabase.from('parents').upsert({
        id: PARENT_ID,
        user_id: PARENT_USER_ID,
        institution_id: INSTITUTION_ID,
        occupation: 'Accountant',
    }, { onConflict: 'user_id' });
    if (prntErr) console.error('Parent profile error:', prntErr.message);
    else console.log('✓ Parent profile upserted');

    // 7. Parent-student link
    const { error: psErr } = await supabase.from('parent_students').upsert({
        id: 'ps000000-0000-4000-8000-000000000001',
        parent_id: PARENT_ID,
        student_id: PRIMARY_STUDENT_ID,
        relationship: 'Father',
        institution_id: INSTITUTION_ID,
    }, { onConflict: 'parent_id,student_id' });
    if (psErr) console.error('Parent-Student link error:', psErr.message);
    else console.log('✓ Parent-Student link upserted');

    // 8. Classes
    const { error: clsErr } = await supabase.from('classes').upsert([
        { id: CLASS_MATH_ID,    display_name: 'Form 3 Math',    institution_id: INSTITUTION_ID, teacher_id: TEACHER_ID, form_level: 3 },
        { id: CLASS_ENGLISH_ID, display_name: 'Form 3 English', institution_id: INSTITUTION_ID, teacher_id: TEACHER_ID, form_level: 3 },
    ]);
    if (clsErr) console.error('Classes seed error:', clsErr.message);
    else console.log('✓ Classes upserted');

    // 9. Subjects (fee_amount is REQUIRED, default 0)
    const { error: subErr } = await supabase.from('subjects').upsert([
        { id: SUBJECT_MATH_ID,    title: 'Mathematics', class_id: CLASS_MATH_ID,    teacher_id: TEACHER_ID, institution_id: INSTITUTION_ID, fee_amount: 0 },
        { id: SUBJECT_ENGLISH_ID, title: 'English',     class_id: CLASS_ENGLISH_ID, teacher_id: TEACHER_ID, institution_id: INSTITUTION_ID, fee_amount: 0 },
    ]);
    if (subErr) console.error('Subjects seed error:', subErr.message);
    else console.log('✓ Subjects upserted');

    // 10. Fee Structure
    const { error: feeErr } = await supabase.from('fee_structures').upsert({
        id: FEE_STRUCTURE_ID,
        title: 'Term 1 Tuition Fee',
        amount: 50000,
        academic_year: '2026',
        term: 'Term 1',
        is_active: true,
        institution_id: INSTITUTION_ID,
    });
    if (feeErr) console.error('Fee structures seed error:', feeErr.message);
    else console.log('✓ Fee structure upserted');

    // 11. Enrollments (student_id, subject_id, enrollment_date all REQUIRED)
    const { error: enrollErr } = await supabase.from('enrollments').upsert([
        {
            id: 'e1a00000-0000-4000-8000-000000000001',
            student_id: PRIMARY_STUDENT_ID,
            subject_id: SUBJECT_MATH_ID,
            institution_id: INSTITUTION_ID,
            status: 'enrolled',
            enrollment_date: new Date().toISOString(),
        },
        {
            id: 'e1a00000-0000-4000-8000-000000000002',
            student_id: PRIMARY_STUDENT_ID,
            subject_id: SUBJECT_ENGLISH_ID,
            institution_id: INSTITUTION_ID,
            status: 'enrolled',
            enrollment_date: new Date().toISOString(),
        },
    ], { onConflict: 'student_id,subject_id' });
    if (enrollErr) console.error('Enrollments seed error:', enrollErr.message);
    else console.log('✓ Enrollments upserted');

    // 12. Assignments (grades_released is REQUIRED)
    const { error: assignErr } = await supabase.from('assignments').upsert([
        {
            id: ASSIGNMENT_MATH_ID,
            title: 'Algebra Homework 1',
            description: 'Solve equations 1 to 10 on pages 34-35',
            due_date: new Date(Date.now() + 7 * 86400000).toISOString(),
            status: 'active',
            subject_id: SUBJECT_MATH_ID,
            class_id: CLASS_MATH_ID,
            teacher_id: TEACHER_ID,
            institution_id: INSTITUTION_ID,
            total_points: 100,
            weight: 10,
            term: 'Term 1',
            grades_released: false,
            is_published: true,
        },
        {
            id: ASSIGNMENT_ENG_ID,
            title: 'Literature Essay',
            description: 'Write an essay on themes in Animal Farm (min. 500 words)',
            due_date: new Date(Date.now() + 5 * 86400000).toISOString(),
            status: 'active',
            subject_id: SUBJECT_ENGLISH_ID,
            class_id: CLASS_ENGLISH_ID,
            teacher_id: TEACHER_ID,
            institution_id: INSTITUTION_ID,
            total_points: 100,
            weight: 15,
            term: 'Term 1',
            grades_released: true,
            is_published: true,
        },
    ]);
    if (assignErr) console.error('Assignments seed error:', assignErr.message);
    else console.log('✓ Assignments upserted');

    // 13. Exams
    const { error: examErr } = await supabase.from('exams').upsert([
        {
            id: EXAM_MATH_ID,
            title: 'Mathematics Midterm Exam',
            description: 'Calculus and algebra midterm test',
            date: new Date().toISOString().split('T')[0],
            max_score: 100,
            subject_id: SUBJECT_MATH_ID,
            class_id: CLASS_MATH_ID,
            teacher_id: TEACHER_ID,
            institution_id: INSTITUTION_ID,
            weight: 30,
            term: 'Term 1',
            is_published: true,
        },
        {
            id: EXAM_ENG_ID,
            title: 'English Literature Midterm',
            description: 'Orwell novel comprehension midterm test',
            date: new Date().toISOString().split('T')[0],
            max_score: 100,
            subject_id: SUBJECT_ENGLISH_ID,
            class_id: CLASS_ENGLISH_ID,
            teacher_id: TEACHER_ID,
            institution_id: INSTITUTION_ID,
            weight: 25,
            term: 'Term 1',
            is_published: true,
        },
    ]);
    if (examErr) console.error('Exams seed error:', examErr.message);
    else console.log('✓ Exams upserted');

    console.log('\n✓ Core entities complete\n');
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function seed() {
    console.log('\n🌱 Starting Cloudora School template seed...\n');

    // Step 1: Ensure all parent records exist
    await seedCoreEntities();

    // Step 2: Clean existing child records for this institution
    console.log('Cleaning existing child records...');
    const tables = [
        'submissions', 'attendance', 'exam_results', 'payments',
        'announcements', 'messages', 'notifications',
        'diary_entries', 'resources', 'academic_reports'
    ];
    for (const table of tables) {
        const { error } = await supabase.from(table).delete().eq('institution_id', INSTITUTION_ID);
        if (error) console.error(`Error cleaning ${table}:`, error.message);
        else console.log(`  Cleared ${table}`);
    }

    // Step 3: Fetch dynamic IDs (assignments/exams/students may have more records)
    const [assignments, studentIds, exams, feeIds] = await Promise.all([
        getAssignmentIds(),
        getStudentIds(),
        getExamIds(),
        getFeeStructureIds(),
    ]);

    console.log(`\nFound: ${assignments.length} assignments, ${studentIds.length} students, ${exams.length} exams, ${feeIds.length} fee structures\n`);

    // Step 4: Seed child data
    await seedSubmissions(assignments, studentIds);
    await seedAttendance(studentIds);
    await seedExamResults(exams, studentIds);
    await seedPayments(feeIds, studentIds);
    await seedAnnouncements();
    await seedMessages();
    await seedNotifications();
    await seedDiaryEntries();
    await seedResources();
    await seedAcademicReports(studentIds);

    console.log('\n✅ Template seed complete!\n');
}

seed()
    .then(() => { console.log('Done'); process.exit(0); })
    .catch(e => { console.error('Failed:', e); process.exit(1); });