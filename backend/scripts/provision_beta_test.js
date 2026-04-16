const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const BETA_INSTITUTION_NAME = "Beta Partner Academy";
const BETA_ADMIN_EMAIL = "admin@beta-academy.test";
const BETA_TEACHER_EMAIL = "teacher@beta-academy.test";
const BETA_STUDENT1_EMAIL = "student1@beta-academy.test";
const BETA_STUDENT2_EMAIL = "student2@beta-academy.test";
const TEST_PASSWORD = "CloudoraBeta2026!";

async function waitForRoleRecord(table, userId, maxRetries = 10) {
    for (let i = 0; i < maxRetries; i++) {
        const { data, error } = await supabase.from(table).select('id').eq('user_id', userId).maybeSingle();
        if (data && data.id) return data.id;
        console.log(`Waiting for ${table} record for ${userId} (Attempt ${i+1}/${maxRetries})...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    throw new Error(`Timeout waiting for ${table} record for user ${userId}`);
}

async function provision() {
  console.log('--- Starting Beta Test Provisioning (Resilient Mode) ---');

  try {
    // 1. Create Institution
    console.log('Provisioning Institution...');
    const { data: institution, error: instError } = await supabase
      .from('institutions')
      .insert({
        name: BETA_INSTITUTION_NAME,
        location: "Beta Testing Street, Cloudora City",
        email: BETA_ADMIN_EMAIL,
        phone: "+254 700 000 000",
        subscription_plan: 'beta',
        subscription_status: 'active',
        category_id: 'ef0056a3-3e0c-4e31-b6c7-119873196624', // Secondary
        email_domain: 'beta-academy.test'
      })
      .select()
      .single();

    if (instError) throw instError;
    const institutionId = institution.id;
    console.log(`Institution Created: ${institutionId}`);

    // 2. Helper to create users
    const createUser = async (email, fullName, role, isMainAdmin = false) => {
      console.log(`Creating ${role}: ${email}...`);
      
      // Auth User
      const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
        email,
        password: TEST_PASSWORD,
        email_confirm: true,
        user_metadata: { full_name: fullName }
      });
      if (authErr) throw authErr;

      const uid = authData.user.id;

      // Public Profile
      const { error: userErr } = await supabase
        .from('users')
        .insert({
          id: uid,
          email,
          full_name: fullName,
          first_name: fullName.split(' ')[0],
          last_name: fullName.split(' ').slice(1).join(' '),
          role,
          institution_id: institutionId
        });
      
      if (userErr) throw userErr;

      const roleTableMap = {
          'admin': 'admins',
          'teacher': 'teachers',
          'student': 'students'
      };

      const customId = await waitForRoleRecord(roleTableMap[role], uid);

      // If it's the main admin, ensure they are marked as is_main
      if (isMainAdmin) {
          await supabase.from('admins').update({ is_main: true }).eq('user_id', uid);
      }

      return { uid, customId };
    };

    // 3. Create Users
    const admin = await createUser(BETA_ADMIN_EMAIL, "Beta Administrator", "admin", true);
    const teacher = await createUser(BETA_TEACHER_EMAIL, "Beta Lead Teacher", "teacher");
    const s1 = await createUser(BETA_STUDENT1_EMAIL, "Beta Student Alpha", "student");
    const s2 = await createUser(BETA_STUDENT2_EMAIL, "Beta Student Omega", "student");

    // 4. Academic Setup
    console.log('Setting up academic records...');
    
    // Create Class
    const { data: classObj, error: classErr } = await supabase
      .from('classes')
      .insert({
        name: "Form 1 Beta",
        institution_id: institutionId,
        teacher_id: teacher.customId,
        form_level: 1,
        stream: "Beta"
      })
      .select()
      .single();
    if (classErr) throw classErr;

    // Enroll Students
    await supabase.from('class_enrollments').insert([
      { student_id: s1.customId, class_id: classObj.id },
      { student_id: s2.customId, class_id: classObj.id }
    ]);

    // 5. Financial Record (Test Payment)
    console.log('Recording initial Beta payment...');
    await supabase.from('financial_transactions').insert({
      institution_id: institutionId,
      amount: 0.00,
      type: 'subscription',
      status: 'completed',
      description: 'Beta Partner Initial Enrollment',
      payment_method: 'system'
    });

    console.log('--- Provisioning Completed Successfully ---');
    console.log(`\nCREDENTIALS:`);
    console.log(`Admin Email: ${BETA_ADMIN_EMAIL}`);
    console.log(`Password: ${TEST_PASSWORD}`);

  } catch (error) {
    console.error('PROVISIONING FAILED:');
    console.error(error);
  }
}

provision();
