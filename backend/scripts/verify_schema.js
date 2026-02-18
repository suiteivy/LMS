const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
    process.env.EXPO_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkTable(tableName) {
    const { error } = await supabase.from(tableName).select('*').limit(0);
    if (error) {
        if (error.code === '42P01') {
            console.log(`[MISSING] Table ${tableName} does not exist.`);
            return false;
        }
        console.log(`[ERROR] Table ${tableName}: ${error.message}`);
        return false;
    }
    console.log(`[EXISTS] Table ${tableName} is present.`);
    return true;
}

async function verify() {
    console.log("Verifying Database Schema...");
    const tables = ['resources', 'attendance', 'teacher_payouts', 'notifications', 'enrollments'];
    for (const table of tables) {
        await checkTable(table);
    }
}

verify();
