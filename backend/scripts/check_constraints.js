/**
 * check_constraints.js  –  Inspect live DB constraints & teacher ID format
 * Run: node backend/scripts/check_constraints.js
 */
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path  = require('path');
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const TEMPLATE_ID = 'b5bd788c-8297-4a96-b8b3-157814504fba';

async function run() {
  // 1. Check one existing teacher row to see ID format
  const { data: teachers } = await supabase
    .from('teachers').select('id, user_id, institution_id').limit(3);
  console.log('Teachers sample:', teachers);

  // 2. Check one existing class row to see teacher_id FK column
  const { data: classes } = await supabase
    .from('classes').select('id, teacher_id, institution_id').eq('institution_id', TEMPLATE_ID).limit(3);
  console.log('Classes sample (template):', classes);

  // 3. Check existing subjects to find valid level values
  const { data: subjects } = await supabase
    .from('subjects').select('id, title, level, category').limit(10);
  console.log('Subjects sample (level values):', subjects?.map(s => ({ title: s.title, level: s.level, category: s.category })));

  // 4. Try inserting a test subject with different level values
  const testLevels = ['Standard', 'standard', 'Advanced', 'advanced', 'Basic', 'basic', 'Beginner'];
  for (const lvl of testLevels) {
    const { error } = await supabase.from('subjects').insert({
      title: `_TEST_${lvl}`, institution_id: TEMPLATE_ID, fee_amount: 0, level: lvl
    });
    if (!error) {
      console.log(`✅  level="${lvl}" is VALID`);
      await supabase.from('subjects').delete().eq('title', `_TEST_${lvl}`);
    } else if (error.code === '23514') {
      console.log(`❌  level="${lvl}" violates check constraint`);
    } else {
      console.log(`⚠️   level="${lvl}" other error:`, error.message);
    }
  }

  // 5. Check what columns classes uses for teacher FK
  const { data: cls2 } = await supabase.from('classes').select('*').limit(1);
  if (cls2?.[0]) console.log('Classes columns:', Object.keys(cls2[0]));
}

run().catch(console.error);
