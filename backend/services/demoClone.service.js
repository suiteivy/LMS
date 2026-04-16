const supabase = require('../utils/supabaseClient');
const crypto = require('crypto');

/**
 * Clones a template institution and its associated data into a new, isolated institution.
 * @param {string} templateId - The ID of the institution to clone from.
 * @param {string} teacherUserId - The ID of the primary teacher user for the demo.
 * @param {string} adminUserId - The ID of the primary admin user for the demo.
 * @returns {Promise<string>} - The new institution ID.
 */
async function cloneInstitution(templateId, teacherUserId, adminUserId) {
    console.log(`Cloning institution ${templateId} for new demo session...`);

    // 1. Create New Institution
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

    // 2. Clone Teachers (Initially just mapping the logged-in demo user)
    // We assume the caller created a fresh Auth user and passed the ID.
    const teacherId = `TCH-DEMO-${newInstitutionId.slice(0, 4)}`;
    await supabase.from('teachers').insert({
        id: teacherId,
        user_id: teacherUserId,
        institution_id: newInstitutionId,
        department: 'Mathematics',
        qualification: 'MEd'
    });

    // 3. Clone Admins
    const adminId = `ADM-DEMO-${newInstitutionId.slice(0, 4)}`;
    await supabase.from('admins').insert({
        id: adminId,
        user_id: adminUserId,
        institution_id: newInstitutionId,
        is_main: true
    });

    // 4. Clone Classes & Subjects
    // We fetch and re-insert to map new foreign keys
    const { data: classes } = await supabase.from('classes').select('*').eq('institution_id', templateId);
    for (const cls of classes) {
        const newClassId = crypto.randomUUID();
        // Strip columns that were removed or should be auto-generated to avoid schema conflicts
        const { name, display_name: _dn, ...classData } = cls;
        
        const { error: clsErr } = await supabase.from('classes').insert({
            ...classData,
            id: newClassId,
            institution_id: newInstitutionId,
            teacher_id: teacherId
        });
        if (clsErr) continue;

        // Clone Subjects for this class
        const { data: subjects } = await supabase.from('subjects').select('*').eq('class_id', cls.id);
        for (const sub of subjects) {
            const newSubId = crypto.randomUUID();
            const { error: subErr } = await supabase.from('subjects').insert({
                ...sub,
                id: newSubId,
                institution_id: newInstitutionId,
                teacher_id: teacherId,
                class_id: newClassId
            });
            if (subErr) continue;

            // Clone Assignments
            const { data: assignments } = await supabase.from('assignments').select('*').eq('subject_id', sub.id);
            for (const ass of assignments) {
                const newAssId = crypto.randomUUID();
                await supabase.from('assignments').insert({
                    ...ass,
                    id: newAssId,
                    institution_id: newInstitutionId,
                    subject_id: newSubId,
                    teacher_id: teacherId,
                    class_id: newClassId
                });
            }

            // Clone Exams
            const { data: exams } = await supabase.from('exams').select('*').eq('subject_id', sub.id);
            for (const exm of exams) {
                const newExmId = crypto.randomUUID();
                await supabase.from('exams').insert({
                    ...exm,
                    id: newExmId,
                    institution_id: newInstitutionId,
                    subject_id: newSubId,
                    teacher_id: teacherId
                });
            }
        }

        // Clone Students & Parents (Linking them to the new class)
        const { data: enrollments } = await supabase.from('class_enrollments').select('student_id').eq('class_id', cls.id);
        for (const enr of enrollments) {
            const { data: stu } = await supabase
                .from('students')
                .select('*, users(*)')
                .eq('id', enr.student_id)
                .single();
                
            if (!stu) continue;

            const newStuId = `STU-${newInstitutionId.slice(0, 4)}-${stu.id.split('-').pop()}`;
            const newStuUserId = crypto.randomUUID();

            // Create a public user profile for the student (no login needed, but profile required for names)
            if (stu.users) {
                await supabase.from('users').insert({
                    ...stu.users,
                    id: newStuUserId,
                    institution_id: newInstitutionId,
                    email: `student.${newStuUserId.slice(0, 8)}@demo.lms`
                });
            }

            await supabase.from('students').insert({
                ...stu,
                id: newStuId,
                institution_id: newInstitutionId,
                class_id: newClassId,
                user_id: newStuUserId
            });

            await supabase.from('class_enrollments').insert({
                student_id: newStuId,
                class_id: newClassId,
                institution_id: newInstitutionId
            });
            
            // Clone Reports for this student
            const { data: reports } = await supabase.from('academic_reports').select('*').eq('student_id', stu.id);
            for (const rep of reports) {
                await supabase.from('academic_reports').insert({
                    ...rep,
                    id: crypto.randomUUID(),
                    student_id: newStuId,
                    institution_id: newInstitutionId
                });
            }
        }
    }

    return newInstitutionId;
}

module.exports = { cloneInstitution };
