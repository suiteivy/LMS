const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabase = createClient(
    process.env.EXPO_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function auditOrphans() {
    console.log('=== LMS Database Orphan Audit ===\n');

    // 1. Find orphaned submissions
    console.log('--- 1. ORPHANED SUBMISSIONS ---');
    console.log('Submissions where student is NOT enrolled in the subject\'s class\n');

    // Get all submissions with their assignment's subject and class
    const { data: submissions, error: subError } = await supabase
        .from('submissions')
        .select(`
            id,
            student_id,
            status,
            grade,
            assignment:assignments(
                id,
                subject_id,
                subject:subjects(
                    id,
                    class_id
                )
            )
        `);

    if (subError) {
        console.error('Error fetching submissions:', subError.message);
        return;
    }

    console.log(`Total submissions found: ${submissions.length}`);

    // Filter to those with valid assignment/subject data
    const validSubmissions = submissions.filter(s =>
        s.assignment?.subject?.class_id
    );
    console.log(`Submissions with valid assignment→subject→class: ${validSubmissions.length}`);
    console.log(`Submissions with broken joins (no class_id): ${submissions.length - validSubmissions.length}\n`);

    // Get all enrollments (both tables)
    const { data: directEnrollments } = await supabase
        .from('enrollments')
        .select('student_id, subject_id')
        .eq('status', 'enrolled');

    const { data: classEnrollments } = await supabase
        .from('class_enrollments')
        .select('student_id, class_id');

    // Build lookup sets
    const directEnrollSet = new Set();
    (directEnrollments || []).forEach(e => {
        directEnrollSet.add(`${e.student_id}:${e.subject_id}`);
    });

    // For class_enrollments, map student+class → subjects
    const classEnrollByStudentClass = new Map();
    (classEnrollments || []).forEach(e => {
        classEnrollByStudentClass.set(`${e.student_id}:${e.class_id}`, true);
    });

    const orphanedSubmissions = [];
    const brokenJoinSubmissions = [];

    for (const sub of validSubmissions) {
        const studentId = sub.student_id;
        const subjectId = sub.assignment.subject_id;
        const classId = sub.assignment.subject.class_id;

        const inDirectEnroll = directEnrollSet.has(`${studentId}:${subjectId}`);
        const inClassEnroll = classEnrollByStudentClass.has(`${studentId}:${classId}`);

        if (!inDirectEnroll && !inClassEnroll) {
            orphanedSubmissions.push(sub);
        }
    }

    for (const sub of submissions) {
        if (!sub.assignment?.subject?.class_id) {
            brokenJoinSubmissions.push(sub);
        }
    }

    console.log(`Orphaned submissions (student not in enrollments or class_enrollments): ${orphanedSubmissions.length}`);
    if (orphanedSubmissions.length > 0) {
        for (const sub of orphanedSubmissions.slice(0, 20)) {
            console.log(`  - Submission ${sub.id}: student=${sub.student_id}, subject=${sub.assignment.subject_id}, class=${sub.assignment.subject.class_id}, status=${sub.status}, grade=${sub.grade}`);
        }
        if (orphanedSubmissions.length > 20) {
            console.log(`  ... and ${orphanedSubmissions.length - 20} more`);
        }
    }

    console.log(`\nBroken join submissions (assignment→subject missing class_id): ${brokenJoinSubmissions.length}`);
    if (brokenJoinSubmissions.length > 0) {
        for (const sub of brokenJoinSubmissions.slice(0, 10)) {
            console.log(`  - Submission ${sub.id}: student=${sub.student_id}, assignment_subject_id=${sub.assignment?.subject_id}`);
        }
    }

    // 2. Find orphaned grades
    console.log('\n\n--- 2. ORPHANED GRADES ---');
    console.log('Grades where student is NOT enrolled in the subject\'s class\n');

    const { data: grades, error: gradeError } = await supabase
        .from('grades')
        .select(`
            id,
            student_id,
            subject_id,
            total_grade,
            graded_by
        `);

    if (gradeError) {
        console.error('Error fetching grades:', gradeError.message);
        return;
    }

    console.log(`Total grades found: ${grades.length}`);

    // Get subjects with class_id for grades orphan check
    const subjectIds = [...new Set((grades || []).map(g => g.subject_id).filter(Boolean))];
    const { data: subjects } = await supabase
        .from('subjects')
        .select('id, class_id')
        .in('id', subjectIds);
    
    const subjectClassMap = new Map();
    (subjects || []).forEach(s => subjectClassMap.set(s.id, s.class_id));

    const orphanedGrades = [];
    const gradesNoSubject = [];
    for (const grade of grades) {
        const studentId = grade.student_id;
        const subjectId = grade.subject_id;
        const classId = subjectClassMap.get(subjectId);

        if (!classId) {
            gradesNoSubject.push(grade);
            continue;
        }

        const inDirectEnroll = directEnrollSet.has(`${studentId}:${subjectId}`);
        const inClassEnroll = classEnrollByStudentClass.has(`${studentId}:${classId}`);

        if (!inDirectEnroll && !inClassEnroll) {
            orphanedGrades.push(grade);
        }
    }

    console.log(`Orphaned grades (student not in enrollments or class_enrollments): ${orphanedGrades.length}`);
    if (orphanedGrades.length > 0) {
        for (const grade of orphanedGrades.slice(0, 20)) {
            console.log(`  - Grade ${grade.id}: student=${grade.student_id}, subject=${grade.subject_id}, total_grade=${grade.total_grade}`);
        }
        if (orphanedGrades.length > 20) {
            console.log(`  ... and ${orphanedGrades.length - 20} more`);
        }
    }

    console.log(`\nGrades with subject not found in subjects table: ${gradesNoSubject.length}`);

    // 3. Summary
    console.log('\n\n--- 3. ENROLLMENT DATA SUMMARY ---');
    console.log(`Direct enrollments (enrollments table, status=enrolled): ${directEnrollments?.length || 0}`);
    console.log(`Class enrollments (class_enrollments table): ${classEnrollments?.length || 0}`);
    console.log(`Unique students in direct enrollments: ${new Set((directEnrollments || []).map(e => e.student_id)).size}`);
    console.log(`Unique students in class enrollments: ${new Set((classEnrollments || []).map(e => e.student_id)).size}`);

    // 4. Check for students in class_enrollments but NOT in enrollments
    console.log('\n\n--- 4. STUDENTS IN class_enrollments BUT NOT IN enrollments ---');
    const directStudentIds = new Set((directEnrollments || []).map(e => e.student_id));
    const classStudentIds = new Set((classEnrollments || []).map(e => e.student_id));
    const onlyInClass = [...classStudentIds].filter(id => !directStudentIds.has(id));
    console.log(`Students only in class_enrollments: ${onlyInClass.length}`);
    if (onlyInClass.length > 0) {
        for (const id of onlyInClass.slice(0, 10)) {
            console.log(`  - Student: ${id}`);
        }
        if (onlyInClass.length > 10) {
            console.log(`  ... and ${onlyInClass.length - 10} more`);
        }
    }

    // 5. Check for assignments without published status
    console.log('\n\n--- 5. UNPUBLISHED ASSIGNMENTS ---');
    const { data: assignments } = await supabase
        .from('assignments')
        .select('id, title, is_published, status');
    
    const unpublished = (assignments || []).filter(a => !a.is_published);
    console.log(`Total assignments: ${assignments?.length || 0}`);
    console.log(`Unpublished (is_published=false): ${unpublished.length}`);
    if (unpublished.length > 0) {
        for (const a of unpublished.slice(0, 10)) {
            console.log(`  - ${a.id}: "${a.title}" (status=${a.status})`);
        }
    }
}

auditOrphans().catch(console.error);
