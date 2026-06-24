const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const supabase = createClient(
    process.env.EXPO_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkTables() {
    const { data, error } = await supabase.rpc('get_tables'); // This might not work if the RPC doesn't exist
    
    // Alternative: try to select from 'grades'
    const { error: gradesError } = await supabase.from('grades').select('*').limit(1);
    console.log('Grades table exists?', !gradesError);
    if (gradesError) console.log('Grades error:', gradesError.message);

    const { error: examResultsError } = await supabase.from('exam_results').select('*').limit(1);
    console.log('Exam Results table exists?', !examResultsError);
}

checkTables();
