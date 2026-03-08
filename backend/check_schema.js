const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'c:/Projects/LMS/backend/.env' });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
    const { data, error } = await supabase.from('institutions').select('*').limit(1);
    if (error) {
        console.error(error);
        return;
    }
    if (data && data.length > 0) {
        console.log(Object.keys(data[0]));
    } else {
        console.log("No data found");
    }
}
checkSchema();
