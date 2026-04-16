const process = require("node:process");
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
        full_name: 'Kelson Otieno',
        data: { grade_level: 10, stream: 'West' }
    },
    {
        role: 'teacher',
        email: 'demo.teacher@lms.com',
        full_name: 'Sarah Chemutai',
        data: { department: 'Mathematics', qualification: 'MEd' }
    },
    {
        role: 'parent',
        email: 'demo.parent@lms.com',
        full_name: 'James Mwangi',
        data: { occupation: 'Financial Analyst', phone: '+254711223344' }
    },
    {
        role: 'admin',
        email: 'demo.admin@lms.com',
        full_name: 'Admin User',
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
        }

        const userId = authUser.id;

        // 2. Check/Create in public.users
        const { data: existingUser } = await supabase.from('users').select('id, role').eq('id', userId).single();

        if (!existingUser) {
            console.log(`Inserting into public.users for ${userDef.email}`);
            await supabase.from('users').insert({
                id: userId,
                email: userDef.email,
                full_name: userDef.full_name,
                role: userDef.role,
                institution_id: defaultInstitutionId,
                phone: userDef.data.phone || null
            });
        }

        // 3. Role specific updates
        if (userDef.role === 'student') {
            await supabase.from('students').upsert({ user_id: userId, ...userDef.data, institution_id: defaultInstitutionId }, { onConflict: 'user_id' });
        } else if (userDef.role === 'teacher') {
            await supabase.from('teachers').upsert({ user_id: userId, ...userDef.data, institution_id: defaultInstitutionId }, { onConflict: 'user_id' });
        } else if (userDef.role === 'parent') {
            await supabase.from('parents').upsert({ user_id: userId, ...userDef.data, institution_id: defaultInstitutionId }, { onConflict: 'user_id' });
        }
    }

    console.log('Seeding complete.');
}

seed().catch(err => console.error('Seeding failed:', err));
