const supabase = require('../utils/supabaseClient');
const crypto = require('crypto');

/**
 * Clones a template institution into a fully isolated, richly-populated demo instance.
 * 
 * Strategy:
 * - Clone the institution shell (classes, subjects, assignments, exams, fee_structures, books).
 * - Create anonymised placeholder users for every template student/teacher so class rosters look full.
 * - Link the actual logged-in demo user (teacher / admin / student) as the PRIMARY actor.
 * - For the primary demo student, clone ALL their rich data (submissions, exam results,
 *   attendance, payments, borrowed books, notifications, messages) so every dashboard widget
 *   shows realistic content from the very first screen.
 *
 * @param {string} templateId       - Source institution to clone from.
 * @param {string|null} teacherUserId - Auth user ID when role === 'teacher'.
 * @param {string|null} adminUserId   - Auth user ID when role === 'admin'.
 * @param {string|null} studentUserId - Auth user ID when role === 'student'.
 * @param {string|null} parentUserId  - Auth user ID when role === 'parent'.
 * @returns {Promise<string>} - The new institution ID.
 */
async function cloneInstitution(templateId, teacherUserId, adminUserId, studentUserId, parentUserId) {

    // ── 0. CONFIGURATION ────────────────────────────────────────────────────────
    // The template student whose rich data we will transplant into the demo clone
    const TEMPLATE_STUDENT_ID = 'c6306d7b-ad5e-4f5b-8118-47fcd462bd25';
    const TEMPLATE_STUDENT_USER = 'c6306d7b-ad5e-4f5b-8118-47fcd462bd25';
    const TEMPLATE_TEACHER_ID = 'TCH-MOMENTUM-001';
    const TEMPLATE_TEACHER_USER = 'a9270c4b-0f35-4d3b-87b8-4dc3da990587';

    // ── 1. CREATE INSTITUTION SHELL ─────────────────────────────────────────────
    const newInstitutionId = crypto.randomUUID();
    const { data: templateInst, error: instError } = await supabase
        .from('institutions')
        .select('*')
        .eq('id', templateId)
        .single();

    if (instError) throw instError;

    const { error: insertInstError } = await supabase
        .from('institutions')
        .insert({
            ...templateInst,
            id: newInstitutionId,
            name: `${templateInst.name} (Demo ${newInstitutionId.slice(0, 4)})`,
            subscription_plan: 'demo',
            subscription_status: 'active',
            trial_start_date: new Date().toISOString(),
            trial_end_date: new Date(Date.now() + 15 * 60 * 1000).toISOString()
        });

    if (insertInstError) throw insertInstError;

    // ── 2. CLONE TEACHERS ───────────────────────────────────────────────────────
    // Maps template teacher ID → new teacher ID (used later for subjects/assignments/students)
    const newTeacherId = `TEA-DEMO${newInstitutionId.slice(0, 4)}`
    const teacherIdMap = { [TEMPLATE_TEACHER_ID]: newTeacherId }

    if (teacherUserId) {
        await supabase.from('teachers').insert({
            id: newTeacherId,
            user_id: teacherUserId,
            institution_id: newInstitutionId,
            department: 'Mathematics',
            qualification: 'MEd'

        })
    } else {
        const ghostEmail = `teacher.ghost.${newInstitutionId.slice(0, 4)}@lms.demo`
        const { data: ghostAuth } = await supabase.auth.admin.createUser({
            email: ghostEmail,
            password: 'DemoUser123!',
            email_confirm: true,
            user_metadata: { is_demo: true }
        })

        if (ghostAuth?.user) {
            await supabase.from('users').insert({
                id: ghostAuth.user.id,
                email: ghostEmail,
                full_name: 'Demo Teacher',
                first_name: 'Demo',
                last_name: 'Teacher',
                role: 'teacher',
                institution_id: newInstitutionId,
                status: 'approved',
                is_demo: true
            });
            await supabase.from('teachers').insert({
                id: newTeacherId,
                user_id: ghostAuth.user.id,
                institution_id: newInstitutionId,
                department: 'Mathematics',
                qualification: 'MEd'
            });
        }
    }

    const primaryTeacherId = newTeacherId
    // ── 3. CLONE ADMIN ──────────────────────────────────────────────────────────
    const adminId = `ADM-DEMO-${newInstitutionId.slice(0, 4)}`;
    if (adminUserId) {
        await supabase.from('admins').insert({
            id: adminId,
            user_id: adminUserId,
            institution_id: newInstitutionId,
            is_main: true
        });
    }

    // ── 4. CLONE FEE STRUCTURES ─────────────────────────────────────────────────
    const feeIdMap = {};
    const { data: templateFees } = await supabase
        .from('fee_structures')
        .select('*')
        .eq('institution_id', templateId);

    for (const fee of (templateFees || [])) {
        const newFeeId = crypto.randomUUID();
        await supabase.from('fee_structures').insert({
            ...fee,
            id: newFeeId,
            institution_id: newInstitutionId
        });
        feeIdMap[fee.id] = newFeeId;
    }

    // ── 5. CLONE BOOKS ──────────────────────────────────────────────────────────
    const bookIdMap = {};
    const { data: templateBooks } = await supabase
        .from('books')
        .select('*')
        .eq('institution_id', templateId);

    for (const book of (templateBooks || [])) {
        const newBookId = crypto.randomUUID();
        await supabase.from('books').insert({
            ...book,
            id: newBookId,
            institution_id: newInstitutionId
        });
        bookIdMap[book.id] = newBookId;
    }

    // ── 6. CLONE CLASSES, SUBJECTS, ASSIGNMENTS, EXAMS ─────────────────────────
    // Maps template IDs → new IDs (for FK wiring)
    const classIdMap = {};
    const subjectIdMap = {};
    const assignmentIdMap = {};
    const examIdMap = {};

    const { data: classes } = await supabase
        .from('classes')
        .select('*')
        .eq('institution_id', templateId);

    for (const cls of (classes || [])) {
        const newClassId = crypto.randomUUID();
        const { name: _n, ...classData } = cls;
        const resolvedTeacher = teacherIdMap[cls.teacher_id] || primaryTeacherId;

        const { error: clsErr } = await supabase.from('classes').insert({
            ...classData,
            id: newClassId,
            institution_id: newInstitutionId,
            teacher_id: resolvedTeacher
        });

        // console.log('Class insert:', clsErr ? clsErr : 'OK', '|display_name:', cls.display_name)

        if (clsErr) continue;
        classIdMap[cls.id] = newClassId;

        // ── Subjects
        const { data: subjects } = await supabase
            .from('subjects')
            .select('*')
            .eq('class_id', cls.id);

        for (const sub of (subjects || [])) {
            // console.log('Cloning subject:', sub.title, '| id:', sub.id);
            const newSubId = crypto.randomUUID();
            const resolvedSubTeacher = teacherIdMap[sub.teacher_id] || primaryTeacherId;
            // console.log('Resolved teacher:', resolvedSubTeacher, '| teacherIdMap:', teacherIdMap)
            const { error: subErr } = await supabase.from('subjects').insert({
                ...sub,
                id: newSubId,
                institution_id: newInstitutionId,
                teacher_id: resolvedSubTeacher,
                class_id: newClassId
            });
            // console.log('Subject insert:', subErr ? subErr : "OK")
            if (subErr) continue;
            subjectIdMap[sub.id] = newSubId;

            // ── Assignments
            const { data: assignments } = await supabase
                .from('assignments')
                .select('*')
                .eq('subject_id', sub.id);

            for (const assignment of (assignments || [])) {
                const newAssignmentId = crypto.randomUUID();
                const { error: assignmentErr } = await supabase.from('assignments').insert({
                    ...assignment,
                    id: newAssignmentId,
                    institution_id: newInstitutionId,
                    subject_id: newSubId,
                    teacher_id: resolvedSubTeacher,
                    class_id: newClassId
                });
                if (!assignmentErr) assignmentIdMap[assignment.id] = newAssignmentId;
            }

            // ── Exams
            const { data: exams } = await supabase
                .from('exams')
                .select('*')
                .eq('subject_id', sub.id);

            for (const exm of (exams || [])) {
                const newExmId = crypto.randomUUID();
                const { error: exmErr } = await supabase.from('exams').insert({
                    ...exm,
                    id: newExmId,
                    institution_id: newInstitutionId,
                    subject_id: newSubId,
                    teacher_id: resolvedSubTeacher
                });
                if (!exmErr) examIdMap[exm.id] = newExmId;
            }
        }
    }

    // ── 7. CLONE STUDENTS ───────────────────────────────────────────────────────
    // Track which cloned student maps to the template's primary demo student
    const studentIdMap = {};
    let primaryDemoStudentId = null; // The new student ID for the logged-in demo student

    const { data: templateStudents } = await supabase
        .from('students')
        .select('*, users(*)')
        .eq('institution_id', templateId);

    for (const stu of (templateStudents || [])) {
        const isLoggedInStudent = (studentUserId && stu.id === TEMPLATE_STUDENT_ID);
        let newStuUserId;

        if (isLoggedInStudent) {
            // Wire the actual demo student user - don't create a new profile
            newStuUserId = studentUserId;
        } else {
            // Create an anonymised placeholder (profile only, no auth account)
            newStuUserId = crypto.randomUUID();
            const shortId = newStuUserId.slice(0, 4);
            await supabase.from('users').insert({
                id: newStuUserId,
                email: `student.${shortId}@demo.lms`,
                full_name: `Demo Student ${shortId.toUpperCase()}`,
                first_name: 'Demo',
                last_name: `Student ${shortId.toUpperCase()}`,
                role: 'student',
                institution_id: newInstitutionId,
                status: 'approved'
            });
        }

        const suffix = stu.id.split('-').pop() || crypto.randomBytes(3).toString('hex');
        const newStuId = crypto.randomUUID();
        const newClassId = stu.class_id ? (classIdMap[stu.class_id] || null) : null;

        const { users: _users, ...stuData } = stu

        const { error: stuInsertErr } = await supabase.from('students').insert({
            ...stuData,
            id: newStuId,
            institution_id: newInstitutionId,
            user_id: newStuUserId,
            class_id: newClassId
        });

        // console.log('Student insert:', stuInsertErr ? stuInsertErr : 'OK', '|ID:', newStuId)

        if (newClassId) {
            await supabase.from('class_enrollments').insert({
                student_id: newStuId,
                class_id: newClassId,
                institution_id: newInstitutionId
            });
        }

        studentIdMap[stu.id] = newStuId;
        if (isLoggedInStudent) primaryDemoStudentId = newStuId;
    }

    const { data: templateEnrollments } = await supabase
        .from('enrollments')
        .select('*')
        .eq('student_id', TEMPLATE_STUDENT_ID);

    const targetEnrollmentStudentId = primaryDemoStudentId || studentIdMap[TEMPLATE_STUDENT_ID];

    for (const enr of (templateEnrollments || [])) {
        const { error: enrErr } = await supabase.from('enrollments').insert({
            id: crypto.randomUUID(),
            student_id: targetEnrollmentStudentId,
            subject_id: subjectIdMap[enr.subject_id] || enr.subject_id,
            class_id: classIdMap[enr.class_id] || enr.class_id,
            institution_id: newInstitutionId,
            status: enr.status,
            enrollment_date: enr.enrollment_date
        });
        if (enrErr) console.error('Enrollment insert error:', enrErr);
    }

    // ── 8. CLONE RICH DATA FOR THE PRIMARY DEMO STUDENT ────────────────────────
    const targetStudentId = primaryDemoStudentId || studentIdMap[TEMPLATE_STUDENT_ID];
    const targetUserIdForNotifs = studentUserId || TEMPLATE_STUDENT_USER;

    if (targetStudentId) {
        // 8a. Submissions
        const { data: submissions } = await supabase
            .from('submissions')
            .select('*')
            .eq('student_id', TEMPLATE_STUDENT_ID);

        for (const sub of (submissions || [])) {
            const newAssId = assignmentIdMap[sub.assignment_id];
            if (!newAssId) continue;
            await supabase.from('submissions').insert({
                ...sub,
                id: crypto.randomUUID(),
                student_id: targetStudentId,
                assignment_id: newAssId,
                institution_id: newInstitutionId
            });
        }

        // 8b. Exam Results
        const { data: examResults } = await supabase
            .from('exam_results')
            .select('*')
            .eq('student_id', TEMPLATE_STUDENT_ID);

        for (const er of (examResults || [])) {
            const newExmId = examIdMap[er.exam_id];
            const newGradeBy = teacherIdMap[er.graded_by] || primaryTeacherId;
            if (!newExmId) continue;
            await supabase.from('exam_results').insert({
                ...er,
                id: crypto.randomUUID(),
                student_id: targetStudentId,
                exam_id: newExmId,
                graded_by: newGradeBy,
                institution_id: newInstitutionId
            });
        }

        // 8c. Attendance
        const { data: attendance } = await supabase
            .from('attendance')
            .select('*')
            .eq('student_id', TEMPLATE_STUDENT_ID);

        // console.log('Template attendace records found:', attendance?.length)

        for (const att of (attendance || [])) {
            const newClassId = classIdMap[att.class_id];
            const newSubjectId = subjectIdMap[att.subject_id];

            // console.log('Inserting attendace:', {
            //     student_id: targetStudentId,
            //     class_id: newClassId || att.class_id,
            //     subject_id: newSubjectId || att.subject_id
            // })

            const { error: attErr } = await supabase.from('attendance').insert({
                ...att,
                id: crypto.randomUUID(),
                student_id: targetStudentId,
                class_id: newClassId || att.class_id,
                subject_id: newSubjectId || att.subject_id,
                institution_id: newInstitutionId
            });

            if (attErr) console.error('Attendace insert error: ', attErr)
        }

        // 8d. Academic Reports
        const { data: reports } = await supabase
            .from('academic_reports')
            .select('*')
            .eq('student_id', TEMPLATE_STUDENT_ID);

        for (const rep of (reports || [])) {
            await supabase.from('academic_reports').insert({
                ...rep,
                id: crypto.randomUUID(),
                student_id: targetStudentId,
                institution_id: newInstitutionId
            });
        }

        // 8e. Payments (clone against first available fee structure)
        const { data: payments } = await supabase
            .from('payments')
            .select('*')
            .eq('student_id', TEMPLATE_STUDENT_ID);

        for (const pay of (payments || [])) {
            const newFeeId = feeIdMap[pay.fee_structure_id];
            if (!newFeeId) continue;
            await supabase.from('payments').insert({
                ...pay,
                id: crypto.randomUUID(),
                student_id: targetStudentId,
                fee_structure_id: newFeeId,
                institution_id: newInstitutionId,
                reference_number: `REF-DEMO-${crypto.randomBytes(4).toString('hex').toUpperCase()}`
            });
        }

        // 8f. Borrowed Books
        const { data: borrowedBooks } = await supabase
            .from('borrowed_books')
            .select('*')
            .eq('student_id', TEMPLATE_STUDENT_ID);

        for (const bb of (borrowedBooks || [])) {
            const newBookId = bookIdMap[bb.book_id];
            if (!newBookId) continue;
            await supabase.from('borrowed_books').insert({
                ...bb,
                id: crypto.randomUUID(),
                student_id: targetStudentId,
                book_id: newBookId,
                institution_id: newInstitutionId
            });
        }

        // 8g. Messages (chat/diary)
        const { data: templateMessages } = await supabase
            .from('messages')
            .select('*')
            .eq('receiver_id', TEMPLATE_STUDENT_USER);

        for (const msg of (templateMessages || [])) {
            const { error: msgErr } = await supabase.from('messages').insert({
                id: crypto.randomUUID(),
                sender_id: teacherUserId || msg.sender_id,
                receiver_id: targetUserIdForNotifs,
                subject: msg.subject,
                content: msg.content,
                is_read: false,
                institution_id: newInstitutionId
            });
            if (msgErr) console.error('Message insert error:', msgErr);
        }

        // 8h. Notifications (for the actual logged-in user)
        const { data: templateNotifs, error: notifFetchErr } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', TEMPLATE_STUDENT_USER);

        console.log('Template notifications found:', templateNotifs?.length, '| error:', notifFetchErr);

        for (const notif of (templateNotifs || [])) {
            const { error: notifErr } = await supabase.from('notifications').insert({
                ...notif,
                id: crypto.randomUUID(),
                user_id: targetUserIdForNotifs,
                institution_id: newInstitutionId,
                is_read: false
            });
            if (notifErr) console.error('Notification insert error:', notifErr);
        }

        // 8i: Diary entires for students
        const { data: diaryEntries } = await supabase
            .from('diary_entries')
            .select('*')
            .eq('institution_id', templateId)
            .eq('class_id', '417561a5-48c5-4c45-b736-97d49e74bd35')

        for (const entry of (diaryEntries || [])){
            const { error: diaryErr } = await supabase.from('diary_entries').insert({
                ...entry,
                id: crypto.randomUUID(),
                institution_id: newInstitutionId,
                class_id: classIdMap[entry.class_id] || entry.class_id,
                teacher_id: primaryTeacherId
            });
            if (diaryErr) console.error('Diary entry insert error:', diaryErr);
        }
    }

    // ── 9. CLONE PARENT (if parent role) ───────────────────────────────────────
    if (parentUserId && primaryDemoStudentId) {
        const parentId = `PAR-DEMO-${newInstitutionId.slice(0, 4)}`;
        await supabase.from('parents').insert({
            id: parentId,
            user_id: parentUserId,
            institution_id: newInstitutionId
        });
        await supabase.from('parent_students').insert({
            parent_id: parentId,
            student_id: primaryDemoStudentId,
            institution_id: newInstitutionId,
            relationship: 'guardian'
        });
    }

    return newInstitutionId;
}

module.exports = { cloneInstitution };
