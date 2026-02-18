const supabase = require('../utils/supabaseClient');

async function checkSchema() {
    console.log('Checking enrollments table...');
    const { data, error } = await supabase
        .from('enrollments')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error accessing enrollments:', error);
    } else {
        console.log('Enrollments table accessible. Sample data:', data);
    }
}

checkSchema();
