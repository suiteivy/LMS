require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const supabase = createClient(
    process.env.EXPO_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

const TEMPLATE_INSTITUTION_ID = 'b5bd788c-8297-4a96-b8b3-157814504fba';
const TEMPLATE_TEACHER_ID = 'TCH-MOMENTUM-001';

async function startDemo(role = 'teacher') {
    const sessionId = crypto.randomUUID().slice(0, 8);
    const email = `demo.${role}.${sessionId}@lms.demo`;
    const password = crypto.randomUUID();

    // 1. Create auth user
    const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { is_demo: true, role, session_id: sessionId }
    });
    if (authErr) throw new Error(`Auth create failed: ${authErr.message}`);
    const userId = authData.user.id;
    console.log(`Auth user created: ${userId}`);

    // 2. Create public.users row
    const { error: userErr } = await supabase.from('users').insert({
        id: userId,
        email,
        full_name: `Demo ${role}`,
        first_name: 'Demo',
        last_name: role.charAt(0).toUpperCase() + role.slice(1),
        role,
        institution_id: TEMPLATE_INSTITUTION_ID,
        status: 'approved',
        is_demo: true
    });
    if (userErr) throw new Error(`User insert failed: ${userErr.message}`);
    console.log(`Public user created`);

    // 3. Create role profile
    if (role === 'teacher') {
        const { error: teacherErr } = await supabase.from('teachers').insert({
            id: `TEA-DEMO-${sessionId}`,
            user_id: userId,
            institution_id: TEMPLATE_INSTITUTION_ID,
            department: 'Mathematics',
            qualification: 'MEd'
        });
        if (teacherErr) throw new Error(`Teacher insert failed: ${teacherErr.message}`);

    } else if (role === 'student') {
        const { data: stu, error: stuErr } = await supabase.from('students').insert({
            user_id: userId,
            institution_id: TEMPLATE_INSTITUTION_ID,
            class_id: '417561a5-48c5-4c45-b736-97d49e74bd35',
            form_level: 2
        }).select('id').single();
        if (stuErr) throw new Error(`Student insert failed: ${stuErr.message}`);

        // Enroll in template subject so student dashboard shows data
        await supabase.from('enrollments').insert({
            student_id: stu.id,
            subject_id: 'a9aca035-bf32-4876-85ec-ea0b7bc972fb', // template Math subject
            class_id: '417561a5-48c5-4c45-b736-97d49e74bd35',
            institution_id: TEMPLATE_INSTITUTION_ID,
            status: 'enrolled',
            enrollment_date: new Date().toISOString().split('T')[0]
        });

    } else if (role === 'admin') {
        const { error: adminErr } = await supabase.from('admins').insert({
            id: `ADM-DEMO-${sessionId}`,
            user_id: userId,
            institution_id: TEMPLATE_INSTITUTION_ID,
            is_main: false
        });
        if (adminErr) throw new Error(`Admin insert failed: ${adminErr.message}`);

    } else if (role === 'parent') {
        const parentId = `PAR-DEMO-${sessionId}`;

        const { error: parentErr } = await supabase.from('parents').insert({
            id: parentId,
            user_id: userId,
            institution_id: TEMPLATE_INSTITUTION_ID
        });
        if (parentErr) throw new Error(`Parent insert failed: ${parentErr.message}`);

        // Link to template primary student so parent dashboard shows data
        const { error: linkErr } = await supabase.from('parent_students').insert({
            parent_id: parentId,
            student_id: 'c6306d7b-ad5e-4f5b-8118-47fcd462bd25', // template primary student
            institution_id: TEMPLATE_INSTITUTION_ID,
            relationship: 'guardian'
        });
        if (linkErr) throw new Error(`Parent-student link failed: ${linkErr.message}`);
    }

    // 4. Record trial session
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    const { error: trialErr } = await supabase.from('trial_sessions').insert({
        id: crypto.randomUUID(),
        institution_id: TEMPLATE_INSTITUTION_ID,
        role,
        expires_at: expiresAt
    });
    if (trialErr) throw new Error(`Trial session insert failed: ${trialErr.message}`);
    console.log(`Trial session created, expires: ${expiresAt}`);

    // 5. Sign in to get token
    const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
        email,
        password
    });
    if (signInErr) throw new Error(`Sign in failed: ${signInErr.message}`);

    console.log('\n=== DEMO SESSION READY ===');
    console.log(`Role: ${role}`);
    console.log(`Email: ${email}`);
    console.log(`Access token: ${signInData.session.access_token.slice(0, 40)}...`);
    console.log(`Institution: ${TEMPLATE_INSTITUTION_ID}`);

    return {
        access_token: signInData.session.access_token,
        refresh_token: signInData.session.refresh_token,
        user_id: userId,
        institution_id: TEMPLATE_INSTITUTION_ID,
        expires_at: expiresAt
    };
}

async function endDemo(userId) {
    console.log(`Ending demo for user: ${userId}`);

    const { data: user } = await supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .single();

    if (user?.role === 'teacher') {
        await supabase.from('teachers').delete().eq('user_id', userId);

    } else if (user?.role === 'student') {
        const { data: stu } = await supabase
            .from('students')
            .select('id')
            .eq('user_id', userId)
            .single();

        if (stu) {
            await supabase.from('enrollments').delete().eq('student_id', stu.id)
                .eq('institution_id', TEMPLATE_INSTITUTION_ID)
        }
        await supabase.from('students').delete().eq('id', stu.id);

    } else if (user?.role === 'admin') {
        await supabase.from('admins').delete().eq('user_id', userId);
    } else if (user?.role === 'parent') {
        const { data: parent } = await supabase.from('parents').select('id')
            .eq('user_id', userId).single()

        if (parent) {
            await supabase.from('parent_students').delete()
                .eq('parent_id', parent.id)
            await supabase.from('parents').delete().eq('id', parent.id)
        }
    }

    await supabase.from('trial_sessions').delete().eq('id', id);
    await supabase.from('users').delete().eq('id', userId);

    const { error } = await supabase.auth.admin.deleteUser(userId);
    if (error) console.warn(`Auth delete warning: ${error.message}`);

    console.log('Demo session cleaned up successfully');
}

// Test it
const role = process.argv[2] || 'teacher';
startDemo(role).then(session => {
    console.log('\nTest endDemo in 5 seconds...');
    setTimeout(() => endDemo(session.user_id), 5000);
}).catch(console.error);