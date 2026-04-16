const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function cleanup() {
  console.log('--- Cleaning Up Beta Test Data ---');
  
  const emails = [
    'admin@beta-academy.test',
    'teacher@beta-academy.test',
    'student1@beta-academy.test',
    'student2@beta-academy.test'
  ];

  try {
    // 1. Delete Auth Users
    const { data: { users } } = await supabase.auth.admin.listUsers();
    const toDelete = users.filter(u => emails.includes(u.email));
    
    for (const u of toDelete) {
      console.log(`Deleting Auth User: ${u.email} (${u.id})`);
      const { error: delErr } = await supabase.auth.admin.deleteUser(u.id);
      if (delErr) console.error(`Error deleting ${u.email}:`, delErr.message);
    }

    // 2. Delete Public Records (Force cleanup of role tables)
    const { data: insts } = await supabase.from('institutions').select('id').ilike('name', '%Beta Partner Academy%');
    for (const inst of insts) {
      console.log(`Cleaning Institution: ${inst.id}`);
      
      // Delete in order to satisfy FKs
      await supabase.from('class_enrollments').delete().in('student_id', 
        supabase.from('students').select('id').eq('institution_id', inst.id)
      );
      await supabase.from('students').delete().eq('institution_id', inst.id);
      await supabase.from('teachers').delete().eq('institution_id', inst.id);
      await supabase.from('admins').delete().eq('institution_id', inst.id);
      await supabase.from('classes').delete().eq('institution_id', inst.id);
      await supabase.from('financial_transactions').delete().eq('institution_id', inst.id);
      
      await supabase.from('users').delete().eq('institution_id', inst.id);
      await supabase.from('institutions').delete().eq('id', inst.id);
    }

    console.log('--- Cleanup Finished ---');
  } catch (error) {
    console.error('Cleanup failed:', error);
  }
}

(async () => {
  await cleanup();
})();
