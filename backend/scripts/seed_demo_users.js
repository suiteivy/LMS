const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load env from backend/.env
dotenv.config({ path: path.join(__dirname, '../.env') });

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

const DEMO_PASSWORD = 'DemoUser123!';

const DEMO_USERS = [
    {
        role: 'student',
        email: 'demo.student@lms.com',
        full_name: 'Demo Student',
        data: { grade_level: 'Grade 10', academic_year: '2025' }
    },
    {
        role: 'teacher',
        email: 'demo.teacher@lms.com',
        full_name: 'Demo Teacher',
        data: { department: 'Science', qualification: 'PhD', specialization: 'Physics' }
    },
    {
        role: 'parent',
        email: 'demo.parent@lms.com',
        full_name: 'Demo Parent',
        data: { occupation: 'Engineer', address: '123 Demo Lane' }
    },
    {
        role: 'admin',
        email: 'demo.admin@lms.com',
        full_name: 'Demo Admin',
        data: {}
    }
];

async function seed() {
    console.log('Starting demo user seeding...');

    // Get default institution if any
    const { data: institutions } = await supabase.from('institutions').select('id').limit(1);
    const defaultInstitutionId = institutions && institutions.length > 0 ? institutions[0].id : null;

    if (!defaultInstitutionId) {
        console.log('Warning: No institution found. Users will be created without institution_id.');
    }

    for (const userDef of DEMO_USERS) {
        console.log(`Processing ${userDef.role}: ${userDef.email}`);

        // 1. Check if user exists in Auth
        // We can't easily "get by email" with admin API without potentially cryptic errors, 
        // but listUsers works.
        const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();

        if (listError) {
            console.error('Error listing users:', listError);
            continue;
        }

        let authUser = users.find(u => u.email === userDef.email);

        if (!authUser) {
            console.log(`Creating auth user for ${userDef.email}`);
            const { data: created, error: createError } = await supabase.auth.admin.createUser({
                email: userDef.email,
                password: DEMO_PASSWORD,
                email_confirm: true,
                user_metadata: { full_name: userDef.full_name }
            });
            if (createError) {
                console.error(`Failed to create auth user ${userDef.email}:`, createError);
                continue;
            }
            authUser = created.user;
        } else {
            console.log(`Auth user ${userDef.email} already exists.`);
            // Optional: Update password to ensure it's known? 
            // await supabase.auth.admin.updateUserById(authUser.id, { password: DEMO_PASSWORD });
        }

        const userId = authUser.id;

        // 2. Check/Create in public.users
        const { data: existingUser } = await supabase.from('users').select('id, role').eq('id', userId).single();

        if (!existingUser) {
            console.log(`Inserting into public.users for ${userDef.email}`);
            const { error: insertError } = await supabase.from('users').insert({
                id: userId,
                email: userDef.email,
                full_name: userDef.full_name,
                role: userDef.role,
                institution_id: defaultInstitutionId
            });
            if (insertError) {
                console.error(`Failed to insert public user ${userDef.email}:`, insertError);
                // If trigger auto-inserted, we might get duplicate key error? 
                // If the trigger exists, it might have already inserted.
                // But if we just created auth user, the trigger *should* have fired.
                // Let's assume if existingUser is null, we need to insert OR the trigger hasn't fired yet?
                // Actually, triggers usually fire immediately on auth.users insert IF configured.
                // But standard Supabase doesn't have that trigger by default unless we added it.
                // The `enrollUser` controller manually inserts into `users`. So likely NO trigger.
            }
        } else {
            console.log(`Public user entry exists for ${userDef.email}`);
            if (existingUser.role !== userDef.role) {
                console.warn(`Role mismatch for ${userDef.email}. Expected ${userDef.role}, got ${existingUser.role}`);
                // Fix role?
                await supabase.from('users').update({ role: userDef.role }).eq('id', userId);
            }
        }

        // 3. Update/Insert Role Specific Tables
        // Wait for a moment to ensure triggers (if any)
        await new Promise(r => setTimeout(r, 500));

        if (userDef.role === 'student') {
            // Check database for student entry
            const { data: student } = await supabase.from('students').select('id').eq('user_id', userId).single();
            if (!student) {
                // If manual insert needed
                await supabase.from('students').insert({ user_id: userId, ...userDef.data });
            }
        } else if (userDef.role === 'teacher') {
            const { data: teacher } = await supabase.from('teachers').select('id').eq('user_id', userId).single();
            if (!teacher) {
                await supabase.from('teachers').insert({ user_id: userId, ...userDef.data });
            }
        } else if (userDef.role === 'parent') {
            const { data: parent } = await supabase.from('parents').select('id').eq('user_id', userId).single();
            if (!parent) {
                await supabase.from('parents').insert({ user_id: userId, ...userDef.data });
            }
        }
        // Admin usually doesn't have extra table or minimal
        else if (userDef.role === 'admin') {
            const { data: admin } = await supabase.from('admins').select('id').eq('user_id', userId).single();
            if (!admin) {
                await supabase.from('admins').insert({ user_id: userId, ...userDef.data });
            }
        }
    }

    console.log('Seeding complete.');
}

seed().catch(err => console.error('Seeding failed:', err));
